import { expect, test, type Page } from '@playwright/test'

const liveId = '11111111-1111-4111-8111-111111111111'

async function setup(page: Page, papel: string, writes: string[]) {
  await page.addInitScript(({ role }) => {
    localStorage.setItem('livelab.react.remember', 'true')
    localStorage.setItem('livelab.react.access_token', 'local-exclude-test')
    localStorage.setItem('livelab.react.refresh_token', 'local-exclude-refresh')
    localStorage.setItem('livelab.react.user', JSON.stringify({
      id: 'exclude-user',
      nome: 'Gestor local',
      papel: role,
      tenant_id: 'local-tenant',
      onboarding_completed: true,
    }))
    localStorage.setItem('livelab-theme', 'light')
    localStorage.setItem('livelab.sidebar.expanded', 'true')
  }, { role: papel })

  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.fulfill({ status: 204 }))
  await page.route('**/v1/**', async route => {
    const url = new URL(route.request().url())
    const method = route.request().method()
    if (method !== 'GET') {
      writes.push(`${method} ${url.pathname}`)
      return route.fulfill({ status: method === 'DELETE' ? 204 : 200, body: '' })
    }
    if (url.pathname === '/v1/lives' && url.searchParams.get('paginado') === '1') {
      return route.fulfill({
        json: {
          items: [{
            id: liveId,
            marca_nome: 'Marca Aurora',
            status: 'encerrada',
            status_publicacao: 'publicado',
            origem_dados: 'manual',
            iniciado_em: '2026-09-01T15:00:00.000Z',
            encerrado_em: '2026-09-01T16:00:00.000Z',
          }],
          total: 1,
          page: 0,
          limit: 25,
        },
      })
    }
    if (url.pathname === '/v1/lives/duplicatas') return route.fulfill({ json: { clusters: [] } })
    if (url.pathname === '/v1/lives/submissoes-apresentadoras') return route.fulfill({ json: { items: [] } })
    if (url.pathname.endsWith('/uniao')) return route.fulfill({ status: 200, contentType: 'application/json', body: 'null' })
    return route.fulfill({ json: [] })
  })
}

test('gestor master exclui pela ação que já existe', async ({ page }, info) => {
  const writes: string[] = []
  await setup(page, 'franqueador_master', writes)
  page.on('dialog', dialog => dialog.accept())
  await page.goto('/lives')
  await expect(page).toHaveURL(/\/lives$/)
  if (info.project.name === 'mobile-chrome') {
    await page.getByRole('button', { name: /Abrir live de Marca Aurora/ }).click()
    await page.getByText('Outras ações', { exact: true }).click()
    await page.getByRole('button', { name: 'Excluir live' }).click()
  } else {
    await page.getByTitle('Mais opções').click()
    await page.getByRole('button', { name: 'Excluir', exact: true }).click()
  }
  await expect.poll(() => writes).toContain(`DELETE /v1/lives/${liveId}`)
  expect(writes.filter(entry => entry.startsWith('DELETE '))).toEqual([`DELETE /v1/lives/${liveId}`])
})

test('apresentadora não chega na exclusão do gestor', async ({ page }) => {
  const writes: string[] = []
  await setup(page, 'apresentadora', writes)
  await page.goto('/lives')
  await expect(page).toHaveURL(/\/minha-home$/)
  expect(writes.filter(entry => entry.startsWith('DELETE '))).toEqual([])
})

test('auditor abre a lista e não vê excluir', async ({ page }, info) => {
  const writes: string[] = []
  await setup(page, 'auditor', writes)
  await page.goto('/lives')
  await expect(page).toHaveURL(/\/lives$/)
  if (info.project.name === 'mobile-chrome') {
    await page.getByRole('button', { name: /Abrir live de Marca Aurora/ }).click()
    await expect(page.getByRole('button', { name: 'Excluir live' })).toHaveCount(0)
  } else {
    await expect(page.getByTitle('Mais opções')).toHaveCount(0)
  }
  expect(writes.filter(entry => entry.startsWith('DELETE '))).toEqual([])
})
