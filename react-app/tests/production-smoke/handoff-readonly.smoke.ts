import { expect, test, type Page, type Request } from '@playwright/test'

const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD

function requireCredentials() {
  if (!email || !password) {
    throw new Error('E2E_EMAIL and E2E_PASSWORD are required. Use a dedicated read-only test account.')
  }
}

function isLoginRequest(request: Request) {
  return request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/auth/login')
}

async function login(page: Page) {
  requireCredentials()

  const blockedWrites: string[] = []
  page.on('request', (request) => {
    if (request.method() === 'GET' || request.method() === 'HEAD' || request.method() === 'OPTIONS' || isLoginRequest(request)) return
    blockedWrites.push(`${request.method()} ${new URL(request.url()).pathname}`)
  })

  await page.route('**/*', async (route) => {
    const request = route.request()
    if (request.method() === 'GET' || request.method() === 'HEAD' || request.method() === 'OPTIONS' || isLoginRequest(request)) {
      await route.continue()
      return
    }
    await route.abort('blockedbyclient')
  })

  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByRole('textbox', { name: 'E-mail' }).fill(email!)
  await page.getByPlaceholder('Sua senha').fill(password!)

  const loginResponse = page.waitForResponse((response) => isLoginRequest(response.request()))
  await page.getByRole('button', { name: 'Entrar' }).click()
  const response = await loginResponse

  expect(response.ok(), 'login must succeed with the supplied test account').toBe(true)
  await expect(page).not.toHaveURL(/\/login(?:$|[?#])/)

  return blockedWrites
}

async function expectNoWrites(blockedWrites: string[]) {
  expect(blockedWrites, `read-only smoke attempted write requests: ${blockedWrites.join(', ')}`).toEqual([])
}

test.describe('handoff item 13 production read-only smoke', () => {
  test('Cadastro renders for the authenticated test account', async ({ page }) => {
    const writes = await login(page)
    const loaded = page.waitForResponse((response) => response.ok() && response.request().method() === 'GET'
      && /\/v1\/(cadastros|clientes)$/.test(new URL(response.url()).pathname))
    await page.goto('/clientes', { waitUntil: 'domcontentloaded' })
    await loaded

    await expect(page).toHaveURL(/\/clientes(?:$|[?#])/)
    await expect(page.getByRole('heading', { name: 'Clientes', exact: true })).toBeVisible()
    await expect(page.getByText(/Clientes, afiliadas, marcas próprias e parceiras/i)).toBeVisible()
    await expectNoWrites(writes)
  })

  test('Receita renders in Financeiro', async ({ page }) => {
    const writes = await login(page)
    const loaded = page.waitForResponse((response) => response.ok() && response.request().method() === 'GET'
      && new URL(response.url()).pathname.endsWith('/v1/financeiro/receita'))
    await page.goto('/financeiro?tab=receita', { waitUntil: 'domcontentloaded' })
    await loaded

    await expect(page).toHaveURL(/\/financeiro\?tab=receita(?:&|$)/)
    await expect(page.getByRole('heading', { name: 'Financeiro', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Receita por (vencimento|competência)/i })).toBeVisible()
    await expectNoWrites(writes)
  })

  test('DRE renders in Financeiro', async ({ page }) => {
    const writes = await login(page)
    const loaded = page.waitForResponse((response) => response.ok() && response.request().method() === 'GET'
      && /\/v1\/financeiro\/(dre|resumo)$/.test(new URL(response.url()).pathname))
    await page.goto('/financeiro?tab=dre', { waitUntil: 'domcontentloaded' })
    await loaded

    await expect(page).toHaveURL(/\/financeiro\?tab=dre(?:&|$)/)
    await expect(page.getByRole('heading', { name: 'Financeiro', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'DRE mensal', exact: true })).toBeVisible()
    await expectNoWrites(writes)
  })
})
