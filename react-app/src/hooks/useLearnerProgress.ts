import { useCallback, useMemo, useState } from 'react'
import {
  markLessonComplete,
  markLessonOpened,
  readLearnerProgress,
  toggleLessonBookmark,
  type LearnerProgressContract,
} from '../services/knowledge-training'

export function useLearnerProgress(userId?: string) {
  const [progress, setProgress] = useState<LearnerProgressContract>(() => readLearnerProgress(userId ?? ''))

  const refresh = useCallback(() => {
    setProgress(readLearnerProgress(userId ?? ''))
  }, [userId])

  const openLesson = useCallback((materialId: string) => {
    if (!userId) return
    setProgress(markLessonOpened(userId, materialId))
  }, [userId])

  const completeLesson = useCallback((materialId: string) => {
    if (!userId) return
    setProgress(markLessonComplete(userId, materialId))
  }, [userId])

  const bookmarkLesson = useCallback((materialId: string) => {
    if (!userId) return
    setProgress(toggleLessonBookmark(userId, materialId))
  }, [userId])

  return useMemo(() => ({
    progress,
    refresh,
    openLesson,
    completeLesson,
    bookmarkLesson,
  }), [bookmarkLesson, completeLesson, openLesson, progress, refresh])
}
