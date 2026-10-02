import { expect, test, type Page } from '@playwright/test'

const pr = (previsto: number, realizado: number) => ({ previsto, realizado })

const setembro = {
  mes: '2026-09',
  receita: { ...pr(1450, 1450), fixo: pr(300, 300), comissao: pr(1150, 1150), avulsas: pr(0, 0) },
  custos_fixos: pr(4200, 4200),
  custos_variaveis: pr(175, 175),
  resultado: pr(-2925, -2925),
  imposto: { ...pr(0, 0), aliquota: 6, base: 0 },
}

const detalheSetembro = {
  mes: '2026-09',
  atual: setembro,
  receita: {
    total: pr(1450, 1450),
    por_cliente: [
      {
        cliente_id: 'c1',
        cliente_nome: 'Cliente A',
        marcas: [
          { marca_id: 'm1', marca_nome: 'Marca A', fixo: pr(300, 300), comissao: pr(250, 250), gmv: 10000, pct: 2.5 },
          { marca_id: 'm2', marca_nome: 'Marca B', fixo: pr(0, 0), comissao: pr(900, 900), gmv: 9000, pct: 10 },
        ],
      },
    ],
    avulsas: [],
  },
  custos_fixos: {
    total: pr(4200, 4200),
    por_grupo: [{ grupo: 'estrutural', total: pr(1000, 1000), itens: [{ id: 'c1', descricao: 'Aluguel', origem: 'recorrente', previsto: 1000, realizado: 1000, status: 'pago' }] }],
    apresentadoras_fixo: [
      { apresentadora_id: 'a1', nome: 'Ana', previsto: 2700, realizado: 2700 },
      { apresentadora_id: 'a2', nome: 'Bia', previsto: 500, realizado: 500 },
    ],
  },
  custos_variaveis: {
    total: pr(175, 175),
    por_grupo: [{ grupo: 'outros', total: pr(50, 50), itens: [{ id: 'c2', descricao: 'Material', origem: 'manual', previsto: 50, realizado: 50, status: 'pago' }] }],
    apresentadoras_variavel: [{ apresentadora_id: 'a1', nome: 'Ana', previsto: 125, realizado: 125, comissao: 100, adicionais: 25 }],
    imposto: { ...pr(0, 0), aliquota: 6, base: 0 },
  },
  aportes: [],
}

async function setup(page: Page, opts: { dre404?: boolean } = {}) {
  const writes: string[] = []
  const calls: string[] = []
  await page.addInitScript(() => {
    localStorage.setItem('livelab.react.remember', 'true')
    localStorage.setItem('livelab.react.access_token', 'dre-e2e-token')
    localStorage.setItem('livelab.react.refresh_token', 'dre-e2e-refresh')
    localStorage.setItem('livelab.react.user', JSON.stringify({ id: 'dre-user', nome: 'Consulta financeira', papel: 'financeiro_readonly', tenant_id: 'dre-tenant', onboarding_completed: true }))
    localStorage.setItem('livelab-theme', 'light')
  })
  await page.route('**/*', (route) => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.fulfill({ status: 204 }))
  await page.route('**/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    calls.push(url.pathname)
    if (request.method() !== 'GET') {
      writes.push(`${request.method()} ${url.pathname}`)
      return route.fulfill({ status: 405, json: { error: 'Fixture somente leitura' } })
    }
    if (url.pathname === '/v1/financeiro/dre' && opts.dre404) return route.fulfill({ status: 404, json: { error: 'Not Found' } })
    if (url.pathname === '/v1/financeiro/dre' || url.pathname === '/v1/financeiro/resumo') return route.fulfill({ json: { inicio: '2026-01', fim: '2026-12', meses: [setembro], totais: setembro } })
    if (url.pathname === '/v1/financeiro/dre/mes') return route.fulfill({ json: detalheSetembro })
    if (url.pathname === '/v1/financeiro/lancamentos') return route.fulfill({ json: { itens: [], hoje: '2026-09-15' } })
    if (url.pathname === '/v1/financeiro/config') return route.fulfill({ json: { aliquota_imposto_pct: 6 } })
    if (url.pathname === '/v1/financeiro/caixa') return route.fulfill({ json: { saldo_atual: 0, a_receber: 0, a_pagar: 0 } })
    return route.fulfill({ json: [] })
  })
  return { writes, calls }
}

test('exibe DRE reconciliado, expande o detalhe inline (sem drawer) e permanece somente leitura', async ({ page }) => {
  const { writes, calls } = await setup(page)
  await page.goto('/financeiro?tab=dre&mes=2026-09')

  await expect(page.getByRole('heading', { name: 'DRE mensal' })).toBeVisible()
  await expect(page.getByText('Resultado no ano', { exact: true })).toBeVisible()
  await expect(page.getByText('-R$ 2.925,00', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Margem após custos manuais', { exact: false })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Adicionar custo', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Novo custo', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Excluir', exact: true })).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: 'Descrição do custo', exact: true })).toHaveCount(0)

  const linha = page.getByRole('button', { name: 'Detalhe de setembro de 2026' })
  await expect(linha).toHaveAttribute('aria-expanded', 'false')
  await linha.click()
  await expect(linha).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('dialog')).toHaveCount(0)

  const detalhe = page.getByTestId('dre-detalhe-2026-09')
  await detalhe.getByRole('button', { name: /Cliente A/ }).click()
  await expect(detalhe.getByText('Marca A', { exact: true })).toBeVisible()
  await expect(detalhe.getByText('Marca B', { exact: true })).toBeVisible()
  await expect(detalhe.getByText('Ana', { exact: true }).first()).toBeVisible()
  await expect(detalhe.getByText('Bia', { exact: true })).toBeVisible()
  await expect(detalhe.getByText('Aluguel', { exact: true })).toBeVisible()
  await expect(detalhe.getByText('Material', { exact: true })).toBeVisible()

  // vários meses abertos ao mesmo tempo; o aberto permanece
  await page.getByRole('button', { name: 'Detalhe de outubro de 2026' }).click()
  await expect(page.getByTestId('dre-detalhe-2026-10')).toBeVisible()
  await expect(detalhe).toBeVisible()

  expect(calls).toContain('/v1/financeiro/dre')
  expect(calls).not.toContain('/v1/financeiro/resumo')
  expect(calls).toContain('/v1/financeiro/dre/mes')
  expect(calls).not.toContain('/v1/financeiro/operacional')
  expect(calls).not.toContain('/v1/financeiro/fluxo-caixa')
  // aba DRE não busca lançamentos nem painel
  expect(calls).not.toContain('/v1/financeiro/lancamentos')
  expect(calls).not.toContain('/v1/financeiro/painel')
  expect(writes).toEqual([])
})

test('cai em /financeiro/resumo quando /financeiro/dre ainda não existe (404)', async ({ page }) => {
  const { calls } = await setup(page, { dre404: true })
  await page.goto('/financeiro?tab=dre&mes=2026-09')
  await expect(page.getByRole('heading', { name: 'DRE mensal' })).toBeVisible()
  await expect(page.getByText('-R$ 2.925,00', { exact: true }).first()).toBeVisible()
  expect(calls).toContain('/v1/financeiro/dre')
  expect(calls).toContain('/v1/financeiro/resumo')
})

test('mobile 390x844: DRE sem estouro horizontal, detalhe inline em largura total', async ({ page }) => {
  await setup(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/financeiro?tab=dre&mes=2026-09')
  await expect(page.getByRole('heading', { name: 'DRE mensal' })).toBeVisible()
  const botao = page.getByRole('button', { name: 'Detalhe de setembro de 2026' })
  const box = await botao.boundingBox()
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
  await botao.click()
  const detalhe = page.getByTestId('dre-detalhe-2026-09')
  await detalhe.getByRole('button', { name: /Cliente A/ }).click()
  await expect(detalhe.getByText('Marca A', { exact: true })).toBeVisible()
  const dims = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
  expect(dims.sw).toBeLessThanOrEqual(dims.iw)
})
