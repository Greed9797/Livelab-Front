import { beforeEach, describe, expect, it, vi } from 'vitest'
import { consultarResultadoVersions } from './financeiro-resultado-versions'

const apiGet = vi.fn()
vi.mock('./api', () => ({ apiGet: (...args: unknown[]) => apiGet(...args) }))

beforeEach(() => apiGet.mockReset().mockResolvedValue({
  mes: '2026-09', estado: 'fechado', versao_atual: 2,
  versoes: [{ id: 'a', versao: 1, criado_em: '2026-10-01T12:00:00Z', snapshot: { caixa: { saldo_inicio_mes: 999 } } },
    { id: 'b', versao: 2, criado_em: '2026-10-06T12:00:00Z' }],
  eventos: [],
}))

describe('resultado versions service', () => {
  it('reads the existing monthly endpoint and exposes only version metadata', async () => {
    expect(await consultarResultadoVersions('2026-09')).toEqual({
      mes: '2026-09', estado: 'fechado', versao_atual: 2,
      versoes: [{ id: 'a', versao: 1, criado_em: '2026-10-01T12:00:00Z' },
        { id: 'b', versao: 2, criado_em: '2026-10-06T12:00:00Z' }],
    })
    expect(apiGet).toHaveBeenCalledWith('/financeiro/fechamentos/2026-09')
  })

  it('rejects invalid months and incomplete responses instead of showing an empty history', async () => {
    await expect(consultarResultadoVersions('2026-13')).rejects.toThrow('Competência inválida')
    expect(apiGet).not.toHaveBeenCalled()
    apiGet.mockResolvedValueOnce({ mes: '2026-09', estado: 'fechado', versao_atual: 1 })
    await expect(consultarResultadoVersions('2026-09')).rejects.toThrow('Resposta de fechamentos inválida')
  })
})
