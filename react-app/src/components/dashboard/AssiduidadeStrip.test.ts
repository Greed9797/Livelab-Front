import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  ASSIDUIDADE_META,
  META_DIA_UTIL_HORAS,
  META_FOLGA_HORAS,
  buildAssiduidade,
  descreverDia,
  diaDaSemana,
  lerMetas,
  somarDias,
  type AssiduidadeStatus,
  type DiaAssiduidade,
} from './AssiduidadeStrip'

function dia(over: Partial<DiaAssiduidade>): DiaAssiduidade {
  return { data: '2026-09-01', horas: 0, status: 'vermelho', tipo: 'util', feriado: null, ...over }
}

/**
 * A regra de negócio inteira desta tela é "ninguém é cobrado por não trabalhar na folga".
 * Um feriado pintado de vermelho acusa de falta quem não faltou — é o erro caro.
 */
describe('descreverDia', () => {
  it('nomeia o feriado e chama de folga, nunca de falta', () => {
    expect(descreverDia(dia({ data: '2026-09-02', horas: 0, status: 'cinza', tipo: 'feriado', feriado: 'Aniversário de Blumenau' })))
      .toBe('Qua 02/09/2026 · 0h00 · Feriado: Aniversário de Blumenau — folga, não é cobrado')
  })

  it('chama de falta o dia útil sem live', () => {
    expect(descreverDia(dia({ data: '2026-09-01', horas: 0, status: 'vermelho' })))
      .toBe('Ter 01/09/2026 · 0h00 · dia útil — falta')
  })

  it('cobra 5,5h no dia útil e só 4h na folga', () => {
    expect(descreverDia(dia({ data: '2026-09-01', horas: 6.5, status: 'verde' })))
      .toBe('Ter 01/09/2026 · 6h30 · dia útil — meta batida de 5,5h')
    expect(descreverDia(dia({ data: '2026-09-05', horas: 4.5, status: 'verde', tipo: 'fim_de_semana' })))
      .toBe('Sáb 05/09/2026 · 4h30 · fim de semana — meta batida de 4h')
    // Quem trabalha no feriado é medido pela meta de folga, não pela de dia útil.
    expect(descreverDia(dia({ data: '2026-09-07', horas: 5, status: 'verde', tipo: 'feriado', feriado: 'Independência' })))
      .toBe('Seg 07/09/2026 · 5h00 · Feriado: Independência — trabalhou, meta batida de 4h')
  })

  it('marca fim de semana sem live como folga, nunca como falta', () => {
    expect(descreverDia(dia({ data: '2026-09-05', horas: 0, status: 'cinza', tipo: 'fim_de_semana' })))
      .toBe('Sáb 05/09/2026 · 0h00 · fim de semana — folga, não é cobrado')
  })
})

/**
 * Daltonismo: nos tokens deste projeto verde e amarelo têm 1.01:1 de contraste entre si no tema
 * escuro. Se as quatro alturas colapsarem, a fileira volta a depender só da cor.
 */
describe('ASSIDUIDADE_META — segundo canal além da cor', () => {
  it('dá altura própria e decrescente a cada status', () => {
    const alturas = (['verde', 'amarelo', 'vermelho', 'cinza'] as AssiduidadeStatus[])
      .map((s) => ASSIDUIDADE_META[s].alturaPct)

    expect(new Set(alturas).size).toBe(4)
    expect(alturas).toEqual([...alturas].sort((a, b) => b - a))
  })

  it('dá rótulo textual a cada status, para a legenda traduzir a cor', () => {
    for (const status of ['verde', 'amarelo', 'vermelho', 'cinza'] as AssiduidadeStatus[]) {
      expect(ASSIDUIDADE_META[status].rotulo.length).toBeGreaterThan(0)
    }
  })
})

describe('diaDaSemana / somarDias', () => {
  it('lê a data como dia-calendário, sem deslocar por fuso', () => {
    expect(diaDaSemana('2026-09-07')).toBe('Seg')
    expect(diaDaSemana('2026-09-05')).toBe('Sáb')
    expect(diaDaSemana('2026-09-06')).toBe('Dom')
  })

  it('soma dias atravessando mês e ano', () => {
    expect(somarDias('2026-09-01', -29)).toBe('2026-08-03')
    expect(somarDias('2026-03-01', -1)).toBe('2026-02-28')
    expect(somarDias('2026-01-01', -1)).toBe('2025-12-31')
  })
})

describe('buildAssiduidade', () => {
  const payload = {
    inicio: '2026-09-01',
    fim: '2026-09-02',
    // Ordem invertida de propósito: o calendário casa por DATA, não por posição.
    dias: [
      { data: '2026-09-02', tipo: 'feriado', feriado: 'Aniversário de Blumenau' },
      { data: '2026-09-01', tipo: 'util', feriado: null },
    ],
    apresentadoras: [
      {
        id: 'ana',
        nome: 'Ana',
        dias: [
          { data: '2026-09-01', horas: 0, status: 'vermelho' },
          { data: '2026-09-02', horas: 0, status: 'cinza' },
        ],
      },
    ],
  }

  it('casa o tipo de dia por data, não por índice', () => {
    const { linhas } = buildAssiduidade(payload)
    expect(linhas[0].dias[0]).toMatchObject({ data: '2026-09-01', tipo: 'util', feriado: null })
    expect(linhas[0].dias[1]).toMatchObject({ data: '2026-09-02', tipo: 'feriado', feriado: 'Aniversário de Blumenau' })
  })

  it('conta como falta só o palitinho vermelho que está na tela', () => {
    expect(buildAssiduidade(payload).linhas[0].faltas).toBe(1)
  })

  it('devolve o início e o FIM EFETIVO que o backend mandou, não o pedido', () => {
    expect(buildAssiduidade(payload)).toMatchObject({ inicio: '2026-09-01', fim: '2026-09-02' })
  })

  it('trata status desconhecido como folga — o erro barato é não cobrar, não acusar falta', () => {
    const { linhas } = buildAssiduidade({
      dias: [{ data: '2026-09-01', tipo: 'util', feriado: null }],
      apresentadoras: [{ id: 'ana', nome: 'Ana', dias: [{ data: '2026-09-01', horas: 0, status: 'roxo' }] }],
    })
    expect(linhas[0].dias[0].status).toBe('cinza')
    expect(linhas[0].faltas).toBe(0)
  })

  it('não explode com payload vazio, nulo ou sem apresentadoras', () => {
    expect(buildAssiduidade(undefined).linhas).toEqual([])
    expect(buildAssiduidade({}).linhas).toEqual([])
    expect(buildAssiduidade({ apresentadoras: [{ id: 'x', nome: 'X' }] }).linhas[0].dias).toEqual([])
  })

  it('apresentadora ativa sem live nenhuma vira uma fileira inteira de falta', () => {
    const { linhas } = buildAssiduidade({
      dias: [
        { data: '2026-09-01', tipo: 'util', feriado: null },
        { data: '2026-09-05', tipo: 'fim_de_semana', feriado: null },
      ],
      apresentadoras: [{
        id: 'nova', nome: 'Nova', dias: [
          { data: '2026-09-01', horas: 0, status: 'vermelho' },
          { data: '2026-09-05', horas: 0, status: 'cinza' },
        ],
      }],
    })
    expect(linhas[0].faltas).toBe(1)
    expect(linhas[0].dias.map((d) => d.status)).toEqual(['vermelho', 'cinza'])
  })
})

describe('contrato de origem do indicador', () => {
  const strip = readFileSync(new URL('./AssiduidadeStrip.tsx', import.meta.url), 'utf8')

  it('busca só por janela — presença é física e não aceita recorte por marca', () => {
    expect(strip).toContain('getAssiduidade({ inicio, fim })')
    expect(strip).not.toContain('getDailyAnalytics')
    // getPerformanceRanking/comissões descartam quem vendeu zero — exatamente quem veio e não
    // vendeu, que aqui viraria vermelho falso.
    expect(strip).not.toContain('getComissoesApresentadoras')
  })

  it('põe rótulo textual em cada palitinho, não só cor', () => {
    expect(strip).toContain('aria-label={label}')
    expect(strip).toContain('title={label}')
    // Casa a chamada, não a assinatura: o que importa é que o rótulo de cada dia venha de
    // descreverDia. Fixar `descreverDia(dia)` literal quebrou quando os limiares passaram a
    // vir do payload e a função ganhou um segundo argumento.
    expect(strip).toMatch(/label=\{descreverDia\(dia[^)]*\)\}/)
  })

  it('pinta com token do design system, nunca com hex cru', () => {
    expect(strip).toContain("cor: 'var(--success)'")
    expect(strip).toContain("cor: 'var(--warning)'")
    expect(strip).toContain("cor: 'var(--danger)'")
    expect(strip).toContain("cor: 'var(--text-faint)'")
    expect(strip).not.toMatch(/#[0-9a-fA-F]{6}\b/)
  })

  it('a Home usa janela fixa de 30 dias e o Analytics obedece o filtro da tela', () => {
    const home = readFileSync(new URL('../../pages/DashboardPage.tsx', import.meta.url), 'utf8')
    const analytics = readFileSync(new URL('../../pages/AnalyticsPage.tsx', import.meta.url), 'utf8')

    expect(home).toContain('somarDias(today, -29)')
    expect(analytics).toContain('inicio={from}')
    expect(analytics).toContain('fim={to}')
    // marcaId envenenaria o indicador: quem fez live de outra marca no dia sumiria da resposta.
    expect(analytics).not.toContain('<AssiduidadeStrip\n        inicio={from}\n        fim={to}\n        marcaId')
  })

  it('o serviço aponta para o endpoint que classifica com o calendário de Blumenau', () => {
    const domain = readFileSync(new URL('../../services/domain.ts', import.meta.url), 'utf8')
    expect(domain).toContain("apiGet<JsonRecord>('/analytics/assiduidade', params)")
  })
})

/**
 * Os limiares nomeiam a meta na legenda e no tooltip. Quem CLASSIFICA é o backend, então quem
 * nomeia o número também tem que ser ele — senão mudar 5,5h no servidor deixaria a legenda aqui
 * afirmando um limiar que não é mais o aplicado.
 */
describe('limiares vêm do servidor', () => {
  it('lê metas.dia_util_horas e metas.folga_horas do payload', () => {
    expect(lerMetas({ metas: { dia_util_horas: 6, folga_horas: 3 } })).toEqual({ diaUtil: 6, folga: 3 })
  })

  it('cai no padrão quando o backend antigo ainda não manda o campo', () => {
    // Acontece de verdade na janela entre publicar o front e publicar o back.
    expect(lerMetas({})).toEqual({ diaUtil: META_DIA_UTIL_HORAS, folga: META_FOLGA_HORAS })
    expect(lerMetas(null)).toEqual({ diaUtil: META_DIA_UTIL_HORAS, folga: META_FOLGA_HORAS })
    expect(lerMetas({ metas: { dia_util_horas: 0 } })).toEqual({ diaUtil: META_DIA_UTIL_HORAS, folga: META_FOLGA_HORAS })
  })

  it('o tooltip cita o limiar que veio do servidor, não o fixo', () => {
    const dia = { data: '2026-09-03', horas: 6.2, status: 'verde' as const, tipo: 'util' as const, feriado: null }
    expect(descreverDia(dia, { diaUtil: 6, folga: 3 })).toContain('6h')
    expect(descreverDia(dia, { diaUtil: 6, folga: 3 })).not.toContain('5,5h')
  })
})
