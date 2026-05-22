import { FormEvent } from 'react'
import { StopCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '../ui/Button'
import { MoneyInput } from '../ui/MoneyInput'
import { PresenterSelect } from '../forms/PresenterSelect'
import { extractErrorMessage } from '../../services/api'
import { getUltimaLiveCabine } from '../../services/domain'
import { asNumber, asString, formatMoney } from '../../utils/format'
import type { JsonRecord } from '../../types/models'

export interface EncerrarLiveFormData {
  fat_gerado: string
  qtd_pedidos: string
  manual_views: string
  manual_likes: string
  manual_comments: string
  manual_shares: string
  manual_diamonds: string
  apresentadora_id: string
  encerrado_em: string
  origem_dados: string
  status_publicacao: string
  resumo: string
}

interface Apresentadora {
  id: string
  nome?: string
}

interface EncerrarLiveFormProps {
  live: JsonRecord
  formData: EncerrarLiveFormData
  apresentadoras: Apresentadora[]
  isLoading: boolean
  error: Error | null
  onFieldChange: (key: keyof EncerrarLiveFormData, value: string) => void
  onSubmit: (payload: JsonRecord) => void
  onCancel: () => void
}

export function EncerrarLiveForm({
  live,
  formData,
  apresentadoras,
  isLoading,
  error,
  onFieldChange,
  onSubmit,
  onCancel,
}: EncerrarLiveFormProps) {
  const cabineId = asString(live.cabine_id, '')
  const { data: sugestoes } = useQuery({
    queryKey: ['cabine-metricas', cabineId],
    queryFn: () => getUltimaLiveCabine(cabineId),
    enabled: Boolean(cabineId),
    staleTime: 60_000,
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!formData.apresentadora_id) {
      window.alert('Selecione a apresentadora antes de encerrar a live.')
      return
    }
    if (formData.encerrado_em && live.iniciado_em) {
      const fim = new Date(formData.encerrado_em).getTime()
      const ini = new Date(asString(live.iniciado_em)).getTime()
      if (Number.isFinite(fim) && Number.isFinite(ini) && fim < ini) {
        window.alert('Término real não pode ser anterior ao início da live.')
        return
      }
    }

    onSubmit({
      fat_gerado: asNumber(formData.fat_gerado),
      qtd_pedidos: asNumber(formData.qtd_pedidos),
      resumo: formData.resumo.trim() || 'Live encerrada pelo painel React.',
      manual_gmv: asNumber(formData.fat_gerado),
      manual_orders: asNumber(formData.qtd_pedidos),
      manual_views: asNumber(formData.manual_views),
      manual_likes: asNumber(formData.manual_likes),
      manual_comments: asNumber(formData.manual_comments),
      manual_shares: asNumber(formData.manual_shares),
      manual_diamonds: asNumber(formData.manual_diamonds),
      apresentadora_id: formData.apresentadora_id,
      encerrado_em: formData.encerrado_em
        ? new Date(formData.encerrado_em).toISOString()
        : new Date().toISOString(),
      origem_dados: formData.origem_dados,
      status_publicacao: formData.status_publicacao,
    })
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
      {sugestoes?.amostra ? (
        <div className="md:col-span-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elev-2)] px-4 py-3 text-[12px] text-[var(--text-secondary)]">
          Sugestões baseadas na média das últimas <strong>{sugestoes.amostra}</strong> live{sugestoes.amostra !== 1 ? 's' : ''} desta cabine.
        </div>
      ) : null}
      <label className="block">
        <span className="text-sm font-semibold text-ink">GMV final</span>
        <MoneyInput
          className="design-input mt-2 h-11 w-full px-4"
          value={formData.fat_gerado}
          onChange={(raw) => onFieldChange('fat_gerado', raw)}
          placeholder={sugestoes?.avg_fat_gerado
            ? `ex: ${formatMoney(sugestoes.avg_fat_gerado)} (média ${sugestoes.amostra ?? '?'} lives)`
            : 'ex: 12.345,00'}
          required
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-ink">Pedidos finais</span>
        <input
          className="design-input mt-2 h-11 w-full px-4"
          type="text"
          inputMode="numeric"
          pattern="[0-9.,]*"
          value={formData.qtd_pedidos}
          onChange={(e) => onFieldChange('qtd_pedidos', e.target.value)}
          placeholder={sugestoes?.avg_qtd_pedidos
            ? `ex: ${Math.round(sugestoes.avg_qtd_pedidos)} (média ${sugestoes.amostra ?? '?'} lives)`
            : 'ex: 42'}
          required
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-ink">Viewers finais</span>
        <input
          className="design-input mt-2 h-11 w-full px-4"
          type="text"
          inputMode="numeric"
          pattern="[0-9.,]*"
          value={formData.manual_views}
          onChange={(e) => onFieldChange('manual_views', e.target.value)}
          placeholder={sugestoes?.avg_views
            ? `ex: ${Math.round(sugestoes.avg_views).toLocaleString('pt-BR')}`
            : 'ex: 1500'}
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-ink">Likes finais</span>
        <input
          className="design-input mt-2 h-11 w-full px-4"
          type="text"
          inputMode="numeric"
          pattern="[0-9.,]*"
          value={formData.manual_likes}
          onChange={(e) => onFieldChange('manual_likes', e.target.value)}
          placeholder={sugestoes?.avg_likes
            ? `ex: ${Math.round(sugestoes.avg_likes).toLocaleString('pt-BR')}`
            : 'ex: 320'}
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-ink">Comentários finais</span>
        <input
          className="design-input mt-2 h-11 w-full px-4"
          type="text"
          inputMode="numeric"
          pattern="[0-9.,]*"
          value={formData.manual_comments}
          onChange={(e) => onFieldChange('manual_comments', e.target.value)}
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-ink">Shares finais</span>
        <input
          className="design-input mt-2 h-11 w-full px-4"
          type="text"
          inputMode="numeric"
          pattern="[0-9.,]*"
          value={formData.manual_shares}
          onChange={(e) => onFieldChange('manual_shares', e.target.value)}
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-ink">Diamonds finais</span>
        <input
          className="design-input mt-2 h-11 w-full px-4"
          type="text"
          inputMode="numeric"
          pattern="[0-9.,]*"
          value={formData.manual_diamonds}
          onChange={(e) => onFieldChange('manual_diamonds', e.target.value)}
        />
      </label>
      <PresenterSelect
        rows={apresentadoras}
        value={formData.apresentadora_id}
        onChange={(value) => onFieldChange('apresentadora_id', value)}
        required
      />
      <label className="block">
        <span className="text-sm font-semibold text-ink">Término real</span>
        <input
          className="design-input mt-2 h-11 w-full px-4"
          type="datetime-local"
          value={formData.encerrado_em}
          onChange={(e) => onFieldChange('encerrado_em', e.target.value)}
          required
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-ink">Origem dos dados</span>
        <select
          className="design-input mt-2 h-11 w-full px-4"
          value={formData.origem_dados}
          onChange={(e) => onFieldChange('origem_dados', e.target.value)}
        >
          <option value="manual">Manual</option>
          <option value="api">API TikTok</option>
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-ink">Status de publicação</span>
        <select
          className="design-input mt-2 h-11 w-full px-4"
          value={formData.status_publicacao}
          onChange={(e) => onFieldChange('status_publicacao', e.target.value)}
        >
          <option value="rascunho">Rascunho</option>
          <option value="revisado">Revisado</option>
          <option value="publicado">Publicado</option>
        </select>
      </label>
      <label className="block md:col-span-2">
        <span className="text-sm font-semibold text-ink">Observações</span>
        <textarea
          className="design-input mt-2 min-h-[96px] w-full px-4 py-3"
          value={formData.resumo}
          onChange={(e) => onFieldChange('resumo', e.target.value)}
        />
      </label>
      {error ? (
        <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)] md:col-span-2">
          {extractErrorMessage(error)}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2 md:col-span-2">
        <Button type="submit" variant="danger" icon={StopCircle} isLoading={isLoading}>
          Salvar encerramento
        </Button>
        <Button type="button" variant="secondary" disabled={isLoading} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
