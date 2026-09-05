import { expect, test, type Page } from '@playwright/test'

async function setup(page: Page, papel = 'franqueado') {
  const calls: string[] = []
  const writes: string[] = []
  await page.addInitScript(({ role }) => {
    localStorage.setItem('livelab.react.remember', 'true')
    localStorage.setItem('livelab.react.access_token', 'local-navigation-test')
    localStorage.setItem('livelab.react.refresh_token', 'local-navigation-refresh')
    localStorage.setItem('livelab.react.user', JSON.stringify({ id: 'navigation-user', nome: 'Teste local', papel: role, tenant_id: 'local-tenant', onboarding_completed: true }))
    localStorage.setItem('livelab-theme', 'light')
    localStorage.setItem('livelab.sidebar.expanded', 'true')
  }, { role: papel })
  // Nenhuma requisição deste teste alcança uma API externa.
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.fulfill({ status: 204 }))
  await page.route('**/v1/**', async route => {
    const url = new URL(route.request().url())
    calls.push(url.pathname)
    if (route.request().method() !== 'GET') {
      writes.push(`${route.request().method()} ${url.pathname}`)
      return route.fulfill({ status: 405, json: { error: 'Fixture somente leitura' } })
    }
    if (url.pathname === '/v1/clientes') return route.fulfill({ json: [{ id: 'cliente-1', nome: 'Marca Aurora', status: 'ativo', gmv_mes: 1234, lives_mes: 7 }] })
    if (url.pathname === '/v1/financeiro/resumo') return route.fulfill({ json: {} })
    if (url.pathname === '/v1/financeiro/fluxo-caixa') return route.fulfill({ json: {} })
    if (url.pathname === '/v1/financeiro/faturamento') return route.fulfill({ json: {} })
    return route.fulfill({ json: [] })
  })
  return { calls, writes }
}

test('Clientes abre diretamente sem CRM e mantém Configurações ao final do menu', async ({ page }, info) => {
  const { calls, writes } = await setup(page)
  await page.goto('/comercial?tab=crm')
  await expect(page).toHaveURL(/\/clientes$/)
  await expect(page.getByRole('heading', { name: /Carteira de clientes/i })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Resumo da carteira' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Ativos', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'CRM', exact: true })).toHaveCount(0)
  expect(calls).not.toContain('/v1/crm/summary')
  expect(calls).not.toContain('/v1/leads')
  if (info.project.name === 'mobile-chrome') await page.getByRole('button', { name: 'Abrir menu' }).click()
  const nav = page.getByRole('navigation', { name: 'Navegação principal' }).filter({ visible: true })
  await expect(nav.getByRole('link').last()).toHaveAccessibleName('Configurações')
  await expect(nav.getByRole('link', { name: 'Clientes', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(nav.getByRole('link', { name: 'Agenda', exact: true })).toHaveAttribute('href', '/agenda')
  await expect(nav.getByRole('link', { name: 'Lives', exact: true })).toHaveAttribute('href', '/lives')
  await expect(nav.getByRole('link', { name: 'Comissões', exact: true })).toHaveCount(0)
  if (info.project.name !== 'mobile-chrome') {
    await expect(page.getByRole('button', { name: 'Detalhes', exact: true }).first()).toBeInViewport({ ratio: 1 })
    const settings = await nav.getByRole('link', { name: 'Configurações', exact: true }).boundingBox()
    const ranking = await nav.getByRole('link', { name: 'Ranking', exact: true }).boundingBox()
    expect(settings!.y).toBeGreaterThan(ranking!.y + ranking!.height + 24)
  } else await page.keyboard.press('Escape')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(writes).toEqual([])
  await page.screenshot({ path: info.outputPath('clientes-simplificado.png'), fullPage: true })
})

test('franqueado navega entre apuração e regras dentro de Financeiro', async ({ page }, info) => {
  const { writes } = await setup(page)
  const periodQuery = 'tab=comissoes&pmode=range&pini=2026-07&pfim=2026-08'
  await page.goto(`/financeiro?${periodQuery}`)
  await expect(page.getByRole('heading', { name: 'Comissões do período' })).toBeVisible()
  await page.getByRole('button', { name: 'Regras de comissão', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/financeiro/comissoes/regras\\?${periodQuery}$`))
  await expect(page.getByRole('heading', { name: 'Regras de comissão', exact: true })).toBeVisible()
  if (info.project.name === 'mobile-chrome') await page.getByRole('button', { name: 'Abrir menu' }).click()
  const nav = page.getByRole('navigation', { name: 'Navegação principal' }).filter({ visible: true })
  await expect(nav.getByRole('link', { name: 'Financeiro', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(nav.getByRole('link', { name: 'Comissões', exact: true })).toHaveCount(0)
  if (info.project.name === 'mobile-chrome') await page.keyboard.press('Escape')
  await page.screenshot({ path: info.outputPath('regras-financeiro.png'), fullPage: true })
  await page.getByRole('link', { name: 'Ver apuração', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/financeiro\\?${periodQuery}$`))
  await expect(page.getByRole('heading', { name: 'Comissões do período' })).toBeVisible()
  expect(writes).toEqual([])
})

test('master mantém somente regras sem montar as consultas de apuração', async ({ page }) => {
  const { calls, writes } = await setup(page, 'franqueador_master')
  await page.goto('/comissoes/config')
  await expect(page).toHaveURL(/\/financeiro\/comissoes\/regras$/)
  await expect(page.getByRole('heading', { name: 'Regras de comissão', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ver apuração', exact: true })).toHaveCount(0)
  expect(calls.some(path => path.startsWith('/v1/financeiro/'))).toBe(false)
  expect(calls).not.toContain('/v1/comissoes/apresentadoras')
  expect(calls).not.toContain('/v1/comissoes/marcas')
  await page.goto('/financeiro?tab=comissoes')
  await expect(page).toHaveURL(/\/master$/)
  expect(calls.some(path => path.startsWith('/v1/financeiro/'))).toBe(false)
  expect(writes).toEqual([])
})

test('perfil financeiro de leitura não ganha acesso às regras', async ({ page }) => {
  const { calls, writes } = await setup(page, 'financeiro_readonly')
  await page.goto('/financeiro?tab=comissoes')
  await expect(page.getByRole('heading', { name: 'Comissões do período' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Regras de comissão', exact: true })).toHaveCount(0)
  await page.goto('/financeiro/comissoes/regras')
  await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/)
  expect(calls).not.toContain('/v1/comissoes/faixas-default')
  expect(writes).toEqual([])
})
