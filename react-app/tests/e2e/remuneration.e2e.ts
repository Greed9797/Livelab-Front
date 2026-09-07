import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const ana = '22222222-2222-4222-8222-222222222222'
const bia = '33333333-3333-4333-8333-333333333333'
type Extra = { id: string; apresentadora_id: string; mes: string; tipo: string; descricao: string; data_referencia: string | null; valor: number; request_id?: string }

async function setup(page: Page, editable = true, failBonusOnce = false) {
  const extras: Extra[] = [{ id: 'bonus-bia', apresentadora_id: bia, mes: '2026-09', tipo: 'bonificacao', descricao: 'Apoio especial', data_referencia: null, valor: 55.55 }]
  const writes: { method: string; body?: Record<string, unknown> }[] = []
  await page.addInitScript(write => {
    localStorage.setItem('livelab.react.remember', 'true')
    localStorage.setItem('livelab.react.access_token', 'synthetic-remuneration-token')
    localStorage.setItem('livelab.react.refresh_token', 'synthetic-refresh')
    localStorage.setItem('livelab-theme', write ? 'light' : 'dark')
    localStorage.setItem('livelab.react.user', JSON.stringify({ id: '11111111-1111-4111-8111-111111111111', nome: 'Teste local', papel: write ? 'franqueado' : 'financeiro_readonly', tenant_id: '44444444-4444-4444-8444-444444444444', onboarding_completed: true }))
  }, editable)
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.fulfill({ status: 204 }))
  await page.route('**/v1/**', async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname
    if (path === '/v1/financeiro/fechamento-apresentadoras') {
      const mes = url.searchParams.get('mes') ?? ''
      const rows = [[ana, 'Ana'], [bia, 'Bia']].map(([id, nome]) => {
        const items = extras.filter(extra => extra.apresentadora_id === id && extra.mes === mes)
        const adicionais = items.reduce((sum, extra) => sum + Math.round(extra.valor * 100), 0) / 100
        const fixo = mes === '2026-08' ? 2600 : 2700
        const comissao = id === ana ? (mes === '2026-08' ? 100 : 350.10) : 0
        return { apresentadora_id: id, nome, fixo: fixo.toFixed(2), comissao: comissao.toFixed(2), adicionais: adicionais.toFixed(2), total: (fixo + comissao + adicionais).toFixed(2), extras: items }
      })
      return route.fulfill({ json: { mes, apresentadoras: rows, totais: { fixo: rows.reduce((s, r) => s + Number(r.fixo), 0), comissao: rows.reduce((s, r) => s + Number(r.comissao), 0), adicionais: rows.reduce((s, r) => s + Number(r.adicionais), 0), total: rows.reduce((s, r) => s + Number(r.total), 0) }, pode_editar: editable } })
    }
    if (req.method() !== 'GET') {
      if (!editable) return route.fulfill({ status: 403, json: { error: 'Somente consulta' } })
      if (path === '/v1/financeiro/adicionais-apresentadoras' && req.method() === 'POST') {
        const body = req.postDataJSON()
        writes.push({ method: 'POST', body })
        const replay = body.request_id && extras.find(extra => extra.request_id === body.request_id)
        if (replay) return route.fulfill({ json: replay })
        if (body.tipo === 'fim_de_semana' && extras.some(e => e.apresentadora_id === body.apresentadora_id && e.data_referencia === body.data_referencia)) return route.fulfill({ status: 409, json: { error: 'Dia já lançado' } })
        const item = { ...body, id: `extra-${writes.length}`, data_referencia: body.data_referencia ?? null, valor: body.tipo === 'fim_de_semana' ? 100 : Number(body.valor) }
        extras.push(item)
        if (failBonusOnce && body.tipo === 'bonificacao') {
          failBonusOnce = false
          return route.fulfill({ status: 500, json: { error: 'Falha de resposta simulada' } })
        }
        return route.fulfill({ status: 201, json: item })
      }
      if (path.startsWith('/v1/financeiro/adicionais-apresentadoras/') && req.method() === 'DELETE') {
        writes.push({ method: 'DELETE' })
        const index = extras.findIndex(extra => extra.id === path.split('/').at(-1))
        if (index >= 0) extras.splice(index, 1)
        return route.fulfill({ json: { ok: true } })
      }
      return route.fulfill({ status: 405, json: { error: 'Gravação não autorizada pelo teste' } })
    }
    if (path === '/v1/apresentadoras') return route.fulfill({ json: [{ id: ana, nome: 'Ana' }, { id: bia, nome: 'Bia' }] })
    if (path === '/v1/comissoes/apresentadoras') return route.fulfill({ json: [{ apresentadora_id: ana, apresentadora_nome: 'Ana', gmv_total: 10000, comissao_apresentadora: 350.10, fixo: 2700, total_recebido: 3050.10 }] })
    if (path === '/v1/financeiro/resumo' || path === '/v1/financeiro/fluxo-caixa' || path === '/v1/financeiro/faturamento') return route.fulfill({ json: {} })
    return route.fulfill({ json: [] })
  })
  return { writes, extras }
}

async function openAna(page: Page) {
  await page.goto('/financeiro?tab=comissoes&inicio=2026-09&fim=2026-09')
  await page.getByLabel('Competência do fechamento').fill('2026-09')
  await page.locator('tbody tr').filter({ has: page.getByRole('cell', { name: 'Ana', exact: true }) }).getByRole('button', { name: 'Abrir fechamento' }).click()
  return page.getByRole('dialog')
}

test('marca cada dia, lança bonificação e exporta exatamente o total mensal no PDF', async ({ page }, info) => {
  const { writes } = await setup(page)
  const modal = await openAna(page)
  await expect(modal.getByText('R$ 3.050,10', { exact: true })).toBeVisible()
  await modal.getByRole('checkbox', { name: /05\/09\/2026/ }).click()
  await expect(modal.getByRole('checkbox', { name: /05\/09\/2026/ })).toBeChecked()
  await expect(modal.getByText('R$ 3.150,10', { exact: true })).toBeVisible()
  await modal.getByRole('checkbox', { name: /06\/09\/2026/ }).click()
  await expect(modal.getByRole('checkbox', { name: /06\/09\/2026/ })).toBeChecked()
  await expect(modal.getByText('R$ 3.250,10', { exact: true })).toBeVisible()
  await modal.getByLabel('Descrição', { exact: true }).fill('Meta de vendas')
  await modal.getByLabel('Valor', { exact: true }).fill('125,35')
  await modal.getByRole('button', { name: 'Adicionar', exact: true }).click()
  await expect(modal.getByText('R$ 3.375,45', { exact: true })).toBeVisible()
  expect(new URL(page.url()).pathname).toBe('/financeiro')
  expect(writes.filter(write => write.method === 'POST')).toHaveLength(3)
  expect(writes[2].body).toMatchObject({ mes: '2026-09', apresentadora_id: ana, tipo: 'bonificacao', descricao: 'Meta de vendas', valor: 125.35 })
  const download = page.waitForEvent('download')
  await modal.getByRole('button', { name: 'Exportar PDF', exact: true }).click()
  const artifact = await download
  const path = info.outputPath('fechamento-ana.pdf')
  await artifact.saveAs(path)
  const pdf = (await readFile(path)).toString('latin1')
  expect(pdf.startsWith('%PDF')).toBe(true)
  for (const text of ['3.375,45', '325,35', '350,10', '2.700,00', '125,35', '05/09/2026', '06/09/2026', 'Meta de vendas']) expect(pdf).toContain(text)
  await modal.screenshot({ path: info.outputPath('fechamento-com-extras.png') })
  await modal.getByRole('button', { name: 'Remover Meta de vendas', exact: true }).click()
  await expect(modal.getByText('R$ 3.250,10', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('consulta não oferece escrita e mostra apresentadora sem comissão com extra', async ({ page }, info) => {
  const { writes } = await setup(page, false)
  await page.goto('/financeiro?tab=comissoes&inicio=2026-09&fim=2026-09')
  await page.getByLabel('Competência do fechamento').fill('2026-09')
  await page.locator('tbody tr').filter({ has: page.getByRole('cell', { name: 'Bia', exact: true }) }).getByRole('button', { name: 'Abrir fechamento' }).click()
  const modal = page.getByRole('dialog')
  await expect(modal.getByText('R$ 2.755,55', { exact: true })).toBeVisible()
  await expect(modal.getByRole('checkbox')).toHaveCount(0)
  await expect(modal.getByRole('button', { name: 'Adicionar', exact: true })).toHaveCount(0)
  await expect(modal.getByRole('button', { name: /^Remover/ })).toHaveCount(0)
  await modal.screenshot({ path: info.outputPath('fechamento-consulta-dark.png') })
  expect(writes).toEqual([])
})

test('repete bonificação após falha de resposta sem duplicar o lançamento', async ({ page }) => {
  const { writes, extras } = await setup(page, true, true)
  const modal = await openAna(page)
  await modal.getByLabel('Descrição', { exact: true }).fill('Apoio em campanha')
  await modal.getByLabel('Valor', { exact: true }).fill('75,25')
  await modal.getByRole('button', { name: 'Adicionar', exact: true }).click()
  await expect(page.getByText('O servidor está indisponível no momento.', { exact: true })).toBeVisible()
  await modal.getByRole('button', { name: 'Adicionar', exact: true }).click()
  await expect(modal.getByText('R$ 3.125,35', { exact: true })).toBeVisible()
  expect(writes).toHaveLength(2)
  expect(writes[0].body?.request_id).toMatch(/^[0-9a-f-]{36}$/)
  expect(writes[1].body?.request_id).toBe(writes[0].body?.request_id)
  expect(extras.filter(extra => extra.apresentadora_id === ana)).toHaveLength(1)
})

test('perfil usa o mesmo fechamento e mantém desempenho separado do pagamento', async ({ page }) => {
  await setup(page)
  await page.goto(`/apresentadoras/${ana}`)
  await expect(page.getByRole('button', { name: 'Exportar desempenho', exact: true })).toBeVisible()
  await page.getByLabel('Competência do fechamento').fill('2026-09')
  await page.getByRole('button', { name: 'Abrir fechamento', exact: true }).click()
  await expect(page.getByRole('dialog').getByText('R$ 3.050,10', { exact: true })).toBeVisible()
  expect(new URL(page.url()).pathname).toBe(`/apresentadoras/${ana}`)
})
