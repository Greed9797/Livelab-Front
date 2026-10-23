import { useEffect, useId, useRef, useState } from 'react'
import { api } from '../../services/api'
import {
  TrainingWatchCollector,
  clearPendingTrainingWatch,
  readPendingTrainingWatch,
  trainingWatchStorageKey,
  writePendingTrainingWatch,
  type WatchInterval,
} from '../../services/training-watch'
import { loadPandaApi, loadYouTubeApi, type PandaPlayerInstance, type YouTubePlayer } from '../../services/training-video-sdk'
import { saveTrainingProgress, type TrainingLessonProgress, type TrainingProgressInput, type TrainingProgressSaveResponse } from '../../services/training'
import { getAccessToken } from '../../services/auth-storage'
import { useAuthStore, useCurrentUser } from '../../stores/auth-store'
import { pandaIdFromUrl, safeExternalUrl, youtubeIdFromUrl } from '../../services/knowledge'

type Provider = 'youtube' | 'panda'

interface TrainingVideoPlayerProps {
  lessonId: string
  title: string
  provider: Provider
  videoId?: string | null
  videoUrl?: string | null
  libraryId?: string | null
  videoVersion: number
  progress: TrainingLessonProgress
  onProgressSaved?: (progress: TrainingProgressSaveResponse) => void
}

const SAMPLE_INTERVAL_MS = 250
const SAVE_INTERVAL_MS = 15_000

function resolvedVideoId(provider: Provider, id?: string | null, url?: string | null): string | null {
  const candidate = id?.trim() || (provider === 'youtube' ? youtubeIdFromUrl(url) : pandaIdFromUrl(url))
  return candidate && /^[A-Za-z0-9_-]{6,}$/.test(candidate) ? candidate : null
}

function pandaLibraryFromUrl(value?: string | null): string | null {
  const href = safeExternalUrl(value)
  if (!href) return null
  try {
    const url = new URL(href)
    const host = url.hostname.toLowerCase()
    const hostLibrary = host.match(/^player-(vz-[a-z0-9-]+)\.tv\.pandavideo\.com\.br$/)?.[1]
    if (hostLibrary) return hostLibrary
    if (host !== 'player.pandavideo.com.br') return null
    const library = url.searchParams.get('library_id') || url.searchParams.get('pullzone_name') || url.searchParams.get('library')
    return library && /^vz-[A-Za-z0-9_-]+$/.test(library) ? library : null
  } catch { return null }
}

function watchProgressUrl(lessonId: string): string {
  const base = api.defaults.baseURL?.replace(/\/+$/, '') || window.location.origin
  return new URL(`${base}/training/lessons/${encodeURIComponent(lessonId)}/progress`, window.location.origin).toString()
}

function pandaEventRate(event: object): number | null {
  for (const key of ['speed', 'playbackRate', 'currentSpeed', 'rate']) {
    if (key in event) {
      const value = (event as Record<string, unknown>)[key]
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
    }
  }
  return null
}

export function TrainingVideoPlayer({
  lessonId,
  title,
  provider,
  videoId,
  videoUrl,
  libraryId,
  videoVersion,
  progress,
  onProgressSaved,
}: TrainingVideoPlayerProps) {
  const user = useCurrentUser()
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const pandaHostId = `training-panda-${reactId}`
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const pandaIframeRef = useRef<HTMLIFrameElement>(null)
  const callbackRef = useRef(onProgressSaved)
  const progressRef = useRef(progress)
  const retryRef = useRef<() => void>(() => undefined)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState(false)
  const [savedProgress, setSavedProgress] = useState<TrainingProgressSaveResponse | null>(null)
  const resolvedId = resolvedVideoId(provider, videoId, videoUrl)
  const actualLibraryId = libraryId?.trim() || pandaLibraryFromUrl(videoUrl)
  const fallbackUrl = safeExternalUrl(videoUrl)
  const tenantId = user?.tenant_id
  const userId = user?.id

  useEffect(() => { callbackRef.current = onProgressSaved }, [onProgressSaved])
  useEffect(() => { progressRef.current = progress }, [progress])

  useEffect(() => {
    let disposed = false
    let player: YouTubePlayer | PandaPlayerInstance | null = null
    let sampleTimer: number | null = null
    let lastSaveAttempt = 0
    let inFlight: Promise<void> | null = null
    let flushAgain = false
    let keepaliveAfterFlight = false
    let pandaPlaybackRate = 1
    let observationCount = 0

    const scopeReady = Boolean(tenantId && userId)
    const sessionMatches = () => {
      const current = useAuthStore.getState().user
      return Boolean(scopeReady && current?.tenant_id === tenantId && current?.id === userId)
    }
    const storageKey = scopeReady
      ? trainingWatchStorageKey({ tenantId: tenantId!, userId: userId!, lessonId, videoVersion })
      : null
    const stored = storageKey ? readPendingTrainingWatch(storageKey) : null
    let hasStartRequest = Boolean(stored)
    const currentRevision = progressRef.current.position_revision ?? 0
    const storedPositionMatchesServer = stored?.stored_position_revision === currentRevision
    const resumePosition = storedPositionMatchesServer
      ? stored?.last_position_seconds ?? 0
      : progressRef.current.last_position_seconds ?? 0
    const collector = new TrainingWatchCollector({
      position: resumePosition,
      duration: stored?.duration_seconds ?? progressRef.current.duration_seconds,
      positionRevision: currentRevision,
      intervals: stored?.intervals,
    })
    if (stored && stored.video_version === videoVersion) {
      collector.setPlaying(true)
      collector.setPlaying(false)
      if (!storedPositionMatchesServer) {
        collector.replaceServerPosition(
          progressRef.current.last_position_seconds ?? 0,
          progressRef.current.duration_seconds ?? stored.duration_seconds,
          currentRevision,
        )
      }
    }

    const readTime = () => {
      if (!player) return null
      try {
        const current = provider === 'youtube'
          ? (player as YouTubePlayer).getCurrentTime()
          : (player as PandaPlayerInstance).getCurrentTime()
        const duration = provider === 'youtube'
          ? (player as YouTubePlayer).getDuration()
          : (player as PandaPlayerInstance).getDuration()
        const rate = provider === 'youtube'
          ? (player as YouTubePlayer).getPlaybackRate()
          : (player as PandaPlayerInstance).getSpeed?.() ?? pandaPlaybackRate
        if (!Number.isFinite(current) || !Number.isFinite(duration) || current < 0 || duration <= 0) return null
        return { current, duration, rate: Number.isFinite(rate) && rate > 0 ? rate : 1 }
      } catch {
        return null
      }
    }

    const payloadSnapshot = (): TrainingProgressInput | null => collector.payload(videoVersion)

    const applySaveResponse = (response: TrainingProgressSaveResponse, sentIntervals: WatchInterval[], sentObservationCount: number) => {
      collector.acknowledge(sentIntervals, response.position_revision ?? collector.positionRevision)
      // If the server rejected this revision and playback has not produced a newer
      // position observation, use its position before retrying the remaining batch.
      // Otherwise a retry could resend a stale back-seek with the fresh revision.
      if (response.position_accepted === false && observationCount === sentObservationCount) {
        collector.replaceServerPosition(
          response.last_position_seconds ?? collector.lastPositionSeconds,
          response.duration_seconds ?? collector.durationSeconds,
          response.position_revision ?? collector.positionRevision,
        )
      }
      const remaining = payloadSnapshot()
      if (storageKey) {
        const needsPositionRetry = response.position_accepted === false && observationCount !== sentObservationCount
        if (remaining && (collector.pendingIntervals.length > 0 || needsPositionRetry)) writePendingTrainingWatch(storageKey, remaining, collector.positionRevision)
        else clearPendingTrainingWatch(storageKey)
      }
      if (!disposed) {
        setSaveError(false)
        setSavedProgress(response)
        callbackRef.current?.(response)
      }
    }

    const sendKeepalive = async (payload: TrainingProgressInput): Promise<TrainingProgressSaveResponse> => {
      if (!sessionMatches()) throw new Error('Authenticated user changed')
      const token = getAccessToken()
      if (!token) throw new Error('Missing authenticated session')
      const response = await fetch(watchProgressUrl(lessonId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
        keepalive: true,
      })
      if (!response.ok) throw new Error(`Progress save failed (${response.status})`)
      return await response.json() as TrainingProgressSaveResponse
    }

    let flush: (keepalive?: boolean) => Promise<void>
    flush = (keepalive = false) => {
      if (!sessionMatches()) return Promise.resolve()
      const payload = payloadSnapshot()
      if (payload && storageKey) writePendingTrainingWatch(storageKey, payload, collector.positionRevision)
      if (inFlight) {
        flushAgain = true
        keepaliveAfterFlight ||= keepalive
        return inFlight
      }
      if (!payload) return Promise.resolve()
      const sentIntervals = payload.intervals.map(([start, end]) => [start, end] as WatchInterval)
      const sentObservationCount = observationCount
      lastSaveAttempt = performance.now()
      const request = async () => {
        try {
          const response = keepalive
            ? await sendKeepalive(payload)
            : await saveTrainingProgress(lessonId, payload)
          applySaveResponse(response, sentIntervals, sentObservationCount)
        } catch {
          if (!disposed) setSaveError(true)
          if (storageKey) {
            const pendingPayload = payloadSnapshot()
            if (pendingPayload) writePendingTrainingWatch(storageKey, pendingPayload, collector.positionRevision)
          }
        }
      }
      const pending = request()
      inFlight = pending
      void pending.then(() => {
        inFlight = null
        if (flushAgain) {
          const nextKeepalive = keepaliveAfterFlight
          flushAgain = false
          keepaliveAfterFlight = false
          void flush(nextKeepalive)
        }
      })
      return pending
    }

    const observe = () => {
      const time = readTime()
      if (!time) return
      observationCount += 1
      const discontinuity = collector.observe(time.current, time.duration, time.rate, performance.now())
      if (discontinuity && collector.started) void flush()
      const now = performance.now()
      if (collector.started && !hasStartRequest && payloadSnapshot()) {
        hasStartRequest = true
        void flush()
      }
      if (collector.playing && now - lastSaveAttempt >= SAVE_INTERVAL_MS) void flush()
    }

    const sampleTick = () => {
      if (provider === 'panda' && player) {
        try {
          if ((player as PandaPlayerInstance).isPaused()) {
            stopPlayback()
            return
          }
        } catch { return }
      }
      observe()
    }

    const startSampling = () => {
      if (sampleTimer !== null) window.clearInterval(sampleTimer)
      sampleTimer = window.setInterval(sampleTick, SAMPLE_INTERVAL_MS)
    }

    const stopSampling = () => {
      if (sampleTimer !== null) window.clearInterval(sampleTimer)
      sampleTimer = null
    }

    const stopPlayback = (shouldFlush = true) => {
      if (collector.playing) observe()
      collector.setPlaying(false)
      stopSampling()
      if (shouldFlush && collector.started) void flush()
    }

    const startPlayback = () => {
      const newlyStarted = collector.setPlaying(true)
      observe()
      startSampling()
      if (newlyStarted || stored) {
        hasStartRequest = true
        void flush()
      }
    }
    retryRef.current = () => { void flush() }
    const handlePageHide = () => {
      if (collector.started && sessionMatches()) void flush(true)
    }
    window.addEventListener('pagehide', handlePageHide)

    if (!resolvedId) {
      setError('Este vídeo não tem um identificador válido para o player.')
      return () => { disposed = true; window.removeEventListener('pagehide', handlePageHide) }
    }
    if (provider === 'panda' && !actualLibraryId) {
      setError('Este vídeo Panda precisa do identificador da biblioteca para carregar o player.')
      return () => { disposed = true; window.removeEventListener('pagehide', handlePageHide) }
    }

    if (provider === 'youtube') {
      void loadYouTubeApi().then((api) => {
        if (disposed || !iframeRef.current) return
        player = new api.Player(iframeRef.current, {
          events: {
            onReady: ({ target }) => {
              if (disposed) return
              if (resumePosition > 0) target.cueVideoById({ videoId: resolvedId, startSeconds: resumePosition })
              setReady(true)
              player = target
              if (stored) void flush()
            },
            onStateChange: ({ data, target }) => {
              if (disposed) return
              player = target
              if (data === api.PlayerState.PLAYING) startPlayback()
              else stopPlayback(true)
            },
            onError: () => { if (!disposed) setError('O player do YouTube não conseguiu carregar este vídeo.') },
          },
        })
      }).catch(() => { if (!disposed) setError('Não foi possível carregar o player do YouTube.') })
    } else {
      void loadPandaApi().then((PandaPlayer) => {
        if (disposed || !pandaIframeRef.current) return
        let instance: PandaPlayerInstance | null = null
        instance = new PandaPlayer(pandaHostId, {
          onReady: () => {
            if (disposed) return
            if (resumePosition > 0) instance?.setCurrentTime(resumePosition)
            setReady(true)
            if (stored) void flush()
          },
          onError: () => { if (!disposed) setError('O player Panda não conseguiu carregar este vídeo.') },
        })
        player = instance
        instance.onEvent((rawEvent) => {
          if (disposed || !rawEvent || typeof rawEvent !== 'object') return
          const message = 'message' in rawEvent && typeof rawEvent.message === 'string' ? rawEvent.message : ''
          if (message === 'panda_speed_update') pandaPlaybackRate = pandaEventRate(rawEvent) ?? (instance?.getSpeed?.() ?? pandaPlaybackRate)
          if (message === 'panda_play') startPlayback()
          else if (message === 'panda_pause' || message === 'panda_ended' || message === 'panda_seeking' || message === 'panda_error') stopPlayback(true)
          else if (message === 'panda_seeked') {
            try { if (instance && !instance.isPaused()) startPlayback() } catch { /* Ignore a late seek event during teardown. */ }
          }
          else if ((message === 'panda_timeupdate' || message === 'panda_speed_update') && collector.playing) observe()
        })
        if (!instance) return
        player = instance
      }).catch(() => { if (!disposed) setError('Não foi possível carregar o player Panda.') })
    }

    return () => {
      window.removeEventListener('pagehide', handlePageHide)
      if (collector.playing) observe()
      collector.setPlaying(false)
      disposed = true
      retryRef.current = () => undefined
      if (sampleTimer !== null) window.clearInterval(sampleTimer)
      if (collector.started) {
        if (inFlight) {
          flushAgain = true
          keepaliveAfterFlight = true
          void inFlight.then(() => {
            if (flushAgain) {
              flushAgain = false
              keepaliveAfterFlight = false
              void flush(true)
            }
          })
        } else void flush(true)
      }
      try { player?.destroy() } catch { /* Player teardown can race SDK disposal. */ }
      player = null
    }
  }, [lessonId, provider, resolvedId, actualLibraryId, videoVersion, tenantId, userId])

  const youtubeSrc = resolvedId && provider === 'youtube'
    ? `https://www.youtube.com/embed/${encodeURIComponent(resolvedId)}?enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&playsinline=1&controls=1&rel=0`
    : undefined
  const pandaSrc = resolvedId && actualLibraryId && provider === 'panda'
    ? `https://player-${encodeURIComponent(actualLibraryId)}.tv.pandavideo.com.br/embed/?v=${encodeURIComponent(resolvedId)}&saveProgress=false`
    : undefined
  const watchedPercent = savedProgress?.watched_percent ?? progress.watched_percent

  return (
    <figure className="space-y-2">
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-line bg-black">
        {provider === 'youtube' ? (
          <iframe
            ref={iframeRef}
            title={`Vídeo: ${title}`}
            src={youtubeSrc}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <iframe
            ref={pandaIframeRef}
            id={pandaHostId}
            title={`Vídeo: ${title}`}
            src={pandaSrc}
            className="absolute inset-0 h-full w-full border-0"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-muted" aria-live="polite">
        {error ? (
          <span role="alert">{error}{fallbackUrl ? <> <a className="font-semibold text-brand underline-offset-2 hover:underline" href={fallbackUrl} target="_blank" rel="noopener noreferrer">Abrir o vídeo</a></> : null}</span>
        ) : saveError ? (
          <span role="alert" className="flex flex-wrap items-center gap-2">
            Não foi possível salvar o progresso.
            <button type="button" className="font-semibold text-brand underline-offset-2 hover:underline" onClick={() => retryRef.current()}>Tentar novamente</button>
          </span>
        ) : watchedPercent != null ? (
          <span>Progresso assistido: {Math.round(watchedPercent)}%</span>
        ) : ready && progress.completion_source === 'legacy' && progress.state === 'completed' ? (
          <span>Aula concluída anteriormente · progresso assistido não medido</span>
        ) : ready ? <span>O progresso é salvo durante a reprodução.</span> : <span className="sr-only">Carregando player</span>}
      </div>
    </figure>
  )
}
