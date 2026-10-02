// Fixture do cadastro unificado para os e2e. Rodar a suíte com a flag ligada:
//   VITE_CADASTRO_UNIFICADO=true npx playwright test ...
// O playwright.config repassa a variável ao Vite; sem ela a flag fica desligada.
type Row = Record<string, unknown>

export const cadastroUnificadoLigado = process.env.VITE_CADASTRO_UNIFICADO === 'true'

const ativoCliente = (status: unknown) => status === 'ativo' || status === 'inadimplente'

/**
 * Monta GET /v1/cadastros a partir das fixtures de /clientes e /marcas como o backend
 * faria (marcas LEFT JOIN clientes). Cliente sem marca ganha a marca espelho
 * (ensureClienteMarca), com id `espelho-<cliente_id>`.
 */
export function cadastrosDaFixture(clientes: Row[], marcas: Row[], opts: { incluirInativos?: boolean } = {}): Row[] {
  const marcasComEspelho = [...marcas]
  for (const cliente of clientes) {
    if (!marcas.some((m) => m.cliente_id === cliente.id)) {
      marcasComEspelho.push({ id: `espelho-${String(cliente.id)}`, cliente_id: cliente.id, nome: cliente.nome, tipo: 'cliente', status: ativoCliente(cliente.status) ? 'ativa' : 'inativa' })
    }
  }
  const itens = marcasComEspelho.map((m) => {
    const cliente = m.tipo === 'cliente' ? clientes.find((c) => c.id === m.cliente_id) : undefined
    const tipo = String(m.tipo ?? 'cliente')
    const sistema = m.sistema === true
    return {
      id: m.id,
      marca_id: m.id,
      cliente_id: cliente ? cliente.id : null,
      nome: cliente ? cliente.nome : m.nome,
      tipo,
      sistema,
      gera_receita: tipo === 'cliente' && !sistema,
      status_operacional: m.status,
      status_comercial: cliente ? cliente.status : null,
      ficha: cliente ? { celular: cliente.celular ?? null, email: cliente.email ?? null } : {},
      logo_url: m.logo_url ?? cliente?.logo_url ?? null,
      cor: m.cor ?? null,
      configuracao_comercial: m.configuracao_comercial ?? null,
      apresentadoras: [],
      gmv_mes: 0,
    }
  })
  if (opts.incluirInativos) return itens
  return itens.filter((c) => (c.status_comercial ? ativoCliente(c.status_comercial) : c.status_operacional === 'ativa'))
}
