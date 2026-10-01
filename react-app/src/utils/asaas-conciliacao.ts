import type { AsaasPendente, AsaasSugestao, AsaasTransacao, ComponenteApresentadora, TipoAlvoConciliacao, TipoTransacao } from '../types/asaas'

/** 'YYYY-MM' → { inicio: 'YYYY-MM-01', fim: último dia } (sem passar por Date local). */
export function periodoDoMes(mes: string): { inicio: string; fim: string } | null {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(mes)
  if (!m) return null
  const ultimo = new Date(Date.UTC(Number(m[1]), Number(m[2]), 0)).getUTCDate()
  return { inicio: `${mes}-01`, fim: `${mes}-${String(ultimo).padStart(2, '0')}` }
}

export function shiftMes(mes: string, delta: number): string {
  const m = /^(\d{4})-(\d{2})$/.exec(mes)
  if (!m) return mes
  const idx = Number(m[1]) * 12 + (Number(m[2]) - 1) + delta
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`
}

/** Tipo de alvo padrão para a direção da transação (o back valida entrada→receita, saída→custo). */
export function tipoAlvoPadrao(tipo: TipoTransacao): TipoAlvoConciliacao {
  return tipo === 'entrada' ? 'receita' : 'custo'
}

export const ALVO_LABEL: Record<TipoAlvoConciliacao, string> = {
  receita: 'Receita',
  avulsa: 'Receita avulsa',
  custo: 'Custo',
  apresentadora: 'Apresentadora',
  imposto: 'Imposto',
}

export function alvoLabel(tipo: string | null | undefined): string {
  return ALVO_LABEL[tipo as TipoAlvoConciliacao] ?? (tipo || '—')
}

const COMPONENTE_LABEL: Record<string, string> = { fixo: 'fixo', variavel: 'variável' }

/** Componente válido ('fixo'|'variavel'), vindo do campo explícito ou do id `apresentadora:<uuid>:<YYYY-MM>:<componente>`. */
export function componenteDe(tipo: string | null | undefined, componente?: string | null, id?: string | null): ComponenteApresentadora | null {
  if (tipo !== 'apresentadora') return null
  if (componente === 'fixo' || componente === 'variavel') return componente
  const last = typeof id === 'string' ? id.split(':').pop() : undefined
  return last === 'fixo' || last === 'variavel' ? last : null
}

/** Rótulo do alvo, com o componente quando for apresentadora: 'Apresentadora (variável)'. */
export function alvoRotulo(tipo: string | null | undefined, componente?: string | null, id?: string | null): string {
  const base = alvoLabel(tipo)
  const c = componenteDe(tipo, componente, id)
  return c ? `${base} (${COMPONENTE_LABEL[c]})` : base
}

/** Faixa de confiança da sugestão (score do back, 0-100). */
export function scoreTone(score: number): 'success' | 'warning' | 'neutral' {
  if (score >= 80) return 'success'
  if (score >= 50) return 'warning'
  return 'neutral'
}

const MOTIVO_LABEL: Record<string, string> = {
  valor_exato: 'valor exato',
  valor_bruto: 'valor bruto',
  valor_proximo: 'valor próximo',
  cliente: 'mesmo cliente',
  data_proxima: 'data próxima',
  data: 'data próxima',
  descricao: 'descrição parecida',
}

export function motivoLabel(motivo: string): string {
  return MOTIVO_LABEL[motivo] ?? motivo.replace(/_/g, ' ')
}

/** Melhor sugestão: a de maior score; null se ambígua (empate no topo) ou sem sugestões. */
export function melhorSugestao(item: Pick<AsaasPendente, 'sugestoes' | 'ambiguo'>): AsaasSugestao | null {
  if (item.ambiguo || item.sugestoes.length === 0) return null
  return [...item.sugestoes].sort((a, b) => b.score - a.score)[0]
}

/** Soma em centavos para evitar erro de ponto flutuante. */
export function somaValores(itens: Pick<AsaasTransacao, 'valor'>[]): number {
  return itens.reduce((acc, i) => acc + Math.round(Math.abs(Number(i.valor) || 0) * 100), 0) / 100
}

export function separarConciliadas(itens: AsaasTransacao[]): { conciliadas: AsaasTransacao[]; abertas: AsaasTransacao[] } {
  const conciliadas: AsaasTransacao[] = []
  const abertas: AsaasTransacao[] = []
  for (const i of itens) (i.conciliado_com_id ? conciliadas : abertas).push(i)
  return { conciliadas, abertas }
}

/** Valor com sinal para exibir no extrato (saída negativa). */
export function valorComSinal(t: Pick<AsaasTransacao, 'tipo' | 'valor'>): number {
  const v = Math.abs(Number(t.valor) || 0)
  return t.tipo === 'saida' ? -v : v
}
