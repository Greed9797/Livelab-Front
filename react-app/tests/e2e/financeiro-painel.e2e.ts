import { expect, test, type Page } from '@playwright/test'

// Fixture do contrato de GET /financeiro/painel e de /financeiro/lancamentos (hoje = 2026-10-12).
const painel = {
  mes: '2026-10', hoje: '2026-10-12', fim_mes: '2026-10-31', mes_relativo: 'corrente', configurado: true, data_corte: '2026-09-01', saldo_abertura: 1000,
  caixa: { saldo_atual: 1500, ate: '2026-10-12' },
  recebido_mes: { total: 800, receitas: 600, aportes: 200 },
  pago_mes: { total: 300 },
  a_receber: { no_mes: 4000, atrasado_anterior: 500, total: 4500, qtd: 7, atrasados: { qtd: 2, valor: 700 } },
  a_pagar: { no_mes: 2500, atrasado_anterior: 0, total: 2500, qtd: 5, atrasados: { qtd: 0, valor: 0 } },
  projetado_fim_mes: 3500,
  projecao_comissao: { competencia: '2026-10', previsto_atual: 1000, projetado: 2400, ajuste: 1400, dias_decorridos: 12, dias_mes: 31, qtd: 3, vence_em: '2026-11-05', entra_no_painel: false },
  projetado_fim_mes_ritmo: 4900,
  competencia: { receita: { previsto: 5000, realizado: 800 }, custos: { previsto: 3000, realizado: 300 }, resultado: { previsto: 2000, realizado: 500 } },
}

const lanc = (id: string, over: Record<string, unknown>) => ({
  id, natureza: 'custo', origem: 'manual', descricao: id, valor_previsto: 100, valor_pago: 0, grupo: 'estrutural', ...over,
})

// Competência de setembro com vencimentos em setembro e outubro; competência de outubro; e um atrasado antigo (agosto).
const lancamentos = [
  lanc('Aluguel set', { competencia: '2026-09-01', data_vencimento: '2026-09-28', valor_pago: 100, data_pagamento: '2026-09-28', status: 'pago' }),
  lanc('Fixo Marca A', { natureza: 'receita', origem: 'calculado', componente: 'fixo', competencia: '2026-09-01', data_vencimento: '2026-10-05', valor_previsto: 900, status: 'atrasado' }),
  lanc('Internet out', { competencia: '2026-10-01', data_vencimento: '2026-10-20', status: 'pendente' }),
  lanc('Seguro nov', { competencia: '2026-10-01', data_vencimento: '2026-11-03', status: 'previsto' }),
  lanc('Fixo Marca B ago', { natureza: 'receita', origem: 'calculado', componente: 'fixo', competencia: '2026-07-01', data_vencimento: '2026-08-05', valor_previsto: 400, status: 'atrasado' }),
  lanc('Boleto agosto', { competencia: '2026-08-01', data_vencimento: '2026-08-10', status: 'atrasado' }),
]

async function setup(page: Page, papel = 'franqueado') {
  const calls: string[] = []
  const queries: URL[] = []
  await page.addInitScript((p) => {
    localStorage.setItem('livelab.react.remember', 'true')
    localStorage.setItem('livelab.react.access_token', 'painel-e2e-token')
    localStorage.setItem('livelab.react.refresh_token', 'painel-e2e-refresh')
    localStorage.setItem('livelab.react.user', JSON.stringify({ id: 'painel-user', nome: 'Financeiro', papel: p, tenant_id: 'painel-tenant', onboarding_completed: true }))
    localStorage.setItem('livelab-theme', 'light')
  }, papel)
  await page.route('**/*', (route) => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.fulfill({ status: 204 }))
  await page.route('**/v1/**', async (route) => {
    const url = new URL(route.request().url())
    calls.push(url.pathname)
    queries.push(url)
    if (route.request().method() !== 'GET') return route.fulfill({ status: 405, json: { error: 'Fixture somente leitura' } })
    if (url.pathname === '/v1/financeiro/painel') return route.fulfill({ json: painel })
    if (url.pathname === '/v1/financeiro/lancamentos') {
      const inicio = url.searchParams.get('inicio') ?? ''
      const fim = url.searchParams.get('fim') ?? ''
      const itens = lancamentos.filter((l) => l.competencia.slice(0, 7) >= inicio && l.competencia.slice(0, 7) <= fim)
      return route.fulfill({ json: { itens, hoje: '2026-10-12' } })
    }
    if (url.pathname === '/v1/financeiro/config') return route.fulfill({ json: { aliquota_imposto_pct: 6, data_corte: '2026-09-01', saldo_abertura: 1000 } })
    return route.fulfill({ json: [] })
  })
  return { calls, queries }
}

test('painel único: caixa, a receber/a pagar em caixa, projetado e projeção rotulada', async ({ page }) => {
  const { calls, queries } = await setup(page)
  await page.goto('/financeiro?mes=2026-10')

  await expect(page.getByText('Caixa hoje', { exact: true })).toBeVisible()
  await expect(page.getByRole('group', { name: /^A receber: R\$ 4\.500,00/ })).toBeVisible()
  await expect(page.getByRole('group', { name: /^A pagar: R\$ 2\.500,00/ })).toBeVisible()
  // "A receber" aparece uma única vez como cartão (sem tiles/faixas duplicados)
  await expect(page.getByRole('group', { name: /^A receber:/ })).toHaveCount(1)
  await expect(page.getByText('Saldo previsto do mês')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Ver 2 atrasados/ })).toContainText('2 atrasados · R$ 700,00')
  const proj = page.getByRole('group', { name: /Projetado no fim do mês: R\$ 3\.500,00/ })
  await expect(proj).toContainText('Inclui R$ 700,00 atrasados a receber')
  const ritmo = page.getByLabel('Projeção pelo ritmo atual')
  await expect(ritmo).toContainText('Se a comissão de outubro seguir no ritmo atual')
  await expect(ritmo).toContainText('R$ 4.900,00')

  const ref = page.getByRole('button', { name: /Competência \(referência\)/ })
  await expect(ref).toHaveAttribute('aria-expanded', 'false')
  await ref.click()
  await expect(page.getByText(/Não é a fonte do “A receber”/)).toBeVisible()

  expect(calls).toContain('/v1/financeiro/painel')
  expect(calls).not.toContain('/v1/financeiro/caixa')
  expect(queries.find((u) => u.pathname === '/v1/financeiro/painel')?.searchParams.get('mes')).toBe('2026-10')
})

test('lista por vencimento (padrão) busca [mês−1, mês], filtra no cliente e alterna para competência', async ({ page }) => {
  const { queries } = await setup(page)
  await page.goto('/financeiro?mes=2026-10')

  const lista = page.getByRole('region', { name: 'Lançamentos por vencimento' })
  await expect(lista.getByText('Fixo Marca A')).toBeVisible()
  await expect(lista.getByText('Internet out')).toBeVisible()
  await expect(lista.getByText('Aluguel set')).toHaveCount(0) // venceu em setembro
  await expect(lista.getByText('Seguro nov')).toHaveCount(0) // vence em novembro
  await expect(lista.getByText('Boleto agosto')).toHaveCount(0)
  const q = queries.filter((u) => u.pathname === '/v1/financeiro/lancamentos').at(-1)
  expect([q?.searchParams.get('inicio'), q?.searchParams.get('fim')]).toEqual(['2026-09', '2026-10'])

  // atrasados de meses anteriores: busca janela maior e inclui o boleto de agosto
  await lista.getByRole('button', { name: /Atrasados de meses anteriores/ }).click()
  await expect(lista.getByText('Boleto agosto')).toBeVisible()
  const q2 = queries.filter((u) => u.pathname === '/v1/financeiro/lancamentos').at(-1)
  expect(q2?.searchParams.get('inicio')).toBe('2025-10')

  // competência: comportamento anterior (só o mês)
  await lista.getByRole('tab', { name: 'Competência' }).click()
  const porComp = page.getByRole('region', { name: 'Lançamentos por competência' })
  await expect(porComp.getByText('Internet out')).toBeVisible()
  await expect(porComp.getByText('Seguro nov')).toBeVisible()
  await expect(porComp.getByText('Fixo Marca A')).toHaveCount(0)
  const q3 = queries.filter((u) => u.pathname === '/v1/financeiro/lancamentos').at(-1)
  expect([q3?.searchParams.get('inicio'), q3?.searchParams.get('fim')]).toEqual(['2026-10', '2026-10'])
})

test('chip de atrasados do painel filtra a lista', async ({ page }) => {
  await setup(page)
  await page.goto('/financeiro?mes=2026-10')
  await page.getByRole('button', { name: /Ver 2 atrasados/ }).click()
  const lista = page.getByRole('region', { name: 'Lançamentos por vencimento' })
  await expect(lista.getByText('Fixo Marca A')).toBeVisible()
  await expect(lista.getByText('Fixo Marca B ago')).toBeVisible() // atrasado antigo entra pelo chip
  await expect(lista.getByText('Boleto agosto')).toHaveCount(0) // saída: fora do filtro de entradas
  await expect(lista.getByText('Internet out')).toHaveCount(0)
})

test('abas só buscam o que usam (enabled por aba)', async ({ page }) => {
  const { calls } = await setup(page)
  await page.goto('/financeiro?tab=custos-fixos&mes=2026-10')
  await expect(page.getByRole('tab', { name: 'Custos fixos', selected: true })).toBeVisible()
  await page.waitForLoadState('networkidle')
  expect(calls).not.toContain('/v1/financeiro/painel')
  expect(calls).not.toContain('/v1/financeiro/caixa')
})

test('mobile 390x844: tablist rola dentro de si, sem estourar a página; alvos de toque ≥44px', async ({ page }) => {
  await setup(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/financeiro?mes=2026-10')
  await expect(page.getByRole('group', { name: /^A receber:/ })).toBeVisible()

  const tablist = page.getByRole('tablist', { name: 'Seções do financeiro' })
  const m = await tablist.evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth, snap: getComputedStyle(el).scrollSnapType, ox: getComputedStyle(el).overflowX }))
  expect(m.sw).toBeGreaterThan(m.cw)
  expect(m.ox).toBe('auto')
  expect(m.snap).toContain('x')
  const page1 = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
  expect(page1.sw).toBeLessThanOrEqual(page1.iw)

  const alvos = [
    tablist.getByRole('tab').first(),
    page.getByRole('button', { name: 'Mês anterior' }),
    page.getByRole('button', { name: 'Próximo mês' }),
    page.getByRole('button', { name: /Configurar saldo/ }),
    page.getByRole('button', { name: /Ver 2 atrasados/ }),
    page.getByRole('button', { name: /Exportar CSV/ }),
    page.getByRole('button', { name: /^Receber: Fixo Marca A/ }),
  ]
  for (const alvo of alvos) {
    const box = await alvo.boundingBox()
    expect(box, String(alvo)).not.toBeNull()
    expect(box!.height).toBeGreaterThanOrEqual(43.5)
    if (box!.width < 44) expect(box!.width).toBeGreaterThanOrEqual(43.5)
  }

  // rolar o tablist até a última aba não move a página
  await tablist.getByRole('tab', { name: 'Comissões' }).scrollIntoViewIfNeeded()
  const page2 = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, x: window.scrollX }))
  expect(page2.sw).toBeLessThanOrEqual(page2.iw)
  expect(page2.x).toBe(0)
})
