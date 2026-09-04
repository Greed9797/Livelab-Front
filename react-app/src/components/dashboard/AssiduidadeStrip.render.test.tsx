import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import { AssiduidadeStrip, JANELA_MAX_DIAS, somarDias } from './AssiduidadeStrip'

const INICIO = '2026-08-05'
const FIM = '2026-08-07'

function render(payload: unknown, props: { inicio?: string; fim?: string } = {}) {
  const inicio = props.inicio ?? INICIO
  const fim = props.fim ?? FIM
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  // Semear o cache com a chave que o componente usa deixa o primeiro render já em sucesso — é o
  // estado que interessa aqui (a fileira montada), não o de carregamento.
  client.setQueryData(['assiduidade', inicio, fim], payload)
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <AssiduidadeStrip inicio={inicio} fim={fim} />
    </QueryClientProvider>,
  )
}

const payloadComFaltas = {
  inicio: INICIO,
  fim: FIM,
  metas: { dia_util_horas: 5.5, folga_horas: 4 },
  dias: [
    { data: '2026-08-05', tipo: 'util', feriado: null },
    { data: '2026-08-06', tipo: 'util', feriado: null },
    { data: '2026-08-07', tipo: 'util', feriado: null },
  ],
  apresentadoras: [{
    id: 'ana',
    nome: 'Ana',
    dias: [
      { data: '2026-08-05', horas: 0, status: 'vermelho' },
      { data: '2026-08-06', horas: 6, status: 'verde' },
      { data: '2026-08-07', horas: 0, status: 'vermelho' },
    ],
  }],
}

/**
 * O motivo do vermelho não pode existir só no hover. Num tablet da operação não há hover, e no
 * teclado um <span> com `title` não é alcançável: a acusação ficava visível e a justificativa não.
 */
describe('o motivo de cada dia existe fora do hover', () => {
  const html = render(payloadComFaltas)

  it('cada dia é um botão focável, não um span decorativo', () => {
    const botoes = html.match(/<button[^>]*id="palito-ana-/g) ?? []
    expect(botoes).toHaveLength(3)
    // Roving tabindex: a fileira é UMA parada de Tab e as setas percorrem os dias — com 366
    // palitinhos por linha, um tabIndex=0 por dia viraria um campo minado de teclado.
    expect(html.match(/id="palito-ana-[^"]*"[^>]*tabindex="0"/g) ?? []).toHaveLength(1)
    expect(html.match(/id="palito-ana-[^"]*"[^>]*tabindex="-1"/g) ?? []).toHaveLength(2)
  })

  it('o texto do dia viaja em aria-label, não só em title', () => {
    expect(html).toContain('aria-label="Qua 05/08/2026 · 0h00 · dia útil — falta"')
    expect(html).toContain('title="Qua 05/08/2026 · 0h00 · dia útil — falta"')
  })

  it('lista QUAIS dias são as faltas em texto, sem exigir nenhuma interação de ponteiro', () => {
    expect(html).toContain('<details')
    expect(html).toContain('2 faltas')
    expect(html).toContain('Qua 05/08')
    expect(html).toContain('Sex 07/08')
  })

  it('tem uma linha de leitura que anuncia o dia escolhido', () => {
    expect(html).toContain('aria-live="polite"')
    expect(html).toMatch(/Toque num dia.*setas/s)
  })
})

/**
 * Janela de zero dias: a fileira ficava vazia e o texto dizia "sem faltas" — uma afirmação
 * tranquilizadora sobre um período que ninguém mediu.
 */
describe('janela sem dias é estado vazio explícito, nunca "sem faltas"', () => {
  it('janela invertida devolvida pelo backend não vira fileira vazia', () => {
    const html = render({
      inicio: '2026-09-04',
      fim: '2026-09-03',
      dias: [],
      apresentadoras: [{ id: 'ana', nome: 'Ana', dias: [] }, { id: 'bia', nome: 'Bia', dias: [] }],
    })
    expect(html).toContain('Nenhum dia na janela selecionada')
    expect(html).not.toContain('sem faltas')
  })

  it('linha sem nenhum dia não afirma nada sobre a pessoa', () => {
    const html = render({
      inicio: INICIO,
      fim: FIM,
      dias: [],
      apresentadoras: [{ id: 'ana', nome: 'Ana', dias: [] }],
    })
    expect(html).toContain('Nenhum dia na janela selecionada')
    expect(html).not.toContain('sem faltas')
  })

  it('janela invertida vinda dos PRÓPRIOS props nem chega a virar request', () => {
    const html = render(undefined, { inicio: '2026-09-04', fim: '2026-09-03' })
    expect(html).toContain('Nenhum dia na janela selecionada')
    expect(html).not.toContain('sem faltas')
    // Nada de spinner: a janela é impossível, não está carregando.
    expect(html).not.toContain('Levantando presença')
  })

  it('janela normal continua mostrando a fileira', () => {
    expect(render(payloadComFaltas)).not.toContain('Nenhum dia na janela selecionada')
  })
})

/**
 * 366 palitinhos (o teto do endpoint) têm que caber sem empurrar a página inteira para o lado: o
 * scroll é do container da fileira, e o nome fica grudado à esquerda para a linha não virar uma
 * faixa de cores de dono desconhecido.
 */
describe('janela longa — 366 dias', () => {
  const fim = '2026-09-03'
  const inicio = somarDias(fim, -(JANELA_MAX_DIAS - 1))
  const datas = Array.from({ length: JANELA_MAX_DIAS }, (_, i) => somarDias(inicio, i))
  const html = render({
    inicio,
    fim,
    dias: datas.map((data) => ({ data, tipo: 'util', feriado: null })),
    apresentadoras: [{ id: 'ana', nome: 'Ana', dias: datas.map((data) => ({ data, horas: 6, status: 'verde' })) }],
  }, { inicio, fim })

  it('renderiza um palitinho por dia', () => {
    expect(html.match(/id="palito-ana-/g) ?? []).toHaveLength(JANELA_MAX_DIAS)
  })

  it('o scroll horizontal é do container da fileira, não da página', () => {
    expect(html).toContain('overflow-x-auto')
    // w-max deixa o conteúdo passar da largura do card; sem ele a fileira comprimiria ou vazaria.
    expect(html).toContain('w-max min-w-full')
    expect(html).toContain('sticky left-0')
  })
})
