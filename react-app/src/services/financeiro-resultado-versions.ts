import { apiGet } from './api'

export interface ResultadoVersion {
  id: string
  versao: number
  criado_em: string
}

export interface ResultadoVersions {
  mes: string
  estado: 'aberto' | 'fechado' | 'reaberto'
  versao_atual: number
  versoes: ResultadoVersion[]
}

const MES = /^\d{4}-(0[1-9]|1[0-2])$/

export async function consultarResultadoVersions(mes: string): Promise<ResultadoVersions> {
  if (!MES.test(mes)) throw new Error('Competência inválida.')
  const raw = await apiGet<unknown>(`/financeiro/fechamentos/${mes}`)
  if (!raw || typeof raw !== 'object') throw new Error('Resposta de fechamentos inválida.')
  const data = raw as Record<string, unknown>
  if (data.mes !== mes || !['aberto', 'fechado', 'reaberto'].includes(String(data.estado)) ||
    !Number.isInteger(data.versao_atual) || (data.versao_atual as number) < 0 ||
    !Array.isArray(data.versoes) || !data.versoes.every((v) => v && typeof v === 'object' &&
      typeof v.id === 'string' && Number.isInteger(v.versao) && v.versao > 0 && typeof v.criado_em === 'string')) {
    throw new Error('Resposta de fechamentos inválida.')
  }
  return {
    mes,
    estado: data.estado as ResultadoVersions['estado'],
    versao_atual: data.versao_atual as number,
    versoes: (data.versoes as ResultadoVersion[]).map(({ id, versao, criado_em }) => ({ id, versao, criado_em })),
  }
}
