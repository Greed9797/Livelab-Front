import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * "Zero" e "não sei" não podem ser a mesma coisa na tela.
 *
 * asNumber(undefined) devolve 0, então um agregado AUSENTE na resposta virava um card
 * afirmando "R$ 0" — indistinguível de um mês sem faturamento. Foi assim que o bug do tenant
 * na conexão apareceu: o backend devolvia 200 com alguns agregados vazios e a Home afirmava
 * que não houve GMV nem horas, enquanto ranking e gráfico mostravam dinheiro. O dono leu como
 * "os dados não carregam".
 *
 * A causa está corrigida no backend. Esta guarda mantém a regra: se um agregado sumir de
 * novo, a tela admite que não sabe em vez de mentir um zero.
 */
describe('KpiStrip — campo ausente vira "—", não 0', () => {
  const src = readFileSync(new URL('./KpiStrip.tsx', import.meta.url), 'utf8')

  it('existe o helper que distingue ausente de zero', () => {
    expect(src).toMatch(/const ausente = \(\.\.\.chaves: string\[\]\)/)
    expect(src).toContain('=== undefined')
    expect(src).toContain('=== null')
  })

  const cards = [
    ['Lives realizadas', /lives_mes/],
    ['Horas em live', /horas_live/],
    ['GMV / live', /gmv_por_live/],
    ['GMV / hora', /gmv_por_hora/],
  ] as const

  for (const [label, chave] of cards) {
    it(`card "${label}" cai em "—" quando o campo não veio`, () => {
      // pega o bloco do card e confere que o value passa pelo guard de ausência
      const bloco = src.split(`label: '${label}'`)[1]?.slice(0, 400) ?? ''
      expect(bloco, `card ${label} não encontrado`).not.toBe('')
      const linhaValue = bloco.split('\n').find((l) => l.trim().startsWith('value:')) ?? ''
      expect(linhaValue).toContain('ausente(')
      expect(linhaValue).toContain("'—'")
      expect(linhaValue).toMatch(chave)
    })
  }

  it('o estado de carregamento continua mostrando "—" em vez de zero', () => {
    expect(src).toContain("value={loading ? '—' : item.value}")
  })
})
