import { useQuery } from '@tanstack/react-query'
import { getOperationalGoals, operationalGoalsRequest } from '../services/domain'
import { QK } from '../services/query-keys'
import type { OperationalGoalsResponse } from '../types/operational-goals'
import { getSaoPauloDateInput } from '../utils/sao-paulo-date'

export function useOperationalGoals({
  from,
  to,
  tenantId,
  marcaId,
  apresentadoraId,
  enabled = true,
}: {
  from: string
  to: string
  tenantId?: string
  marcaId?: string
  apresentadoraId?: string
  enabled?: boolean
}) {
  const today = getSaoPauloDateInput(new Date())
  const dailyLegacy = from === to && !marcaId && !apresentadoraId
  return useQuery<OperationalGoalsResponse>({
    queryKey: dailyLegacy
      ? QK.operationalGoals(from, tenantId)
      : QK.operationalGoalsRange(from, to, tenantId, marcaId, apresentadoraId),
    queryFn: () => getOperationalGoals(operationalGoalsRequest(from, to, marcaId, apresentadoraId)),
    enabled: enabled && Boolean(tenantId),
    staleTime: 15_000,
    refetchInterval: to === today ? 60_000 : false,
  })
}
