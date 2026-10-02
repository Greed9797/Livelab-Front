// Helpers puros da aba Receita (sem React / sem rede) — cobertos por receita-mensal.test.ts.
// Normaliza GET /v1/financeiro/receita?mes= de forma defensiva: o backend é feito em
// paralelo, então campos ausentes, números como string ou envelopes `{ data }` não quebram a tela.
import type { Lancamento, StatusLancamento } from '../types/financeiro'
import type {
  ComponenteReceita,
  LancamentoReceita,
  PerdaInfo,
  ReceitaCliente,
  ReceitaMarca,
  ReceitaMensal,
  TituloReceita,
  TotalReceita,
  TotalReceitaAberto,
  VisaoReceita,
} from '../types/financeiro-receita'
import { asNumber, formatMoney } from './format'
import { formatDataCurta, hojeSP, isMes, mesLabel, normalizarLancamento, shiftMes, valorEmAberto } from './financeiro'

type Raw = Record<string, unknown>

const r2 = (n: number) => Math.round(n * 100) / 100

function rec(v: unknown): Raw | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : null
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : []
}

function str(v: unknown): string | null {
  if (typeof v === 'string' && v.trim()) return v.trim()
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return null
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = asNumber(v, Number.NaN)
  return Number.isFinite(n) ? n : null
}

function isDia(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)
}

// ── Rótulos ──────────────────────────────────────────────────────────────────

export function rotuloComponente(c: ComponenteReceita): string {
  return c === 'fixo' ? 'Fixo' : 'Comissão'
}

export function labelTipoCobranca(tipo: string): string {
  if (tipo === 'fixo_mais_comissao') return 'Fixo + comissão'
  if (tipo === 'fixo_ou_comissao') return 'Fixo ou comissão'
  if (tipo === 'so_fixo' || tipo === 'fixo') return 'Só fixo'
  if (tipo === 'so_comissao' || tipo === 'comissao') return 'Só comissão'
  return tipo ? tipo.replace(/_/g, ' ') : '—'
}

/** 10 → '10%'; 12.5 → '12,5%'; null → '—'. */
const TIPO_MARCA_LABEL: Record<string, string> = { afiliada: 'afiliada', propria: 'própria', parceira: 'parceira' }

/**
 * Só marca de CLIENTE gera receita (fixo + % do GMV). Marca afiliada/própria/parceira
 * só aparece aqui por título antigo materializado antes da regra — a tela avisa para
 * revisar (dar como perdido ou corrigir o tipo no cadastro). null = backend antigo, sem aviso.
 */
export function avisoMarcaNaoCliente(m: Pick<ReceitaMarca, 'marca_tipo'>): string | null {
  if (!m.marca_tipo || m.marca_tipo === 'cliente') return null
  const tipo = TIPO_MARCA_LABEL[m.marca_tipo] ?? m.marca_tipo
  return `Marca ${tipo}: o GMV dela não é receita da casa. Revise este título (cadastro da marca ou dar como perdido).`
}

export function formatPct(pct: number | null | undefined): string {
  if (pct === null || pct === undefined || !Number.isFinite(pct)) return '—'
  return `${pct.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
}

/** Nota da modalidade "fixo ou comissão": a comissão bruta e a regra do maior. */
export function notaFixoOuComissao(m: Pick<ReceitaMarca, 'tipo_cobranca' | 'comissao_bruta' | 'fixo'>): string | null {
  if (m.tipo_cobranca !== 'fixo_ou_comissao') return null
  const fixo = m.fixo ? ` e fixo ${formatMoney(m.fixo.valor_previsto, true)}` : ''
  if (m.comissao_bruta === null) return 'Cobra-se o maior entre fixo e comissão.'
  return `Comissão bruta ${formatMoney(m.comissao_bruta, true)}${fixo}; cobra-se o maior.`
}

/**
 * Texto fixo competência × vencimento, com exemplo ancorado no mês selecionado:
 * o fixo do mês anterior vence no dia 5 deste mês.
 */
export function notaCompetenciaVencimento(mes: string): { competencia: string; vencimento: string; exemplo: string } {
  const anterior = isMes(mes) ? shiftMes(mes, -1) : mes
  const mm = isMes(mes) ? mes.slice(5, 7) : '—'
  const nomeAnterior = mesLabel(anterior).split(' de ')[0]
  const nomeMes = mesLabel(mes).split(' de ')[0]
  return {
    competencia: 'Competência é o mês em que a receita foi ganha (bate com a receita do DRE).',
    vencimento: 'Vencimento é o mês em que o dinheiro cai no caixa (bate com as entradas do fluxo de caixa).',
    exemplo: `Ex.: o fixo de ${nomeAnterior} vence em 05/${mm} — conta na competência de ${nomeAnterior}, mas entra no caixa em ${nomeMes}.`,
  }
}

export function isAporte(l: Pick<Lancamento, 'grupo'>): boolean {
  return l.grupo === 'aporte'
}

// ── Perdas ───────────────────────────────────────────────────────────────────
// Receita perdida (SPEC perdas): título/avulsa que o cliente não vai pagar. Sai do "a receber" e do
// "atrasado"; o previsto da competência NÃO muda (a perda aparece em linha própria no DRE).

/** Item perdido: status derivado 'perdido' do backend ou registro de perda preenchido. */
export function isPerdido(l: { status?: string; perdido_em?: string | null }): boolean {
  return l.status === 'perdido' || Boolean(l.perdido_em)
}

/** Motivo da perda (vazio quando não informado). */
export function motivoPerda(l: PerdaInfo): string | null {
  const m = l.perdido_motivo
  return typeof m === 'string' && m.trim() ? m.trim() : null
}

/** Anexa o registro de perda do payload cru e garante o status 'perdido' mesmo sem o normalizador base conhecê-lo. */
function anexarPerda<T extends Lancamento>(l: T, raw: Raw): T & PerdaInfo {
  const perdido_em = str(raw.perdido_em)
  const perdido_motivo = str(raw.perdido_motivo)
  const perdido = raw.status === 'perdido' || perdido_em !== null
  return { ...l, status: perdido ? ('perdido' as StatusLancamento) : l.status, perdido_em, perdido_motivo }
}

/** Soma do saldo encerrado (previsto − pago) dos itens perdidos. */
export function somaPerdido(itens: (Pick<Lancamento, 'valor_previsto' | 'valor_pago'> & { status?: string; perdido_em?: string | null })[]): number {
  return r2(itens.filter(isPerdido).reduce((acc, l) => acc + valorEmAberto(l), 0))
}

// ── Normalização ─────────────────────────────────────────────────────────────

interface CtxMarca {
  marca_id: string | null
  marca_nome: string | null
  cliente_id: string | null
  cliente_nome: string | null
}

function componenteDe(v: unknown): ComponenteReceita | null {
  return v === 'fixo' || v === 'comissao' ? v : null
}

/** Título (fixo/comissão) da marca → Lancamento de receita comercial (rotaBaixa: /receitas/:id). */
export function normalizarTitulo(input: unknown, componente: ComponenteReceita, ctx: CtxMarca, hoje: string = hojeSP()): TituloReceita | null {
  const raw = rec(input)
  if (!raw) return null
  const comp = componenteDe(raw.componente) ?? componente
  const marca = ctx.marca_nome ?? str(raw.marca_nome)
  const l = normalizarLancamento(
    {
      ...raw,
      natureza: 'receita',
      origem: 'comercial',
      componente: comp,
      descricao: str(raw.descricao) ?? [rotuloComponente(comp), marca].filter(Boolean).join(' · '),
      marca_id: ctx.marca_id ?? raw.marca_id,
      marca_nome: marca,
      cliente_id: ctx.cliente_id ?? raw.cliente_id,
      cliente_nome: ctx.cliente_nome ?? raw.cliente_nome,
    },
    hoje,
  )
  return { ...anexarPerda(l, raw), componente: comp, divergente: raw.divergente === true }
}

function somaTitulos(...ts: (Lancamento | null)[]): TotalReceita {
  return ts.reduce<TotalReceita>(
    (acc, t) => (t ? { previsto: r2(acc.previsto + t.valor_previsto), pago: r2(acc.pago + t.valor_pago) } : acc),
    { previsto: 0, pago: 0 },
  )
}

function normalizarTotal(input: unknown, fallback: TotalReceita): TotalReceita {
  const raw = rec(input)
  if (!raw) return fallback
  return {
    previsto: raw.previsto === undefined ? fallback.previsto : asNumber(raw.previsto),
    pago: raw.pago === undefined ? fallback.pago : asNumber(raw.pago ?? raw.realizado),
  }
}

/**
 * `perdido`/`aberto` do backend; sem eles, deriva dos itens: perdido = saldo encerrado dos perdidos,
 * aberto = previsto − recebido − perdido (perdidos nunca contam como "em aberto").
 */
function normalizarTotalAberto(input: unknown, fallback: TotalReceita, perdidoFallback = 0): TotalReceitaAberto {
  const t = normalizarTotal(input, fallback)
  const raw = rec(input)
  const perdido = raw && raw.perdido !== undefined ? asNumber(raw.perdido) : perdidoFallback
  const aberto = raw && raw.aberto !== undefined ? asNumber(raw.aberto) : Math.max(0, r2(t.previsto - t.pago - perdido))
  return { ...t, aberto, perdido }
}

export function normalizarMarca(input: unknown, cliente: { cliente_id: string; cliente_nome: string }, hoje: string = hojeSP()): ReceitaMarca | null {
  const raw = rec(input)
  if (!raw) return null
  const marca_id = str(raw.marca_id) ?? str(raw.id) ?? ''
  const marca_nome = str(raw.marca_nome) ?? str(raw.nome) ?? 'Marca'
  const ctx: CtxMarca = { marca_id, marca_nome, cliente_id: cliente.cliente_id || null, cliente_nome: cliente.cliente_nome }
  const fixo = normalizarTitulo(raw.fixo, 'fixo', ctx, hoje)
  const comissao = normalizarTitulo(raw.comissao, 'comissao', ctx, hoje)
  const gmv = asNumber(raw.gmv)
  const comissao_bruta = numOrNull(raw.comissao_bruta)
  let pct = numOrNull(raw.pct ?? raw.comissao_franquia_pct ?? raw.comissao_pct)
  if (pct === null && gmv > 0 && comissao_bruta !== null) pct = r2((comissao_bruta / gmv) * 100)
  const em_apuracao =
    raw.em_apuracao === true || (raw.em_apuracao === undefined && comissao === null && pct !== null && pct > 0)
  return {
    marca_id,
    marca_nome,
    marca_tipo: str(raw.marca_tipo),
    tipo_cobranca: str(raw.tipo_cobranca) ?? 'fixo_mais_comissao',
    pct,
    gmv,
    comissao_bruta,
    em_apuracao,
    fixo,
    comissao,
    total: normalizarTotal(raw.total, somaTitulos(fixo, comissao)),
  }
}

export function normalizarCliente(input: unknown, hoje: string = hojeSP()): ReceitaCliente | null {
  const raw = rec(input)
  if (!raw) return null
  const cliente_id = str(raw.cliente_id) ?? str(raw.id) ?? ''
  const cliente_nome = str(raw.cliente_nome) ?? str(raw.nome) ?? 'Sem cliente'
  const marcas = arr(raw.marcas)
    .map((m) => normalizarMarca(m, { cliente_id, cliente_nome }, hoje))
    .filter((m): m is ReceitaMarca => m !== null)
  const soma = marcas.reduce<TotalReceita>(
    (acc, m) => ({ previsto: r2(acc.previsto + m.total.previsto), pago: r2(acc.pago + m.total.pago) }),
    { previsto: 0, pago: 0 },
  )
  return { cliente_id, cliente_nome, total: normalizarTotal(raw.total, soma), marcas }
}

/** Receita avulsa / aporte → Lancamento (rotaBaixa: /receitas-avulsas/:id). */
export function normalizarAvulsa(input: unknown, hoje: string = hojeSP(), grupoPadrao?: string): LancamentoReceita | null {
  const raw = rec(input)
  if (!raw) return null
  return anexarPerda(normalizarLancamento({ ...raw, natureza: 'receita', origem: 'avulsa', grupo: raw.grupo ?? grupoPadrao }, hoje), raw)
}

/** Item da visão vencimento: título comercial (fixo/comissão) ou receita avulsa. */
export function normalizarItemVencimento(input: unknown, hoje: string = hojeSP()): LancamentoReceita | null {
  const raw = rec(input)
  if (!raw) return null
  const comp = componenteDe(raw.componente)
  const avulsa = raw.origem === 'avulsa' || raw.tipo === 'avulsa' || !comp
  if (avulsa) return normalizarAvulsa(raw, hoje)
  return normalizarTitulo(raw, comp, {
    marca_id: str(raw.marca_id),
    marca_nome: str(raw.marca_nome),
    cliente_id: str(raw.cliente_id),
    cliente_nome: str(raw.cliente_nome),
  }, hoje)
}

export function ordenarPorVencimento<T extends Pick<Lancamento, 'data_vencimento' | 'descricao'>>(itens: T[]): T[] {
  return [...itens].sort((a, b) => {
    const da = a.data_vencimento ?? '9999-99-99'
    const db = b.data_vencimento ?? '9999-99-99'
    return da === db ? a.descricao.localeCompare(b.descricao, 'pt-BR') : da < db ? -1 : 1
  })
}

function somaLancamentos(itens: Lancamento[]): TotalReceita {
  return itens.reduce<TotalReceita>(
    (acc, l) => ({ previsto: r2(acc.previsto + l.valor_previsto), pago: r2(acc.pago + l.valor_pago) }),
    { previsto: 0, pago: 0 },
  )
}

/** Todos os títulos (fixo/comissão) das marcas, em ordem de cliente → marca. */
export function titulosDosClientes(clientes: ReceitaCliente[]): TituloReceita[] {
  return clientes.flatMap((c) => c.marcas.flatMap((m) => [m.fixo, m.comissao].filter((t): t is TituloReceita => t !== null)))
}

/** Em aberto com vencimento dentro do mês (fallback de `a_receber_mes`); perdidos ficam de fora. */
export function calcularAReceberMes(
  itens: (Pick<Lancamento, 'data_vencimento' | 'valor_previsto' | 'valor_pago'> & { status?: string; perdido_em?: string | null })[],
  mes: string,
): number {
  return r2(
    itens
      .filter((l) => !isPerdido(l))
      .filter((l) => Boolean(l.data_vencimento && l.data_vencimento.slice(0, 7) === mes))
      .reduce((acc, l) => acc + valorEmAberto(l), 0),
  )
}

export function normalizarReceitaMensal(input: unknown, mesPedido: string): ReceitaMensal {
  let raw = rec(input) ?? {}
  if (!raw.competencia && !raw.vencimento && rec(raw.data)) raw = rec(raw.data)!
  const mes = isMes(str(raw.mes)?.slice(0, 7)) ? str(raw.mes)!.slice(0, 7) : mesPedido
  const hoje = isDia(raw.hoje) ? raw.hoje.slice(0, 10) : hojeSP()
  const corte = rec(raw.corte)
  const dataCorteRaw = corte ? corte.data_corte : raw.data_corte
  const data_corte = isDia(dataCorteRaw) ? dataCorteRaw.slice(0, 10) : null

  const comp = rec(raw.competencia) ?? {}
  const clientes = arr(comp.clientes)
    .map((c) => normalizarCliente(c, hoje))
    .filter((c): c is ReceitaCliente => c !== null)
  const avulsasTodas = arr(comp.avulsas)
    .map((a) => normalizarAvulsa(a, hoje))
    .filter((a): a is LancamentoReceita => a !== null)
  // Defensivo: aporte que vier misturado nas avulsas vai para o bloco de aportes (fora da receita).
  const avulsas = avulsasTodas.filter((a) => !isAporte(a))
  const aportes = [
    ...avulsasTodas.filter(isAporte),
    ...arr(comp.aportes)
      .map((a) => normalizarAvulsa(a, hoje, 'aporte'))
      .filter((a): a is LancamentoReceita => a !== null),
  ]
  const somaClientes = clientes.reduce<TotalReceita>(
    (acc, c) => ({ previsto: r2(acc.previsto + c.total.previsto), pago: r2(acc.pago + c.total.pago) }),
    { previsto: 0, pago: 0 },
  )
  const somaAvulsas = somaLancamentos(avulsas)
  const perdidoCompetencia = r2(somaPerdido(titulosDosClientes(clientes)) + somaPerdido(avulsas))
  const totalCompetencia = normalizarTotalAberto(
    comp.total,
    {
      previsto: r2(somaClientes.previsto + somaAvulsas.previsto),
      pago: r2(somaClientes.pago + somaAvulsas.pago),
    },
    perdidoCompetencia,
  )

  const venc = rec(raw.vencimento) ?? {}
  const itensVenc = ordenarPorVencimento(
    arr(venc.itens)
      .map((i) => normalizarItemVencimento(i, hoje))
      .filter((i): i is LancamentoReceita => i !== null),
  )
  const totalVencimento = normalizarTotalAberto(venc.total, somaLancamentos(itensVenc), somaPerdido(itensVenc.filter((i) => !isAporte(i))))

  const fonteAReceber: LancamentoReceita[] = itensVenc.length ? itensVenc : [...titulosDosClientes(clientes), ...avulsas, ...aportes]
  const aReceberRaw = numOrNull(raw.a_receber_mes)

  return {
    mes,
    hoje,
    data_corte,
    competencia: { total: totalCompetencia, clientes, avulsas, aportes },
    vencimento: { total: totalVencimento, itens: itensVenc },
    a_receber_mes: aReceberRaw ?? calcularAReceberMes(fonteAReceber, mes),
  }
}

// ── Visão / apresentação ─────────────────────────────────────────────────────

export function totaisDaVisao(data: ReceitaMensal, visao: VisaoReceita): TotalReceitaAberto {
  return visao === 'vencimento' ? data.vencimento.total : data.competencia.total
}

export function pctRecebido(t: TotalReceita): number {
  return t.previsto > 0 ? Math.min(100, Math.round((t.pago / t.previsto) * 100)) : 0
}

function semAcento(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Busca por cliente ou marca (sem acento). Cliente que casa mantém todas as marcas. */
export function filtrarClientes(clientes: ReceitaCliente[], q: string): ReceitaCliente[] {
  const termo = semAcento(q.trim())
  if (!termo) return clientes
  return clientes.flatMap((c) => {
    if (semAcento(c.cliente_nome).includes(termo)) return [c]
    const marcas = c.marcas.filter((m) => semAcento(m.marca_nome).includes(termo))
    return marcas.length ? [{ ...c, marcas }] : []
  })
}

export interface GrupoVencimento {
  data: string | null
  itens: LancamentoReceita[]
  previsto: number
}

/** Agrupa a visão vencimento por dia (itens já ordenados). O total do dia não conta perdidos (não entram no caixa). */
export function agruparPorVencimento(itens: LancamentoReceita[]): GrupoVencimento[] {
  const grupos: GrupoVencimento[] = []
  for (const l of ordenarPorVencimento(itens)) {
    const data = l.data_vencimento
    const last = grupos[grupos.length - 1]
    if (last && last.data === data) {
      last.itens.push(l)
      last.previsto = r2(last.previsto + (isPerdido(l) ? 0 : l.valor_previsto))
    } else {
      grupos.push({ data, itens: [l], previsto: isPerdido(l) ? 0 : l.valor_previsto })
    }
  }
  return grupos
}

/** 'competência set/26 · vence 05/10' — contexto do título na visão vencimento. */
export function contextoTitulo(l: Pick<Lancamento, 'competencia' | 'data_vencimento'>): string {
  const comp = l.competencia ? mesLabel(l.competencia.slice(0, 7), true) : null
  return [comp ? `competência ${comp}` : null, l.data_vencimento ? `vence ${formatDataCurta(l.data_vencimento)}` : null]
    .filter(Boolean)
    .join(' · ')
}

export function receitaVazia(data: ReceitaMensal, visao: VisaoReceita): boolean {
  if (visao === 'vencimento') return data.vencimento.itens.length === 0
  const c = data.competencia
  return c.clientes.length === 0 && c.avulsas.length === 0 && c.aportes.length === 0
}
