// Classe do custo (fixo × variável). O backend manda `classe`; quando faltar, derivamos
// com a mesma regra da SPEC v3: fixo = recorrente | parcela | apresentadora (componente fixo);
// variável = manual pontual | apresentadora (componente variável) | imposto.
import type { ClasseCusto, Lancamento } from '../types/financeiro'
import { grupoLabel } from './financeiro'

type ParaClasse = Pick<Lancamento, 'natureza' | 'origem' | 'componente'> & { classe?: ClasseCusto | null }

export const CLASSE_LABEL: Record<ClasseCusto, string> = { fixo: 'Fixo', variavel: 'Variável' }

export function classeDoLancamento(l: ParaClasse): ClasseCusto {
  if (l.classe === 'fixo' || l.classe === 'variavel') return l.classe
  switch (l.origem) {
    case 'recorrente':
    case 'parcela':
      return 'fixo'
    case 'apresentadora':
      return l.componente === 'variavel' ? 'variavel' : 'fixo'
    default:
      return 'variavel'
  }
}

/** Custos (natureza 'custo') da classe pedida. */
export function filtrarPorClasse<T extends ParaClasse>(itens: T[], classe: ClasseCusto): T[] {
  return itens.filter((l) => l.natureza === 'custo' && classeDoLancamento(l) === classe)
}

export interface TotaisCusto {
  previsto: number
  pago: number
  aberto: number
}

const r2 = (n: number) => Math.round(n * 100) / 100

/** Cancelado não conta como previsto nem em aberto (só o que já foi pago permanece). */
export function totaisCusto(itens: (Pick<Lancamento, 'valor_previsto' | 'valor_pago'> & { status?: Lancamento['status'] })[]): TotaisCusto {
  let previsto = 0
  let pago = 0
  let aberto = 0
  for (const l of itens) {
    const cancelado = l.status === 'cancelado'
    previsto += cancelado ? l.valor_pago : l.valor_previsto
    pago += l.valor_pago
    if (!cancelado) aberto += Math.max(0, l.valor_previsto - l.valor_pago)
  }
  return { previsto: r2(previsto), pago: r2(pago), aberto: r2(aberto) }
}

export interface GrupoCusto {
  grupo: string
  label: string
  itens: Lancamento[]
  totais: TotaisCusto
}

/** Chave de agrupamento: apresentadoras e imposto têm blocos próprios; demais usam `grupo`. */
function chaveGrupo(l: Lancamento): string {
  if (l.origem === 'apresentadora') return 'apresentadoras'
  if (l.origem === 'imposto') return 'imposto'
  return l.grupo ?? 'outros'
}

/** Agrupa por grupo (maior total primeiro); itens por vencimento e depois descrição. */
export function agruparPorGrupo(itens: Lancamento[]): GrupoCusto[] {
  const map = new Map<string, Lancamento[]>()
  for (const l of itens) {
    const k = chaveGrupo(l)
    map.set(k, [...(map.get(k) ?? []), l])
  }
  return [...map.entries()]
    .map(([grupo, lista]) => ({
      grupo,
      label: grupoLabel(grupo),
      itens: [...lista].sort(
        (a, b) => (a.data_vencimento ?? '9999').localeCompare(b.data_vencimento ?? '9999') || a.descricao.localeCompare(b.descricao, 'pt-BR'),
      ),
      totais: totaisCusto(lista),
    }))
    .sort((a, b) => b.totais.previsto - a.totais.previsto || a.label.localeCompare(b.label, 'pt-BR'))
}

export interface ApresentadoraCusto {
  apresentadora_id: string
  nome: string
  itens: Lancamento[]
  totais: TotaisCusto
}

/** Itens de apresentadora agrupados por pessoa. O nome vem da descrição (texto antes do primeiro ' · ' / ' — '). */
export function agruparPorApresentadora(itens: Lancamento[]): ApresentadoraCusto[] {
  const map = new Map<string, Lancamento[]>()
  for (const l of itens) {
    const id = l.apresentadora_id ?? l.id.split(':')[1] ?? l.descricao
    map.set(id, [...(map.get(id) ?? []), l])
  }
  return [...map.entries()]
    .map(([apresentadora_id, lista]) => ({
      apresentadora_id,
      nome: lista[0].descricao.split(/\s[·—–-]\s/)[0].trim() || 'Apresentadora',
      itens: lista,
      totais: totaisCusto(lista),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}
