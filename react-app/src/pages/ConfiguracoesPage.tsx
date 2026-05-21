import { AtSign, KeyRound, Lock, Moon, Plug, Save, Sun, Target, Trophy, Users } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ErrorState, LoadingState } from '../components/ui/States'
import { MoneyInput } from '../components/ui/MoneyInput'
import { getClienteMeta, getClientePerfil, getConfiguracoes, getRankingPublicoConfig, trocarSenha, updateClienteMeta, updateClienteTiktok, updateConfiguracoes, updateRankingPublicoConfig } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asString, currentPeriod, formatMoney, periodLabel } from '../utils/format'
import { formatBRLWithoutSymbol, parseBRMoneyToDecimal } from '../utils/money'
import { useThemeStore } from '../stores/theme-store'
import { SettingsUsuariosPanel } from './SettingsUsuariosPanel'
import type { JsonRecord } from '../types/models'

type SettingsTab = 'unidade' | 'usuarios' | 'ranking' | 'aparencia' | 'integracoes' | 'seguranca'
const settingsTabs: SettingsTab[] = ['unidade', 'usuarios', 'ranking', 'aparencia', 'integracoes', 'seguranca']

export function ConfiguracoesPage({ clienteMode = false }: { clienteMode?: boolean }) {
  const client = useQueryClient()
  const [params, setParams] = useSearchParams()
  const query = useQuery({ queryKey: ['configuracoes', clienteMode], queryFn: getConfiguracoes, enabled: !clienteMode })
  const rankingQuery = useQuery({ queryKey: ['configuracoes-ranking-publico'], queryFn: getRankingPublicoConfig, enabled: !clienteMode })
  const period = currentPeriod()
  const perfilQuery = useQuery({ queryKey: ['cliente-perfil'], queryFn: getClientePerfil, enabled: clienteMode })
  const metaQuery = useQuery({ queryKey: ['cliente-meta', period.ano, period.mes], queryFn: () => getClienteMeta(period), enabled: clienteMode })
  const [form, setForm] = useState<JsonRecord>({})
  const [rankingForm, setRankingForm] = useState({
    ativo: true,
    nome_publico: '',
    logo_url: '',
    cidade: '',
    uf: '',
    meta_gmv: '',
  })
  const [tiktok, setTiktok] = useState('')
  const [metaGmv, setMetaGmv] = useState('')
  const [senha, setSenha] = useState({ senha_atual: '', nova_senha: '' })
  const requestedTab = params.get('tab') as SettingsTab | null
  const [settingsTab, setSettingsTab] = useState<SettingsTab>(requestedTab && settingsTabs.includes(requestedTab) ? requestedTab : 'unidade')
  const theme = useThemeStore((state) => state.theme)
  const setTheme = useThemeStore((state) => state.setTheme)
  const mutation = useMutation({
    mutationFn: updateConfiguracoes,
    onSuccess: () => client.invalidateQueries({ queryKey: ['configuracoes'] }),
  })
  const rankingMutation = useMutation({
    mutationFn: updateRankingPublicoConfig,
    onSuccess: () => client.invalidateQueries({ queryKey: ['configuracoes-ranking-publico'] }),
  })
  const tiktokMutation = useMutation({
    mutationFn: updateClienteTiktok,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['cliente-perfil'] })
    },
  })
  const metaMutation = useMutation({
    mutationFn: updateClienteMeta,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['cliente-meta'] })
    },
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
    if (perfilQuery.data) setTiktok(asString(perfilQuery.data.tiktok_username, ''))
  }, [perfilQuery.data])

  useEffect(() => {
    if (metaQuery.data) setMetaGmv(formatBRLWithoutSymbol(metaQuery.data.meta_gmv))
  }, [metaQuery.data])

  if (clienteMode) {
    if (perfilQuery.isLoading || metaQuery.isLoading) return <LoadingState />
    if (perfilQuery.isError) return <ErrorState message={extractErrorMessage(perfilQuery.error)} onRetry={() => void perfilQuery.refetch()} />
    if (metaQuery.isError) return <ErrorState message={extractErrorMessage(metaQuery.error)} onRetry={() => void metaQuery.refetch()} />

    const perfil = perfilQuery.data ?? {}

    function onTiktokSubmit(event: FormEvent<HTMLFormElement>) {
      event.preventDefault()
      tiktokMutation.mutate(tiktok ? tiktok.replace(/^@/, '') : null)
    }

    function onMetaSubmit(event: FormEvent<HTMLFormElement>) {
      event.preventDefault()
      metaMutation.mutate({ ano: period.ano, mes: period.mes, meta_gmv: parseBRMoneyToDecimal(metaGmv) })
    }

    function onSenhaSubmit(event: FormEvent<HTMLFormElement>) {
      event.preventDefault()
      senhaMutation.mutate(senha)
    }

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
                <p className="mt-1 text-xs text-ink-muted">{periodLabel(period)}</p>
              </CardHeader>
              <CardBody>
                <form className="space-y-4" onSubmit={onMetaSubmit}>
                  <div className="rounded-2xl bg-brand-soft p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand">Meta atual</p>
                    <p className="num mt-2 text-2xl font-bold text-ink">{formatMoney(metaQuery.data?.meta_gmv)}</p>
                  </div>
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">Nova meta GMV</span>
                    <MoneyInput className="design-input mt-2 h-11 w-full px-4" value={metaGmv} onChange={(raw) => setMetaGmv(raw)} />
                  </label>
                  {metaMutation.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{extractErrorMessage(metaMutation.error)}</p> : null}
                  {metaMutation.isSuccess ? <p className="rounded-2xl bg-[var(--success-soft)] px-4 py-3 text-sm font-medium text-[var(--success)]">Meta atualizada.</p> : null}
                  <Button type="submit" icon={Target} isLoading={metaMutation.isPending}>
                    Salvar meta
                  </Button>
                </form>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <p className="text-base font-bold text-ink">TikTok</p>
              </CardHeader>
              <CardBody>
                <form className="space-y-4" onSubmit={onTiktokSubmit}>
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">@username</span>
                    <input className="design-input mt-2 h-11 w-full px-4" value={tiktok} onChange={(event) => setTiktok(event.target.value)} placeholder="@sua_marca" />
                  </label>
                  {tiktokMutation.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{extractErrorMessage(tiktokMutation.error)}</p> : null}
                  {tiktokMutation.isSuccess ? <p className="rounded-2xl bg-[var(--success-soft)] px-4 py-3 text-sm font-medium text-[var(--success)]">TikTok atualizado.</p> : null}
                  <Button type="submit" icon={AtSign} isLoading={tiktokMutation.isPending}>
                    Salvar TikTok
                  </Button>
                </form>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <p className="text-base font-bold text-ink">Senha</p>
              </CardHeader>
              <CardBody>
                <form className="space-y-4" onSubmit={onSenhaSubmit}>
                  <input className="design-input h-11 w-full px-4" type="password" autoComplete="current-password" placeholder="Senha atual" value={senha.senha_atual} onChange={(event) => setSenha((current) => ({ ...current, senha_atual: event.target.value }))} required />
                  <input className="design-input h-11 w-full px-4" type="password" autoComplete="new-password" placeholder="Nova senha" value={senha.nova_senha} onChange={(event) => setSenha((current) => ({ ...current, nova_senha: event.target.value }))} required />
                  {senhaMutation.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{extractErrorMessage(senhaMutation.error)}</p> : null}
                  {senhaMutation.isSuccess ? <p className="rounded-2xl bg-[var(--success-soft)] px-4 py-3 text-sm font-medium text-[var(--success)]">Senha alterada.</p> : null}
                  <Button type="submit" icon={KeyRound} isLoading={senhaMutation.isPending}>
                    Trocar senha
                  </Button>
                </form>
              </CardBody>
            </Card>
          </div>
        </section>
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

  function switchSettingsTab(next: SettingsTab) {
    setSettingsTab(next)
    const nextParams = new URLSearchParams(params)
    if (next === 'unidade') nextParams.delete('tab')
    else nextParams.set('tab', next)
    setParams(nextParams, { replace: true })
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Administração" accent="Configurações" title="da unidade" subtitle="Campos principais da franquia e integrações expostos pelo backend." />

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-1">
        {[
          ['unidade', Save, 'Unidade'],
          ['usuarios', Users, 'Usuários e equipe'],
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
