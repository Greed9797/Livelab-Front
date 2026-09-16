import type { JsonRecord } from '../../types/models'
import { asNumber, asString, getRecord } from '../../utils/format'

export interface OperationalDreBrand {
  id: string
  nome: string
  tipoCobranca: 'fixo_mais_comissao' | 'fixo_ou_comissao' | 'historico'
  fixoCalculado: number
  comissaoCalculada: number
  receitaReconhecida: number
  criterio: string
  gmv: number
  lives: number
  parcelas: OperationalDreBrandParcel[]
}

export interface OperationalDreBrandParcel {
  competencia: string
  fixoCalculado: number
  comissaoCalculada: number
  receitaReconhecida: number
  criterio: string
  gmv: number
  lives: number
}

export interface OperationalDrePresenter {
  id: string
  nome: string
  fixo: number
  comissao: number
  adicionais: number
  total: number
}

export interface OperationalDreCostItem {
  id: string
  descricao: string
  valor: number
}

export interface OperationalDreCostGroup {
  tipo: string
  total: number
  itens: OperationalDreCostItem[]
}

export interface OperationalDre {
  receita: {
    total: number
    marcas: OperationalDreBrand[]
  }
  apresentadoras: {
    total: number
    fixo: number
    comissao: number
    adicionais: number
    pessoas: OperationalDrePresenter[]
  }
  custos: {
    total: number
    grupos: OperationalDreCostGroup[]
  }
  totalDespesas: number
  resultado: number
  margemPct: number | null
}

const BRAND_CATEGORIES = new Set(['comissao_franquia', 'fixo_marca'])
const PRESENTER_CATEGORIES = new Set(['fixo_apresentadora', 'comissao_apresentadora', 'adicional_apresentadora'])

function cents(value: number): number {
  return Math.round(value * 100)
}

function fromCents(value: number): number {
  return value / 100
}

export function moneyEquals(left: number, right: number): boolean {
  return cents(left) === cents(right)
}

function reportedNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = asNumber(value, Number.NaN)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function requiredText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return null
}

function roundedPercent(result: number, revenue: number): number | null {
  if (cents(revenue) === 0) return null
  return Math.round((result / revenue) * 100 * 100) / 100
}

interface BrandAccumulator {
  id: string
  nome: string
  tipoCobranca: 'fixo_mais_comissao' | 'fixo_ou_comissao' | 'historico'
  fixo: number
  comissao: number
  reconhecida: number
  criterio: string
  gmv: number
  lives: number
  parcelas: Map<string, OperationalDreBrandParcel>
}

/**
 * Converts the existing operational endpoint payload into a reconciled DRE.
 * Missing totals, unknown categories and cent-level divergence return null so
 * the caller can show an unavailable state instead of a partial financial truth.
 */
export function buildOperationalDre(data: JsonRecord | null | undefined): OperationalDre | null {
  if (!data || !Array.isArray(data.entradas) || !Array.isArray(data.saidas)) return null
  const totais = getRecord(data.totais)
  const reportedTotals = ['entradas', 'despesas_fixas', 'despesas_variaveis', 'resultado']
    .map((key) => reportedNumber(totais[key]))
  if (reportedTotals.some((value) => value === null)) return null

  const brandMap = new Map<string, BrandAccumulator>()
  const presenterMap = new Map<string, OperationalDrePresenter>()
  const costMap = new Map<string, OperationalDreCostGroup>()
  let revenueCents = 0
  let presenterFixedCents = 0
  let presenterCommissionCents = 0
  let presenterAdditionalCents = 0
  let manualCostCents = 0
  let fixedCostCents = 0
  let variableCostCents = 0

  for (const rawLine of data.entradas) {
    const line = getRecord(rawLine)
    if (!BRAND_CATEGORIES.has(asString(line.categoria, ''))) return null
    const value = reportedNumber(line.valor)
    const memory = getRecord(line.memoria)
    const id = requiredText(memory.marca_id, line.marca_id)
    const name = requiredText(memory.marca_nome, line.marca_nome, line.descricao)
    if (value === null || !id || !name) return null

    let brand = brandMap.get(id)
    if (!brand) {
      brand = { id, nome: name, tipoCobranca: 'fixo_mais_comissao', fixo: 0, comissao: 0, reconhecida: 0, criterio: 'fixo_mais_comissao', gmv: 0, lives: 0, parcelas: new Map() }
      brandMap.set(id, brand)
    } else if (brand.nome !== name) {
      return null
    }

    const categoria = asString(line.categoria, '')
    const criterio = requiredText(memory.criterio)
    const isChoice = Boolean(criterio?.startsWith('fixo_ou_comissao_venceu_'))
    const gmv = reportedNumber(memory.gmv)
    const lives = reportedNumber(memory.lives)
    const competencia = requiredText(memory.competencia, getRecord(data.periodo).inicio) ?? 'período'
    const parcel = brand.parcelas.get(competencia) ?? {
      competencia,
      fixoCalculado: 0,
      comissaoCalculada: 0,
      receitaReconhecida: 0,
      criterio: 'fixo_mais_comissao',
      gmv: 0,
      lives: 0,
    }
    if (gmv !== null) brand.gmv = fromCents(cents(brand.gmv) + cents(gmv))
    if (lives !== null) brand.lives += Math.max(0, Math.round(lives))
    if (gmv !== null) parcel.gmv = fromCents(cents(parcel.gmv) + cents(gmv))
    if (lives !== null) parcel.lives += Math.max(0, Math.round(lives))

    if (isChoice) {
      if (parcel.criterio.startsWith('fixo_ou_comissao_venceu_') && parcel.criterio !== criterio) return null
      brand.tipoCobranca = 'fixo_ou_comissao'
      brand.criterio = criterio as string
      parcel.criterio = criterio as string
      if (criterio === 'fixo_ou_comissao_venceu_fixo') {
        if (categoria !== 'fixo_marca') return null
        const compared = reportedNumber(memory.comissao_comparada)
        if (compared === null) return null
        brand.fixo = fromCents(cents(brand.fixo) + cents(value))
        brand.comissao = fromCents(cents(brand.comissao) + cents(compared))
        parcel.fixoCalculado = fromCents(cents(parcel.fixoCalculado) + cents(value))
        parcel.comissaoCalculada = fromCents(cents(parcel.comissaoCalculada) + cents(compared))
      } else if (criterio === 'fixo_ou_comissao_venceu_comissao') {
        if (categoria !== 'comissao_franquia') return null
        const compared = reportedNumber(memory.fixo_comparado)
        if (compared === null) return null
        brand.fixo = fromCents(cents(brand.fixo) + cents(compared))
        brand.comissao = fromCents(cents(brand.comissao) + cents(value))
        parcel.fixoCalculado = fromCents(cents(parcel.fixoCalculado) + cents(compared))
        parcel.comissaoCalculada = fromCents(cents(parcel.comissaoCalculada) + cents(value))
      } else {
        return null
      }
    } else if (categoria === 'fixo_marca') {
      if (parcel.criterio.startsWith('fixo_ou_comissao_venceu_')) return null
      brand.fixo = fromCents(cents(brand.fixo) + cents(value))
      brand.criterio = criterio ?? brand.criterio
      parcel.fixoCalculado = fromCents(cents(parcel.fixoCalculado) + cents(value))
      parcel.criterio = criterio ?? parcel.criterio
    } else {
      if (parcel.criterio.startsWith('fixo_ou_comissao_venceu_')) return null
      brand.comissao = fromCents(cents(brand.comissao) + cents(value))
      parcel.comissaoCalculada = fromCents(cents(parcel.comissaoCalculada) + cents(value))
      parcel.criterio = criterio ?? parcel.criterio
    }
    brand.reconhecida = fromCents(cents(brand.reconhecida) + cents(value))
    parcel.receitaReconhecida = fromCents(cents(parcel.receitaReconhecida) + cents(value))
    brand.parcelas.set(competencia, parcel)
    revenueCents += cents(value)
  }

  for (const rawLine of data.saidas) {
    const line = getRecord(rawLine)
    const categoria = asString(line.categoria, '')
    const value = reportedNumber(line.valor)
    const memory = getRecord(line.memoria)
    if (value === null) return null

    if (PRESENTER_CATEGORIES.has(categoria)) {
      const id = requiredText(memory.apresentadora_id, line.apresentadora_id)
      const name = requiredText(memory.nome, line.nome, line.descricao)
      if (!id || !name) return null
      const person = presenterMap.get(id) ?? { id, nome: name, fixo: 0, comissao: 0, adicionais: 0, total: 0 }
      if (person.nome !== name) return null
      if (categoria === 'fixo_apresentadora') presenterFixedCents += cents(value)
      if (categoria === 'comissao_apresentadora') presenterCommissionCents += cents(value)
      if (categoria === 'adicional_apresentadora') presenterAdditionalCents += cents(value)
      person.fixo = categoria === 'fixo_apresentadora' ? fromCents(cents(person.fixo) + cents(value)) : person.fixo
      person.comissao = categoria === 'comissao_apresentadora' ? fromCents(cents(person.comissao) + cents(value)) : person.comissao
      person.adicionais = categoria === 'adicional_apresentadora' ? fromCents(cents(person.adicionais) + cents(value)) : person.adicionais
      person.total = fromCents(cents(person.fixo) + cents(person.comissao) + cents(person.adicionais))
      presenterMap.set(id, person)
      continue
    }

    if (categoria !== 'custo_manual') return null
    const id = requiredText(memory.custo_id, line.custo_id)
    const tipo = requiredText(memory.tipo, line.tipo)
    const descricao = requiredText(line.descricao)
    if (!id || !tipo || !descricao) return null
    const group = costMap.get(tipo) ?? { tipo, total: 0, itens: [] }
    group.total = fromCents(cents(group.total) + cents(value))
    group.itens.push({ id, descricao, valor: value })
    costMap.set(tipo, group)
    manualCostCents += cents(value)
    if (['aluguel', 'salario', 'energia', 'internet'].includes(tipo)) fixedCostCents += cents(value)
    else variableCostCents += cents(value)
  }

  const fixedExpensesCents = presenterFixedCents + fixedCostCents
  const variableExpensesCents = presenterCommissionCents + presenterAdditionalCents + variableCostCents
  const totalExpensesCents = fixedExpensesCents + variableExpensesCents
  const resultCents = revenueCents - totalExpensesCents
  if (revenueCents !== cents(reportedTotals[0] as number)
    || fixedExpensesCents !== cents(reportedTotals[1] as number)
    || variableExpensesCents !== cents(reportedTotals[2] as number)
    || resultCents !== cents(reportedTotals[3] as number)) return null

  if (Object.prototype.hasOwnProperty.call(data, 'parcelas_competencia')) {
    if (!Array.isArray(data.parcelas_competencia)) return null
    let parcelRevenueCents = 0
    for (const rawParcel of data.parcelas_competencia) {
      const parcel = getRecord(rawParcel)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(asString(parcel.competencia, ''))) return null
      const parcelRevenue = reportedNumber(parcel.receita)
      if (parcelRevenue === null || reportedNumber(parcel.fixo) === null || reportedNumber(parcel.comissao) === null) return null
      parcelRevenueCents += cents(parcelRevenue)
    }
    if (parcelRevenueCents !== revenueCents) return null
  }

  const revenue = fromCents(revenueCents)
  const result = fromCents(resultCents)
  return {
    receita: { total: revenue, marcas: [...brandMap.values()].map((brand) => ({
      id: brand.id,
      nome: brand.nome,
      fixoCalculado: brand.fixo,
      comissaoCalculada: brand.comissao,
      receitaReconhecida: brand.reconhecida,
      criterio: new Set([...brand.parcelas.values()].map((parcel) => parcel.criterio)).size > 1 ? 'parcelas_por_competencia' : brand.criterio,
      gmv: brand.gmv,
      lives: brand.lives,
      tipoCobranca: new Set([...brand.parcelas.values()].map((parcel) => parcel.criterio)).size > 1 ? 'historico' : brand.tipoCobranca,
      parcelas: [...brand.parcelas.values()].map((parcel) => ({ ...parcel })),
    })) },
    apresentadoras: {
      total: fromCents(presenterFixedCents + presenterCommissionCents + presenterAdditionalCents),
      fixo: fromCents(presenterFixedCents),
      comissao: fromCents(presenterCommissionCents),
      adicionais: fromCents(presenterAdditionalCents),
      pessoas: [...presenterMap.values()],
    },
    custos: { total: fromCents(manualCostCents), grupos: [...costMap.values()] },
    totalDespesas: fromCents(totalExpensesCents),
    resultado: result,
    margemPct: roundedPercent(result, revenue),
  }
}
