import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { DataTable } from '../ui/DataTable'
import { LoadingState } from '../ui/States'
import { MoneyInput } from '../ui/MoneyInput'
import { extractErrorMessage } from '../../services/api'
import { asNumber, asString, formatMoney } from '../../utils/format'
import type { JsonRecord } from '../../types/models'

interface FaixaFormState {
  gmv_inicio: string
  gmv_fim: string
  comissao_pct: string
}

interface FaixasMutations {
  createPending: boolean
  updatePending: boolean
  deletePending: boolean
  createError: unknown
  updateError: unknown
  deleteError: unknown
  isCreateError: boolean
  isUpdateError: boolean
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
  onToggleFaixa: (faixaId: string, currentAtivo: boolean) => void
  onDeleteFaixa: (faixaId: string) => void
  faixasQuery: QueryState
  mutations: FaixasMutations
}

export function ApresentadoraFaixas({
  faixaForm,
  onFaixaFormChange,
  onAddFaixa,
  onToggleFaixa,
  onDeleteFaixa,
  faixasQuery,
  mutations,
}: Props) {
  const anyError = mutations.isCreateError || mutations.isUpdateError || mutations.isDeleteError || faixasQuery.isError

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-surface-muted p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-bold text-ink">Escada de comissão</p>
          <p className="mt-1 text-xs text-ink-muted">Faixas por GMV mensal atribuído à apresentadora.</p>
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
            { key: 'gmv_inicio', header: 'Início', render: (item) => formatMoney(item.gmv_inicio) },
            { key: 'gmv_fim', header: 'Fim', render: (item) => item.gmv_fim == null ? 'Sem limite' : formatMoney(item.gmv_fim) },
            { key: 'comissao_pct', header: 'Comissão', align: 'right', render: (item) => `${asNumber(item.comissao_pct).toLocaleString('pt-BR')}%` },
            { key: 'ativo', header: 'Status', render: (item) => <Badge tone={item.ativo === false ? 'neutral' : 'success'}>{item.ativo === false ? 'inativa' : 'ativa'}</Badge> },
            {
              key: 'acoes',
              header: 'Ações',
              align: 'right',
              render: (item) => (
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" disabled={mutations.updatePending} onClick={() => onToggleFaixa(asString(item.id, ''), item.ativo !== false)}>
                    {item.ativo === false ? 'Reativar' : 'Inativar'}
                  </Button>
                  <Button variant="danger" disabled={mutations.deletePending} onClick={() => onDeleteFaixa(asString(item.id, ''))}>
                    Excluir
                  </Button>
                </div>
              ),
            },
          ]}
        />
      ) : faixasQuery.isSuccess ? (
        <p className="text-sm text-ink-muted">Nenhuma faixa configurada.</p>
      ) : null}

      {anyError ? (
        <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
          {extractErrorMessage(mutations.createError ?? mutations.updateError ?? mutations.deleteError ?? faixasQuery.error)}
        </p>
      ) : null}
    </div>
  )
}
