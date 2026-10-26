import { expect, test } from '@playwright/test'

for (const viewport of ['desktop', 'mobile']) {
  test(`administrador emite e revoga chave cadastral sem persistir o valor @${viewport}`, async ({ page }) => {
    const secret = 'synthetic-cadastro-once-only'
    const metadata = { id: '11111111-1111-4111-8111-111111111111', nome: 'Agente de revisão cadastral', prefixo: 'll_live_demo', escopo: 'cadastros', expira_em: '2030-01-08T12:00:00.000Z', revogada_em: null as string | null }
    let created = false
    let createCount = 0
    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url())
      if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return route.fallback()
      return route.fulfill({ status: 204 })
    })
    await page.route('**/v1/**', async (route) => {
      const request = route.request()
      const path = new URL(request.url()).pathname
      if (path === '/v1/auth/login') return route.fulfill({ json: {
        access_token: 'synthetic-admin-session', refresh_token: 'synthetic-admin-refresh',
        user: { id: 'admin-1', tenant_id: 'unit-1', nome: 'Administrador sintético', email: 'admin@example.test', papel: 'franqueado', ativo: true, onboarding_completed: true },
      } })
      if (path === '/v1/api-keys' && request.method() === 'POST') {
        const body = request.postDataJSON()
        expect(body.escopo).toBe('cadastros')
        expect(Math.abs(Date.parse(body.expira_em) - Date.now() - 7 * 86400000)).toBeLessThan(10000)
        createCount++
        created = true
        return route.fulfill({ status: 201, json: { ...metadata, chave: secret } })
      }
      if (path === '/v1/api-keys' && request.method() === 'GET') return route.fulfill({ json: { items: created ? [metadata] : [] } })
      if (path === `/v1/api-keys/${metadata.id}/revogar` && request.method() === 'POST') {
        metadata.revogada_em = new Date().toISOString()
        return route.fulfill({ json: metadata })
      }
      return route.fulfill({ json: {} })
    })
    await page.goto('/login')
    await page.getByLabel('E-mail').fill('admin@example.test')
    await page.locator('input[autocomplete="current-password"]').fill('SyntheticTestOnly123')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).not.toHaveURL(/\/login/)
    await page.goto('/configuracoes?tab=integracoes')
    await expect(page.getByRole('heading', { name: 'Agente de revisão cadastral' })).toBeVisible()
    await page.getByRole('button', { name: 'Gerar chave por 7 dias' }).click()
    const field = page.getByLabel('Chave gerada')
    await expect(field).toHaveAttribute('type', 'password')
    await expect(field).toHaveValue(secret)
    await expect(page.getByRole('button', { name: 'Gerar chave por 7 dias' })).toBeDisabled()
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain(secret)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.getByRole('button', { name: 'Já guardei a chave' }).click()
    await expect(field).toHaveCount(0)
    await page.reload()
    await expect(page.getByLabel('Chave gerada')).toHaveCount(0)
    await page.getByRole('button', { name: 'Revogar Agente de revisão cadastral' }).click()
    await page.getByRole('button', { name: 'Confirmar revogação' }).click()
    await expect(page.getByText(/Revogada/).first()).toBeVisible()
    expect(createCount).toBe(1)
  })
}
