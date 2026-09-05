import { expect, test, type Page } from '@playwright/test'

const names = ['Ana', 'Bia', 'Clara', 'Diana', 'Elisa', 'Flora']
const brands = ['Aurora', 'Brisa', 'Canto', 'Duna', 'Estrela']
const dates = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05']

async function setup(page: Page, theme = 'dark', scenario = 'live') {
  const writes: string[] = []
  await page.addInitScript(selected => {
    localStorage.setItem('livelab.react.remember', 'true')
    localStorage.setItem('livelab.react.access_token', 'local-rebranding-fixture')
    localStorage.setItem('livelab.react.refresh_token', 'local-rebranding-refresh')
    localStorage.setItem('livelab.react.user', JSON.stringify({ id: 'visual-user', nome: 'Operadora local', papel: 'franqueado', tenant_id: 'local-tenant', onboarding_completed: true }))
    localStorage.setItem('livelab-theme', selected)
    localStorage.setItem('livelab.sidebar.expanded', 'true')
  }, theme)
  // Dados sintéticos: só servidor local e fontes públicas podem sair do navegador.
  await page.route('**/*', route => ['127.0.0.1', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.fulfill({ status: 204 }))
  await page.route('**/v1/**', route => {
    const url = new URL(route.request().url())
    if (route.request().method() !== 'GET') {
      writes.push(route.request().method() + ' ' + url.pathname)
      return route.fulfill({ status: 405, json: {} })
    }
    if (url.pathname === '/v1/home/dashboard') return route.fulfill({ json: {
      mes_referencia: url.searchParams.get('mes') ?? '2026-09',
      gmv_total_mes: url.searchParams.get('mes') ? 90000 : 182000,
      gmv_mes_prev: 165000, gmv_lives_mes: 182000, meta_mes: 250000, ritmo_projetado: 220000,
      periodo: { dia_util: 5, dias_uteis_total: 22 },
      lives_mes: 84, lives_prev: 70, horas_live: 172, horas_prev: 160,
      gmv_por_live: 2166.67, gmv_por_live_prev: 2000, gmv_por_hora: 1058.14, gmv_por_hora_prev: 950,
      cabines: scenario === 'live' ? [{ id: 'cabine-1', numero: 1, status: 'ao_vivo', live_atual_id: 'live-1', apresentador_nome: 'Ana', cliente_nome: 'Aurora', duracao_min: 42, gmv_atual: 1230 }, { id: 'cabine-2', numero: 2, status: 'disponivel' }] : [],
      ranking_apresentadoras_mes: [
        ...(scenario === 'unassigned' ? [] : names.map((nome, i) => ({ id: `presenter-${i}`, apresentadora_id: `presenter-${i}`, nome, gmv_total: 52000 - i * 6500, total_lives: 12, comissao_total: 850 - i * 80 }))),
        { nome: 'Sem apresentadora', gmv_total: 2000, total_lives: 2 },
      ],
      ranking_marcas_mes: brands.map((nome, i) => ({ marca_id: `brand-${i}`, nome, gmv_por_hora: 1800 - i * 230, faturamento: 80000 - i * 14000, horas_live: 50, lives: 22, pct_meta_hora: i === 4 ? null : 112 - i * 15 })),
      gmv_diario_mes: dates.map((_, i) => ({ dia: i + 1, gmv: 14000 + i * 2400, prev: 9000 + i * 2000, pedidos: 100 + i * 12 })),
    } })
    if (url.pathname === '/v1/grade') return route.fulfill({ json: { dias: [{ data: '2026-09-05', celulas: scenario === 'live' ? ['09:00', '13:00'].map(hora_inicio => ({ cabine_id: 'cabine-1', cabine_numero: 1, marca_id: 'brand-0', marca_nome: 'Aurora', apresentadora_nome: 'Ana', hora_inicio, hora_fim: hora_inicio === '09:00' ? '11:00' : '15:00' })) : [] }] } })
    if (url.pathname === '/v1/analytics/assiduidade') return route.fulfill({ json: {
      inicio: dates[0], fim: dates.at(-1), metas: { dia_util_horas: 5.5, folga_horas: 4 },
      dias: dates.map(data => ({ data, tipo: data === dates.at(-1) ? 'fim_de_semana' : 'util' })),
      apresentadoras: names.map((nome, i) => ({ id: `presenter-${i}`, nome, dias: dates.map((data, d) => ({ data, horas: d === 2 ? 0 : 6, status: d === 2 ? 'vermelho' : 'verde' })) })),
    } })
    return route.fulfill({ json: [] })
  })
  return writes
}

for (const theme of ['dark', 'light']) {
  test(`Home ${theme}: hierarquia, dados, fonte, teclado e layout responsivo`, async ({ page }, info) => {
    const writes = await setup(page, theme)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Visão da unidade')
    const status = page.getByRole('region', { name: 'Operação agora' })
    await expect(status).toContainText('Ana × Aurora')
    const kpis = page.getByRole('region', { name: 'Indicadores do mês' })
    await expect(kpis).toContainText('Lives realizadas')
    await expect(kpis).not.toContainText('Vídeos gravados')
    await expect(page.getByTestId('gmv-chart-daily')).toBeVisible()
    await expect(page.getByRole('link', { name: /atribuir/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Agenda de hoje', exact: true })).toBeVisible()
    const agenda = await page.getByRole('heading', { name: 'Agenda de hoje', exact: true }).boundingBox()
    expect(agenda!.y).toBeLessThan((await kpis.boundingBox())!.y)
    await expect(page.getByRole('region', { name: 'Agenda de hoje', exact: true }).getByRole('button')).toHaveCount(1)
    await expect(page.getByRole('region', { name: 'Agenda de hoje', exact: true })).toContainText('2 horários')
    const fonts = await page.evaluate(async () => {
      await document.fonts.load('500 14px Manrope')
      await document.fonts.ready
      return { loaded: document.fonts.check('500 14px Manrope'), family: getComputedStyle(document.body).fontFamily }
    })
    expect(fonts.loaded).toBe(true)
    expect(fonts.family).toContain('Manrope')
    const attendance = page.getByRole('region', { name: /Assiduidade/ })
    await expect(attendance).toBeVisible()
    await expect(attendance.getByText('Elisa', { exact: true })).toHaveCount(0)
    const cell = attendance.locator('button[aria-label]').first()
    await cell.focus()
    await page.keyboard.press('ArrowRight')
    await expect(attendance.locator('button:focus')).toHaveCount(1)
    expect(await cell.evaluate(el => Math.round(el.getBoundingClientRect().width))).toBe(30)
    await expect(cell.locator('svg')).toHaveCount(1)
    await attendance.getByRole('button', { name: 'Ver as 6 apresentadoras →' }).click()
    await expect(attendance.getByText('Elisa', { exact: true })).toBeVisible()
    await attendance.getByRole('button', { name: 'Mostrar menos' }).click()
    await expect(attendance.getByText('Elisa', { exact: true })).toHaveCount(0)
    const assertNumberFits = async () => {
      const metrics = await page.getByTestId('gmv-value').evaluate(el => {
        const amount = el.getBoundingClientRect()
        const panel = el.closest('[style*="container-type"]')!.getBoundingClientRect()
        return { amountRight: amount.right, amountLeft: amount.left, panelRight: panel.right, panelLeft: panel.left, fontSize: getComputedStyle(el).fontSize, viewport: innerWidth }
      })
      expect(metrics.amountRight, JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.panelRight)
      expect(metrics.amountLeft, JSON.stringify(metrics)).toBeGreaterThanOrEqual(metrics.panelLeft)
    }
    await assertNumberFits()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect?.getTiming().iterations === Infinity).length)).toBe(0)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: info.outputPath(`home-${theme}.png`), fullPage: true })
    if (info.project.name === 'chromium') {
      // Zoom real altera o viewport em pixels CSS; style.zoom não altera breakpoints.
      // 720×480 reproduz a área disponível de 1440×960 com ampliação de 200%.
      await page.setViewportSize({ width: 720, height: 480 })
      await expect(page.getByRole('button', { name: 'Abrir menu', exact: true })).toBeVisible()
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
      await assertNumberFits()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: info.outputPath(`home-${theme}-viewport200.png`), fullPage: true })
    }
    expect(writes).toEqual([])
  })
}

test('animação termina no GMV exato e não recomeça ao trocar o mês', async ({ page }) => {
  await setup(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  const amount = page.getByTestId('gmv-value')
  await expect(amount).toHaveText('182.000,00')
  const values: string[] = []
  await page.exposeFunction('recordGmv', (value: string) => values.push(value))
  await amount.evaluate(el => new MutationObserver(() => {
    void (window as unknown as { recordGmv: (value: string) => Promise<void> }).recordGmv(el.textContent ?? '')
  }).observe(el, { childList: true, characterData: true, subtree: true }))
  await page.getByLabel('Filtrar por mês').selectOption('2026-08')
  await expect(amount).toHaveText('90.000,00')
  expect(values).toContain('90.000,00')
  expect(values.every(value => value === '90.000,00')).toBe(true)
})

test('Home distingue agenda vazia de falha e mantém a pendência sem participantes atribuídos', async ({ page }) => {
  await setup(page, 'dark', 'unassigned')
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Operação agora' })).toContainText('Grade de hoje vazia')
  await expect(page.getByRole('heading', { name: 'Agenda de hoje', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /atribuir/i })).toBeVisible()
  await page.route('**/v1/grade?**', route => route.fulfill({ status: 503, json: { error: 'Falha simulada' } }))
  await page.reload()
  await expect(page.getByRole('region', { name: 'Operação agora' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Operação agora' })).not.toContainText('Grade de hoje vazia')
})
