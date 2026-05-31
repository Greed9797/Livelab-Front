import { expect, test, type Page } from '@playwright/test'

type AccountKey = 'master' | 'franqueado' | 'cliente'

interface Account {
  key: AccountKey
  role: string
  emailEnv: string
  passwordEnv: string
  landing: RegExp
  allowedRoutes: string[]
  forbiddenRoutes: string[]
}

const accounts: Account[] = [
  {
    key: 'master',
    role: 'franqueador_master',
    emailEnv: 'E2E_MASTER_EMAIL',
    passwordEnv: 'E2E_MASTER_PASSWORD',
    landing: /\/master(?:$|[?#])/,
    allowedRoutes: ['/master', '/master/unidades', '/master/consolidado', '/master/crm', '/master/franqueados', '/configuracoes', '/conhecimento'],
    forbiddenRoutes: ['/cabines', '/financeiro'],
  },
  {
    key: 'franqueado',
    role: 'franqueado',
    emailEnv: 'E2E_FRANQUEADO_EMAIL',
    passwordEnv: 'E2E_FRANQUEADO_PASSWORD',
    landing: /\/(?:$|[?#])/,
    allowedRoutes: ['/', '/master/crm', '/cabines', '/solicitacoes', '/apresentadoras', '/analytics-dashboard', '/financeiro', '/boletos', '/configuracoes', '/conhecimento'],
    forbiddenRoutes: ['/master', '/cliente'],
  },
  {
    key: 'cliente',
    role: 'cliente_parceiro',
    emailEnv: 'E2E_CLIENTE_EMAIL',
    passwordEnv: 'E2E_CLIENTE_PASSWORD',
    landing: /\/(?:cliente|onboarding)(?:$|[/?#])/,
    allowedRoutes: ['/cliente', '/cliente/lives', '/cliente/agenda', '/cliente/configuracoes', '/boletos', '/conhecimento'],
    forbiddenRoutes: ['/master', '/cabines', '/financeiro'],
  },
]

function valueFromEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Configure ${name} antes de rodar o E2E.`)
  return value
}

function hasCredentials(account: Account): boolean {
  return Boolean(process.env[account.emailEnv] && process.env[account.passwordEnv])
}

function routePattern(path: string): RegExp {
  if (path === '/') return /\/(?:$|[?#])/
  return new RegExp(`${path.replaceAll('/', '\\/')}(?:$|[?#])`)
}

async function assertNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  expect(hasOverflow).toBe(false)
}

async function assertNoBlockingError(page: Page) {
  const blockingError = page.getByText(/não foi possível conectar|servidor indisponível|sessão expirada|not allowed by cors/i)
  await expect(blockingError).toHaveCount(0)
}

async function loginAs(page: Page, account: Account) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.locator('input[autocomplete="email"]').fill(valueFromEnv(account.emailEnv))
  const passwordInput = page.locator('input[autocomplete="current-password"]')
  await passwordInput.fill(valueFromEnv(account.passwordEnv))

  const loginResponse = page.waitForResponse((response) => {
    return response.url().includes('/auth/login') && response.request().method() === 'POST'
  })

  let response
  try {
    await page.getByRole('button', { name: /entrar/i }).click()
    response = await loginResponse
  } catch (error) {
    await passwordInput.fill('')
    throw error
  }

  if (response.status() !== 200) {
    await passwordInput.fill('')
    const body = await response.text().catch(() => '')
    throw new Error(`Login falhou para ${account.key}: HTTP ${response.status()} ${body.slice(0, 220)}`)
  }

  await expect(page).not.toHaveURL(/\/login(?:$|[?#])/)

  const session = await page.evaluate(() => {
    return {
      accessToken: window.localStorage.getItem('livelab.react.access_token'),
      refreshToken: window.localStorage.getItem('livelab.react.refresh_token'),
      user: JSON.parse(window.localStorage.getItem('livelab.react.user') || 'null') as { papel?: string } | null,
    }
  })

  expect(session.accessToken).toBeTruthy()
  expect(session.refreshToken).toBeTruthy()
  expect(session.user?.papel).toBe(account.role)
}

async function logout(page: Page) {
  await page.getByRole('button', { name: /sair/i }).click()
  await expect(page).toHaveURL(/\/login(?:$|[?#])/)
}

test.describe('auth, roles e navegação principal', () => {
  for (const account of accounts) {
    test(`${account.key}: login, rotas permitidas, bloqueios e logout`, async ({ page, isMobile }) => {
      test.skip(isMobile, 'Fluxo completo de navegação é validado no projeto desktop.')
      test.skip(!hasCredentials(account), `Configure ${account.emailEnv} e ${account.passwordEnv} para validar este perfil.`)

      await loginAs(page, account)
      await expect(page).toHaveURL(account.landing)
      await assertNoBlockingError(page)
      await assertNoHorizontalOverflow(page)

      for (const path of account.allowedRoutes) {
        await page.goto(path, { waitUntil: 'domcontentloaded' })
        await expect(page).toHaveURL(routePattern(path))
        await expect(page.locator('main')).toBeVisible()
        await assertNoBlockingError(page)
        await assertNoHorizontalOverflow(page)
      }

      for (const path of account.forbiddenRoutes) {
        await page.goto(path, { waitUntil: 'domcontentloaded' })
        await expect(page).not.toHaveURL(routePattern(path))
      }

      await logout(page)
    })
  }
})

test.describe('responsividade sem autenticação', () => {
  test('login mobile não cria scroll horizontal', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Cenário dedicado ao projeto mobile.')

    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: /bem-vindo/i })).toBeVisible()
    await assertNoHorizontalOverflow(page)
  })
})
