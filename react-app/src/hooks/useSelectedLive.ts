import { useState, useCallback, useEffect } from 'react'
import type { LiveAtual } from '../types/models'
import { getLiveAtualDaCabine, getLivePorId } from '../services/domain'

interface UseSelectedLiveOptions {
  liveId?: string | null
  cabineId?: string | null
  autoRefreshMs?: number  // 0 = sem auto-refresh
}

interface UseSelectedLiveResult {
  live: LiveAtual | null
  loading: boolean
  error: string | null
  refresh: () => void
  clear: () => void
}

export function useSelectedLive({ liveId, cabineId, autoRefreshMs = 0 }: UseSelectedLiveOptions): UseSelectedLiveResult {
  const [live, setLive] = useState<LiveAtual | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLive = useCallback(async () => {
    if (!liveId && !cabineId) {
      setLive(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      let result: LiveAtual | null = null
      if (liveId) {
        result = await getLivePorId(liveId)
      } else if (cabineId) {
        result = await getLiveAtualDaCabine(cabineId)
      }
      setLive(result)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar live'
      setError(msg)
      setLive(null)
    } finally {
      setLoading(false)
    }
  }, [liveId, cabineId])

  useEffect(() => {
    void fetchLive()
  }, [fetchLive])

  useEffect(() => {
    if (!autoRefreshMs || autoRefreshMs <= 0) return
    const interval = setInterval(() => void fetchLive(), autoRefreshMs)
    return () => clearInterval(interval)
  }, [fetchLive, autoRefreshMs])

  return {
    live,
    loading,
    error,
    refresh: () => void fetchLive(),
    clear: () => setLive(null),
  }
}
