import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const router = readFileSync(new URL('../routes/AppRouter.tsx', import.meta.url), 'utf8')

describe('Clientes e CRM', () => {
  it('keeps the portfolio and CRM under the existing commercial permission guard', () => {
    expect(router).toMatch(/allowedRoles=\{\[\.\.\.masterRoles, \.\.\.commercialRoles\]\}/)
    expect(router).toMatch(/path="\/clientes"[^\n]*<ClientesLayout/)
    expect(router).toMatch(/<Route index[^\n]*<ComercialPage/)
    expect(router).toMatch(/path="crm"[^\n]*<CrmPage/)
  })

  it('takes existing CRM bookmarks to the CRM tab', () => {
    expect(router).toMatch(/path="\/master\/crm"[^\n]*to="\/clientes\/crm"/)
    expect(router).toMatch(/path="\/leads"[^\n]*to="\/clientes\/crm"/)
  })
})
