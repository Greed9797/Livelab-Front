import { BarChart3, CalendarRange, ListChecks, Percent, Plus, Repeat, Table2, Users, Wallet, Waves } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { ErrorState } from '../components/ui/States'
import { useToast } from '../components/ui/Toast'
import { MonthSwitcher, Segmented } from '../components/financeiro/primitives'
import { ResumoCards } from '../components/financeiro/ResumoCards'
import { FILTRO_VAZIO, type FiltroLocal, LancamentosList } from '../components/financeiro/LancamentosList'
import { BaixaModal, DesfazerModal, ExcluirModal } from '../components/financeiro/LancamentoModals'
import { type CustoModalState, CustoFormModal } from '../components/financeiro/CustoFormModal'
import { RecorrentesPanel } from '../components/financeiro/RecorrentesPanel'
import { DrePanel } from '../components/financeiro/DrePanel'
import { FluxoCaixaPanel } from '../components/financeiro/FluxoCaixaPanel'
import { CaixaHoje } from '../components/financeiro/CaixaHoje'
import { CaixaConfigModal } from '../components/financeiro/CaixaConfigModal'
import { type ReceitaModalState, ReceitaAvulsaModal } from '../components/financeiro/ReceitaAvulsaModal'
import { ImpostoConfigModal } from '../components/financeiro/ImpostoConfigModal'
import { ComissoesTab, PorClienteTab } from '../components/financeiro/LegacyTabs'
import { PresenterSettlement } from '../components/financeiro/PresenterSettlement'
import '../components/financeiro/financeiro.css'
import { useBaixaMutation, useCaixa, useCustoMutations, useFinanceiroConfig, useLancamentos, useReceitaAvulsaMutations } from '../hooks/useFinanceiro'
import { extractErrorMessage } from '../services/api'
import { useCurrentUser } from '../stores/auth-store'
import type { Lancamento } from '../types/financeiro'
import { canWrite } from '../utils/access'
import { hojeSP, isMes, isReceitaAvulsa, mesAtualSP, mesLabel, totalizar } from '../utils/financeiro'
import { formatPercent } from '../utils/format'
import type { PeriodRange } from '../utils/period'

type FinanceiroTab = 'lancamentos' | 'dre' | 'fluxo' | 'recorrentes' | 'cliente' | 'comissoes'
const TABS: FinanceiroTab[] = ['lancamentos', 'dre', 'fluxo', 'recorrentes', 'cliente', 'comissoes']

function isTab(v: string | null): v is FinanceiroTab {
  return Boolean(v && (TABS as string[]).includes(v))
}

export function FinanceiroPage() {
  const user = useCurrentUser()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const isCliente = user?.papel === 'cliente_parceiro'
  const podeEscrever = canWrite(user)
  const podeReprocessar = user?.papel === 'franqueado' || user?.papel === 'franqueador_master'
  const podeConfigurarComissoes = user?.papel === 'franqueado'
  const navigate = useNavigate()

  const paramMes = params.get('mes')
  const mes = isMes(paramMes) ? paramMes : mesAtualSP()
  const paramTab = params.get('tab')
  const tab: FinanceiroTab = isTab(paramTab) ? paramTab : 'lancamentos'

  const [filtro, setFiltro] = useState<FiltroLocal>(FILTRO_VAZIO)
  const [baixa, setBaixa] = useState<Lancamento | null>(null)
  const [desfazer, setDesfazer] = useState<Lancamento | null>(null)
  const [excluir, setExcluir] = useState<Lancamento | null>(null)
  const [custoModal, setCustoModal] = useState<CustoModalState | null>(null)
  const [impostoOpen, setImpostoOpen] = useState(false)
  const [caixaOpen, setCaixaOpen] = useState(false)
  const [receitaModal, setReceitaModal] = useState<ReceitaModalState | null>(null)

  const lancamentos = useLancamentos({ inicio: mes, fim: mes }, !isCliente)
  const config = useFinanceiroConfig(!isCliente)
  const baixaMut = useBaixaMutation()
  const custos = useCustoMutations()
  const receitas = useReceitaAvulsaMutations()
  const caixa = useCaixa(!isCliente)

  function updateParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v == null) next.delete(k)
      else next.set(k, v)
    }
    setParams(next, { replace: true })
  }

  if (isCliente) return <Navigate to="/cliente/financeiro" replace />

  const data = lancamentos.data
  const itens = data?.itens ?? []
  const totais = data?.totais ?? totalizar([])
  const hoje = data?.hoje ?? hojeSP()
  const atrasadosCount = itens.filter((l) => l.status === 'atrasado').length
  const periodo: PeriodRange = { mode: 'single', inicio: mes, fim: mes }
  const aliquota = config.data?.aliquota_imposto_pct

  function toastOk(msg: string, variant: 'success' | 'error' = 'success') {
    toast.push(msg, variant)
  }

  function confirmarBaixa(payload: { valor_pago: number; data_pagamento: string }) {
    if (!baixa) return
    const entrada = baixa.natureza === 'receita'
    baixaMut.mutate(
      { lancamento: baixa, acao: 'pagar', payload },
      {
        onSuccess: () => {
          setBaixa(null)
          toastOk(payload.valor_pago < baixa.valor_previsto ? 'Pagamento parcial registrado.' : entrada ? 'Marcado como recebido.' : 'Marcado como pago.')
        },
      },
    )
  }

  function confirmarDesfazer() {
    if (!desfazer) return
    baixaMut.mutate(
      { lancamento: desfazer, acao: 'desfazer' },
      {
        onSuccess: () => {
          setDesfazer(null)
          toastOk('Baixa desfeita.')
        },
      },
    )
  }

  const tabs = [
    { value: 'lancamentos' as const, label: 'Lançamentos', icon: <ListChecks className="h-4 w-4" /> },
    { value: 'dre' as const, label: 'DRE', icon: <Table2 className="h-4 w-4" /> },
    { value: 'fluxo' as const, label: 'Fluxo de caixa', icon: <Waves className="h-4 w-4" /> },
    { value: 'recorrentes' as const, label: 'Recorrentes', icon: <Repeat className="h-4 w-4" /> },
    { value: 'cliente' as const, label: 'Por cliente', icon: <Users className="h-4 w-4" /> },
    { value: 'comissoes' as const, label: 'Comissões', icon: <BarChart3 className="h-4 w-4" /> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        subtitle={`${mesLabel(mes).replace(/^./, (c) => c.toUpperCase())} · o que entra, o que sai e o que está vencendo.`}
        actions={
          <>
            <MonthSwitcher value={mes} onChange={(v) => updateParams({ mes: v === mesAtualSP() ? null : v })} />
            <Button variant="secondary" icon={Percent} onClick={() => setImpostoOpen(true)} title="Alíquota de imposto">
              Imposto {aliquota != null ? formatPercent(aliquota) : ''}
            </Button>
            <Button variant="secondary" icon={Wallet} onClick={() => setCaixaOpen(true)} title="Saldo de abertura e data de corte">
              Caixa
            </Button>
            {podeEscrever ? (
              <>
                <Button variant="secondary" icon={Plus} onClick={() => setReceitaModal({ kind: 'nova' })}>
                  Nova receita
                </Button>
                <Button icon={Plus} onClick={() => setCustoModal({ kind: 'novo', modo: 'pontual' })}>
                  Novo custo
                </Button>
              </>
            ) : null}
          </>
        }
      />

      <Segmented<FinanceiroTab>
        label="Seções do financeiro"
        value={tab}
        onChange={(v) => updateParams({ tab: v === 'lancamentos' ? null : v })}
        options={tabs}
      />

      {tab === 'lancamentos' ? (
        lancamentos.isError && !data ? (
          <ErrorState message={extractErrorMessage(lancamentos.error)} onRetry={() => void lancamentos.refetch()} />
        ) : lancamentos.isLoading && !data ? (
          <LancamentosSkeleton />
        ) : (
          <div className="space-y-5">
            <CaixaHoje
              caixa={caixa.data}
              isLoading={caixa.isLoading}
              isError={caixa.isError}
              podeEscrever={podeEscrever}
              onConfigurar={() => setCaixaOpen(true)}
              onRetry={() => void caixa.refetch()}
            />
            <ResumoCards
              totais={totais}
              atrasadosCount={atrasadosCount}
              atrasadosAtivo={filtro.status === 'atrasado'}
              onFiltrarAtrasados={() => setFiltro((f) => ({ ...f, status: f.status === 'atrasado' ? '' : 'atrasado' }))}
            />
            <LancamentosList
              itens={itens}
              hoje={hoje}
              filtro={filtro}
              onFiltro={setFiltro}
              podeEscrever={podeEscrever}
              isFetching={lancamentos.isFetching}
              onBaixar={(l) => {
                baixaMut.reset()
                setBaixa(l)
              }}
              onDesfazer={(l) => {
                baixaMut.reset()
                setDesfazer(l)
              }}
              dataCorte={caixa.data?.data_corte ?? config.data?.data_corte ?? null}
              onEditar={(l) => (isReceitaAvulsa(l) ? setReceitaModal({ kind: 'editar', lancamento: l }) : setCustoModal({ kind: 'editar-lancamento', lancamento: l }))}
              onExcluir={(l) => {
                custos.excluir.reset()
                receitas.excluir.reset()
                setExcluir(l)
              }}
            />
          </div>
        )
      ) : null}

      {tab === 'dre' ? <DrePanel key={mes.slice(0, 4)} mes={mes} /> : null}

      {tab === 'fluxo' ? <FluxoCaixaPanel mes={mes} itensMes={itens} /> : null}

      {tab === 'recorrentes' ? (
        <RecorrentesPanel
          mes={mes}
          podeEscrever={podeEscrever}
          onNovo={() => setCustoModal({ kind: 'novo', modo: 'recorrente' })}
          onEditar={(r) => setCustoModal({ kind: 'editar-recorrente', recorrente: r })}
          onToast={toastOk}
        />
      ) : null}

      {tab === 'cliente' ? <PorClienteTab periodo={periodo} /> : null}

      {tab === 'comissoes' ? (
        <div className="space-y-4">
          <section className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-line bg-surface px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-xl font-bold tracking-[-0.02em] text-ink">Comissões do período</h2>
              <p className="mt-1 max-w-2xl text-sm text-ink-muted">Apuração por apresentadora e marca no período selecionado.</p>
            </div>
            {podeConfigurarComissoes ? (
              <Button type="button" variant="secondary" icon={Percent} onClick={() => navigate({ pathname: '/financeiro/comissoes/regras', search: params.toString() })}>
                Regras de comissão
              </Button>
            ) : null}
          </section>
          <PresenterSettlement mes={mes} />
          <section className="space-y-3">
            <p className="text-base font-bold text-ink">Receita calculada por marca</p>
            <ComissoesTab periodo={periodo} podeReprocessar={podeReprocessar} />
          </section>
        </div>
      ) : null}

      <BaixaModal
        lancamento={baixa}
        onClose={() => setBaixa(null)}
        onConfirm={confirmarBaixa}
        isPending={baixaMut.isPending}
        error={baixaMut.error ? extractErrorMessage(baixaMut.error) : null}
      />
      <DesfazerModal
        lancamento={desfazer}
        onClose={() => setDesfazer(null)}
        onConfirm={confirmarDesfazer}
        isPending={baixaMut.isPending}
        error={baixaMut.error ? extractErrorMessage(baixaMut.error) : null}
      />
      <ExcluirModal
        key={excluir?.id ?? 'none'}
        lancamento={excluir}
        onClose={() => setExcluir(null)}
        isPending={excluir && isReceitaAvulsa(excluir) ? receitas.excluir.isPending : custos.excluir.isPending}
        error={
          excluir && isReceitaAvulsa(excluir)
            ? receitas.excluir.error ? extractErrorMessage(receitas.excluir.error) : null
            : custos.excluir.error ? extractErrorMessage(custos.excluir.error) : null
        }
        onConfirm={(escopo) => {
          if (!excluir) return
          if (isReceitaAvulsa(excluir)) {
            receitas.excluir.mutate(excluir.id, {
              onSuccess: () => {
                setExcluir(null)
                toastOk('Receita excluída.')
              },
            })
            return
          }
          custos.excluir.mutate(
            { id: excluir.id, escopo },
            {
              onSuccess: () => {
                setExcluir(null)
                toastOk('Custo excluído.')
              },
            },
          )
        }}
      />
      <CustoFormModal state={custoModal} mes={mes} onClose={() => setCustoModal(null)} onSaved={(msg) => toastOk(msg)} />
      <ReceitaAvulsaModal state={receitaModal} mes={mes} onClose={() => setReceitaModal(null)} onSaved={(msg) => toastOk(msg)} />
      <CaixaConfigModal
        open={caixaOpen}
        atual={config.data}
        podeEscrever={podeEscrever}
        onClose={() => setCaixaOpen(false)}
        onSaved={(msg) => toastOk(msg)}
      />
      <ImpostoConfigModal
        open={impostoOpen}
        atual={aliquota ?? 10}
        podeEscrever={podeEscrever}
        onClose={() => setImpostoOpen(false)}
        onSaved={(msg) => toastOk(msg)}
      />
    </div>
  )
}

function LancamentosSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Carregando lançamentos">
      <div className="grid gap-4 lg:grid-cols-[1.05fr_2fr]">
        <div className="h-52 animate-pulse rounded-[18px] bg-surface-muted" />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-muted" />
          ))}
        </div>
      </div>
      <div className="design-card space-y-3 p-5">
        <CalendarRange className="h-5 w-5 text-ink-muted" aria-hidden />
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-muted" />
        ))}
      </div>
    </div>
  )
}
