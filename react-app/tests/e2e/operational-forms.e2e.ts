import { expect, test, type Page, type Route } from '@playwright/test'

test.setTimeout(30_000)

const tenant = '11111111-1111-4111-8111-111111111111'
const marcaId = '22222222-2222-4222-8222-222222222222'
const clienteId = '33333333-3333-4333-8333-333333333333'
const cabineId = '44444444-4444-4444-8444-444444444444'
const presenterId = '55555555-5555-4555-8555-555555555555'
const liveId = '66666666-6666-4666-8666-666666666666'
const live = {
  id: liveId, tenant_id: tenant, cabine_id: cabineId, cabine_numero: 1,
  marca_id: marcaId, cliente_id: clienteId, marca_nome: 'Marca Aurora', cliente_nome: 'Marca Aurora',
  status: 'encerrada', status_publicacao: 'publicado', origem_dados: 'manual', tipo: 'cliente',
  iniciado_em: '2026-09-04T12:00:00Z', encerrado_em: '2026-09-04T14:00:00Z',
  manual_gmv: 800, final_orders_count: 10, apresentadora_id: presenterId, apresentadora_nome: 'Ana',
  apresentadoras: [{ apresentadora_id: presenterId, nome: 'Ana', segundos: 7200, percentual: 100, gmv: 800 }],
}
const cliente = { id: clienteId, nome: 'Marca Aurora', status: 'ativo', celular: '47999999999' }
const marca = { id: marcaId, cliente_id: clienteId, nome: 'Marca Aurora', tipo: 'cliente', status: 'ativa', comissao_franquia_pct: 10, valor_fixo_minimo: 3000 }

async function setup(page: Page, onWrite?: (route: Route) => Promise<void>, theme = 'light') {
  const unexpectedWrites: string[] = []
  await page.addInitScript(({ tenantId, selectedTheme }) => {
    localStorage.setItem('livelab.react.remember', 'true')
    localStorage.setItem('livelab.react.access_token', 'local-test-token')
    localStorage.setItem('livelab.react.refresh_token', 'local-test-refresh')
    localStorage.setItem('livelab-theme', selectedTheme)
    localStorage.setItem('livelab.react.user', JSON.stringify({ id: 'test-user', nome: 'Operadora local', papel: 'franqueado', tenant_id: tenantId, onboarding_completed: true }))
  }, { tenantId: tenant, selectedTheme: theme })
  await page.route('**/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    if (route.request().method() !== 'GET') {
      if (onWrite) return onWrite(route)
      unexpectedWrites.push(`${route.request().method()} ${url.pathname}`)
      return route.fulfill({ status: 405, json: { error: 'Escrita não prevista no teste local' } })
    }
    if (url.pathname === '/lives') throw new Error('API sem prefixo')
    if (url.pathname === `/v1/lives/${liveId}`) return json(live)
    if (url.pathname === '/v1/lives/duplicatas') return json({ clusters: [] })
    if (url.pathname === '/v1/lives') return json(url.searchParams.get('paginado') === '1' ? { items: [live], total: 1, page: 0, limit: 50 } : [live])
    if (url.pathname === '/v1/cabines') return json([{ id: cabineId, numero: 1, status: 'disponivel' }])
    if (url.pathname === '/v1/marcas') return json([marca])
    if (url.pathname === '/v1/clientes') return json(url.searchParams.get('status') === 'arquivado' ? [] : [cliente])
    if (url.pathname === '/v1/apresentadoras') return json([{ id: presenterId, nome: 'Ana', status: 'ativa' }])
    if (url.pathname === `/v1/clientes/${clienteId}/operacional`) return json({ cliente, marcas: [marca], metrics: {}, lives: [], videos: [] })
    if (url.pathname === '/v1/crm/summary') return json({ summary: {}, totals: {} })
    if (['/v1/leads', '/v1/agenda'].includes(url.pathname)) return json([])
    return route.fulfill({ status: 501, json: { error: `Sem fixture local para ${url.pathname}` } })
  })
  return unexpectedWrites
}

async function openEdit(page: Page, navigate = true) {
  if (navigate) await page.goto('/conteudo?tab=lives&periodo=custom&data_inicio=2026-09-04&data_fim=2026-09-04')
  await page.locator('button[title="Abrir"]:visible').first().click()
  await page.getByRole('dialog', { name: 'Live realizada' }).getByRole('button', { name: 'Editar live', exact: true }).click()
  return page.getByRole('dialog', { name: 'Editar live', exact: true })
}

test('preserva edição ao sair por Escape, permite continuar ou descartar e restaura o formulário', async ({ page }, info) => {
  const writes = await setup(page)
  const dialog = await openEdit(page)
  const status = dialog.getByLabel('Situação da transmissão')
  await status.selectOption('cancelada')
  await page.keyboard.press('Escape')
  await expect(dialog.getByText('Há alterações não salvas', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Continuar editando' })).toBeFocused()
  await dialog.getByRole('button', { name: 'Continuar editando' }).click()
  await expect(status).toHaveValue('cancelada')
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await page.screenshot({ path: info.outputPath('live-edicao-protegida.png'), fullPage: true })
  await dialog.getByRole('button', { name: 'Descartar alterações' }).click()
  await expect(dialog).not.toBeVisible()
  const reopened = await openEdit(page)
  await expect(reopened.getByLabel('Situação da transmissão')).toHaveValue('encerrada')
  await reopened.getByRole('button', { name: 'Fechar', exact: true }).click()
  await expect(reopened).not.toBeVisible()
  expect(writes).toEqual([])
})

test('Voltar do navegador exige escolha e mantém a edição ao continuar', async ({ page }, info) => {
  const writes = await setup(page, undefined, 'dark')
  await page.goto('/comercial')
  if (info.project.name === 'mobile-chrome') await page.getByRole('button', { name: 'Abrir menu' }).click()
  await page.getByRole('link', { name: 'Lives', exact: true }).filter({ visible: true }).click()
  const dialog = await openEdit(page, false)
  await dialog.getByLabel('Situação da transmissão').selectOption('cancelada')
  const currentUrl = page.url()
  await page.evaluate(() => window.history.back())
  await expect(dialog.getByText('Há alterações não salvas', { exact: true })).toBeVisible()
  await expect(page).toHaveURL(currentUrl)
  await dialog.getByRole('button', { name: 'Continuar editando' }).click()
  await expect(dialog.getByLabel('Situação da transmissão')).toHaveValue('cancelada')
  await page.evaluate(() => window.history.back())
  await expect(dialog.getByText('Há alterações não salvas', { exact: true })).toBeVisible()
  await page.screenshot({ path: info.outputPath('live-edicao-dark-navegacao.png'), fullPage: true })
  await dialog.getByRole('button', { name: 'Descartar alterações' }).click()
  await expect(page).toHaveURL(/\/clientes$/)
  await expect(dialog).not.toBeVisible()
  expect(writes).toEqual([])
})

test('marca inativa da reserva carrega sem apagar dados já digitados', async ({ page }) => {
  let brandRequest: Route | undefined
  let savedPayload: Record<string, unknown> | undefined
  await setup(page, async (route) => {
    savedPayload = route.request().postDataJSON()
    await route.fulfill({ status: 200, json: { ...live, id: liveId } })
  })
  const agendaId = '77777777-7777-4777-8777-777777777777'
  await page.route('**/v1/agenda?**', (route) => route.fulfill({ json: [{
    id: agendaId, marca_id: marcaId, marca_nome: marca.nome, cliente_id: clienteId,
    cabine_id: cabineId, apresentadora_id: presenterId, status: 'agendado', tipo: 'live',
    data_inicio: '2026-09-04T12:00:00Z', data_fim: '2026-09-04T14:00:00Z',
  }] }))
  await page.route('**/v1/marcas**', async (route) => {
    if (new URL(route.request().url()).pathname === `/v1/marcas/${marcaId}`) { brandRequest = route; return }
    await route.fulfill({ json: [] })
  })
  await page.goto(`/conteudo?tab=lives&data=2026-09-04&agenda=${agendaId}&origem=grade`)
  await page.getByRole('button', { name: 'Cadastrar resultado', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Registrar resultado', exact: true })
  await expect.poll(() => Boolean(brandRequest)).toBe(true)
  await expect(dialog.getByRole('button', { name: 'Registrar resultado', exact: true })).toBeDisabled()
  await expect(dialog.getByRole('combobox', { name: 'Tipo', exact: true })).toBeDisabled()
  await expect(dialog.getByLabel('Marca/cliente')).toBeDisabled()
  await dialog.getByLabel('Observações').fill('Resultado preservado durante o carregamento')
  await brandRequest!.fulfill({ json: { ...marca, status: 'inativa' } })
  await expect(dialog.getByRole('combobox', { name: 'Tipo', exact: true })).toHaveValue('cliente')
  await expect(dialog.getByLabel('Marca/cliente')).toHaveValue(`marca:${marcaId}`)
  await expect(dialog.getByLabel('Marca/cliente')).toBeDisabled()
  await expect(dialog.getByLabel('Observações')).toHaveValue('Resultado preservado durante o carregamento')
  await dialog.getByRole('button', { name: 'Registrar resultado', exact: true }).click()
  await expect.poll(() => savedPayload?.marca_id).toBe(marcaId)
  expect(savedPayload?.cliente_id).toBe(clienteId)
  expect(savedPayload?.tipo).toBe('cliente')
  expect(savedPayload?.resumo).toBe('Resultado preservado durante o carregamento')
  await expect(dialog).not.toBeVisible()
})

test('rota protegida mantém redirecionamento para login sem sessão', async ({ page }) => {
  await page.route('**/v1/**', (route) => route.fulfill({ status: 401, json: { error: 'Sem sessão' } }))
  await page.goto('/conteudo')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible()
})

test('sessão expirada retorna ao login mesmo com edição e navegação pendentes', async ({ page }, info) => {
  await setup(page, async (route) => { await route.fulfill({ status: 401, json: { error: 'Sessão expirada no teste' } }) })
  await page.goto('/comercial')
  if (info.project.name === 'mobile-chrome') await page.getByRole('button', { name: 'Abrir menu' }).click()
  await page.getByRole('link', { name: 'Lives', exact: true }).filter({ visible: true }).click()
  const dialog = await openEdit(page, false)
  await dialog.getByLabel('Situação da transmissão').selectOption('cancelada')
  await page.evaluate(() => window.history.back())
  await expect(dialog.getByText('Há alterações não salvas', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Salvar alterações', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible()
  await expect(dialog).not.toBeVisible()
})

test('reserva sem marca exige escolher tipo e marca antes de registrar', async ({ page }) => {
  const writes = await setup(page)
  const agendaId = '77777777-7777-4777-8777-777777777778'
  await page.route('**/v1/agenda?**', (route) => route.fulfill({ json: [{
    id: agendaId, cabine_id: cabineId, apresentadora_id: presenterId, status: 'agendado', tipo: 'live',
    data_inicio: '2026-09-04T12:00:00Z', data_fim: '2026-09-04T14:00:00Z',
  }] }))
  await page.goto(`/conteudo?tab=lives&data=2026-09-04&agenda=${agendaId}&origem=grade`)
  await page.getByRole('button', { name: 'Cadastrar resultado', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Registrar resultado', exact: true })
  const tipo = dialog.getByRole('combobox', { name: 'Tipo', exact: true })
  await expect(tipo).toHaveValue('')
  await dialog.getByRole('button', { name: 'Registrar resultado', exact: true }).click()
  await expect(tipo).toBeFocused()
  expect(writes).toEqual([])
  await tipo.selectOption('cliente')
  await expect(dialog.getByLabel('Marca/cliente')).toHaveAttribute('required', '')
  await dialog.getByRole('button', { name: 'Registrar resultado', exact: true }).click()
  await expect(dialog.getByLabel('Marca/cliente')).toBeFocused()
  expect(writes).toEqual([])
})

test('falha ao buscar marca da reserva oferece nova tentativa sem liberar troca silenciosa', async ({ page }) => {
  const writes = await setup(page)
  const agendaId = '77777777-7777-4777-8777-777777777779'
  let recovered = false
  await page.route('**/v1/agenda?**', (route) => route.fulfill({ json: [{
    id: agendaId, marca_id: marcaId, marca_nome: marca.nome, cabine_id: cabineId,
    apresentadora_id: presenterId, status: 'agendado', tipo: 'live',
    data_inicio: '2026-09-04T12:00:00Z', data_fim: '2026-09-04T14:00:00Z',
  }] }))
  await page.route('**/v1/marcas**', async (route) => {
    if (new URL(route.request().url()).pathname === `/v1/marcas/${marcaId}`) {
      return route.fulfill(recovered ? { json: { ...marca, status: 'inativa' } } : { status: 503, json: { error: 'Indisponível no teste' } })
    }
    return route.fulfill({ json: [] })
  })
  await page.goto(`/conteudo?tab=lives&data=2026-09-04&agenda=${agendaId}&origem=grade`)
  await page.getByRole('button', { name: 'Cadastrar resultado', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Registrar resultado', exact: true })
  await expect(dialog.getByRole('button', { name: 'Tentar novamente', exact: true })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Registrar resultado', exact: true })).toBeDisabled()
  await expect(dialog.getByRole('combobox', { name: 'Tipo', exact: true })).toBeDisabled()
  await expect(dialog.getByLabel('Marca/cliente')).toBeDisabled()
  recovered = true
  await dialog.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Registrar resultado', exact: true })).toBeEnabled()
  await expect(dialog.getByLabel('Marca/cliente')).toHaveValue(`marca:${marcaId}`)
  expect(writes).toEqual([])
})

test('não fecha nem navega durante a gravação e fecha após sucesso', async ({ page }, info) => {
  let pendingRoute: Route | undefined
  await setup(page, async (route) => { pendingRoute = route })
  await page.goto('/comercial')
  if (info.project.name === 'mobile-chrome') await page.getByRole('button', { name: 'Abrir menu' }).click()
  await page.getByRole('link', { name: 'Lives', exact: true }).filter({ visible: true }).click()
  const dialog = await openEdit(page, false)
  await dialog.getByLabel('Situação da transmissão').selectOption('cancelada')
  await dialog.getByRole('button', { name: 'Salvar alterações', exact: true }).click()
  await expect.poll(() => Boolean(pendingRoute)).toBe(true)
  await expect(dialog.getByRole('button', { name: 'Fechar', exact: true })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  const currentUrl = page.url()
  await page.evaluate(() => window.history.back())
  await expect(page).toHaveURL(currentUrl)
  await expect(dialog).toBeVisible()
  await pendingRoute!.fulfill({ status: 200, json: { ...live, status: 'cancelada' } })
  await expect(dialog).not.toBeVisible()
})

test('cadastro unificado mantém rótulos visíveis e protege alterações de nome', async ({ page }, info) => {
  const writes = await setup(page)
  await page.goto('/comercial?ativo=Marca%20Aurora')
  const dialog = page.getByRole('dialog', { name: 'Cliente e marca', exact: true })
  const nome = dialog.getByLabel('Nome do cliente e da marca')
  await expect(nome).toHaveValue('Marca Aurora')
  await nome.fill('Aurora revisada')
  await dialog.getByRole('button', { name: 'Fechar', exact: true }).click()
  await expect(dialog.getByText('Há alterações não salvas', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Continuar editando' }).click()
  await expect(nome).toHaveValue('Aurora revisada')
  await page.screenshot({ path: info.outputPath('cliente-marca.png'), fullPage: true })
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await dialog.getByRole('button', { name: 'Descartar alterações' }).click()
  expect(writes).toEqual([])
})

test('navegação tem nomes acessíveis, foco contido no celular e conteúdo sem transbordamento', async ({ page }, info) => {
  await setup(page)
  await page.goto('/conteudo?tab=lives&periodo=custom&data_inicio=2026-09-04&data_fim=2026-09-04')
  await expect(page.getByText('Marca Aurora', { exact: true }).filter({ visible: true }).first()).toBeVisible()
  if (info.project.name === 'mobile-chrome') {
    const trigger = page.getByRole('button', { name: 'Abrir menu' })
    await trigger.click()
    const menu = page.getByRole('dialog', { name: 'Menu', exact: true })
    await expect(menu).toBeVisible()
    await expect(menu.getByRole('link', { name: 'Lives', exact: true })).toHaveAttribute('aria-current', 'page')
    await menu.getByRole('button', { name: 'Sair', exact: true }).focus()
    await page.keyboard.press('Tab')
    await expect(menu.getByRole('button', { name: 'Fechar', exact: true })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(menu).not.toBeVisible()
    await expect(trigger).toBeFocused()
  } else {
    const nav = page.getByRole('navigation', { name: 'Navegação principal' })
    await expect(nav.getByRole('link', { name: 'Lives', exact: true })).toHaveAttribute('aria-current', 'page')
    await page.getByRole('button', { name: 'Expandir menu' }).click()
    await page.reload()
    await expect(page.getByRole('button', { name: 'Recolher menu' })).toBeVisible()
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('navegacao.png'), fullPage: true })
})
