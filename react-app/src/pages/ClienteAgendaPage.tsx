import { CalendarClock, CheckCircle2, Clock, RefreshCcw, Send, Video } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Badge, statusTone } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States'
import { getClienteAgenda, getClienteReservas, solicitarClienteLive } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asArray, asString, formatDate } from '../utils/format'
import { QK } from '../services/query-keys'
import type { JsonRecord } from '../types/models'

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function defaultRange() {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const start = new Date(now)
  start.setDate(now.getDate() + diffToMonday)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { start: toDateInput(start), end: toDateInput(end) }
}

const initialForm = {
  cabine_id: '',
  data_solicitada: toDateInput(new Date()),
  hora_inicio: '10:00',
  hora_fim: '12:00',
  observacoes: '',
}

export function ClienteAgendaPage() {
  const range = useMemo(defaultRange, [])
  const [start, setStart] = useState(range.start)
  const [end, setEnd] = useState(range.end)
  const [form, setForm] = useState(initialForm)
  const client = useQueryClient()

  const agendaQuery = useQuery({
    queryKey: QK.clienteAgenda({ start, end }),
    queryFn: () => getClienteAgenda({ data_inicio: start, data_fim: end }),
  })
  const reservasQuery = useQuery({ queryKey: QK.clienteReservas, queryFn: getClienteReservas })
  const solicitarMutation = useMutation({
    mutationFn: solicitarClienteLive,
    onSuccess: () => {
      setForm((current) => ({ ...initialForm, cabine_id: current.cabine_id, data_solicitada: current.data_solicitada }))
      void client.invalidateQueries({ queryKey: QK.clienteAgenda() })
      void client.invalidateQueries({ queryKey: QK.clienteReservas })
    },
  })

  const cabines = asArray<JsonRecord>(agendaQuery.data?.cabines)
  const slots = asArray<JsonRecord>(agendaQuery.data?.slots)
  const reservas = reservasQuery.data ?? []

  useEffect(() => {
    if (!form.cabine_id && cabines[0]?.id) {
      setForm((current) => ({ ...current, cabine_id: asString(cabines[0].id, '') }))
    }
  }, [cabines, form.cabine_id])

  if (agendaQuery.isLoading || reservasQuery.isLoading) return <LoadingState />
  if (agendaQuery.isError) return <ErrorState message={extractErrorMessage(agendaQuery.error)} onRetry={() => void agendaQuery.refetch()} />
  if (reservasQuery.isError) return <ErrorState message={extractErrorMessage(reservasQuery.error)} onRetry={() => void reservasQuery.refetch()} />

  function setField(key: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    solicitarMutation.mutate({
      cabine_id: form.cabine_id,
      data_solicitada: form.data_solicitada,
      hora_inicio: form.hora_inicio,
      hora_fim: form.hora_fim,
      observacoes: form.observacoes || undefined,
    })
  }

  const minhasReservas = reservas.filter((item) => !['recusada', 'cancelado'].includes(asString(item.status, '').toLowerCase()))
  const meusSlots = slots.filter((item) => item.is_mine)
  const ocupados = slots.filter((item) => !item.is_mine)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cliente"
        accent="Agenda"
        title="de lives"
        subtitle="Solicite horários, acompanhe reservas e veja ocupação das cabines na semana."
        actions={
          <Button variant="secondary" icon={RefreshCcw} onClick={() => {
            void agendaQuery.refetch()
            void reservasQuery.refetch()
          }}>
            Atualizar
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ['Minhas reservas', minhasReservas.length, 'solicitações ativas'],
          ['Confirmadas', minhasReservas.filter((item) => asString(item.status).includes('confirm')).length, 'lives aprovadas'],
          ['Horários ocupados', ocupados.length, 'indisponíveis no período'],
        ].map(([label, value, hint]) => (
          <Card key={String(label)}>
            <CardBody className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">{label}</p>
              <p className="num mt-3 text-[34px] font-bold leading-none text-ink">{value}</p>
              <p className="mt-2 text-xs text-ink-muted">{hint}</p>
            </CardBody>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <p className="text-base font-bold text-ink">Período</p>
            </CardHeader>
            <CardBody className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <label className="block">
                <span className="text-sm font-semibold text-ink">Início</span>
                <input className="design-input mt-2 h-11 w-full px-4" type="date" value={start} onChange={(event) => setStart(event.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Fim</span>
                <input className="design-input mt-2 h-11 w-full px-4" type="date" value={end} onChange={(event) => setEnd(event.target.value)} />
              </label>
              <Button type="button" variant="secondary" icon={CalendarClock} onClick={() => {
                const next = defaultRange()
                setStart(next.start)
                setEnd(next.end)
              }}>
                Semana atual
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <p className="text-base font-bold text-ink">Solicitar novo horário</p>
              <p className="mt-1 text-xs text-ink-muted">A solicitação entra como pendente e a unidade confirma pelo painel operacional.</p>
            </CardHeader>
            <CardBody>
              <form className="grid gap-4" onSubmit={onSubmit}>
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Cabine</span>
                  <select className="design-input mt-2 h-11 w-full px-4" value={form.cabine_id} onChange={(event) => setField('cabine_id', event.target.value)} required>
                    {cabines.length === 0 ? <option value="">Sem cabines disponíveis</option> : null}
                    {cabines.map((cabine) => (
                      <option key={asString(cabine.id)} value={asString(cabine.id)}>
                        Cabine {asString(cabine.numero)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">Data</span>
                    <input className="design-input mt-2 h-11 w-full px-4" type="date" value={form.data_solicitada} onChange={(event) => setField('data_solicitada', event.target.value)} required />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">Início</span>
                    <input className="design-input mt-2 h-11 w-full px-4" type="time" value={form.hora_inicio} onChange={(event) => setField('hora_inicio', event.target.value)} required />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">Fim</span>
                    <input className="design-input mt-2 h-11 w-full px-4" type="time" value={form.hora_fim} onChange={(event) => setField('hora_fim', event.target.value)} required />
                  </label>
                </div>
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Observações</span>
                  <textarea className="design-input mt-2 min-h-24 w-full px-4 py-3" value={form.observacoes} onChange={(event) => setField('observacoes', event.target.value)} placeholder="Produtos, campanha ou preferência de apresentadora" />
                </label>
                {solicitarMutation.isError ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{extractErrorMessage(solicitarMutation.error)}</p> : null}
                {solicitarMutation.isSuccess ? <p className="rounded-2xl bg-[var(--success-soft)] px-4 py-3 text-sm font-medium text-[var(--success)]">Solicitação enviada para aprovação.</p> : null}
                <Button type="submit" icon={Send} isLoading={solicitarMutation.isPending} disabled={cabines.length === 0}>
                  Enviar solicitação
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <p className="text-base font-bold text-ink">Minhas reservas</p>
            </CardHeader>
            <CardBody className="space-y-3">
              {minhasReservas.length === 0 ? <EmptyState title="Nenhuma reserva ativa" description="Use o formulário para solicitar o primeiro horário." /> : null}
              {minhasReservas.map((item) => (
                <div key={asString(item.id)} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-muted p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-bold text-ink">Cabine {asString(item.cabine_numero)}</p>
                    <p className="mt-1 text-sm text-ink-muted">{formatDate(asString(item.data, ''))} das {asString(item.hora_inicio)} às {asString(item.hora_fim)}</p>
                    {item.observacoes ? <p className="mt-1 text-xs text-ink-muted">{asString(item.observacoes)}</p> : null}
                  </div>
                  <Badge tone={statusTone(asString(item.status))}>{asString(item.status)}</Badge>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <p className="text-base font-bold text-ink">Ocupação no período</p>
            </CardHeader>
            <CardBody className="space-y-3">
              {slots.length === 0 ? <EmptyState title="Agenda livre no período" description="Não há reservas bloqueando os horários consultados." /> : null}
              {slots.map((slot, index) => (
                <div key={`${asString(slot.solicitacao_id, String(index))}-${index}`} className="grid gap-3 rounded-2xl border border-line bg-surface-muted p-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="flex min-w-0 gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                      {slot.is_mine ? <CheckCircle2 className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-ink">Cabine {asString(cabines.find((cabine) => cabine.id === slot.cabine_id)?.numero ?? slot.cabine_id)}</p>
                      <p className="mt-1 text-sm text-ink-muted">
                        <Clock className="mr-1 inline h-3.5 w-3.5" />
                        {formatDate(asString(slot.data, ''))} das {asString(slot.hora_inicio)} às {asString(slot.hora_fim)}
                      </p>
                    </div>
                  </div>
                  <Badge tone={statusTone(asString(slot.status))}>{asString(slot.status)}</Badge>
                </div>
              ))}
              {meusSlots.length > 0 ? <p className="text-xs text-ink-muted">{meusSlots.length} horário(s) acima pertencem à sua conta.</p> : null}
            </CardBody>
          </Card>
        </div>
      </section>
    </div>
  )
}
