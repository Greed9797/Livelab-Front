import { Fragment } from 'react'
import type { Cabine, JsonRecord } from '../../types/models'
import { asString } from '../../utils/format'
import {
  GRADE_SLOTS,
  gradeCellKey,
  indexCelulas,
  type GradeCelula,
  type GradeDia,
} from './gradeUtils'
import { resolveMarcaCor } from '../../utils/brandColor'
import type { GradeCellTarget } from './GradeCellPopover'

const WEEK_DAY_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

function dayLabel(dataISO: string) {
  const [, m, d] = dataISO.split('-')
  const dow = new Date(`${dataISO}T00:00:00`).getDay()
  return `${WEEK_DAY_SHORT[dow]} ${d}/${m}`
}

function cabineNumero(cabine: JsonRecord | Cabine): number | null {
  const numero = Number((cabine as JsonRecord).numero)
  return Number.isFinite(numero) ? numero : null
}

// ── Visão Dia — a planilha: linhas = slots, colunas = cabines ──────────────

export function GradeDiaView({
  celulas,
  cabines,
  onCellClick,
  marcarExcecoes = true,
}: {
  celulas: GradeCelula[]
  cabines: JsonRecord[]
  onCellClick: (target: Omit<GradeCellTarget, 'data' | 'diaSemana'>) => void
  /** false no modo editar padrão (tudo é padrão, sem indicador). */
  marcarExcecoes?: boolean
}) {
  const porCelula = indexCelulas(celulas)

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[720px] gap-1"
        style={{ gridTemplateColumns: `110px repeat(${cabines.length}, minmax(140px, 1fr))` }}
      >
        <div />
        {cabines.map((cabine) => (
          <div key={asString(cabine.id)} className="rounded-lg bg-surface-muted px-2 py-2 text-center text-xs font-bold uppercase tracking-wide text-ink-muted">
            Cabine {cabineNumero(cabine) ?? '—'}
          </div>
        ))}

        {GRADE_SLOTS.map((slot) => (
          <Fragment key={slot.inicio}>
            <div className="flex items-center justify-end pr-2 text-xs font-bold text-ink-muted">
              {slot.inicio}–{slot.fim}
            </div>
            {cabines.map((cabine) => {
              const cabineId = asString(cabine.id)
              const celula = porCelula.get(gradeCellKey(cabineId, slot.inicio)) ?? null
              const cor = celula ? resolveMarcaCor(celula.marca_cor, celula.marca_id) : null
              const isExcecao = marcarExcecoes && celula?.origem === 'excecao'
              return (
                <button
                  key={cabineId}
                  type="button"
                  onClick={() => onCellClick({ cabineId, cabineNumero: cabineNumero(cabine), horaInicio: slot.inicio, horaFim: slot.fim, celula })}
                  className={`min-h-[64px] rounded-lg border px-2 py-1.5 text-left transition hover:brightness-110 ${
                    celula
                      ? isExcecao ? 'border-dashed' : 'border-transparent'
                      : 'border-line bg-surface hover:bg-surface-muted'
                  }`}
                  style={cor ? { background: `${cor}26`, borderLeftColor: cor, borderLeftWidth: 3, ...(isExcecao ? { borderColor: cor } : {}) } : undefined}
                  title={celula?.observacao ?? undefined}
                >
                  {celula ? (
                    <>
                      <span className="block truncate text-sm font-bold text-ink">{celula.marca_nome}</span>
                      <span className="block truncate text-xs text-ink-muted">{celula.apresentadora_nome ?? 'Sem apresentadora'}</span>
                      {isExcecao ? <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wide text-ink-muted">exceção</span> : null}
                    </>
                  ) : (
                    <span className="text-xs text-ink-muted">—</span>
                  )}
                </button>
              )
            })}
          </Fragment>
        ))}
      </div>
    </div>
  )
}

// ── Visão Semana — colunas = 7 dias, linhas = slots, chips por cabine ──────

export function GradeSemanaView({
  dias,
  today,
  onOpenDia,
}: {
  dias: GradeDia[]
  today: string
  onOpenDia: (data: string) => void
}) {
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[860px] gap-1" style={{ gridTemplateColumns: `90px repeat(${dias.length}, minmax(110px, 1fr))` }}>
        <div />
        {dias.map((dia) => (
          <button
            key={dia.data}
            type="button"
            onClick={() => onOpenDia(dia.data)}
            aria-current={dia.data === today ? 'date' : undefined}
            className={`rounded-lg px-2 py-2 text-center text-xs font-bold uppercase tracking-wide transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 ${
              dia.data === today ? 'bg-button-primary text-button-primary-foreground hover:bg-button-primary-hover' : 'bg-surface-muted text-ink-muted'
            }`}
          >
            {dayLabel(dia.data)}
          </button>
        ))}

        {GRADE_SLOTS.map((slot) => (
          <Fragment key={slot.inicio}>
            <div className="flex items-start justify-end pr-2 pt-1 text-xs font-bold text-ink-muted">{slot.inicio}</div>
            {dias.map((dia) => {
              const noSlot = dia.celulas.filter((c) => c.hora_inicio === slot.inicio)
              return (
                <div key={dia.data} className="min-h-[56px] space-y-1 rounded-lg border border-line bg-surface p-1">
                  {noSlot.map((c) => {
                    const cor = resolveMarcaCor(c.marca_cor, c.marca_id)
                    return (
                      <div
                        key={gradeCellKey(c.cabine_id, c.hora_inicio)}
                        className="truncate rounded px-1.5 py-0.5 text-[11px] font-semibold text-ink"
                        style={{ background: `${cor}26`, borderLeft: `3px solid ${cor}` }}
                        title={`Cabine ${c.cabine_numero ?? '—'} · ${c.marca_nome}${c.apresentadora_nome ? ` – ${c.apresentadora_nome}` : ''}`}
                      >
                        C{c.cabine_numero ?? '?'} · {c.marca_nome}{c.apresentadora_nome ? ` – ${c.apresentadora_nome}` : ''}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </Fragment>
        ))}
      </div>
    </div>
  )
}

// ── Visão Mês — calendário 6×7 com chips de marca por dia ──────────────────

export function GradeMesView({
  monthDays,
  monthRef,
  today,
  gradePorData,
  filtroAtivo,
  onOpenDia,
}: {
  monthDays: string[]
  monthRef: string
  today: string
  gradePorData: Map<string, GradeCelula[]>
  filtroAtivo: boolean
  onOpenDia: (data: string) => void
}) {
  const mesRef = monthRef.slice(0, 7)
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[720px] grid-cols-7 gap-1">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((label) => (
          <div key={label} className="px-2 py-1 text-center text-xs font-bold uppercase tracking-wide text-ink-muted">{label}</div>
        ))}
        {monthDays.map((data) => {
          const celulas = gradePorData.get(data) ?? []
          // Uma entrada por marca (a visão mês responde "quais marcas nesse dia")
          const marcas = new Map<string, { nome: string; cor: string | null }>()
          for (const c of celulas) marcas.set(c.marca_id, { nome: c.marca_nome, cor: c.marca_cor ?? null })
          const chips = [...marcas.entries()].slice(0, 3)
          const extras = marcas.size - chips.length
          const foraDoMes = !data.startsWith(mesRef)
          const apagado = foraDoMes || (filtroAtivo && celulas.length === 0)
          return (
            <button
              key={data}
              type="button"
              onClick={() => onOpenDia(data)}
              className={`min-h-[84px] rounded-lg border border-line bg-surface p-1.5 text-left transition hover:bg-surface-muted ${apagado ? 'opacity-40' : ''}`}
            >
              <span className={`block text-xs font-bold ${data === today ? 'text-brand' : 'text-ink-muted'}`}>
                {Number(data.slice(8, 10))}
              </span>
              <div className="mt-1 space-y-0.5">
                {chips.map(([marcaId, marca]) => {
                  const cor = resolveMarcaCor(marca.cor, marcaId)
                  return (
                    <span key={marcaId} className="block truncate rounded px-1 py-px text-[10px] font-semibold text-ink" style={{ background: `${cor}26`, borderLeft: `2px solid ${cor}` }}>
                      {marca.nome}
                    </span>
                  )
                })}
                {extras > 0 ? <span className="block text-[10px] font-semibold text-ink-muted">+{extras}</span> : null}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
