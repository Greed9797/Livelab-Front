import { useMemo, useState } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { MoneyInput } from '../components/ui/MoneyInput'
import { ErrorState, LoadingState } from '../components/ui/States'
import {
  createComissaoFaixaDefault,
  deleteComissaoFaixaDefault,
  getApresentadoraFaixasComissao,
  getApresentadoras,
  getComissaoFaixasDefault,
  getMarcas,
  recalcularComissoesMes,
  updateComissaoFaixaDefault,
} from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asArray, asNumber, asString, formatMoney } from '../utils/format'
import { FALLBACK_ESCADA } from '../utils/faixaComissao'
import { formatBRLWithoutSymbol, parseBRMoneyToDecimal } from '../utils/money'
import { QK } from '../services/query-keys'
import type { JsonRecord } from '../types/models'

type Tab = 'marca' | 'apresentadora'

type VinculoStatus = 'ok' | 'sem_pct' | 'sem_video' | 'sem_vinculo'

// Assinatura do conjunto de faixas — "Padrão" quando as faixas ativas da
// apresentadora batem exatamente com a escada padrão do tenant.
function tiersKey(rows: JsonRecord[]): string {
  return rows
    .map((r) => `${asNumber(r.gmv_inicio)}|${r.gmv_fim == null ? '' : asNumber(r.gmv_fim)}|${asNumber(r.comissao_pct)}`)
    .sort()
    .join(';')
}

interface FaixaDraft {
  gmv_inicio: string
  gmv_fim: string
  comissao_pct: string
}

const EMPTY_DRAFT: FaixaDraft = { gmv_inicio: '', gmv_fim: '', comissao_pct: '' }

function payloadFromDraft(draft: FaixaDraft): JsonRecord {
  return {
    gmv_inicio: parseBRMoneyToDecimal(draft.gmv_inicio),
    gmv_fim: draft.gmv_fim.trim() ? parseBRMoneyToDecimal(draft.gmv_fim) : null,
    comissao_pct: Number(draft.comissao_pct) || 0,
  }
}

function vinculoTone(status: VinculoStatus): 'success' | 'warning' | 'danger' {
  if (status === 'ok') return 'success'
  if (status === 'sem_vinculo') return 'danger'
  return 'warning'
}

function vinculoLabel(status: VinculoStatus): string {
  if (status === 'ok') return 'Vínculo OK'
  if (status === 'sem_vinculo') return 'Sem vínculo'
  if (status === 'sem_video') return 'Sem % vídeo'
  return 'Sem % live'
}

function classifyVinculo(vinculo?: JsonRecord): VinculoStatus {
  if (!vinculo) return 'sem_vinculo'
  const live = asNumber(vinculo.comissao_live_pct)
  const video = asNumber(vinculo.comissao_video_pct)
  if (live <= 0 && video <= 0) return 'sem_vinculo'
  if (live <= 0) return 'sem_pct'
  if (video <= 0) return 'sem_video'
  return 'ok'
}

const thClass = 'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted'

function EscadaPadraoSection() {
  const client = useQueryClient()
  const defaultQuery = useQuery({ queryKey: QK.comissaoFaixasDefault, queryFn: getComissaoFaixasDefault })
  const [drafts, setDrafts] = useState<Record<string, FaixaDraft>>({})
  const [novaFaixa, setNovaFaixa] = useState<FaixaDraft>(EMPTY_DRAFT)

  // A propagação acontece no backend: apresentadoras que estavam no padrão
  // ganham a escada nova — por isso também invalidamos as faixas delas.
  const invalidate = () => {
    void client.invalidateQueries({ queryKey: QK.comissaoFaixasDefault })
    void client.invalidateQueries({ queryKey: QK.apresentadoraFaixasComissao() })
  }

  const createMut = useMutation({
    mutationFn: (payload: JsonRecord) => createComissaoFaixaDefault(payload),
    onSuccess: () => {
      setNovaFaixa(EMPTY_DRAFT)
      invalidate()
    },
  })
  const updateMut = useMutation({
    mutationFn: ({ faixaId, payload }: { faixaId: string; payload: JsonRecord }) =>
      updateComissaoFaixaDefault(faixaId, payload),
    onSuccess: (_data, { faixaId }) => {
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[faixaId]
        return next
      })
      invalidate()
    },
  })
  const deleteMut = useMutation({ mutationFn: deleteComissaoFaixaDefault, onSuccess: invalidate })

  const faixas = asArray<JsonRecord>(defaultQuery.data)
  const isFallback = defaultQuery.isSuccess && faixas.length === 0
  const rows = isFallback ? FALLBACK_ESCADA : faixas

  const draftFor = (fx: JsonRecord): FaixaDraft =>
    drafts[asString(fx.id, '')] ?? {
      gmv_inicio: formatBRLWithoutSymbol(fx.gmv_inicio),
      gmv_fim: fx.gmv_fim == null ? '' : formatBRLWithoutSymbol(fx.gmv_fim),
      comissao_pct: String(asNumber(fx.comissao_pct)),
    }

  const setDraft = (fx: JsonRecord, patch: Partial<FaixaDraft>) => {
    const id = asString(fx.id, '')
    const base = draftFor(fx)
    setDrafts((prev) => ({ ...prev, [id]: { ...base, ...patch } }))
  }

  const mutError = createMut.error ?? updateMut.error ?? deleteMut.error

  return (
    <Card>
      <CardHeader>
        <p className="text-base font-bold text-ink">Escada padrão de comissão</p>
        <p className="mt-1 text-xs text-ink-muted">
          Vale automaticamente para toda apresentadora sem escada personalizada. Ao alterar, as
          apresentadoras no padrão são atualizadas e as comissões pendentes do mês são recalculadas.
        </p>
      </CardHeader>
      <CardBody className="p-0">
        {defaultQuery.isLoading ? (
          <LoadingState label="Carregando escada padrão" />
        ) : defaultQuery.isError ? (
          <ErrorState message={extractErrorMessage(defaultQuery.error)} onRetry={() => void defaultQuery.refetch()} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className={`${thClass} text-left`}>De</th>
                  <th className={`${thClass} text-left`}>Até</th>
                  <th className={`${thClass} text-left`}>Comissão %</th>
                  <th className={`${thClass} text-right`}>Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((fx) => {
                  const id = asString(fx.id, '')
                  if (isFallback) {
                    return (
                      <tr key={`fallback-${asNumber(fx.gmv_inicio)}`}>
                        <td className="num px-4 py-3 text-ink">{formatMoney(fx.gmv_inicio)}</td>
                        <td className="num px-4 py-3 text-ink">{fx.gmv_fim == null ? 'Acima de' : formatMoney(fx.gmv_fim)}</td>
                        <td className="num px-4 py-3 text-ink">{asNumber(fx.comissao_pct).toLocaleString('pt-BR')}%</td>
                        <td className="px-4 py-3 text-right text-xs text-ink-muted">—</td>
                      </tr>
                    )
                  }
                  const draft = draftFor(fx)
                  return (
                    <tr key={id}>
                      <td className="px-4 py-3">
                        <MoneyInput
                          className="design-input h-10 w-36 px-3"
                          value={draft.gmv_inicio}
                          onChange={(raw) => setDraft(fx, { gmv_inicio: raw })}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <MoneyInput
                          className="design-input h-10 w-36 px-3"
                          value={draft.gmv_fim}
                          placeholder="Acima de"
                          onChange={(raw) => setDraft(fx, { gmv_fim: raw })}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          className="design-input h-10 w-24 px-3"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={draft.comissao_pct}
                          onChange={(e) => setDraft(fx, { comissao_pct: e.target.value })}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="secondary"
                            isLoading={updateMut.isPending && updateMut.variables?.faixaId === id}
                            onClick={() => updateMut.mutate({ faixaId: id, payload: payloadFromDraft(draft) })}
                          >
                            Salvar
                          </Button>
                          <Button
                            variant="danger"
                            isLoading={deleteMut.isPending && deleteMut.variables === id}
                            onClick={() => deleteMut.mutate(id)}
                          >
                            Remover
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                <tr>
                  <td className="px-4 py-3">
                    <MoneyInput
                      className="design-input h-10 w-36 px-3"
                      value={novaFaixa.gmv_inicio}
                      placeholder="0,00"
                      onChange={(raw) => setNovaFaixa({ ...novaFaixa, gmv_inicio: raw })}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <MoneyInput
                      className="design-input h-10 w-36 px-3"
                      value={novaFaixa.gmv_fim}
                      placeholder="Acima de"
                      onChange={(raw) => setNovaFaixa({ ...novaFaixa, gmv_fim: raw })}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      className="design-input h-10 w-24 px-3"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={novaFaixa.comissao_pct}
                      onChange={(e) => setNovaFaixa({ ...novaFaixa, comissao_pct: e.target.value })}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <Button isLoading={createMut.isPending} onClick={() => createMut.mutate(payloadFromDraft(novaFaixa))}>
                        Adicionar
                      </Button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {isFallback ? (
          <p className="px-4 pb-4 text-xs text-ink-muted">
            Exibindo a escada do sistema — adicione faixas acima para torná-la editável.
          </p>
        ) : null}
        {mutError ? (
          <p className="m-4 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
            {extractErrorMessage(mutError)}
          </p>
        ) : null}
      </CardBody>
    </Card>
  )
}

// Mês anterior no formato YYYY-MM — default natural do fechamento (em julho,
// fecha-se junho).
function mesAnterior(): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function FechamentoMesSection() {
  const client = useQueryClient()
  const [mes, setMes] = useState<string>(mesAnterior())
  const recalcMut = useMutation({
    mutationFn: recalcularComissoesMes,
    onSuccess: () => {
      // Comissões pendentes mudam em background — invalida as telas que as exibem.
      void client.invalidateQueries({ queryKey: QK.apresentadoraFaixasComissao() })
    },
  })

  return (
    <Card>
      <CardHeader>
        <p className="text-base font-bold text-ink">Fechamento do mês</p>
        <p className="mt-1 text-xs text-ink-muted">
          Recalcula as comissões <strong>pendentes</strong> do mês escolhido com a escada vigente —
          use antes de consolidar e pagar. Comissões já aprovadas não são alteradas.
        </p>
      </CardHeader>
      <CardBody>
        <div className="flex flex-wrap items-center gap-3">
          <input
            className="design-input h-10 px-3"
            type="month"
            max={new Date().toISOString().slice(0, 7)}
            value={mes}
            onChange={(e) => setMes(e.target.value)}
          />
          <Button isLoading={recalcMut.isPending} onClick={() => recalcMut.mutate(mes)}>
            Recalcular comissões do mês
          </Button>
          {recalcMut.isSuccess ? (
            <span className="text-sm text-ink-muted">
              Recálculo de {recalcMut.data.mes} iniciado para {recalcMut.data.apresentadoras} apresentadora(s) —
              os valores atualizam em instantes na tela de comissões.
            </span>
          ) : null}
        </div>
        {recalcMut.isError ? (
          <p className="mt-3 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
            {extractErrorMessage(recalcMut.error)}
          </p>
        ) : null}
      </CardBody>
    </Card>
  )
}

export function ComissoesConfigPage() {
  const [tab, setTab] = useState<Tab>('marca')

  const marcasQuery = useQuery({ queryKey: QK.marcas('com-apresentadoras'), queryFn: () => getMarcas({ include: 'apresentadoras' }) })
  const apresentadorasQuery = useQuery({ queryKey: QK.apresentadoras(), queryFn: getApresentadoras })
  const defaultQuery = useQuery({ queryKey: QK.comissaoFaixasDefault, queryFn: getComissaoFaixasDefault })

  const apresentadoras = useMemo(() => asArray<JsonRecord>(apresentadorasQuery.data), [apresentadorasQuery.data])

  const defaultKey = useMemo(() => {
    const rows = asArray<JsonRecord>(defaultQuery.data)
    return tiersKey(rows.length ? rows : FALLBACK_ESCADA)
  }, [defaultQuery.data])

  const faixasQueries = useQueries({
    queries: apresentadoras.map((ap) => ({
      queryKey: QK.apresentadoraFaixasComissao(asString(ap.id)),
      queryFn: () => getApresentadoraFaixasComissao(asString(ap.id)),
      enabled: tab === 'apresentadora' && Boolean(asString(ap.id)),
      staleTime: 60_000,
    })),
  })

  if (marcasQuery.isLoading || apresentadorasQuery.isLoading) return <LoadingState />
  if (marcasQuery.isError) return <ErrorState message={extractErrorMessage(marcasQuery.error)} onRetry={() => void marcasQuery.refetch()} />
  if (apresentadorasQuery.isError) return <ErrorState message={extractErrorMessage(apresentadorasQuery.error)} onRetry={() => void apresentadorasQuery.refetch()} />

  const marcas = asArray<JsonRecord>(marcasQuery.data)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comissões"
        accent="Configuração"
        title="de comissões da apresentadora"
        subtitle="Escada padrão do sistema, escadas por apresentadora e vínculos por marca."
      />

      <EscadaPadraoSection />

      <FechamentoMesSection />

      <div className="flex gap-2 border-b border-line">
        <button
          type="button"
          className={`px-4 py-2 text-sm font-semibold ${tab === 'marca' ? 'border-b-2 border-brand text-ink' : 'text-ink-muted'}`}
          onClick={() => setTab('marca')}
        >
          Por marca
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-semibold ${tab === 'apresentadora' ? 'border-b-2 border-brand text-ink' : 'text-ink-muted'}`}
          onClick={() => setTab('apresentadora')}
        >
          Por apresentadora
        </button>
      </div>

      {tab === 'marca' ? (
        <Card>
          <CardHeader>
            <p className="text-base font-bold text-ink">Vínculos apresentadora × marca</p>
            <p className="mt-1 text-xs text-ink-muted">% live e % vídeo definidos no cadastro de clientes e marcas em <Link className="text-brand underline" to="/comercial">Comercial</Link>.</p>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className={`${thClass} text-left`}>Marca</th>
                    <th className={`${thClass} text-left`}>Apresentadora</th>
                    <th className={`${thClass} text-right`}>% Live</th>
                    <th className={`${thClass} text-right`}>% Vídeo</th>
                    <th className={`${thClass} text-left`}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {marcas.flatMap((marca) => {
                    const vinculos = asArray<JsonRecord>(marca.apresentadoras ?? marca.apresentadora_marcas)
                    if (vinculos.length === 0) {
                      const status: VinculoStatus = 'sem_vinculo'
                      return [(
                        <tr key={`marca-${asString(marca.id)}-empty`}>
                          <td className="px-4 py-3 font-medium text-ink">{asString(marca.nome)}</td>
                          <td className="px-4 py-3 text-ink-muted italic">Nenhuma apresentadora vinculada</td>
                          <td className="num px-4 py-3 text-right text-ink-muted">—</td>
                          <td className="num px-4 py-3 text-right text-ink-muted">—</td>
                          <td className="px-4 py-3"><Badge tone={vinculoTone(status)}>{vinculoLabel(status)}</Badge></td>
                        </tr>
                      )]
                    }
                    return vinculos.map((v) => {
                      const status = classifyVinculo(v)
                      return (
                        <tr key={`marca-${asString(marca.id)}-${asString(v.apresentadora_id ?? v.id)}`}>
                          <td className="px-4 py-3 font-medium text-ink">{asString(marca.nome)}</td>
                          <td className="px-4 py-3 text-ink">{asString(v.apresentadora_nome ?? v.nome)}</td>
                          <td className="num px-4 py-3 text-right text-ink">{asNumber(v.comissao_live_pct).toFixed(2)}%</td>
                          <td className="num px-4 py-3 text-right text-ink">{asNumber(v.comissao_video_pct).toFixed(2)}%</td>
                          <td className="px-4 py-3"><Badge tone={vinculoTone(status)}>{vinculoLabel(status)}</Badge></td>
                        </tr>
                      )
                    })
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <p className="text-base font-bold text-ink">Escadas por apresentadora</p>
            <p className="mt-1 text-xs text-ink-muted">
              "Padrão" segue a escada padrão do sistema (e é atualizada junto com ela). "Personalizada" tem
              faixas próprias e não é tocada por mudanças no padrão.
            </p>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className={`${thClass} text-left`}>Apresentadora</th>
                    <th className={`${thClass} text-right`}>GMV início</th>
                    <th className={`${thClass} text-right`}>GMV fim</th>
                    <th className={`${thClass} text-right`}>% Comissão</th>
                    <th className={`${thClass} text-right`}>Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {apresentadoras.flatMap((ap, idx) => {
                    const apId = asString(ap.id)
                    const faixasQ = faixasQueries[idx]
                    const faixas = asArray<JsonRecord>(faixasQ?.data)
                    const ativas = faixas.filter((fx) => fx.ativo !== false)
                    // Sem faixas próprias = herda o padrão (a resolução no backend cai
                    // na escada do tenant) — nunca "comissão 0".
                    const isPadrao = ativas.length === 0 || tiersKey(ativas) === defaultKey
                    const headerRow = (
                      <tr key={`ap-${apId}`} className="bg-surface-muted">
                        <td colSpan={4} className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-ink">{asString(ap.nome ?? ap.email)}</span>
                            {faixasQ?.isLoading ? null : (
                              <Badge tone={isPadrao ? 'neutral' : 'info'}>{isPadrao ? 'Padrão' : 'Personalizada'}</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link className="text-xs font-semibold text-brand underline" to="/configuracoes?tab=usuarios">Editar</Link>
                        </td>
                      </tr>
                    )
                    if (faixasQ?.isLoading) {
                      return [headerRow, (
                        <tr key={`fx-${apId}-loading`}>
                          <td colSpan={5} className="px-4 py-3 text-ink-muted italic">carregando…</td>
                        </tr>
                      )]
                    }
                    if (faixas.length === 0) {
                      return [headerRow, (
                        <tr key={`fx-${apId}-none`}>
                          <td colSpan={5} className="px-4 py-3 text-ink-muted italic">Nenhuma faixa própria — segue a escada padrão do sistema.</td>
                        </tr>
                      )]
                    }
                    return [headerRow, ...faixas.map((fx) => (
                      <tr key={`fx-${apId}-${asString(fx.id)}`}>
                        <td className="px-4 py-3">
                          <Badge tone={fx.ativo === false ? 'warning' : 'success'}>{fx.ativo === false ? 'Inativa' : 'Ativa'}</Badge>
                        </td>
                        <td className="num px-4 py-3 text-right text-ink">{formatMoney(fx.gmv_inicio)}</td>
                        <td className="num px-4 py-3 text-right text-ink">{fx.gmv_fim == null ? 'Sem limite' : formatMoney(fx.gmv_fim)}</td>
                        <td className="num px-4 py-3 text-right text-ink">{asNumber(fx.comissao_pct).toFixed(2)}%</td>
                        <td className="px-4 py-3" />
                      </tr>
                    ))]
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody>
          <p className="text-xs text-ink-muted">
            <strong>Regras (ordem de aplicação):</strong> 1) sábado/domingo em live (timezone São Paulo) sempre paga <strong>2% fixo</strong>;
            2) nos demais dias vale a <strong>faixa da própria apresentadora</strong> pelo GMV mensal acumulado — a faixa atingida se aplica ao mês inteiro;
            3) apresentadoras sem escada personalizada seguem a <strong>escada padrão do sistema</strong>, configurada nesta página.
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
