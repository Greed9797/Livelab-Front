import { CircleDollarSign, Receipt, TrendingDown, TrendingUp, Users } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { EmptyState } from '../ui/States'
import { MetricCard } from '../ui/MetricCard'
import { Badge } from '../ui/Badge'
import { asArray, asString, formatMoney, formatPercent } from '../../utils/format'
import type { JsonRecord } from '../../types/models'
import { buildOperationalDre, type OperationalDreCostGroup, type OperationalDrePresenter } from './operational-dre'

function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}

function choiceCriterion(value: string): string {
  if (value === 'parcelas_por_competencia') return 'Critérios por competência'
  if (value.endsWith('venceu_fixo')) return 'Critério vencedor: fixo'
  if (value.endsWith('venceu_comissao')) return 'Critério vencedor: comissão'
  return value === 'mes_com_atividade' ? 'Critério: mês com atividade' : 'Critério: fixo + comissão'
}

function PresenterDetail({ presenter }: { presenter: OperationalDrePresenter }) {
  return (
    <div className="rounded-xl border border-line bg-surface-muted p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-ink">{presenter.nome}</p>
        <span className="num text-sm font-bold text-ink">{formatMoney(presenter.total, true)}</span>
      </div>
      <dl className="mt-3 grid gap-2 text-xs text-ink-muted sm:grid-cols-3">
        <div><dt>Fixo</dt><dd className="num font-semibold text-ink">{formatMoney(presenter.fixo, true)}</dd></div>
        <div><dt>Comissão</dt><dd className="num font-semibold text-ink">{formatMoney(presenter.comissao, true)}</dd></div>
        <div><dt>Adicionais</dt><dd className="num font-semibold text-ink">{formatMoney(presenter.adicionais, true)}</dd></div>
      </dl>
    </div>
  )
}

function CostGroupDetail({ group }: { group: OperationalDreCostGroup }) {
  return (
    <div className="rounded-xl border border-line bg-surface-muted p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold capitalize text-ink">{group.tipo}</p>
        <span className="num text-sm font-bold text-ink">{formatMoney(group.total, true)}</span>
      </div>
      <ul className="mt-3 space-y-2 text-sm text-ink-muted">
        {group.itens.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 border-t border-line pt-2 first:border-t-0 first:pt-0">
            <span>{item.descricao}</span>
            <span className="num shrink-0 font-semibold text-ink">{formatMoney(item.valor, true)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function livesSemApuracaoCount(value: unknown): number {
  const count = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN
  if (!Number.isInteger(count) || count <= 0) return 0
  return count
}

function livesSemApuracaoText(count: number): string {
  if (count === 1) return '1 live encerrada ainda sem apuração'
  return `${count} lives encerradas ainda sem apuração`
}

export function OperationalDre({ data }: { data: JsonRecord }) {
  const semApuracao = livesSemApuracaoCount(data.lives_sem_apuracao)
  const semApuracaoNotice = semApuracao > 0 ? (
    <p className="rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-4 py-3 text-sm text-ink" role="status">
      {livesSemApuracaoText(semApuracao)}
    </p>
  ) : null
  const dre = buildOperationalDre(data)
  if (!dre) {
    return (
      <div className="space-y-4">
        {semApuracaoNotice}
        <Card>
          <CardBody>
            <EmptyState
              title="Detalhamento operacional indisponível"
              description="A resposta não trouxe todos os lançamentos ou totais do período. Nenhum valor foi assumido como zero."
            />
          </CardBody>
        </Card>
      </div>
    )
  }

  const pendencias = asArray<unknown>(data.pendencias)
  const isEmptyPeriod = dre.receita.marcas.length === 0
    && dre.apresentadoras.pessoas.length === 0
    && dre.custos.grupos.length === 0
  return (
    <section className="space-y-4" aria-label="DRE operacional">
      {semApuracaoNotice}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard metric={{ label: 'Receita total', value: formatMoney(dre.receita.total, true), hint: `${countLabel(dre.receita.marcas.length, 'marca')}`, tone: 'success' }} icon={TrendingUp} />
        <MetricCard metric={{ label: 'Despesas totais', value: formatMoney(dre.totalDespesas, true), hint: `${countLabel(dre.apresentadoras.pessoas.length, 'apresentadora')} + ${countLabel(dre.custos.grupos.reduce((total, group) => total + group.itens.length, 0), 'lançamento')}`, tone: 'warning' }} icon={TrendingDown} />
        <MetricCard metric={{ label: 'Resultado operacional', value: formatMoney(dre.resultado, true), hint: 'receita de marcas − todas as despesas', tone: dre.resultado >= 0 ? 'success' : 'danger' }} icon={CircleDollarSign} />
        <MetricCard metric={{ label: 'Margem operacional', value: dre.margemPct === null ? '—' : formatPercent(dre.margemPct), hint: 'resultado ÷ receita total', tone: dre.resultado >= 0 ? 'success' : 'danger' }} icon={Receipt} />
      </div>

      <Card>
        <CardHeader>
          <p className="text-base font-bold text-ink">DRE operacional</p>
          <p className="mt-1 text-xs text-ink-muted">Valores reconciliados com as entradas, saídas e totais reportados pelo período.</p>
        </CardHeader>
        {isEmptyPeriod ? (
          <div className="border-b border-line px-5 py-4 md:px-6" role="status">
            <p className="font-semibold text-ink">DRE vazio no período</p>
            <p className="mt-1 text-sm text-ink-muted">Nenhuma receita, remuneração ou custo foi lançado no período. Os subtotais zerados foram reportados pelo servidor.</p>
          </div>
        ) : null}
        <div>
          <details className="border-b border-line">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 hover:bg-surface-muted md:px-6">
              <div className="flex min-w-0 items-center gap-2"><Badge tone="success">Receita</Badge><span className="font-semibold text-ink">Receita de marcas</span></div>
              <span className="num shrink-0 text-sm font-bold text-ink">{formatMoney(dre.receita.total, true)} · {countLabel(dre.receita.marcas.length, 'marca')}</span>
            </summary>
            <div className="space-y-3 bg-surface-muted px-5 py-4 md:px-6">
              {dre.receita.marcas.map((brand) => (
                <div key={brand.id} className="rounded-xl border border-line bg-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-ink">{brand.nome}</p>
                    <span className="num text-sm font-bold text-ink">{formatMoney(brand.receitaReconhecida, true)}</span>
                  </div>
                  <dl className="mt-3 grid gap-2 text-xs text-ink-muted sm:grid-cols-3">
                    <div><dt>Fixo calculado</dt><dd className="num font-semibold text-ink">{formatMoney(brand.fixoCalculado, true)}</dd></div>
                    <div><dt>Comissão calculada</dt><dd className="num font-semibold text-ink">{formatMoney(brand.comissaoCalculada, true)}</dd></div>
                    <div><dt>Receita reconhecida</dt><dd className="num font-semibold text-ink">{formatMoney(brand.receitaReconhecida, true)}</dd></div>
                  </dl>
                  {brand.tipoCobranca === 'fixo_ou_comissao' ? (
                    <p className="mt-3 text-xs text-ink-muted">
                      {brand.criterio.endsWith('venceu_fixo')
                        ? `Comissão comparada: ${formatMoney(brand.comissaoCalculada, true)}`
                        : `Fixo comparado: ${formatMoney(brand.fixoCalculado, true)}`}
                    </p>
                  ) : null}
                  {brand.parcelas.length > 1 ? (
                    <details className="mt-3 rounded-lg border border-line bg-surface-muted/60 px-3 py-2">
                      <summary className="cursor-pointer text-xs font-semibold text-ink">Ver parcelas por competência</summary>
                      <div className="mt-2 space-y-2 text-xs text-ink-muted">
                        {brand.parcelas.map((parcel) => (
                          <div key={parcel.competencia} className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2 first:border-t-0 first:pt-0">
                            <span>{parcel.competencia.slice(0, 7)} · {choiceCriterion(parcel.criterio)}</span>
                            <span className="num font-semibold text-ink">{formatMoney(parcel.receitaReconhecida, true)}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  ) : null}
                  <p className="mt-3 text-xs text-ink-muted">{choiceCriterion(brand.criterio)}{brand.gmv > 0 ? ` · GMV ${formatMoney(brand.gmv, true)} · ${brand.lives} lives` : ''}</p>
                </div>
              ))}
            </div>
          </details>

          <details className="border-b border-line">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 hover:bg-surface-muted md:px-6">
              <div className="flex min-w-0 items-center gap-2"><Badge tone="warning">Despesa</Badge><span className="font-semibold text-ink">Remuneração de apresentadoras</span></div>
              <span className="num shrink-0 text-sm font-bold text-ink">{formatMoney(dre.apresentadoras.total, true)} · {countLabel(dre.apresentadoras.pessoas.length, 'apresentadora')}</span>
            </summary>
            <div className="space-y-3 bg-surface-muted px-5 py-4 md:px-6">
              {dre.apresentadoras.pessoas.map((presenter) => <PresenterDetail key={presenter.id} presenter={presenter} />)}
            </div>
          </details>

          <details className="border-b border-line">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 hover:bg-surface-muted md:px-6">
              <div className="flex min-w-0 items-center gap-2"><Badge tone="neutral">Despesa</Badge><span className="font-semibold text-ink">Custos operacionais</span></div>
              <span className="num shrink-0 text-sm font-bold text-ink">{formatMoney(dre.custos.total, true)} · {countLabel(dre.custos.grupos.reduce((total, group) => total + group.itens.length, 0), 'lançamento')}</span>
            </summary>
            <div className="space-y-3 bg-surface-muted px-5 py-4 md:px-6">
              {dre.custos.grupos.map((group) => <CostGroupDetail key={group.tipo} group={group} />)}
            </div>
          </details>

          <section className="flex flex-wrap items-center justify-between gap-3 bg-surface-muted px-5 py-5 md:px-6" aria-labelledby="dre-result-title">
            <div className="flex items-center gap-2"><Users aria-hidden="true" className="h-5 w-5 text-ink-muted" /><h3 id="dre-result-title" className="font-bold text-ink">Resultado operacional</h3></div>
            <span className={`num text-lg font-bold ${dre.resultado >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>{formatMoney(dre.resultado, true)}</span>
          </section>
        </div>
      </Card>

      {pendencias.length > 0 ? (
        <div className="rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-4 py-3 text-sm text-ink" role="status">
          <p className="font-semibold">Pendências do período</p>
          <p className="mt-1 text-ink-muted">{pendencias.map((item) => asString(item) === 'equipe_sem_remuneracao_no_schema' ? 'equipe sem remuneração no schema' : asString(item).replaceAll('_', ' ')).join(' · ')}</p>
        </div>
      ) : null}
    </section>
  )
}
