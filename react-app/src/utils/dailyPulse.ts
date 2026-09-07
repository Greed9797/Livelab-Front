// Agregação factual do Analytics. Não aplica metas, notas ou diagnósticos:
// esses critérios serão configuráveis por unidade em uma etapa posterior.
import { asNumber, asString } from './format'
import type { JsonRecord } from '../types/models'

export interface PulseResumo {
  gmvTotal: number
  pedidosTotal: number
  horasTotal: number
  gmvHora: number
}

export interface PulseDay {
  data: string
  label: string
  gmv: number
  pedidos: number
  horas: number
  gmvHora: number
}

export interface PulseCliente {
  clienteId: string
  clienteNome: string
  gmv: number
  pedidos: number
  horas: number
  gmvHora: number
  diasComLive: number
}

export interface PulseApresentadora {
  apresentadoraId: string
  apresentadoraNome: string
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
  rankingApresentadoras: PulseApresentadora[]
}

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

interface RowAgg {
  gmv: number
  gmvLives: number
  pedidos: number
  horas: number
  totalLives: number
}

function addRow(target: RowAgg, row: JsonRecord): void {
  target.gmv += asNumber(row.gmv_total)
  target.gmvLives += asNumber(row.gmv_lives)
  target.pedidos += asNumber(row.pedidos)
  target.horas += asNumber(row.horas_live)
  target.totalLives += asNumber(row.total_lives)
}

function emptyRowAgg(): RowAgg {
  return { gmv: 0, gmvLives: 0, pedidos: 0, horas: 0, totalLives: 0 }
}

function gmvHora(agg: RowAgg): number {
  // Vídeos não têm horas de live e, por isso, não entram no numerador.
  return agg.horas > 0 ? agg.gmvLives / agg.horas : 0
}

export function buildDailyPulse(rows: JsonRecord[]): DailyPulseData {
  const byDay = new Map<string, RowAgg>()
  const byCliente = new Map<string, { nome: string; agg: RowAgg; dias: Set<string> }>()
  const byApresentadora = new Map<string, { nome: string; agg: RowAgg }>()

  for (const row of rows) {
    const dia = asString(row.dia, '')
    if (!dia) continue
    const marcaId = asString(row.marca_id, '') || `nome:${asString(row.marca_nome, 'Sem marca')}`
    const marcaNome = asString(row.marca_nome, 'Sem marca')
    const apresentadoraId = asString(row.apresentadora_id, '') || `nome:${asString(row.apresentadora_nome, 'Sem apresentadora')}`
    const apresentadoraNome = asString(row.apresentadora_nome, 'Sem apresentadora')

    if (!byDay.has(dia)) byDay.set(dia, emptyRowAgg())
    addRow(byDay.get(dia)!, row)

    if (!byCliente.has(marcaId)) byCliente.set(marcaId, { nome: marcaNome, agg: emptyRowAgg(), dias: new Set() })
    const cliente = byCliente.get(marcaId)!
    addRow(cliente.agg, row)
    cliente.dias.add(dia)

    if (!byApresentadora.has(apresentadoraId)) byApresentadora.set(apresentadoraId, { nome: apresentadoraNome, agg: emptyRowAgg() })
    addRow(byApresentadora.get(apresentadoraId)!.agg, row)
  }

  const serieDiaria = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([data, agg]) => ({
      data,
      label: diaLabel(data),
      gmv: agg.gmv,
      pedidos: agg.pedidos,
      horas: agg.horas,
      gmvHora: gmvHora(agg),
    }))

  const clientes = [...byCliente.entries()].map(([clienteId, cliente]) => ({
    clienteId,
    clienteNome: cliente.nome,
    gmv: cliente.agg.gmv,
    pedidos: cliente.agg.pedidos,
    horas: cliente.agg.horas,
    gmvHora: gmvHora(cliente.agg),
    diasComLive: cliente.dias.size,
  }))
  clientes.sort((a, b) => b.gmvHora - a.gmvHora || b.gmv - a.gmv)

  const rankingApresentadoras = [...byApresentadora.entries()].map(([apresentadoraId, apresentadora]) => ({
    apresentadoraId,
    apresentadoraNome: apresentadora.nome,
    gmv: apresentadora.agg.gmv,
    pedidos: apresentadora.agg.pedidos,
    horas: apresentadora.agg.horas,
    gmvHora: gmvHora(apresentadora.agg),
    pedidosHora: apresentadora.agg.horas > 0 ? apresentadora.agg.pedidos / apresentadora.agg.horas : 0,
  }))
  rankingApresentadoras.sort((a, b) => b.gmvHora - a.gmvHora || b.gmv - a.gmv)

  const gmvTotal = clientes.reduce((total, cliente) => total + cliente.gmv, 0)
  const pedidosTotal = clientes.reduce((total, cliente) => total + cliente.pedidos, 0)
  const horasTotal = clientes.reduce((total, cliente) => total + cliente.horas, 0)
  const gmvLivesTotal = [...byCliente.values()].reduce((total, cliente) => total + cliente.agg.gmvLives, 0)

  return {
    resumo: {
      gmvTotal,
      pedidosTotal,
      horasTotal,
      gmvHora: horasTotal > 0 ? gmvLivesTotal / horasTotal : 0,
    },
    serieDiaria,
    clientes,
    rankingApresentadoras,
  }
}
