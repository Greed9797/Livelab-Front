import { describe, expect, it } from 'vitest'
import { legacyPageDestination } from './LegacyPageRedirect'

describe('compatibilidade da navegação simplificada', () => {
  it('preserva filtros, período, origem e registro de links antigos de lives', () => {
    const url = new URL(legacyPageDestination('conteudo', '?tab=lives&live=live-1&agenda=reserva-1&data_inicio=2026-09-04&data_fim=2026-09-05&marca=marca-1&cabine=2&origem=analytics'), 'https://local.test')
    expect(url.pathname).toBe('/lives')
    expect(Object.fromEntries(url.searchParams)).toEqual({ live: 'live-1', agenda: 'reserva-1', data_inicio: '2026-09-04', data_fim: '2026-09-05', marca: 'marca-1', cabine: '2', origem: 'analytics' })
  })

  it('encaminha abas retiradas para Agenda e preserva data', () => {
    for (const tab of ['agenda', 'videos', 'cabines', 'calendario', 'analytics']) {
      expect(legacyPageDestination('conteudo', `?tab=${tab}&data=2026-09-05`)).toBe('/agenda?data=2026-09-05')
    }
  })

  it('mantém filtros dos clientes e o estado de links de configuração', () => {
    expect(legacyPageDestination('/clientes', '?tab=crm&ativo=Marca+Aurora')).toBe('/clientes?ativo=Marca+Aurora')
    expect(legacyPageDestination('/financeiro/comissoes/regras', '?tab=marcas', '#regras')).toBe('/financeiro/comissoes/regras?tab=marcas#regras')
  })
})
