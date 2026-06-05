// Pulso Diário — lógica pura de agregação + diagnóstico operacional.
// Transforma as linhas de /analytics/diario (dia × marca × apresentadora) em
// um painel de decisão: status por cliente/dia, alertas e rankings.
// Sem I/O. Diagnóstico é calculado em tempo de leitura (nunca persistido).
import { asNumber, asString, formatMoney } from './format'
import type { JsonRecord } from '../types/models'

export type PulseStatus = 'critico' | 'atencao' | 'ok' | 'otimo'

export interface PulseAgg {
  gmv: number
  pedidos: number
  horas: number
  gmvHora: number
  pedidosHora: number
  totalLives: number
}

export interface PulseResumo {
  statusGeral: PulseStatus
  clientesCriticos: number
  clientesAtencao: number
  clientesOk: number
  gmvTotal: number
  pedidosTotal: number
  horasTotal: number
  gmvHora: number
  diasComZeroVenda: number
  horasSemVenda: number
}

export interface PulseDay {
  data: string
  label: string
  gmv: number
  pedidos: number
  horas: number
  gmvHora: number
  status: PulseStatus
}

export interface PulseCliente {
  clienteId: string
  clienteNome: string
  status: PulseStatus
  gmv: number
  pedidos: number
  horas: number
  gmvHora: number
  diasComLive: number
  diasCriticos: number
  principalAlerta: string
}

export interface PulseAlerta {
  severity: 'critical' | 'warning'
  clienteId: string
  clienteNome: string
  data: string
  dataLabel: string
  titulo: string
  descricao: string
  horasSemVenda: number
  gmv: number
}

export interface PulseApresentadora {
  apresentadoraId: string
  apresentadoraNome: string
  status: PulseStatus
  gmv: number
  pedidos: number
  horas: number
  gmvHora: number
  pedidosHora: number
}

export interface DailyPulseData {
  resumo: PulseResumo
  serieDiaria: PulseDay[]
  clientes: PulseCliente[]
  alertas: PulseAlerta[]
  rankingApresentadoras: PulseApresentadora[]
}

// Thresholds — agressivos por design (supervisor precisa ver o que está ruim).
const HORAS_SEM_PEDIDO = 2 // h no ar e 0 pedidos = crítico
const HORAS_SEM_GMV = 3 // h no ar e R$0 = crítico
const HORAS_OCIOSAS = 1.5 // h com GMV/hora 0 = crítico
const GMV_HORA_MIN = 50 // abaixo disso = atenção
const GMV_HORA_OTIMO = 150
const PEDIDOS_HORA_MIN = 1 // abaixo disso (com pedidos) = atenção
const PEDIDOS_HORA_OTIMO = 2

export function diaLabel(value: unknown): string {
  const raw = asString(value, '')
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}` : raw || '—'
}

// "6h01", "0h45", "12h00" — leitura rápida de tempo no ar.
export function formatHoras(horas: number): string {
  const safe = Math.max(0, horas)
  const h = Math.floor(safe)
  const min = Math.round((safe - h) * 60)
  if (min === 60) return `${h + 1}h00`
  return `${h}h${String(min).padStart(2, '0')}`
}

function makeAgg(gmv: number, pedidos: number, horas: number, totalLives: number): PulseAgg {
  return {
    gmv,
    pedidos,
    horas,
    totalLives,
    gmvHora: horas > 0 ? gmv / horas : 0,
    pedidosHora: horas > 0 ? pedidos / horas : 0,
  }
}

// Ordem de avaliação: crítico vence sempre; ótimo antes de ok; atenção
// (baixa produtividade) tem prioridade sobre ok para não mascarar problema.
export function computeStatus(a: PulseAgg): PulseStatus {
  const temLive = a.totalLives > 0 || a.horas > 0
  const critico =
    (a.horas >= HORAS_SEM_PEDIDO && a.pedidos === 0) ||
    (a.horas >= HORAS_SEM_GMV && a.gmv === 0) ||
    (a.gmvHora === 0 && a.horas >= HORAS_OCIOSAS) ||
    (a.pedidos === 0 && temLive)
  if (critico) return 'critico'
  if (a.gmvHora >= GMV_HORA_OTIMO && a.pedidosHora >= PEDIDOS_HORA_OTIMO) return 'otimo'
  if ((a.gmvHora > 0 && a.gmvHora < GMV_HORA_MIN) || (a.pedidos > 0 && a.pedidosHora < PEDIDOS_HORA_MIN)) return 'atencao'
  if (a.pedidos > 0 && a.gmvHora >= GMV_HORA_MIN) return 'ok'
  return 'ok'
}

export function diagnose(status: PulseStatus, a: PulseAgg): { titulo: string; descricao: string } {
  switch (status) {
    case 'critico':
      return { titulo: 'Live longa sem venda', descricao: `${formatHoras(a.horas)} no ar, ${formatMoney(a.gmv)} movimentado e ${a.pedidos} pedidos.` }
    case 'atencao':
      return { titulo: 'Baixa produtividade', descricao: `${formatHoras(a.horas)} no ar com GMV/hora abaixo da meta.` }
    case 'otimo':
      return { titulo: 'Alta performance', descricao: 'GMV/hora e ritmo de pedidos acima da meta.' }
    default:
      return { titulo: 'Operação vendendo', descricao: 'Houve pedidos e GMV/hora dentro do mínimo esperado.' }
  }
}

interface RowAgg {
  gmv: number
  pedidos: number
  horas: number
  totalLives: number
}

function addRow(target: RowAgg, row: JsonRecord): void {
  target.gmv += asNumber(row.gmv_total)
  target.pedidos += asNumber(row.pedidos)
  target.horas += asNumber(row.horas_live)
  target.totalLives += asNumber(row.total_lives)
}

function emptyRowAgg(): RowAgg {
  return { gmv: 0, pedidos: 0, horas: 0, totalLives: 0 }
}

const STATUS_RANK: Record<PulseStatus, number> = { critico: 0, atencao: 1, ok: 2, otimo: 3 }

export function buildDailyPulse(rows: JsonRecord[]): DailyPulseData {
  // --- série diária (uma barra por dia, somando todas as marcas/apresentadoras)
  const byDay = new Map<string, RowAgg>()
  // --- por cliente/marca (dimensão principal do supervisor)
  const byCliente = new Map<string, { nome: string; agg: RowAgg; dias: Map<string, RowAgg> }>()
  // --- por apresentadora
  const byApresentadora = new Map<string, { nome: string; agg: RowAgg }>()
  // --- por (dia, cliente) para alertas granulares
  const byDiaCliente = new Map<string, { dia: string; clienteId: string; clienteNome: string; agg: RowAgg }>()

  for (const row of rows) {
    const dia = asString(row.dia, '')
    if (!dia) continue
    const marcaId = asString(row.marca_id, '') || `nome:${asString(row.marca_nome, 'Sem marca')}`
    const marcaNome = asString(row.marca_nome, 'Sem marca')
    const apId = asString(row.apresentadora_id, '') || `nome:${asString(row.apresentadora_nome, 'Sem apresentadora')}`
    const apNome = asString(row.apresentadora_nome, 'Sem apresentadora')

    if (!byDay.has(dia)) byDay.set(dia, emptyRowAgg())
    addRow(byDay.get(dia)!, row)

    if (!byCliente.has(marcaId)) byCliente.set(marcaId, { nome: marcaNome, agg: emptyRowAgg(), dias: new Map() })
    const cli = byCliente.get(marcaId)!
    addRow(cli.agg, row)
    if (!cli.dias.has(dia)) cli.dias.set(dia, emptyRowAgg())
    addRow(cli.dias.get(dia)!, row)

    if (!byApresentadora.has(apId)) byApresentadora.set(apId, { nome: apNome, agg: emptyRowAgg() })
    addRow(byApresentadora.get(apId)!.agg, row)

    const dcKey = `${dia}|${marcaId}`
    if (!byDiaCliente.has(dcKey)) byDiaCliente.set(dcKey, { dia, clienteId: marcaId, clienteNome: marcaNome, agg: emptyRowAgg() })
    addRow(byDiaCliente.get(dcKey)!.agg, row)
  }

  // série diária ordenada
  const serieDiaria: PulseDay[] = [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([data, r]) => {
      const agg = makeAgg(r.gmv, r.pedidos, r.horas, r.totalLives)
      return { data, label: diaLabel(data), gmv: r.gmv, pedidos: r.pedidos, horas: r.horas, gmvHora: agg.gmvHora, status: computeStatus(agg) }
    })

  // clientes
  const clientes: PulseCliente[] = [...byCliente.entries()].map(([clienteId, c]) => {
    const agg = makeAgg(c.agg.gmv, c.agg.pedidos, c.agg.horas, c.agg.totalLives)
    const status = computeStatus(agg)
    let diasCriticos = 0
    for (const dr of c.dias.values()) {
      if (computeStatus(makeAgg(dr.gmv, dr.pedidos, dr.horas, dr.totalLives)) === 'critico') diasCriticos += 1
    }
    return {
      clienteId,
      clienteNome: c.nome,
      status,
      gmv: c.agg.gmv,
      pedidos: c.agg.pedidos,
      horas: c.agg.horas,
      gmvHora: agg.gmvHora,
      diasComLive: c.dias.size,
      diasCriticos,
      principalAlerta: diagnose(status, agg).descricao,
    }
  })
  clientes.sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.horas - a.horas || b.gmv - a.gmv)

  // apresentadoras
  const rankingApresentadoras: PulseApresentadora[] = [...byApresentadora.entries()].map(([apresentadoraId, ap]) => {
    const agg = makeAgg(ap.agg.gmv, ap.agg.pedidos, ap.agg.horas, ap.agg.totalLives)
    return {
      apresentadoraId,
      apresentadoraNome: ap.nome,
      status: computeStatus(agg),
      gmv: ap.agg.gmv,
      pedidos: ap.agg.pedidos,
      horas: ap.agg.horas,
      gmvHora: agg.gmvHora,
      pedidosHora: agg.pedidosHora,
    }
  })
  rankingApresentadoras.sort((a, b) => b.gmvHora - a.gmvHora || b.gmv - a.gmv)

  // alertas (por dia × cliente) — só crítico/atenção
  const alertas: PulseAlerta[] = []
  for (const dc of byDiaCliente.values()) {
    const agg = makeAgg(dc.agg.gmv, dc.agg.pedidos, dc.agg.horas, dc.agg.totalLives)
    const status = computeStatus(agg)
    if (status !== 'critico' && status !== 'atencao') continue
    const diag = diagnose(status, agg)
    alertas.push({
      severity: status === 'critico' ? 'critical' : 'warning',
      clienteId: dc.clienteId,
      clienteNome: dc.clienteNome,
      data: dc.dia,
      dataLabel: diaLabel(dc.dia),
      titulo: diag.titulo,
      descricao: `${formatHoras(agg.horas)} no ar · R$ ${agg.gmv.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · ${agg.pedidos} pedidos`,
      horasSemVenda: agg.pedidos === 0 ? agg.horas : 0,
      gmv: agg.gmv,
    })
  }
  alertas.sort((a, b) => {
    const sev = (a.severity === 'critical' ? 0 : 1) - (b.severity === 'critical' ? 0 : 1)
    if (sev !== 0) return sev
    if (b.horasSemVenda !== a.horasSemVenda) return b.horasSemVenda - a.horasSemVenda
    if (b.gmv !== a.gmv) return b.gmv - a.gmv
    return b.data.localeCompare(a.data)
  })

  // resumo
  const gmvTotal = clientes.reduce((s, c) => s + c.gmv, 0)
  const pedidosTotal = clientes.reduce((s, c) => s + c.pedidos, 0)
  const horasTotal = clientes.reduce((s, c) => s + c.horas, 0)
  const clientesCriticos = clientes.filter((c) => c.status === 'critico').length
  const clientesAtencao = clientes.filter((c) => c.status === 'atencao').length
  const clientesOk = clientes.filter((c) => c.status === 'ok' || c.status === 'otimo').length
  const diasComZeroVenda = serieDiaria.filter((d) => d.pedidos === 0 && d.horas > 0).length
  const horasSemVenda = [...byDiaCliente.values()].reduce((s, dc) => (dc.agg.pedidos === 0 ? s + dc.agg.horas : s), 0)

  const statusGeral: PulseStatus = clientesCriticos > 0 ? 'critico' : clientesAtencao > 0 ? 'atencao' : 'ok'

  return {
    resumo: {
      statusGeral,
      clientesCriticos,
      clientesAtencao,
      clientesOk,
      gmvTotal,
      pedidosTotal,
      horasTotal,
      gmvHora: horasTotal > 0 ? gmvTotal / horasTotal : 0,
      diasComZeroVenda,
      horasSemVenda,
    },
    serieDiaria,
    clientes,
    alertas: alertas.slice(0, 5),
    rankingApresentadoras,
  }
}
