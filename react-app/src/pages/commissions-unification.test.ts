import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const financeiroSource = readFileSync(new URL('./FinanceiroPage.tsx', import.meta.url), 'utf8')
const regrasSource = readFileSync(new URL('./ComissoesConfigPage.tsx', import.meta.url), 'utf8')

describe('comissões: apuração e regras', () => {
  it('keeps commission results in Financeiro and sends only franchisees to the rules route', () => {
    expect(financeiroSource).toContain("const podeConfigurarComissoes = user?.papel === 'franqueado'")
    expect(financeiroSource).toContain("pathname: '/financeiro/comissoes/regras'")
    expect(financeiroSource).toContain('Comissões do período')
    expect(financeiroSource).toContain('Valores calculados por apresentadora')
    expect(financeiroSource).toContain('Receita calculada por marca')
  })

  it('keeps rules as a separate administrative surface without widening financial access', () => {
    expect(regrasSource).toContain("const podeVerApuracao = user?.papel === 'franqueado'")
    expect(regrasSource).toContain("apuracaoParams.set('tab', 'comissoes')")
    expect(regrasSource).toContain('Os valores calculados do período ficam na apuração de comissões.')
    expect(regrasSource).not.toContain('getFinanceiroResumo')
    expect(regrasSource).not.toContain('getComissoesApresentadoras')
    expect(regrasSource).not.toContain('getComissoesMarcas')
  })
})
