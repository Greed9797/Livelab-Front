import { Info } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { ImagePicker } from '../ui/ImagePicker'
import { MoneyInput } from '../ui/MoneyInput'
import { extractErrorMessage } from '../../services/api'

// Campo "Comissão (%)" plano removido: o cálculo de comissão ignora esse valor —
// a fonte é sempre a escada de faixas por GMV (seção "Escada de comissão").
interface EditFormFields {
  fixo: string
  foto_url: string
  data_inicio: string
  data_fim: string
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
          <p className="mt-1 text-xs text-ink-muted">Foto e fixo ficam juntos para evitar cadastro incompleto.</p>
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
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-ink">Fixo mensal (R$)</span>
          <MoneyInput className="design-input mt-2 h-11 w-full px-4" value={form.fixo} onChange={(raw) => onFieldChange('fixo', raw)} />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-ink">Início do contrato</span>
          <input type="date" className="design-input mt-2 h-11 w-full px-4" value={form.data_inicio} onChange={(e) => onFieldChange('data_inicio', e.target.value)} />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-ink">Fim do contrato</span>
          <input type="date" className="design-input mt-2 h-11 w-full px-4" value={form.data_fim} onChange={(e) => onFieldChange('data_fim', e.target.value)} />
          <span className="mt-1 block text-[11px] text-ink-muted">Rateia o fixo por dias no mês de saída. Vazio = sem recorte.</span>
        </label>
      </div>
      <p className="flex items-start gap-2 rounded-xl border border-dashed border-line bg-surface px-3 py-2.5 text-xs text-ink-muted">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
        A comissão vem da <strong>escada de comissão por GMV</strong>, configurada logo abaixo em “Escada de comissão”.
      </p>
      {uploadState.isError ? (
        <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
          {extractErrorMessage(uploadState.error)}
        </p>
      ) : null}
    </section>
  )
}
