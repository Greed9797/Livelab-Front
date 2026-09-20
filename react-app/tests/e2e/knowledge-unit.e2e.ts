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
  tags: ['live', 'roteiro', 'nivel:iniciante', 'tema:live', 'funcao:apresentadora', 'duracao:6'],
  updated_at: '2026-09-16T10:00:00.000Z',
  published_at: '2026-09-16T10:00:00.000Z',
}

type SetupOptions = {
  global?: boolean
  video?: boolean
  attachment?: boolean
  publishEmpty?: boolean
  conflict?: boolean
  uploadFailure?: boolean
}

async function setup(page: Page, papel = 'franqueado', options: SetupOptions = {}) {
  const writes: Array<{ method: string; path: string; body: unknown }> = []
  const listedMaterial = options.video ? { ...material, titulo: 'Vídeo de onboarding', material_type: 'video', video_provider: 'youtube', video_id: 'youtube-123' } : material
  const detailMaterial = options.attachment ? { ...listedMaterial, attachments: [{ id: 'attachment-1', original_name: 'manual-operacao.pdf', mime_type: 'application/pdf', byte_size: 1024 }] } : listedMaterial
  const globalArticle = { id: 'global-article-1', slug: 'guia-rede', titulo: 'Guia da rede', excerpt: 'Material global publicado.', content_markdown: '# Guia da rede', categoria: 'Operação', status: 'published', tags: ['tema:live'], published_at: '2026-09-15T10:00:00.000Z' }
  const lessonId = 'a1111111-1111-4111-8111-111111111131'
  const networkLessonId = 'a1111111-1111-4111-8111-111111111132'
  const trailSlug = 'primeira-live-que-converte'
  const lessonCard = {
    id: lessonId,
    title: listedMaterial.titulo,
    excerpt: listedMaterial.excerpt,
    outcome: listedMaterial.excerpt,
    duration_minutes: 6,
    difficulty: 'iniciante',
    format: listedMaterial.material_type,
    audience_roles: ['apresentadora'],
    topics: ['live'],
    platforms: ['tiktok'],
    objectives: [listedMaterial.excerpt],
    prerequisites: [],
    featured: true,
    required: true,
    freshness: 'novo',
    published_at: listedMaterial.published_at,
    progress: { state: 'not_started', started_at: null, last_opened_at: null, completed_at: null },
    bookmarked: false,
    source: { kind: 'unit_material', id: listedMaterial.id, slug: listedMaterial.slug, origin: 'unidade' },
    resume_path: `/conhecimento/trilhas/${trailSlug}/aulas/${lessonId}`,
  }
  const networkCard = {
    ...lessonCard,
    id: networkLessonId,
    title: 'Guia da rede',
    excerpt: 'Material global publicado.',
    source: { kind: 'network_article', id: globalArticle.id, slug: globalArticle.slug, origin: 'rede' },
    resume_path: `/conhecimento/trilhas/${trailSlug}/aulas/${networkLessonId}`,
  }
  const starter = {
    id: 'a1111111-1111-4111-8111-111111111111',
    slug: trailSlug,
    title: 'Primeira Live que converte',
    outcome: 'Sair da primeira live com oferta clara.',
    module_count: 1,
    lesson_count: options.global ? 2 : 1,
    required_lessons: options.global ? 2 : 1,
    completed_lessons: 0,
    resume_path: lessonCard.resume_path,
    modules: [{ id: 'mod-1', title: 'Preparação', sort_order: 1, lessons: options.global ? [lessonCard, networkCard] : [lessonCard] }],
  }
  const home = {
    title: 'Base de treinamento TikTok',
    audience: 'apresentadora',
    resume: { has_started: false, lesson_id: lessonId, trail_slug: trailSlug, path: lessonCard.resume_path },
    continue_learning: null,
    start_here: starter,
    recommended: options.global ? [lessonCard, networkCard] : [lessonCard],
    featured: [lessonCard],
    starter_trail: starter,
    updates: [{ kind: 'novo', id: 'update-1', title: listedMaterial.titulo, what_changed: listedMaterial.excerpt, what_to_do_today: listedMaterial.excerpt, published_at: listedMaterial.published_at, lesson_id: lessonId }],
  }
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
      let body: unknown = null
      try { body = request.postDataJSON() } catch { body = null }
      writes.push({ method: request.method(), path, body })
      if (options.publishEmpty && path === '/v1/knowledge/unit/materials') return route.fulfill({ status: 422, json: { detail: 'O material precisa ter conteúdo antes de ser publicado.' } })
      if (options.conflict && path === `/v1/knowledge/unit/materials/${material.slug}`) return route.fulfill({ status: 409, json: { detail: 'Este material foi alterado por outra pessoa.' } })
      if (options.uploadFailure && path.endsWith('/attachments')) return route.fulfill({ status: 503, json: { detail: 'Não foi possível enviar o PDF.' } })
      if (path === '/v1/knowledge/unit/materials') return route.fulfill({ status: 201, json: { ...material, id: '33333333-3333-4333-8333-333333333333', titulo: 'Novo playbook', slug: 'novo-playbook-xyz', status: 'draft', revision: 1 } })
      if (path === `/v1/training/lessons/${lessonId}/complete`) return route.fulfill({ json: { lesson_id: lessonId, started_at: 's', last_opened_at: 's', completed_at: 'c', next_lesson_id: null, resume_path: null } })
      if (path === `/v1/training/lessons/${lessonId}/start`) return route.fulfill({ json: { lesson_id: lessonId, started_at: 's', last_opened_at: 's', completed_at: null } })
      if (path === '/v1/training/bookmarks') return route.fulfill({ status: 201, json: { lesson_id: lessonId, bookmarked: true } })
      return route.fulfill({ status: 200, json: { ...material } })
    }
    if (path === '/v1/training/home') return route.fulfill({ json: home })
    if (path === '/v1/training/trails') return route.fulfill({ json: { items: [starter] } })
    if (path === `/v1/training/trails/${trailSlug}` || path === '/v1/training/starter') return route.fulfill({ json: starter })
    if (path === `/v1/training/lessons/${lessonId}`) return route.fulfill({ json: { ...lessonCard, trail: { slug: trailSlug, title: starter.title }, module: { title: 'Preparação' }, outline: starter.modules, progress: { state: 'in_progress', started_at: 's', last_opened_at: 's', completed_at: null } } })
    if (path === `/v1/training/lessons/${networkLessonId}`) return route.fulfill({ json: { ...networkCard, trail: { slug: trailSlug, title: starter.title }, module: { title: 'Preparação' }, outline: starter.modules } })
    if (path === '/v1/training/progress') return route.fulfill({ json: { audience: 'apresentadora', last_lesson: null, items: [] } })
    if (path === '/v1/training/bookmarks') return route.fulfill({ json: { items: [] } })
    if (path === '/v1/knowledge/unit/categories') return route.fulfill({ json: [{ id: material.category_id, name: 'Operação', slug: 'operacao' }] })
    if (path === '/v1/knowledge/categories') return route.fulfill({ json: options.global ? [{ id: 'global-category-1', slug: 'operacao', nome: 'Operação' }] : [] })
    if (path === '/v1/knowledge/articles') return route.fulfill({ json: options.global ? [globalArticle] : [] })
    if (path === `/v1/knowledge/articles/${globalArticle.slug}` || path === `/v1/knowledge/articles/${globalArticle.id}`) return route.fulfill({ json: globalArticle })
    if (path === '/v1/knowledge/unit/materials') return route.fulfill({ json: { items: papel === 'cliente_parceiro' ? [] : [listedMaterial], page: 1, page_size: 48, has_more: false } })
    if (path === `/v1/knowledge/unit/materials/${listedMaterial.slug}` || path === `/v1/knowledge/unit/materials/${listedMaterial.id}`) return route.fulfill({ json: detailMaterial })
    if (path.endsWith('/attachments/attachment-1')) return route.fulfill({ json: { id: 'attachment-1', original_name: 'manual-operacao.pdf', url: 'https://cdn.example.test/manual.pdf' } })
    return route.fulfill({ json: [] })
  })
  return writes
}

test('gestão entra pela home de treino e cria material em Administrar', async ({ page }) => {
  const writes = await setup(page)
  await page.goto('/conhecimento')
  await expect(page.getByRole('heading', { name: 'Base de treinamento TikTok', exact: true })).toBeVisible()
  await expect(page.getByText('Comece aqui', { exact: true })).toBeVisible()
  await expect(page.getByText('Playbook de abertura', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Novo material', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Administrar Base', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Administrar Base', exact: true })).toBeVisible()
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
  await expect(page.getByRole('heading', { name: 'Base de treinamento TikTok', exact: true })).toBeVisible()
  await expect(page.getByText('Playbook de abertura', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Novo material', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Administrar Base', exact: true })).toHaveCount(0)
  await page.getByText('Playbook de abertura', { exact: true }).first().click()
  await expect(page).toHaveURL(/\/conhecimento\/trilhas\/primeira-live-que-converte\/aulas\/a1111111-1111-4111-8111-111111111131/)
  await expect(page.getByRole('heading', { name: 'Playbook de abertura', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Marcar como concluída', exact: true })).toBeVisible()

  await setup(page, 'cliente_parceiro')
  await page.goto('/conhecimento')
  await expect(page).toHaveURL(/\/cliente$/)
  await expect(page.getByRole('heading', { name: 'Base de treinamento TikTok', exact: true })).toHaveCount(0)
})

test('mostra a biblioteca da rede na home e na aba Biblioteca', async ({ page }) => {
  await setup(page, 'apresentadora', { global: true })
  await page.goto('/conhecimento')
  await expect(page.getByText('Playbook de abertura', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Guia da rede', { exact: true }).first()).toBeVisible()
  await page.getByRole('tab', { name: 'Biblioteca', exact: true }).click()
  await expect(page.getByText('Playbook de abertura', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Guia da rede', { exact: true }).first()).toBeVisible()
  await page.getByText('Guia da rede', { exact: true }).first().click()
  await expect(page.getByRole('heading', { name: 'Guia da rede', exact: true }).first()).toBeVisible()
})

test('reconstrói vídeo canônico, embute player allowlisted e mostra anexo', async ({ page }) => {
  await setup(page, 'franqueado', { video: true, attachment: true })
  await page.goto('/conhecimento')
  await page.getByText('Vídeo de onboarding', { exact: true }).first().click()
  await expect(page.getByRole('heading', { name: 'Vídeo de onboarding', exact: true })).toBeVisible()
  await expect(page.getByTitle('Vídeo: Vídeo de onboarding')).toBeVisible()
  await expect(page.getByText('manual-operacao.pdf', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Editar', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'URL do vídeo', exact: true })).toHaveValue('https://www.youtube.com/watch?v=youtube-123')
})

test('mantém editor aberto quando publicação vazia, conflito ou upload falham', async ({ page }) => {
  await setup(page, 'franqueado', { publishEmpty: true })
  await page.goto('/conhecimento')
  await page.getByRole('button', { name: 'Administrar Base', exact: true }).click()
  await page.getByRole('button', { name: 'Novo material', exact: true }).click()
  await page.getByRole('textbox', { name: 'Título', exact: true }).fill('Material sem conteúdo')
  await page.getByRole('dialog', { name: 'Novo material' }).getByLabel('Status').selectOption('published')
  await page.getByRole('button', { name: 'Salvar material', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('precisa ter conteúdo')
  await expect(page.getByRole('dialog', { name: 'Novo material' })).toBeVisible()

  await setup(page, 'franqueado', { conflict: true })
  await page.goto('/conhecimento?view=admin')
  await page.getByRole('button', { name: 'Editar Playbook de abertura', exact: true }).click()
  await page.getByRole('textbox', { name: 'Resumo', exact: true }).fill('Alteração concorrente')
  await page.getByRole('button', { name: 'Salvar material', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('alterado por outra pessoa')

  await setup(page, 'franqueado', { uploadFailure: true })
  await page.goto('/conhecimento?view=admin')
  await page.getByRole('button', { name: 'Novo material', exact: true }).click()
  await page.getByRole('textbox', { name: 'Título', exact: true }).fill('Material com PDF')
  await page.getByRole('textbox', { name: 'Conteúdo em Markdown', exact: true }).fill('Conteúdo')
  await page.getByLabel(/Anexo PDF/).setInputFiles({ name: 'manual.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7') })
  await page.getByRole('button', { name: 'Salvar material', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('servidor está indisponível')
  await expect(page.getByRole('dialog', { name: 'Novo material' })).toBeVisible()
})
