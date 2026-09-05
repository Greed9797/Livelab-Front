import { expect, test, type Page } from '@playwright/test'

const selectedDate = '2026-09-05'
const tenant = '11111111-1111-4111-8111-111111111111'
const c1 = '22222222-2222-4222-8222-222222222221'
const c2 = '22222222-2222-4222-8222-222222222222'
const c3 = '22222222-2222-4222-8222-222222222223'
const m1 = '33333333-3333-4333-8333-333333333331'
const m2 = '33333333-3333-4333-8333-333333333332'
const m3 = '33333333-3333-4333-8333-333333333333'
const cabin = '44444444-4444-4444-8444-444444444444'
const p1 = '55555555-5555-4555-8555-555555555551'
const p2 = '55555555-5555-4555-8555-555555555552'
const p3 = '55555555-5555-4555-8555-555555555553'
const p4 = '55555555-5555-4555-8555-555555555554'

const clients = [
  { id: c1, nome: 'Aurora', status: 'ativo', email: 'contato@aurora.example', celular: '47900000000' },
  { id: c2, nome: 'Brisa', status: 'cancelado', email: 'contato@brisa.example' },
  { id: '22222222-2222-4222-8222-222222222224', nome: 'Lume', status: 'inadimplente', email: 'contato@lume.example' },
]
const brands = [
  { id: m1, cliente_id: c1, nome: 'Aurora', status: 'ativa', tipo: 'cliente' },
  { id: m2, cliente_id: c2, nome: 'Brisa', status: 'inativa', tipo: 'cliente' },
  { id: m3, nome: 'Farol', status: 'ativa', tipo: 'afiliada' },
]
const presenters = [
  { id: p1, nome: 'Ana', ativo: true },
  { id: p2, nome: 'Bia', ativo: true },
  { id: p3, nome: 'Clara', ativo: true },
  { id: p4, nome: 'Dora', ativo: false },
]
const cell = (start: string, end: string, presenter: string) => ({
  cabine_id: cabin, cabine_numero: 1, marca_id: m1, marca_nome: 'Aurora',
  apresentadora_id: presenter, apresentadora_nome: presenter === p1 ? 'Ana' : 'Bia',
  hora_inicio: start, hora_fim: end, origem: 'padrao',
})

async function setup(page: Page) {
  const state = { failArchives: false, failAgenda: false, failPresenters: false, archivedHomonym: false }
  const calls: string[] = []
  const writes: string[] = []
  await page.addInitScript(({ tenantId }) => {
    localStorage.setItem('livelab.react.remember', 'true')
    localStorage.setItem('livelab.react.access_token', 'synthetic-operations-test')
    localStorage.setItem('livelab.react.refresh_token', 'synthetic-operations-refresh')
    localStorage.setItem('livelab.react.user', JSON.stringify({ id: 'synthetic-user', nome: 'Operadora', papel: 'franqueado', tenant_id: tenantId, onboarding_completed: true }))
    localStorage.setItem('livelab-theme', 'dark')
  }, { tenantId: tenant })
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.fulfill({ status: 204 }))
  await page.route('**/v1/**', async route => {
    const url = new URL(route.request().url())
    calls.push(url.pathname + url.search)
    if (route.request().method() !== 'GET') {
      writes.push(route.request().method() + ' ' + url.pathname)
      return route.fulfill({ status: 405, json: { error: 'Fixture somente leitura' } })
    }
    const ok = (json: unknown) => route.fulfill({ json })
    const fail = () => route.fulfill({ status: 503, json: { error: 'Falha de consulta simulada' } })
    if (url.pathname === '/v1/clientes') {
      if (url.searchParams.get('status') === 'arquivado') return state.failArchives ? fail() : ok([{ id: c3, nome: state.archivedHomonym ? 'Aurora' : 'Cedro', status: 'arquivado' }])
      return ok(clients)
    }
    if (url.pathname === '/v1/marcas') return ok(url.searchParams.get('status') === 'all' ? brands : brands.filter(b => b.status === 'ativa'))
    if (url.pathname === '/v1/apresentadoras') return state.failPresenters ? fail() : ok(presenters)
    if (url.pathname === '/v1/cabines') return ok([{ id: cabin, numero: 1, status: 'disponivel', ativo: true }])
    if (url.pathname === '/v1/grade') {
      const from = url.searchParams.get('data_inicio') ?? selectedDate
      const to = url.searchParams.get('data_fim') ?? selectedDate
      const days = []
      for (let date = from; date <= to;) {
        days.push({ data: date, celulas: date === selectedDate ? [cell('08:00', '11:00', p1), cell('11:00', '14:00', p1), cell('14:00', '17:00', p2)] : [] })
        const next = new Date(date + 'T12:00:00Z'); next.setUTCDate(next.getUTCDate() + 1)
        date = next.toISOString().slice(0, 10)
      }
      return ok({ dias: days })
    }
    if (url.pathname === '/v1/agenda') return state.failAgenda ? fail() : ok([])
    if (url.pathname === '/v1/financeiro/faturamento') return ok({ por_cliente: [
      { id: c1, cliente_id: c1, marca_id: null, tipo_entidade: 'cliente', tipo_operacional: 'cliente_ecommerce', nome: 'Aurora', gmv_mes: 300, receita_liquida: 30, lives_mes: 3, videos_mes: 0 },
      { id: m3, cliente_id: null, marca_id: m3, tipo_entidade: 'marca', tipo_operacional: 'cliente', nome: 'Aurora', gmv_mes: 20, receita_liquida: 2, lives_mes: 1, videos_mes: 0 },
    ] })
    if (url.pathname === `/v1/clientes/${c1}/operacional`) return ok({ cliente: clients[0], marcas: [brands[0]], metrics: {}, lives: [], vendas_atribuidas: [] })
    if (url.pathname === `/v1/clientes/${c3}/operacional`) return ok({ cliente: { id: c3, nome: 'Cedro', status: 'arquivado' }, marcas: [], metrics: {}, lives: [], vendas_atribuidas: [] })
    if (url.pathname === `/v1/marcas/${m3}/operacional`) return ok({ marca: { ...brands[2], nome: 'Aurora' }, metrics: {}, lives: [], vendas_atribuidas: [] })
    if (url.pathname.startsWith('/v1/financeiro/')) return ok({})
    return ok([])
  })
  return { state, calls, writes }
}

test('carteira prioriza ativos e mantém inativos acessíveis, por último e com busca', async ({ page }, info) => {
  const { calls, writes } = await setup(page)
  await page.goto('/clientes')
  const table = page.getByRole('table')
  await expect(table).toContainText('Aurora')
  await expect(table).toContainText('Farol')
  await expect(table).toContainText('Lume')
  await expect(table).not.toContainText('Brisa')
  await expect(page.getByRole('region', { name: 'Resumo da carteira' })).toHaveCount(0)
  expect(calls.some(path => path.includes('status=arquivado'))).toBe(false)
  await page.getByRole('button', { name: 'Todos', exact: true }).click()
  await expect(table).toContainText('Brisa')
  await expect(table).toContainText('Cedro')
  const rows = await table.locator('tbody tr').allTextContents()
  expect(rows.findIndex(row => row.includes('Brisa'))).toBeGreaterThan(rows.findIndex(row => row.includes('Aurora')))
  expect(rows.findIndex(row => row.includes('Cedro'))).toBeGreaterThan(rows.findIndex(row => row.includes('Farol')))
  await page.getByRole('button', { name: 'Inativos', exact: true }).click()
  await expect(table).not.toContainText('Aurora')
  await expect(table).toContainText('Brisa')
  await page.getByRole('searchbox').fill('Brisa')
  await expect(table).not.toContainText('Cedro')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(writes).toEqual([])
  await page.screenshot({ path: info.outputPath('carteira-inativos.png'), fullPage: true })
})

test('falha ao consultar inativos permite voltar à carteira ativa sem recarregar', async ({ page }) => {
  const { state } = await setup(page)
  await page.goto('/clientes')
  await expect(page.getByRole('table')).toContainText('Aurora')
  state.failArchives = true
  await page.getByRole('button', { name: 'Inativos', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Ativos', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Ativos', exact: true }).click()
  await expect(page.getByRole('table')).toContainText('Aurora')
})

test('link direto de cadastro arquivado carrega Todos e abre o cadastro correto', async ({ page }) => {
  const { calls, writes } = await setup(page)
  await page.goto('/clientes?ativo=Cedro')
  const dialog = page.getByRole('dialog', { name: 'Cliente e marca', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Nome do cliente e da marca', { exact: true })).toHaveValue('Cedro')
  await dialog.getByRole('button', { name: 'Fechar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Todos', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('table')).toContainText('Cedro')
  expect(calls.some(path => path.includes('status=arquivado'))).toBe(true)
  expect(writes).toEqual([])
})

test('link por nome com homônimo arquivado pede escolher o cadastro antes de abrir', async ({ page }) => {
  const { state, calls } = await setup(page)
  state.archivedHomonym = true
  await page.goto('/clientes?ativo=Aurora')
  const chooser = page.getByRole('dialog', { name: 'Escolher cadastro', exact: true })
  await expect(chooser).toBeVisible()
  await expect(chooser.getByText('Arquivado', { exact: true })).toBeVisible()
  expect(calls.some(path => path.includes('status=arquivado'))).toBe(true)
  expect(calls.some(path => path.includes('/operacional'))).toBe(false)
})

test('agenda conta horários por dia sem transformar filtros em disponibilidade', async ({ page }, info) => {
  const { calls, writes } = await setup(page)
  await page.goto(`/agenda?data=${selectedDate}`)
  const panel = page.getByRole('region', { name: 'Escala registrada no dia' })
  await expect(panel).toContainText('Bia')
  await expect(panel).toContainText('1/2')
  await expect(panel).toContainText('Clara')
  await expect(panel).toContainText('0/2')
  await expect(panel).not.toContainText('Ana')
  await expect(panel).not.toContainText('Dora')
  await expect(panel).toContainText('Farol')
  await expect(panel).not.toContainText('Aurora')
  await page.getByLabel('Filtrar por marca', { exact: true }).selectOption(m3)
  await expect(panel).not.toContainText('Ana')
  await expect(panel).not.toContainText('Aurora')
  expect(calls.filter(path => path.startsWith('/v1/grade?')).every(path => !path.includes('marca_id='))).toBe(true)
  await page.getByRole('button', { name: 'Semana', exact: true }).click()
  await page.getByLabel('Dia da escala registrada').selectOption('2026-09-04')
  await expect(panel).toContainText('Ana')
  await expect(panel).toContainText('Aurora')
  await expect(panel).not.toContainText('1/2')
  expect(writes).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('agenda-disponibilidade.png'), fullPage: true })
})

test('agenda não declara disponibilidade quando a consulta de reservas falha', async ({ page }) => {
  const { state } = await setup(page)
  state.failAgenda = true
  await page.goto(`/agenda?data=${selectedDate}`)
  const panel = page.getByRole('region', { name: 'Escala registrada no dia' })
  await expect(panel).toContainText('Não foi possível confirmar', { timeout: 20000 })
  await expect(panel).not.toContainText('Clara')
  await expect(panel).not.toContainText('Todas as')
})

test('agenda não confunde erro do catálogo com todas as apresentadoras escaladas', async ({ page }) => {
  const { state } = await setup(page)
  state.failPresenters = true
  await page.goto(`/agenda?data=${selectedDate}`)
  const panel = page.getByRole('region', { name: 'Escala registrada no dia' })
  await expect(panel).toContainText('Não foi possível confirmar', { timeout: 20000 })
  await expect(panel).not.toContainText('Todas as apresentadoras')
})

test('financeiro preserva homônimos e abre o detalhe da identidade declarada pela API', async ({ page }, info) => {
  const { calls, writes } = await setup(page)
  await page.goto('/financeiro?tab=cliente')
  const table = page.getByRole('table')
  await expect(table.locator('tbody tr')).toHaveCount(2)
  await table.locator('tbody tr').first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect.poll(() => calls.some(path => path.startsWith(`/v1/clientes/${c1}/operacional`))).toBe(true)
  await dialog.getByRole('button', { name: 'Fechar', exact: true }).click()
  await table.locator('tbody tr').last().click()
  await expect(dialog).toBeVisible()
  await expect.poll(() => calls.some(path => path.startsWith(`/v1/marcas/${m3}/operacional`))).toBe(true)
  expect(calls.some(path => path.startsWith(`/v1/clientes/${m3}/operacional`))).toBe(false)
  expect(writes).toEqual([])
  await page.screenshot({ path: info.outputPath('financeiro-identidade.png'), fullPage: true })
})
