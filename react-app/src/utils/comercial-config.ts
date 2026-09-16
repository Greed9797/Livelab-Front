import { asArray, asString } from './format'
import type { JsonRecord } from '../types/models'

export const COMMERCIAL_CONFIG_CODES = [
  'fixo_nao_informado',
  'comissao_nao_informada',
  'a_revisar',
  'nao_aplicavel',
] as const

export type CommercialConfigCode = typeof COMMERCIAL_CONFIG_CODES[number] | 'sem_marca'

/** Presentation adapter for the backend's configuracao_comercial contract. */
export function commercialConfigCodes(config: JsonRecord | null | undefined, hasMarca = true): CommercialConfigCode[] {
  if (!hasMarca) return ['sem_marca']
  const status = asString(config?.status, '')
  if (status === 'configurado' || status === 'nao_aplicavel') return []
  return asArray<unknown>(config?.codigos)
    .map((code) => asString(code, ''))
    .filter((code): code is CommercialConfigCode => (COMMERCIAL_CONFIG_CODES as readonly string[]).includes(code))
}

export function commercialConfigLabel(code: CommercialConfigCode): string {
  switch (code) {
    case 'fixo_nao_informado': return 'Fixo ausente'
    case 'comissao_nao_informada': return 'Comissão ausente'
    case 'a_revisar': return 'Condição legada a revisar'
    case 'sem_marca': return 'Sem marca operacional'
    case 'nao_aplicavel': return 'Não aplicável'
  }
}

export function commercialConfigSummary(config: JsonRecord | null | undefined, hasMarca = true): string {
  const codes = commercialConfigCodes(config, hasMarca)
  return codes.map(commercialConfigLabel).join(' · ')
}
