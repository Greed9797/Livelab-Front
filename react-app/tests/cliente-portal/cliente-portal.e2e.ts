import { expect, test, type Page } from '@playwright/test'

type Brand = 'a' | 'b'

const tenantId = '11111111-1111-4111-8111-111111111111'
const brandId: Record<Brand, string> = {
  a: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  b: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
}
const brandName: Record<Brand, string> = { a: 'Marca Aurora', b: 'Marca Boreal' }
const userId: Record<Brand, string> = {
  a: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  b: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
}

function user(brand: Brand) {
  return { id: userId[brand], tenant_id: tenantId, nome: `Cliente ${brand.toUpperCase()}`, email: `cliente-${brand}@example.test`, papel: 'cliente_parceiro', ativo: true, onboarding_completed: true }
}

function home(brand: Brand) {
  return {
    periodo: { mes: 10, ano: 2026 },
    marca: { id: brandId[brand], nome: brandName[brand] },
    gmv_mes: brand === 'a' ? 1250 : 890,
    lives_mes: brand === 'a' ? 2 : 1,
    horas_live_mes: brand === 'a' ? 4.5 : null,
    pedidos: brand === 'a' ? 0 : 7,
    gmv_por_live: brand === 'a' ? 625 : 890,
    gmv_por_hora: brand === 'a' ? 277.78 : null,
    series_mensais: [
      { mes: '2026-05', gmv: 400, lives: 1 },
      { mes: '2026-06', gmv: null, lives: 0 },
      { mes: '2026-10', gmv: brand === 'a' ? 1250 : 890, lives: brand === 'a' ? 2 : 1 },
    ],
  }
}

function daily(brand: Brand) {
  return [{ dia: '2026-10-03', gmv_total: brand === 'a' ? 1250 : 890, gmv_lives: brand === 'a' ? 1250 : 890, total_lives: brand === 'a' ? 2 : 1, pedidos: brand === 'a' ? 0 : 7, horas_live: brand === 'a' ? 4.5 : null, gmv_por_hora: null, gmv_por_live: null }]
}

function lives(brand: Brand, offset: number) {
  const all = Array.from({ length: 51 }, (_, index) => ({
    id: `${brandId[brand]}-${String(index + 1).padStart(2, '0')}`,
    iniciado_em: `2026-10-${String((index % 28) + 1).padStart(2, '0')}T12:00:00.000Z`,
    encerrado_em: `2026-10-${String((index % 28) + 1).padStart(2, '0')}T13:00:00.000Z`,
    duracao_min: index === 0 ? null : 60,
    gmv: index === 0 ? null : 100,
    pedidos: index === 0 ? 0 : 1,
    status: 'encerrada',
    status_publicacao: index % 2 ? 'publicado' : 'revisado',
  }))
  return {
    periodo: { mes: 10, ano: 2026 },
    resumo: { gmv: brand === 'a' ? 5000 : 2500, lives: 51, pedidos: 50, horas: 50 },
    total: 51,
    limit: 50,
    offset,
    lives: all.slice(offset, offset + 50),
  }
}

async function mockClientPortal(page: Page) {
  let activeBrand: Brand = 'a'
  let passwordChanged = false
  const calls: string[] = []

  await page.clock.install({ time: new Date('2026-10-21T15:00:00.000Z') })
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return route.fallback()
    return route.fulfill({ status: 204 })
  })
  await page.route('**/v1/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    calls.push(`${request.method()} ${path}?${url.searchParams.toString()}`)

    if (path === '/v1/auth/login' && request.method() === 'POST') {
      const body = request.postDataJSON() as { email?: string }
      activeBrand = body.email?.includes('cliente-b') ? 'b' : 'a'
      return route.fulfill({ json: { access_token: `access-${activeBrand}`, refresh_token: `refresh-${activeBrand}`, user: user(activeBrand) } })
    }
    if (path === '/v1/auth/logout') return route.fulfill({ json: {} })
    if (path === '/v1/auth/senha' && request.method() === 'PATCH') {
      passwordChanged = true
      return route.fulfill({ json: { ok: true } })
    }
    if (passwordChanged && path.startsWith('/v1/cliente/')) return route.fulfill({ status: 401, json: { error: 'Sessão encerrada' } })
    if (path === '/v1/cliente/perfil') return route.fulfill({ json: { nome: `Cliente ${activeBrand.toUpperCase()}`, email: `cliente-${activeBrand}@example.test`, celular: null, cnpj: null, razao_social: brandName[activeBrand], site: null, cidade: null, estado: null, nicho: null } })
    if (path === '/v1/cliente/meta') return route.fulfill({ json: { meta_gmv: activeBrand === 'a' ? null : 0 } })
    if (path === '/v1/cliente/home') return route.fulfill({ json: home(activeBrand) })
    if (path === '/v1/cliente/analytics/diario') return route.fulfill({ json: daily(activeBrand) })
    if (path === '/v1/cliente/conteudo/lives') return route.fulfill({ json: lives(activeBrand, Number(url.searchParams.get('offset') ?? '0')) })
    return route.fulfill({ status: 404, json: { error: `Unexpected synthetic request: ${path}` } })
  })
  return { calls }
}

async function login(page: Page, brand: Brand) {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(`cliente-${brand}@example.test`)
  await page.locator('input[autocomplete="current-password"]').fill('SenhaSegura123')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/cliente$/)
}

async function logout(page: Page) {
  await page.getByRole('button', { name: /sair/i }).click()
  await expect(page).toHaveURL(/\/login$/)
}

async function expectMetaAtual(page: Page, value: string) {
  const meta = page.getByText('Meta atual', { exact: true }).locator('..')
  await expect(meta.getByText(value, { exact: true })).toBeVisible()
}

test('cliente só vê o portal de sua marca e não recebe telas operacionais @desktop', async ({ page }, testInfo) => {
  const fixture = await mockClientPortal(page)
  await login(page, 'a')

  await expect(page.getByRole('heading', { name: 'Resultados' })).toBeVisible()
  await expect(page.getByText('Resultados revisados da Marca Aurora.')).toBeVisible()
  await expect(page.getByText('R$ 1.250,00', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('0', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Resultados', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Lives', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Minha conta', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /financeiro|agenda|ranking|apresentadoras/i })).toHaveCount(0)

  for (const forbidden of ['/cliente/financeiro', '/apresentadoras', '/financeiro', '/onboarding', `/ranking?unidade=${tenantId}`]) {
    await page.goto(forbidden)
    await expect(page).toHaveURL(/\/cliente$/)
    await expect(page.getByText(/Financeiro|Apresentadoras/)).toHaveCount(0)
  }
  expect(fixture.calls.some(call => /\/financeiro|\/apresentadoras|\/public\/ranking/.test(call))).toBe(false)

  await logout(page)
  await login(page, 'b')
  await expect(page.getByText('Resultados revisados da Marca Boreal.')).toBeVisible()
  await expect(page.getByText('R$ 890,00', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Não informado', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Marca Aurora')).toHaveCount(0)
  await expect(page.getByText('R$ 1.250,00', { exact: true })).toHaveCount(0)
  await page.getByRole('link', { name: 'Minha conta', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Minha conta' })).toBeVisible()
  await expectMetaAtual(page, 'R$ 0,00')
  await page.screenshot({ path: testInfo.outputPath('brand-b-results.png'), fullPage: true })
})

test('histórico mantém totais do período em 50 itens e reinicia a página ao trocar mês @desktop', async ({ page }) => {
  const fixture = await mockClientPortal(page)
  await login(page, 'a')
  await page.getByRole('link', { name: 'Lives', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Lives' })).toBeVisible()
  await expect(page.getByText('51 lives · GMV R$ 5.000,00 · 50 pedidos · 50.0h')).toBeVisible()
  await expect(page.getByText('1–50 de 51 lives')).toBeVisible()
  await expect(page.getByText('Não informado', { exact: true })).toHaveCount(2)
  await page.getByRole('button', { name: 'Próxima', exact: true }).click()
  await expect(page.getByText('51–51 de 51 lives')).toBeVisible()
  await expect.poll(() => fixture.calls.some(call => /cliente\/conteudo\/lives\?.*offset=50/.test(call))).toBe(true)
  await page.getByRole('button', { name: 'Período anterior' }).click()
  await expect(page.getByText('1–50 de 51 lives')).toBeVisible()
  await expect.poll(() => fixture.calls.filter(call => /cliente\/conteudo\/lives\?.*offset=0/.test(call)).length).toBeGreaterThan(1)
})

test('cliente troca a própria senha pelo portal e preserva meta nula @desktop', async ({ page }) => {
  await mockClientPortal(page)
  await login(page, 'a')
  await page.getByRole('link', { name: 'Minha conta', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Minha conta' })).toBeVisible()
  await expectMetaAtual(page, 'Não informado')
  await page.getByLabel('Senha atual').fill('SenhaSegura123')
  await page.getByLabel('Nova senha').fill('NovaSenha456')
  await page.getByRole('button', { name: 'Trocar senha', exact: true }).click()
  await expect(page.getByText('Senha alterada. Outras sessões foram desconectadas.')).toBeVisible()
})

test('portal cabe no celular com paginação e troca de senha @mobile', async ({ page }, testInfo) => {
  await mockClientPortal(page)
  await login(page, 'a')
  await expect(page.getByRole('heading', { name: 'Resultados' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('cliente-mobile.png'), fullPage: true })
  await page.getByRole('button', { name: 'Abrir menu' }).click()
  await page.getByRole('link', { name: 'Lives', exact: true }).click()
  await expect(page.getByText('1–50 de 51 lives')).toBeVisible()
  await page.getByRole('button', { name: 'Próxima', exact: true }).click()
  await expect(page.getByText('51–51 de 51 lives')).toBeVisible()
  await page.getByRole('button', { name: 'Abrir menu' }).click()
  await page.getByRole('link', { name: 'Minha conta', exact: true }).click()
  await expectMetaAtual(page, 'Não informado')
  await page.getByLabel('Senha atual').fill('SenhaSegura123')
  await page.getByLabel('Nova senha').fill('NovaSenha456')
  await page.getByRole('button', { name: 'Trocar senha', exact: true }).click()
  await expect(page.getByText('Senha alterada. Outras sessões foram desconectadas.')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
