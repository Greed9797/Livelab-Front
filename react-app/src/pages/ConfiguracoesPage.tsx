import { BarChart2, Copy, ExternalLink, KeyRound, Lock, Moon, Plug, Save, Sun, Trophy, Users } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ErrorState, LoadingState } from '../components/ui/States'
import { MoneyInput } from '../components/ui/MoneyInput'
import { getClienteMeta, getClientePerfil, getConfiguracoes, getMetasMarcasHora, getMetaUnidade, getMetasApresentadoras, getMetaSupervisor, getRankingPublicoConfig, trocarSenha, updateConfiguracoes, updateRankingPublicoConfig, uploadConfiguracoesLogo, upsertMetaApresentadora, upsertMetaMarcaHora, upsertMetaSupervisor, upsertMetaUnidade } from '../services/domain'
import { useToast } from '../components/ui/Toast'
import { extractErrorMessage } from '../services/api'
import { asNumber, asString, currentPeriod, formatMoney, periodLabel } from '../utils/format'
import { formatBRLWithoutSymbol, parseBRMoneyToDecimal } from '../utils/money'
import { useThemeStore } from '../stores/theme-store'
import { SettingsUsuariosPanel } from './SettingsUsuariosPanel'
import { useAuthStore, useCurrentUser } from '../stores/auth-store'
import { QK } from '../services/query-keys'
import type { JsonRecord } from '../types/models'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import { UnsavedChangesNotice } from '../components/ui/UnsavedChangesNotice'
import { IntegracoesSettingsPanel } from '../components/configuracoes/IntegracoesSettingsPanel'
import { rankingSettingsFrom, rankingSettingsPatch, unitSettingsFrom, unitSettingsPatch, unitSettingsValid, type RankingSettingsDraft, type UnitSettingsDraft } from '../components/configuracoes/settings-form'

type SettingsTab = 'unidade' | 'usuarios' | 'metas' | 'integracoes' | 'seguranca'
const settingsTabs: SettingsTab[] = ['unidade', 'usuarios', 'metas', 'integracoes', 'seguranca']

export function ConfiguracoesPage({ clienteMode = false }: { clienteMode?: boolean }) {
  const toast = useToast()
  const client = useQueryClient()
  const currentUser = useCurrentUser()
  const updateTenantDisplayName = useAuthStore((state) => state.updateTenantDisplayName)
  const navigate = useNavigate()
  // Apenas franqueador_master/franqueado veem os controles administrativos.
  // Demais papéis internos (operação, cabine, apresentador, etc.) só acessam
  // a seção de conta/segurança (trocar senha). Default-DENY: na dúvida, esconde.
  const isAdmin = currentUser?.papel === 'franqueador_master' || currentUser?.papel === 'franqueado'
  const publicRankingUrl = currentUser?.tenant_id
    ? `${window.location.origin}/ranking?unidade=${currentUser.tenant_id}`
    : `${window.location.origin}/ranking`
  const [params, setParams] = useSearchParams()
  const query = useQuery({ queryKey: QK.configuracoes(clienteMode, currentUser?.tenant_id), queryFn: getConfiguracoes, enabled: !clienteMode && isAdmin })
  const rankingQuery = useQuery({ queryKey: QK.configuracoeRankingPublico(currentUser?.tenant_id), queryFn: getRankingPublicoConfig, enabled: !clienteMode && isAdmin })
  const period = currentPeriod()
  const perfilQuery = useQuery({ queryKey: QK.clientePerfil, queryFn: getClientePerfil, enabled: clienteMode })
  const metaQuery = useQuery({ queryKey: QK.clienteMeta(period), queryFn: () => getClienteMeta(period), enabled: clienteMode })
  const [form, setForm] = useState<UnitSettingsDraft>({ nome: '', cnpj: '', email_contato: '', telefone_contato: '', cidade: '', uf: '' })
  const [unitBaseline, setUnitBaseline] = useState<UnitSettingsDraft>({ nome: '', cnpj: '', email_contato: '', telefone_contato: '', cidade: '', uf: '' })
  const [unitDirty, setUnitDirty] = useState(false)
  const [unitValidationError, setUnitValidationError] = useState<string | null>(null)
  const [rankingForm, setRankingForm] = useState<RankingSettingsDraft>({
    ativo: true,
    nome_publico: '',
    logo_url: '',
    cidade: '',
    uf: '',
    meta_gmv: '',
  })
  const [rankingBaseline, setRankingBaseline] = useState<RankingSettingsDraft>({ ativo: true, nome_publico: '', logo_url: '', cidade: '', uf: '', meta_gmv: '' })
  const [rankingDirty, setRankingDirty] = useState(false)
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null)
  const [senha, setSenha] = useState({ senha_atual: '', nova_senha: '' })
  const requestedTabRaw = params.get('tab')
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('unidade')
  const theme = useThemeStore((state) => state.theme)
  const setTheme = useThemeStore((state) => state.setTheme)
  const mutation = useMutation({
    mutationFn: updateConfiguracoes,
    onSuccess: (saved) => {
      const settings = saved.settings && typeof saved.settings === 'object' && !Array.isArray(saved.settings)
        ? saved.settings as JsonRecord
        : saved
      const confirmed = unitSettingsFrom(settings)
      if (currentUser?.tenant_id) client.setQueryData<JsonRecord>(QK.configuracoes(false, currentUser.tenant_id), (old) => ({ ...(old ?? {}), ...settings }))
      setForm(confirmed)
      setUnitBaseline(confirmed)
      setUnitDirty(false)
      setUnitValidationError(null)
      if (currentUser?.tenant_id) updateTenantDisplayName(currentUser.tenant_id, confirmed.nome)
      void client.invalidateQueries({ queryKey: QK.configuracoes() })
      void client.invalidateQueries({ queryKey: QK.configuracoeRankingPublico() })
      toast.push('Dados da unidade salvos.', 'success')
    },
  })
  const rankingMutation = useMutation({
    mutationFn: updateRankingPublicoConfig,
    onSuccess: (saved) => {
      const confirmed = rankingSettingsFrom(saved)
      if (currentUser?.tenant_id) client.setQueryData(QK.configuracoeRankingPublico(currentUser.tenant_id), saved)
      setRankingForm(confirmed)
      setRankingBaseline(confirmed)
      setRankingDirty(false)
      void client.invalidateQueries({ queryKey: QK.configuracoeRankingPublico() })
      toast.push('Identidade do ranking salva.', 'success')
    },
  })
  const logoUploadMutation = useMutation({
    mutationFn: uploadConfiguracoesLogo,
    onSuccess: ({ url }) => {
      setLogoUploadError(null)
      setRankingDirty(true)
      setRankingForm((current) => ({ ...current, logo_url: url }))
      toast.push('Logo enviada. Salve a identidade do ranking para aplicá-la.', 'success')
    },
    onError: (error: unknown) => {
      const message = extractErrorMessage(error)
      setLogoUploadError(message)
      toast.push(message, 'error')
    },
  })
  // ── Metas: unidade + apresentadoras + supervisor + GMV/h por marca ────────
  const [metasMes, setMetasMes] = useState(new Date().toISOString().slice(0, 7))
  const metaUnidadeQuery = useQuery({
    queryKey: QK.metaUnidade(metasMes),
    queryFn: () => getMetaUnidade(metasMes),
    enabled: !clienteMode && isAdmin && settingsTab === 'metas',
  })
  const metasApresentadorasQuery = useQuery({
    queryKey: QK.metasApresentadoras(metasMes),
    queryFn: () => getMetasApresentadoras(metasMes),
    enabled: !clienteMode && isAdmin && settingsTab === 'metas',
  })
  const metasSupervisorQuery = useQuery({
    queryKey: QK.metasSupervisor(metasMes),
    queryFn: () => getMetaSupervisor(metasMes),
    enabled: !clienteMode && isAdmin && settingsTab === 'metas',
  })
  const [metasSupervisorInput, setMetasSupervisorInput] = useState('')
  const [metasApresentadorasInputs, setMetasApresentadorasInputs] = useState<Record<string, string>>({})
  const [metaUnidadeInput, setMetaUnidadeInput] = useState('')

  const metasMarcasHoraQuery = useQuery({
    queryKey: QK.metasMarcasHora(metasMes),
    queryFn: () => getMetasMarcasHora(metasMes),
    enabled: !clienteMode && isAdmin && settingsTab === 'metas',
  })
  const [metasMarcasHoraInputs, setMetasMarcasHoraInputs] = useState<Record<string, string>>({})

  const metaUnidadeMutation = useMutation({
    mutationFn: ({ meta_gmv }: { meta_gmv: number }) => upsertMetaUnidade(metasMes, meta_gmv),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: QK.metaUnidade(metasMes) })
      void client.invalidateQueries({ queryKey: QK.homeDashboard })
      toast.push('Meta da unidade salva.', 'success')
    },
    onError: (err: unknown) => toast.push(extractErrorMessage(err), 'error'),
  })

  const marcaHoraMutation = useMutation({
    mutationFn: ({ id, meta_gmv_hora }: { id: string; meta_gmv_hora: number }) =>
      upsertMetaMarcaHora(id, metasMes, meta_gmv_hora),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: QK.metasMarcasHora(metasMes) })
      toast.push('Meta GMV/hora salva.', 'success')
    },
    onError: (err: unknown) => toast.push(extractErrorMessage(err), 'error'),
  })

  const supervisorMutation = useMutation({
    mutationFn: ({ gmv_meta_total }: { gmv_meta_total: number }) =>
      upsertMetaSupervisor(metasMes, { gmv_meta_total, calculado_automaticamente: false }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: QK.metasSupervisor(metasMes) })
      toast.push('Meta do supervisor salva.', 'success')
    },
    onError: (err: unknown) => toast.push(extractErrorMessage(err), 'error'),
  })

  const apresentadoraMutation = useMutation({
    mutationFn: ({ id, gmv_meta }: { id: string; gmv_meta: number }) =>
      upsertMetaApresentadora(id, metasMes, { gmv_meta }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: QK.metasApresentadoras(metasMes) })
      toast.push('Meta salva.', 'success')
    },
    onError: (err: unknown) => toast.push(extractErrorMessage(err), 'error'),
  })

  const saveAllApresentadorasMutation = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(metasApresentadorasInputs)
      for (const [id, raw] of entries) {
        const val = parseBRMoneyToDecimal(raw)
        if (!isNaN(val)) {
          await upsertMetaApresentadora(id, metasMes, { gmv_meta: val })
        }
      }
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: QK.metasApresentadoras(metasMes) })
      toast.push('Todas as metas salvas.', 'success')
    },
    onError: (err: unknown) => toast.push(extractErrorMessage(err), 'error'),
  })

  const senhaMutation = useMutation({
    mutationFn: trocarSenha,
    onSuccess: () => setSenha({ senha_atual: '', nova_senha: '' }),
  })

  useEffect(() => {
    if (!query.data || unitDirty) return
    const loaded = unitSettingsFrom(query.data)
    setForm(loaded)
    setUnitBaseline(loaded)
  }, [query.data, unitDirty])

  useEffect(() => {
    if (!rankingQuery.data || rankingDirty) return
    const loaded = rankingSettingsFrom(rankingQuery.data)
    setRankingForm(loaded)
    setRankingBaseline(loaded)
  }, [rankingQuery.data, rankingDirty])

  useEffect(() => {
    if (requestedTabRaw === 'comissoes-livelab') {
      navigate('/financeiro/comissoes/regras', { replace: true })
      return
    }
    if (requestedTabRaw === 'apresentadoras') {
      setSettingsTab('usuarios')
      return
    }
    if (requestedTabRaw === 'ranking' || requestedTabRaw === 'aparencia') {
      setSettingsTab('unidade')
      return
    }
    const nextTab = requestedTabRaw as SettingsTab | null
    setSettingsTab(nextTab && settingsTabs.includes(nextTab) ? nextTab : 'unidade')
  }, [navigate, requestedTabRaw])

  const pageCloseGuard = useUnsavedChanges({
    open: !clienteMode && isAdmin,
    dirty: unitDirty || rankingDirty,
    busy: mutation.isPending || rankingMutation.isPending || logoUploadMutation.isPending,
    onClose: () => {
      setForm(unitBaseline)
      setUnitDirty(false)
      setRankingForm(rankingBaseline)
      setRankingDirty(false)
      setLogoUploadError(null)
    },
  })

  useEffect(() => {
    if (!metasSupervisorQuery.data) return
    setMetasSupervisorInput(formatBRLWithoutSymbol(metasSupervisorQuery.data.meta_gmv ?? 0))
  }, [metasSupervisorQuery.data])

  useEffect(() => {
    if (!metasApresentadorasQuery.data) return
    const inputs: Record<string, string> = {}
    for (const row of metasApresentadorasQuery.data) {
      inputs[String(row.apresentadora_id)] = formatBRLWithoutSymbol(row.meta_gmv ?? 0)
    }
    setMetasApresentadorasInputs(inputs)
  }, [metasApresentadorasQuery.data])

  useEffect(() => {
    if (!metaUnidadeQuery.data) return
    setMetaUnidadeInput(formatBRLWithoutSymbol(metaUnidadeQuery.data.meta_gmv ?? 0))
  }, [metaUnidadeQuery.data])

  useEffect(() => {
    if (!metasMarcasHoraQuery.data) return
    const inputs: Record<string, string> = {}
    for (const row of metasMarcasHoraQuery.data) {
      inputs[String(row.marca_id)] = formatBRLWithoutSymbol(row.meta_gmv_hora ?? 0)
    }
    setMetasMarcasHoraInputs(inputs)
  }, [metasMarcasHoraQuery.data])

  if (clienteMode) {
    if (perfilQuery.isLoading || metaQuery.isLoading) return <LoadingState />
    if (perfilQuery.isError) return <ErrorState message={extractErrorMessage(perfilQuery.error)} onRetry={() => void perfilQuery.refetch()} />
    if (metaQuery.isError) return <ErrorState message={extractErrorMessage(metaQuery.error)} onRetry={() => void metaQuery.refetch()} />

    const perfil = perfilQuery.data ?? {}

    return (
      <div className="space-y-6">
        <PageHeader title="Configurações da conta" subtitle="Dados do perfil e preferências do cliente parceiro." />

        <section className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
          <Card>
            <CardHeader>
              <p className="text-base font-bold text-ink">Perfil vinculado</p>
              <p className="mt-1 text-xs text-ink-muted">Esses dados vêm de `/cliente/perfil`; edição cadastral completa segue pelo admin da unidade.</p>
            </CardHeader>
            <CardBody className="grid gap-4 md:grid-cols-2">
              {([
                ['Nome', perfil.nome],
                ['Email', perfil.email],
                ['Celular', perfil.celular],
                ['CNPJ', perfil.cnpj],
                ['Razão social', perfil.razao_social],
                ['Site', perfil.site],
                ['Cidade', `${asString(perfil.cidade, '')} ${asString(perfil.estado, '')}`.trim()],
                ['Nicho', perfil.nicho],
              ] as Array<[string, unknown]>).map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl border border-line bg-surface-muted p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-muted">{label}</p>
                  <p className="mt-2 truncate text-sm font-bold text-ink">{asString(value)}</p>
                </div>
              ))}
            </CardBody>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <p className="text-base font-bold text-ink">Meta do mês</p>
                <p className="mt-1 text-xs text-ink-muted">{periodLabel(period)} · somente visualização</p>
              </CardHeader>
              <CardBody>
                <div className="rounded-2xl bg-brand-soft p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand">Meta atual</p>
                  <p className="num mt-2 text-2xl font-bold text-ink">{formatMoney(metaQuery.data?.meta_gmv)}</p>
                </div>
                <p className="mt-3 rounded-2xl border border-line bg-surface-muted px-4 py-3 text-sm text-ink-muted">
                  A meta é definida pela unidade. Nesta fase o cliente apenas acompanha o valor.
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <p className="text-base font-bold text-ink">Segurança</p>
                <p className="mt-1 text-xs text-ink-muted">Altere a sua senha de acesso. Mínimo 8 caracteres, com letra e número.</p>
              </CardHeader>
              <CardBody>
                <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => {
                  event.preventDefault()
                  senhaMutation.mutate(senha)
                }}>
                  <label className="grid gap-2 text-sm font-semibold text-ink">Senha atual<input className="design-input h-11 w-full px-4" type="password" autoComplete="current-password" value={senha.senha_atual} onChange={(event) => setSenha((current) => ({ ...current, senha_atual: event.target.value }))} required /></label>
                  <label className="grid gap-2 text-sm font-semibold text-ink">Nova senha<input className="design-input h-11 w-full px-4" type="password" autoComplete="new-password" value={senha.nova_senha} onChange={(event) => setSenha((current) => ({ ...current, nova_senha: event.target.value }))} minLength={8} required /></label>
                  {senhaMutation.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)] md:col-span-2">{extractErrorMessage(senhaMutation.error)}</p> : null}
                  {senhaMutation.isSuccess ? <p className="rounded-2xl bg-[var(--success-soft)] px-4 py-3 text-sm font-medium text-[var(--success)] md:col-span-2">Senha alterada. Outras sessões foram desconectadas.</p> : null}
                  <div className="md:col-span-2">
                    <Button type="submit" icon={KeyRound} isLoading={senhaMutation.isPending}>Trocar senha</Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          </div>
        </section>
      </div>
    )
  }

  // Papéis não-admin: somente a seção de conta/segurança (trocar senha).
  // Nenhum controle administrativo (unidade, metas, ranking, usuários, integrações) é renderizado.
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Configurações da conta" subtitle="Altere a sua senha de acesso. Mínimo 8 caracteres, com letra e número." />
        <Card>
          <CardHeader>
            <p className="text-sm font-bold text-ink">Segurança</p>
          </CardHeader>
          <CardBody>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => {
              event.preventDefault()
              senhaMutation.mutate(senha)
            }}>
              <label className="grid gap-2 text-sm font-semibold text-ink">Senha atual<input className="design-input h-11 w-full px-4" type="password" autoComplete="current-password" value={senha.senha_atual} onChange={(event) => setSenha((current) => ({ ...current, senha_atual: event.target.value }))} required /></label>
              <label className="grid gap-2 text-sm font-semibold text-ink">Nova senha<input className="design-input h-11 w-full px-4" type="password" autoComplete="new-password" value={senha.nova_senha} onChange={(event) => setSenha((current) => ({ ...current, nova_senha: event.target.value }))} minLength={8} required /></label>
              {senhaMutation.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)] md:col-span-2">{extractErrorMessage(senhaMutation.error)}</p> : null}
              {senhaMutation.isSuccess ? <p className="rounded-2xl bg-[var(--success-soft)] px-4 py-3 text-sm font-medium text-[var(--success)] md:col-span-2">Senha alterada. Outras sessões foram desconectadas.</p> : null}
              <div className="md:col-span-2">
                <Button type="submit" icon={KeyRound} isLoading={senhaMutation.isPending}>Trocar senha</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    )
  }

  if (query.isLoading) return <LoadingState />
  if (query.isError && !query.data) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />

  function setField(key: keyof UnitSettingsDraft, value: string) {
    mutation.reset()
    setUnitValidationError(null)
    setForm((current) => {
      const next = { ...current, [key]: value }
      setUnitDirty(Object.keys(unitSettingsPatch(next, unitBaseline)).length > 0)
      return next
    })
  }

  function setRankingField<K extends keyof RankingSettingsDraft>(key: K, value: RankingSettingsDraft[K]) {
    rankingMutation.reset()
    setLogoUploadError(null)
    setRankingForm((current) => {
      const next = { ...current, [key]: value }
      setRankingDirty(Object.keys(rankingSettingsPatch(next, rankingBaseline)).length > 0)
      return next
    })
  }

  function uploadRankingLogo(file: File | undefined) {
    if (!file) return
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      setLogoUploadError('Formato não suportado. Use JPEG, PNG, WebP ou GIF.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setLogoUploadError('A imagem deve ter no máximo 5 MB.')
      return
    }
    setLogoUploadError(null)
    logoUploadMutation.mutate(file)
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const payload = unitSettingsPatch(form, unitBaseline)
    if (!unitSettingsValid(form)) {
      setUnitValidationError('Informe o nome da unidade.')
      return
    }
    if (Object.keys(payload).length === 0) return
    mutation.mutate(payload)
  }

  function onRankingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const payload = rankingSettingsPatch(rankingForm, rankingBaseline)
    if (Object.keys(payload).length === 0) return
    rankingMutation.mutate(payload)
  }

  function switchSettingsTab(resolved: SettingsTab) {
    setSettingsTab(resolved)
    const nextParams = new URLSearchParams(params)
    if (resolved === 'unidade') nextParams.delete('tab')
    else nextParams.set('tab', resolved)
    setParams(nextParams)
  }

  const effectiveRankingLogo = rankingForm.logo_url || asString(rankingQuery.data?.logo_url, '')

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações da unidade" subtitle="Dados da unidade, equipe e preferências de operação." />

      {pageCloseGuard.confirming ? <UnsavedChangesNotice guard={pageCloseGuard} /> : null}
      {query.isError ? <ErrorState message={`${extractErrorMessage(query.error)}. Mostrando os últimos dados carregados.`} onRetry={() => void query.refetch()} /> : null}

      <div role="group" aria-label="Seções de configurações" className="flex gap-1 overflow-x-auto border-b border-line pb-2">
        {[
          ['unidade', Save, 'Unidade e aparência'],
          ['usuarios', Users, 'Usuários e equipe'],
          ['metas', BarChart2, 'Metas'],
          ['integracoes', Plug, 'Integrações'],
          ['seguranca', Lock, 'Segurança'],
        ].map(([key, Icon, label]) => (
          <button
            key={String(key)}
            aria-pressed={settingsTab === key}
            className={settingsTab === key ? 'inline-flex h-10 shrink-0 items-center gap-2 border-b-2 border-[var(--primary)] px-3 text-sm font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30' : 'inline-flex h-10 shrink-0 items-center gap-2 border-b-2 border-transparent px-3 text-sm font-semibold text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30'}
            onClick={() => switchSettingsTab(key as SettingsTab)}
            type="button"
          >
            <Icon className="h-4 w-4" />
            {label as string}
          </button>
        ))}
      </div>

      {settingsTab === 'metas' ? (
        <div className="space-y-6">
          {/* Seletor de mês */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-ink" htmlFor="metas-mes-input">Mês de referência</label>
            <input
              id="metas-mes-input"
              type="month"
              className="design-input h-10 px-4 text-sm"
              value={metasMes}
              onChange={(event) => setMetasMes(event.target.value)}
            />
          </div>

          {/* Card: Meta mensal da unidade (fonte da meta do dashboard) */}
          <Card>
            <CardHeader>
              <p className="text-sm font-bold text-ink">Meta mensal da unidade</p>
              <p className="mt-1 text-xs text-ink-muted">Meta de GMV da franquia exibida no dashboard. A meta diária é derivada automaticamente: meta mensal ÷ dias úteis (seg–sex) do mês.</p>
            </CardHeader>
            <CardBody>
              {metaUnidadeQuery.isLoading ? <LoadingState label="Carregando…" /> : null}
              {metaUnidadeQuery.isError ? <ErrorState message={extractErrorMessage(metaUnidadeQuery.error)} onRetry={() => void metaUnidadeQuery.refetch()} /> : null}
              {metaUnidadeQuery.data ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-line bg-surface-muted p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-muted">Meta do mês</p>
                      <p className="num mt-2 text-xl font-bold text-ink">
                        {asNumber(metaUnidadeQuery.data.meta_gmv, 0) > 0 ? formatMoney(asNumber(metaUnidadeQuery.data.meta_gmv, 0)) : 'Não definida'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-line bg-surface-muted p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-muted">Meta diária derivada</p>
                      <p className="num mt-2 text-xl font-bold text-ink">
                        {metaUnidadeQuery.data.meta_diaria != null ? formatMoney(asNumber(metaUnidadeQuery.data.meta_diaria, 0)) : '—'}
                      </p>
                      <p className="mt-1 text-xs text-ink-muted">{asNumber(metaUnidadeQuery.data.dias_uteis, 0)} dias úteis no mês</p>
                    </div>
                  </div>
                  <form
                    className="flex flex-col gap-3 sm:flex-row sm:items-end"
                    onSubmit={(event) => {
                      event.preventDefault()
                      metaUnidadeMutation.mutate({ meta_gmv: parseBRMoneyToDecimal(metaUnidadeInput) })
                    }}
                  >
                    <label className="block flex-1">
                      <span className="text-sm font-semibold text-ink">Meta mensal de GMV</span>
                      <MoneyInput
                        className="design-input mt-2 h-11 w-full px-4"
                        value={metaUnidadeInput}
                        onChange={(raw) => setMetaUnidadeInput(raw)}
                      />
                    </label>
                    <Button type="submit" icon={BarChart2} isLoading={metaUnidadeMutation.isPending}>
                      Salvar
                    </Button>
                  </form>
                </div>
              ) : null}
            </CardBody>
          </Card>

          {/* Card: Meta supervisor */}
          <Card>
            <CardHeader>
              <p className="text-sm font-bold text-ink">Meta do supervisor</p>
              <p className="mt-1 text-xs text-ink-muted">Meta consolidada de GMV para a unidade no mês selecionado.</p>
            </CardHeader>
            <CardBody>
              {metasSupervisorQuery.isLoading ? <LoadingState label="Carregando…" /> : null}
              {metasSupervisorQuery.isError ? <ErrorState message={extractErrorMessage(metasSupervisorQuery.error)} onRetry={() => void metasSupervisorQuery.refetch()} /> : null}
              {metasSupervisorQuery.data ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-line bg-surface-muted p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-muted">GMV Realizado</p>
                      <p className="num mt-2 text-xl font-bold text-ink">{formatMoney(asNumber(metasSupervisorQuery.data.gmv_realizado, 0))}</p>
                    </div>
                    <div className="rounded-2xl border border-line bg-surface-muted p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-muted">Meta atual</p>
                      <p className="num mt-2 text-xl font-bold text-ink">{formatMoney(asNumber(metasSupervisorQuery.data.meta_gmv, 0))}</p>
                    </div>
                  </div>
                  {(() => {
                    const supMeta = asNumber(metasSupervisorQuery.data.meta_gmv, 0)
                    const supReal = asNumber(metasSupervisorQuery.data.gmv_realizado, 0)
                    const pct = supMeta > 0
                      ? Math.min(100, (supReal / supMeta) * 100)
                      : 0
                    return (
                      <div>
                        <div className="mb-1 flex justify-between text-xs font-medium text-ink-muted">
                          <span>Progresso</span>
                          <span>{pct.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                          <div
                            className="h-2 rounded-full bg-brand transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })()}
                  <form
                    className="flex flex-col gap-3 sm:flex-row sm:items-end"
                    onSubmit={(event) => {
                      event.preventDefault()
                      supervisorMutation.mutate({ gmv_meta_total: parseBRMoneyToDecimal(metasSupervisorInput) })
                    }}
                  >
                    <label className="block flex-1">
                      <span className="text-sm font-semibold text-ink">Nova meta GMV</span>
                      <MoneyInput
                        className="design-input mt-2 h-11 w-full px-4"
                        value={metasSupervisorInput}
                        onChange={(raw) => setMetasSupervisorInput(raw)}
                      />
                    </label>
                    <Button type="submit" icon={BarChart2} isLoading={supervisorMutation.isPending}>
                      Salvar
                    </Button>
                  </form>
                </div>
              ) : null}
            </CardBody>
          </Card>

          {/* Card: Metas individuais apresentadoras */}
          <Card>
            <CardHeader>
              <p className="text-sm font-bold text-ink">Metas individuais por apresentadora</p>
              <p className="mt-1 text-xs text-ink-muted">Defina a meta de GMV de cada apresentadora ativa para o mês.</p>
            </CardHeader>
            <CardBody>
              {metasApresentadorasQuery.isLoading ? <LoadingState label="Carregando apresentadoras…" /> : null}
              {metasApresentadorasQuery.isError ? <ErrorState message={extractErrorMessage(metasApresentadorasQuery.error)} onRetry={() => void metasApresentadorasQuery.refetch()} /> : null}
              {metasApresentadorasQuery.data && metasApresentadorasQuery.data.length === 0 ? (
                <p className="text-sm text-ink-muted">Nenhuma apresentadora ativa encontrada.</p>
              ) : null}
              {metasApresentadorasQuery.data && metasApresentadorasQuery.data.length > 0 ? (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-line">
                          <th className="pb-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Nome</th>
                          <th className="pb-2 text-right text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">GMV Realizado</th>
                          <th className="pb-2 text-right text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">% Atingido</th>
                          <th className="pb-2 pl-4 text-left text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Meta GMV</th>
                          <th className="pb-2 text-right text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {metasApresentadorasQuery.data.map((row) => {
                          const id = String(row.apresentadora_id)
                          const metaVal = parseBRMoneyToDecimal(metasApresentadorasInputs[id] ?? '0')
                          const gmvReal = asNumber(row.gmv_realizado, 0)
                          const pct = metaVal > 0 ? Math.min(999, (gmvReal / metaVal) * 100) : 0
                          return (
                            <tr key={id} className="align-middle">
                              <td className="py-3 font-medium text-ink">{asString(row.nome, '—')}</td>
                              <td className="py-3 text-right num text-ink">{formatMoney(gmvReal)}</td>
                              <td className="py-3 text-right">
                                <div className="flex flex-col items-end gap-1">
                                  <span className={`text-xs font-bold ${pct >= 100 ? 'text-[var(--success)]' : 'text-ink-muted'}`}>{pct.toFixed(1)}%</span>
                                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-muted">
                                    <div
                                      className={`h-1.5 rounded-full transition-all ${pct >= 100 ? 'bg-[var(--success)]' : 'bg-brand'}`}
                                      style={{ width: `${Math.min(100, pct)}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 pl-4">
                                <MoneyInput
                                  className="design-input h-9 w-36 px-3 text-sm"
                                  value={metasApresentadorasInputs[id] ?? ''}
                                  onChange={(raw) => setMetasApresentadorasInputs((current) => ({ ...current, [id]: raw }))}
                                />
                              </td>
                              <td className="py-3 text-right">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  isLoading={apresentadoraMutation.isPending && apresentadoraMutation.variables?.id === id}
                                  onClick={() => apresentadoraMutation.mutate({ id, gmv_meta: parseBRMoneyToDecimal(metasApresentadorasInputs[id] ?? '0') })}
                                >
                                  Salvar
                                </Button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      icon={BarChart2}
                      isLoading={saveAllApresentadorasMutation.isPending}
                      onClick={() => saveAllApresentadorasMutation.mutate()}
                    >
                      Salvar todas
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardBody>
          </Card>

          {/* Card: Meta GMV/hora por marca */}
          <Card>
            <CardHeader>
              <p className="text-sm font-bold text-ink">Meta de GMV/hora por marca</p>
              <p className="mt-1 text-xs text-ink-muted">Referência de GMV por hora de live usada no status operacional, definida por marca para o mês selecionado.</p>
            </CardHeader>
            <CardBody>
              {metasMarcasHoraQuery.isLoading ? <LoadingState label="Carregando marcas…" /> : null}
              {metasMarcasHoraQuery.isError ? <ErrorState message={extractErrorMessage(metasMarcasHoraQuery.error)} onRetry={() => void metasMarcasHoraQuery.refetch()} /> : null}
              {metasMarcasHoraQuery.data && metasMarcasHoraQuery.data.length === 0 ? (
                <p className="text-sm text-ink-muted">Nenhuma marca ativa encontrada.</p>
              ) : null}
              {metasMarcasHoraQuery.data && metasMarcasHoraQuery.data.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line">
                        <th className="pb-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Marca</th>
                        <th className="pb-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Tipo</th>
                        <th className="pb-2 pl-4 text-left text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Meta GMV/hora</th>
                        <th className="pb-2 text-right text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {metasMarcasHoraQuery.data.map((row) => {
                        const id = String(row.marca_id)
                        const semMetaDoMes = asNumber(row.meta_gmv_hora, 0) <= 0
                        const legada = asNumber(row.meta_legada, 0)
                        return (
                          <tr key={id} className="align-middle">
                            <td className="py-3 font-medium text-ink">{asString(row.nome, '—')}</td>
                            <td className="py-3 text-ink-muted">{asString(row.tipo, '—')}</td>
                            <td className="py-3 pl-4">
                              <div className="flex flex-col gap-1">
                                <MoneyInput
                                  className="design-input h-9 w-36 px-3 text-sm"
                                  value={metasMarcasHoraInputs[id] ?? ''}
                                  onChange={(raw) => setMetasMarcasHoraInputs((current) => ({ ...current, [id]: raw }))}
                                />
                                {semMetaDoMes && legada > 0 ? (
                                  <span className="text-xs text-ink-muted">em uso: {formatMoney(legada)} (legado do cliente)</span>
                                ) : null}
                              </div>
                            </td>
                            <td className="py-3 text-right">
                              <Button
                                type="button"
                                variant="secondary"
                                isLoading={marcaHoraMutation.isPending && marcaHoraMutation.variables?.id === id}
                                onClick={() => marcaHoraMutation.mutate({ id, meta_gmv_hora: parseBRMoneyToDecimal(metasMarcasHoraInputs[id] ?? '0') })}
                              >
                                Salvar
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </CardBody>
          </Card>
        </div>
      ) : null}

      {settingsTab === 'usuarios' ? <SettingsUsuariosPanel /> : null}

      {settingsTab === 'unidade' ? (
        <Card>
          <CardHeader>
            <p className="text-sm font-bold text-ink">Dados da unidade</p>
          </CardHeader>
          <CardBody>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
              {([
                ['nome', 'Nome da unidade'],
                ['cnpj', 'CNPJ'],
                ['email_contato', 'E-mail'],
                ['telefone_contato', 'Telefone'],
                ['cidade', 'Cidade'],
                ['uf', 'UF'],
              ] as const).map(([key, label]) => (
                <label key={key} className="block">
                  <span className="text-sm font-semibold text-ink">{label}</span>
                  <input
                    className="design-input mt-2 h-11 w-full px-4"
                    type={key === 'email_contato' ? 'email' : key === 'telefone_contato' ? 'tel' : 'text'}
                    required={key === 'nome'}
                    maxLength={key === 'uf' ? 2 : key === 'cnpj' ? 32 : key === 'cidade' ? 80 : undefined}
                    value={form[key]}
                    onChange={(event) => setField(key, event.target.value)}
                  />
                </label>
              ))}
              {unitValidationError ? <p className="md:col-span-2 text-sm text-[var(--danger)]">{unitValidationError}</p> : null}
              {mutation.isError ? <p className="md:col-span-2 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{extractErrorMessage(mutation.error)}</p> : null}
              {mutation.isSuccess ? <p className="md:col-span-2 rounded-2xl bg-[var(--success-soft)] px-4 py-3 text-sm font-medium text-[var(--success)]">Dados da unidade salvos.</p> : null}
              <div className="md:col-span-2">
                <Button type="submit" icon={Save} isLoading={mutation.isPending} disabled={mutation.isPending || Object.keys(unitSettingsPatch(form, unitBaseline)).length === 0 || !unitSettingsValid(form)}>
                  Salvar dados da unidade
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : null}

      {settingsTab === 'unidade' ? (
        <Card>
          <CardHeader>
            <p className="text-sm font-bold text-ink">Ranking público</p>
            <p className="mt-1 text-xs text-ink-muted">Configura como a unidade aparece no ranking público sem sobrescrever os dados internos da franquia.</p>
          </CardHeader>
          <CardBody>
            {rankingQuery.isLoading ? <LoadingState label="Carregando ranking público" /> : null}
            {rankingQuery.isError && !rankingQuery.data ? <ErrorState message={extractErrorMessage(rankingQuery.error)} onRetry={() => void rankingQuery.refetch()} /> : null}
            {rankingQuery.isError && rankingQuery.data ? <ErrorState message={`${extractErrorMessage(rankingQuery.error)}. Mostrando os últimos dados carregados.`} onRetry={() => void rankingQuery.refetch()} /> : null}
            {!rankingQuery.isLoading && rankingQuery.data ? (
              <form className="grid gap-4 md:grid-cols-2" onSubmit={onRankingSubmit}>
                <label className="flex items-center gap-3 rounded-2xl border border-line bg-surface-muted p-4 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={rankingForm.ativo}
                    onChange={(event) => setRankingField('ativo', event.target.checked)}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-ink">Mostrar unidade no ranking público</span>
                    <span className="block text-xs text-ink-muted">Quando desligado, a unidade sai da listagem pública sem afetar relatórios internos.</span>
                  </span>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Nome público</span>
                  <input className="design-input mt-2 h-11 w-full px-4" placeholder={asString(rankingQuery.data?.nome_publico, 'Usar nome da unidade')} value={rankingForm.nome_publico} onChange={(event) => setRankingField('nome_publico', event.target.value)} />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Logo pública</span>
                  <input className="design-input mt-2 h-11 w-full px-4" aria-label="URL da logo pública" placeholder="Usar logo da unidade" value={rankingForm.logo_url} onChange={(event) => setRankingField('logo_url', event.target.value)} />
                  <label className="mt-2 flex min-h-10 cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
                    <span className="rounded-md border border-line px-3 py-2">Enviar imagem</span>
                    <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={logoUploadMutation.isPending} onChange={(event) => { uploadRankingLogo(event.target.files?.[0]); event.currentTarget.value = '' }} />
                    <span className="text-xs font-normal text-ink-muted">JPEG, PNG, WebP ou GIF, até 5 MB</span>
                  </label>
                  {effectiveRankingLogo ? <img src={effectiveRankingLogo} alt="Prévia da logo pública" className="mt-2 h-12 w-12 rounded-lg border border-line object-contain" /> : null}
                  {logoUploadError ? <span className="mt-1 block text-xs text-[var(--danger)]">{logoUploadError}</span> : null}
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Cidade</span>
                  <input className="design-input mt-2 h-11 w-full px-4" placeholder={asString(rankingQuery.data?.cidade, 'Usar cidade da unidade')} value={rankingForm.cidade} onChange={(event) => setRankingField('cidade', event.target.value)} />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-ink">UF</span>
                  <input className="design-input mt-2 h-11 w-full px-4" maxLength={2} placeholder={asString(rankingQuery.data?.uf, 'Herdar da unidade')} value={rankingForm.uf} onChange={(event) => setRankingField('uf', event.target.value.toUpperCase())} />
                </label>
                <label className="block md:col-span-2">
                  <span className="text-sm font-semibold text-ink">Meta pública opcional</span>
                  <MoneyInput className="design-input mt-2 h-11 w-full px-4" value={rankingForm.meta_gmv} onChange={(raw) => setRankingField('meta_gmv', raw)} />
                </label>
                {rankingMutation.isError ? <p className="md:col-span-2 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{extractErrorMessage(rankingMutation.error)}</p> : null}
                {rankingMutation.isSuccess ? <p className="md:col-span-2 rounded-2xl bg-[var(--success-soft)] px-4 py-3 text-sm font-medium text-[var(--success)]">Identidade do ranking atualizada.</p> : null}
                <div className="md:col-span-2 rounded-2xl border border-line bg-surface-muted p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">Link do ranking desta unidade</p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      readOnly
                      value={publicRankingUrl}
                      onFocus={(event) => event.currentTarget.select()}
                      className="design-input h-10 w-full px-3 text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        icon={Copy}
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(publicRankingUrl)
                            toast.push('Link copiado para a área de transferência', 'success')
                          } catch {
                            toast.push('Não foi possível copiar o link', 'error')
                          }
                        }}
                      >
                        Copiar
                      </Button>
                      <a
                        href={publicRankingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--primary)] px-4 text-sm font-bold text-white transition hover:opacity-90"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Abrir
                      </a>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-ink-muted">O acesso continua protegido pela autenticação atual do aplicativo.</p>
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" icon={Trophy} isLoading={rankingMutation.isPending} disabled={rankingMutation.isPending || Object.keys(rankingSettingsPatch(rankingForm, rankingBaseline)).length === 0}>
                    Salvar identidade do ranking
                  </Button>
                </div>
              </form>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {settingsTab === 'unidade' ? (
        <Card>
          <CardHeader>
            <p className="text-sm font-bold text-ink">Tema da interface</p>
            <p className="mt-1 text-xs text-ink-muted">Preferência salva somente neste navegador.</p>
          </CardHeader>
          <CardBody className="flex flex-wrap gap-2">
            <Button type="button" variant={theme === 'light' ? 'primary' : 'secondary'} icon={Sun} onClick={() => setTheme('light')}>Claro</Button>
            <Button type="button" variant={theme === 'dark' ? 'primary' : 'secondary'} icon={Moon} onClick={() => setTheme('dark')}>Escuro</Button>
            <Button type="button" variant={theme === 'system' ? 'primary' : 'secondary'} icon={Sun} onClick={() => setTheme('system')}>Sistema</Button>
          </CardBody>
        </Card>
      ) : null}

      {settingsTab === 'integracoes' ? (
        <IntegracoesSettingsPanel tenantId={currentUser?.tenant_id ?? ''} settings={query.data ?? {}} />
      ) : null}

      {settingsTab === 'seguranca' ? (
        <Card>
          <CardHeader>
            <p className="text-sm font-bold text-ink">Segurança</p>
          </CardHeader>
          <CardBody>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => {
              event.preventDefault()
              senhaMutation.mutate(senha)
            }}>
              <label className="grid gap-2 text-sm font-semibold text-ink">Senha atual<input className="design-input h-11 w-full px-4" type="password" autoComplete="current-password" value={senha.senha_atual} onChange={(event) => setSenha((current) => ({ ...current, senha_atual: event.target.value }))} required /></label>
              <label className="grid gap-2 text-sm font-semibold text-ink">Nova senha<input className="design-input h-11 w-full px-4" type="password" autoComplete="new-password" value={senha.nova_senha} onChange={(event) => setSenha((current) => ({ ...current, nova_senha: event.target.value }))} minLength={8} required /></label>
              {senhaMutation.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)] md:col-span-2">{extractErrorMessage(senhaMutation.error)}</p> : null}
              {senhaMutation.isSuccess ? <p className="rounded-2xl bg-[var(--success-soft)] px-4 py-3 text-sm font-medium text-[var(--success)] md:col-span-2">Senha alterada.</p> : null}
              <div className="md:col-span-2">
                <Button type="submit" icon={KeyRound} isLoading={senhaMutation.isPending}>Trocar senha</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : null}
    </div>
  )
}
