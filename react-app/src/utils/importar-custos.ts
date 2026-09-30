import type { ImportarCustosBody, ImportarCustosPayload, ImportarRecorrenteItem } from '../types/financeiro'

/** Soma mensal dos recorrentes ainda vigentes (sem `fim`, ou `fim` >= hoje). Em centavos para evitar drift de float. */
export function totalMensalRecorrentes(itens: Pick<ImportarRecorrenteItem, 'valor' | 'fim'>[], hoje?: string): number {
  const cents = itens
    .filter((r) => !hoje || !r.fim || r.fim >= hoje)
    .reduce((s, r) => s + Math.round(r.valor * 100), 0)
  return cents / 100
}

/** Monta o corpo do POST de importação; `dry_run` só vai quando verdadeiro. */
export function montarPayloadImportacao(seed: ImportarCustosPayload, dryRun = false): ImportarCustosBody {
  return {
    recorrentes: seed.recorrentes.map((r) => ({ ...r })),
    pontuais: seed.pontuais.map((p) => ({ ...p })),
    ...(dryRun ? { dry_run: true } : {}),
  }
}
