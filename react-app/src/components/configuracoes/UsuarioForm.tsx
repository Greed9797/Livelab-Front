import { CircleDollarSign } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { ImagePicker } from '../ui/ImagePicker'
import { MoneyInput } from '../ui/MoneyInput'
import { extractErrorMessage } from '../../services/api'
import { asString } from '../../utils/format'
import { isPresenterRole } from '../../utils/presenters'
import { UsuarioPapelSelect } from './UsuarioPapelSelect'
import type { JsonRecord } from '../../types/models'

const DEFAULT_PRESENTER_FIXED = '2700'

const defaultCommissionTiers = [
  { label: 'até R$ 50k', value: '0,5%' },
  { label: 'até R$ 150k', value: '1%' },
  { label: 'até R$ 500k', value: '1,5%' },
  { label: 'acima de R$ 500k', value: '2%' },
]

export interface CreateFormState {
  nome: string
  email: string
  papel: string
  cliente_id: string
  apresentadora_id: string
  fixo: string
  comissao_pct: string
  meta_diaria_gmv: string
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
          <ImagePicker
            label="Foto da apresentadora"
            value={form.foto_url}
            onChange={(value) => onFieldChange('foto_url', value)}
            onFileSelect={onFileSelect}
            isUploading={uploadState.isPending}
            helper="Aparece nos rankings de apresentadoras."
          />
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
            <label className="block">
              <span className="text-sm font-semibold text-ink">Fixo mensal (R$)</span>
              <MoneyInput
                className="design-input mt-2 h-11 w-full px-4"
                value={form.fixo}
                onChange={(raw) => onFieldChange('fixo', raw)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-ink">Meta diária GMV (R$)</span>
              <MoneyInput
                className="design-input mt-2 h-11 w-full px-4"
                value={form.meta_diaria_gmv}
                onChange={(raw) => onFieldChange('meta_diaria_gmv', raw)}
              />
            </label>
            <label className="block md:col-span-2 xl:col-span-1">
              <span className="text-sm font-semibold text-ink">Comissão base opcional (%)</span>
              <input
                className="design-input mt-2 h-11 w-full px-4"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.comissao_pct}
                onChange={(e) => onFieldChange('comissao_pct', e.target.value)}
                placeholder="Escada padrão"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {defaultCommissionTiers.map((tier) => (
              <span key={tier.label} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink">
                <CircleDollarSign className="h-3.5 w-3.5 text-brand" />
                {tier.label} · <strong>{tier.value}</strong>
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
