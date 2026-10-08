import { useEffect, useRef } from 'react'
import { AlertCircle, CheckCircle2, Mail, RefreshCw, Unplug } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../ui/Button'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { ErrorState, LoadingState } from '../ui/States'
import { useToast } from '../ui/Toast'
import { extractErrorMessage } from '../../services/api'
import { getTikTokConnectUrl, getTikTokIntegrationStatus, updateConfiguracoes } from '../../services/domain'
import { QK } from '../../services/query-keys'
import type { JsonRecord } from '../../types/models'

type Props = {
  tenantId: string
  settings: JsonRecord
}

type TikTokStatus = JsonRecord & {
  connected?: boolean
  capability?: {
    supported?: boolean
    oauth?: { available?: boolean; reason?: string | null }
    scope?: string
  }
  credential?: {
    registered?: boolean
    valid_by_expiry?: boolean
    externally_verified?: boolean
  }
}

const notificationOptions = [
  ['notif_live_meta', 'Metas de live'],
  ['notif_lead_novo', 'Novos leads'],
  ['notif_contrato', 'Contratos'],
] as const

function enabled(value: unknown) {
  return value !== false
}

function settingBoolean(settings: JsonRecord, key: string) {
  return enabled(settings[key])
}

export function IntegracoesSettingsPanel({ tenantId, settings }: Props) {
  const client = useQueryClient()
  const toast = useToast()
  const popupRef = useRef<Window | null>(null)
  const tiktok = useQuery({
    queryKey: QK.configuracaoIntegracaoTikTok(tenantId),
    queryFn: getTikTokIntegrationStatus,
    refetchOnWindowFocus: true,
  })

  const connect = useMutation({
    mutationFn: getTikTokConnectUrl,
    onSuccess: ({ url }) => {
      const popup = popupRef.current
      if (!url || !popup || popup.closed) {
        popup?.close()
        toast.push('Não foi possível abrir a autorização do TikTok.', 'error')
        return
      }
      popup.location.href = url
    },
    onError: (error: unknown) => {
      popupRef.current?.close()
      toast.push(extractErrorMessage(error), 'error')
    },
  })

  const preferences = useMutation({
    mutationFn: updateConfiguracoes,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: QK.configuracoes() })
      toast.push('Preferência salva.', 'success')
    },
    onError: (error: unknown) => toast.push(extractErrorMessage(error), 'error'),
  })

  useEffect(() => {
    const onOAuthComplete = (event: MessageEvent) => {
      if (event.source !== popupRef.current) return
      if (event.data !== 'tiktok_connected' && event.data !== 'tiktok_oauth_complete') return
      void client.invalidateQueries({ queryKey: QK.configuracaoIntegracaoTikTok(tenantId) })
    }
    window.addEventListener('message', onOAuthComplete)
    return () => window.removeEventListener('message', onOAuthComplete)
  }, [client, tenantId])

  function openTikTokAuthorization() {
    const popup = window.open('', '_blank', 'popup,width=620,height=760')
    if (!popup) {
      toast.push('Permita a janela de autorização para continuar.', 'error')
      return
    }
    popupRef.current = popup
    popup.document.title = 'Conectando ao TikTok…'
    connect.mutate()
  }

  function savePreference(key: string, value: boolean) {
    preferences.mutate({ [key]: value })
  }

  const status = tiktok.data as TikTokStatus | undefined
  const capability = status?.capability
  const credential = status?.credential
  const oauthAvailable = capability?.oauth?.available === true
  const registered = credential?.registered === true
  const validByExpiry = credential?.valid_by_expiry === true

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-muted text-ink-muted">
              <Unplug className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">TikTok</p>
              <p className="mt-1 text-xs text-ink-muted">Acesso OAuth ao perfil básico. Não inclui sincronização da TikTok Shop ou de GMV.</p>
            </div>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          {tiktok.isLoading ? <LoadingState label="Verificando disponibilidade do TikTok" /> : null}
          {tiktok.isError ? <ErrorState message={extractErrorMessage(tiktok.error)} onRetry={() => void tiktok.refetch()} /> : null}
          {tiktok.data ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2 text-sm">
                {registered && validByExpiry ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" aria-hidden="true" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />}
                <div>
                  <p className="font-semibold text-ink">{registered ? validByExpiry ? 'Credencial registrada e dentro da validade local' : 'Credencial registrada, mas vencida ou sem validade confirmada' : 'Nenhuma credencial registrada'}</p>
                  {credential?.externally_verified === false ? <p className="mt-1 text-xs text-ink-muted">A validade local não confirma que o TikTok ainda aceita a credencial.</p> : null}
                  {capability?.scope ? <p className="mt-1 text-xs text-ink-muted">Escopo disponível: {capability.scope}</p> : null}
                  {!oauthAvailable && capability?.oauth?.reason ? <p className="mt-1 text-xs text-ink-muted">{capability.oauth.reason}</p> : null}
                  {!capability ? <p className="mt-1 text-xs text-ink-muted">O servidor não informou as capacidades de OAuth; nenhuma ação de conexão está habilitada.</p> : null}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                {oauthAvailable ? (
                  <Button type="button" variant="primary" disabled={connect.isPending} isLoading={connect.isPending} onClick={openTikTokAuthorization}>
                    {registered ? 'Reconectar' : 'Conectar'}
                  </Button>
                ) : null}
                <Button type="button" variant="secondary" icon={RefreshCw} aria-label="Atualizar status do TikTok" title="Atualizar status" disabled={tiktok.isFetching} onClick={() => void tiktok.refetch()}>Atualizar</Button>
              </div>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-muted text-ink-muted">
              <Mail className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">Notificações por e-mail</p>
              <p className="mt-1 text-xs text-ink-muted">Preferências de mensagens operacionais da unidade.</p>
            </div>
          </div>
        </CardHeader>
        <CardBody className="divide-y divide-line">
          <label className="flex min-h-12 items-center justify-between gap-4 py-3">
            <span className="text-sm font-medium text-ink">Ativar notificações por e-mail</span>
            <input
              type="checkbox"
              aria-label="Ativar notificações por e-mail"
              className="h-4 w-4 accent-[var(--primary)]"
              checked={settingBoolean(settings, 'notif_email_ativo')}
              disabled={preferences.isPending}
              onChange={(event) => savePreference('notif_email_ativo', event.target.checked)}
            />
          </label>
          {notificationOptions.map(([key, label]) => (
            <label key={key} className="flex min-h-12 items-center justify-between gap-4 py-3">
              <span className="text-sm font-medium text-ink">{label}</span>
              <input
                type="checkbox"
                aria-label={label}
                className="h-4 w-4 accent-[var(--primary)]"
                checked={settingBoolean(settings, key)}
                disabled={preferences.isPending || !settingBoolean(settings, 'notif_email_ativo')}
                onChange={(event) => savePreference(key, event.target.checked)}
              />
            </label>
          ))}
          {preferences.isError ? <p className="py-3 text-sm text-[var(--danger)]">{extractErrorMessage(preferences.error)}</p> : null}
        </CardBody>
      </Card>
    </div>
  )
}
