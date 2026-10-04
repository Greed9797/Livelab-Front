import { BarChart3, CalendarRange, ChevronDown, ListChecks, Percent, Plus, Receipt, Repeat, Scale, Settings2, Table2, TrendingUp, Wallet, Waves } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { ErrorState } from '../components/ui/States'
import { useToast } from '../components/ui/Toast'
import { MonthSwitcher, Segmented } from '../components/financeiro/primitives'
import { PainelMes } from '../components/financeiro/PainelMes'
import { FILTRO_VAZIO, type FiltroLocal, LancamentosList } from '../components/financeiro/LancamentosList'
import { BaixaModal, DesfazerModal, ExcluirModal } from '../components/financeiro/LancamentoModals'
import { type CustoModalState, CustoFormModal } from '../components/financeiro/CustoFormModal'
import { ReceitaPanel } from '../components/financeiro/ReceitaPanel'
import { CustosFixosPanel } from '../components/financeiro/CustosFixosPanel'
import { CustosVariaveisPanel } from '../components/financeiro/CustosVariaveisPanel'
import { ConciliacaoAsaasPanel } from '../components/financeiro/ConciliacaoAsaasPanel'
import { DrePanel } from '../components/financeiro/DrePanel'
import { FluxoCaixaPanel } from '../components/financeiro/FluxoCaixaPanel'
import { CaixaConfigModal } from '../components/financeiro/CaixaConfigModal'
import { type ReceitaModalState, ReceitaAvulsaModal } from '../components/financeiro/ReceitaAvulsaModal'
import { ImpostoConfigModal } from '../components/financeiro/ImpostoConfigModal'
import { ComissoesTab } from '../components/financeiro/LegacyTabs'
import { PresenterSettlement } from '../components/financeiro/PresenterSettlement'
import '../components/financeiro/financeiro.css'
import { useBaixaMutation, useCustoMutations, useFinanceiroConfig, useLancamentos, usePainel, useReceitaAvulsaMutations } from '../hooks/useFinanceiro'
import { extractErrorMessage } from '../services/api'
import { useCurrentUser } from '../stores/auth-store'
import type { Lancamento, Natureza } from '../types/financeiro'
import { canWrite } from '../utils/access'
import { filtrarPorVencimentoNoMes, hojeSP, isMes, isReceitaAvulsa, janelaLancamentos, mesAtualSP, mesLabel, type VisaoLista } from '../utils/financeiro'
import { formatPercent } from '../utils/format'
import type { PeriodRange } from '../utils/period'

type FinanceiroTab = 'lancamentos' | 'receita' | 'custos-fixos' | 'custos-variaveis' | 'dre' | 'fluxo' | 'conciliacao' | 'comissoes'
const TABS: FinanceiroTab[] = ['lancamentos', 'receita', 'custos-fixos', 'custos-variaveis', 'dre', 'fluxo', 'conciliacao', 'comissoes']
// Links antigos: "Por cliente" virou Receita e "Recorrentes" vive dentro de Custos fixos.
const TAB_ALIASES: Record<string, FinanceiroTab> = { cliente: 'receita', recorrentes: 'custos-fixos' }
function parseTab(v: string | null): FinanceiroTab | null {
  if (!v) return null
  if ((TABS as string[]).includes(v)) return v as FinanceiroTab
  return TAB_ALIASES[v] ?? null
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
  const tab: FinanceiroTab = parseTab(paramTab) ?? 'lancamentos'

  const [filtro, setFiltro] = useState<FiltroLocal>(FILTRO_VAZIO)
  const [baixa, setBaixa] = useState<Lancamento | null>(null)
  const [desfazer, setDesfazer] = useState<Lancamento | null>(null)
  const [excluir, setExcluir] = useState<Lancamento | null>(null)
  const [custoModal, setCustoModal] = useState<CustoModalState | null>(null)
  const [impostoOpen, setImpostoOpen] = useState(false)
  const [caixaOpen, setCaixaOpen] = useState(false)
  const [receitaModal, setReceitaModal] = useState<ReceitaModalState | null>(null)
  const [visao, setVisao] = useState<VisaoLista>('vencimento')
  const [incluirAnteriores, setIncluirAnteriores] = useState(false)

  // Cada aba só busca o que usa: lançamentos na lista e no fluxo (fallback); painel só na lista.
  const usaLancamentos = tab === 'lancamentos' || tab === 'fluxo'
  const janela = janelaLancamentos(mes, visao, visao === 'vencimento' && incluirAnteriores)
  const lancamentos = useLancamentos(janela, !isCliente && usaLancamentos)
  const painel = usePainel(mes, !isCliente && tab === 'lancamentos')
  const config = useFinanceiroConfig(!isCliente)
  const baixaMut = useBaixaMutation()
  const custos = useCustoMutations()
  const receitas = useReceitaAvulsaMutations()

  const data = lancamentos.data
  // Por vencimento: a janela traz competências vizinhas; fica só o que vence no mês (+ atrasados antigos, se pedido).
  const itens = useMemo(() => {
    const todos = data?.itens ?? []
    return visao === 'vencimento' ? filtrarPorVencimentoNoMes(todos, mes, incluirAnteriores) : todos
  }, [data, visao, mes, incluirAnteriores])
  const hoje = data?.hoje ?? hojeSP()

  // Normaliza o alias antigo na URL preservando mes/inicio/fim e demais params.
  useEffect(() => {
    if (paramTab && TAB_ALIASES[paramTab]) {
      const next = new URLSearchParams(params)
      next.set('tab', TAB_ALIASES[paramTab])
      setParams(next, { replace: true })
    }
  }, [paramTab, params, setParams])

  function updateParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v == null) next.delete(k)
      else next.set(k, v)
    }
    setParams(next, { replace: true })
  }

  if (isCliente) return <Navigate to="/cliente/financeiro" replace />

  const periodo: PeriodRange = { mode: 'single', inicio: mes, fim: mes }
  const aliquota = config.data?.aliquota_imposto_pct

  function verAtrasados(natureza: Natureza) {
    setVisao('vencimento')
    setIncluirAnteriores(true)
    setFiltro({ ...FILTRO_VAZIO, natureza, status: 'atrasado' })
  }

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
    { value: 'receita' as const, label: 'Receita', icon: <TrendingUp className="h-4 w-4" /> },
    { value: 'custos-fixos' as const, label: 'Custos fixos', icon: <Repeat className="h-4 w-4" /> },
    { value: 'custos-variaveis' as const, label: 'Custos variáveis', icon: <Receipt className="h-4 w-4" /> },
    { value: 'dre' as const, label: 'DRE', icon: <Table2 className="h-4 w-4" /> },
    { value: 'fluxo' as const, label: 'Fluxo de caixa', icon: <Waves className="h-4 w-4" /> },
    { value: 'conciliacao' as const, label: 'Conciliação', icon: <Scale className="h-4 w-4" /> },
    { value: 'comissoes' as const, label: 'Comissões', icon: <BarChart3 className="h-4 w-4" /> },
  ]

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        title="Financeiro"
        subtitle={`${mesLabel(mes).replace(/^./, (c) => c.toUpperCase())} · o que entra, o que sai e o que está vencendo.`}
        actions={
          <>
            <MonthSwitcher value={mes} onChange={(v) => updateParams({ mes: v === mesAtualSP() ? null : v })} />
            {podeEscrever ? (
              <Button variant="secondary" icon={Plus} className="min-h-11 sm:min-h-0" onClick={() => setReceitaModal({ kind: 'nova' })}>
                Nova receita
              </Button>
            ) : null}
            {podeEscrever ? (
              <Button icon={Plus} className="min-h-11 sm:min-h-0" onClick={() => setCustoModal({ kind: 'novo', modo: 'pontual' })}>
                Novo custo
              </Button>
            ) : null}
            <ConfigurarMenu
              impostoLabel={`Imposto${aliquota != null ? ` (${formatPercent(aliquota)})` : ''}`}
              onImposto={() => setImpostoOpen(true)}
              onCaixa={() => setCaixaOpen(true)}
            />
          </>
        }
      />

      <div className="min-w-0 max-w-full">
        <Segmented<FinanceiroTab>
          label="Seções do financeiro"
          value={tab}
          onChange={(v) => updateParams({ tab: v === 'lancamentos' ? null : v })}
          options={tabs}
        />
      </div>

      {tab === 'lancamentos' ? (
        <div className="space-y-5">
          <PainelMes
            painel={painel.data}
            isLoading={painel.isLoading}
            isError={painel.isError}
            podeEscrever={podeEscrever}
            onConfigurar={() => setCaixaOpen(true)}
            onRetry={() => void painel.refetch()}
            onVerAtrasados={verAtrasados}
          />
          {lancamentos.isError && !data ? (
            <ErrorState message={extractErrorMessage(lancamentos.error)} onRetry={() => void lancamentos.refetch()} />
          ) : lancamentos.isLoading && !data ? (
            <LancamentosSkeleton />
          ) : (
            <LancamentosList
              itens={itens}
              hoje={hoje}
              mes={mes}
              visao={visao}
              onVisao={setVisao}
              incluirAnteriores={incluirAnteriores}
              onIncluirAnteriores={setIncluirAnteriores}
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
              dataCorte={painel.data?.data_corte ?? config.data?.data_corte ?? null}
              onEditar={(l) => (isReceitaAvulsa(l) ? setReceitaModal({ kind: 'editar', lancamento: l }) : setCustoModal({ kind: 'editar-lancamento', lancamento: l }))}
              onExcluir={(l) => {
                custos.excluir.reset()
                receitas.excluir.reset()
                setExcluir(l)
              }}
            />
          )}
        </div>
      ) : null}

      {tab === 'dre' ? <DrePanel key={mes.slice(0, 4)} mes={mes} /> : null}

      {tab === 'fluxo' ? <FluxoCaixaPanel mes={mes} itensMes={itens} onConfigurarCaixa={() => setCaixaOpen(true)} /> : null}

      {tab === 'receita' ? <ReceitaPanel mes={mes} podeEscrever={podeEscrever} /> : null}

      {tab === 'custos-fixos' ? <CustosFixosPanel mes={mes} podeEscrever={podeEscrever} /> : null}

      {tab === 'custos-variaveis' ? <CustosVariaveisPanel mes={mes} podeEscrever={podeEscrever} /> : null}

      {tab === 'conciliacao' ? <ConciliacaoAsaasPanel mes={mes} /> : null}

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
            <div>
              <p className="text-base font-bold text-ink">Receita calculada por marca</p>
              <p className="mt-0.5 text-xs text-ink-muted">
                GMV por mês civil; marcas com janela de apuração aparecem na aba Receita pela competência da janela.
              </p>
            </div>
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

/** Menu do header: configurações que valem para todas as abas (imposto e caixa). */
function ConfigurarMenu({ impostoLabel, onImposto, onCaixa }: { impostoLabel: string; onImposto: () => void; onCaixa: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    function close(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])
  const item = 'flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-surface-muted sm:min-h-0'
  return (
    <div className="relative" ref={ref}>
      <Button variant="secondary" icon={Settings2} className="min-h-11 sm:min-h-0" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        Configurar <ChevronDown className="h-4 w-4" aria-hidden />
      </Button>
      {open ? (
        <div role="menu" className="absolute right-0 top-full z-20 mt-1 w-60 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-[var(--shadow-card-lg)]">
          <button role="menuitem" type="button" className={item} onClick={() => { setOpen(false); onImposto() }}>
            <Percent className="h-4 w-4 text-ink-muted" /> {impostoLabel}
          </button>
          <button role="menuitem" type="button" className={item} onClick={() => { setOpen(false); onCaixa() }}>
            <Wallet className="h-4 w-4 text-ink-muted" /> Caixa (abertura e corte)
          </button>
        </div>
      ) : null}
    </div>
  )
}

function LancamentosSkeleton() {
  return (
    <div className="design-card space-y-3 p-5" aria-busy="true" aria-label="Carregando lançamentos">
      <CalendarRange className="h-5 w-5 text-ink-muted" aria-hidden />
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-muted" />
      ))}
    </div>
  )
}
