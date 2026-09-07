import { expect, test, type Page } from '@playwright/test'

type Goals = { meta_gmv: number; meta_horas_live: number | null; meta_gmv_hora: number | null }
const tenant = '11111111-1111-4111-8111-111111111111'
const marca = '22222222-2222-4222-8222-222222222222'

async function setup(page: Page, options: { role?: string; configured?: boolean; failSave?: boolean; noHours?: boolean } = {}) {
  const goals: Record<string, Goals> = { '2026-09': { meta_gmv: 600000, meta_horas_live: options.configured ? 1100 : null, meta_gmv_hora: options.configured ? 550 : null } }
  const writes: Record<string, unknown>[] = []
  const monthlyRequests: string[] = []
  await page.addInitScript(({ role, tenantId }) => {
    localStorage.setItem('livelab.react.remember', 'true')
    localStorage.setItem('livelab.react.access_token', 'synthetic-goals-token')
    localStorage.setItem('livelab.react.refresh_token', 'synthetic-refresh')
    localStorage.setItem('livelab-theme', 'dark')
    localStorage.setItem('livelab.react.user', JSON.stringify({ id: tenantId, nome: 'Teste local', papel: role, tenant_id: tenantId, onboarding_completed: true }))
  }, { role: options.role ?? 'franqueado', tenantId: tenant })
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.fulfill({ status: 204 }))
  await page.route('**/v1/**', async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname
    if (path === '/v1/analytics/unidade-mensal') {
      monthlyRequests.push(url.search)
      const mes = url.searchParams.get('ano_mes') ?? ''
      const value = goals[mes] ?? { meta_gmv: 0, meta_horas_live: null, meta_gmv_hora: null }
      const hours = options.noHours ? 0 : 220
      return route.fulfill({ json: {
        ano_mes: mes, escopo: 'unidade',
        periodo: { inicio: `${mes}-01`, fim: `${mes}-30`, dias_no_mes: 30, dias_decorridos: mes === '2026-09' ? 6 : 0 },
        realizado: { horas_live: hours, gmv: hours * 500, gmv_por_hora: hours > 0 ? 500 : null },
        projecao: mes === '2026-09' ? { horas_live: hours * 5, gmv: hours * 2500, gmv_por_hora: hours > 0 ? 500 : null } : null,
        metas: { horas_live: value.meta_horas_live, gmv_por_hora: value.meta_gmv_hora },
      } })
    }
    if (req.method() !== 'GET') {
      if (path !== '/v1/meta-unidade' || req.method() !== 'PUT') return route.fulfill({ status: 405, json: { error: 'Escrita não prevista no teste' } })
      const body = req.postDataJSON()
      writes.push(body)
      if (options.failSave) return route.fulfill({ status: 500, json: { error: 'Falha simulada' } })
      const previous = goals[body.ano_mes] ?? { meta_gmv: 0, meta_horas_live: null, meta_gmv_hora: null }
      goals[body.ano_mes] = { ...previous, ...body }
      return route.fulfill({ json: goals[body.ano_mes] })
    }
    if (path === '/v1/analytics/diario') return route.fulfill({ json: [] })
    if (path === '/v1/analytics/audiencia-marcas') return route.fulfill({ json: { rows: [] } })
    if (path === '/v1/analytics/funil') return route.fulfill({ json: { etapas: [], resumo: { total_lives: 0 }, cobertura: {} } })
    if (path === '/v1/analytics/assiduidade') return route.fulfill({ json: { dias: [], apresentadoras: [], metas: { dia_util_horas: 5.5, folga_horas: 4 } } })
    if (path === '/v1/marcas') return route.fulfill({ json: [{ id: marca, nome: 'Marca de teste' }] })
    if (path === `/v1/marcas/${marca}`) return route.fulfill({ json: { id: marca, nome: 'Marca de teste' } })
    if (path === '/v1/apresentadoras' || path.startsWith('/v1/comissoes/')) return route.fulfill({ json: [] })
    return route.fulfill({ status: 501, json: { error: `Fixture ausente: ${path}` } })
  })
  return { writes, goals, monthlyRequests }
}

async function selectMonth(page: Page, month = '2026-09') {
  await page.getByRole('button', { name: 'Personalizado', exact: true }).click()
  await page.getByLabel('Data inicial').fill(`${month}-01`)
  await page.getByLabel('Data final').fill(`${month}-06`)
}

test('salva metas mensais sem alterar GMV e preserva o escopo da unidade', async ({ page }, info) => {
  const { writes, goals, monthlyRequests } = await setup(page)
  await page.goto('/analytics-dashboard')
  await selectMonth(page)
  const section = page.getByRole('region', { name: 'Metas operacionais da unidade' })
  await expect(section.getByText('Meta não definida', { exact: true }).first()).toBeVisible()
  await section.getByRole('button', { name: 'Editar metas' }).click()
  const modal = page.getByRole('dialog')
  await modal.getByLabel('Meta de horas em live', { exact: true }).fill('1100')
  await modal.getByLabel('Meta de GMV por hora', { exact: true }).fill('550,00')
  await modal.getByRole('button', { name: 'Salvar metas' }).click()
  await expect(modal).toHaveCount(0)
  await expect(section.getByText(/^Dentro da meta/)).toBeVisible()
  await expect(section.getByText(/^Abaixo da meta/)).toBeVisible()
  expect(writes).toEqual([{ ano_mes: '2026-09', meta_horas_live: 1100, meta_gmv_hora: 550 }])
  expect(goals['2026-09'].meta_gmv).toBe(600000)
  await page.getByLabel('Filtrar por cliente ou marca').selectOption(marca)
  await expect(section.getByText(/^Dentro da meta/)).toBeVisible()
  expect(monthlyRequests.every(search => !search.includes('marca') && !search.includes('apresentadora'))).toBe(true)
  await section.screenshot({ path: info.outputPath('metas-configuradas.png') })
  await page.reload()
  await selectMonth(page)
  await section.getByRole('button', { name: 'Editar metas' }).click()
  await expect(page.getByRole('dialog').getByLabel('Meta de horas em live', { exact: true })).toHaveValue('1.100')
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click()
  await selectMonth(page, '2026-10')
  await expect(section.getByText(/^Dentro da meta/)).toHaveCount(0)
  await expect(section.getByText(/^Abaixo da meta/)).toHaveCount(0)
  expect(goals['2026-10']).toBeUndefined()
  await selectMonth(page)
  await section.getByRole('button', { name: 'Editar metas' }).click()
  await page.getByRole('dialog').getByLabel('Meta de horas em live', { exact: true }).fill('')
  await page.getByRole('dialog').getByLabel('Meta de GMV por hora', { exact: true }).fill('')
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar metas' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(goals['2026-09']).toMatchObject({ meta_gmv: 600000, meta_horas_live: null, meta_gmv_hora: null })
})

test('mantém os valores editados após falha de gravação', async ({ page }, info) => {
  const { writes, goals } = await setup(page, { configured: true, failSave: true })
  await page.goto('/analytics-dashboard')
  await selectMonth(page)
  await page.getByRole('button', { name: 'Editar metas' }).click()
  const modal = page.getByRole('dialog')
  await modal.getByLabel('Meta de horas em live', { exact: true }).fill('1..2')
  await modal.getByRole('button', { name: 'Salvar metas' }).click()
  await expect(modal.getByRole('alert')).toBeVisible()
  expect(writes).toEqual([])
  await modal.getByLabel('Meta de horas em live', { exact: true }).fill('1200,25')
  await modal.getByLabel('Meta de GMV por hora', { exact: true }).fill('')
  await modal.getByRole('button', { name: 'Salvar metas' }).click()
  await expect(page.getByText('O servidor está indisponível no momento.', { exact: true })).toBeVisible()
  await expect(modal.getByLabel('Meta de horas em live', { exact: true })).toHaveValue('1200,25')
  expect(writes).toEqual([{ ano_mes: '2026-09', meta_horas_live: 1200.25, meta_gmv_hora: null }])
  expect(goals['2026-09'].meta_horas_live).toBe(1100)
  await modal.screenshot({ path: info.outputPath('metas-erro-preserva-edicao.png') })
})

test('não classifica GMV por hora sem base de horas', async ({ page }) => {
  await setup(page, { configured: true, noHours: true })
  await page.goto('/analytics-dashboard')
  await selectMonth(page)
  const section = page.getByRole('region', { name: 'Metas operacionais da unidade' })
  await expect(section.getByText('Sem dados', { exact: true })).toBeVisible()
  await expect(section.getByText(/^Dentro da meta/)).toHaveCount(0)
  // A régua de horas ainda pode mostrar zero realizado contra a meta explícita.
  await expect(section.getByText(/^Abaixo da meta/)).toHaveCount(1)
})

test('não requisita configuração da unidade com papel de consulta', async ({ page }) => {
  const { monthlyRequests, writes } = await setup(page, { role: 'financeiro_readonly' })
  await page.goto('/analytics-dashboard')
  await expect(page.getByRole('heading', { name: 'Resultados da operação' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Editar metas' })).toHaveCount(0)
  expect(monthlyRequests).toEqual([])
  expect(writes).toEqual([])
})
