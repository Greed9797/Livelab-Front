import type { TrainingProgressInput } from './training'

export type WatchInterval = [number, number]

export interface PendingTrainingWatch extends TrainingProgressInput {
  stored_position_revision: number
}

const MAX_SAMPLE_GAP_MS = 1_100
export function mergeWatchIntervals(intervals: WatchInterval[], durationSeconds?: number | null): WatchInterval[] {
  const maximum = Number.isFinite(durationSeconds) && durationSeconds! > 0 ? durationSeconds! : Number.POSITIVE_INFINITY
  const sorted = intervals
    .filter(([start, end]) => Number.isFinite(start) && Number.isFinite(end) && end > start)
    .map(([start, end]) => [Math.max(0, start), Math.min(maximum, end)] as WatchInterval)
    .filter(([start, end]) => end > start)
    .sort((left, right) => left[0] - right[0])
  const merged: WatchInterval[] = []
  for (const [start, end] of sorted) {
    const previous = merged[merged.length - 1]
    if (previous && start <= previous[1]) previous[1] = Math.max(previous[1], end)
    else merged.push([start, end])
  }
  return merged.map(([start, end]) => [roundSecond(start), roundSecond(end)])
}

export function subtractWatchIntervals(source: WatchInterval[], acknowledged: WatchInterval[]): WatchInterval[] {
  let remaining = mergeWatchIntervals(source)
  for (const [removeStart, removeEnd] of mergeWatchIntervals(acknowledged)) {
    remaining = remaining.flatMap(([start, end]) => {
      if (removeEnd <= start || removeStart >= end) return [[start, end] as WatchInterval]
      const parts: WatchInterval[] = []
      if (removeStart > start) parts.push([start, Math.min(end, removeStart)])
      if (removeEnd < end) parts.push([Math.max(start, removeEnd), end])
      return parts
    })
  }
  return mergeWatchIntervals(remaining)
}

function roundSecond(value: number): number {
  return Math.round(value * 100) / 100
}

export class TrainingWatchCollector {
  private intervals: WatchInterval[] = []
  private sample: { position: number; wallTime: number } | null = null
  private isPlaying = false
  private didStart = false
  private duration: number | null = null
  private position = 0
  private acknowledgedPositionRevision: number

  constructor(initial: { position?: number; duration?: number | null; positionRevision?: number; intervals?: WatchInterval[] } = {}) {
    this.position = finiteNonnegative(initial.position) ?? 0
    this.duration = finitePositive(initial.duration)
    this.acknowledgedPositionRevision = finiteNonnegative(initial.positionRevision) ?? 0
    this.intervals = mergeWatchIntervals(initial.intervals ?? [], this.duration)
  }

  get started(): boolean { return this.didStart }
  get playing(): boolean { return this.isPlaying }
  get lastPositionSeconds(): number { return this.position }
  get durationSeconds(): number | null { return this.duration }
  get positionRevision(): number { return this.acknowledgedPositionRevision }
  get pendingIntervals(): WatchInterval[] { return this.intervals.map(([start, end]) => [start, end]) }

  setPlaying(playing: boolean): boolean {
    const newlyStarted = playing && !this.didStart
    if (playing) this.didStart = true
    this.isPlaying = playing
    this.sample = null
    return newlyStarted
  }

  observe(position: number, duration: number, playbackRate: number, wallTime: number): boolean {
    const nextPosition = finiteNonnegative(position)
    const nextDuration = finitePositive(duration)
    if (nextPosition === null || !Number.isFinite(wallTime)) return false
    if (nextDuration !== null) this.duration = nextDuration
    this.position = this.duration === null ? nextPosition : Math.min(nextPosition, this.duration)

    if (!this.isPlaying) {
      this.sample = null
      return false
    }

    const previous = this.sample
    if (!previous) {
      this.sample = { position: this.position, wallTime }
      return false
    }

    const elapsedMs = wallTime - previous.wallTime
    const elapsedSeconds = elapsedMs / 1_000
    const mediaDelta = this.position - previous.position
    const rate = Number.isFinite(playbackRate) && playbackRate > 0 ? playbackRate : 1
    if (elapsedMs <= 0) return false
    if (mediaDelta === 0) {
      // Some players report whole-second positions. Keep elapsed wall time
      // anchored to the last media-time change so a 1s tick stays plausible.
      // Rebase after a long unchanged period without crediting or flushing it.
      if (elapsedMs > MAX_SAMPLE_GAP_MS) this.sample = { position: this.position, wallTime }
      return false
    }
    this.sample = { position: this.position, wallTime }
    if (elapsedMs > MAX_SAMPLE_GAP_MS) return true
    if (mediaDelta < 0) return true

    // A discontinuity larger than plausible playback is treated as a seek or an ambiguous sample.
    const expected = elapsedSeconds * rate
    const plausibleMaximum = expected + Math.max(0.08, expected * 0.2)
    if (mediaDelta > plausibleMaximum) return true

    // Credit no more than elapsed playback at the observed rate; stalls can reduce credit but never add it.
    const creditedEnd = Math.min(this.position, previous.position + expected)
    this.intervals = mergeWatchIntervals([...this.intervals, [previous.position, creditedEnd]], this.duration)
    return false
  }

  acknowledge(intervals: WatchInterval[], positionRevision: number): void {
    this.intervals = subtractWatchIntervals(this.intervals, intervals)
    const revision = finiteNonnegative(positionRevision)
    if (revision !== null) this.acknowledgedPositionRevision = Math.max(this.acknowledgedPositionRevision, revision)
  }

  acknowledgePositionRevision(positionRevision: number): void {
    const revision = finiteNonnegative(positionRevision)
    if (revision !== null) this.acknowledgedPositionRevision = Math.max(this.acknowledgedPositionRevision, revision)
  }

  replaceServerPosition(position: number, duration: number | null, positionRevision: number): void {
    const serverPosition = finiteNonnegative(position)
    if (serverPosition !== null) this.position = serverPosition
    const serverDuration = finitePositive(duration)
    if (serverDuration !== null) this.duration = serverDuration
    const revision = finiteNonnegative(positionRevision)
    if (revision !== null) this.acknowledgedPositionRevision = Math.max(this.acknowledgedPositionRevision, revision)
  }

  payload(videoVersion: number): TrainingProgressInput | null {
    if (!this.didStart || !this.duration || this.duration <= 0) return null
    return {
      video_version: videoVersion,
      duration_seconds: this.duration,
      last_position_seconds: Math.max(0, Math.min(this.position, this.duration)),
      position_revision: this.acknowledgedPositionRevision,
      intervals: this.pendingIntervals,
      playback_started: true,
    }
  }
}

export function trainingWatchStorageKey(scope: { tenantId: string; userId: string; lessonId: string; videoVersion: number }): string {
  return `livelab:training-watch:v1:${encodeURIComponent(scope.tenantId)}:${encodeURIComponent(scope.userId)}:${encodeURIComponent(scope.lessonId)}:${scope.videoVersion}:${trainingWatchTabId()}`
}

function trainingWatchTabId(): string {
  try {
    const key = 'livelab:training-watch:tab-id'
    const existing = window.sessionStorage.getItem(key)
    if (existing) return existing
    const generated = typeof window.crypto?.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
    window.sessionStorage.setItem(key, generated)
    return generated
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  }
}

export function readPendingTrainingWatch(storageKey: string): PendingTrainingWatch | null {
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PendingTrainingWatch>
    if (parsed.playback_started !== true || !Array.isArray(parsed.intervals) || !Number.isFinite(parsed.video_version) || !Number.isFinite(parsed.duration_seconds)) return null
    const intervals = mergeWatchIntervals(parsed.intervals as WatchInterval[], Number(parsed.duration_seconds))
    return {
      video_version: Number(parsed.video_version),
      duration_seconds: Number(parsed.duration_seconds),
      last_position_seconds: finiteNonnegative(parsed.last_position_seconds) ?? 0,
      position_revision: finiteNonnegative(parsed.position_revision) ?? 0,
      stored_position_revision: finiteNonnegative(parsed.stored_position_revision) ?? finiteNonnegative(parsed.position_revision) ?? 0,
      intervals,
      playback_started: true,
    }
  } catch {
    return null
  }
}

export function writePendingTrainingWatch(storageKey: string, payload: TrainingProgressInput, storedPositionRevision = payload.position_revision): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify({ ...payload, stored_position_revision: storedPositionRevision }))
  } catch {
    // Progress remains in memory when browser storage is unavailable.
  }
}

export function clearPendingTrainingWatch(storageKey: string): void {
  try { window.localStorage.removeItem(storageKey) } catch { /* Storage can be unavailable. */ }
}

function finiteNonnegative(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

function finitePositive(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}
