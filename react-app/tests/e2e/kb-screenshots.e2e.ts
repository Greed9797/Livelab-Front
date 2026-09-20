/**
 * Screenshot capture for Knowledge Base UI (current production React design).
 * Learner home (Base de treinamento TikTok) plus Administrar Base.
 * Dark shell, textual sidebar, Novo material only behind Administrar.
 *
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
  content_markdown:
    '## Antes de ir ao ar\n\n1. Cabine limpa e iluminada\n2. Microfone e câmera testados\n3. Produtos da marca na mesa\n4. Script de abertura revisado\n\n> Dica: confirme o GMV meta do turno com o supervisor.',
  material_type: 'playbook',
  status: 'published',
  revision: 1,
  category_id: '22222222-2222-4222-8222-222222222222',
  category_name: 'Operação de cabine',
  category_slug: 'operacao-de-cabine',
  tags: ['live', 'ops', 'nivel:iniciante', 'tema:live', 'duracao:6'],
  updated_at: '2026-09-16T10:00:00.000Z',
  published_at: '2026-09-16T10:00:00.000Z',
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
        id: 'kb-preview-franqueado',
        nome: 'Leonardo Ops',
        email: 'ops@livelab.test',
        papel: 'franqueado',
        tenant_id: 'local-tenant',
        tenant_nome: 'Grupo W3',
        onboarding_completed: true,
      }),
    )
    localStorage.setItem('livelab-theme', 'dark')
    localStorage.setItem('livelab.sidebar.expanded', 'true')
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
        {
          id: material.category_id,
          name: 'Operação de cabine',
          slug: 'operacao-de-cabine',
          is_active: true,
          article_count: 2,
        },
        {
          id: '44444444-4444-4444-8444-444444444444',
          name: 'Onboarding',
          slug: 'onboarding',
          is_active: true,
          article_count: 0,
        },
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

test('capture knowledge base UI previews (production React dark sidebar)', async ({ page }) => {
  await setup(page)
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('/conhecimento')

  await expect(page.getByRole('heading', { name: 'Base de treinamento TikTok', exact: true })).toBeVisible()
  await expect(page.getByText('Comece aqui', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Novo material', exact: true })).toHaveCount(0)
  await expect(page.getByRole('tab', { name: 'Início', exact: true })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Trilhas', exact: true })).toBeVisible()
  await expect(page.getByText('Recomendado para você', { exact: true })).toBeVisible()
  await expect(page.getByText('Primeira Live que converte', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Home', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Clientes', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Agenda', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Lives', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Analytics', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Financeiro', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Base', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ranking', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Configurações', exact: true })).toBeVisible()
  await expect(page.getByText('Grupo W3', { exact: true })).toBeVisible()
  await expect(page.getByText('Checklist pré-live', { exact: true })).toBeVisible()

  await page.screenshot({ path: path.join(MEDIA, 'kb-master-ctas.png'), fullPage: false })

  await page.getByRole('button', { name: 'Administrar Base', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Administrar Base', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Novo material', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Todas as bibliotecas', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Biblioteca da rede', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Gerenciar categorias', exact: true })).toBeVisible()
  const novo = page.getByRole('button', { name: 'Novo material', exact: true })
  const bg = await novo.evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(bg).not.toMatch(/oklch\(0\.592/)
  await page.getByRole('button', { name: /Unidade: Operação de cabine/ }).click()
  await expect(page.getByText('Checklist pré-live', { exact: true })).toBeVisible()
  await page.screenshot({ path: path.join(MEDIA, 'kb-list.png'), fullPage: false })

  await page.getByRole('button', { name: 'Gerenciar categorias', exact: true }).click()
  await expect(page.getByRole('dialog', { name: /Gerenciar categorias|Categorias/ })).toBeVisible()
  await expect(page.getByLabel('Nova categoria')).toBeVisible()
  await page.screenshot({ path: path.join(MEDIA, 'kb-categories-admin.png'), fullPage: false })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)


  await page.getByText('Checklist pré-live', { exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Checklist pré-live', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Antes de ir ao ar' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Copiar link', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Editar', exact: true })).toBeVisible()
  await page.screenshot({ path: path.join(MEDIA, 'kb-reader.png'), fullPage: false })
})
