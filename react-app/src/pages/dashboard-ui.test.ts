import { describe, expect, it } from 'vitest'
import { getPresenterRankingName, getPresenterRankingProgress } from './DashboardPage'

describe('Dashboard presenter ranking UI helpers', () => {
  it('uses backend presenter name aliases when nome is not present', () => {
    expect(getPresenterRankingName({ apresentadora_nome: 'Edja' })).toBe('Edja')
    expect(getPresenterRankingName({ apresentador_nome: 'Julia Florio' })).toBe('Julia Florio')
  })

  it('calculates progress relative to the top presenter GMV', () => {
    expect(getPresenterRankingProgress(3384, 3384)).toBe(100)
    expect(getPresenterRankingProgress(1692, 3384)).toBe(50)
    expect(getPresenterRankingProgress(0, 3384)).toBe(0)
  })
})
