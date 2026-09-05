import { expect, test, type Page } from '@playwright/test'

const tenant = '11111111-1111-4111-8111-111111111111'
const cabine1 = '22222222-2222-4222-8222-222222222221'
const cabine2 = '22222222-2222-4222-8222-222222222222'
const marca = '33333333-3333-4333-8333-333333333333'
const agenda = '44444444-4444-4444-8444-444444444444'
const live = '55555555-5555-4555-8555-555555555555'
const selectedDate = '2026-09-05'

const acompanhamento = {
  data: selectedDate,
  timezone: 'America/Sao_Paulo',
  cabines: [{
    id: cabine1, numero: 1, nome: 'Principal', ativo: true, status_fisico: 'disponivel',
    sem_reserva: false, programacao_grade: [], minutos_reais: 60,
    planejamentos: [{
      id: agenda, tipo: 'live', status_agenda: 'confirmado', situacao: 'registro_pendente',
      cancelamento_origem: null, marca_id: marca, marca_nome: 'Marca Aurora',
      apresentadora_id: null, apresentadora_nome: null,
      data_inicio: '2026-09-05T11:00:00Z', data_fim: '2026-09-05T14:00:00Z',
      observacoes: null, live_ids: [], live_candidata_ids: [], minutos_reais: 0,
    }],
    execucoes_sem_reserva: [{
      id: live, situacao: 'sem_reserva', status_live: 'encerrada', marca_id: marca, marca_nome: 'Marca Aurora',
      iniciado_em: '2026-09-05T15:00:00Z', encerrado_em: '2026-09-05T16:00:00Z',
      agenda_candidata_ids: [], minutos_reais: 60,
    }],
  }, {
    id: cabine2, numero: 2, nome: 'Apoio', ativo: true, status_fisico: 'disponivel',
    sem_reserva: true, programacao_grade: [], minutos_reais: 0, planejamentos: [], execucoes_sem_reserva: [],
  }],
  cabine_desconhecida: {
    id: null, numero: null, nome: null, ativo: null, status_fisico: 'desconhecida',
    sem_reserva: true, programacao_grade: [], minutos_reais: 0, planejamentos: [], execucoes_sem_reserva: [],
  },
}

async function setup(page: Page) {
  await page.addInitScript(({ tenantId }) => {
    localStorage.setItem('livelab.react.remember', 'true')
    localStorage.setItem('livelab.react.access_token', 'local-grade-token')
    localStorage.setItem('livelab.react.refresh_token', 'local-grade-refresh')
    localStorage.setItem('livelab-theme', 'light')
    localStorage.setItem('livelab.react.user', JSON.stringify({ id: 'grade-user', nome: 'Operadora', papel: 'franqueado', tenant_id: tenantId, onboarding_completed: true }))
  }, { tenantId: tenant })

  await page.route('**/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const ok = (value: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value) })
    if (route.request().method() !== 'GET') return route.fulfill({ status: 405, json: { error: 'Fixture somente leitura' } })
    if (url.pathname === '/v1/grade/acompanhamento') return ok(acompanhamento)
    if (url.pathname === '/v1/grade') return ok({ dias: [{ data: selectedDate, celulas: [] }] })
    if (url.pathname === '/v1/cabines') return ok(acompanhamento.cabines.map((cabine) => ({ id: cabine.id, numero: cabine.numero, nome: cabine.nome, status: cabine.status_fisico, ativo: true })))
    if (url.pathname === '/v1/marcas') return ok([{ id: marca, nome: 'Marca Aurora', status: 'ativa' }])
    if (url.pathname === '/v1/lives') return ok(url.searchParams.get('paginado') === '1' ? { items: [], total: 0, page: 0, limit: 50 } : [])
    if (url.pathname === '/v1/lives/duplicatas') return ok({ clusters: [] })
    if (['/v1/clientes', '/v1/apresentadoras', '/v1/agenda', '/v1/videos', '/v1/leads'].includes(url.pathname)) return ok([])
    if (url.pathname === '/v1/crm/summary') return ok({ summary: {}, totals: {} })
    return route.fulfill({ status: 501, json: { error: `Sem fixture para ${url.pathname}` } })
  })
}

test('grade diária mostra planejado x realizado com ações e layout responsivo', async ({ page }, info) => {
  await setup(page)
  await page.goto(`/conteudo?tab=agenda&data=${selectedDate}`)

  const panel = page.getByRole('region', { name: 'Acompanhamento operacional' })
  await expect(panel).toBeVisible()
  await expect(panel.getByText('Registro pendente', { exact: true })).toBeVisible()
  await expect(panel.getByText('Sem reserva', { exact: true })).toBeVisible()
  const registerHref = await panel.getByRole('link', { name: 'Registrar execução' }).getAttribute('href')
  expect(registerHref).toContain(`agenda=${agenda}`)
  expect(registerHref).toContain('pendencia=cadastro')
  expect(registerHref).toContain('origem=grade')
  const liveHref = await panel.getByRole('link', { name: 'Ver execução' }).getAttribute('href')
  expect(liveHref).toContain(`live=${live}`)
  expect(liveHref).toContain('origem=grade')

  await panel.getByRole('button', { name: 'Cabine 2' }).click()
  await expect(panel.getByText('Sem reservas ou execuções registradas')).toBeVisible()
  await expect(panel.getByText(/capacidade.*vend/i)).toHaveCount(0)
  await page.getByRole('combobox', { name: 'Filtrar por marca', exact: true }).selectOption(marca)
  await expect(panel.getByText('Visão geral do dia. Os filtros de marca e apresentadora acima se aplicam à programação da grade.')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('grade-acompanhamento.png'), fullPage: true })
})
