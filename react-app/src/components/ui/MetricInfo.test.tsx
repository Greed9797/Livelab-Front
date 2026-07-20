import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MetricInfo, MetricInfoPopover, isMetricInfoCloseKey } from './MetricInfo'
import { METRIC_GLOSSARY, type MetricKey } from '../../utils/metricGlossary'

// O repo não tem ambiente DOM (nenhum jsdom/happy-dom instalado; todos os testes
// usam renderToStaticMarkup). Então o teclado é coberto em duas frentes:
//  1. a decisão de fechar por Escape é uma função pura exportada;
//  2. o markup prova que o gatilho é um <button>, que o navegador já ativa com
//     Enter/Espaço e coloca na ordem de tabulação sem tabIndex manual.

describe('isMetricInfoCloseKey', () => {
  it('fecha com Escape', () => {
    expect(isMetricInfoCloseKey('Escape')).toBe(true)
  })

  it('aceita o alias legado Esc (IE/Edge antigo)', () => {
    expect(isMetricInfoCloseKey('Esc')).toBe(true)
  })

  it('não fecha com teclas de ativação nem de navegação', () => {
    for (const key of ['Enter', ' ', 'Tab', 'ArrowDown', 'e', 'Escape ']) {
      expect(isMetricInfoCloseKey(key)).toBe(false)
    }
  })
})

describe('MetricInfo — acessibilidade por teclado', () => {
  const html = renderToStaticMarkup(<MetricInfo metric="home.gmv_total" />)

  it('o gatilho é um button, então é focável e ativado por Enter/Espaço', () => {
    expect(html).toContain('<button')
    expect(html).toContain('type="button"')
    // tabIndex negativo tiraria o botão da ordem de tabulação
    expect(html).not.toContain('tabindex="-1"')
  })

  it('anuncia estado e rótulo para leitores de tela', () => {
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('aria-label="Como calculamos GMV — Mês"')
  })

  it('começa fechado — nenhum tooltip no markup inicial', () => {
    expect(html).not.toContain('role="tooltip"')
  })
})

describe('MetricInfoPopover', () => {
  it('expõe role=tooltip e o conteúdo do glossário', () => {
    const html = renderToStaticMarkup(
      <MetricInfoPopover id="t1" metric="financeiro.fat_liquido" />,
    )
    const entry = METRIC_GLOSSARY['financeiro.fat_liquido']
    expect(html).toContain('role="tooltip"')
    expect(html).toContain('id="t1"')
    expect(html).toContain(entry.definicao)
    expect(html).toContain('routes/financeiro.js:152')
  })

  it('mostra a memória de cálculo real quando o payload traz os números', () => {
    const html = renderToStaticMarkup(
      <MetricInfoPopover id="t2" metric="financeiro.gmv_total" detail="R$ 10,00 = lives R$ 6,00 + vídeos R$ 4,00" />,
    )
    expect(html).toContain('Neste período')
    expect(html).toContain('R$ 6,00')
  })
})

describe('METRIC_GLOSSARY', () => {
  it('toda métrica tem os quatro campos preenchidos', () => {
    for (const [key, entry] of Object.entries(METRIC_GLOSSARY)) {
      expect(entry.rotulo, key).toBeTruthy()
      expect(entry.definicao, key).toBeTruthy()
      expect(entry.formula, key).toBeTruthy()
      expect(entry.periodo, key).toBeTruthy()
      expect(entry.fonte, key).toBeTruthy()
    }
  })

  it('GMV total e GMV de lives da Home não compartilham definição (baldes distintos)', () => {
    const total = METRIC_GLOSSARY['home.gmv_total']
    const lives = METRIC_GLOSSARY['home.gmv_lives']
    expect(total.definicao).not.toBe(lives.definicao)
    expect(total.fonte).toContain('gmv_total_mes')
    expect(lives.fonte).toContain('gmv_lives_mes')
  })

  it('toda fonte aponta um arquivo:linha do backend ou do frontend', () => {
    for (const [key, entry] of Object.entries(METRIC_GLOSSARY)) {
      expect(entry.fonte, key).toMatch(/\.(js|tsx):\d+/)
    }
  })

  it('as chaves usadas pelas telas existem no glossário', () => {
    const usadas: MetricKey[] = [
      'home.gmv_total',
      'home.lives',
      'home.horas_live',
      'home.videos',
      'home.gmv_por_live',
      'home.gmv_por_hora',
      'financeiro.gmv_total',
      'financeiro.receita_liquida',
      'financeiro.total_custos',
      'financeiro.comissao_faltante',
    ]
    for (const key of usadas) expect(METRIC_GLOSSARY[key], key).toBeDefined()
  })
})
