import { expect, test, type Page } from '@playwright/test'

const admin = {
  id: '11111111-1111-4111-8111-111111111111',
  nome: 'Operadora',
  email: 'operadora@example.test',
  papel: 'franqueado',
  tenant_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  tenant_nome: 'Unidade Teste',
}

const presenter = {
  id: '22222222-2222-4222-8222-222222222222',
  nome: 'Ana',
  email: 'ana@example.test',
  papel: 'apresentador',
  ativo: true,
  tenant_id: admin.tenant_id,
  tenant_nome: admin.tenant_nome,
}

async function setSession(page: Page, user: typeof admin | typeof presenter) {
  await page.addInitScript((session) => {
    localStorage.setItem('livelab.react.access_token', 'synthetic-access-token')
    localStorage.setItem('livelab.react.refresh_token', 'synthetic-refresh-token')
    localStorage.setItem('livelab.react.user', JSON.stringify(session))
  }, user)
}

test('operadora recebe senha temporária localmente ao resetar acesso', async ({ page }) => {
  await setSession(page, admin)
  await page.route('**/v1/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/v1/usuarios') return route.fulfill({ json: [presenter] })
    if (url.pathname === '/v1/apresentadoras' || url.pathname === '/v1/clientes') return route.fulfill({ json: [] })
    if (url.pathname === '/v1/configuracoes') return route.fulfill({ json: {} })
    if (url.pathname === `/v1/usuarios/${presenter.id}/reset-senha`) {
      return route.fulfill({ json: { senha_temporaria: 'Teste1234' } })
    }
    return route.fulfill({ status: 404, json: { error: `Unexpected ${url.pathname}` } })
  })

  await page.goto('/configuracoes?tab=usuarios')
  await expect(page.getByText('Ana', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Resetar senha' }).click()
  await expect(page.getByText('Senha temporária: Teste1234')).toBeVisible()
})

test('perfil operacional sem login cria acesso sem reenviar remuneração ou foto', async ({ page }) => {
  await setSession(page, admin)
  const profileId = '33333333-3333-4333-8333-333333333333'
  let submitted: Record<string, unknown> | undefined
  await page.route('**/v1/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/v1/usuarios' && route.request().method() === 'GET') return route.fulfill({ json: [] })
    if (url.pathname === '/v1/apresentadoras') return route.fulfill({ json: [{ id: profileId, nome: 'Perfil legado', ativo: true }] })
    if (url.pathname === '/v1/clientes' || url.pathname === '/v1/configuracoes' || url.pathname === '/v1/comissoes/faixas-padrao') return route.fulfill({ json: [] })
    if (url.pathname === '/v1/usuarios/convidar') {
      submitted = route.request().postDataJSON() as Record<string, unknown>
      return route.fulfill({ status: 201, json: { id: presenter.id } })
    }
    return route.fulfill({ status: 404, json: { error: `Unexpected ${url.pathname}` } })
  })

  await page.goto('/configuracoes?tab=usuarios')
  await page.getByRole('button', { name: 'Criar acesso' }).click()
  await expect(page.getByText('Você está criando o acesso de um perfil existente.')).toBeVisible()
  await expect(page.getByText('Fixo mensal (R$)')).toHaveCount(0)
  await page.getByLabel('E-mail').fill('perfil@example.test')
  await page.getByLabel('Senha temporária').fill('Senha123')
  await page.getByRole('button', { name: 'Criar usuário' }).click()
  await expect.poll(() => submitted).toBeDefined()
  expect(submitted).toMatchObject({ apresentadora_id: profileId, papel: 'apresentador' })
  expect(submitted).not.toHaveProperty('fixo')
  expect(submitted).not.toHaveProperty('foto_url')
})

test('apresentadora acessa só segurança, sem consultar dados administrativos', async ({ page }) => {
  await setSession(page, presenter)
  const requests: string[] = []
  await page.route('**/v1/**', async (route) => {
    requests.push(new URL(route.request().url()).pathname)
    return route.fulfill({ status: 404, json: { error: 'not used' } })
  })

  await page.goto('/configuracoes')
  await expect(page.getByRole('heading', { name: 'Configurações da conta' })).toBeVisible()
  await expect(page.getByText('Trocar senha')).toBeVisible()
  await expect(page.getByText('Usuários e equipe')).toHaveCount(0)
  await expect(page.getByText('Metas', { exact: true })).toHaveCount(0)
  expect(requests).toEqual([])
})
