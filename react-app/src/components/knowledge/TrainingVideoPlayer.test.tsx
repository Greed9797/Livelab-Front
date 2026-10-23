/** @vitest-environment jsdom */
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TrainingVideoPlayer } from './TrainingVideoPlayer'

const mocks = vi.hoisted(() => ({
  loadYouTubeApi: vi.fn(),
  loadPandaApi: vi.fn(),
  saveTrainingProgress: vi.fn(),
}))

vi.mock('../../services/training-video-sdk', () => ({
  loadYouTubeApi: mocks.loadYouTubeApi,
  loadPandaApi: mocks.loadPandaApi,
}))
vi.mock('../../services/training', async () => {
  const actual = await vi.importActual<typeof import('../../services/training')>('../../services/training')
  return { ...actual, saveTrainingProgress: mocks.saveTrainingProgress }
})
vi.mock('../../services/api', () => ({ api: { defaults: { baseURL: 'https://api.example.test/v1' } } }))
vi.mock('../../services/auth-storage', () => ({ getAccessToken: () => 'test-token' }))
vi.mock('../../stores/auth-store', () => ({
  useCurrentUser: () => ({ id: 'user-1', tenant_id: 'tenant-1' }),
  useAuthStore: { getState: () => ({ user: { id: 'user-1', tenant_id: 'tenant-1' } }) },
}))

describe('TrainingVideoPlayer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) })))
    window.localStorage.clear()
    window.sessionStorage.clear()
    mocks.saveTrainingProgress.mockReset()
    mocks.saveTrainingProgress.mockResolvedValue({
      lesson_id: 'lesson-1', state: 'in_progress', started_at: '2026-10-01T00:00:00.000Z',
      last_opened_at: null, completed_at: null, watched_percent: 0, last_position_seconds: 0,
      duration_seconds: 100, position_revision: 1, video_version: 2, completion_source: null,
      position_accepted: true,
    })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('waits for observed playback before saving and flushes the watched segment on pause', async () => {
    let currentTime = 0
    let events: {
      onReady: (event: { target: unknown }) => void
      onStateChange: (event: { data: number; target: unknown }) => void
    } | null = null
    const player = {
      getCurrentTime: () => currentTime,
      getDuration: () => 100,
      getPlaybackRate: () => 1,
      getPlayerState: () => 1,
      cueVideoById: vi.fn(({ startSeconds }: { videoId: string; startSeconds?: number }) => { currentTime = startSeconds ?? 0 }),
      seekTo: vi.fn((position: number) => { currentTime = position }),
      destroy: vi.fn(),
    }
    mocks.loadYouTubeApi.mockResolvedValue({
      PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 },
      Player: class {
        constructor(_iframe: HTMLIFrameElement, options: { events: typeof events }) {
          events = options.events
          return player as never
        }
      },
    })

    const { unmount } = render(
      <TrainingVideoPlayer
        lessonId="lesson-1"
        title="Training video"
        provider="youtube"
        videoId="abcdef12345"
        videoVersion={2}
        progress={{ state: 'in_progress', started_at: '2026-10-01T00:00:00.000Z', last_opened_at: null, completed_at: null, last_position_seconds: 12, duration_seconds: 100, position_revision: 1 }}
      />,
    )

    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() })
    expect(events).not.toBeNull()
    act(() => events?.onReady({ target: player }))
    expect(player.cueVideoById).toHaveBeenCalledWith({ videoId: 'abcdef12345', startSeconds: 12 })
    expect(mocks.saveTrainingProgress).not.toHaveBeenCalled()
    expect(mocks.saveTrainingProgress).not.toHaveBeenCalled()
    expect(screen.getByTitle('Vídeo: Training video').getAttribute('referrerpolicy')).toBe('strict-origin-when-cross-origin')

    act(() => events?.onStateChange({ data: 1, target: player }))
    expect(mocks.saveTrainingProgress).toHaveBeenCalledTimes(1)
    expect(mocks.saveTrainingProgress.mock.calls[0][1]).toMatchObject({ playback_started: true, intervals: [] })
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() })

    currentTime = 12.25
    await act(async () => { await vi.advanceTimersByTimeAsync(250) })
    act(() => events?.onStateChange({ data: 2, target: player }))
    expect(mocks.saveTrainingProgress.mock.calls.at(-1)?.[1].intervals).toEqual([[12, 12.25]])
    expect(mocks.saveTrainingProgress.mock.calls.at(-1)?.[1].last_position_seconds).toBe(12.25)

    unmount()
  })

  it('uses Panda setCurrentTime to restore the saved position and flushes pagehide with keepalive', async () => {
    let eventHandler: ((event: { message: string }) => void) | null = null
    const panda = {
      getCurrentTime: () => 30,
      getDuration: () => 100,
      getSpeed: () => 1,
      isPaused: () => true,
      setCurrentTime: vi.fn(),
      onEvent: (handler: typeof eventHandler) => { eventHandler = handler },
      destroy: vi.fn(),
    }
    let pandaOptions: { onReady: () => void } | null = null
    const PandaPlayer = vi.fn(function PandaPlayerMock(_host: string, options: typeof pandaOptions) {
      pandaOptions = options
      return panda
    })
    mocks.loadPandaApi.mockResolvedValue(PandaPlayer)
    const { unmount } = render(
      <TrainingVideoPlayer
        lessonId="lesson-1" title="Training video" provider="panda" videoId="abcdef12345"
        libraryId="vz-library" videoVersion={2}
        progress={{ state: 'in_progress', started_at: '2026-10-01T00:00:00.000Z', last_opened_at: null, completed_at: null, last_position_seconds: 30, duration_seconds: 100, position_revision: 4 }}
      />,
    )

    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() })
    const pandaIframe = screen.getByTitle('Vídeo: Training video')
    expect(pandaIframe.getAttribute('src')).toBe('https://player-vz-library.tv.pandavideo.com.br/embed/?v=abcdef12345&saveProgress=false')
    expect(pandaIframe.classList.contains('h-full') && pandaIframe.classList.contains('w-full')).toBe(true)
    act(() => pandaOptions?.onReady())
    expect(panda.setCurrentTime).toHaveBeenCalledWith(30)
    act(() => eventHandler?.({ message: 'panda_play' }))
    expect(mocks.saveTrainingProgress).toHaveBeenCalledTimes(1)
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() })
    act(() => { window.dispatchEvent(new Event('pagehide')) })
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/training/lessons/lesson-1/progress'), expect.objectContaining({ keepalive: true }))
    unmount()
  })

  it('adopts the server position after a rejected stale position when no newer playback sample exists', async () => {
    let currentTime = 40
    let events: { onReady: (event: { target: unknown }) => void; onStateChange: (event: { data: number; target: unknown }) => void } | null = null
    const player = {
      getCurrentTime: () => currentTime, getDuration: () => 100, getPlaybackRate: () => 1,
      cueVideoById: vi.fn(), seekTo: vi.fn(), destroy: vi.fn(),
    }
    mocks.loadYouTubeApi.mockResolvedValue({
      PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 },
      Player: class {
        constructor(_iframe: HTMLIFrameElement, options: { events: typeof events }) { events = options.events; return player as never }
      },
    })
    let resolveSave!: (value: object) => void
    mocks.saveTrainingProgress.mockReturnValueOnce(new Promise((resolve) => { resolveSave = resolve }))
    const { unmount } = render(
      <TrainingVideoPlayer
        lessonId="lesson-1" title="Training video" provider="youtube" videoId="abcdef12345" videoVersion={2}
        progress={{ state: 'in_progress', started_at: '2026-10-01T00:00:00.000Z', last_opened_at: null, completed_at: null, last_position_seconds: 40, duration_seconds: 100, position_revision: 4 }}
      />,
    )
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() })
    act(() => events?.onReady({ target: player }))
    act(() => events?.onStateChange({ data: 1, target: player }))
    expect(mocks.saveTrainingProgress.mock.calls[0][1].last_position_seconds).toBe(40)
    await act(async () => {
      resolveSave({
        lesson_id: 'lesson-1', state: 'in_progress', started_at: '2026-10-01T00:00:00.000Z', last_opened_at: null,
        completed_at: null, watched_percent: 0, last_position_seconds: 55, duration_seconds: 100,
        position_revision: 5, video_version: 2, completion_source: null, position_accepted: false,
      })
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
    })
    expect(Object.keys(window.localStorage).some((candidate) => candidate.includes('lesson-1'))).toBe(false)
    act(() => { window.dispatchEvent(new Event('pagehide')) })
    const lastFetchCall = vi.mocked(fetch).mock.calls.at(-1)
    expect(lastFetchCall).toBeDefined()
    expect(JSON.parse(String(lastFetchCall?.[1]?.body)).last_position_seconds).toBe(55)
    unmount()
  })

  it('keeps a newer observed seek when an older save is rejected', async () => {
    let currentTime = 40
    let events: { onReady: (event: { target: unknown }) => void; onStateChange: (event: { data: number; target: unknown }) => void } | null = null
    const player = {
      getCurrentTime: () => currentTime, getDuration: () => 100, getPlaybackRate: () => 1,
      cueVideoById: vi.fn(), seekTo: vi.fn(), destroy: vi.fn(),
    }
    mocks.loadYouTubeApi.mockResolvedValue({
      PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 },
      Player: class {
        constructor(_iframe: HTMLIFrameElement, options: { events: typeof events }) { events = options.events; return player as never }
      },
    })
    let resolveSave!: (value: object) => void
    mocks.saveTrainingProgress.mockReturnValueOnce(new Promise((resolve) => { resolveSave = resolve }))
    const { unmount } = render(
      <TrainingVideoPlayer
        lessonId="lesson-1" title="Training video" provider="youtube" videoId="abcdef12345" videoVersion={2}
        progress={{ state: 'in_progress', started_at: '2026-10-01T00:00:00.000Z', last_opened_at: null, completed_at: null, last_position_seconds: 40, duration_seconds: 100, position_revision: 4 }}
      />,
    )
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() })
    act(() => events?.onReady({ target: player }))
    act(() => events?.onStateChange({ data: 1, target: player }))
    currentTime = 40.25
    await act(async () => { await vi.advanceTimersByTimeAsync(250) })
    act(() => events?.onStateChange({ data: 2, target: player }))
    await act(async () => {
      resolveSave({
        lesson_id: 'lesson-1', state: 'in_progress', started_at: '2026-10-01T00:00:00.000Z', last_opened_at: null,
        completed_at: null, watched_percent: 0, last_position_seconds: 55, duration_seconds: 100,
        position_revision: 5, video_version: 2, completion_source: null, position_accepted: false,
      })
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
    })
    expect(mocks.saveTrainingProgress.mock.calls.at(-1)?.[1]).toMatchObject({ last_position_seconds: 40.25, position_revision: 5 })
    unmount()
  })

  it('persists samples observed during an in-flight save and retries them after failure on pagehide', async () => {
    let currentTime = 0
    let events: { onReady: (event: { target: unknown }) => void; onStateChange: (event: { data: number; target: unknown }) => void } | null = null
    const player = {
      getCurrentTime: () => currentTime, getDuration: () => 100, getPlaybackRate: () => 1,
      cueVideoById: vi.fn(), seekTo: vi.fn(), destroy: vi.fn(),
    }
    mocks.loadYouTubeApi.mockResolvedValue({
      PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 },
      Player: class {
        constructor(_iframe: HTMLIFrameElement, options: { events: typeof events }) { events = options.events; return player as never }
      },
    })
    let rejectSave!: (error: Error) => void
    mocks.saveTrainingProgress.mockReturnValueOnce(new Promise((_resolve, reject) => { rejectSave = reject }))
    const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => ({
      ok: true, status: 200,
      json: async () => ({ lesson_id: 'lesson-1', state: 'in_progress', watched_percent: 0, last_position_seconds: 0.25, duration_seconds: 100, position_revision: 1, video_version: 2, position_accepted: true }),
    }))
    vi.stubGlobal('fetch', fetchMock)
    const { unmount } = render(
      <TrainingVideoPlayer
        lessonId="lesson-1" title="Training video" provider="youtube" videoId="abcdef12345" videoVersion={2}
        progress={{ state: 'not_started', started_at: null, last_opened_at: null, completed_at: null }}
      />,
    )
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() })
    act(() => events?.onReady({ target: player }))
    act(() => events?.onStateChange({ data: 1, target: player }))
    currentTime = 0.25
    await act(async () => { await vi.advanceTimersByTimeAsync(250) })
    act(() => { window.dispatchEvent(new Event('pagehide')) })
    const key = Object.keys(window.localStorage).find((candidate) => candidate.includes('lesson-1'))
    expect(JSON.parse(window.localStorage.getItem(key!)!).intervals).toEqual([[0, 0.25]])

    await act(async () => {
      rejectSave(new Error('network unavailable'))
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
    })
    expect(fetchMock).toHaveBeenCalled()
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string).intervals).toEqual([[0, 0.25]])
    unmount()
  })
})
