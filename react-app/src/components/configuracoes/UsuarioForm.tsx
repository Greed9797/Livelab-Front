import { CircleDollarSign } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '../ui/Badge'
import { ImagePicker } from '../ui/ImagePicker'
import { MoneyInput } from '../ui/MoneyInput'
import { extractErrorMessage } from '../../services/api'
import { getComissaoFaixasDefault } from '../../services/domain'
import { QK } from '../../services/query-keys'
import { asNumber, asString } from '../../utils/format'
import { isPresenterRole } from '../../utils/presenters'
import { UsuarioPapelSelect } from './UsuarioPapelSelect'
import type { JsonRecord } from '../../types/models'

const DEFAULT_PRESENTER_FIXED = '2700'

// Ex.: 70000 → "R$ 70 mil"; 150000.01 → "R$ 150 mil".
function formatGmvMil(value: number) {
  if (value >= 1000) return `R$ ${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  return `R$ ${value.toLocaleString('pt-BR')}`
}

// Ex.: "até R$ 70 mil" / "acima de R$ 150 mil".
function tierLabel(tier: JsonRecord) {
  if (tier.gmv_fim == null) return `acima de ${formatGmvMil(asNumber(tier.gmv_inicio))}`
  return `até ${formatGmvMil(asNumber(tier.gmv_fim))}`
}

export interface CreateFormState {
  nome: string
  email: string
  papel: string
  cliente_id: string
  apresentadora_id: string
  fixo: string
  foto_url: string
  senha_temporaria: string
}

interface Props {
  form: CreateFormState
  onFieldChange: (key: keyof CreateFormState, value: string) => void
  clientes: JsonRecord[]
  presenterProfileOptions: Array<{ value: string; label: string }>
  uploadState: { isPending: boolean; isError: boolean; error: unknown }
  onFileSelect: (file: File) => void
  inviteError: unknown
  isInviteError: boolean
}

export function UsuarioForm({
  form,
  onFieldChange,
  clientes,
  presenterProfileOptions,
  uploadState,
  onFileSelect,
  inviteError,
  isInviteError,
}: Props) {
  const linkingExistingPresenter = isPresenterRole(form.papel) && Boolean(form.apresentadora_id)
  const faixasDefault = useQuery({
    queryKey: QK.comissaoFaixasDefault,
    queryFn: getComissaoFaixasDefault,
    enabled: isPresenterRole(form.papel),
  })

  return (
    <div className="space-y-5">
      <UsuarioPapelSelect
        value={form.papel}
        onChange={(role) => onFieldChange('papel', role)}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="block">
          <span className="text-sm font-semibold text-ink">Nome</span>
          <input
            className="design-input mt-2 h-11 w-full px-4"
            value={form.nome}
            onChange={(e) => onFieldChange('nome', e.target.value)}
            placeholder="Nome completo"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-ink">E-mail</span>
          <input
            className="design-input mt-2 h-11 w-full px-4"
            type="email"
            value={form.email}
            onChange={(e) => onFieldChange('email', e.target.value)}
            placeholder="email@empresa.com.br"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-ink">Senha temporária</span>
          <input
            className="design-input mt-2 h-11 w-full px-4"
            value={form.senha_temporaria}
            onChange={(e) => onFieldChange('senha_temporaria', e.target.value)}
            placeholder="Mín. 8 caracteres, com letra e número"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <span className="mt-1 block text-xs text-ink-muted">
            O usuário entra com esta senha e pode trocá-la depois em Configurações → Segurança.
          </span>
        </label>
      </div>

      {form.papel === 'cliente_parceiro' ? (
        <label className="block max-w-xl">
          <span className="text-sm font-semibold text-ink">Cliente vinculado</span>
          <select
            className="design-input mt-2 h-11 w-full px-4"
            value={form.cliente_id}
            onChange={(e) => onFieldChange('cliente_id', e.target.value)}
            required
          >
            <option value="">Selecionar cliente</option>
            {clientes.map((cliente) => (
              <option key={asString(cliente.id, '')} value={asString(cliente.id, '')}>
                {asString(cliente.nome)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {isPresenterRole(form.papel) ? (
        <section className="space-y-4 rounded-2xl border border-line bg-surface-muted/45 p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold text-ink">Perfil de apresentadora</p>
              <p className="mt-1 text-xs text-ink-muted">
                Foto, fixo padrão de R$ {DEFAULT_PRESENTER_FIXED.replace('.', ',')} e escada mensal aplicada automaticamente.
              </p>
            </div>
            <Badge tone="success">padrão ativo</Badge>
          </div>
          {linkingExistingPresenter ? (
            <p className="rounded-xl border border-line bg-surface px-3 py-2.5 text-xs text-ink-muted">
              Você está criando o acesso de um perfil existente. Foto, fixo e regras de comissão desse perfil serão preservados.
            </p>
          ) : (
            <ImagePicker
              label="Foto da apresentadora"
              value={form.foto_url}
              onChange={(value) => onFieldChange('foto_url', value)}
              onFileSelect={onFileSelect}
              isUploading={uploadState.isPending}
              helper="Aparece nos rankings de apresentadoras."
            />
          )}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="block md:col-span-2">
              <span className="text-sm font-semibold text-ink">Perfil operacional</span>
              <select
                className="design-input mt-2 h-11 w-full px-4"
                value={form.apresentadora_id}
                onChange={(e) => onFieldChange('apresentadora_id', e.target.value)}
              >
                <option value="">Criar perfil novo</option>
                {presenterProfileOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            {!linkingExistingPresenter ? (
              <label className="block">
                <span className="text-sm font-semibold text-ink">Fixo mensal (R$)</span>
                <MoneyInput
                  className="design-input mt-2 h-11 w-full px-4"
                  value={form.fixo}
                  onChange={(raw) => onFieldChange('fixo', raw)}
                />
              </label>
            ) : null}
          </div>
          {/* Escada padrão do tenant — a comissão vem sempre das faixas por GMV. */}
          <div className="flex flex-wrap gap-2">
            {(faixasDefault.data ?? []).map((tier) => (
              <span key={asString(tier.id)} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink">
                <CircleDollarSign className="h-3.5 w-3.5 text-brand" />
                {tierLabel(tier)} · <strong>{asNumber(tier.comissao_pct).toLocaleString('pt-BR')}%</strong>
              </span>
            ))}
          </div>
          {uploadState.isError ? (
            <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
              {extractErrorMessage(uploadState.error)}
            </p>
          ) : null}
        </section>
      ) : null}

      {isInviteError ? (
        <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
          {extractErrorMessage(inviteError)}
        </p>
      ) : null}
    </div>
  )
}
