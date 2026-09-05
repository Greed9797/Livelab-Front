import { expect, test } from '@playwright/test'

for (const theme of ['light', 'dark']) {
  test(`paginação de lives tem setas visíveis e navega até os limites no tema ${theme}`, async ({ page }, info) => {
    const writes: string[] = []
    await page.addInitScript(selected => {
      localStorage.setItem('livelab.react.remember', 'true')
      localStorage.setItem('livelab.react.access_token', 'local-pagination-test')
      localStorage.setItem('livelab.react.refresh_token', 'local-pagination-refresh')
      localStorage.setItem('livelab.react.user', JSON.stringify({ id: 'local-user', nome: 'Teste local', papel: 'franqueado', tenant_id: 'local-tenant', onboarding_completed: true }))
      localStorage.setItem('livelab-theme', selected)
    }, theme)
    const rows = Array.from({ length: 51 }, (_, index) => ({
      id: `local-live-${index}`, marca_nome: 'Marca de teste', cliente_nome: 'Marca de teste',
      status: 'encerrada', status_publicacao: 'publicado', origem_dados: 'manual', tipo: 'cliente',
      iniciado_em: '2026-09-04T12:00:00Z', encerrado_em: '2026-09-04T14:00:00Z', manual_gmv: 100, final_orders_count: 1,
    }))
    await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.fulfill({ status: 204 }))
    await page.route('**/v1/**', route => {
      const url = new URL(route.request().url())
      if (route.request().method() !== 'GET') {
        writes.push(route.request().method() + ' ' + url.pathname)
        return route.fulfill({ status: 405, json: {} })
      }
      if (url.pathname === '/v1/lives/duplicatas') return route.fulfill({ json: { clusters: [] } })
      if (url.pathname === '/v1/lives' && url.searchParams.get('paginado') === '1') {
        const current = Number(url.searchParams.get('page') ?? 0)
        const limit = Number(url.searchParams.get('limit') ?? 25)
        return route.fulfill({ json: { items: rows.slice(current * limit, (current + 1) * limit), total: rows.length, page: current, limit } })
      }
      return route.fulfill({ json: [] })
    })
    await page.goto('/lives?periodo=custom&data_inicio=2026-09-04&data_fim=2026-09-04')
    const first = page.getByRole('button', { name: 'Primeira página', exact: true })
    const previous = page.getByRole('button', { name: 'Página anterior', exact: true })
    const next = page.getByRole('button', { name: 'Próxima página', exact: true })
    const last = page.getByRole('button', { name: 'Última página', exact: true })
    await expect(page.getByText('Página 1 de 3', { exact: true })).toBeVisible()
    await next.scrollIntoViewIfNeeded()
    for (const button of [first, previous, next, last]) {
      const geometry = await button.evaluate(el => {
        const style = getComputedStyle(el), rect = el.getBoundingClientRect()
        const svg = el.querySelector('svg')!.getBoundingClientRect()
        return { width: rect.width, height: rect.height, iconWidth: svg.width, iconHeight: svg.height, paddingLeft: style.paddingLeft, paddingRight: style.paddingRight }
      })
      await test.info().attach('button-geometry', { body: JSON.stringify(geometry), contentType: 'application/json' })
      expect(geometry.iconWidth, JSON.stringify(geometry)).toBeGreaterThanOrEqual(14)
      expect(geometry.iconHeight).toBeGreaterThanOrEqual(14)
      expect(geometry.width).toBeGreaterThanOrEqual(36)
      expect(geometry.height).toBeGreaterThanOrEqual(36)
    }
    await expect(first).toBeDisabled()
    await expect(previous).toBeDisabled()
    await expect(next).toBeEnabled()
    await next.focus()
    await expect(next).toBeFocused()
    await expect(next).toHaveCSS('outline-style', 'solid')
    await page.screenshot({ path: info.outputPath(`pagination-${theme}.png`) })
    await page.keyboard.press('Enter')
    await expect(page.getByText('Página 2 de 3', { exact: true })).toBeVisible()
    await expect(previous).toBeEnabled()
    await previous.click()
    await expect(page.getByText('Página 1 de 3', { exact: true })).toBeVisible()
    await last.click()
    await expect(page.getByText('Página 3 de 3', { exact: true })).toBeVisible()
    await expect(next).toBeDisabled()
    await expect(last).toBeDisabled()
    await first.click()
    await expect(page.getByText('Página 1 de 3', { exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(writes).toEqual([])
  })
}
