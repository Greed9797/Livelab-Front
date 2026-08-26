import { expect, test, type Page } from '@playwright/test'

const liveId = 'd0a8ce24-c55a-46a5-a964-f99fb5171d00'
const tenantId = '11111111-1111-4111-8111-111111111111'
const marcaId = '22222222-2222-4222-8222-222222222222'
const sandyId = '33333333-3333-4333-8333-333333333333'
const cliceaneId = '44444444-4444-4444-8444-444444444444'

const split = [
  { apresentadora_id: sandyId, nome: 'Sandy', papel: 'principal', gmv: 2250.20, segundos: 6300, percentual: 69.56 },
  { apresentadora_id: cliceaneId, nome: 'Cliceane', papel: 'apoio', gmv: 984.56, segundos: 10800, percentual: 30.44 },
]

const live = {
  id: liveId,
  tenant_id: tenantId,
  cabine_id: '55555555-5555-4555-8555-555555555555',
  cabine_numero: 3,
  marca_id: marcaId,
  marca_nome: 'Alto calçados',
  cliente_nome: 'Alto calçados',
  status: 'encerrada',
  status_publicacao: 'publicado',
  origem_dados: 'manual',
  iniciado_em: '2026-08-20T12:00:00.000Z',
  encerrado_em: '2026-08-20T16:45:00.000Z',
  manual_gmv: 3234.76,
  final_orders_count: 12,
  apresentadora_id: sandyId,
  apresentadora_nome: 'Sandy',
  apresentadora2_id: cliceaneId,
  apresentadora2_nome: 'Cliceane',
  apresentadoras: split,
}

async function seedSession(page: Page) {
  await page.addInitScript(({ tenant }) => {
    localStorage.setItem('livelab.react.remember', 'true')
    localStorage.setItem('livelab.react.access_token', 'e2e-access-token')
    localStorage.setItem('livelab.react.refresh_token', 'e2e-refresh-token')
    localStorage.setItem('livelab.react.user', JSON.stringify({
      id: 'e2e-user',
      nome: 'Operador E2E',
      email: 'e2e@local.test',
      papel: 'franqueado',
      tenant_id: tenant,
      tenant_nome: 'Live Lab E2E',
      onboarding_completed: true,
    }))
  }, { tenant: tenantId })
}

test('keeps custom dates, pagination and presenter split connected across the live flow', async ({ page }) => {
  const paginatedRequests: string[] = []
  await seedSession(page)
  await page.route('**/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const json = (body: unknown) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })

    if (url.pathname === `/v1/lives/${liveId}`) return json(live)
    if (url.pathname === '/v1/lives/duplicatas') return json({ clusters: [] })
    if (url.pathname === '/v1/lives' && url.searchParams.get('paginado') === '1') {
      paginatedRequests.push(url.search)
      return json({ items: [live], total: 201, page: Number(url.searchParams.get('page') ?? 0), limit: 100 })
    }
    if (url.pathname === '/v1/lives') return json([live])
    if (url.pathname === '/v1/agenda') return json([])
    if (url.pathname === '/v1/cabines') return json([{ id: live.cabine_id, numero: 3, status: 'disponivel' }])
    if (url.pathname === '/v1/marcas') return json([{ id: marcaId, nome: 'Alto calçados', status: 'ativa' }])
    if (url.pathname === '/v1/clientes') return json([])
    if (url.pathname === '/v1/apresentadoras') {
      return json([
        { id: sandyId, nome: 'Sandy', status: 'ativa' },
        { id: cliceaneId, nome: 'Cliceane', status: 'ativa' },
      ])
    }
    return route.fulfill({ status: 501, contentType: 'application/json', body: JSON.stringify({ error: `E2E sem mock para ${url.pathname}` }) })
  })

  await page.goto('/conteudo?tab=lives&periodo=30d&pp=100&page=1')

  await expect(page.getByText('Sandy + Cliceane', { exact: true })).toBeVisible()
  await expect(page.getByText('101–101 de 201 lives', { exact: true })).toBeVisible()
  for (const label of ['Primeira página', 'Página anterior', 'Próxima página', 'Última página']) {
    const button = page.getByRole('button', { name: label })
    await expect(button).toBeVisible()
    const colors = await button.evaluate((element) => {
      const style = getComputedStyle(element)
      return { background: style.backgroundColor, border: style.borderColor }
    })
    expect(colors.background).not.toBe('rgba(0, 0, 0, 0)')
    expect(colors.border).not.toBe('rgba(0, 0, 0, 0)')
  }

  await page.getByLabel('Filtrar por período').selectOption('custom')
  await page.getByLabel('Data inicial').fill('2020-01-01')
  await page.getByLabel('Data final').fill('2026-08-20')
  await expect.poll(() => paginatedRequests.some((search) => (
    search.includes('data_inicio=2020-01-01') && search.includes('data_fim=2026-08-20')
  ))).toBe(true)
  await expect(page).toHaveURL(/periodo=custom/)
  await expect(page).toHaveURL(/data_inicio=2020-01-01/)
  await expect(page).toHaveURL(/data_fim=2026-08-20/)

  const liveRow = page.locator('.lives-table-row').filter({ hasText: 'Alto calçados' })
  await liveRow.hover()
  await liveRow.getByTitle('Abrir').click()
  const detail = page.getByRole('dialog', { name: 'Live realizada' })
  await expect(detail).toBeVisible()
  await expect(detail.getByText('Sandy · Cliceane', { exact: true })).toBeVisible()
  await detail.getByRole('button', { name: 'Dividir entre apresentadoras' }).click()

  const rateio = page.getByRole('dialog', { name: 'Apresentadoras da live' })
  await expect(rateio).toBeVisible()
  await expect(rateio.getByText('Tempo: 4h45 de 4h45', { exact: true })).toBeVisible()
  await expect(rateio.getByText('GMV: R$ 3.234,76 de R$ 3.234,76', { exact: true })).toBeVisible()
  await expect(rateio.getByLabel('Principal')).toHaveValue(sandyId)
  await expect(rateio.getByLabel('Apoio')).toHaveValue(cliceaneId)
})
