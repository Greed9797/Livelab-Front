import { renderToStaticMarkup } from 'react-dom/server'
import axios, { type AxiosResponse } from 'axios'
import { describe, expect, it } from 'vitest'
import type { UseMutationResult } from '@tanstack/react-query'
import { ToastProvider } from '../ui/Toast'
import { AgendaTab, type AgendaTabProps } from './AgendaTab'

const event = {
  id: 'evt-1',
  tipo: 'live',
  status: 'ao_vivo',
  marca_nome: 'Marca Aurora',
  data_inicio: '2026-09-21T14:00:00-03:00',
  data_fim: '2026-09-21T16:00:00-03:00',
  live_id: 'live-1',
}

function idle<TVariables>(): UseMutationResult<unknown, Error, TVariables> {
  return { isPending: false, error: null } as UseMutationResult<unknown, Error, TVariables>
}

function apiConflict() {
  const error = new axios.AxiosError('Request failed with status code 409')
  error.response = {
    status: 409,
    data: { error: 'Encerre a live antes de cancelar a agenda.' },
  } as AxiosResponse
  return error
}

function renderAgenda(overrides: Partial<AgendaTabProps> = {}) {
  const props: AgendaTabProps = {
    agendaDate: '2026-09-21',
    agendaView: 'semana',
    agendaRows: [event],
    activeCabines: [],
    marcaRows: [],
    clienteRows: [],
    apresentadoraRows: [],
    agendaModalMode: null,
    selectedAgendaEvent: null,
    fetchingAgendaLive: false,
    requestedDate: '',
    requestedCabineId: '',
    createAgendaMutation: idle(),
    updateAgendaMutation: idle(),
    deleteAgendaMutation: idle(),
    onAgendaDateChange: () => undefined,
    onAgendaViewChange: () => undefined,
    onOpenCreateAgendaModal: () => undefined,
    onOpenEditAgendaModal: () => undefined,
    onOpenRegisterResult: () => undefined,
    onCloseAgendaModal: () => undefined,
    onCreateAgenda: async () => undefined,
    onUpdateAgenda: async () => undefined,
    onDeleteAgenda: async () => undefined,
    ...overrides,
  }
  return renderToStaticMarkup(
    <ToastProvider>
      <AgendaTab {...props} />
    </ToastProvider>,
  )
}

describe('AgendaTab', () => {
  it('shows the cap sentence and still lists the events the server returned', () => {
    const html = renderAgenda({ agendaTruncated: true })
    expect(html).toContain('A lista parou em 500 eventos. Afine o período.')
    expect(html).toContain('Marca Aurora')
  })

  it('keeps the event card when delete is rejected and shows the API error', () => {
    const html = renderAgenda({
      deleteAgendaMutation: {
        isPending: false,
        error: apiConflict(),
      } as unknown as AgendaTabProps['deleteAgendaMutation'],
    })
    expect(html).toContain('Encerre a live antes de cancelar a agenda.')
    expect(html).toContain('Marca Aurora')
  })
})
