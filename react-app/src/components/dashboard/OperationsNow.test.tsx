import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { OperationsNow } from './OperationsNow'
import { gradeDateFromLink } from '../conteudo/gradeUtils'

describe('Operação da Home', () => {
  it('links only identified live records and does not infer a missing presenter from legacy fields', () => {
    const html = renderToStaticMarkup(<MemoryRouter><OperationsNow today="2026-09-05" cabines={[
      { id: 'c1', numero: 1, status: 'ao_vivo', live_atual_id: 'live-1', duracao_min: 241, apresentador: null },
      { id: 'c2', numero: 2, status: 'ao_vivo', duracao_min: 300 },
      { id: 'c3', numero: 3, status: 'disponivel', live_atual_id: 'old' },
    ]} /></MemoryRouter>)
    expect(html).toContain('live=live-1')
    expect(html).toContain('no ar há 241 min')
    expect(html).not.toContain('live=old')
    expect(html).not.toContain('sem apresentadora')
    expect(html).toContain('Acompanhar live')
  })

  it('keeps calendar days and rejects invalid dates in agenda links', () => {
    expect(gradeDateFromLink('2028-02-29', '2026-09-05')).toBe('2028-02-29')
    for (const input of ['2026-02-29', '2026-13-01', '2026-09-31', 'invalid', '']) {
      expect(gradeDateFromLink(input, '2026-09-05')).toBe('2026-09-05')
    }
  })
})
