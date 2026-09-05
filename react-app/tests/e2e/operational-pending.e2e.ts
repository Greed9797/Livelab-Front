import { expect, test, type Page } from '@playwright/test'

const tenantId = '11111111-1111-4111-8111-111111111111'
const marcaId = '22222222-2222-4222-8222-222222222222'
const cabineId = '33333333-3333-4333-8333-333333333333'
const presenterId = '44444444-4444-4444-8444-444444444444'
const agendaId = '99999999-9999-4999-8999-999999999999'

const baseLive = {
  tenant_id: tenantId,
  cabine_id: cabineId,
  cabine_numero: 2,
  marca_id: marcaId,
  marca_nome: 'Marca Aurora',
  cliente_nome: 'Marca Aurora',
  apresentadora_id: presenterId,
  apresentadora_nome: 'Ana',
  status: 'encerrada',
  origem_dados: 'manual',
  iniciado_em: '2026-09-04T12:00:00.000Z',
  encerrado_em: '2026-09-04T14:00:00.000Z',
}

const zeroLive = {
  ...baseLive,
  id: '55555555-5555-4555-8555-555555555555',
  status_publicacao: 'rascunho',
  manual_gmv: 0,
  ads_gmv: null,
  fat_gerado: null,
  manual_orders: 0,
}
const metricPendingLive = {
  ...baseLive,
  id: '66666666-6666-4666-8666-666666666666',
  status_publicacao: 'rascunho',
  manual_gmv: null,
  ads_gmv: null,
  fat_gerado: null,
  manual_orders: null,
  final_orders_count: null,
  marca_nome: 'Marca Métrica',
}
const registrationPendingLive = {
  ...baseLive,
  id: '77777777-7777-4777-8777-777777777777',
  status_publicacao: 'publicado',
  marca_nome: 'À DEFINIR',
  cliente_nome: 'À DEFINIR',
  manual_gmv: 20,
  manual_orders: 1,
}
const possibleDuplicateLive = {
  ...baseLive,
  id: '88888888-8888-4888-8888-888888888888',
  status_publicacao: 'publicado',
  marca_nome: 'Marca Duplicata',
  manual_gmv: 50,
  manual_orders: 2,
}
const lives = [zeroLive, metricPendingLive, registrationPendingLive, possibleDuplicateLive]

async function setup(page: Page, papel = 'franqueado') {
  const listRequests: URLSearchParams[] = []
  await page.addInitScript(({ tenant, role }) => {
    localStorage.setItem('livelab.react.remember', 'true')
    localStorage.setItem('livelab.react.access_token', 'pending-test-token')
    localStorage.setItem('livelab.react.refresh_token', 'pending-test-refresh')
    localStorage.setItem('livelab-theme', 'light')
    localStorage.setItem('livelab.react.user', JSON.stringify({
      id: 'pending-user',
      nome: 'Operadora E2E',
      papel: role,
      tenant_id: tenant,
      onboarding_completed: true,
    }))
  }, { tenant: tenantId, role: papel })

  await page.route('**/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    if (route.request().method() !== 'GET') return route.fulfill({ status: 405, json: { error: 'E2E não autoriza escrita' } })
    const selected = lives.find((live) => `/v1/lives/${live.id}` === url.pathname)
    if (selected) return json(selected)
    if (url.pathname === '/v1/lives/duplicatas') return json({ clusters: [{ lives: [possibleDuplicateLive] }] })
    if (url.pathname === '/v1/lives' && url.searchParams.get('paginado') === '1') {
      listRequests.push(new URLSearchParams(url.search))
      return json({ items: lives, total: lives.length, page: 0, limit: 25 })
    }
    if (url.pathname === '/v1/lives') return json(lives)
    if (url.pathname === '/v1/agenda') return json([{
      id: agendaId,
      cabine_id: cabineId,
      marca_id: marcaId,
      apresentadora_id: presenterId,
      data_inicio: '2026-09-04T12:00:00-03:00',
      data_fim: '2026-09-04T14:00:00-03:00',
      status: 'agendado',
    }])
    if (url.pathname === '/v1/cabines') return json([{ id: cabineId, numero: 2, status: 'disponivel' }])
    if (url.pathname === '/v1/marcas') return json([{ id: marcaId, nome: 'Marca Aurora', status: 'ativa' }])
    if (url.pathname === '/v1/clientes') return json([])
    if (url.pathname === '/v1/apresentadoras') return json([{ id: presenterId, nome: 'Ana', status: 'ativa' }])
    return route.fulfill({ status: 501, json: { error: `Sem fixture para ${url.pathname}` } })
  })
  return listRequests
}

test('preserva o recorte de Analytics e filtra pendências com motivo e ação', async ({ page }) => {
  const requests = await setup(page)
  await page.goto(`/conteudo?tab=lives&data_inicio=2026-09-04&data_fim=2026-09-04&marca=${marcaId}&cabine=${cabineId}&origem=analytics`)

  await expect(page.getByText('Recorte vindo de Analytics')).toBeVisible()
  await expect.poll(() => requests.some((params) => (
    params.get('data_inicio') === '2026-09-04'
    && params.get('data_fim') === '2026-09-04'
    && params.get('marca_id') === marcaId
    && params.get('cabine_id') === cabineId
  ))).toBe(true)
  await expect(page).toHaveURL(/periodo=custom/)

  await page.getByRole('button', { name: /Métricas 1/ }).click()
  await expect(page).toHaveURL(/pendencia=metricas/)
  await expect(page.getByText('Marca Métrica', { exact: true })).toBeVisible()
  await expect(page.getByText('Sem registro de GMV e pedidos.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Revisar métricas', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Editar live', exact: true })).toBeVisible()
})

test('mantém zero visível e descreve placeholders e duplicatas como pendências possíveis', async ({ page }) => {
  await setup(page)
  await page.goto('/conteudo?tab=lives&periodo=custom&data_inicio=2026-09-04&data_fim=2026-09-04')

  const zeroRow = page.locator('.lives-table-row').filter({ hasText: 'Marca Aurora' }).first()
  await expect(zeroRow.getByText('R$ 0,00', { exact: true })).toBeVisible()
  await expect(zeroRow.getByText('0', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: /Cadastro 1/ }).click()
  await expect(page.getByText('À DEFINIR', { exact: true })).toBeVisible()
  await expect(page.getByText('Confirmar marca real.', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: /Possíveis duplicatas 1/ }).click()
  await expect(page.getByText('Marca Duplicata', { exact: true })).toBeVisible()
  await expect(page.getByText('Possível sobreposição com outra live na mesma cabine.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Conferir detalhes', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Live realizada' })).toBeVisible()
})

test('deep link de agenda não oferece cadastro do resultado para perfil somente leitura', async ({ page }) => {
  await setup(page, 'comercial_readonly')
  await page.goto(`/conteudo?tab=lives&data=2026-09-04&cabine=${cabineId}&agenda=${agendaId}&pendencia=cadastro&origem=grade`)
  await expect(page.getByText('Recorte vindo de Grade')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cadastrar resultado', exact: true })).toHaveCount(0)
})
