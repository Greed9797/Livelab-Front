import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { isLatestLiveEditRequest, shouldOpenLiveDetail } from './ConteudoPage'

const source = readFileSync(new URL('./ConteudoPage.tsx', import.meta.url), 'utf8')

describe('shouldOpenLiveDetail', () => {
  it('does not reopen a detail dismissed before the URL state settles', () => {
    expect(shouldOpenLiveDetail({
      selectedLiveId: 'live-1',
      hasSelectedLive: true,
      liveModalMode: null,
      metricsModalMode: null,
      dismissedLiveId: 'live-1',
    })).toBe(false)
  })

  it('keeps deep links opening when the URL selects a live', () => {
    expect(shouldOpenLiveDetail({
      selectedLiveId: 'live-2',
      hasSelectedLive: true,
      liveModalMode: null,
      metricsModalMode: null,
      dismissedLiveId: null,
    })).toBe(true)
  })
})

describe('isLatestLiveEditRequest', () => {
  it('descarta a resposta de edição que chegou depois de uma solicitação mais nova', () => {
    expect(isLatestLiveEditRequest(3, 3)).toBe(true)
    expect(isLatestLiveEditRequest(2, 3)).toBe(false)
  })
})

describe('ConteudoPage carregamento operacional', () => {
  it('mantém as consultas da Agenda legada e o top-200 desligados fora do rollback', () => {
    expect(source).toContain("const legacyAgendaEnabled = USE_LEGACY_AGENDA && tab === 'agenda'")
    expect(source).toContain('enabled: legacyAgendaEnabled')
    expect(source).toContain("queryKey: ['lives', 'encerrada']")
    expect(source).toContain('if (legacyAgendaEnabled) void agenda.refetch()')
  })

  it('busca a reserva do deep link de forma pontual, sem reativar a Agenda inteira', () => {
    expect(source).toContain("queryKey: ['agenda', 'context'")
    expect(source).toContain("enabled: tab === 'lives' && Boolean(livesDeepLink.agendaId)")
    expect(source).toContain('getAgenda(agendaContextQueryParams(livesDeepLink))')
    expect(source).toContain('contextAgenda.data')
  })

  it('importa somente helpers leves antes de carregar abas sob demanda', () => {
    expect(source).toContain("from '../components/conteudo/live-date-range'")
    expect(source).toContain("from '../components/conteudo/video-form'")
    expect(source).not.toContain("from '../components/conteudo/LivesTab'")
    expect(source).not.toContain("from '../components/conteudo/VideosTab'")
  })
})
