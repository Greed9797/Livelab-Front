import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  GmvHeroPanel,
  fmtCompact,
  computeBusinessDays,
  calcRitmoProjetado,
} from './GmvHeroPanel'

/* ── unit helpers ── */

describe('fmtCompact', () => {
  it('formats values below 1k without suffix', () => {
    expect(fmtCompact(500)).toBe('500')
    expect(fmtCompact(0)).toBe('0')
  })

  it('formats thousands with k suffix', () => {
    expect(fmtCompact(1_500)).toMatch(/1[,.]5k/)
    expect(fmtCompact(10_000)).toMatch(/10k/)
  })

  it('formats millions with M suffix', () => {
    expect(fmtCompact(1_200_000)).toMatch(/1[,.]2M/)
  })
})

describe('computeBusinessDays', () => {
  it('returns diaUtil >= 1 and diasUteisTotal >= 20 for a regular month', () => {
    const { diaUtil, diasUteisTotal } = computeBusinessDays()
    expect(diaUtil).toBeGreaterThanOrEqual(1)
    expect(diasUteisTotal).toBeGreaterThanOrEqual(20)
  })

  it('diaUtil <= diasUteisTotal always', () => {
    const { diaUtil, diasUteisTotal } = computeBusinessDays()
    expect(diaUtil).toBeLessThanOrEqual(diasUteisTotal)
  })
})

describe('calcRitmoProjetado', () => {
  it('projects correctly given pace', () => {
    // 10k in 5 days out of 20 → projects 40k
    expect(calcRitmoProjetado(10_000, 5, 20)).toBe(40_000)
  })

  it('returns 0 when diaUtil is 0 to avoid division by zero', () => {
    expect(calcRitmoProjetado(50_000, 0, 22)).toBe(0)
  })

  it('returns 0 when diasUteisTotal is 0', () => {
    expect(calcRitmoProjetado(50_000, 5, 0)).toBe(0)
  })
})

/* ── component rendering ── */

const baseRaw = {
  gmv_total_mes: 182_000,
  gmv_mes_prev: 165_000,
  meta_mes: 250_000,
  ritmo_projetado: 220_000,
  periodo: { dia_util: 15, dias_uteis_total: 22 },
}

describe('GmvHeroPanel', () => {
  it('renders GMV value and delta pill without NaN or undefined', () => {
    const html = renderToStaticMarkup(<GmvHeroPanel raw={baseRaw} />)

    expect(html).toContain('182')
    expect(html).not.toMatch(/NaN|undefined/)
  })

  it('renders meta bar when meta_mes is present', () => {
    const html = renderToStaticMarkup(<GmvHeroPanel raw={baseRaw} />)

    expect(html).toContain('250')         // meta value appears
    expect(html).toContain('realizado')
    expect(html).toContain('Dia útil')
    expect(html).toContain('Ritmo projetado')
  })

  it('shows hint to configure when meta is null (no bar rendered)', () => {
    const raw = { ...baseRaw, meta_mes: null }
    const html = renderToStaticMarkup(<GmvHeroPanel raw={raw} />)

    expect(html).toContain('Meta não definida')
    expect(html).not.toContain('realizado')
    expect(html).not.toContain('Ritmo projetado')
  })

  it('marks meta as derived when meta_origem is diaria_legada', () => {
    const raw = { ...baseRaw, meta_mes: 200000, meta_origem: 'diaria_legada' }
    const html = renderToStaticMarkup(<GmvHeroPanel raw={raw} />)

    expect(html).toContain('derivada da meta diária antiga')
  })

  it('does NOT render chart block when gmv_intraday is absent', () => {
    const rawNoChart = { ...baseRaw }
    const html = renderToStaticMarkup(<GmvHeroPanel raw={rawNoChart} />)

    // No SVG path elements for the chart
    expect(html).not.toContain('gmvIntradayGrad')
  })

  it('does NOT render chart block when gmv_intraday is empty array', () => {
    const html = renderToStaticMarkup(<GmvHeroPanel raw={{ ...baseRaw, gmv_intraday: [] }} />)
    expect(html).not.toContain('gmvIntradayGrad')
  })

  it('does NOT render intraday chart when all v AND prev values are null (regression: both null)', () => {
    const allNull = [
      { h: '09', v: null, prev: null },
      { h: '10', v: null, prev: null },
    ]
    const html = renderToStaticMarkup(<GmvHeroPanel raw={{ ...baseRaw, gmv_intraday: allNull }} />)
    expect(html).not.toContain('gmv-chart-intraday')
  })

  it('renders intraday chart when all v are null but prev has values (relaxed condition)', () => {
    const allNullV = [
      { h: '09', v: null, prev: 1000 },
      { h: '10', v: null, prev: 1200 },
    ]
    const html = renderToStaticMarkup(<GmvHeroPanel raw={{ ...baseRaw, gmv_intraday: allNullV }} />)
    expect(html).toContain('gmv-chart-intraday')
  })

  it('renders chart SVG when gmv_intraday has at least one non-null v', () => {
    const data = [
      { h: '09', v: 800, prev: 700 },
      { h: '10', v: 1200, prev: 1100 },
      { h: '11', v: null, prev: 1300 },
      { h: '12', v: null, prev: 1400 },
    ]
    const html = renderToStaticMarkup(<GmvHeroPanel raw={{ ...baseRaw, gmv_intraday: data }} />)
    expect(html).toContain('gmvIntradayGrad')
    expect(html).toContain('gmv-chart-intraday')
  })

  it('uses client-side business-day fallback when periodo is absent', () => {
    const rawNoPeriodo = { ...baseRaw, periodo: undefined }
    const html = renderToStaticMarkup(<GmvHeroPanel raw={rawNoPeriodo} />)

    // Should still render MetaBar with Dia útil row
    expect(html).toContain('Dia útil')
    expect(html).not.toMatch(/NaN|undefined/)
  })

  it('uses legacy meta_gmv when meta_mes is absent', () => {
    const raw = { ...baseRaw, meta_mes: undefined, meta_gmv: 300_000 }
    const html = renderToStaticMarkup(<GmvHeroPanel raw={raw} />)

    expect(html).toContain('300')
    expect(html).toContain('realizado')
  })

  it('renders "vs. mesmo período do mês anterior" label', () => {
    const html = renderToStaticMarkup(<GmvHeroPanel raw={baseRaw} />)
    expect(html).toContain('vs. mesmo período do mês anterior')
  })

  it('renders intraday legend "Hoje" and "Mês anterior" when intraday qualifies', () => {
    const data = [{ h: '09', v: 800, prev: 700 }]
    const html = renderToStaticMarkup(<GmvHeroPanel raw={{ ...baseRaw, gmv_intraday: data }} />)
    expect(html).toContain('Hoje')
    expect(html).toContain('Mês anterior')
    expect(html).not.toContain('Mês atual')
  })

  /* ── daily fallback chart tests ── */

  const dailyPoints = Array.from({ length: 30 }, (_, i) => ({
    dia: i + 1,
    gmv: i < 15 ? (i + 1) * 1000 : 0,
  }))

  it('renders daily chart when intraday is absent and gmv_diario_mes has non-zero values', () => {
    const html = renderToStaticMarkup(
      <GmvHeroPanel raw={{ ...baseRaw, gmv_diario_mes: dailyPoints }} />,
    )
    expect(html).toContain('gmv-chart-daily')
    expect(html).not.toContain('gmv-chart-intraday')
  })

  it('renders daily legend com mês atual E "Mês anterior" (série comparativa)', () => {
    const html = renderToStaticMarkup(
      <GmvHeroPanel raw={{ ...baseRaw, gmv_diario_mes: dailyPoints }} />,
    )
    expect(html).toContain('Mês atual')
    expect(html).toContain('Mês anterior')
  })

  it('desenha a linha tracejada do mês anterior quando há prev > 0', () => {
    const comPrev = dailyPoints.map((p) => ({ ...p, prev: p.gmv * 0.8 }))
    const html = renderToStaticMarkup(
      <GmvHeroPanel raw={{ ...baseRaw, gmv_diario_mes: comPrev }} />,
    )
    expect(html).toContain('stroke-dasharray="3 4"')
  })

  it('sem prev, não desenha a série comparativa no chart diário', () => {
    const html = renderToStaticMarkup(
      <GmvHeroPanel raw={{ ...baseRaw, gmv_diario_mes: dailyPoints }} />,
    )
    // só o marcador "hoje" usa 2 3; a série prev usaria 3 4
    expect(html).not.toContain('stroke-dasharray="3 4"')
  })

  it('does NOT render daily chart when gmv_diario_mes is all zeros', () => {
    const allZero = Array.from({ length: 30 }, (_, i) => ({ dia: i + 1, gmv: 0 }))
    const html = renderToStaticMarkup(
      <GmvHeroPanel raw={{ ...baseRaw, gmv_diario_mes: allZero }} />,
    )
    expect(html).not.toContain('gmv-chart-daily')
    expect(html).not.toContain('gmv-chart-intraday')
  })

  it('defaults to the month (daily) chart when both intraday and daily qualify', () => {
    const intradayData = [{ h: '09', v: 800, prev: 700 }]
    const html = renderToStaticMarkup(
      <GmvHeroPanel raw={{ ...baseRaw, gmv_intraday: intradayData, gmv_diario_mes: dailyPoints }} />,
    )
    // Toggle defaults to "Mês" → daily chart is shown, intraday is not.
    expect(html).toContain('gmv-chart-daily')
    expect(html).not.toContain('gmv-chart-intraday')
  })

  it('renders both toggle options (Hoje | Mês) when both datasets qualify', () => {
    const intradayData = [{ h: '09', v: 800, prev: 700 }]
    const html = renderToStaticMarkup(
      <GmvHeroPanel raw={{ ...baseRaw, gmv_intraday: intradayData, gmv_diario_mes: dailyPoints }} />,
    )
    expect(html).toContain('Período do gráfico')
    expect(html).toContain('aria-pressed="true"') // the active "Mês" option
  })

  it('renders no chart and no chart legends when neither qualifies', () => {
    const html = renderToStaticMarkup(
      <GmvHeroPanel raw={{ ...baseRaw }} />,
    )
    expect(html).not.toContain('gmv-chart-intraday')
    expect(html).not.toContain('gmv-chart-daily')
    expect(html).not.toContain('Hoje')
    expect(html).not.toContain('Mês atual')
  })
})
