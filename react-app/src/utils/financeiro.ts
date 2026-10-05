// Helpers puros do Financeiro (sem React / sem rede) — cobertos por financeiro.test.ts.
import type { BadgeTone } from '../components/ui/Badge'
import type {
  DreMes,
  DreResponse,
  FluxoCaixaResponse,
  FluxoLinha,
  FluxoSerieMes,
  Lancamento,
  LancamentosFiltro,
  ModoPerda,
  Natureza,
  PrevistoRealizado,
  StatusLancamento,
  TotaisLancamentos,
  TotaisNatureza,
} from '../types/financeiro'
import { STATUS_LANCAMENTO } from '../types/financeiro'
import { asNumber } from './format'
import { getSaoPauloDateInput } from './sao-paulo-date'

// ── Datas / meses ('YYYY-MM') ────────────────────────────────────────────────

const YM_RE = /^(\d{4})-(\d{2})/
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const MESES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

export function hojeSP(now: Date = new Date()): string {
  return getSaoPauloDateInput(now)
}

export function mesAtualSP(now: Date = new Date()): string {
  return hojeSP(now).slice(0, 7)
}

export function isMes(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

export function shiftMes(ym: string, delta: number): string {
  const m = YM_RE.exec(ym)
  if (!m) return ym
  const idx = Number(m[1]) * 12 + (Number(m[2]) - 1) + delta
  const y = Math.floor(idx / 12)
  return `${y}-${String((idx % 12) + 1).padStart(2, '0')}`
}

export function mesLabel(ym: string, curto = false): string {
  const m = YM_RE.exec(ym)
  if (!m) return ym
  const mi = Number(m[2]) - 1
  return curto ? `${MESES_CURTO[mi]}/${m[1].slice(2)}` : `${MESES[mi]} de ${m[1]}`
}

export function mesCurto(ym: string): string {
  const m = YM_RE.exec(ym)
  return m ? MESES_CURTO[Number(m[2]) - 1] : ym
}

/** 'YYYY-MM-DD' → { dia: '05', semana: 'seg', mes: 'set' } sem passar por fuso. */
export function partesData(date: string): { dia: string; semana: string; mes: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date)
  if (!m) return { dia: '—', semana: '', mes: '' }
  const weekday = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay()
  return { dia: m[3], semana: DIAS_SEMANA[weekday], mes: MESES_CURTO[Number(m[2]) - 1] }
}

export function formatDataCurta(date: string | null | undefined): string {
  const m = date ? /^(\d{4})-(\d{2})-(\d{2})/.exec(date) : null
  return m ? `${m[3]}/${m[2]}` : '—'
}

export function ultimoDiaMes(ym: string): number {
  const m = YM_RE.exec(ym)
  if (!m) return 30
  return new Date(Date.UTC(Number(m[1]), Number(m[2]), 0)).getUTCDate()
}

// ── Status ───────────────────────────────────────────────────────────────────

/** Mesma regra de src/lib/lancamento-status.js do backend (fallback quando o item vem sem status). */
export function derivarStatus(
  l: { valor_previsto: number; valor_pago: number; data_vencimento: string | null },
  hoje: string,
): StatusLancamento {
  const previsto = l.valor_previsto
  const pago = l.valor_pago
  if (pago > 0 && pago >= previsto) return 'pago'
  const venc = l.data_vencimento ? l.data_vencimento.slice(0, 10) : null
  const atrasado = Boolean(venc && venc < hoje)
  if (pago > 0) return atrasado ? 'atrasado' : 'parcial'
  if (atrasado) return 'atrasado'
  if (!venc) return 'pendente'
  return venc.slice(0, 7) > hoje.slice(0, 7) ? 'previsto' : 'pendente'
}

export interface StatusMeta {
  label: string
  tone: BadgeTone
  /** cor CSS (token) do ponto/realce do chip */
  color: string
  soft: string
  descricao: string
}

export const STATUS_META: Record<StatusLancamento, StatusMeta> = {
  previsto: { label: 'Previsto', tone: 'info', color: 'var(--info)', soft: 'var(--info-soft)', descricao: 'Competência futura — projeção' },
  pendente: { label: 'Pendente', tone: 'warning', color: 'var(--warning)', soft: 'var(--warning-soft)', descricao: 'Vence neste mês, ainda em dia' },
  atrasado: { label: 'Atrasado', tone: 'danger', color: 'var(--danger)', soft: 'var(--danger-soft)', descricao: 'Vencimento passou sem baixa total' },
  parcial: { label: 'Parcial', tone: 'brand', color: 'var(--primary)', soft: 'var(--primary-soft)', descricao: 'Pago em parte, dentro do prazo' },
  pago: { label: 'Pago', tone: 'success', color: 'var(--success)', soft: 'var(--success-soft)', descricao: 'Baixa total registrada' },
  perdido: { label: 'Perdido', tone: 'neutral', color: 'var(--text-muted)', soft: 'var(--bg-elev-3)', descricao: 'Receita dada como perdida — não entra em a receber' },
  cancelado: { label: 'Cancelado', tone: 'neutral', color: 'var(--text-muted)', soft: 'var(--bg-elev-3)', descricao: 'Despesa cancelada — não entra em a pagar nem no previsto' },
}

/** Status que encerram o saldo em aberto sem pagamento (itens esmaecidos, sem Receber/Pagar). */
export function isEncerrado(status: StatusLancamento): boolean {
  return status === 'perdido' || status === 'cancelado'
}

export function statusLabel(status: StatusLancamento, natureza: Natureza): string {
  if (status === 'pago' && natureza === 'receita') return 'Recebido'
  return STATUS_META[status].label
}

export function isStatus(value: unknown): value is StatusLancamento {
  return typeof value === 'string' && (STATUS_LANCAMENTO as string[]).includes(value)
}

// ── Rótulos ──────────────────────────────────────────────────────────────────

export const GRUPO_LABEL: Record<string, string> = {
  operacional: 'Operacional',
  estrutural: 'Estrutural',
  diversos: 'Diversos',
  investimento: 'Investimento',
  prolabore: 'Pró-labore',
  marketing: 'Marketing',
  ferramentas: 'Ferramentas',
  cartao: 'Cartão',
  aporte: 'Aporte',
  outros: 'Outros',
  apresentadoras: 'Apresentadoras',
  imposto: 'Imposto',
  servico: 'Serviço',
  reembolso: 'Reembolso',
}

export function grupoLabel(grupo: string | null | undefined): string {
  if (!grupo) return 'Sem grupo'
  return GRUPO_LABEL[grupo] ?? grupo.charAt(0).toUpperCase() + grupo.slice(1)
}

export function origemLabel(l: Pick<Lancamento, 'origem' | 'componente'>): string {
  switch (l.origem) {
    case 'marca_fixo':
      return 'Fixo da marca'
    case 'marca_comissao':
      return 'Comissão da marca'
    case 'comercial':
      return l.componente === 'fixo' ? 'Fixo da marca' : l.componente === 'comissao' ? 'Comissão da marca' : 'Comercial'
    case 'manual':
      return 'Manual'
    case 'recorrente':
      return 'Recorrente'
    case 'parcela':
      return 'Parcelado'
    case 'apresentadora':
      return l.componente === 'fixo' ? 'Apresentadora · fixo' : l.componente === 'variavel' ? 'Apresentadora · variável' : 'Apresentadora'
    case 'imposto':
      return 'Imposto'
    case 'avulsa':
      return 'Receita avulsa'
    default:
      return l.origem || 'Lançamento'
  }
}

// ── Normalização defensiva ───────────────────────────────────────────────────

function str(v: unknown): string | null {
  if (typeof v === 'string' && v.trim()) return v
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return null
}

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

function dateOnly(v: unknown): string | null {
  const s = str(v)
  return s ? s.slice(0, 10) : null
}

function inferOrigem(raw: Record<string, unknown>, natureza: Natureza): string {
  const origem = str(raw.origem)
  if (origem) return origem
  const id = str(raw.id) ?? ''
  if (id.startsWith('apresentadora:')) return 'apresentadora'
  if (id.startsWith('imposto:')) return 'imposto'
  if (id.startsWith('rec:')) return 'recorrente'
  if (natureza === 'receita') return 'comercial'
  if (raw.parcela_grupo_id) return 'parcela'
  return 'manual'
}

/** `apresentadora:<uuid>:<YYYY-MM>:fixo|variavel` → componente (ids antigos de 3 partes não têm). */
function componenteDoId(id: string | null): string | null {
  if (!id?.startsWith('apresentadora:')) return null
  const c = id.split(':')[3]
  return c === 'fixo' || c === 'variavel' ? c : null
}

/** Status do backend quando válido (perdido só em receita, cancelado só em custo); senão deriva, respeitando perdido_em/cancelado_em. */
function statusDoItem(
  raw: Record<string, unknown>,
  natureza: Natureza,
  base: { valor_previsto: number; valor_pago: number; data_vencimento: string | null },
  hoje: string,
): StatusLancamento {
  const encerradoProprio: StatusLancamento = natureza === 'receita' ? 'perdido' : 'cancelado'
  if (isStatus(raw.status)) {
    if (raw.status === 'perdido' || raw.status === 'cancelado') {
      if (raw.status === encerradoProprio) return raw.status
    } else {
      return raw.status
    }
  }
  const derivado = derivarStatus(base, hoje)
  if (derivado === 'pago') return derivado
  const marcado = natureza === 'receita' ? str(raw.perdido_em) : str(raw.cancelado_em)
  return marcado ? encerradoProprio : derivado
}

export function normalizarLancamento(input: unknown, hoje: string = hojeSP()): Lancamento {
  const raw = rec(input)
  const natureza: Natureza = raw.natureza === 'receita' ? 'receita' : 'custo'
  const valorPrevisto = asNumber(raw.valor_previsto ?? raw.valor)
  const valorPago = asNumber(raw.valor_pago)
  const data_vencimento = dateOnly(raw.data_vencimento)
  const origem = inferOrigem(raw, natureza)
  const base = { valor_previsto: valorPrevisto, valor_pago: valorPago, data_vencimento }
  const parcelaNum = raw.parcela_num == null ? null : asNumber(raw.parcela_num)
  const parcelasTotal = raw.parcelas_total == null ? null : asNumber(raw.parcelas_total)
  return {
    id: str(raw.id) ?? '',
    natureza,
    origem,
    descricao: str(raw.descricao) ?? str(raw.nome) ?? 'Lançamento',
    competencia: dateOnly(raw.competencia) ?? (data_vencimento ? `${data_vencimento.slice(0, 7)}-01` : ''),
    data_vencimento,
    valor_previsto: valorPrevisto,
    valor_pago: valorPago,
    data_pagamento: dateOnly(raw.data_pagamento),
    status: statusDoItem(raw, natureza, base, hoje),
    grupo: str(raw.grupo) ?? (origem === 'apresentadora' ? 'apresentadoras' : origem === 'imposto' ? 'imposto' : null),
    componente: str(raw.componente) ?? componenteDoId(str(raw.id)),
    classe: raw.classe === 'fixo' || raw.classe === 'variavel' ? raw.classe : null,
    marca_id: str(raw.marca_id),
    marca_nome: str(raw.marca_nome),
    cliente_id: str(raw.cliente_id),
    cliente_nome: str(raw.cliente_nome),
    apresentadora_id: str(raw.apresentadora_id),
    recorrente_id: str(raw.recorrente_id),
    parcela_grupo_id: str(raw.parcela_grupo_id),
    parcela_num: parcelaNum,
    parcelas_total: parcelasTotal,
    observacao: str(raw.observacao),
    virtual: Boolean(raw.virtual) || /^(calc|rec|apresentadora|imposto):/.test(str(raw.id) ?? ''),
    perdido_em: str(raw.perdido_em),
    perdido_motivo: str(raw.perdido_motivo),
    valor_perdido: raw.valor_perdido == null ? null : asNumber(raw.valor_perdido),
    cancelado_em: str(raw.cancelado_em),
    cancelado_motivo: str(raw.cancelado_motivo),
    cancelado_por: str(raw.cancelado_por),
  }
}

function zeroNatureza(): TotaisNatureza {
  return { previsto: 0, pago: 0, atrasado: 0, pendente: 0 }
}

const r2 = (n: number) => Math.round(n * 100) / 100

/** Totais calculados no cliente (fallback e também usado com filtros locais). */
export function totalizar(itens: Lancamento[]): TotaisLancamentos {
  const t = { receita: zeroNatureza(), custo: zeroNatureza() }
  const aportes = { previsto: 0, pago: 0 }
  for (const l of itens) {
    const alvo = t[l.natureza]
    if (isAporte(l)) {
      // previsto EFETIVO: o saldo de um aporte perdido já sai em receita.perdido (não subtrair 2x)
      aportes.previsto += l.status === 'perdido' ? Math.min(l.valor_previsto, l.valor_pago) : l.valor_previsto
      aportes.pago += l.valor_pago
    }
    const saldo = Math.max(0, l.valor_previsto - l.valor_pago)
    const perda = l.natureza === 'receita'
      ? Math.min(saldo, Math.max(0, l.valor_perdido ?? (l.status === 'perdido' ? saldo : 0))) : 0
    const cancelamento = l.natureza === 'custo' && l.status === 'cancelado' ? saldo : 0
    const aberto = Math.max(0, saldo - perda - cancelamento)
    alvo.previsto += l.valor_previsto
    alvo.pago += l.valor_pago
    if (perda > 0) t.receita.perdido = (t.receita.perdido ?? 0) + perda
    if (cancelamento > 0) t.custo.cancelado = (t.custo.cancelado ?? 0) + cancelamento
    if (l.status === 'atrasado') alvo.atrasado += aberto
    else if (l.status !== 'pago') alvo.pendente += aberto
  }
  for (const n of [t.receita, t.custo]) {
    n.previsto = r2(n.previsto)
    n.pago = r2(n.pago)
    n.atrasado = r2(n.atrasado)
    n.pendente = r2(n.pendente)
  }
  const perdido = r2(t.receita.perdido ?? 0)
  const cancelado = r2(t.custo.cancelado ?? 0)
  // Só expõe os campos quando há encerrados (mantém o formato dos totais antigos).
  if (perdido > 0) t.receita.perdido = perdido
  if (cancelado > 0) t.custo.cancelado = cancelado
  return {
    ...t,
    // Aporte não é resultado (o DRE o exclui): sai da receita nos dois saldos.
    saldo_previsto: r2(t.receita.previsto - perdido - aportes.previsto - (t.custo.previsto - cancelado)),
    saldo_realizado: r2(t.receita.pago - aportes.pago - t.custo.pago),
  }
}

/** Receita avulsa do grupo aporte: entra no caixa, mas não no resultado. */
function isAporte(l: Pick<Lancamento, 'natureza' | 'origem' | 'grupo'>): boolean {
  return l.natureza === 'receita' && l.origem === 'avulsa' && l.grupo === 'aporte'
}

function normalizarTotaisNatureza(v: unknown): TotaisNatureza | null {
  const r = rec(v)
  if (!Object.keys(r).length) return null
  return {
    previsto: asNumber(r.previsto ?? r.valor_previsto),
    pago: asNumber(r.pago ?? r.valor_pago ?? r.realizado),
    atrasado: asNumber(r.atrasado),
    pendente: asNumber(r.pendente ?? r.em_aberto),
    // Defensivo: backends sem perdas/cancelamentos não mandam o campo.
    ...(r.perdido != null ? { perdido: asNumber(r.perdido) } : {}),
    ...(r.cancelado != null ? { cancelado: asNumber(r.cancelado) } : {}),
  }
}

export function normalizarLancamentosResponse(input: unknown, fallback: { inicio: string; fim: string }) {
  const raw = rec(input)
  const hoje = dateOnly(raw.hoje) ?? hojeSP()
  const lista = Array.isArray(input) ? input : Array.isArray(raw.itens) ? raw.itens : Array.isArray(raw.items) ? raw.items : []
  const itens = lista.map((i) => normalizarLancamento(i, hoje)).filter((l) => l.id)
  const calc = totalizar(itens)
  const t = rec(raw.totais)
  const receita = normalizarTotaisNatureza(t.receita)
  const custo = normalizarTotaisNatureza(t.custo)
  const totais: TotaisLancamentos = receita && custo
    ? {
        receita,
        custo,
        saldo_previsto: t.saldo_previsto == null ? calc.saldo_previsto : asNumber(t.saldo_previsto),
        saldo_realizado: t.saldo_realizado == null ? calc.saldo_realizado : asNumber(t.saldo_realizado),
      }
    : calc
  return {
    inicio: str(raw.inicio) ?? fallback.inicio,
    fim: str(raw.fim) ?? fallback.fim,
    hoje,
    itens,
    totais,
  }
}

// ── Filtros e agrupamento ────────────────────────────────────────────────────

function normalizarBusca(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export function filtrarLancamentos(itens: Lancamento[], f: Omit<LancamentosFiltro, 'inicio' | 'fim'>): Lancamento[] {
  const q = f.q ? normalizarBusca(f.q) : ''
  return itens.filter((l) => {
    if (f.natureza && l.natureza !== f.natureza) return false
    if (f.status && l.status !== f.status) return false
    if (f.grupo && (l.grupo ?? '') !== f.grupo) return false
    if (q) {
      const alvo = normalizarBusca([l.descricao, l.marca_nome, l.cliente_nome, grupoLabel(l.grupo), origemLabel(l)].filter(Boolean).join(' '))
      if (!alvo.includes(q)) return false
    }
    return true
  })
}

export interface GrupoDia {
  data: string // YYYY-MM-DD ou '' (sem vencimento)
  itens: Lancamento[]
  entradas: number
  saidas: number
}

/** Agrupa por data de vencimento (ordem cronológica; sem vencimento no fim). Receitas antes de custos no mesmo dia. */
export function agruparPorDia(itens: Lancamento[]): GrupoDia[] {
  const map = new Map<string, GrupoDia>()
  for (const l of itens) {
    const key = l.data_vencimento ?? ''
    let g = map.get(key)
    if (!g) {
      g = { data: key, itens: [], entradas: 0, saidas: 0 }
      map.set(key, g)
    }
    g.itens.push(l)
    if (isEncerrado(l.status)) continue // perdido/cancelado sai do projetado do dia
    if (l.natureza === 'receita') g.entradas += l.valor_previsto
    else g.saidas += l.valor_previsto
  }
  const grupos = [...map.values()]
  for (const g of grupos) {
    g.entradas = r2(g.entradas)
    g.saidas = r2(g.saidas)
    g.itens.sort((a, b) => (a.natureza === b.natureza ? b.valor_previsto - a.valor_previsto : a.natureza === 'receita' ? -1 : 1))
  }
  return grupos.sort((a, b) => (a.data || '9999').localeCompare(b.data || '9999'))
}

export type VisaoLista = 'vencimento' | 'competencia'

/** Quantos meses para trás buscar ao incluir "atrasados de meses anteriores" na lista por vencimento. */
export const MESES_ATRASADOS_ANTERIORES = 12

/**
 * Janela de competências a buscar. Por competência: só o mês. Por vencimento: [mês−1, mês]
 * (o que vence no mês costuma ter competência do mês anterior) — ou [mês−12, mês] ao incluir atrasados antigos.
 */
export function janelaLancamentos(mes: string, visao: VisaoLista, incluirAnteriores = false): { inicio: string; fim: string } {
  if (visao === 'competencia') return { inicio: mes, fim: mes }
  return { inicio: shiftMes(mes, incluirAnteriores ? -MESES_ATRASADOS_ANTERIORES : -1), fim: mes }
}

/**
 * Visão por vencimento: itens cujo vencimento cai dentro do mês (sem vencimento: pela competência do mês).
 * Com `incluirAnteriores`, também os ainda atrasados que venceram antes do mês.
 */
export function filtrarPorVencimentoNoMes(itens: Lancamento[], mes: string, incluirAnteriores = false): Lancamento[] {
  return itens.filter((l) => {
    const v = l.data_vencimento
    if (!v) return l.competencia.startsWith(mes)
    if (v.startsWith(mes)) return true
    return incluirAnteriores && v < `${mes}-01` && l.status === 'atrasado'
  })
}

/** Itens que a lista oferece para o chip "atrasados de meses anteriores" (venceram antes do mês e seguem atrasados). */
export function contarAtrasadosAnteriores(itens: Lancamento[], mes: string): number {
  return itens.filter((l) => l.status === 'atrasado' && l.data_vencimento != null && l.data_vencimento < `${mes}-01`).length
}

export function gruposPresentes(itens: Lancamento[]): string[] {
  return [...new Set(itens.map((l) => l.grupo).filter((g): g is string => Boolean(g)))].sort((a, b) =>
    grupoLabel(a).localeCompare(grupoLabel(b), 'pt-BR'),
  )
}

export function contarPorStatus(itens: Lancamento[]): Record<StatusLancamento, number> {
  const c: Record<StatusLancamento, number> = { previsto: 0, pendente: 0, atrasado: 0, parcial: 0, pago: 0, perdido: 0, cancelado: 0 }
  for (const l of itens) c[l.status] += 1
  return c
}

// ── Ações (roteamento de baixa/desfazer por tipo) ────────────────────────────

export type AcaoBaixa = 'pagar' | 'desfazer'

/** Endpoint (relativo a /v1) que dá baixa / desfaz no lançamento, conforme a origem. */
export function rotaBaixa(l: Pick<Lancamento, 'id' | 'natureza' | 'origem' | 'competencia' | 'apresentadora_id'> & { componente?: string | null }, acao: AcaoBaixa): string {
  const enc = encodeURIComponent
  if (l.natureza === 'receita' && l.origem === 'avulsa') {
    return `/financeiro/receitas-avulsas/${enc(l.id)}/${acao === 'pagar' ? 'receber' : 'desfazer'}`
  }
  if (l.natureza === 'receita') {
    return `/financeiro/receitas/${enc(l.id)}/${acao === 'pagar' ? 'receber' : 'desfazer'}`
  }
  if (l.origem === 'apresentadora') {
    const [, idAp, mesId, compId] = l.id.split(':')
    const apId = l.apresentadora_id ?? idAp
    const mes = isMes(mesId) ? mesId : l.competencia.slice(0, 7)
    const comp = l.componente === 'fixo' || l.componente === 'variavel' ? l.componente : compId === 'fixo' || compId === 'variavel' ? compId : null
    // Id antigo (sem componente): rota legada, que o backend ainda aceita.
    return comp
      ? `/financeiro/apresentadoras-pagamentos/${enc(apId)}/${mes}/${comp}/${acao}`
      : `/financeiro/apresentadoras-pagamentos/${enc(apId)}/${mes}/${acao}`
  }
  if (l.origem === 'imposto') {
    const idMes = l.id.startsWith('imposto:') ? l.id.slice('imposto:'.length) : ''
    const mes = isMes(idMes) ? idMes : l.competencia.slice(0, 7)
    return `/financeiro/impostos/${mes}/${acao}`
  }
  return `/financeiro/custos/${enc(l.id)}/${acao}`
}

// ── Perder / cancelar ────────────────────────────────────────────────────────

export interface AcoesPerda {
  podePerder: boolean
  podeCancelar: boolean
  podeDesfazer: boolean
}

type ParaPerda = Pick<Lancamento, 'natureza' | 'origem' | 'status'> & { grupo?: string | null; valor_perdido?: number | null }

/**
 * O que o item aceita: receita (comercial ou avulsa, exceto aporte) pode ser dada como perdida;
 * custo manual/parcela/recorrente pode ser cancelado; item já perdido/cancelado só desfaz.
 * Apresentadora e imposto (pagáveis, calculados) também cancelam/reativam; aporte nunca ganha a ação.
 * Título 100% pago não perde nem cancela.
 */
export function acoesPerda(item: ParaPerda): AcoesPerda {
  const nenhuma = { podePerder: false, podeCancelar: false, podeDesfazer: false }
  if (item.origem === 'apresentadora' || item.origem === 'imposto') {
    return {
      podePerder: false,
      podeCancelar: item.status !== 'pago' && item.status !== 'cancelado',
      podeDesfazer: item.status === 'cancelado',
    }
  }
  if (item.natureza === 'receita') {
    if (item.origem === 'avulsa' && item.grupo === 'aporte') return nenhuma
    return {
      podePerder: item.status !== 'pago' && item.status !== 'perdido',
      podeCancelar: false,
      podeDesfazer: item.status === 'perdido' || (item.valor_perdido ?? 0) > 0,
    }
  }
  if (!isCustoManual(item)) return nenhuma
  return {
    podePerder: false,
    podeCancelar: item.status !== 'pago' && item.status !== 'cancelado',
    podeDesfazer: item.status === 'cancelado',
  }
}

export type AcaoPerda = ModoPerda

/** Endpoint (relativo a /v1) de perder/desperder (receitas) ou cancelar/reativar (custos). */
export function rotaPerda(
  l: Pick<Lancamento, 'id' | 'natureza' | 'origem'> & { competencia?: string; apresentadora_id?: string | null; componente?: string | null },
  modo: ModoPerda,
): string {
  const sufixo = modo === 'desfazer' ? 'reativar' : 'cancelar'
  if (l.origem === 'apresentadora') {
    const [, idAp, mesId, compId] = l.id.split(':')
    const mes = isMes(mesId) ? mesId : (l.competencia ?? '').slice(0, 7)
    const comp = l.componente === 'fixo' || l.componente === 'variavel' ? l.componente : compId
    return `/financeiro/apresentadoras-pagamentos/${encodeURIComponent(l.apresentadora_id ?? idAp)}/${mes}/${comp}/${sufixo}`
  }
  if (l.origem === 'imposto') {
    const idMes = l.id.startsWith('imposto:') ? l.id.slice('imposto:'.length) : ''
    const mes = isMes(idMes) ? idMes : (l.competencia ?? '').slice(0, 7)
    return `/financeiro/impostos/${mes}/${sufixo}`
  }
  const enc = encodeURIComponent(l.id)
  if (l.natureza === 'receita') {
    const base = l.origem === 'avulsa' ? 'receitas-avulsas' : 'receitas'
    return `/financeiro/${base}/${enc}/${modo === 'desfazer' ? 'desperder' : 'perder'}`
  }
  return `/financeiro/custos/${enc}/${sufixo}`
}

/** Custos criados no Financeiro (editáveis/excluíveis). Receitas vêm do Comercial; apresentadoras e imposto são calculados. */
export function isCustoManual(l: Pick<Lancamento, 'natureza' | 'origem'>): boolean {
  return l.natureza === 'custo' && ['manual', 'recorrente', 'parcela'].includes(l.origem)
}

/** Receita lançada à mão (aporte, serviço, reembolso…) — editável/excluível como os custos manuais. */
export function isReceitaAvulsa(l: Pick<Lancamento, 'natureza' | 'origem'>): boolean {
  return l.natureza === 'receita' && l.origem === 'avulsa'
}

/** Lançamentos que o usuário criou e pode editar. */
export function isEditavel(l: Pick<Lancamento, 'natureza' | 'origem'>): boolean {
  return isCustoManual(l) || isReceitaAvulsa(l)
}

export function podeExcluir(l: Pick<Lancamento, 'natureza' | 'origem' | 'id'>): boolean {
  return isReceitaAvulsa(l) || (isCustoManual(l) && !l.id.startsWith('rec:'))
}

export function valorEmAberto(l: Pick<Lancamento, 'valor_previsto' | 'valor_pago'> & Partial<Pick<Lancamento, 'natureza' | 'valor_perdido'>>): number {
  return r2(Math.max(0, l.valor_previsto - l.valor_pago - (l.natureza === 'receita' ? l.valor_perdido ?? 0 : 0)))
}

// ── DRE ──────────────────────────────────────────────────────────────────────

function pr(v: unknown, prevKeys: string[] = [], realKeys: string[] = [], src: Record<string, unknown> = {}): PrevistoRealizado {
  if (typeof v === 'number' || typeof v === 'string') return { previsto: asNumber(v), realizado: 0 }
  const r = rec(v)
  const prevAlt = prevKeys.map((k) => src[k]).find((x) => x != null)
  const realAlt = realKeys.map((k) => src[k]).find((x) => x != null)
  return {
    previsto: asNumber(r.previsto ?? r.previstas ?? prevAlt),
    realizado: asNumber(r.realizado ?? r.realizadas ?? r.pago ?? realAlt),
  }
}

function normalizarDreLinha(input: unknown): Omit<DreMes, 'mes'> {
  const r = rec(input)
  const custos = rec(r.custos)
  const porGrupoRaw = rec(custos.por_grupo)
  const por_grupo: Record<string, PrevistoRealizado> = {}
  for (const [k, v] of Object.entries(porGrupoRaw)) por_grupo[k] = pr(v)
  const imposto = rec(r.imposto)
  const receita = pr(r.receita)
  const custosPr = pr(r.custos)
  const apresentadoras = pr(r.apresentadoras)
  const impostoPr = pr(r.imposto)
  const resultado = r.resultado != null
    ? pr(r.resultado)
    : {
        previsto: r2(receita.previsto - custosPr.previsto - apresentadoras.previsto - impostoPr.previsto),
        realizado: r2(receita.realizado - custosPr.realizado - apresentadoras.realizado - impostoPr.realizado),
      }
  return {
    receita,
    custos: { ...custosPr, por_grupo },
    apresentadoras,
    imposto: { ...impostoPr, aliquota: asNumber(imposto.aliquota), base: asNumber(imposto.base) },
    resultado,
  }
}

function somarDre(meses: DreMes[]): Omit<DreMes, 'mes'> {
  const soma = (sel: (m: DreMes) => PrevistoRealizado): PrevistoRealizado => ({
    previsto: r2(meses.reduce((s, m) => s + sel(m).previsto, 0)),
    realizado: r2(meses.reduce((s, m) => s + sel(m).realizado, 0)),
  })
  const grupos = new Set(meses.flatMap((m) => Object.keys(m.custos.por_grupo)))
  const por_grupo: Record<string, PrevistoRealizado> = {}
  for (const g of grupos) por_grupo[g] = soma((m) => m.custos.por_grupo[g] ?? { previsto: 0, realizado: 0 })
  const ultimo = meses[meses.length - 1]
  return {
    receita: soma((m) => m.receita),
    custos: { ...soma((m) => m.custos), por_grupo },
    apresentadoras: soma((m) => m.apresentadoras),
    imposto: { ...soma((m) => m.imposto), aliquota: ultimo?.imposto.aliquota ?? 0, base: r2(meses.reduce((s, m) => s + m.imposto.base, 0)) },
    resultado: soma((m) => m.resultado),
  }
}

export function normalizarDre(input: unknown, fallback: { inicio: string; fim: string }): DreResponse {
  const raw = rec(input)
  const meses: DreMes[] = (Array.isArray(raw.meses) ? raw.meses : [])
    .map((m) => ({ mes: (str(rec(m).mes) ?? '').slice(0, 7), ...normalizarDreLinha(m) }))
    .filter((m) => isMes(m.mes))
    .sort((a, b) => a.mes.localeCompare(b.mes))
  const totais = Object.keys(rec(raw.totais)).length && rec(raw.totais).receita != null
    ? normalizarDreLinha(raw.totais)
    : somarDre(meses)
  return {
    inicio: str(raw.inicio)?.slice(0, 7) ?? fallback.inicio,
    fim: str(raw.fim)?.slice(0, 7) ?? fallback.fim,
    meses,
    totais,
  }
}

// ── Fluxo de caixa ───────────────────────────────────────────────────────────

export const FAIXAS_FLUXO = ['5', '10', '15', '20', '25', '30', 'cartao'] as const
export type FaixaFluxo = (typeof FAIXAS_FLUXO)[number]

export function faixaLabel(chave: string): string {
  if (chave === 'cartao') return 'Cartão'
  return `Dia ${chave}`
}

/** Faixa de vencimento: até dia 5 → '5', 6–10 → '10' … 26+ → '30'; grupo cartão → 'cartao'. */
export function faixaDoLancamento(l: Pick<Lancamento, 'data_vencimento' | 'grupo' | 'natureza'>): FaixaFluxo {
  if (l.natureza === 'custo' && l.grupo === 'cartao') return 'cartao'
  const dia = l.data_vencimento ? Number(l.data_vencimento.slice(8, 10)) : 30
  if (!Number.isFinite(dia) || dia > 25) return '30'
  const faixa = Math.max(5, Math.ceil(dia / 5) * 5)
  return String(faixa) as FaixaFluxo
}

function acumular(linhas: Omit<FluxoLinha, 'acumulado'>[], saldoInicial: number): FluxoLinha[] {
  let prev = saldoInicial
  let real = saldoInicial
  return linhas.map((l) => {
    prev = r2(prev + l.saldo.previsto)
    real = r2(real + l.saldo.realizado)
    return { ...l, acumulado: { previsto: prev, realizado: real } }
  })
}

/** Fluxo do mês montado a partir dos lançamentos (fallback se /fluxo-caixa ainda estiver no formato legado). */
export function fluxoDeLancamentos(itens: Lancamento[], saldoInicial = 0): FluxoLinha[] {
  const base = new Map<string, Omit<FluxoLinha, 'acumulado'>>()
  for (const chave of FAIXAS_FLUXO) {
    base.set(chave, {
      chave,
      label: faixaLabel(chave),
      entradas: { previsto: 0, realizado: 0 },
      saidas: { previsto: 0, realizado: 0 },
      saldo: { previsto: 0, realizado: 0 },
    })
  }
  for (const l of itens) {
    const linha = base.get(faixaDoLancamento(l))!
    const alvo = l.natureza === 'receita' ? linha.entradas : linha.saidas
    // Perdido/cancelado não projeta nada; o que já foi pago continua realizado.
    if (!isEncerrado(l.status)) alvo.previsto = r2(alvo.previsto + l.valor_previsto)
    alvo.realizado = r2(alvo.realizado + l.valor_pago)
  }
  const linhas = [...base.values()].map((l) => ({
    ...l,
    saldo: {
      previsto: r2(l.entradas.previsto - l.saidas.previsto),
      realizado: r2(l.entradas.realizado - l.saidas.realizado),
    },
  }))
  return acumular(linhas, saldoInicial)
}

function chaveFaixa(raw: Record<string, unknown>): string | null {
  const v = str(raw.chave ?? raw.faixa ?? raw.dia ?? raw.grupo ?? raw.label)
  if (!v) return null
  const s = v.toLowerCase()
  if (s.includes('cart')) return 'cartao'
  const n = /\d+/.exec(s)
  return n ? String(Number(n[0])) : s
}

export function normalizarFluxo(input: unknown, mes: string): FluxoCaixaResponse | null {
  const raw = rec(input)
  const linhasRaw = Array.isArray(raw.linhas) ? raw.linhas : Array.isArray(raw.dias) ? raw.dias : null
  if (!linhasRaw) return null
  const saldoInicial = asNumber(raw.saldo_inicial)
  const linhasBase = linhasRaw.map((l) => {
    const r = rec(l)
    const chave = chaveFaixa(r) ?? '?'
    const entradas = pr(r.entradas, ['entradas_previstas', 'entradas_previsto'], ['entradas_realizadas', 'entradas_realizado'], r)
    const saidas = pr(r.saidas, ['saidas_previstas', 'saidas_previsto'], ['saidas_realizadas', 'saidas_realizado'], r)
    const saldo = r.saldo != null ? pr(r.saldo) : { previsto: r2(entradas.previsto - saidas.previsto), realizado: r2(entradas.realizado - saidas.realizado) }
    return { chave, label: str(r.label) ?? faixaLabel(chave), entradas, saidas, saldo, acumuladoRaw: r.acumulado }
  })
  const calc = acumular(linhasBase, saldoInicial)
  const linhas: FluxoLinha[] = linhasBase.map((l, i) => ({
    chave: l.chave,
    label: l.label,
    entradas: l.entradas,
    saidas: l.saidas,
    saldo: l.saldo,
    acumulado: l.acumuladoRaw != null ? pr(l.acumuladoRaw) : calc[i].acumulado,
  }))
  const ano = mes.slice(0, 4)
  const serie: FluxoSerieMes[] = (Array.isArray(raw.serie_anual) ? raw.serie_anual : []).map((s, i) => {
    const r = rec(s)
    const mRaw = str(r.mes)
    const mesKey = mRaw && /^\d{4}-\d{2}/.test(mRaw) ? mRaw.slice(0, 7) : `${ano}-${String(mRaw && /^\d{1,2}$/.test(mRaw) ? Number(mRaw) : i + 1).padStart(2, '0')}`
    const entradas = pr(r.entradas, ['entradas_previstas'], ['entradas_realizadas'], r)
    const saidas = pr(r.saidas, ['saidas_previstas'], ['saidas_realizadas'], r)
    return {
      mes: mesKey,
      entradas,
      saidas,
      saldo: r.saldo != null ? pr(r.saldo) : { previsto: r2(entradas.previsto - saidas.previsto), realizado: r2(entradas.realizado - saidas.realizado) },
    }
  })
  const soma = (sel: (l: FluxoLinha) => PrevistoRealizado): PrevistoRealizado => ({
    previsto: r2(linhas.reduce((s, l) => s + sel(l).previsto, 0)),
    realizado: r2(linhas.reduce((s, l) => s + sel(l).realizado, 0)),
  })
  return {
    mes,
    saldo_inicial: saldoInicial,
    linhas,
    serie_anual: serie,
    totais: { entradas: soma((l) => l.entradas), saidas: soma((l) => l.saidas), saldo: soma((l) => l.saldo) },
  }
}

// ── Formulários ──────────────────────────────────────────────────────────────

/** Data de vencimento sugerida: dia `dia` do mês `ym`, limitado ao último dia. */
export function vencimentoNoMes(ym: string, dia: number): string {
  const d = Math.min(Math.max(1, Math.trunc(dia) || 1), ultimoDiaMes(ym))
  return `${ym}-${String(d).padStart(2, '0')}`
}

/** Divide valor total em N parcelas em centavos; a última absorve o arredondamento. */
export function dividirParcelas(total: number, n: number): number[] {
  if (!(n >= 1) || !(total > 0)) return []
  const cents = Math.round(total * 100)
  const base = Math.floor(cents / n)
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? cents - base * (n - 1) : base) / 100)
}
