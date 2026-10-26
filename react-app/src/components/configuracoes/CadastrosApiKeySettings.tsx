import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound } from 'lucide-react'
import { apiGet, apiPost, extractErrorMessage } from '../../services/api'
import { useCurrentUser } from '../../stores/auth-store'
import { Button } from '../ui/Button'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { ErrorState, LoadingState } from '../ui/States'
import { useToast } from '../ui/Toast'

type KeyMetadata = {
  id: string
  nome: string
  prefixo: string
  expira_em: string | null
  revogada_em: string | null
}

export function CadastrosApiKeySettings({ tenantId }: { tenantId: string }) {
  const user = useCurrentUser()
  // Keep the existing settings permission boundary; the API also authorizes every request.
  if (!user?.id || !tenantId || user.tenant_id !== tenantId || !['franqueador_master', 'franqueado'].includes(user.papel)) return null
  return <CadastrosApiKeyPanel key={`${tenantId}:${user.id}`} tenantId={tenantId} userId={user.id} />
}

function CadastrosApiKeyPanel({ tenantId, userId }: { tenantId: string; userId: string }) {
  const toast = useToast()
  const client = useQueryClient()
  const queryKey = ['cadastros-api-keys', tenantId, userId]
  const keys = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await apiGet<{ items: (KeyMetadata & { escopo: string })[] }>('/api-keys')
      // Only metadata enters the shared cache, even if the server adds fields later.
      return result.items.filter((item) => item.escopo === 'cadastros').map(({ id, nome, prefixo, expira_em, revogada_em }) => ({ id, nome, prefixo, expira_em, revogada_em }))
    },
  })
  // Issued credentials must never enter React Query, persistent stores, or logs.
  const [issued, setIssued] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [revokeId, setRevokeId] = useState<string | null>(null)
  const pending = useRef(false)
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  useEffect(() => {
    if (!issued && !busy) return
    const preventUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', preventUnload)
    return () => window.removeEventListener('beforeunload', preventUnload)
  }, [issued, busy])

  async function issue() {
    if (pending.current || issued || !keys.isSuccess) return
    pending.current = true
    setBusy(true)
    try {
      const result = await apiPost<{ chave: string }>('/api-keys', {
        nome: 'Agente de revisão cadastral',
        escopo: 'cadastros',
        expira_em: new Date(Date.now() + 7 * 86400000).toISOString(),
      })
      if (!mounted.current) return
      setIssued(result.chave)
      setRevealed(false)
      void client.invalidateQueries({ queryKey })
    } catch (error) {
      if (mounted.current) toast.push(extractErrorMessage(error), 'error')
    } finally {
      pending.current = false
      if (mounted.current) setBusy(false)
    }
  }

  async function revoke() {
    if (pending.current || !revokeId || !keys.data?.some((item) => item.id === revokeId && !item.revogada_em)) return
    pending.current = true
    setBusy(true)
    try {
      await apiPost(`/api-keys/${encodeURIComponent(revokeId)}/revogar`)
      if (!mounted.current) return
      setRevokeId(null)
      toast.push('Chave revogada.', 'success')
      void client.invalidateQueries({ queryKey })
    } catch (error) {
      if (mounted.current) toast.push(extractErrorMessage(error), 'error')
    } finally {
      pending.current = false
      if (mounted.current) setBusy(false)
    }
  }

  async function copy() {
    if (!issued) return
    try {
      await navigator.clipboard.writeText(issued)
      if (mounted.current) toast.push('Chave copiada. Guarde no seu gerenciador de segredos.', 'success')
    } catch {
      if (mounted.current) toast.push('Não foi possível copiar. Use Mostrar chave e copie manualmente.', 'error')
    }
  }

  return <Card>
    <CardHeader>
      <div className="flex items-start gap-3">
        <KeyRound className="mt-1 h-5 w-5 shrink-0 text-ink-muted" aria-hidden="true" />
        <div>
          <h2 className="text-sm font-bold text-ink">Agente de revisão cadastral</h2>
          <p className="mt-1 text-xs text-ink-muted">Consulta e correção de campos cadastrais desta unidade, com referência documental obrigatória. Sem acesso a finanças, contratos, usuários ou senhas.</p>
        </div>
      </div>
    </CardHeader>
    <CardBody className="space-y-4">
      <p className="text-sm text-ink-muted">Cada chave vale por 7 dias e pode ser revogada aqui. Gere somente quando for configurar o agente.</p>
      {keys.isPending ? <LoadingState label="Carregando chaves cadastrais" /> : null}
      {keys.isError ? <ErrorState message={extractErrorMessage(keys.error)} onRetry={() => void keys.refetch()} /> : null}
      {keys.data?.length === 0 ? <p className="text-sm text-ink-muted">Nenhuma chave cadastral emitida.</p> : null}
      {keys.data?.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3 text-sm">
        <div>
          <p className="font-semibold text-ink">{item.nome}</p>
          <p className="text-xs text-ink-muted">{item.prefixo}… · {item.revogada_em ? 'Revogada' : item.expira_em && Date.parse(item.expira_em) <= Date.now() ? 'Expirada' : 'Ativa'}{item.expira_em ? ` · Validade: ${new Date(item.expira_em).toLocaleString('pt-BR')}` : ''}</p>
        </div>
        {!item.revogada_em ? <Button type="button" variant="secondary" disabled={busy || Boolean(issued)} aria-label={`Revogar ${item.nome}`} onClick={() => setRevokeId(item.id)}>Revogar</Button> : null}
      </div>)}
      {revokeId ? <div className="space-y-3 rounded-lg border border-line p-4">
        <p className="text-sm text-ink">Revogar esta chave interrompe imediatamente o acesso do agente que a utiliza.</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="danger" isLoading={busy} onClick={() => void revoke()}>Confirmar revogação</Button>
          <Button type="button" variant="ghost" disabled={busy} onClick={() => setRevokeId(null)}>Cancelar revogação</Button>
        </div>
      </div> : null}
      <Button type="button" disabled={!keys.isSuccess || busy || Boolean(issued) || Boolean(revokeId)} isLoading={busy && !revokeId} onClick={() => void issue()}>Gerar chave por 7 dias</Button>
      {issued ? <div className="space-y-3 rounded-lg border border-line bg-surface-muted p-4" data-private="true">
        <p className="text-sm font-semibold text-ink">Guarde agora: esta chave só aparece uma vez.</p>
        <p className="text-sm text-ink-muted">Salve como LIVELAB_API_KEY no gerenciador de segredos usado pelo agente. Ao sair desta tela, o valor será descartado. Não envie por chat ou e-mail.</p>
        <label className="block text-sm text-ink">Chave gerada
          <input className="mt-2 w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-sm text-ink" type={revealed ? 'text' : 'password'} value={issued} readOnly autoComplete="off" data-private="true" data-sentry-mask="true" spellCheck={false} />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => void copy()}>Copiar chave</Button>
          <Button type="button" variant="ghost" onClick={() => setRevealed((value) => !value)}>{revealed ? 'Ocultar chave' : 'Mostrar chave'}</Button>
          <Button type="button" onClick={() => { setIssued(null); setRevealed(false) }}>Já guardei a chave</Button>
        </div>
      </div> : null}
    </CardBody>
  </Card>
}
