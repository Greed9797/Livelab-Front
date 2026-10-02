import { AxiosError, AxiosHeaders } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getCadastros, isEndpointCadastrosAusente, promoverCadastroACliente, resetCadastrosEndpointCache } from './cadastros'
import { apiGet, apiPost } from './api'

vi.mock('./api', () => ({
  apiDelete: vi.fn(),
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
}))

function httpError(status: number) {
  const headers = new AxiosHeaders()
  return new AxiosError('erro', String(status), { headers }, undefined, { status, statusText: '', data: {}, headers, config: { headers } })
}

const clientes = [{ id: 'c1', nome: 'Aurora', status: 'ativo' }]
const marcas = [
  { id: 'm1', cliente_id: 'c1', nome: 'Aurora', status: 'ativa', tipo: 'cliente' },
  { id: 'm2', nome: 'Farol', status: 'ativa', tipo: 'afiliada' },
]

function mockLegado() {
  vi.mocked(apiGet).mockImplementation(async (path: string, params?: Record<string, unknown>) => {
    if (path === '/clientes') return params?.status === 'arquivado' ? [{ id: 'c9', nome: 'Cedro', status: 'arquivado' }] : clientes
    if (path === '/marcas') return marcas
    throw httpError(404)
  })
}

describe('getCadastros — flag e fallback', () => {
  beforeEach(() => {
    vi.mocked(apiGet).mockReset()
    vi.mocked(apiPost).mockReset()
    resetCadastrosEndpointCache()
  })
  afterEach(() => vi.unstubAllEnvs())

  it('flag desligada (padrão): usa só /clientes + /marcas, nunca /cadastros', async () => {
    vi.stubEnv('VITE_CADASTRO_UNIFICADO', 'false')
    mockLegado()
    const r = await getCadastros()
    expect(r.fonte).toBe('legado')
    expect(r.cadastros.map((c) => c.id)).toEqual(['m1', 'm2'])
    expect(vi.mocked(apiGet).mock.calls.map((c) => c[0])).not.toContain('/cadastros')
    expect(apiGet).toHaveBeenCalledWith('/marcas', { status: 'ativa' })
  })

  it('flag "0" também desliga', async () => {
    vi.stubEnv('VITE_CADASTRO_UNIFICADO', '0')
    mockLegado()
    expect((await getCadastros()).fonte).toBe('legado')
  })

  it('flag ligada: lê /v1/cadastros e normaliza', async () => {
    vi.stubEnv('VITE_CADASTRO_UNIFICADO', 'true')
    vi.mocked(apiGet).mockResolvedValue({ data: [{ id: 'm2', marca_id: 'm2', nome: 'Farol', tipo: 'afiliada', gera_receita: false }] })
    const r = await getCadastros({ incluirInativos: true })
    expect(r.fonte).toBe('cadastros')
    expect(r.cadastros[0]).toMatchObject({ id: 'm2', tipo: 'afiliada', gera_receita: false })
    expect(apiGet).toHaveBeenCalledWith('/cadastros', { status: 'all' })
  })

  it('flag ligada + 404 (backend antigo): cai na junção e não tenta de novo na sessão', async () => {
    vi.stubEnv('VITE_CADASTRO_UNIFICADO', 'true')
    mockLegado()
    const r = await getCadastros({ incluirInativos: true })
    expect(r.fonte).toBe('legado')
    expect(r.cadastros.map((c) => c.nome)).toEqual(['Aurora', 'Cedro', 'Farol'])
    expect(apiGet).toHaveBeenCalledWith('/clientes', { status: 'arquivado' })
    vi.mocked(apiGet).mockClear()
    await getCadastros()
    expect(vi.mocked(apiGet).mock.calls.map((c) => c[0])).not.toContain('/cadastros')
  })

  it('flag ligada + corpo em formato desconhecido: cai na junção', async () => {
    vi.stubEnv('VITE_CADASTRO_UNIFICADO', 'true')
    vi.mocked(apiGet).mockImplementation(async (path: string) => {
      if (path === '/cadastros') return '<html>'
      if (path === '/clientes') return clientes
      return marcas
    })
    expect((await getCadastros()).fonte).toBe('legado')
  })

  it('flag ligada + erro real (500/403) sobe para a tela mostrar o erro', async () => {
    vi.stubEnv('VITE_CADASTRO_UNIFICADO', 'true')
    vi.mocked(apiGet).mockRejectedValue(httpError(500))
    await expect(getCadastros()).rejects.toBeInstanceOf(AxiosError)
    expect(isEndpointCadastrosAusente(httpError(403))).toBe(false)
    expect(isEndpointCadastrosAusente(httpError(405))).toBe(true)
    expect(isEndpointCadastrosAusente(new Error('x'))).toBe(false)
  })

  it('promover chama a rota nova', async () => {
    vi.mocked(apiPost).mockResolvedValue({ id: 'm2' })
    await promoverCadastroACliente('m2')
    expect(apiPost).toHaveBeenCalledWith('/cadastros/m2/promover-cliente', {})
  })
})
