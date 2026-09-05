import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { InlineGmvCell, InlinePedidosCell } from './LiveInlineCells'
import { LivePendingPanel } from './LivePendingPanel'

describe('LivePendingPanel', () => {
  it('mostra contagens como escopo carregado e deixa o bucket ativo explícito', () => {
    const html = renderToStaticMarkup(
      <LivePendingPanel
        counts={{ rascunho: 2, cadastro: 1, metricas: 3, duplicata: 1 }}
        loadedCount={8}
        selected="metricas"
        onSelect={vi.fn()}
      />,
    )
    expect(html).toContain('nos 8 resultados carregados')
    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('Possíveis duplicatas')
  })

  it('renderiza zero registrado em GMV e pedidos em vez do marcador de ausência', () => {
    const html = renderToStaticMarkup(
      <>
        <InlineGmvCell gmv={0} hasValue editable={false} onSave={vi.fn()} />
        <InlinePedidosCell pedidos={0} hasValue editable={false} onSave={vi.fn()} />
      </>,
    )
    expect(html).toContain('0,00')
    expect(html).toContain('>0<')
    expect(html).not.toContain('>—<')
  })

  it('oculta contagens antigas durante troca de recorte e distingue duplicatas indisponíveis', () => {
    const loading = renderToStaticMarkup(
      <LivePendingPanel
        counts={{ rascunho: 9, cadastro: 9, metricas: 9, duplicata: 9 }}
        loadedCount={9}
        selected=""
        onSelect={vi.fn()}
        loading
      />,
    )
    expect(loading).toContain('Carregando pendências do recorte')
    expect(loading).not.toContain('Rascunhos')

    const duplicateError = renderToStaticMarkup(
      <LivePendingPanel
        counts={{ rascunho: 1, cadastro: 0, metricas: 0, duplicata: 0 }}
        loadedCount={1}
        selected=""
        onSelect={vi.fn()}
        duplicateStatus="error"
        onRetry={vi.fn()}
      />,
    )
    expect(duplicateError).toContain('Possíveis duplicatas')
    expect(duplicateError).toContain('—')
    expect(duplicateError).toContain('indisponível')
    expect(duplicateError).toContain('Tentar novamente')
  })
})
