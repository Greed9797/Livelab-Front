import { BarChart3, CircleDollarSign, Clock3, ShoppingBag, Video } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody } from '../components/ui/Card'
import { ErrorState, LoadingState } from '../components/ui/States'
import { PortalRanking } from '../components/presenter-portal/PortalRanking'
import { getPresenterPortalHome } from '../services/presenter-portal'
import { QK } from '../services/query-keys'
import { useCurrentUser } from '../stores/auth-store'
import { extractErrorMessage } from '../services/api'
import { formatMoney } from '../utils/format'
import { currentMonth } from '../utils/presenter-portal'
import { useState } from 'react'

function Metric({ icon: Icon, label, value, hint }: { icon: typeof Video; label: string; value: string; hint: string }) {
  return <Card><CardBody className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.12em] text-ink-muted">{label}</p><p className="num mt-2 text-2xl font-black tracking-[-0.03em] text-ink">{value}</p></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-muted text-ink-muted"><Icon className="h-5 w-5" /></span></div><p className="mt-3 text-sm text-ink-muted">{hint}</p></CardBody></Card>
}

export function PresenterPortalHomePage() {
  const user = useCurrentUser()
  const [mes, setMes] = useState(currentMonth)
  const query = useQuery({ queryKey: QK.presenterPortalHome(user?.tenant_id ?? '', user?.id ?? '', mes), queryFn: () => getPresenterPortalHome(mes), enabled: Boolean(user?.id && user?.tenant_id) })
  if (query.isLoading) return <LoadingState label="Carregando seu desempenho" />
  if (query.isError || !query.data) return <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />
  const { desempenho, perfil, remuneracao, ranking } = query.data
  return <div className="space-y-6"><PageHeader title={`Olá, ${perfil.nome.split(' ')[0]}`} subtitle="Acompanhe o desempenho das suas lives concluídas." actions={<label className="grid gap-1 text-xs font-semibold text-ink-muted">Mês<input aria-label="Mês do desempenho" className="design-input h-10 px-3 text-sm" type="month" value={mes} onChange={(e) => setMes(e.target.value)} /></label>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={Video} label="Lives concluídas" value={String(desempenho.total_lives)} hint="Registradas e aprovadas no período." /><Metric icon={Clock3} label="Horas atribuídas" value={`${desempenho.horas_live.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h`} hint="Horas atribuídas conforme a divisão da live." /><Metric icon={CircleDollarSign} label="GMV atribuído" value={formatMoney(desempenho.gmv_lives, true)} hint="Resultado atribuído à sua participação." /><Metric icon={BarChart3} label="GMV por hora" value={desempenho.gmv_por_hora === null ? '—' : formatMoney(desempenho.gmv_por_hora, true)} hint="GMV atribuído dividido pelas suas horas." /></div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]"><PortalRanking rows={ranking} /><Card><CardBody className="p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-muted text-ink-muted"><ShoppingBag className="h-5 w-5" /></span><div><p className="text-base font-bold text-ink">Fixo mensal cadastrado</p></div></div><p className="num mt-6 text-3xl font-black tracking-[-0.03em] text-ink">{remuneracao.fixo === null ? 'Não informado' : formatMoney(remuneracao.fixo, true)}</p><p className="mt-3 text-sm leading-6 text-ink-muted">O total a pagar é calculado no fechamento.</p></CardBody></Card></div>
  </div>
}

export default PresenterPortalHomePage
