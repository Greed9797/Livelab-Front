import { BarChart2, CircleDollarSign, Copy, ExternalLink, KeyRound, Lock, Moon, Plug, Save, Sun, Trophy, Users } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ErrorState, LoadingState } from '../components/ui/States'
import { MoneyInput } from '../components/ui/MoneyInput'
import { getClienteMeta, getClientePerfil, getConfiguracoes, getMetaUnidade, getMetasApresentadoras, getMetaSupervisor, getRankingPublicoConfig, trocarSenha, updateConfiguracoes, updateRankingPublicoConfig, upsertMetaApresentadora, upsertMetaSupervisor } from '../services/domain'
import { useToast } from '../components/ui/Toast'
import { extractErrorMessage } from '../services/api'
import { asNumber, asString, currentPeriod, formatMoney, periodLabel } from '../utils/format'
import { formatBRLWithoutSymbol, parseBRMoneyToDecimal } from '../utils/money'
import { useThemeStore } from '../stores/theme-store'
import { SettingsUsuariosPanel } from './SettingsUsuariosPanel'
import { useCurrentUser } from '../stores/auth-store'
import { QK } from '../services/query-keys'
import type { JsonRecord } from '../types/models'

type SettingsTab = 'unidade' | 'usuarios' | 'metas' | 'comissoes-livelab' | 'ranking' | 'aparencia' | 'integracoes' | 'seguranca'
const settingsTabs: SettingsTab[] = ['unidade', 'usuarios', 'metas', 'comissoes-livelab', 'ranking', 'aparencia', 'integracoes', 'seguranca']

export function ConfiguracoesPage({ clienteMode = false }: { clienteMode?: boolean }) {
  const toast = useToast()
  const client = useQueryClient()
  const currentUser = useCurrentUser()
  const publicRankingUrl = currentUser?.tenant_id
    ? `${window.location.origin}/ranking?unidade=${currentUser.tenant_id}`
    : `${window.location.origin}/ranking`
  const [params, setParams] = useSearchParams()
  const query = useQuery({ queryKey: QK.configuracoes(clienteMode), queryFn: getConfiguracoes, enabled: !clienteMode })
  const rankingQuery = useQuery({ queryKey: QK.configuracoeRankingPublico, queryFn: getRankingPublicoConfig, enabled: !clienteMode })
  const period = currentPeriod()
  const perfilQuery = useQuery({ queryKey: QK.clientePerfil, queryFn: getClientePerfil, enabled: clienteMode })
  const metaQuery = useQuery({ queryKey: QK.clienteMeta(period), queryFn: () => getClienteMeta(period), enabled: clienteMode })
  const [form, setForm] = useState<JsonRecord>({})
  const [rankingForm, setRankingForm] = useState({
    ativo: true,
    nome_publico: '',
    logo_url: '',
    cidade: '',
    uf: '',
    meta_gmv: '',
  })
  const [senha, setSenha] = useState({ senha_atual: '', nova_senha: '' })
  const requestedTabRaw = params.get('tab')
  const requestedTab = (requestedTabRaw === 'apresentadoras' ? 'usuarios' : requestedTabRaw) as SettingsTab | null
  const [settingsTab, setSettingsTab] = useState<SettingsTab>(requestedTab && settingsTabs.includes(requestedTab) ? requestedTab : 'unidade')
  const theme = useThemeStore((state) => state.theme)
  const setTheme = useThemeStore((state) => state.setTheme)
  const mutation = useMutation({
    mutationFn: updateConfiguracoes,
    onSuccess: () => client.invalidateQueries({ queryKey: QK.configuracoes() }),
  })
  const rankingMutation = useMutation({
    mutationFn: updateRankingPublicoConfig,
    onSuccess: () => client.invalidateQueries({ queryKey: QK.configuracoeRankingPublico }),
  })
  const [metaAnoMes] = useState(new Date().toISOString().slice(0, 7))
  const metaUnidadeQuery = useQuery({
    queryKey: QK.metaUnidade(metaAnoMes),
    queryFn: () => getMetaUnidade(metaAnoMes),
    enabled: !clienteMode,
  })

  // ── Metas apresentadoras + supervisor ──────────────────────────────────────
  const [metasMes, setMetasMes] = useState(new Date().toISOString().slice(0, 7))
  const metasApresentadorasQuery = useQuery({
    queryKey: QK.metasApresentadoras(metasMes),
    queryFn: () => getMetasApresentadoras(metasMes),
    enabled: !clienteMode && settingsTab === 'metas',
  })
  const metasSupervisorQuery = useQuery({
    queryKey: QK.metasSupervisor(metasMes),
    queryFn: () => getMetaSupervisor(metasMes),
    enabled: !clienteMode && settingsTab === 'metas',
  })
  const [metasSupervisorInput, setMetasSupervisorInput] = useState('')
  const [metasApresentadorasInputs, setMetasApresentadorasInputs] = useState<Record<string, string>>({})

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
    if (query.data) setForm(query.data)
  }, [query.data])

  useEffect(() => {
    if (!rankingQuery.data) return
    setRankingForm({
      ativo: rankingQuery.data.ativo !== false,
      nome_publico: asString(rankingQuery.data.nome_publico, ''),
      logo_url: asString(rankingQuery.data.logo_url, ''),
      cidade: asString(rankingQuery.data.cidade, ''),
      uf: asString(rankingQuery.data.uf, ''),
      meta_gmv: rankingQuery.data.meta_gmv == null ? '' : formatBRLWithoutSymbol(rankingQuery.data.meta_gmv),
    })
  }, [rankingQuery.data])

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

  // metaUnidadeQuery kept for possible future use (meta_unidade tab)
  void metaUnidadeQuery

  if (clienteMode) {
    if (perfilQuery.isLoading || metaQuery.isLoading) return <LoadingState />
    if (perfilQuery.isError) return <ErrorState message={extractErrorMessage(perfilQuery.error)} onRetry={() => void perfilQuery.refetch()} />
    if (metaQuery.isError) return <ErrorState message={extractErrorMessage(metaQuery.error)} onRetry={() => void metaQuery.refetch()} />

    const perfil = perfilQuery.data ?? {}

    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Cliente" accent="Configurações" title="da conta" subtitle="Dados do perfil e preferências do cliente parceiro." />

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
          </div>
        </section>

        <Card>
          <CardHeader>
            <p className="text-base font-bold text-ink">Segurança</p>
            <p className="mt-1 text-xs text-ink-muted">Altere a sua senha de acesso. Mínimo 8 caracteres, com letra e número.</p>
          </CardHeader>
          <CardBody>
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault()
                senhaMutation.mutate(senha)
              }}
            >
              <input
                className="design-input h-11 w-full px-4"
                type="password"
                autoComplete="current-password"
                placeholder="Senha atual"
                value={senha.senha_atual}
                onChange={(event) => setSenha((current) => ({ ...current, senha_atual: event.target.value }))}
                required
              />
              <input
                className="design-input h-11 w-full px-4"
                type="password"
                autoComplete="new-password"
                placeholder="Nova senha"
                value={senha.nova_senha}
                onChange={(event) => setSenha((current) => ({ ...current, nova_senha: event.target.value }))}
                minLength={8}
                required
              />
              {senhaMutation.isError ? (
                <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)] md:col-span-2">{extractErrorMessage(senhaMutation.error)}</p>
              ) : null}
              {senhaMutation.isSuccess ? (
                <p className="rounded-2xl bg-[var(--success-soft)] px-4 py-3 text-sm font-medium text-[var(--success)] md:col-span-2">Senha alterada. Outras sessões foram desconectadas.</p>
              ) : null}
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
  if (query.isError) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />

  function setField(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    mutation.mutate(form)
  }

  function onRankingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    rankingMutation.mutate({
      ativo: rankingForm.ativo,
      nome_publico: rankingForm.nome_publico || null,
      logo_url: rankingForm.logo_url || null,
      cidade: rankingForm.cidade || null,
      uf: rankingForm.uf || null,
      meta_gmv: rankingForm.meta_gmv ? parseBRMoneyToDecimal(rankingForm.meta_gmv) : null,
    })
  }

  function switchSettingsTab(next: SettingsTab | 'apresentadoras') {
    const resolved = next === 'apresentadoras' ? 'usuarios' : next
    setSettingsTab(resolved)
    const nextParams = new URLSearchParams(params)
    if (resolved === 'unidade') nextParams.delete('tab')
    else nextParams.set('tab', resolved)
    setParams(nextParams, { replace: true })
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Administração" accent="Configurações" title="da unidade" subtitle="Campos principais da franquia e integrações expostos pelo backend." />

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-1">
        {[
          ['unidade', Save, 'Unidade'],
          ['usuarios', Users, 'Usuários e equipe'],
          ['metas', BarChart2, 'Metas'],
          ['comissoes-livelab', CircleDollarSign, 'Comissões Livelab'],
          ['ranking', Trophy, 'Ranking público'],
          ['aparencia', Sun, 'Aparência'],
          ['integracoes', Plug, 'Integrações'],
          ['seguranca', Lock, 'Segurança'],
        ].map(([key, Icon, label]) => (
          <button
            key={String(key)}
            className={settingsTab === key ? 'inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white' : 'inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-ink-muted hover:bg-surface-muted'}
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
        </div>
      ) : null}

      {settingsTab === 'aparencia' ? (
        <Card>
        <CardHeader>
          <p className="text-sm font-bold text-ink">Aparência</p>
        </CardHeader>
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">Tema da interface</p>
            <p className="mt-1 text-xs text-ink-muted">A preferência fica salva neste navegador.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant={theme === 'light' ? 'primary' : 'secondary'} icon={Sun} onClick={() => setTheme('light')}>
              Claro
            </Button>
            <Button type="button" variant={theme === 'dark' ? 'primary' : 'secondary'} icon={Moon} onClick={() => setTheme('dark')}>
              Escuro
            </Button>
            <Button type="button" variant={theme === 'system' ? 'primary' : 'secondary'} icon={Sun} onClick={() => setTheme('system')}>
              Sistema
            </Button>
          </div>
        </CardBody>
        </Card>
      ) : null}

      {settingsTab === 'usuarios' ? <SettingsUsuariosPanel /> : null}

      {settingsTab === 'comissoes-livelab' ? (
        <Card>
          <CardHeader>
            <p className="text-base font-bold text-ink">Comissões Livelab</p>
            <p className="mt-1 text-xs text-ink-muted">% de comissão da franquia/franqueadora é configurado por marca em Comercial.</p>
          </CardHeader>
          <CardBody className="space-y-3">
            <p className="text-sm text-ink">
              Cada marca tem <strong>% de comissão da franquia</strong>, <strong>% da franqueadora</strong> e <strong>valor fixo mínimo</strong>.
              A comissão da apresentadora segue a escada por GMV mensal (definida em <em>Apresentadoras</em>) e não muda por marca.
            </p>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-full bg-brand px-5 text-sm font-bold text-white hover:bg-brand-hover"
              to="/comercial?tab=ativos"
            >
              Editar marcas em Comercial
            </Link>
            <p className="text-xs text-ink-muted">Toda edição é registrada no audit log da marca.</p>
          </CardBody>
        </Card>
      ) : null}

      {settingsTab === 'ranking' ? (
        <Card>
          <CardHeader>
            <p className="text-sm font-bold text-ink">Ranking público</p>
            <p className="mt-1 text-xs text-ink-muted">Configura como a unidade aparece no ranking público sem sobrescrever os dados internos da franquia.</p>
          </CardHeader>
          <CardBody>
            {rankingQuery.isLoading ? <LoadingState label="Carregando ranking público" /> : null}
            {rankingQuery.isError ? <ErrorState message={extractErrorMessage(rankingQuery.error)} onRetry={() => void rankingQuery.refetch()} /> : null}
            {!rankingQuery.isLoading && !rankingQuery.isError ? (
              <form className="grid gap-4 md:grid-cols-2" onSubmit={onRankingSubmit}>
                <label className="flex items-center gap-3 rounded-2xl border border-line bg-surface-muted p-4 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={rankingForm.ativo}
                    onChange={(event) => setRankingForm((current) => ({ ...current, ativo: event.target.checked }))}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-ink">Mostrar unidade no ranking público</span>
                    <span className="block text-xs text-ink-muted">Quando desligado, a unidade sai da listagem pública sem afetar relatórios internos.</span>
                  </span>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Nome público</span>
                  <input className="design-input mt-2 h-11 w-full px-4" value={rankingForm.nome_publico} onChange={(event) => setRankingForm((current) => ({ ...current, nome_publico: event.target.value }))} />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Logo pública</span>
                  <input className="design-input mt-2 h-11 w-full px-4" value={rankingForm.logo_url} onChange={(event) => setRankingForm((current) => ({ ...current, logo_url: event.target.value }))} />
                  <span className="mt-1 text-[11px] text-ink-muted">Deixe vazio para usar o favicon do site automaticamente.</span>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Cidade</span>
                  <input className="design-input mt-2 h-11 w-full px-4" value={rankingForm.cidade} onChange={(event) => setRankingForm((current) => ({ ...current, cidade: event.target.value }))} />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-ink">UF</span>
                  <input className="design-input mt-2 h-11 w-full px-4" maxLength={2} value={rankingForm.uf} onChange={(event) => setRankingForm((current) => ({ ...current, uf: event.target.value.toUpperCase() }))} />
                </label>
                <label className="block md:col-span-2">
                  <span className="text-sm font-semibold text-ink">Meta pública opcional</span>
                  <MoneyInput className="design-input mt-2 h-11 w-full px-4" value={rankingForm.meta_gmv} onChange={(raw) => setRankingForm((current) => ({ ...current, meta_gmv: raw }))} />
                </label>
                {rankingMutation.isError ? <p className="md:col-span-2 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{extractErrorMessage(rankingMutation.error)}</p> : null}
                {rankingMutation.isSuccess ? <p className="md:col-span-2 rounded-2xl bg-[var(--success-soft)] px-4 py-3 text-sm font-medium text-[var(--success)]">Ranking público atualizado.</p> : null}
                <div className="md:col-span-2 rounded-2xl border border-line bg-surface-muted p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">Link público desta unidade</p>
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
                  <p className="mt-2 text-[11px] text-ink-muted">Compartilhe este link com a equipe ou exiba em TV. Sem login.</p>
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" icon={Trophy} isLoading={rankingMutation.isPending}>
                    Salvar ranking público
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
          <p className="text-sm font-bold text-ink">Dados da unidade</p>
        </CardHeader>
        <CardBody>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
            {['nome_franquia', 'cnpj', 'email', 'telefone', 'cidade', 'estado'].map((key) => (
              <label key={key} className="block">
                <span className="text-sm font-semibold capitalize text-ink">{key.replace(/_/g, ' ')}</span>
                <input
                  className="design-input mt-2 h-11 w-full px-4"
                  value={asString(form[key], '')}
                  onChange={(event) => setField(key, event.target.value)}
                />
              </label>
            ))}
            {mutation.isError ? <p className="md:col-span-2 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{extractErrorMessage(mutation.error)}</p> : null}
            {mutation.isSuccess ? <p className="md:col-span-2 rounded-2xl bg-[var(--success-soft)] px-4 py-3 text-sm font-medium text-[var(--success)]">Configurações salvas.</p> : null}
            <div className="md:col-span-2">
              <Button type="submit" icon={Save} isLoading={mutation.isPending}>
                Salvar
              </Button>
            </div>
          </form>
        </CardBody>
        </Card>
      ) : null}

      {settingsTab === 'integracoes' ? (
        <Card>
          <CardHeader>
            <p className="text-sm font-bold text-ink">Integrações</p>
          </CardHeader>
          <CardBody className="grid gap-3 md:grid-cols-2">
            {['TikTok', 'Appmax', 'E-mail transacional', 'Webhooks'].map((item) => (
              <div key={item} className="rounded-2xl border border-line bg-surface-muted p-4">
                <p className="text-sm font-bold text-ink">{item}</p>
                <p className="mt-1 text-xs text-ink-muted">Status gerenciado pelo backend da unidade.</p>
              </div>
            ))}
          </CardBody>
        </Card>
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
              <input className="design-input h-11 w-full px-4" type="password" autoComplete="current-password" placeholder="Senha atual" value={senha.senha_atual} onChange={(event) => setSenha((current) => ({ ...current, senha_atual: event.target.value }))} required />
              <input className="design-input h-11 w-full px-4" type="password" autoComplete="new-password" placeholder="Nova senha" value={senha.nova_senha} onChange={(event) => setSenha((current) => ({ ...current, nova_senha: event.target.value }))} required />
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
