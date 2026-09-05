import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowUpRight, Clock3, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'

import type {
  GradeAcompanhamentoResponse,
  GradeCabineOperacional,
  GradeExecucaoSemReserva,
  GradePlanejamentoOperacional,
  GradeSituacao,
} from '../../services/grade'
import { Badge } from '../ui/Badge'
import { gradeOperationalLink, statusAcompanhamento } from './gradeUtils'

const HORA_SP = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

function hora(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : HORA_SP.format(date)
}

function faixa(inicio: string | null, fim: string | null) {
  return `${hora(inicio)}–${hora(fim)}`
}

function duracao(minutos: number) {
  if (minutos <= 0) return null
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return horas > 0 ? `${horas}h${resto ? String(resto).padStart(2, '0') : ''}` : `${resto}min`
}

function StatusBadge({ situacao }: { situacao: GradeSituacao }) {
  const status = statusAcompanhamento(situacao)
  return <Badge tone={status.tone}>{status.label}</Badge>
}

function ActionLink({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} className="inline-flex min-h-9 items-center gap-1 rounded-[var(--radius-pill)] px-2 text-xs font-bold text-brand hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20">
      {children}<ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
    </Link>
  )
}

function PlanejamentoRow({ item, data, cabineId, canWrite }: { item: GradePlanejamentoOperacional; data: string; cabineId: string | null; canWrite: boolean }) {
  return (
    <li className="rounded-xl border border-line bg-surface px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-ink">{item.tipo === 'bloqueio_manutencao' ? 'Bloqueio de manutenção' : item.marca_nome ?? 'Reserva sem marca'}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{faixa(item.data_inicio, item.data_fim)}{item.apresentadora_nome ? ` · ${item.apresentadora_nome}` : ''}</p>
        </div>
        <StatusBadge situacao={item.situacao} />
      </div>
      {item.situacao === 'registro_pendente' ? (
        <p className="mt-2 text-xs text-ink-muted">{item.live_ids.length > 0 ? 'A execução está vinculada, mas o status ainda precisa de revisão.' : 'A reserva existe; o registro da execução ainda não está vinculado.'}</p>
      ) : item.situacao === 'sem_execucao_vinculada' ? (
        <p className="mt-2 text-xs text-ink-muted">O horário terminou sem uma execução vinculada por ID. Revise ou registre o resultado.</p>
      ) : item.situacao === 'vinculacao_pendente' ? (
        <p className="mt-2 text-xs text-ink-muted">Há execução compatível, mas os IDs não confirmam o vínculo.</p>
      ) : item.situacao === 'cancelada' ? (
        <p className="mt-2 text-xs text-ink-muted">Cancelamento registrado {item.cancelamento_origem === 'execucao' ? 'na execução' : 'na agenda'}.</p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {item.live_ids.map((liveId) => (
          <ActionLink key={liveId} to={gradeOperationalLink({ data, cabineId, liveId })}>Ver execução</ActionLink>
        ))}
        {canWrite && item.live_ids.length === 0 && ['registro_pendente', 'sem_execucao_vinculada'].includes(item.situacao) ? (
          <ActionLink to={gradeOperationalLink({ data, cabineId, agendaId: item.id, pendencia: 'cadastro' })}>Registrar execução</ActionLink>
        ) : null}
        {item.live_candidata_ids.map((liveId) => (
          <ActionLink key={liveId} to={gradeOperationalLink({ data, cabineId, liveId })}>Ver execução compatível</ActionLink>
        ))}
        {item.minutos_reais > 0 ? <span className="ml-auto text-xs font-semibold text-ink-muted">{duracao(item.minutos_reais)} executadas</span> : null}
      </div>
    </li>
  )
}

function ExecucaoRow({ item, data, cabineId }: { item: GradeExecucaoSemReserva; data: string; cabineId: string | null }) {
  return (
    <li className="rounded-xl border border-line bg-surface px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-ink">{item.marca_nome ?? 'Execução sem marca identificada'}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{faixa(item.iniciado_em, item.encerrado_em)}</p>
        </div>
        <StatusBadge situacao={item.situacao} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <ActionLink to={gradeOperationalLink({ data, cabineId, liveId: item.id })}>{item.situacao === 'vinculacao_pendente' ? 'Ver execução compatível' : 'Ver execução'}</ActionLink>
        {item.minutos_reais > 0 ? <span className="ml-auto text-xs font-semibold text-ink-muted">{duracao(item.minutos_reais)} executadas</span> : null}
      </div>
    </li>
  )
}

function cabineLabel(cabine: GradeCabineOperacional) {
  return cabine.id ? `Cabine ${cabine.numero ?? '—'}` : 'Cabine não identificada'
}

export function GradeAcompanhamento({ value, canWrite = true, hasGradeFilters = false }: { value: GradeAcompanhamentoResponse; canWrite?: boolean; hasGradeFilters?: boolean }) {
  const cabines = useMemo(() => {
    const hasUnknown = value.cabine_desconhecida.planejamentos.length > 0 || value.cabine_desconhecida.execucoes_sem_reserva.length > 0
    return hasUnknown ? [...value.cabines, value.cabine_desconhecida] : value.cabines
  }, [value])
  const [selectedId, setSelectedId] = useState<string | null>(() => cabines[0]?.id ?? null)

  useEffect(() => {
    if (!cabines.some((cabine) => cabine.id === selectedId)) setSelectedId(cabines[0]?.id ?? null)
  }, [cabines, selectedId])

  if (cabines.length === 0) {
    return (
      <section aria-labelledby="grade-acompanhamento-title" className="mt-6 border-t border-line pt-5">
        <h3 id="grade-acompanhamento-title" className="text-base font-bold text-ink">Acompanhamento operacional</h3>
        <p className="mt-2 rounded-xl border border-dashed border-line p-4 text-sm text-ink-muted">Nenhuma cabine cadastrada para acompanhar neste dia.</p>
      </section>
    )
  }

  const selected = cabines.find((cabine) => cabine.id === selectedId) ?? cabines[0]
  const hasRows = selected.planejamentos.length > 0 || selected.execucoes_sem_reserva.length > 0

  return (
    <section aria-labelledby="grade-acompanhamento-title" className="mt-6 border-t border-line pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="grade-acompanhamento-title" className="text-base font-bold text-ink">Acompanhamento operacional</h3>
          <p className="mt-1 text-sm text-ink-muted">Reservas da agenda comparadas aos registros reais. Correspondências sem ID ficam pendentes para revisão.</p>
          {hasGradeFilters ? <p className="mt-1 text-xs text-ink-muted">Visão geral do dia. Os filtros de marca e apresentadora acima se aplicam à programação da grade.</p> : null}
        </div>
        {selected.minutos_reais > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-bold text-ink"><Clock3 aria-hidden="true" className="h-3.5 w-3.5" />{duracao(selected.minutos_reais)} registradas</span>
        ) : null}
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Cabine acompanhada">
        {cabines.map((cabine) => {
          const selectedTab = cabine.id === selected.id
          return (
            <button key={cabine.id ?? 'desconhecida'} type="button" aria-pressed={selectedTab} onClick={() => setSelectedId(cabine.id)} className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 ${selectedTab ? 'border-brand bg-button-primary text-button-primary-foreground' : 'border-line bg-surface text-ink-muted hover:bg-surface-muted'}`}>
              {cabineLabel(cabine)}
            </button>
          )
        })}
      </div>

      {selected.status_fisico === 'manutencao' ? (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-[var(--warning-soft)] px-3 py-2 text-sm font-semibold text-[var(--warning)]"><Wrench aria-hidden="true" className="h-4 w-4" />Cabine marcada em manutenção.</p>
      ) : null}

      {!hasRows ? (
        <div className="mt-3 rounded-xl border border-dashed border-line bg-surface/70 p-5 text-center">
          <p className="text-sm font-bold text-ink">Sem reservas ou execuções registradas</p>
          <p className="mt-1 text-xs text-ink-muted">{selected.programacao_grade.length > 0 ? 'A grade padrão tem programação; a agenda e os registros reais desta cabine ainda estão vazios.' : 'A grade padrão, a agenda e os registros reais desta cabine estão vazios.'}</p>
        </div>
      ) : (
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">Planejado na agenda</p>
            {selected.planejamentos.length > 0 ? (
              <ul className="space-y-2">{selected.planejamentos.map((item) => <PlanejamentoRow key={item.id} item={item} data={value.data} cabineId={selected.id} canWrite={canWrite} />)}</ul>
            ) : (
              <p className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-muted">Sem programação na agenda.</p>
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">Execuções sem reserva confirmada</p>
            {selected.execucoes_sem_reserva.length > 0 ? (
              <ul className="space-y-2">{selected.execucoes_sem_reserva.map((item) => <ExecucaoRow key={item.id} item={item} data={value.data} cabineId={selected.id} />)}</ul>
            ) : (
              <p className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-muted">Nenhuma execução fora das reservas confirmadas.</p>
            )}
          </div>
        </div>
      )}

      {selected.id === null ? (
        <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-[var(--warning)]"><AlertTriangle aria-hidden="true" className="h-4 w-4" />Estes registros não apontam para uma cabine cadastrada nesta unidade.</p>
      ) : null}
    </section>
  )
}
