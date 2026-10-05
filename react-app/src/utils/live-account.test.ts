import { describe, expect, it } from 'vitest'
import { buildLiveAccountOptions, liveAccountValue, marcaPrincipalDoCliente, resolveLiveAccountValue } from './live-account'
import { isOperationalBrand, isOperationalClient } from './operational-status'

const marcas = [
  { id: 'm-kids', cliente_id: 'c1', nome: 'Aurora Kids', status: 'ativa', tipo: 'afiliada' },
  { id: 'm1', cliente_id: 'c1', nome: 'Aurora', status: 'ativa', tipo: 'cliente' },
  { id: 'm2', nome: 'Farol', status: 'ativa', tipo: 'afiliada' },
  { id: 'm3', nome: 'Antiga', status: 'inativa', tipo: 'propria' },
]
const clientes = [
  { id: 'c1', nome: 'Aurora', status: 'ativo' },
  { id: 'c2', nome: 'Ficha sem marca', status: 'ativo' },
  { id: 'c3', nome: 'Cancelado', status: 'cancelado' },
]

describe('seletor de conta da live — cadastro unificado', () => {
  it('uma opção marca:<id> por cadastro; cliente com marca nunca aparece como cliente:<id>', () => {
    const options = buildLiveAccountOptions({ marcas, clientes, incluirMarca: isOperationalBrand, incluirCliente: isOperationalClient })
    expect(options.map((o) => o.value)).toEqual(['marca:m-kids', 'marca:m1', 'marca:m2', 'cliente:c2'])
    expect(options.map((o) => o.label)).toEqual(['Aurora Kids (afiliada)', 'Aurora', 'Farol (afiliada)', 'Ficha sem marca'])
    expect(options.filter((o) => o.label.includes('Aurora') && o.value.startsWith('cliente:'))).toEqual([])
  })

  it('ficha representada por marca histórica fora da lista não vira segunda opção', () => {
    const options = buildLiveAccountOptions({ marcas: [], clientes, incluirMarca: () => true, incluirCliente: isOperationalClient, ocultarClienteIds: ['c1'] })
    expect(options.map((o) => o.value)).toEqual(['cliente:c2'])
  })

  it('não duplica marca repetida na lista recebida', () => {
    const options = buildLiveAccountOptions({ marcas: [...marcas, marcas[1]], clientes: [], incluirMarca: () => true, incluirCliente: () => true })
    expect(options.filter((o) => o.value === 'marca:m1')).toHaveLength(1)
  })

  it('valor antigo cliente:<id> resolve para a marca principal (tipo cliente)', () => {
    expect(marcaPrincipalDoCliente('c1', marcas)?.id).toBe('m1')
    expect(liveAccountValue({ clienteId: 'c1' }, marcas)).toBe('marca:m1')
    expect(liveAccountValue({ marcaId: 'm2', clienteId: 'c1' }, marcas)).toBe('marca:m2')
    expect(liveAccountValue({ clienteId: 'c2' }, marcas)).toBe('cliente:c2')
    expect(liveAccountValue({}, marcas)).toBe('')
    expect(liveAccountValue(undefined, marcas)).toBe('')
  })

  it('resolveLiveAccountValue só troca pela marca se ela estiver entre as opções', () => {
    const options = [{ value: 'marca:m1', label: 'Aurora' }]
    expect(resolveLiveAccountValue({ marca_id: '', cliente_id: 'c1' }, marcas, options)).toBe('marca:m1')
    expect(resolveLiveAccountValue({ marca_id: '', cliente_id: 'c1' }, marcas, [])).toBe('cliente:c1')
    expect(resolveLiveAccountValue({ marca_id: 'm2', cliente_id: '' }, marcas, options)).toBe('marca:m2')
    expect(resolveLiveAccountValue({ marca_id: '', cliente_id: '' }, marcas, options)).toBe('')
  })
})
