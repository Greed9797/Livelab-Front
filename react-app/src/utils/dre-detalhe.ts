// Helpers puros do DRE v3 (sem React / sem rede) — cobertos por dre-detalhe.test.ts.
// Normalização defensiva do DRE anual (com custos_fixos / custos_variaveis /
// aportes) e do detalhe do mês (GET /financeiro/dre/mes). Reaproveita o
// normalizador antigo de utils/financeiro.ts para as chaves legadas.
import type { DreMes, PrevistoRealizado } from '../types/financeiro'
import type {
  DreAnualV3,
  DreApresentadoraFixo,
  DreApresentadoraVariavel,
  DreCaixa,
  DreDeltas,
  DreDetalheCliente,
  DreDetalheGrupo,
  DreDetalheItem,
  DreDetalheMarca,
  DreLinhaV3,
  DreMesDetalheResponse,
  DreMesV3,
  ReceitaPartes,
  VisaoDre,
} from '../types/financeiro-dre'
import { isDataISO } from './caixa'
import { grupoLabel, isMes, normalizarDre, shiftMes } from './financeiro'
import { asNumber } from './format'

// ── Primitivos ───────────────────────────────────────────────────────────────

const r2 = (n: number) => Math.round(n * 100) / 100

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

function str(v: unknown): string | null {
  if (typeof v === 'string' && v.trim()) return v
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return null
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : []
}

export const ZERO_PR: PrevistoRealizado = Object.freeze({ previsto: 0, realizado: 0 }) as PrevistoRealizado

/** Aceita {previsto, realizado}, {previsto, pago}, número (= previsto) ou nada. */
export function normalizarPR(v: unknown): PrevistoRealizado {
  if (typeof v === 'number' || typeof v === 'string') return { previsto: asNumber(v), realizado: 0 }
  const r = rec(v)
  return {
    previsto: asNumber(r.previsto ?? r.valor_previsto ?? r.previstas),
    realizado: asNumber(r.realizado ?? r.pago ?? r.valor_pago ?? r.realizadas),
  }
}

function temPR(v: unknown): boolean {
  if (typeof v === 'number') return true
  const r = rec(v)
  return r.previsto != null || r.realizado != null || r.pago != null
}

export function somarPR(...vs: PrevistoRealizado[]): PrevistoRealizado {
  return {
    previsto: r2(vs.reduce((s, v) => s + v.previsto, 0)),
    realizado: r2(vs.reduce((s, v) => s + v.realizado, 0)),
  }
}

export function subtrairPR(a: PrevistoRealizado, b: PrevistoRealizado): PrevistoRealizado {
  return { previsto: r2(a.previsto - b.previsto), realizado: r2(a.realizado - b.realizado) }
}

// ── Itens ────────────────────────────────────────────────────────────────────

export function normalizarItem(input: unknown, idx = 0): DreDetalheItem {
  const r = rec(input)
  return {
    id: str(r.id) ?? `item-${idx}`,
    descricao: str(r.descricao) ?? str(r.nome) ?? 'Sem descrição',
    origem: str(r.origem),
    grupo: str(r.grupo),
    previsto: asNumber(r.previsto ?? r.valor_previsto ?? r.valor),
    realizado: asNumber(r.realizado ?? r.valor_pago ?? r.pago),
    status: str(r.status) ?? (str(r.perdido_em) ? 'perdido' : str(r.cancelado_em) ? 'cancelado' : null),
    data_vencimento: str(r.data_vencimento)?.slice(0, 10) ?? null,
    motivo: str(r.perdido_motivo)?.trim() || str(r.cancelado_motivo)?.trim() || str(r.motivo)?.trim() || null,
    encerrado_em: str(r.perdido_em) ?? str(r.cancelado_em),
    // `previsto` de um custo cancelado já vem sem o saldo cancelado (parte efetiva); o que foi
    // encerrado de fato está em valor_encerrado.
    valor_encerrado: r.valor_encerrado == null ? null : asNumber(r.valor_encerrado),
  }
}

export function itemEncerrado(i: Pick<DreDetalheItem, 'status'>): boolean {
  return i.status === 'perdido' || i.status === 'cancelado'
}

/** `perdas` do backend: { receita: { valor } }, { receita: número } ou ausente (= 0). */
export function normalizarPerdas(v: unknown): { receita: number } {
  const receita = rec(v).receita
  const valor = typeof receita === 'object' && receita !== null ? rec(receita).valor : receita
  return { receita: r2(asNumber(valor)) }
}

/** Perdidos/cancelados do detalhe: itens com esse status em qualquer seção + listas explícitas do backend. */
function coletarEncerrados(raw: Record<string, unknown>, secoes: DreDetalheItem[][]): DreDetalheItem[] {
  const extras = [
    raw.encerrados,
    raw.perdidos,
    raw.cancelados,
    rec(raw.perdas).itens,
    rec(raw.receita).perdidos,
    rec(raw.custos_fixos).cancelados,
    rec(raw.custos_variaveis).cancelados,
  ].flatMap((l) => arr(l).map((i, idx) => normalizarItem(i, idx)))
  const vistos = new Set<string>()
  return [...secoes.flat(), ...extras]
    .filter(itemEncerrado)
    .filter((i) => (vistos.has(i.id) ? false : (vistos.add(i.id), true)))
}

function totalDeItens(itens: DreDetalheItem[]): PrevistoRealizado {
  return {
    previsto: r2(itens.reduce((s, i) => s + i.previsto, 0)),
    realizado: r2(itens.reduce((s, i) => s + i.realizado, 0)),
  }
}

/** `caixa` do detalhe do mês: null quando o backend não manda. */
export function normalizarCaixa(v: unknown): DreCaixa | null {
  const r = rec(v)
  if (r.saldo_inicio_mes == null && r.saldo_abertura == null) return null
  const corte = str(r.data_corte)?.slice(0, 10)
  return {
    saldo_inicio_mes: asNumber(r.saldo_inicio_mes),
    saldo_abertura: asNumber(r.saldo_abertura),
    data_corte: corte && isDataISO(corte) ? corte : null,
    origem: r.origem === 'caixa' ? 'caixa' : 'padrao',
  }
}

/** `aportes` pode vir como lista de itens (detalhe) ou {previsto, realizado} (linha). */
export function normalizarAportes(v: unknown): PrevistoRealizado {
  if (Array.isArray(v)) return totalDeItens(v.map(normalizarItem))
  return normalizarPR(v)
}

// ── Linha do DRE v3 ──────────────────────────────────────────────────────────

const LINHA_VAZIA: Omit<DreMes, 'mes'> = {
  receita: ZERO_PR,
  custos: { ...ZERO_PR, por_grupo: {} },
  apresentadoras: ZERO_PR,
  imposto: { ...ZERO_PR, aliquota: 0, base: 0 },
  resultado: ZERO_PR,
}

/** Chaves antigas via normalizador legado (sem duplicar a lógica dele). */
function linhaLegada(raw: Record<string, unknown>): Omit<DreMes, 'mes'> {
  if (raw.receita == null) return { ...LINHA_VAZIA, custos: { ...ZERO_PR, por_grupo: {} } }
  return normalizarDre({ meses: [], totais: raw }, { inicio: '', fim: '' }).totais
}

function receitaPartes(raw: Record<string, unknown>): ReceitaPartes | null {
  const receita = rec(raw.receita)
  const fonte = Object.keys(rec(raw.receita_partes)).length ? rec(raw.receita_partes) : receita
  if (!temPR(fonte.fixo) && !temPR(fonte.comissao) && !temPR(fonte.avulsas)) return null
  return { fixo: normalizarPR(fonte.fixo), comissao: normalizarPR(fonte.comissao), avulsas: normalizarPR(fonte.avulsas) }
}

/**
 * Linha v3. Com `custos_fixos`/`custos_variaveis` da API usa direto; senão
 * estima pelas chaves antigas: fixos = custos (recorrentes/parcelas/pontuais),
 * variáveis = apresentadoras + imposto. Resultado: o da API; se faltar,
 * receita − fixos − variáveis.
 */
export function normalizarLinhaV3(input: unknown): DreLinhaV3 {
  const raw = rec(input)
  const base = linhaLegada(raw)
  const temNovas = temPR(raw.custos_fixos) || temPR(raw.custos_variaveis)
  const custos_fixos = temNovas ? normalizarPR(raw.custos_fixos) : { previsto: base.custos.previsto, realizado: base.custos.realizado }
  const custos_variaveis = temNovas ? normalizarPR(raw.custos_variaveis) : somarPR(base.apresentadoras, base.imposto)
  const perdas = normalizarPerdas(raw.perdas)
  // Sem `resultado` da API: a perda desconta só do previsto (o realizado não muda).
  const resultado =
    raw.resultado != null
      ? base.resultado
      : subtrairPR(subtrairPR(subtrairPR(base.receita, { previsto: perdas.receita, realizado: 0 }), custos_fixos), custos_variaveis)
  return {
    ...base,
    resultado,
    perdas,
    custos_fixos,
    custos_variaveis,
    aportes: normalizarAportes(raw.aportes),
    receita_partes: receitaPartes(raw),
    classificacao: temNovas ? 'api' : 'estimada',
  }
}

function somarLinhas(meses: DreLinhaV3[]): DreLinhaV3 {
  const soma = (sel: (m: DreLinhaV3) => PrevistoRealizado) => somarPR(...meses.map(sel))
  const grupos = new Set(meses.flatMap((m) => Object.keys(m.custos.por_grupo)))
  const por_grupo: Record<string, PrevistoRealizado> = {}
  for (const g of grupos) por_grupo[g] = soma((m) => m.custos.por_grupo[g] ?? ZERO_PR)
  const comPartes = meses.filter((m) => m.receita_partes)
  return {
    receita: soma((m) => m.receita),
    custos: { ...soma((m) => m.custos), por_grupo },
    apresentadoras: soma((m) => m.apresentadoras),
    imposto: {
      ...soma((m) => m.imposto),
      aliquota: meses[meses.length - 1]?.imposto.aliquota ?? 0,
      base: r2(meses.reduce((s, m) => s + m.imposto.base, 0)),
    },
    resultado: soma((m) => m.resultado),
    custos_fixos: soma((m) => m.custos_fixos),
    custos_variaveis: soma((m) => m.custos_variaveis),
    aportes: soma((m) => m.aportes),
    perdas: { receita: r2(meses.reduce((s, m) => s + m.perdas.receita, 0)) },
    receita_partes: comPartes.length
      ? {
          fixo: somarPR(...comPartes.map((m) => m.receita_partes!.fixo)),
          comissao: somarPR(...comPartes.map((m) => m.receita_partes!.comissao)),
          avulsas: somarPR(...comPartes.map((m) => m.receita_partes!.avulsas)),
        }
      : null,
    classificacao: meses.length && meses.every((m) => m.classificacao === 'api') ? 'api' : 'estimada',
  }
}

/** GET /financeiro/resumo → DRE anual v3 (inclui aportes e fixos/variáveis). */
export function normalizarDreAnualV3(input: unknown, fallback: { inicio: string; fim: string }): DreAnualV3 {
  const raw = rec(input)
  const meses: DreMesV3[] = arr(raw.meses)
    .map((m) => ({ ...normalizarLinhaV3(m), mes: (str(rec(m).mes) ?? '').slice(0, 7) }))
    .filter((m) => isMes(m.mes))
    .sort((a, b) => a.mes.localeCompare(b.mes))
  const totaisRaw = rec(raw.totais)
  let totais: DreLinhaV3
  if (totaisRaw.receita != null) {
    totais = normalizarLinhaV3(totaisRaw)
    // Totais antigos sem as chaves novas: soma dos meses é mais fiel que a estimativa.
    if (totais.classificacao === 'estimada' && meses.some((m) => m.classificacao === 'api')) {
      const soma = somarLinhas(meses)
      totais = { ...totais, custos_fixos: soma.custos_fixos, custos_variaveis: soma.custos_variaveis, classificacao: soma.classificacao }
    }
    if (totaisRaw.aportes == null) totais = { ...totais, aportes: somarLinhas(meses).aportes }
    if (totaisRaw.perdas == null) totais = { ...totais, perdas: somarLinhas(meses).perdas }
  } else {
    totais = somarLinhas(meses)
  }
  return {
    inicio: str(raw.inicio)?.slice(0, 7) ?? fallback.inicio,
    fim: str(raw.fim)?.slice(0, 7) ?? fallback.fim,
    meses,
    totais,
  }
}

// ── Detalhe do mês ───────────────────────────────────────────────────────────

function normalizarMarca(input: unknown, idx: number): DreDetalheMarca {
  const r = rec(input)
  const fixo = normalizarPR(r.fixo)
  const comissao = normalizarPR(r.comissao)
  return {
    marca_id: str(r.marca_id) ?? str(r.id) ?? `marca-${idx}`,
    marca_nome: str(r.marca_nome) ?? str(r.nome) ?? 'Marca',
    fixo,
    comissao,
    total: temPR(r.total) ? normalizarPR(r.total) : somarPR(fixo, comissao),
    gmv: asNumber(r.gmv),
    pct: asNumber(r.pct),
  }
}

function normalizarCliente(input: unknown, idx: number): DreDetalheCliente {
  const r = rec(input)
  const marcas = arr(r.marcas).map(normalizarMarca)
  return {
    cliente_id: str(r.cliente_id) ?? str(r.id) ?? `cliente-${idx}`,
    cliente_nome: str(r.cliente_nome) ?? str(r.nome) ?? 'Sem cliente',
    marcas,
    total: temPR(r.total) ? normalizarPR(r.total) : somarPR(...marcas.map((m) => m.total)),
  }
}

function normalizarGrupos(v: unknown): DreDetalheGrupo[] {
  // Aceita lista [{grupo, total, itens}] ou mapa {grupo: {total|previsto.., itens}}.
  const lista: Record<string, unknown>[] = Array.isArray(v)
    ? v.map((g) => rec(g))
    : Object.entries(rec(v)).map(([grupo, g]) => ({ grupo, ...rec(g) }))
  return lista.map((g) => {
    const itens = arr(g.itens).map(normalizarItem)
    const total = temPR(g.total) ? normalizarPR(g.total) : temPR(g) ? normalizarPR(g) : totalDeItens(itens)
    return { grupo: str(g.grupo) ?? 'outros', total, itens }
  })
}

function normalizarApresFixo(input: unknown, idx: number): DreApresentadoraFixo {
  const r = rec(input)
  return {
    apresentadora_id: str(r.apresentadora_id) ?? str(r.id) ?? `apresentadora-${idx}`,
    nome: str(r.nome) ?? str(r.apresentadora_nome) ?? 'Apresentadora',
    previsto: asNumber(r.previsto ?? r.valor_previsto ?? r.fixo),
    realizado: asNumber(r.realizado ?? r.valor_pago ?? r.pago),
  }
}

function normalizarApresVar(input: unknown, idx: number): DreApresentadoraVariavel {
  const r = rec(input)
  const comissao = asNumber(r.comissao)
  const adicionais = asNumber(r.adicionais)
  const base = normalizarApresFixo(input, idx)
  return {
    ...base,
    previsto: r.previsto != null || r.valor_previsto != null ? base.previsto : r2(comissao + adicionais),
    comissao,
    adicionais,
  }
}

function totalOu(v: unknown, fallback: PrevistoRealizado): PrevistoRealizado {
  return temPR(v) ? normalizarPR(v) : fallback
}

/** GET /financeiro/dre/mes?mes=YYYY-MM → detalhe normalizado. */
export function normalizarDreMesDetalhe(input: unknown, mes: string): DreMesDetalheResponse {
  const raw = rec(input)
  const temAtual = Object.keys(rec(raw.atual)).length > 0
  const atualBase = temAtual ? normalizarLinhaV3(raw.atual) : null
  // `perdas` pode vir na linha `atual` ou no topo da resposta.
  const atualApi = atualBase && rec(raw.atual).perdas == null && raw.perdas != null ? { ...atualBase, perdas: normalizarPerdas(raw.perdas) } : atualBase
  const anterior = Object.keys(rec(raw.anterior)).length > 0 ? normalizarLinhaV3(raw.anterior) : null

  const receitaRaw = rec(raw.receita)
  const por_cliente = arr(receitaRaw.por_cliente).map(normalizarCliente)
  const avulsas = arr(receitaRaw.avulsas).map(normalizarItem)

  const fixosRaw = rec(raw.custos_fixos)
  const fixosGrupos = normalizarGrupos(fixosRaw.por_grupo)
  const apresFixo = arr(fixosRaw.apresentadoras_fixo).map(normalizarApresFixo)

  const varRaw = rec(raw.custos_variaveis)
  const varGrupos = normalizarGrupos(varRaw.por_grupo)
  const apresVar = arr(varRaw.apresentadoras_variavel).map(normalizarApresVar)
  const impRaw = rec(varRaw.imposto)
  const imposto = {
    ...(temPR(impRaw) ? normalizarPR(impRaw) : atualApi ? { previsto: atualApi.imposto.previsto, realizado: atualApi.imposto.realizado } : ZERO_PR),
    aliquota: impRaw.aliquota != null ? asNumber(impRaw.aliquota) : (atualApi?.imposto.aliquota ?? 0),
    base: impRaw.base != null ? asNumber(impRaw.base) : (atualApi?.imposto.base ?? 0),
    base_tipo: str(impRaw.base_tipo),
    mes_base: str(impRaw.mes_base)?.slice(0, 7) ?? null,
  }

  const somaPessoas = (ps: { previsto: number; realizado: number }[]) => totalDeItens(ps.map((p, i) => normalizarItem(p, i)))
  const receitaTotal = totalOu(receitaRaw.total, atualApi ? atualApi.receita : somarPR(...por_cliente.map((c) => c.total), totalDeItens(avulsas)))
  const fixosTotal = totalOu(
    fixosRaw.total,
    atualApi?.classificacao === 'api' ? atualApi.custos_fixos : somarPR(...fixosGrupos.map((g) => g.total), somaPessoas(apresFixo)),
  )
  const varTotal = totalOu(
    varRaw.total,
    atualApi?.classificacao === 'api' ? atualApi.custos_variaveis : somarPR(...varGrupos.map((g) => g.total), somaPessoas(apresVar), imposto),
  )

  const perdasMes = normalizarPerdas(raw.perdas)

  // Sem `atual` (backend parcial): sintetiza a linha a partir das seções.
  const atual: DreLinhaV3 = atualApi ?? {
    ...LINHA_VAZIA,
    custos: { ...ZERO_PR, por_grupo: {} },
    receita: receitaTotal,
    imposto: { previsto: imposto.previsto, realizado: imposto.realizado, aliquota: imposto.aliquota, base: imposto.base },
    resultado: subtrairPR(subtrairPR(subtrairPR(receitaTotal, { previsto: perdasMes.receita, realizado: 0 }), fixosTotal), varTotal),
    perdas: perdasMes,
    custos_fixos: fixosTotal,
    custos_variaveis: varTotal,
    aportes: normalizarAportes(raw.aportes),
    receita_partes: null,
    classificacao: 'api',
  }

  const margemRaw = rec(raw.margem)
  const contribuicao = totalOu(margemRaw.contribuicao, subtrairPR(receitaTotal, varTotal))
  const pct = totalOu(margemRaw.pct, {
    previsto: margemPct(contribuicao.previsto, receitaTotal.previsto),
    realizado: margemPct(contribuicao.realizado, receitaTotal.realizado),
  })

  const deltaRaw = rec(raw.delta)
  const deltaDe = (k: keyof DreDeltas): PrevistoRealizado => {
    const v = deltaRaw[k]
    if (v && typeof v === 'object' && temPR(v)) return normalizarPR(v)
    if (anterior) return subtrairPR(atual[k], anterior[k])
    if (typeof v === 'number' || typeof v === 'string') return { previsto: asNumber(v), realizado: asNumber(v) }
    return ZERO_PR
  }

  return {
    mes: (str(raw.mes) ?? mes).slice(0, 7),
    atual,
    anterior,
    delta: {
      receita: deltaDe('receita'),
      custos_fixos: deltaDe('custos_fixos'),
      custos_variaveis: deltaDe('custos_variaveis'),
      resultado: deltaDe('resultado'),
    },
    receita: { por_cliente, avulsas, total: receitaTotal },
    custos_fixos: { total: fixosTotal, por_grupo: fixosGrupos, apresentadoras_fixo: apresFixo },
    custos_variaveis: { total: varTotal, por_grupo: varGrupos, apresentadoras_variavel: apresVar, imposto },
    aportes: arr(raw.aportes).map(normalizarItem),
    caixa: normalizarCaixa(raw.caixa),
    encerrados: coletarEncerrados(raw, [avulsas, ...fixosGrupos.map((g) => g.itens), ...varGrupos.map((g) => g.itens)]),
    margem: { contribuicao, pct },
  }
}

// ── Apresentação ─────────────────────────────────────────────────────────────

/** Valor principal conforme a visão: 'previsto' → previsto; demais → realizado. */
export function valorVisao(v: PrevistoRealizado, visao: VisaoDre): number {
  return visao === 'previsto' ? v.previsto : v.realizado
}

/** Margem em % (valor / receita × 100); 0 quando não há receita. */
export function margemPct(valor: number, receita: number): number {
  return receita > 0 ? r2((valor / receita) * 100) : 0
}

/** Participação de `parte` no `total` em % (0 quando total ≤ 0). */
export function participacao(parte: number, total: number): number {
  return total > 0 ? r2((parte / total) * 100) : 0
}

export type TomDelta = 'bom' | 'ruim' | 'neutro'

/**
 * Cor semântica do delta mês a mês: em receita/resultado subir é bom; em
 * custos subir é ruim. Zero (ou quase) é neutro.
 */
export function tomDelta(chave: keyof DreDeltas, delta: number): TomDelta {
  if (Math.abs(delta) < 0.005) return 'neutro'
  const custo = chave === 'custos_fixos' || chave === 'custos_variaveis'
  return (delta > 0) !== custo ? 'bom' : 'ruim'
}

/** Variação % entre atual e anterior; null quando o anterior é 0 (sem base). */
export function variacaoPct(atual: number, anterior: number): number | null {
  if (Math.abs(anterior) < 0.005) return null
  return r2(((atual - anterior) / Math.abs(anterior)) * 100)
}

/** Ordena por valor principal (desc) e depois por rótulo pt-BR. */
export function ordenarGrupos(grupos: DreDetalheGrupo[], visao: VisaoDre): DreDetalheGrupo[] {
  return [...grupos].sort((a, b) => {
    const d = Math.max(valorVisao(b.total, visao), b.total.previsto) - Math.max(valorVisao(a.total, visao), a.total.previsto)
    return d !== 0 ? d : grupoLabel(a.grupo).localeCompare(grupoLabel(b.grupo), 'pt-BR')
  })
}

/** Mês anterior em 'YYYY-MM' (atalho para rótulos). */
export function mesAnterior(mes: string): string {
  return shiftMes(mes, -1)
}

/** True se o detalhe não tem nada a mostrar (mês vazio). */
export function detalheVazio(d: DreMesDetalheResponse): boolean {
  const zero = (v: PrevistoRealizado) => v.previsto === 0 && v.realizado === 0
  return (
    zero(d.receita.total)
    && zero(d.custos_fixos.total)
    && zero(d.custos_variaveis.total)
    && d.receita.por_cliente.length === 0
    && d.receita.avulsas.length === 0
    && d.custos_fixos.por_grupo.length === 0
    && d.custos_variaveis.por_grupo.length === 0
    && d.aportes.length === 0
    && d.encerrados.length === 0
    && d.atual.perdas.receita === 0
  )
}
