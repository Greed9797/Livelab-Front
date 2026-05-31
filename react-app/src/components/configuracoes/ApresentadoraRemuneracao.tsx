import { CircleDollarSign } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { ImagePicker } from '../ui/ImagePicker'
import { MoneyInput } from '../ui/MoneyInput'
import { extractErrorMessage } from '../../services/api'

const defaultCommissionTiers = [
  { label: 'até R$ 50k', value: '0,5%' },
  { label: 'até R$ 150k', value: '1%' },
  { label: 'até R$ 500k', value: '1,5%' },
  { label: 'acima de R$ 500k', value: '2%' },
]

interface EditFormFields {
  fixo: string
  comissao_pct: string
  meta_diaria_gmv: string
  foto_url: string
}

interface Props {
  form: EditFormFields
  onFieldChange: (key: keyof EditFormFields, value: string) => void
  uploadState: { isPending: boolean; isError: boolean; error: unknown }
  onFileSelect: (file: File) => void
}

export function ApresentadoraRemuneracao({ form, onFieldChange, uploadState, onFileSelect }: Props) {
  return (
    <section className="space-y-4 rounded-2xl border border-line bg-surface-muted/45 p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-bold text-ink">Remuneração da apresentadora</p>
          <p className="mt-1 text-xs text-ink-muted">Foto, fixo, meta e comissão base ficam juntos para evitar cadastro incompleto.</p>
        </div>
        <Badge tone="success">fixo padrão R$ 2.700</Badge>
      </div>
      <ImagePicker
        label="Foto da apresentadora"
        value={form.foto_url}
        onChange={(value) => onFieldChange('foto_url', value)}
        onFileSelect={onFileSelect}
        isUploading={uploadState.isPending}
        helper="Aparece nos rankings de apresentadoras."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className="text-sm font-semibold text-ink">Fixo mensal (R$)</span>
          <MoneyInput className="design-input mt-2 h-11 w-full px-4" value={form.fixo} onChange={(raw) => onFieldChange('fixo', raw)} />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-ink">Meta diária GMV (R$)</span>
          <MoneyInput className="design-input mt-2 h-11 w-full px-4" value={form.meta_diaria_gmv} onChange={(raw) => onFieldChange('meta_diaria_gmv', raw)} />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-ink">Comissão base opcional (%)</span>
          <input className="design-input mt-2 h-11 w-full px-4" type="number" min="0" max="100" step="0.01" value={form.comissao_pct} onChange={(e) => onFieldChange('comissao_pct', e.target.value)} placeholder="Escada padrão" />
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
  )
}
