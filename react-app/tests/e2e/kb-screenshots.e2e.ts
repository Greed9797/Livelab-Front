/**
 * Screenshot capture for Knowledge Base UI (published design system).
 * Run: npx playwright test tests/e2e/kb-screenshots.e2e.ts --project=chromium
 */
import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'

const MEDIA = '/cursor/stores/bc-bc80dd72-8325-4787-8220-fedc9d8e955f/media'

const material = {
  id: '11111111-1111-4111-8111-111111111111',
  titulo: 'Checklist pré-live',
  slug: 'checklist-pre-live',
  excerpt: 'O que validar 15 minutos antes de ir ao ar.',
  content_markdown: '## Antes de ir ao ar\n\n1. Cabine limpa e iluminada\n2. Microfone e câmera testados\n3. Produtos da marca na mesa\n4. Script de abertura revisado\n\n> Dica: confirme o GMV meta do turno com o supervisor.',
  material_type: 'playbook',
  status: 'published',
  revision: 1,
  category_id: '22222222-2222-4222-8222-222222222222',
  category_name: 'Operação de cabine',
  category_slug: 'operacao-de-cabine',
  tags: ['live', 'ops'],
  updated_at: '2026-09-16T10:00:00.000Z',
}

const material2 = {
  ...material,
  id: '33333333-3333-4333-8333-333333333333',
  titulo: 'Encerramento e GMV',
  slug: 'encerramento-e-gmv',
  excerpt: 'Como registrar resultado e fechar a sessão.',
  content_markdown: '## Encerramento\n\nRegistre o GMV final antes de liberar a cabine.',
}

async function setup(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('livelab.react.remember', 'true')
    localStorage.setItem('livelab.react.access_token', 'kb-preview-token')
    localStorage.setItem('livelab.react.refresh_token', 'kb-preview-refresh')
    localStorage.setItem(
      'livelab.react.user',
      JSON.stringify({
        id: 'kb-preview-master',
        nome: 'Leonardo Master',
        email: 'master@livelab.test',
        papel: 'franqueador_master',
        tenant_id: 'local-tenant',
        tenant_nome: 'Livelab Preview',
        onboarding_completed: true,
      }),
    )
    localStorage.setItem('livelab-theme', 'light')
  })

  await page.route('**/*', (route) =>
    new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.fulfill({ status: 204 }),
  )

  await page.route('**/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const pathName = url.pathname
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

    if (pathName === '/v1/knowledge/unit/categories') {
      return json([
        { id: material.category_id, name: 'Operação de cabine', slug: 'operacao-de-cabine', is_active: true },
        { id: '44444444-4444-4444-8444-444444444444', name: 'Onboarding', slug: 'onboarding', is_active: true },
      ])
    }
    if (pathName === '/v1/knowledge/categories') {
      return json([{ id: 'global-1', slug: 'rede-ops', nome: 'Rede · Ops', name: 'Rede · Ops' }])
    }
    if (pathName === '/v1/knowledge/articles') return json([])
    if (pathName === '/v1/knowledge/unit/materials') {
      return json({ items: [material, material2], page: 1, page_size: 48, has_more: false })
    }
    if (
      pathName === `/v1/knowledge/unit/materials/${material.slug}` ||
      pathName === `/v1/knowledge/unit/materials/${material.id}`
    ) {
      return json(material)
    }
    if (pathName === '/v1/auth/logout') return json({ ok: true })
    return json([])
  })
}

test('capture knowledge base UI previews (published design system)', async ({ page }) => {
  await setup(page)
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('/conhecimento')

  await expect(page.getByRole('heading', { name: 'Base da unidade', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Gerenciar categorias', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Novo material', exact: true })).toBeVisible()
  await expect(page.getByText('Checklist pré-live', { exact: true })).toBeVisible()

  // Primary CTA should be brand orange, not pink oklch
  const novo = page.getByRole('button', { name: 'Novo material', exact: true })
  const bg = await novo.evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(bg).not.toMatch(/oklch\(0\.592/)
  // rgb approx of #ff5a1f / #ff4d1c
  expect(bg).toMatch(/rgb\(\s*(255|255)\s*,\s*(7[0-9]|9[0-9]|[4-5]\d)\s*,\s*(2[0-9]|3[0-9])\s*\)/)

  await page.screenshot({ path: path.join(MEDIA, 'kb-master-ctas.png'), fullPage: false })

  await page.getByRole('button', { name: 'Unidade: Operação de cabine', exact: true }).click()
  await expect(page.getByText('Checklist pré-live', { exact: true })).toBeVisible()
  await page.screenshot({ path: path.join(MEDIA, 'kb-list.png'), fullPage: false })

  await page.getByText('Checklist pré-live', { exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Checklist pré-live', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Antes de ir ao ar' })).toBeVisible()
  await page.screenshot({ path: path.join(MEDIA, 'kb-reader.png'), fullPage: false })
})
