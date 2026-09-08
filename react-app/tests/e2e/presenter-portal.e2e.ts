import { expect, test, type Page } from '@playwright/test'

const tenant = '11111111-1111-4111-8111-111111111111'
const presenter = '22222222-2222-4222-8222-222222222222'
const brand = '33333333-3333-4333-8333-333333333333'
const cabin = '44444444-4444-4444-8444-444444444444'
const submission = '55555555-5555-4555-8555-555555555555'

async function setup(page: Page, role = 'apresentadora', initialStatus = 'pendente', failCreateOnce = false, fixture: { submissionCount?: number; legacyBrand?: boolean; tombstone?: boolean } = {}) {
  page.on('pageerror', error => { throw error })
  const calls: Array<{ path: string; method: string; body?: Record<string, unknown> }> = []
  let items: Record<string, unknown>[] = initialStatus === 'empty' ? [] : Array.from({ length: fixture.submissionCount ?? 1 }, (_, index) => ({ id: index === 0 ? submission : `55555555-5555-4555-8555-${String(index).padStart(12, '0')}`, apresentadora_id: presenter, apresentadora_nome: 'Ana', status: initialStatus, iniciado_em: '2026-09-05T12:00:00Z', encerrado_em: '2026-09-05T14:00:00Z', marca_id: brand, marca_nome: fixture.legacyBrand ? null : `Marca Aurora${index ? ` ${index + 1}` : ''}`, marca_descricao: fixture.legacyBrand ? 'Marca legada' : 'Marca Aurora', cabine_id: cabin, cabine_nome: 'Cabine Norte', gmv_declarado: 200, pedidos_declarados: 2, live_oficial_excluida_id: fixture.tombstone ? '99999999-9999-4999-8999-999999999999' : null, live_oficial_excluida_em: fixture.tombstone ? '2026-09-08T01:00:00Z' : null, motivo_devolucao: initialStatus === 'devolvida' ? 'Confira os pedidos' : null, versao: 1 }))
  await page.addInitScript(({ role, tenant }) => {
    localStorage.setItem('livelab.react.remember', 'true')
    localStorage.setItem('livelab.react.access_token', 'synthetic-portal-token')
    localStorage.setItem('livelab.react.refresh_token', 'synthetic-refresh')
    localStorage.setItem('livelab-theme', 'light')
    localStorage.setItem('livelab.react.user', JSON.stringify({ id: '66666666-6666-4666-8666-666666666666', nome: 'Ana', papel: role, tenant_id: tenant, foto_url: 'https://assets.example/avatar.png', onboarding_completed: true }))
  }, { role, tenant })
  // Only fixtures can receive writes; block all non-local network resources.
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.fulfill({ status: 204 }))
  await page.route('**/v1/**', async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname
    const call = { path, method: req.method(), body: req.postData() ? req.postDataJSON() : undefined }
    calls.push(call)
    if (path === '/v1/portal/apresentadora/me') return route.fulfill({ json: {
      perfil: { id: presenter, nome: 'Ana', foto_url: null }, desempenho: { gmv_lives: 500, horas_live: 4, gmv_por_hora: 125, total_lives: 2, pedidos: 5 }, remuneracao: { mes: '2026-09', fixo: 2850, comissao: 120, adicionais: 100, total: 3070, extras: [{ id: 'extra-1', tipo: 'bonus', data_referencia: '2026-09-05', descricao: 'Bônus de fim de semana', valor: 100 }] },
      ranking: [{ posicao: 1, apresentadora_id: presenter, nome: 'Ana', foto_url: null, gmv_total: 500, gmv_lives: 500, horas_live: 4, gmv_por_hora: 125, total_lives: 2, pedidos: 5, fixo: 2850, comissao_variavel: 120, total_recebido: 2970 }, { posicao: 2, apresentadora_id: '77777777-7777-4777-8777-777777777777', nome: 'Bia', foto_url: null, gmv_total: 300, gmv_lives: 300, horas_live: 3, gmv_por_hora: 100, total_lives: 1, pedidos: 2, fixo: 2700, comissao_variavel: 50, total_recebido: 2750 }],
    } })
    if (path === '/v1/portal/apresentadora/lives') return route.fulfill({ json: { items: [], submissoes: items } })
    if (path === '/v1/portal/apresentadora/opcoes') return route.fulfill({ json: { marcas: [{ id: brand, nome: 'Marca Aurora' }], cabines: [{ id: cabin, nome: 'Cabine Norte', numero: 1 }] } })
    if (path === '/v1/portal/apresentadora/submissoes' && req.method() === 'POST') {
      if (failCreateOnce) { failCreateOnce = false; return route.fulfill({ status: 503, json: { error: 'Tente novamente' } }) }
      const item = { ...call.body, id: submission, status: 'pendente', marca_nome: 'Marca Aurora', versao: 1 }
      items = [item]; return route.fulfill({ status: 201, json: item })
    }
    if (path === `/v1/portal/apresentadora/submissoes/${submission}` && req.method() === 'DELETE') { items = [{ ...items[0], status: 'cancelada' }]; return route.fulfill({ json: items[0] }) }
    if (path === `/v1/portal/apresentadora/submissoes/${submission}` && req.method() === 'PATCH') {
      items = [{ ...items[0], ...call.body, status: 'devolvida', versao: 2 }]; return route.fulfill({ json: items[0] })
    }
    if (path.endsWith('/reenviar')) { items = [{ ...items[0], status: 'pendente' }]; return route.fulfill({ json: items[0] }) }
    if (path === '/v1/lives/submissoes-apresentadoras') {
      if (url.searchParams.get('status') === 'pending') return route.fulfill({ status: 400, json: { error: 'Status inválido' } })
      return route.fulfill({ json: { items: items.filter(item => item.status === 'pendente') } })
    }
    if (path.endsWith('/aprovar')) { items = [{ ...items[0], status: 'aprovada' }]; return route.fulfill({ json: { id: submission, status: 'aprovada', live_id: '88888888-8888-4888-8888-888888888888' } }) }
    if (path.endsWith('/devolver')) { items = [{ ...items[0], status: 'devolvida', motivo_devolucao: call.body?.motivo }]; return route.fulfill({ json: items[0] }) }
    if (req.method() !== 'GET') return route.fulfill({ status: 405, json: { error: 'Unexpected fixture write' } })
    if (path === '/v1/marcas') return route.fulfill({ json: [{ id: brand, nome: 'Marca Aurora', status: 'ativa' }] })
    if (path === '/v1/cabines') return route.fulfill({ json: [{ id: cabin, nome: 'Cabine Norte', numero: 1, status: 'livre' }] })
    if (path === '/v1/apresentadoras') return route.fulfill({ json: [{ id: presenter, nome: 'Ana', ativo: true }] })
    if (path === '/v1/lives') return route.fulfill({ json: url.searchParams.get('paginado') === '1' ? { items: [], total: 0, page: 1, limit: 50 } : [{ id: '88888888-8888-4888-8888-888888888888', apresentadora_id: presenter, marca_nome: 'Marca Aurora', cabine_nome: 'Cabine Norte', iniciado_em: '2026-09-05T12:00:00Z', encerrado_em: '2026-09-05T14:00:00Z', status: 'encerrada' }] })
    return route.fulfill({ json: [] })
  })
  return calls
}

test('home mostra fixo próprio e ranking, sem abrir as telas operacionais', async ({ page }, info) => {
  const calls = await setup(page)
  await page.goto('/minha-home')
  await expect(page.getByRole('heading', { name: 'Olá, Ana' })).toBeVisible()
  await expect(page.getByText('R$ 2.850,00', { exact: true })).toBeVisible()
  await expect(page.getByText('R$ 3.070,00', { exact: true })).toBeVisible()
  await expect(page.getByText('Bônus de fim de semana', { exact: true })).toBeVisible()
  expect(await page.locator('img[src="https://assets.example/avatar.png"]').evaluateAll((images) => images.some((image) => {
    const style = getComputedStyle(image)
    return style.display !== 'none' && style.visibility !== 'hidden' && image.getBoundingClientRect().width > 0
  }))).toBe(true)
  await expect(page.getByRole('heading', { name: 'Ranking do mês' })).toBeVisible()
  await expect(page.getByText('Bia', { exact: true })).toBeVisible()
  await expect(page.getByText('Estimativa do período: R$ 2.750,00', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('home.png'), fullPage: true })
  await page.goto('/financeiro')
  await expect(page).toHaveURL(/\/minha-home$/)
  await page.goto('/lives')
  await expect(page).toHaveURL(/\/minha-home$/)
  expect(calls.filter(call => /\/financeiro|^\/v1\/lives$|^\/v1\/agenda$/.test(call.path))).toHaveLength(0)
})

test('ranking exige sessão antes de consultar dados', async ({ page }) => {
  let rankingCalls = 0
  await page.route('**/v1/**', route => {
    rankingCalls += 1
    return route.fulfill({ json: [] })
  })
  await page.goto('/ranking')
  await expect(page).toHaveURL(/\/login$/)
  expect(rankingCalls).toBe(0)
})

test('cadastro envia só para revisão e reutiliza idempotência após falha', async ({ page }, info) => {
  const calls = await setup(page, 'apresentador', 'empty', true)
  await page.goto('/minhas-lives')
  await page.getByRole('button', { name: 'Registrar live', exact: true }).click()
  const modal = page.getByRole('dialog')
  await modal.getByRole('combobox', { name: 'Marca', exact: true }).selectOption(brand)
  await modal.getByRole('combobox', { name: 'Cabine', exact: true }).selectOption(cabin)
  await modal.getByLabel('Início', { exact: true }).fill('2026-09-05T09:00')
  await modal.getByLabel('Fim', { exact: true }).fill('2026-09-05T11:00')
  await modal.getByLabel(/GMV declarado/).fill('200,50')
  await modal.getByLabel(/Pedidos declarados/).fill('2')
  await modal.getByLabel('Impressões da live', { exact: true }).fill('0')
  await modal.getByLabel('Visualizações', { exact: true }).fill('0')
  await page.screenshot({ path: info.outputPath('registration.png'), fullPage: true })
  await modal.getByRole('button', { name: 'Enviar para revisão' }).click()
  await expect(modal.getByRole('alert')).toContainText('Tente novamente')
  await modal.getByRole('button', { name: 'Enviar para revisão' }).click()
  await expect(modal).not.toBeVisible()
  await expect(page.getByText('Em revisão', { exact: true })).toBeVisible()
  const writes = calls.filter(call => call.path === '/v1/portal/apresentadora/submissoes' && call.method === 'POST')
  expect(writes).toHaveLength(2)
  expect(writes[0].body?.request_id).toEqual(writes[1].body?.request_id)
  expect(writes[0].body?.gmv_declarado).toBe(200.5)
  expect(writes[0].body?.pedidos_declarados).toBe(2)
  expect(writes[0].body?.live_impressions_declaradas).toBe(0)
  expect(writes[0].body?.manual_views_declaradas).toBe(0)
  expect(writes[0].body).not.toHaveProperty('apresentadora_id')
  expect(writes[0].body).not.toHaveProperty('tenant_id')
  expect(writes[0].body).not.toHaveProperty('status')
  expect(calls.some(call => call.method === 'POST' && call.path === '/v1/lives')).toBe(false)
})

test('mantém marca legada, não marca envio pendente como cancelado e volta à primeira página ao trocar mês', async ({ page }) => {
  await setup(page, 'apresentadora', 'pendente', false, { submissionCount: 11, legacyBrand: true })
  await page.goto('/minhas-lives')
  await expect(page.getByText('Marca legada', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('img', { name: 'Cancelada' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Próxima página' }).click()
  await expect(page.getByText('Página 2 de 2', { exact: true })).toBeVisible()
  await page.getByLabel('Mês das minhas lives').fill('2026-08')
  await expect(page.getByText('Página 1 de 2', { exact: true })).toBeVisible()
})

test('preserva envio aprovado como histórico quando a live oficial foi excluída pelo gestor', async ({ page }) => {
  await setup(page, 'apresentadora', 'aprovada', false, { tombstone: true })
  await page.goto('/minhas-lives')
  await expect(page.getByText('Aprovada', { exact: true })).toBeVisible()
  await expect(page.getByText('Live excluída pelo gestor', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Corrigir', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Reenviar', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Cancelar envio', exact: true })).toHaveCount(0)
})

test('aceita zero nas métricas declaradas e bloqueia contagens fora do limite', async ({ page }) => {
  const calls = await setup(page, 'apresentadora', 'empty')
  await page.goto('/minhas-lives')
  await page.getByRole('button', { name: 'Registrar live', exact: true }).click()
  const modal = page.getByRole('dialog')
  await expect(modal.getByRole('combobox', { name: 'Marca', exact: true })).toBeVisible()
  await modal.getByRole('combobox', { name: 'Marca', exact: true }).selectOption(brand)
  await modal.getByLabel('Início', { exact: true }).fill('2026-09-05T09:00')
  await modal.getByLabel('Fim', { exact: true }).fill('2026-09-05T11:00')
  await modal.getByLabel('GMV declarado', { exact: true }).fill('0')
  await modal.getByLabel('Pedidos declarados', { exact: true }).fill('0')
  await modal.getByLabel('Impressões da live', { exact: true }).fill('2147483648')
  await modal.getByRole('button', { name: 'Enviar para revisão' }).click()
  await expect(modal.getByRole('alert')).toContainText('GMV e pedidos')
  expect(calls.filter(call => call.method === 'POST' && call.path === '/v1/portal/apresentadora/submissoes')).toHaveLength(0)
  await modal.getByLabel('Impressões da live', { exact: true }).fill('0')
  await modal.getByRole('button', { name: 'Enviar para revisão' }).click()
  await expect(modal).not.toBeVisible()
  const write = calls.find(call => call.method === 'POST' && call.path === '/v1/portal/apresentadora/submissoes')
  expect(write?.body).toMatchObject({ gmv_declarado: 0, pedidos_declarados: 0, live_impressions_declaradas: 0 })
  expect(write?.body).not.toHaveProperty('manual_views_declaradas')
})

test('gestor confirma valores oficiais antes de criar a live', async ({ page }, info) => {
  const calls = await setup(page, 'franqueado')
  await page.goto('/lives')
  await page.getByRole('button', { name: 'Revisar e aprovar' }).click()
  await page.screenshot({ path: info.outputPath('review-open.png'), fullPage: true })
  const modal = page.getByRole('dialog')
  await modal.getByRole('combobox', { name: 'Marca', exact: true }).selectOption(brand)
  await modal.getByRole('combobox', { name: 'Cabine', exact: true }).selectOption(cabin)
  await modal.getByLabel('GMV oficial', { exact: true }).fill('150')
  await modal.getByLabel('Pedidos oficiais', { exact: true }).fill('1')
  await page.screenshot({ path: info.outputPath('review.png'), fullPage: true })
  await modal.getByRole('button', { name: 'Criar live histórica' }).click()
  await expect(modal).not.toBeVisible()
  const approval = calls.find(call => call.path.endsWith('/aprovar'))
  expect(approval?.body).toMatchObject({ marca_id: brand, cabine_id: cabin, gmv_oficial: 150, pedidos_oficiais: 1 })
  expect(approval?.body).not.toHaveProperty('gmv_declarado')
  expect(approval?.body).not.toHaveProperty('apresentadora_id')
})

test('corrige um envio devolvido e só o reenvia por ação explícita', async ({ page }) => {
  const calls = await setup(page, 'apresentadora', 'devolvida')
  await page.goto('/minhas-lives')
  await page.getByRole('button', { name: 'Corrigir', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Corrigir envio' })
  await expect(modal.getByRole('combobox', { name: 'Marca', exact: true })).toHaveValue(brand)
  await modal.getByLabel(/Pedidos declarados/).fill('3')
  await modal.getByRole('button', { name: 'Salvar correção', exact: true }).click()
  await expect(modal).not.toBeVisible()
  await expect(page.getByText('Devolvida para ajuste', { exact: true })).toBeVisible()
  expect(calls.some(call => call.path.endsWith('/reenviar'))).toBe(false)
  await page.getByRole('button', { name: 'Reenviar', exact: true }).click()
  await expect(page.getByText('Em revisão', { exact: true })).toBeVisible()
  expect(calls.filter(call => call.method === 'PATCH')).toHaveLength(1)
})

test('cancela somente o envio devolvido após confirmação', async ({ page }) => {
  const calls = await setup(page, 'apresentadora', 'devolvida')
  await page.goto('/minhas-lives')
  await page.getByRole('button', { name: 'Cancelar envio', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Cancelar envio' })
  expect(calls.filter(call => call.method === 'DELETE')).toHaveLength(0)
  await modal.getByRole('button', { name: 'Cancelar envio', exact: true }).click()
  await expect(modal).not.toBeVisible()
  await expect(page.getByText('Cancelada', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Corrigir', exact: true })).toHaveCount(0)
  expect(calls.filter(call => call.method === 'DELETE').map(call => call.path)).toEqual([`/v1/portal/apresentadora/submissoes/${submission}`])
})

test('gestor vincula um registro existente sem reenviar métricas', async ({ page }) => {
  const calls = await setup(page, 'gerente')
  await page.goto('/lives')
  await page.getByRole('button', { name: 'Vincular live existente', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Vincular live existente' })
  await modal.getByRole('combobox', { name: 'Live existente', exact: true }).selectOption('88888888-8888-4888-8888-888888888888')
  await modal.getByRole('button', { name: 'Vincular live selecionada' }).click()
  await expect(modal).not.toBeVisible()
  expect(calls.find(call => call.path.endsWith('/aprovar'))?.body).toEqual({ live_id: '88888888-8888-4888-8888-888888888888' })
})
