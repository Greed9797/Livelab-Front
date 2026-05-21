/**
 * Live Toolkit E2E Tests — PR 17
 *
 * Cobre:
 *   1. Verificação de que o hook useSelectedLive existe e exporta a função corretamente
 *      (teste estático via leitura do arquivo — não requer servidor).
 *   2. Página de ranking público (/ranking) é acessível sem autenticação
 *      (não redireciona para /login).
 *
 * Padrão de auth: segue auth-rbac.e2e.ts — credenciais via variáveis de ambiente.
 * Testes que dependem de autenticação usam os env vars E2E_*_EMAIL / E2E_*_PASSWORD.
 */

import { expect, test } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── 1. useSelectedLive — verificação de exportação ──────────────────────────

test.describe('useSelectedLive hook', () => {
  test('arquivo do hook existe em src/hooks/useSelectedLive.ts', () => {
    // Teste de verificação estática: confirma que o arquivo foi criado na branch.
    // Não necessita de servidor rodando.
    const hookPath = path.resolve(
      __dirname,
      '../../src/hooks/useSelectedLive.ts',
    )
    expect(fs.existsSync(hookPath), `Hook não encontrado em ${hookPath}`).toBe(true)
  })

  test('useSelectedLive é exportado como função nomeada', () => {
    // Lê o conteúdo do arquivo e verifica a exportação da função.
    const hookPath = path.resolve(
      __dirname,
      '../../src/hooks/useSelectedLive.ts',
    )
    const content = fs.readFileSync(hookPath, 'utf-8')

    // Deve conter export function useSelectedLive ou export { useSelectedLive }
    const hasNamedExport =
      /export\s+function\s+useSelectedLive/.test(content) ||
      /export\s*\{[^}]*useSelectedLive[^}]*\}/.test(content)

    expect(
      hasNamedExport,
      'useSelectedLive deve ser exportado como named export',
    ).toBe(true)
  })

  test('hook aceita opções liveId, cabineId e autoRefreshMs', () => {
    const hookPath = path.resolve(
      __dirname,
      '../../src/hooks/useSelectedLive.ts',
    )
    const content = fs.readFileSync(hookPath, 'utf-8')

    // Verifica as propriedades da interface de opções do hook
    expect(content).toContain('liveId')
    expect(content).toContain('cabineId')
    expect(content).toContain('autoRefreshMs')
  })
})

// ─── 2. Página de ranking público — sem autenticação ─────────────────────────

test.describe('Página de ranking público (/ranking)', () => {
  test('página /ranking carrega sem redirecionar para /login', async ({ page }) => {
    // A página PublicRankingPage é uma rota pública definida em AppRouter.tsx:
    // <Route path="/ranking" element={<PublicRankingPage />} />
    // Não deve exigir autenticação.
    await page.goto('/ranking', { waitUntil: 'domcontentloaded' })

    // Não deve redirecionar para /login
    await expect(page).not.toHaveURL(/\/login(?:$|[?#])/)

    // URL deve conter /ranking
    await expect(page).toHaveURL(/\/ranking(?:$|[?#?])/)
  })

  test('página /ranking renderiza elemento main visível', async ({ page }) => {
    await page.goto('/ranking', { waitUntil: 'domcontentloaded' })

    // PublicRankingPage renderiza <main className="min-h-screen ...">
    await expect(page.locator('main')).toBeVisible()
  })

  test('página /ranking exibe título "Ranking comercial"', async ({ page }) => {
    await page.goto('/ranking', { waitUntil: 'domcontentloaded' })

    // Aguarda o React Query carregar (pode exibir loading state antes do heading)
    await expect(
      page.getByRole('heading', { name: /ranking comercial/i }),
    ).toBeVisible({ timeout: 15_000 })
  })

  test('página /ranking exibe link de acesso ao painel para usuários não autenticados', async ({ page }) => {
    await page.goto('/ranking', { waitUntil: 'domcontentloaded' })

    // PublicRankingPage tem <Link to="/login"> no header para autenticação.
    const loginLink = page.getByRole('link', { name: /acessar painel|entrar/i })
    await expect(loginLink).toBeVisible({ timeout: 10_000 })
  })

  test('página /ranking não exibe erro de CORS ou conexão', async ({ page }) => {
    await page.goto('/ranking', { waitUntil: 'domcontentloaded' })

    // Não deve aparecer mensagem de erro bloqueante (mesmo sem dados de seed)
    const blockingError = page.getByText(
      /não foi possível conectar|servidor indisponível|sessão expirada|not allowed by cors/i,
    )
    await expect(blockingError).toHaveCount(0)
  })
})

// ─── 3. Acesso à rota /ranking não requer sessão no localStorage ──────────────

test.describe('Ranking público — sem estado de sessão', () => {
  test('acessa /ranking com localStorage vazio sem redirecionar', async ({ page }) => {
    // Garante que não há tokens no localStorage antes de navegar
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => localStorage.clear())

    await page.goto('/ranking', { waitUntil: 'domcontentloaded' })

    // Deve permanecer em /ranking (rota pública), não ir para /login
    await expect(page).not.toHaveURL(/\/login(?:$|[?#])/)
    await expect(page).toHaveURL(/\/ranking/)
  })
})
