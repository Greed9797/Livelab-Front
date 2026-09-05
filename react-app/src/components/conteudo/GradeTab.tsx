import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Copy, Pencil } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { LoadingState, ErrorState } from '../ui/States'
import { monthGridDays, weekDays } from '../../pages/conteudo-helpers'
import {
  copiarGradeDia,
  createAgendaEvento,
  deleteAgendaEvento,
  deleteGradeExcecao,
  deleteGradePadraoCell,
  getClientes,
  getGrade,
  getGradePadrao,
  saveGradeExcecao,
  saveGradePadraoCell,
  updateAgendaEvento,
} from '../../services/domain'
import { extractErrorMessage } from '../../services/api'
import { getGradeAcompanhamento } from '../../services/grade'
import { asString } from '../../utils/format'
import type { Cabine, JsonRecord } from '../../types/models'
import {
  marcasPresentes,
  gradeDateFromLink,
  type GradeCelula,
  type GradeDia,
  type GradePadraoCelula,
} from './gradeUtils'
import { resolveMarcaCor } from '../../utils/brandColor'
import { GradeDiaView, GradeMesView, GradeSemanaView } from './GradeViews'
import { GradeCellPopover, type GradeCellTarget } from './GradeCellPopover'
import { GradeAcompanhamento } from './GradeAcompanhamento'
import { AgendarLiveModal } from '../forms/AgendarLiveModal'
import { getSaoPauloDateInput } from '../../utils/sao-paulo-date'

type GradeView = 'dia' | 'semana' | 'mes'

/** Escopo do template: dias úteis (um bloco só) ou sábado/domingo isolados. */
type PadraoScope = 'uteis' | 6 | 0

const PADRAO_SCOPES: ReadonlyArray<{ key: PadraoScope; label: string }> = [
  { key: 'uteis', label: 'Seg–Sex' },
  { key: 6, label: 'Sáb' },
  { key: 0, label: 'Dom' },
]

function dowsFromScope(scope: PadraoScope): number[] {
  return scope === 'uteis' ? [1, 2, 3, 4, 5] : [scope]
}

/** Dia exibido na grade do template (a segunda representa os dias úteis). */
function dowRepresentativo(scope: PadraoScope): number {
  return scope === 'uteis' ? 1 : scope
}

const todayISO = getSaoPauloDateInput

function shiftDate(dateISO: string, view: GradeView, direction: 1 | -1): string {
  const d = new Date(`${dateISO}T00:00:00`)
  if (view === 'dia') d.setDate(d.getDate() + direction)
  if (view === 'semana') d.setDate(d.getDate() + 7 * direction)
  if (view === 'mes') d.setMonth(d.getMonth() + direction)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatShortDate(dataISO: string) {
  return dataISO.split('-').reverse().slice(0, 2).join('/')
}

interface GradeTabProps {
  activeCabines: JsonRecord[]
  marcaRows: JsonRecord[]
  apresentadoraRows: JsonRecord[]
  /** false = papel read-only: grade visível, ações de escrita escondidas. */
  canWrite?: boolean
  initialDate?: string
  initialMarcaId?: string
}

export function GradeTab({ activeCabines, marcaRows, apresentadoraRows, canWrite = true, initialDate = '', initialMarcaId = '' }: GradeTabProps) {
  const [view, setView] = useState<GradeView>('dia')
  const [date, setDate] = useState(() => gradeDateFromLink(initialDate, todayISO()))
  const [filtroMarca, setFiltroMarca] = useState(initialMarcaId)
  const [filtroApresentadora, setFiltroApresentadora] = useState('')
  const [editPadrao, setEditPadrao] = useState(false)
  const [padraoScope, setPadraoScope] = useState<PadraoScope>('uteis')
  const [popoverTarget, setPopoverTarget] = useState<GradeCellTarget | null>(null)
  const [copiarDiaOpen, setCopiarDiaOpen] = useState(false)
  const [copiarDestino, setCopiarDestino] = useState('')
  // Agendamento real (agenda_eventos) aberto a partir da célula do slot.
  const [agendaModal, setAgendaModal] = useState<{ mode: 'create' | 'edit'; evento: JsonRecord | null } | null>(null)
  const client = useQueryClient()

  const cabinesOrdenadas = useMemo(
    () => [...activeCabines].sort((a, b) => Number(a.numero ?? 0) - Number(b.numero ?? 0)),
    [activeCabines],
  )

  const range = useMemo(() => {
    const days = view === 'dia' ? [date] : view === 'semana' ? weekDays(date) : monthGridDays(date)
    return { start: days[0], end: days[days.length - 1] }
  }, [date, view])

  const grade = useQuery({
    queryKey: ['grade', range.start, range.end, filtroMarca, filtroApresentadora],
    queryFn: () => getGrade({
      data_inicio: range.start,
      data_fim: range.end,
      marca_id: filtroMarca || undefined,
      apresentadora_id: filtroApresentadora || undefined,
    }),
    enabled: !editPadrao,
    placeholderData: (prev) => prev,
  })

  const gradePadrao = useQuery({
    queryKey: ['grade-padrao'],
    queryFn: getGradePadrao,
    enabled: editPadrao,
  })

  const acompanhamento = useQuery({
    queryKey: ['grade-acompanhamento', date],
    queryFn: () => getGradeAcompanhamento(date),
    enabled: !editPadrao && view === 'dia',
  })

  // Mesma queryKey da ConteudoPage: o React Query compartilha o cache, não é
  // uma segunda ida ao servidor. O AgendarLiveModal exige a lista de clientes.
  const clientes = useQuery({ queryKey: ['clientes'], queryFn: () => getClientes(), enabled: agendaModal !== null })

  function invalidateGrade() {
    void client.invalidateQueries({ queryKey: ['grade'] })
    void client.invalidateQueries({ queryKey: ['grade-padrao'] })
  }

  function closePopover() { setPopoverTarget(null) }

  const savePadraoMutation = useMutation({ mutationFn: saveGradePadraoCell, onSuccess: () => { invalidateGrade(); closePopover() } })
  const deletePadraoMutation = useMutation({ mutationFn: deleteGradePadraoCell, onSuccess: () => { invalidateGrade(); closePopover() } })
  const saveExcecaoMutation = useMutation({ mutationFn: saveGradeExcecao, onSuccess: () => { invalidateGrade(); closePopover() } })
  const deleteExcecaoMutation = useMutation({ mutationFn: deleteGradeExcecao, onSuccess: () => { invalidateGrade(); closePopover() } })
  const copiarDiaMutation = useMutation({ mutationFn: copiarGradeDia, onSuccess: () => { invalidateGrade(); setCopiarDiaOpen(false); setCopiarDestino('') } })

  function invalidateAgenda() {
    void client.invalidateQueries({ queryKey: ['agenda-slot'] })
    void client.invalidateQueries({ queryKey: ['agenda'] })
    void client.invalidateQueries({ queryKey: ['grade-acompanhamento'] })
  }

  // As mutations NÃO fecham o modal: quem fecha é o próprio AgendarLiveModal, e só
  // depois de gravar os turnos. Fechar aqui esconderia o aviso de "backend sem
  // revezamento" antes de o operador poder desfazer.
  const createAgendaMutation = useMutation({ mutationFn: createAgendaEvento, onSuccess: invalidateAgenda })
  const updateAgendaMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: JsonRecord }) => updateAgendaEvento(id, payload),
    onSuccess: invalidateAgenda,
  })
  const deleteAgendaMutation = useMutation({
    mutationFn: ({ id, modoRecorrencia }: { id: string; modoRecorrencia: string }) => deleteAgendaEvento(id, { modo_recorrencia: modoRecorrencia }),
    onSuccess: invalidateAgenda,
  })

  function abrirAgendaModal(mode: 'create' | 'edit', evento: JsonRecord | null) {
    createAgendaMutation.reset(); updateAgendaMutation.reset(); deleteAgendaMutation.reset()
    setAgendaModal({ mode, evento })
  }

  function fecharAgendaModal() {
    setAgendaModal(null)
    // O PUT de turnos sai do modal, sem mutation própria — invalidar aqui garante
    // que a lista do popover volte com o revezamento recém-gravado.
    invalidateAgenda()
  }

  const isSaving = savePadraoMutation.isPending || deletePadraoMutation.isPending
    || saveExcecaoMutation.isPending || deleteExcecaoMutation.isPending
  const popoverError = savePadraoMutation.error ?? deletePadraoMutation.error
    ?? saveExcecaoMutation.error ?? deleteExcecaoMutation.error

  const dias = ((grade.data?.dias ?? []) as unknown as GradeDia[])
  const gradePorData = useMemo(() => {
    const map = new Map<string, GradeCelula[]>()
    for (const dia of dias) map.set(dia.data, dia.celulas)
    return map
  }, [dias])

  const padraoCelulas = ((gradePadrao.data?.celulas ?? []) as unknown as GradePadraoCelula[])
  // Em "Seg–Sex" a segunda (dow 1) é a representativa — a migration 122 e o save
  // multi-dow mantêm os 5 dias úteis sincronizados.
  const padraoDoDow = useMemo(
    () => padraoCelulas.filter((c) => c.dia_semana === dowRepresentativo(padraoScope)),
    [padraoCelulas, padraoScope],
  )

  const celulasVisiveis = editPadrao ? padraoDoDow : dias.flatMap((d) => d.celulas)
  const legenda = marcasPresentes(celulasVisiveis)

  const today = todayISO()
  const periodLabel = view === 'dia'
    ? date.split('-').reverse().join('/')
    : view === 'semana'
      ? `${formatShortDate(range.start)} – ${formatShortDate(range.end)}`
      : new Date(`${date.slice(0, 7)}-01T00:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  function onCellClick(base: Omit<GradeCellTarget, 'data' | 'diaSemana'>) {
    // Read-only: a célula continua legível, mas não abre o popover de edição.
    if (!canWrite) return
    setPopoverTarget(editPadrao
      ? { ...base, diaSemana: dowRepresentativo(padraoScope) }
      : { ...base, data: date })
    savePadraoMutation.reset(); deletePadraoMutation.reset()
    saveExcecaoMutation.reset(); deleteExcecaoMutation.reset()
  }

  function onPopoverSave(values: { marca_id: string; apresentadora_id: string | null; observacao: string | null }) {
    if (!popoverTarget) return
    const base = {
      cabine_id: popoverTarget.cabineId,
      hora_inicio: popoverTarget.horaInicio,
      hora_fim: popoverTarget.horaFim,
      ...values,
    }
    // Em "Seg–Sex" grava nos 5 dias úteis de uma vez (backend usa unnest).
    if (editPadrao) savePadraoMutation.mutate({ ...base, dias_semana: dowsFromScope(padraoScope) })
    else saveExcecaoMutation.mutate({ ...base, data: popoverTarget.data })
  }

  function onPopoverClear() {
    if (!popoverTarget?.celula) return
    const { cabineId, horaInicio, horaFim, celula, data } = popoverTarget
    if (editPadrao) {
      deletePadraoMutation.mutate({ dias_semana: dowsFromScope(padraoScope), cabine_id: cabineId, hora_inicio: horaInicio })
      return
    }
    if (!data) return
    if (celula.origem === 'padrao') {
      // "Limpar" célula que vem do padrão = exceção vazia só neste dia
      saveExcecaoMutation.mutate({ data, cabine_id: cabineId, hora_inicio: horaInicio, hora_fim: horaFim, marca_id: null })
    } else {
      deleteExcecaoMutation.mutate({ data, cabine_id: cabineId, hora_inicio: horaInicio })
    }
  }

  function onCopiarDiaSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!copiarDestino) return
    copiarDiaMutation.mutate({ data_origem: date, data_destino: copiarDestino })
  }

  const isLoading = editPadrao ? gradePadrao.isLoading : grade.isLoading
  const loadError = editPadrao ? gradePadrao.error : grade.error

  return (
    <Card>
      <CardHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-full border border-line bg-surface p-1">
              {([['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês']] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  disabled={editPadrao}
                  onClick={() => setView(key)}
                  aria-pressed={!editPadrao && view === key}
                  className={`rounded-full px-4 py-1.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 ${
                    !editPadrao && view === key ? 'bg-button-primary text-button-primary-foreground hover:bg-button-primary-hover' : 'text-ink-muted hover:text-ink'
                  } ${editPadrao ? 'opacity-40' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {canWrite && view === 'dia' && !editPadrao ? (
                <Button variant="secondary" icon={Copy} onClick={() => setCopiarDiaOpen(true)}>Copiar dia</Button>
              ) : null}
              {canWrite ? (
                <Button
                  variant={editPadrao ? 'primary' : 'secondary'}
                  icon={Pencil}
                  onClick={() => { setEditPadrao((cur) => !cur); setView('dia'); closePopover() }}
                >
                  {editPadrao ? 'Sair do padrão' : 'Editar padrão'}
                </Button>
              ) : null}
            </div>
          </div>

          {editPadrao ? (
            <>
              <div className="rounded-xl border border-line bg-surface-muted px-4 py-2.5 text-sm font-semibold text-ink">
                {padraoScope === 'uteis'
                  ? 'Você está editando o padrão dos dias úteis — a mudança vale de segunda a sexta, toda semana.'
                  : `Você está editando o padrão de ${padraoScope === 6 ? 'sábado' : 'domingo'} — repete toda semana.`}
              </div>
              <div className="inline-flex flex-wrap rounded-full border border-line bg-surface p-1">
                {PADRAO_SCOPES.map((scope) => (
                  <button
                    key={String(scope.key)}
                    type="button"
                    onClick={() => setPadraoScope(scope.key)}
                    aria-pressed={padraoScope === scope.key}
                    className={`rounded-full px-3 py-1.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 ${
                      padraoScope === scope.key ? 'bg-button-primary text-button-primary-foreground hover:bg-button-primary-hover' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {scope.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setDate(shiftDate(date, view, -1))} aria-label="Período anterior" className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink hover:bg-surface-muted">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[170px] text-center text-sm font-bold capitalize text-ink">{periodLabel}</span>
                <button type="button" onClick={() => setDate(shiftDate(date, view, 1))} aria-label="Próximo período" className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink hover:bg-surface-muted">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <button type="button" onClick={() => setDate(today)} className="h-9 rounded-lg border border-line px-3 text-sm font-bold text-ink-muted hover:text-ink">
                Hoje
              </button>
              <input className="design-input h-9 px-3 text-sm [color-scheme:dark]" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
              <select aria-label="Filtrar por marca" className="design-input h-9 px-3 text-sm" value={filtroMarca} onChange={(e) => setFiltroMarca(e.target.value)}>
                <option value="">Todas as marcas</option>
                {marcaRows.map((m) => (
                  <option key={asString(m.id)} value={asString(m.id)}>{asString(m.nome, 'Sem nome')}</option>
                ))}
              </select>
              <select aria-label="Filtrar por apresentadora" className="design-input h-9 px-3 text-sm" value={filtroApresentadora} onChange={(e) => setFiltroApresentadora(e.target.value)}>
                <option value="">Todas as apresentadoras</option>
                {apresentadoraRows.map((a) => (
                  <option key={asString(a.id)} value={asString(a.id)}>{asString(a.nome, 'Sem nome')}</option>
                ))}
              </select>
              {/* Todas as marcas da grade — sem corte: a legenda é o que traduz a cor. */}
              {legenda.length > 0 ? (
                <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                  {legenda.map((m) => (
                    <span key={m.id} className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded" style={{ background: resolveMarcaCor(m.cor, m.id) }} />
                      {m.nome}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </CardHeader>

      <CardBody>
        {isLoading ? (
          <LoadingState />
        ) : loadError ? (
          <ErrorState message={extractErrorMessage(loadError)} onRetry={() => { void (editPadrao ? gradePadrao.refetch() : grade.refetch()) }} />
        ) : editPadrao ? (
          <GradeDiaView celulas={padraoDoDow} cabines={cabinesOrdenadas} onCellClick={onCellClick} marcarExcecoes={false} />
        ) : view === 'dia' ? (
          <>
            <GradeDiaView celulas={gradePorData.get(date) ?? []} cabines={cabinesOrdenadas} onCellClick={onCellClick} />
            {acompanhamento.isLoading ? (
              <section aria-labelledby="grade-acompanhamento-loading" className="mt-6 border-t border-line pt-5">
                <h3 id="grade-acompanhamento-loading" className="mb-3 text-base font-bold text-ink">Acompanhamento operacional</h3>
                <LoadingState label="Carregando agenda e execuções do dia" />
              </section>
            ) : acompanhamento.error ? (
              <section aria-labelledby="grade-acompanhamento-error" className="mt-6 border-t border-line pt-5">
                <h3 id="grade-acompanhamento-error" className="mb-3 text-base font-bold text-ink">Acompanhamento operacional</h3>
                <ErrorState message={extractErrorMessage(acompanhamento.error)} onRetry={() => { void acompanhamento.refetch() }} />
              </section>
            ) : acompanhamento.data ? (
              <GradeAcompanhamento value={acompanhamento.data} canWrite={canWrite} hasGradeFilters={Boolean(filtroMarca || filtroApresentadora)} />
            ) : null}
          </>
        ) : view === 'semana' ? (
          <GradeSemanaView dias={dias} today={today} onOpenDia={(d) => { setDate(d); setView('dia') }} />
        ) : (
          <GradeMesView
            monthDays={monthGridDays(date)}
            monthRef={date}
            today={today}
            gradePorData={gradePorData}
            filtroAtivo={Boolean(filtroMarca || filtroApresentadora)}
            onOpenDia={(d) => { setDate(d); setView('dia') }}
          />
        )}
      </CardBody>

      <GradeCellPopover
        target={popoverTarget}
        marcas={marcaRows}
        apresentadoras={apresentadoraRows}
        isSaving={isSaving}
        errorMessage={popoverError ? extractErrorMessage(popoverError) : null}
        onClose={closePopover}
        onSave={onPopoverSave}
        onClear={onPopoverClear}
        onAgendarLive={canWrite ? () => abrirAgendaModal('create', null) : undefined}
        onEditarLive={(evento) => abrirAgendaModal('edit', evento)}
        onExcluirLive={(evento) => {
          const id = asString(evento.id, '')
          if (id) deleteAgendaMutation.mutate({ id, modoRecorrencia: 'apenas_este' })
        }}
        isExcluindoLive={deleteAgendaMutation.isPending}
        agendaErrorMessage={deleteAgendaMutation.error ? extractErrorMessage(deleteAgendaMutation.error) : null}
      />

      <AgendarLiveModal
        open={agendaModal !== null}
        mode={agendaModal?.mode ?? 'create'}
        event={agendaModal?.evento ?? null}
        // O slot clicado é o contexto: data, cabine, faixa de horário e a marca
        // que o template já reserva ali.
        defaultDate={popoverTarget?.data}
        defaultCabineId={popoverTarget?.cabineId}
        defaultHoraInicio={popoverTarget?.horaInicio}
        defaultHoraFim={popoverTarget?.horaFim}
        defaultMarcaId={popoverTarget?.celula?.marca_id}
        cabines={cabinesOrdenadas as unknown as Cabine[]}
        marcas={marcaRows}
        clientes={clientes.data ?? []}
        apresentadoras={apresentadoraRows}
        isSaving={createAgendaMutation.isPending || updateAgendaMutation.isPending || deleteAgendaMutation.isPending}
        error={createAgendaMutation.error ?? updateAgendaMutation.error ?? deleteAgendaMutation.error}
        onClose={fecharAgendaModal}
        // mutateAsync devolve o evento criado — é o que habilita o segundo passo
        // (PUT dos turnos) dentro do modal.
        onCreate={(payload) => createAgendaMutation.mutateAsync(payload)}
        onUpdate={(id, payload) => updateAgendaMutation.mutateAsync({ id, payload })}
        onDelete={(id, modoRecorrencia) => deleteAgendaMutation.mutate({ id, modoRecorrencia }, { onSuccess: fecharAgendaModal })}
      />

      <Modal open={copiarDiaOpen} title="Copiar dia" subtitle={`Copia a grade de ${date.split('-').reverse().join('/')} para outra data (sobrescreve o destino).`} size="sm" onClose={() => setCopiarDiaOpen(false)}>
        <form onSubmit={onCopiarDiaSubmit} className="space-y-4 px-5 py-4">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">Data de destino</span>
            <input className="design-input h-10 w-full px-3 [color-scheme:dark]" type="date" value={copiarDestino} onChange={(e) => setCopiarDestino(e.target.value)} required />
          </label>
          {copiarDiaMutation.error ? (
            <p className="text-sm font-semibold text-[color:var(--danger)]">{extractErrorMessage(copiarDiaMutation.error)}</p>
          ) : null}
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCopiarDiaOpen(false)}>Cancelar</Button>
            <Button type="submit" isLoading={copiarDiaMutation.isPending} disabled={!copiarDestino}>Copiar</Button>
          </div>
        </form>
      </Modal>
    </Card>
  )
}
