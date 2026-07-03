import { useQuery } from '@tanstack/react-query'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { DataTable } from '../ui/DataTable'
import { LoadingState } from '../ui/States'
import { MoneyInput } from '../ui/MoneyInput'
import { extractErrorMessage } from '../../services/api'
import { getComissaoFaixasDefault } from '../../services/domain'
import { QK } from '../../services/query-keys'
import { asNumber, asString, formatMoney } from '../../utils/format'
import { FALLBACK_ESCADA } from '../../utils/faixaComissao'
import type { JsonRecord, TableColumn } from '../../types/models'

interface FaixaFormState {
  gmv_inicio: string
  gmv_fim: string
  comissao_pct: string
}

interface FaixasMutations {
  createPending: boolean
  deletePending: boolean
  createError: unknown
  deleteError: unknown
  isCreateError: boolean
  isDeleteError: boolean
}

interface QueryState {
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
  error: unknown
  data?: JsonRecord[]
}

interface Props {
  apresentadoraId: string
  faixaForm: FaixaFormState
  onFaixaFormChange: (form: FaixaFormState) => void
  onAddFaixa: () => void
  onDeleteFaixa: (faixaId: string) => void
  faixasQuery: QueryState
  mutations: FaixasMutations
}

// Normaliza o conjunto de tuplas (gmv_inicio, gmv_fim, comissao_pct) para comparar
// a escada da apresentadora com a escada padrão do tenant.
function tiersKey(rows: JsonRecord[] | undefined) {
  return (rows ?? [])
    .map((r) => `${asNumber(r.gmv_inicio)}|${r.gmv_fim == null ? '' : asNumber(r.gmv_fim)}|${asNumber(r.comissao_pct)}`)
    .sort()
    .join(';')
}

const faixaColumns: TableColumn<JsonRecord>[] = [
  { key: 'gmv_inicio', header: 'Início', render: (item) => formatMoney(item.gmv_inicio) },
  { key: 'gmv_fim', header: 'Fim', render: (item) => item.gmv_fim == null ? 'Sem limite' : formatMoney(item.gmv_fim) },
  { key: 'comissao_pct', header: 'Comissão', align: 'right', render: (item) => `${asNumber(item.comissao_pct).toLocaleString('pt-BR')}%` },
]

export function ApresentadoraFaixas({
  faixaForm,
  onFaixaFormChange,
  onAddFaixa,
  onDeleteFaixa,
  faixasQuery,
  mutations,
}: Props) {
  const defaultQuery = useQuery({ queryKey: QK.comissaoFaixasDefault, queryFn: getComissaoFaixasDefault })
  const anyError = mutations.isCreateError || mutations.isDeleteError || faixasQuery.isError

  const bothLoaded = faixasQuery.isSuccess && defaultQuery.isSuccess
  // Mesmo critério do backend (propagação): só faixas ATIVAS contam, e tabela
  // default vazia compara contra o espelho do fallback do código.
  const ownActive = (faixasQuery.data ?? []).filter((f) => f.ativo !== false)
  const defaultRows = defaultQuery.data?.length ? defaultQuery.data : FALLBACK_ESCADA
  const hasOwnFaixas = ownActive.length > 0
  // Sem faixas próprias ou conjunto idêntico ao padrão = segue a escada padrão do tenant.
  const segueEscadaPadrao = !hasOwnFaixas || tiersKey(ownActive) === tiersKey(defaultRows)

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-surface-muted p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-ink">Escada de comissão</p>
            {bothLoaded ? (
              segueEscadaPadrao
                ? <Badge tone="success">Escada padrão</Badge>
                : <Badge tone="warning">Personalizada</Badge>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            Faixas por GMV mensal atribuído à apresentadora.
            {bothLoaded && segueEscadaPadrao ? ' Editando aqui, ela passa a ter escada personalizada. O padrão é gerenciado em Comissões.' : ''}
          </p>
        </div>
        <Badge tone="neutral">{faixasQuery.data?.length ?? 0} faixas</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_1fr_120px_auto]">
        <label className="block">
          <span className="text-xs font-semibold text-ink-muted">GMV inicial</span>
          <MoneyInput
            className="design-input mt-2 h-10 w-full px-3"
            value={faixaForm.gmv_inicio}
            onChange={(raw) => onFaixaFormChange({ ...faixaForm, gmv_inicio: raw })}
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-ink-muted">GMV final</span>
          <MoneyInput
            className="design-input mt-2 h-10 w-full px-3"
            value={faixaForm.gmv_fim}
            onChange={(raw) => onFaixaFormChange({ ...faixaForm, gmv_fim: raw })}
            placeholder="Sem limite"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-ink-muted">Comissão (%)</span>
          <input
            className="design-input mt-2 h-10 w-full px-3"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={faixaForm.comissao_pct}
            onChange={(e) => onFaixaFormChange({ ...faixaForm, comissao_pct: e.target.value })}
          />
        </label>
        <div className="flex items-end">
          <Button type="button" isLoading={mutations.createPending} onClick={onAddFaixa}>Adicionar</Button>
        </div>
      </div>

      {faixasQuery.isLoading ? <LoadingState label="Carregando faixas" /> : null}

      {faixasQuery.data?.length ? (
        <DataTable<JsonRecord>
          data={faixasQuery.data}
          columns={[
            ...faixaColumns,
            {
              key: 'acoes',
              header: 'Ações',
              align: 'right',
              render: (item) => (
                <Button variant="danger" disabled={mutations.deletePending} onClick={() => onDeleteFaixa(asString(item.id, ''))}>
                  Remover
                </Button>
              ),
            },
          ]}
        />
      ) : faixasQuery.isSuccess ? (
        <div className="space-y-2">
          <p className="text-sm text-ink-muted">Sem faixas próprias — a escada padrão se aplica.</p>
          <DataTable<JsonRecord> data={defaultRows} columns={faixaColumns} />
        </div>
      ) : null}

      {anyError ? (
        <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
          {extractErrorMessage(mutations.createError ?? mutations.deleteError ?? faixasQuery.error)}
        </p>
      ) : null}
    </div>
  )
}
