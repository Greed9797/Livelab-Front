/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest'
import {
  TrainingWatchCollector,
  clearPendingTrainingWatch,
  mergeWatchIntervals,
  readPendingTrainingWatch,
  subtractWatchIntervals,
  trainingWatchStorageKey,
  writePendingTrainingWatch,
} from './training-watch'

describe('training watch collection', () => {
  it('merges overlap and repeated playback without counting the same time twice', () => {
    expect(mergeWatchIntervals([[0, 5], [3, 8], [7.99, 10], [20, 21]], 30)).toEqual([[0, 10], [20, 21]])
    expect(mergeWatchIntervals([[0, 1], [1.01, 2]])).toEqual([[0, 1], [1.01, 2]])
    expect(subtractWatchIntervals([[0, 10]], [[3, 7]])).toEqual([[0, 3], [7, 10]])
  })

  it('records only observed forward playback and discards seeks and long sample gaps', () => {
    const collector = new TrainingWatchCollector({ duration: 40 })
    collector.setPlaying(true)
    collector.observe(0, 40, 1, 0)
    collector.observe(0.25, 40, 1, 250)
    collector.observe(0.5, 40, 1, 500)
    collector.observe(20, 40, 1, 750) // seek forward
    collector.observe(20.25, 40, 1, 1_000)
    collector.observe(10, 40, 1, 1_250) // seek backward
    collector.observe(10.25, 40, 1, 2_500) // ambiguous sampling gap
    expect(collector.pendingIntervals).toEqual([[0, 0.5], [20, 20.25]])
  })

  it('accumulates elapsed time for a quantized clock, reaches 90% once, and excludes repeats and seeks', () => {
    const collector = new TrainingWatchCollector({ duration: 10 })
    collector.setPlaying(true)

    const sampleQuantizedClock = (wallStart: number) => {
      for (let tick = 0; tick <= 36; tick += 1) {
        const wallTime = wallStart + tick * 250
        const position = Math.min(9, Math.floor(tick / 4))
        collector.observe(position, 10, 1, wallTime)
      }
    }

    sampleQuantizedClock(0)
    const firstPass = collector.pendingIntervals
    expect(firstPass).toEqual([[0, 9]])
    expect(firstPass.reduce((total, [start, end]) => total + end - start, 0) / 10).toBe(0.9)

    collector.observe(0, 10, 1, 9_250) // Backward seek.
    sampleQuantizedClock(9_250)
    expect(collector.pendingIntervals).toEqual([[0, 9]])

    collector.observe(10, 10, 1, 18_500) // Forward seek after the repeat.
    expect(collector.pendingIntervals).toEqual([[0, 9]])
  })

  it('credits observed playback at the reported rate, but none while paused or buffered', () => {
    const collector = new TrainingWatchCollector({ duration: 30 })
    collector.setPlaying(true)
    collector.observe(0, 30, 1.5, 0)
    collector.observe(0.375, 30, 1.5, 250)
    collector.setPlaying(false)
    collector.observe(2, 30, 1.5, 500)
    collector.setPlaying(true)
    collector.observe(5, 30, 1.5, 750)
    expect(collector.pendingIntervals).toEqual([[0, 0.38]])
  })

  it('does not produce a progress payload before observed playback or invent completion', () => {
    const collector = new TrainingWatchCollector({ duration: 100 })
    expect(collector.payload(1)).toBeNull()
    collector.setPlaying(true)
    collector.observe(95, 100, 1, 0)
    collector.observe(95.25, 100, 1, 250)
    const payload = collector.payload(1)
    expect(payload).toMatchObject({ playback_started: true, intervals: [[95, 95.25]], video_version: 1 })
    expect(payload).not.toHaveProperty('state')
    expect(payload).not.toHaveProperty('completed_at')
  })

  it('keeps intervals added while a saved batch is awaiting acknowledgement', () => {
    const collector = new TrainingWatchCollector({ duration: 30 })
    collector.setPlaying(true)
    collector.observe(0, 30, 1, 0)
    collector.observe(0.25, 30, 1, 250)
    const sent = collector.pendingIntervals
    collector.observe(0.5, 30, 1, 500)
    collector.acknowledge(sent, 2)
    expect(collector.positionRevision).toBe(2)
    expect(collector.pendingIntervals).toEqual([[0.25, 0.5]])
    expect(collector.lastPositionSeconds).toBe(0.5)
  })

  it('accepts a server revision without replacing a newer local position after a backward seek', () => {
    const collector = new TrainingWatchCollector({ duration: 30, position: 20, positionRevision: 3 })
    collector.setPlaying(true)
    collector.observe(20, 30, 1, 0)
    collector.observe(10, 30, 1, 250)
    collector.acknowledgePositionRevision(4)
    expect(collector.positionRevision).toBe(4)
    expect(collector.lastPositionSeconds).toBe(10)
  })

  it('scopes retry storage by tenant, user, lesson, and video version', () => {
    const key = trainingWatchStorageKey({ tenantId: 'tenant-a', userId: 'user-a', lessonId: 'lesson-a', videoVersion: 2 })
    const collector = new TrainingWatchCollector({ duration: 10 })
    collector.setPlaying(true)
    collector.observe(0, 10, 1, 0)
    collector.observe(0.5, 10, 1, 500)
    const payload = collector.payload(2)!
    writePendingTrainingWatch(key, payload, 0)
    expect(readPendingTrainingWatch(key)).toMatchObject({ ...payload, stored_position_revision: 0 })
    expect(trainingWatchStorageKey({ tenantId: 'tenant-b', userId: 'user-a', lessonId: 'lesson-a', videoVersion: 2 })).not.toBe(key)
    const otherTabKey = (() => {
      window.sessionStorage.clear()
      return trainingWatchStorageKey({ tenantId: 'tenant-a', userId: 'user-a', lessonId: 'lesson-a', videoVersion: 2 })
    })()
    expect(otherTabKey).not.toBe(key)
    clearPendingTrainingWatch(key)
    expect(readPendingTrainingWatch(key)).toBeNull()
  })
})
