import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { extractErrorMessage } from '../../services/api'
import { agingFilterError, consultarAging, type AgingBucket, type AgingFiltro } from '../../services/financeiro-aging'
import { formatConsultaMoney } from '../../services/financeiro-consulta'
import { ErrorState } from '../ui/States'

function Summary({ title, value }: { title: string; value: AgingBucket }) {
  return <div className="rounded-2xl border border-line bg-surface p-4">
    <h3 className="text-sm text-ink-muted">{title}</h3>
    <p className="num mt-1 text-xl font-semibold text-ink">{formatConsultaMoney(value.saldo_aberto)}</p>
    <p className="mt-1 text-sm text-ink-muted">{value.quantidade} {value.quantidade === 1 ? 'título' : 'títulos'}</p>
  </div>
}

export function AgingPanel() {
  const [params, setParams] = useSearchParams()
  const filtro: AgingFiltro = {
    data_referencia: params.get('aging_data_referencia') ?? '',
    competencia_inicio: params.get('aging_competencia_inicio') ?? '',
    competencia_fim: params.get('aging_competencia_fim') ?? '',
    faixas: params.get('aging_faixas') ?? '',
  }
  const complete = Object.values(filtro).every(Boolean)
  const error = complete ? agingFilterError(filtro) : null
  const query = useQuery({
    queryKey: ['fin2', 'aging', filtro],
    queryFn: () => consultarAging(filtro),
    enabled: complete && !error,
  })

  function change(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  return <section className="space-y-4" aria-label="Aging financeiro">
    <div>
      <h2 className="text-xl font-semibold text-ink">Aging de títulos em aberto</h2>
      <p className="text-sm text-ink-muted">Escolha a data de referência, as competências e os limites das faixas de atraso.</p>
    </div>
    <div className="flex flex-wrap gap-3 rounded-2xl border border-line bg-surface p-4">
      <label className="text-sm text-ink-muted">Data de referência<br /><input type="date" value={filtro.data_referencia} onChange={(event) => change('aging_data_referencia', event.target.value)} className="design-input mt-1" /></label>
      <label className="text-sm text-ink-muted">Competência inicial<br /><input type="month" value={filtro.competencia_inicio} onChange={(event) => change('aging_competencia_inicio', event.target.value)} className="design-input mt-1" /></label>
      <label className="text-sm text-ink-muted">Competência final<br /><input type="month" value={filtro.competencia_fim} onChange={(event) => change('aging_competencia_fim', event.target.value)} className="design-input mt-1" /></label>
      <label className="text-sm text-ink-muted">Limites das faixas (dias)<br /><input type="text" inputMode="numeric" value={filtro.faixas} onChange={(event) => change('aging_faixas', event.target.value)} className="design-input mt-1" aria-describedby="aging-limits-help" /></label>
    </div>
    <p id="aging-limits-help" className="text-sm text-ink-muted">Separe limites crescentes por vírgula. Cada faixa inclui seu limite final; a última reúne os dias acima dele.</p>
    {!complete ? <p role="status" className="text-sm text-ink-muted">Preencha todos os filtros para consultar.</p>
      : error ? <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>
        : query.isError ? <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />
          : query.isPending ? <p role="status" className="text-sm text-ink-muted">Carregando aging…</p>
            : query.data ? <>
              <p className="text-sm text-ink-muted">Referência: {query.data.data_referencia} · Competências: {query.data.competencia_inicio} a {query.data.competencia_fim}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Summary title="Atrasado" value={query.data.atrasado} />
                <Summary title="Vence hoje" value={query.data.vence_hoje} />
                <Summary title="Vence no futuro" value={query.data.futuro} />
              </div>
              <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Faixas de atraso dos títulos em aberto</caption>
                  <thead className="border-b border-line text-ink-muted"><tr><th scope="col" className="px-4 py-3">Dias em atraso</th><th scope="col" className="px-4 py-3">Títulos</th><th scope="col" className="px-4 py-3">Saldo em aberto</th></tr></thead>
                  <tbody>{query.data.faixas.map((faixa) => <tr key={faixa.de_dias} className="border-b border-line last:border-0">
                    <th scope="row" className="px-4 py-3 font-medium text-ink">{faixa.ate_dias == null ? `Acima de ${faixa.de_dias - 1} dias` : `${faixa.de_dias} a ${faixa.ate_dias} dias`}</th>
                    <td className="num px-4 py-3 text-ink">{faixa.quantidade}</td>
                    <td className="num px-4 py-3 text-ink">{formatConsultaMoney(faixa.saldo_aberto)}</td>
                  </tr>)}</tbody>
                </table>
              </div>
            </> : null}
  </section>
}
