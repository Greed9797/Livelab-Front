import { describe, expect, it } from 'vitest'
import { montarCamposNumericos } from './EditarLiveModal'

/**
 * Regressão de dinheiro, encontrada em produção: três lives tiveram o GMV editado e, minutos
 * depois, revertido para o valor antigo pelo próprio sistema.
 *
 *   live 5aebe5e2: 2351 → 2251, e 36s depois de volta para 2351
 *   live 83d37186: 1433 → 1432,5, e 182s depois de volta para 1433
 *   live e2d67906: 1817 → 2419, e 378s depois de volta para 1817
 *
 * Causa: o modal enviava TODO campo numérico preenchido, tocado ou não. Como o prefill vinha
 * de uma cópia envelhecida da linha, o segundo save regravava o GMV antigo por cima do novo.
 */

const vazio = {
  fat_gerado: '', manual_gmv: '', qtd_pedidos: '', manual_orders: '', manual_views: '',
  manual_likes: '', manual_comments: '', manual_shares: '', manual_diamonds: '',
} as never

const form = (patch: Record<string, string>) => ({ ...(vazio as object), ...patch } as never)

describe('montarCamposNumericos — não regravar dinheiro que ninguém tocou', () => {
  it('não envia o GMV quando o usuário só mexeu em outro campo', () => {
    // O cenário exato da reversão: prefill com 1817, usuário não encosta no GMV.
    const prefill = form({ fat_gerado: '1817', manual_gmv: '1817' })
    const payload = montarCamposNumericos(prefill, prefill)
    expect(payload).not.toHaveProperty('fat_gerado')
    expect(payload).not.toHaveProperty('manual_gmv')
    expect(payload).toEqual({})
  })

  it('envia o GMV quando o usuário realmente mudou', () => {
    const prefill = form({ fat_gerado: '1817', manual_gmv: '1817' })
    const atual = form({ fat_gerado: '2419', manual_gmv: '2419' })
    expect(montarCamposNumericos(atual, prefill)).toEqual({ fat_gerado: 2419, manual_gmv: 2419 })
  })

  it('editar só "GMV faturado" também atualiza manual_gmv — senão a tela não muda', () => {
    // O backend exibe COALESCE(ads_gmv, manual_gmv, fat_gerado): manual_gmv ganha de
    // fat_gerado. Sem o espelho, gravar só fat_gerado some da tela. Pego clicando.
    const prefill = form({ fat_gerado: '2135', manual_gmv: '2135' })
    const atual = form({ fat_gerado: '7777', manual_gmv: '2135' })
    expect(montarCamposNumericos(atual, prefill)).toEqual({ fat_gerado: 7777, manual_gmv: 7777 })
  })

  it('editar só "GMV manual" espelha no outro sentido', () => {
    const prefill = form({ fat_gerado: '2135', manual_gmv: '2135' })
    const atual = form({ fat_gerado: '2135', manual_gmv: '900' })
    expect(montarCamposNumericos(atual, prefill)).toEqual({ fat_gerado: 900, manual_gmv: 900 })
  })

  it('se o usuário digitou valores diferentes nos dois, respeita cada um', () => {
    const prefill = form({ fat_gerado: '100', manual_gmv: '100' })
    const atual = form({ fat_gerado: '200', manual_gmv: '300' })
    expect(montarCamposNumericos(atual, prefill)).toEqual({ fat_gerado: 200, manual_gmv: 300 })
  })

  it('preserva centavos no GMV — 1432,5 não pode virar 1433', () => {
    const prefill = form({ fat_gerado: '1433' })
    const atual = form({ fat_gerado: '1432.5' })
    expect(montarCamposNumericos(atual, prefill).fat_gerado).toBe(1432.5)
  })

  it('trunca os contadores, que são inteiros', () => {
    const prefill = form({ manual_likes: '10' })
    const atual = form({ manual_likes: '10.9' })
    expect(montarCamposNumericos(atual, prefill).manual_likes).toBe(10)
  })

  it('só o campo alterado entra no payload, mesmo com vários preenchidos', () => {
    const prefill = form({ fat_gerado: '500', manual_gmv: '500', manual_likes: '10', manual_views: '99' })
    const atual = form({ fat_gerado: '500', manual_gmv: '500', manual_likes: '42', manual_views: '99' })
    expect(montarCamposNumericos(atual, prefill)).toEqual({ manual_likes: 42 })
  })

  it('campo esvaziado continua sendo ignorado (não vira 0 acidental)', () => {
    // Comportamento preservado de propósito: não dá para zerar o GMV por aqui. Enviar 0
    // travaria o COALESCE do backend em zero em vez de cair para a próxima coluna.
    const prefill = form({ fat_gerado: '1817' })
    const atual = form({ fat_gerado: '' })
    expect(montarCamposNumericos(atual, prefill)).toEqual({})
  })
})
