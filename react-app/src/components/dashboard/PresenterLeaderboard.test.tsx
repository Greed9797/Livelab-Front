import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  PresenterLeaderboard,
  getPresenterLeaderboardName,
  getPresenterLeaderboardProgress,
  getPresenterSparklinePoints,
} from './PresenterLeaderboard'

const rows = [
  {
    id: 'ap-1',
    apresentadora_nome: 'Edja',
    cabine_nome: 'C-04',
    gmv: 3384,
    lives: 12,
    pedidos: 282,
    total_recebido: 2716.93,
    comissao_apresentadora: 16.93,
  },
  {
    id: 'ap-2',
    apresentador_nome: 'Jady',
    cabine_numero: 2,
    gmv_total: 904,
    total_lives: 6,
    pedidos: 151,
    comissao_variavel: 4.52,
  },
  {
    id: 'ap-3',
    nome: 'Jhemily',
    gmv_total: 707,
    lives: 5,
    pedidos: 141,
    comissao_apresentadora: 3.54,
  },
]

describe('PresenterLeaderboard', () => {
  it('resolves presenter names from all backend aliases', () => {
    expect(getPresenterLeaderboardName({ nome: 'Julia Florio' })).toBe('Julia Florio')
    expect(getPresenterLeaderboardName({ apresentadora_nome: 'Edja' })).toBe('Edja')
    expect(getPresenterLeaderboardName({ apresentador_nome: 'Jady' })).toBe('Jady')
    expect(getPresenterLeaderboardName({})).toBe('—')
  })

  it('calculates progress relative to the leader without invalid values', () => {
    expect(getPresenterLeaderboardProgress(3384, 3384)).toBe(100)
    expect(getPresenterLeaderboardProgress(1692, 3384)).toBe(50)
    expect(getPresenterLeaderboardProgress(0, 3384)).toBe(0)
    expect(getPresenterLeaderboardProgress(10, 0)).toBe(0)
  })

  it('builds deterministic finite sparkline points', () => {
    const first = getPresenterSparklinePoints(rows[1], 1)
    const second = getPresenterSparklinePoints(rows[1], 1)

    expect(first).toEqual(second)
    expect(first).toHaveLength(7)
    expect(first.every((point) => Number.isFinite(point) && point >= 0 && point <= 100)).toBe(true)
  })

  it('renders a cinematic leaderboard without generic table emoji output', () => {
    const html = renderToStaticMarkup(
      <PresenterLeaderboard
        rows={rows}
        title="Ranking de apresentadoras"
        subtitle="Progresso vs. líder"
        action={<a href="/ranking-apresentadoras">Ver todas</a>}
        limit={3}
      />,
    )

    expect(html).toContain('Ranking de apresentadoras')
    expect(html).toContain('Edja')
    expect(html).toContain('Jady')
    expect(html).toContain('Topo do mês')
    expect(html).toContain('Pódio')
    expect(html).not.toMatch(/🥇|🥈|🥉|NaN|undefined/)
  })

  it('renders an empty state safely', () => {
    const html = renderToStaticMarkup(<PresenterLeaderboard rows={[]} />)

    expect(html).toContain('Nenhuma apresentadora com GMV registrado')
    expect(html).not.toMatch(/NaN|undefined/)
  })
})
