import { expect, test, type Page } from '@playwright/test'

const firstId = '11111111-1111-4111-8111-111111111111'
const secondId = '22222222-2222-4222-8222-222222222222'
const destinationId = '33333333-3333-4333-8333-333333333333'
const unionId = '44444444-4444-4444-8444-444444444444'
const previewToken = `lm1:${'a'.repeat(64)}`

const sources = [
  {
    id: firstId, marca_id: 'marca-1', marca_nome: 'Marca Contínua', cabine_id: 'cabine-1', cabine_numero: 2,
    status: 'encerrada', status_publicacao: 'publicado', origem_dados: 'manual',
    iniciado_em: '2026-09-14T12:00:00.000Z', encerrado_em: '2026-09-14T15:00:00.000Z',
    manual_gmv: 2000, manual_orders: 20, apresentadora_nome: 'Ana',
  },
  {
    id: secondId, marca_id: 'marca-1', marca_nome: 'Marca Contínua', cabine_id: 'cabine-1', cabine_numero: 2,
    status: 'encerrada', status_publicacao: 'publicado', origem_dados: 'manual',
    iniciado_em: '2026-09-14T15:00:00.000Z', encerrado_em: '2026-09-14T18:00:00.000Z',
    manual_gmv: 3000, manual_orders: 30, apresentadora_nome: 'Bia',
  },
]

const destination = {
  ...sources[0], id: destinationId, iniciado_em: sources[0].iniciado_em, encerrado_em: sources[1].encerrado_em,
  manual_gmv: 5000, manual_orders: 50, uniao_id: unionId,
  apresentadoras: [
    { apresentadora_id: 'ana-id', nome: 'Ana', gmv: 2000, segundos: 10800, pedidos: 20 },
    { apresentadora_id: 'bia-id', nome: 'Bia', gmv: 3000, segundos: 10800, pedidos: 30 },
  ],
}

function buildPreview() {
  return {
    eligible: true,
    blockers: [],
    preview_token: previewToken,
    origens: sources.map((live, index) => ({
      live_id: live.id,
      iniciado_em: live.iniciado_em,
      encerrado_em: live.encerrado_em,
      marca_id: live.marca_id,
      marca_nome: live.marca_nome,
      cabine_id: live.cabine_id,
      cabine_numero: live.cabine_numero,
      apresentadoras: [{ apresentadora_id: index ? 'bia-id' : 'ana-id', nome: index ? 'Bia' : 'Ana', user_id: index ? 'bia-user' : 'ana-user', gmv: live.manual_gmv, segundos: 10800, pedidos: live.manual_orders }],
    })),
    totais: { gmv: 5000, pedidos: 50, segundos: 21600, live_impressions: 12000, manual_views: 8000 },
    apresentadoras: [
      { apresentadora_id: 'ana-id', nome: 'Ana', user_id: 'ana-user', gmv: 2000, segundos: 10800, pedidos: 20 },
      { apresentadora_id: 'bia-id', nome: 'Bia', user_id: 'bia-user', gmv: 3000, segundos: 10800, pedidos: 30 },
    ],
    warnings: ['Confira se cada registro contém somente as métricas do seu próprio trecho.'],
  }
}

async function seedManager(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('livelab.react.remember', 'true')
    localStorage.setItem('livelab.react.access_token', 'merge-e2e-token')
    localStorage.setItem('livelab.react.refresh_token', 'merge-e2e-refresh')
    localStorage.setItem('livelab.react.user', JSON.stringify({
      id: 'manager-id', nome: 'Gestora E2E', papel: 'gerente', tenant_id: 'tenant-id', onboarding_completed: true,
    }))
  })
}

async function seedPresenter(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('livelab.react.remember', 'true')
    localStorage.setItem('livelab.react.access_token', 'presenter-e2e-token')
    localStorage.setItem('livelab.react.refresh_token', 'presenter-e2e-refresh')
    localStorage.setItem('livelab.react.user', JSON.stringify({
      id: 'presenter-user-id', nome: 'Ana', papel: 'apresentadora', tenant_id: 'tenant-id', onboarding_completed: true,
    }))
  })
}

test('gestão pré-visualiza, une e desfaz trechos preservando o rateio', async ({ page }) => {
  await seedManager(page)
  let merged = false
  let undone = false
  let createPayload: Record<string, unknown> | null = null
  let undoPayload: Record<string, unknown> | null = null

  await page.route('**/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const method = route.request().method()
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

    if (method === 'POST' && url.pathname === '/v1/lives/uniao/preview') {
      return json(buildPreview())
    }
    if (method === 'POST' && url.pathname === '/v1/lives/uniao') {
      createPayload = route.request().postDataJSON()
      merged = true
      return json({ live_id: destinationId, uniao_id: unionId })
    }
    if (method === 'POST' && url.pathname === `/v1/lives/uniao/${unionId}/desfazer`) {
      undoPayload = route.request().postDataJSON()
      undone = true
      return json({ live_ids: [firstId, secondId] })
    }
    if (method === 'GET' && url.pathname === `/v1/lives/${destinationId}/uniao`) {
      const history = {
        id: unionId, live_destino_id: destinationId, criado_em: '2026-09-15T12:00:00Z', criado_por: 'manager-id', motivo: 'Troca de apresentadora na mesma transmissão',
        desfeito_em: undone ? '2026-09-15T13:00:00Z' : null, desfeito_por: undone ? 'manager-id' : null, desfeito_motivo: undone ? 'Cadastro unido por engano' : null,
        ativo: !undone,
        origens: sources.map((live) => ({ live, apresentadoras: [], vendas: [] })),
        resultado: { preview: buildPreview(), source_hash: 'source-hash', destination: { id: destinationId, financial_fingerprint: 'fingerprint', vendas: [] } },
      }
      return json(history)
    }
    if (method === 'GET' && url.pathname === `/v1/lives/${destinationId}`) return json(destination)
    if (method === 'GET' && url.pathname === '/v1/lives/duplicatas') return json({ clusters: [] })
    if (method === 'GET' && url.pathname === '/v1/lives/uniao/capabilities') return json({ enabled: true })
    if (method === 'GET' && url.pathname === '/v1/lives' && url.searchParams.get('paginado') === '1') {
      const items = merged && !undone ? [destination] : sources
      return json({ items, total: items.length, page: 0, limit: 25 })
    }
    if (method === 'GET' && url.pathname === '/v1/lives') return json(merged && !undone ? [destination] : sources)
    if (method === 'GET' && url.pathname === '/v1/cabines') return json([])
    if (method === 'GET' && url.pathname === '/v1/marcas') return json([])
    if (method === 'GET' && url.pathname === '/v1/clientes') return json([])
    if (method === 'GET' && url.pathname === '/v1/apresentadoras') return json([])
    return json({ error: `E2E sem mock para ${method} ${url.pathname}` }, 501)
  })

  await page.goto('/lives?periodo=custom&data_inicio=2026-09-14&data_fim=2026-09-14')
  await page.getByRole('checkbox', { name: 'Selecionar live de Marca Contínua às 09:00' }).check()
  await page.getByRole('checkbox', { name: 'Selecionar live de Marca Contínua às 12:00' }).check()
  await page.getByRole('button', { name: 'Unir 2 lives' }).click()

  const preview = page.getByRole('dialog', { name: 'Unir lives' })
  await expect(preview.getByText('R$ 5.000,00', { exact: true })).toBeVisible()
  await expect(preview.getByText('50 pedidos', { exact: true })).toBeVisible()
  await expect(preview.getByText('Ana · 3h · R$ 2.000,00', { exact: true })).toBeVisible()
  await expect(preview.getByText('Bia · 3h · R$ 3.000,00', { exact: true })).toBeVisible()
  await expect(preview.getByRole('button', { name: 'Confirmar união' })).toBeDisabled()
  await preview.getByLabel('Confirmo que as métricas pertencem a cada trecho').check()
  await preview.getByLabel('Motivo da união').fill('Troca de apresentadora na mesma transmissão')
  await preview.getByRole('button', { name: 'Confirmar união' }).click()

  await expect(page.getByRole('dialog', { name: 'Live realizada' })).toBeVisible()
  await expect(page.getByText('Unida de 2 registros', { exact: true })).toBeVisible()
  expect(createPayload).toMatchObject({ live_ids: [firstId, secondId], preview_token: previewToken, motivo: 'Troca de apresentadora na mesma transmissão', metricas_por_trecho: true })
  expect(createPayload?.request_id).toEqual(expect.any(String))

  await page.getByRole('button', { name: 'Desfazer união' }).click()
  const undo = page.getByRole('dialog', { name: 'Desfazer união' })
  await undo.getByLabel('Motivo para desfazer').fill('Cadastro unido por engano')
  await undo.getByRole('button', { name: 'Confirmar reversão' }).click()
  await expect(page.getByText('União desfeita', { exact: true })).toBeVisible()
  expect(undoPayload).toMatchObject({ motivo: 'Cadastro unido por engano' })
  expect(undoPayload?.request_id).toEqual(expect.any(String))
})

test('esconde a criação de união quando a capacidade está desligada', async ({ page }) => {
  await seedManager(page)
  await page.route('**/v1/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/v1/lives/uniao/capabilities') return route.fulfill({ json: { enabled: false } })
    if (url.pathname === '/v1/lives/duplicatas') return route.fulfill({ json: { clusters: [] } })
    if (url.pathname === '/v1/lives' && url.searchParams.get('paginado') === '1') return route.fulfill({ json: { items: sources, total: 2, page: 0, limit: 25 } })
    return route.fulfill({ json: [] })
  })
  await page.goto('/lives')
  await expect(page.getByText('Marca Contínua', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /Selecionar live/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Unir \d+ lives/ })).toHaveCount(0)
})

test('explica um 404 de prévia mesmo após a capacidade ter sido carregada', async ({ page }) => {
  await seedManager(page)
  await page.route('**/v1/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/v1/lives/uniao/capabilities') return route.fulfill({ json: { enabled: true } })
    if (route.request().method() === 'POST' && url.pathname === '/v1/lives/uniao/preview') return route.fulfill({ status: 404, json: { error: 'União de lives não está habilitada para esta unidade.', code: 'LIVE_MERGE_DISABLED' } })
    if (url.pathname === '/v1/lives/duplicatas') return route.fulfill({ json: { clusters: [] } })
    if (url.pathname === '/v1/lives' && url.searchParams.get('paginado') === '1') return route.fulfill({ json: { items: sources, total: 2, page: 0, limit: 25 } })
    return route.fulfill({ json: [] })
  })
  await page.goto('/lives')
  await page.getByRole('checkbox', { name: /Selecionar live/ }).first().check()
  await page.getByRole('checkbox', { name: /Selecionar live/ }).nth(1).check()
  await page.getByRole('button', { name: 'Unir 2 lives' }).click()
  await expect(page.getByRole('alert')).toContainText('A união de lives ainda não está habilitada')
})

test('repete a confirmação com o mesmo request_id após falha de resposta', async ({ page }) => {
  await seedManager(page)
  const requestIds: string[] = []
  await page.route('**/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const method = route.request().method()
    if (url.pathname === '/v1/lives/uniao/capabilities') return route.fulfill({ json: { enabled: true } })
    if (method === 'POST' && url.pathname === '/v1/lives/uniao/preview') return route.fulfill({ json: buildPreview() })
    if (method === 'POST' && url.pathname === '/v1/lives/uniao') {
      requestIds.push(route.request().postDataJSON().request_id)
      if (requestIds.length === 1) return route.fulfill({ status: 504, json: { error: 'timeout' } })
      return route.fulfill({ status: 201, json: { live_id: destinationId, uniao_id: unionId } })
    }
    if (method === 'GET' && url.pathname === `/v1/lives/${destinationId}`) return route.fulfill({ json: destination })
    if (method === 'GET' && url.pathname === `/v1/lives/${destinationId}/uniao`) return route.fulfill({ json: null })
    if (url.pathname === '/v1/lives/duplicatas') return route.fulfill({ json: { clusters: [] } })
    if (url.pathname === '/v1/lives' && url.searchParams.get('paginado') === '1') return route.fulfill({ json: { items: sources, total: 2, page: 0, limit: 25 } })
    return route.fulfill({ json: [] })
  })
  await page.goto('/lives')
  await page.getByRole('checkbox', { name: /Selecionar live/ }).first().check()
  await page.getByRole('checkbox', { name: /Selecionar live/ }).nth(1).check()
  await page.getByRole('button', { name: 'Unir 2 lives' }).click()
  const dialog = page.getByRole('dialog', { name: 'Unir lives' })
  await dialog.getByLabel('Confirmo que as métricas pertencem a cada trecho').check()
  await dialog.getByLabel('Motivo da união').fill('Troca de apresentadora')
  await dialog.getByRole('button', { name: 'Confirmar união' }).click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  await dialog.getByRole('button', { name: 'Confirmar união' }).click()
  await expect.poll(() => requestIds.length).toBe(2)
  expect(requestIds[0]).toBe(requestIds[1])
})

test('portal identifica uma transmissão unida e mostra somente a participação da apresentadora', async ({ page }) => {
  await seedPresenter(page)
  await page.route('**/v1/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/v1/portal/apresentadora/lives') {
      return route.fulfill({ json: { items: [{
        id: destinationId,
        iniciado_em: '2026-09-14T12:00:00.000Z',
        encerrado_em: '2026-09-14T18:00:00.000Z',
        marca_nome: 'Marca Contínua',
        cabine_nome: 'Cabine 2',
        uniao_id: unionId,
        gmv: 2000,
        horas: 3,
        pedidos: 20,
      }], submissoes: [] } })
    }
    return route.fulfill({ json: [] })
  })
  await page.goto('/minhas-lives')
  await expect(page.getByText('Transmissão unida · sua participação', { exact: true })).toBeVisible()
  await expect(page.getByText('R$ 2.000,00', { exact: true })).toBeVisible()
  await expect(page.getByText('3h · 20 pedidos', { exact: true })).toBeVisible()
})

test('mantém histórico e reversão de união existente quando novas uniões estão desligadas', async ({ page }) => {
  await seedManager(page)
  let undoCalled = false
  await page.route('**/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const method = route.request().method()
    if (url.pathname === '/v1/lives/uniao/capabilities') return route.fulfill({ json: { enabled: false } })
    if (method === 'GET' && url.pathname === `/v1/lives/${destinationId}`) return route.fulfill({ json: destination })
    if (method === 'GET' && url.pathname === `/v1/lives/${destinationId}/uniao`) return route.fulfill({ json: {
      id: unionId, live_destino_id: destinationId, ativo: true, criado_em: '2026-09-15T12:00:00Z', criado_por: 'manager-id', motivo: 'Troca de apresentadora', desfeito_em: null, desfeito_por: null, desfeito_motivo: null,
      origens: sources.map((live) => ({ live, apresentadoras: [], vendas: [] })),
      resultado: { preview: buildPreview(), source_hash: 'source-hash', destination: { id: destinationId, financial_fingerprint: 'fingerprint', vendas: [] } },
    } })
    if (method === 'POST' && url.pathname === `/v1/lives/uniao/${unionId}/desfazer`) { undoCalled = true; return route.fulfill({ json: { live_ids: [firstId, secondId] } }) }
    if (url.pathname === '/v1/lives/duplicatas') return route.fulfill({ json: { clusters: [] } })
    if (url.pathname === '/v1/lives' && url.searchParams.get('paginado') === '1') return route.fulfill({ json: { items: [destination], total: 1, page: 0, limit: 25 } })
    if (url.pathname === '/v1/lives') return route.fulfill({ json: [destination] })
    return route.fulfill({ json: [] })
  })
  await page.goto(`/lives?live=${destinationId}`)
  await expect(page.getByRole('button', { name: 'Desfazer união' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Editar live' })).toHaveCount(0)
  await expect(page.getByRole('checkbox', { name: /Selecionar live/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Desfazer união' }).click()
  await page.getByLabel('Motivo para desfazer').fill('Reversão autorizada da união existente')
  await page.getByRole('button', { name: 'Confirmar reversão' }).click()
  await expect.poll(() => undoCalled).toBe(true)
})
