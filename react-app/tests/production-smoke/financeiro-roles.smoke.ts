import { expect, test, type Page, type Request } from '@playwright/test'

type PapelTeste = 'MASTER' | 'FRANQUEADO' | 'CLIENTE'

function credentials(papel: PapelTeste) {
  const email = process.env[`E2E_${papel}_EMAIL`]
  const password = process.env[`E2E_${papel}_PASSWORD`]
  if (!email || !password) throw new Error(`Configure E2E_${papel}_EMAIL/PASSWORD com conta de teste dedicada.`)
  return { email, password }
}

function loginRequest(request: Request) {
  return request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/auth/login')
}

async function loginSomenteLeitura(page: Page, papel: PapelTeste) {
  const { email, password } = credentials(papel)
  const attemptedWrites: string[] = []
  await page.route('**/*', async (route) => {
    const request = route.request()
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method()) || loginRequest(request)) return route.continue()
    attemptedWrites.push(`${request.method()} ${new URL(request.url()).pathname}`)
    return route.abort('blockedbyclient')
  })
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByRole('textbox', { name: 'E-mail' }).fill(email)
  await page.getByPlaceholder('Sua senha').fill(password)
  const response = page.waitForResponse((item) => loginRequest(item.request()))
  await page.getByRole('button', { name: 'Entrar' }).click()
  expect((await response).ok(), `login de ${papel} precisa funcionar`).toBe(true)
  await expect(page).not.toHaveURL(/\/login(?:$|[?#])/)
  return attemptedWrites
}

for (const papel of ['MASTER', 'FRANQUEADO'] as const) {
  test(`${papel} consulta Receber/Pagar e aging em produção`, async ({ page }) => {
    const writes = await loginSomenteLeitura(page, papel)
    for (const [tab, apiPath, heading] of [
      ['receber', '/v1/financeiro/consulta', 'Receber'],
      ['pagar', '/v1/financeiro/consulta', 'Pagar'],
      ['aging', '/v1/financeiro/aging', 'Aging'],
      ['visao-geral', '/v1/financeiro/overview', 'Visão geral'],
    ] as const) {
      const loaded = page.waitForResponse((response) => response.request().method() === 'GET'
        && new URL(response.url()).pathname === apiPath && response.ok())
      await page.goto(`/financeiro?tab=${tab}`, { waitUntil: 'domcontentloaded' })
      await loaded
      await expect(page.getByRole('heading', { name: heading, exact: tab === 'receber' || tab === 'pagar' })).toBeVisible()
    }
    expect(writes, `smoke ${papel} tentou mutações: ${writes.join(', ')}`).toEqual([])
  })
}

test('CLIENTE permanece no portal próprio, sem consultar o financeiro da franquia', async ({ page }) => {
  const writes = await loginSomenteLeitura(page, 'CLIENTE')
  const financeRequests: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/v1/financeiro/consulta')) financeRequests.push(request.url())
  })
  await page.goto('/financeiro?tab=receber', { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/\/cliente\/financeiro(?:$|[?#])/)
  expect(financeRequests).toEqual([])
  expect(writes, `smoke CLIENTE tentou mutações: ${writes.join(', ')}`).toEqual([])
})
