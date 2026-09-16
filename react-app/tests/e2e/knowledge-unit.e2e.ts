import { expect, test, type Page } from '@playwright/test'

const material = {
  id: '11111111-1111-4111-8111-111111111111',
  titulo: 'Playbook de abertura',
  slug: 'playbook-de-abertura-abc123',
  excerpt: 'Passo a passo para começar uma live.',
  content_markdown: '# Abertura\n\nUse **o roteiro** com segurança.',
  material_type: 'playbook',
  status: 'published',
  revision: 1,
  category_id: '22222222-2222-4222-8222-222222222222',
  category_name: 'Operação',
  category_slug: 'operacao',
  tags: ['live', 'roteiro'],
  updated_at: '2026-09-16T10:00:00.000Z',
}

async function setup(page: Page, papel = 'franqueado') {
  const writes: Array<{ method: string; path: string; body: unknown }> = []
  await page.addInitScript(({ role }) => {
    localStorage.setItem('livelab.react.remember', 'true')
    localStorage.setItem('livelab.react.access_token', 'knowledge-e2e-token')
    localStorage.setItem('livelab.react.refresh_token', 'knowledge-e2e-refresh')
    localStorage.setItem('livelab.react.user', JSON.stringify({ id: 'knowledge-user', nome: 'Equipe local', papel: role, tenant_id: 'local-tenant', onboarding_completed: true }))
    localStorage.setItem('livelab-theme', 'light')
  }, { role: papel })
  await page.route('**/*', (route) => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.fulfill({ status: 204 }))
  await page.route('**/v1/**', async (route) => {
    const request = route.request(); const url = new URL(request.url()); const path = url.pathname
    if (request.method() !== 'GET') {
      writes.push({ method: request.method(), path, body: request.postDataJSON() })
      if (path === '/v1/knowledge/unit/materials') return route.fulfill({ status: 201, json: { ...material, id: '33333333-3333-4333-8333-333333333333', titulo: 'Novo playbook', slug: 'novo-playbook-xyz', status: 'draft', revision: 1 } })
      return route.fulfill({ status: 200, json: { ...material } })
    }
    if (path === '/v1/knowledge/unit/categories') return route.fulfill({ json: [{ id: material.category_id, name: 'Operação', slug: 'operacao' }] })
    if (path === '/v1/knowledge/unit/materials') return route.fulfill({ json: { items: papel === 'cliente_parceiro' ? [] : [material], page: 1, page_size: 48, has_more: false } })
    if (path === `/v1/knowledge/unit/materials/${material.slug}` || path === `/v1/knowledge/unit/materials/${material.id}`) return route.fulfill({ json: material })
    return route.fulfill({ json: [] })
  })
  return writes
}

test('gestão consulta a Base e cria material com editor lazy', async ({ page }) => {
  const writes = await setup(page)
  await page.goto('/conhecimento')
  await expect(page.getByRole('heading', { name: 'Base da unidade', exact: true })).toBeVisible()
  await expect(page.getByText('Playbook de abertura', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Novo material', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Novo material' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Título', exact: true }).fill('Novo playbook')
  await page.getByRole('textbox', { name: 'Conteúdo em Markdown', exact: true }).fill('## Conteúdo seguro')
  await page.getByRole('button', { name: 'Salvar material', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Novo material' })).toHaveCount(0)
  expect(writes.some((write) => write.method === 'POST' && write.path === '/v1/knowledge/unit/materials')).toBe(true)
})

test('apresentadora lê somente publicados e cliente não monta a Base', async ({ page }) => {
  await setup(page, 'apresentadora')
  await page.goto('/conhecimento')
  await expect(page.getByText('Playbook de abertura', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Novo material', exact: true })).toHaveCount(0)
  await page.getByText('Playbook de abertura', { exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Playbook de abertura', exact: true })).toBeVisible()

  await setup(page, 'cliente_parceiro')
  await page.goto('/conhecimento')
  await expect(page).toHaveURL(/\/cliente$/)
  await expect(page.getByRole('heading', { name: 'Base da unidade', exact: true })).toHaveCount(0)
})
