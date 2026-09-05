import { expect, test, type Page } from '@playwright/test'

const tenantId = '11111111-1111-4111-8111-111111111111'
const auroraId = '22222222-2222-4222-8222-222222222222'
const brisaId = '33333333-3333-4333-8333-333333333333'
const semBaseId = '44444444-4444-4444-8444-444444444444'
const apresentadoraId = '55555555-5555-4555-8555-555555555555'
const currentPeriod = { from: '2026-09-01', to: '2026-09-05' }
const previousPeriod = { from: '2026-08-27', to: '2026-08-31' }

const currentRows = [
  {
    dia: '2026-09-05',
    marca_id: auroraId,
    marca_nome: 'Marca Aurora',
    cliente_id: auroraId,
    cliente_nome: 'Marca Aurora',
    apresentadora_id: apresentadoraId,
    apresentadora_nome: 'Ana',
    gmv_lives: 1_200,
    gmv_videos: 200,
    gmv_total: 1_400,
    horas_live: 4,
    pedidos: 12,
    total_lives: 2,
    total_videos: 1,
  },
  {
    dia: '2026-09-04',
    marca_id: brisaId,
    marca_nome: 'Marca Brisa',
    cliente_id: brisaId,
    cliente_nome: 'Marca Brisa',
    apresentadora_id: apresentadoraId,
    apresentadora_nome: 'Ana',
    gmv_lives: 300,
    gmv_videos: 0,
    gmv_total: 300,
    horas_live: 2,
    pedidos: 3,
    total_lives: 1,
    total_videos: 0,
  },
  {
    dia: '2026-09-03',
    marca_id: semBaseId,
    marca_nome: 'Marca Sem Base',
    cliente_id: semBaseId,
    cliente_nome: 'Marca Sem Base',
    apresentadora_id: apresentadoraId,
    apresentadora_nome: 'Ana',
    gmv_lives: 100,
    gmv_videos: 0,
    gmv_total: 100,
    horas_live: 1,
    pedidos: 1,
    total_lives: 1,
    total_videos: 0,
  },
]

const previousRows = [
  {
    dia: '2026-08-31',
    marca_id: auroraId,
    marca_nome: 'Marca Aurora',
    cliente_id: auroraId,
    cliente_nome: 'Marca Aurora',
    gmv_lives: 600,
    gmv_videos: 100,
    gmv_total: 700,
    horas_live: 2,
    pedidos: 6,
    total_lives: 1,
    total_videos: 1,
  },
  {
    dia: '2026-08-30',
    marca_id: brisaId,
    marca_nome: 'Marca Brisa',
    cliente_id: brisaId,
    cliente_nome: 'Marca Brisa',
    gmv_lives: 0,
    gmv_videos: 0,
    gmv_total: 0,
    horas_live: 0,
    pedidos: 0,
    total_lives: 0,
    total_videos: 0,
  },
]

async function setup(page: Page, theme: 'light' | 'dark' = 'light') {
  const unexpectedWrites: string[] = []
  await page.addInitScript(({ tenant, selectedTheme }) => {
    localStorage.setItem('livelab.react.remember', 'true')
    localStorage.setItem('livelab.react.access_token', 'analytics-test-token')
    localStorage.setItem('livelab.react.refresh_token', 'analytics-test-refresh')
    localStorage.setItem('livelab-theme', selectedTheme)
    localStorage.setItem('livelab.react.user', JSON.stringify({
      id: 'analytics-user',
      nome: 'Gestora E2E',
      papel: 'franqueado',
      tenant_id: tenant,
      onboarding_completed: true,
    }))
  }, { tenant: tenantId, selectedTheme: theme })

  await page.route('**/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const json = (body: unknown) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })

    if (route.request().method() !== 'GET') {
      unexpectedWrites.push(`${route.request().method()} ${url.pathname}`)
      return route.fulfill({ status: 405, json: { error: 'E2E não autoriza escrita' } })
    }

    if (url.pathname === '/v1/analytics/diario') {
      const isPrevious = url.searchParams.get('from') === previousPeriod.from
        && url.searchParams.get('to') === previousPeriod.to
      return json(isPrevious ? previousRows : currentRows)
    }
    if (url.pathname === '/v1/analytics/audiencia-marcas') return json({ rows: [
      {
        marca_id: auroraId,
        marca_nome: 'Marca Aurora',
        impressoes_live: 0,
        visualizacoes_manuais: null,
        impressoes_produto: 80,
        cliques_produto: 0,
        lives_total: 2,
        lives_com_impressoes_registradas: 2,
        lives_com_visualizacoes_registradas: 0,
        lives_com_impressoes_produto_registradas: 1,
        lives_com_cliques_produto_registrados: 1,
      },
    ] })
    if (url.pathname === '/v1/analytics/funil') return json({
      etapas: [
        { chave: 'impressoes', valor: 0 },
        { chave: 'visualizacoes', valor: null },
        { chave: 'impressoes_produto', valor: 80 },
        { chave: 'cliques', valor: 0 },
        { chave: 'pedidos', valor: 16 },
      ],
      resumo: { total_lives: 4, likes: 0, novos_seguidores: null, like_rate_medio: null },
      cobertura: {
        lives_com_impressoes_registradas: 2,
        lives_com_impressoes_produto_registradas: 1,
        lives_com_cliques_produto_registrados: 1,
      },
      tem_dados_ads: true,
    })
    if (url.pathname === '/v1/analytics/assiduidade') return json({
      inicio: url.searchParams.get('inicio'),
      fim: url.searchParams.get('fim'),
      dias: [],
      apresentadoras: [],
      metas: { dia_util_horas: 5.5, folga_horas: 4 },
    })
    if (url.pathname === '/v1/comissoes/marcas') return json([
      { id: auroraId, nome: 'Marca Aurora', gmv_total: 1_400, total_lives: 2 },
      { id: brisaId, nome: 'Marca Brisa', gmv_total: 300, total_lives: 1 },
      { id: semBaseId, nome: 'Marca Sem Base', gmv_total: 100, total_lives: 1 },
    ])
    if (url.pathname === '/v1/comissoes/apresentadoras') return json([
      { id: apresentadoraId, nome: 'Ana', gmv_total: 1_600, total_lives: 4 },
    ])
    if (url.pathname === `/v1/marcas/${auroraId}`) return json(
      { id: auroraId, nome: 'Marca Aurora', status: 'ativa', comissao_franquia_pct: 10 },
    )
    if (url.pathname === '/v1/marcas') return json([
      { id: auroraId, nome: 'Marca Aurora', status: 'ativa', comissao_franquia_pct: 10 },
      { id: brisaId, nome: 'Marca Brisa', status: 'ativa', comissao_franquia_pct: 10 },
      { id: semBaseId, nome: 'Marca Sem Base', status: 'ativa', comissao_franquia_pct: 10 },
    ])
    if (url.pathname === '/v1/apresentadoras') return json([
      { id: apresentadoraId, nome: 'Ana', status: 'ativa' },
    ])
    return route.fulfill({ status: 501, json: { error: `Sem fixture para ${url.pathname}` } })
  })
  return unexpectedWrites
}

async function selectFixedPeriod(page: Page) {
  await page.goto('/analytics-dashboard')
  await page.getByRole('button', { name: 'Personalizado', exact: true }).click()
  await page.getByLabel('Data inicial').fill(currentPeriod.from)
  await page.getByLabel('Data final').fill(currentPeriod.to)
  await expect(page.getByRole('heading', { name: 'Comparativo de marcas' })).toBeVisible()
}

function expectDrilldown(href: string | null, period: { from: string; to: string }) {
  expect(href).not.toBeNull()
  const url = new URL(href!, 'http://localhost')
  expect(url.pathname).toBe('/conteudo')
  expect(Object.fromEntries(url.searchParams)).toMatchObject({
    tab: 'lives',
    periodo: 'custom',
    data_inicio: period.from,
    data_fim: period.to,
    marca: auroraId,
    origem: 'analytics',
  })
}

test('compara atual e anterior com contexto de GMV por hora e preserva o recorte nos links', async ({ page }, info) => {
  const writes = await setup(page)
  await selectFixedPeriod(page)

  await expect(page.getByText('3 marcas · 4 lives · 7h', { exact: true })).toBeVisible()
  await expect(page.getByText('GMV de lives ÷ horas no ar', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Analisar Marca Aurora', exact: true }).click()

  const diagnostic = page.locator('section[aria-label="Diagnóstico do período: Marca Aurora"]')
  await expect(diagnostic).toBeVisible()
  await expect(diagnostic.getByText('Atual versus período anterior de mesma duração', { exact: true })).toBeVisible()
  await expect(diagnostic.getByText('4h', { exact: true })).toBeVisible()
  await expect(diagnostic.getByText('R$ 300,00/h', { exact: true })).toBeVisible()

  expectDrilldown(await diagnostic.getByRole('link', { name: 'Ver lives atuais' }).getAttribute('href'), currentPeriod)
  expectDrilldown(await diagnostic.getByRole('link', { name: 'Ver lives anteriores' }).getAttribute('href'), previousPeriod)
  await diagnostic.screenshot({ path: info.outputPath('diagnostico-marca.png') })
  await page.screenshot({ path: info.outputPath(`analytics-comparativo-${info.project.name}.png`), fullPage: true })
  expect(writes).toEqual([])
})

test('mantém ausência separada de zero e mostra cobertura parcial no tema escuro', async ({ page }, info) => {
  const writes = await setup(page, 'dark')
  await selectFixedPeriod(page)
  await expect(page.evaluate(() => localStorage.getItem('livelab-theme'))).resolves.toBe('dark')

  await page.getByRole('button', { name: 'Analisar Marca Brisa', exact: true }).click()
  await expect(page.getByText('A marca aparece no período anterior, mas sem lives; zero e ausência continuam separados.')).toBeVisible()
  await page.getByRole('button', { name: 'Analisar Marca Sem Base', exact: true }).click()
  await expect(page.getByText('Sem dado da marca no período anterior. A ausência não foi convertida em zero.')).toBeVisible()

  await expect(page.getByText('Cada métrica soma os campos registrados no período. Zero registrado aparece como 0; ausência aparece como “—”. Importações antigas podem ter gravado zero para colunas ausentes no arquivo.')).toBeVisible()
  await expect(page.getByText('Cada valor traz sua própria contagem de lives com campo registrado. Importações antigas podem gravar zero quando a coluna não existia no arquivo; confira relatórios zerados antes de comparar.', { exact: true })).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'Cobertura de registros' }).first()).toHaveAttribute('aria-valuetext', '2 de 2 lives com registro (100%)')

  await page.locator('#analytics-audience-coverage').screenshot({ path: info.outputPath('audiencia-dark.png') })
  await page.screenshot({ path: info.outputPath(`analytics-parcial-dark-${info.project.name}.png`), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(writes).toEqual([])
})

test('compartilha a série diária e atualiza sem repetir o mesmo recorte ou remontar gráficos', async ({ page }) => {
  const writes = await setup(page)
  const dailyRequests: URL[] = []
  const brandCommissionRequests: URL[] = []
  const brandDetailRequests: URL[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.pathname === '/v1/analytics/diario') dailyRequests.push(url)
    if (url.pathname === '/v1/comissoes/marcas') brandCommissionRequests.push(url)
    if (url.pathname === `/v1/marcas/${auroraId}`) brandDetailRequests.push(url)
  })

  await selectFixedPeriod(page)
  dailyRequests.length = 0
  brandCommissionRequests.length = 0

  const chartSurfaces = await page.locator('.recharts-surface').elementHandles()
  expect(chartSurfaces.length).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Atualizar', exact: true }).click()

  await expect.poll(() => dailyRequests.filter((url) =>
    url.searchParams.get('from') === currentPeriod.from && url.searchParams.get('to') === currentPeriod.to,
  ).length).toBe(1)
  await expect.poll(() => brandCommissionRequests.filter((url) =>
    url.searchParams.get('data_inicio') === currentPeriod.from && url.searchParams.get('data_fim') === currentPeriod.to,
  ).length).toBe(1)
  await expect.poll(() => Promise.all(chartSurfaces.map((surface) => surface.evaluate((node) => node.isConnected))))
    .toEqual(chartSurfaces.map(() => true))

  dailyRequests.length = 0
  await page.getByLabel('Filtrar por cliente ou marca').selectOption(auroraId)
  await expect(page.getByText('Relatório da marca', { exact: false })).toBeVisible()
  await expect.poll(() => dailyRequests.filter((url) =>
    url.searchParams.get('from') === currentPeriod.from
      && url.searchParams.get('to') === currentPeriod.to
      && url.searchParams.get('marca_id') === auroraId,
  ).length).toBe(1)
  await expect.poll(() => brandDetailRequests.length).toBe(1)

  dailyRequests.length = 0
  brandDetailRequests.length = 0
  await page.getByRole('button', { name: 'Atualizar', exact: true }).click()
  await expect.poll(() => dailyRequests.filter((url) =>
    url.searchParams.get('from') === currentPeriod.from
      && url.searchParams.get('to') === currentPeriod.to
      && url.searchParams.get('marca_id') === auroraId,
  ).length).toBe(1)
  await expect.poll(() => brandDetailRequests.length).toBe(1)
  expect(writes).toEqual([])
})
