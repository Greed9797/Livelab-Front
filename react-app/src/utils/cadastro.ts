// Cadastro unificado (marca + ficha opcional do cliente) — helpers puros, sem rede.
// O backend de /v1/cadastros é construído em paralelo: o normalizador aceita campos
// faltantes, números como string, envelopes `{ data }` e também os formatos atuais de
// /clientes e /marcas, para que a mesma tela funcione com o backend novo ou o antigo.
import type { Cadastro, CadastroFicha, CadastroTipo } from '../types/cadastro'
import { CADASTRO_TIPOS } from '../types/cadastro'
import type { JsonRecord } from '../types/models'
import { resolverMarcaPrincipal } from './carteira'

type Raw = Record<string, unknown>

function rec(v: unknown): Raw | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : null
}

function str(v: unknown): string | null {
  if (typeof v === 'string' && v.trim()) return v.trim()
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return null
}

function num(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function bool(v: unknown): boolean | null {
  if (v === true || v === 'true' || v === 1 || v === '1' || v === 't') return true
  if (v === false || v === 'false' || v === 0 || v === '0' || v === 'f') return false
  return null
}

function lista(v: unknown): JsonRecord[] {
  return Array.isArray(v) ? v.filter((item): item is JsonRecord => rec(item) !== null) : []
}

// ── Flag ─────────────────────────────────────────────────────────────────────

/**
 * VITE_CADASTRO_UNIFICADO: ligada SOMENTE quando o valor é 'true'. Ausente, vazio,
 * 'false' ou '0' = desligada (junção legada /clientes + /marcas).
 */
export function cadastroUnificadoHabilitado(valor: unknown = import.meta.env.VITE_CADASTRO_UNIFICADO): boolean {
  return typeof valor === 'string' && valor.trim().toLowerCase() === 'true'
}

// ── Tipo / receita ───────────────────────────────────────────────────────────

export function normalizarTipoCadastro(v: unknown, fallback: CadastroTipo = 'cliente'): CadastroTipo {
  const s = str(v)?.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') ?? ''
  if (s === 'cliente_ecommerce') return 'cliente'
  if (s === 'afiliado') return 'afiliada'
  if (s === 'parceiro') return 'parceira'
  return (CADASTRO_TIPOS as readonly string[]).includes(s) ? (s as CadastroTipo) : fallback
}

/** Espelha marcaGeraReceitaSql do backend: tipo cliente e não-sistema. */
export function calcularGeraReceita(tipo: CadastroTipo, sistema: boolean): boolean {
  return tipo === 'cliente' && !sistema
}

const TIPO_LABEL: Record<CadastroTipo, string> = {
  cliente: 'Cliente',
  afiliada: 'Afiliada',
  propria: 'Marca própria',
  parceira: 'Parceira',
}

export function tipoCadastroLabel(tipo: unknown): string {
  return TIPO_LABEL[normalizarTipoCadastro(tipo)] ?? 'Cliente'
}

/** Marca não-cliente (ou cliente sem ficha) pode ser promovida; marca de sistema nunca. */
export function podePromoverACliente(c: Pick<Cadastro, 'tipo' | 'cliente_id' | 'sistema' | 'marca_id'>): boolean {
  if (c.sistema || !c.marca_id) return false
  return c.tipo !== 'cliente' || !c.cliente_id
}

// ── Normalização ─────────────────────────────────────────────────────────────

function normalizarFicha(raw: Raw): CadastroFicha {
  // Novo formato: { ficha: {...} }. Formatos atuais: campos soltos no registro.
  const f = rec(raw.ficha) ?? raw
  return {
    celular: str(f.celular) ?? str(f.whatsapp) ?? str(raw.celular),
    email: str(f.email) ?? str(raw.email),
    cnpj: str(f.cnpj) ?? str(raw.cnpj),
    razao_social: str(f.razao_social) ?? str(raw.razao_social),
    gateway_customer_id: str(f.gateway_customer_id) ?? str(raw.gateway_customer_id),
    acesso_email: str(f.acesso_email) ?? str(raw.acesso_email),
  }
}

function gmvDoMes(raw: Raw): number {
  const metrics = rec(raw.metrics) ?? {}
  return num(raw.gmv_mes ?? raw.gmv_mes_atual ?? raw.gmv ?? metrics.gmv_mes)
}

/**
 * Item de /v1/cadastros (ou registro atual de /marcas) → Cadastro.
 * Devolve null quando não há como identificar o cadastro.
 */
export function normalizarCadastro(input: unknown): Cadastro | null {
  const raw = rec(input)
  if (!raw) return null
  const marca_id = str(raw.marca_id) ?? str(raw.id)
  const cliente_id = str(raw.cliente_id)
  const id = marca_id ?? cliente_id
  if (!id) return null
  const tipo = normalizarTipoCadastro(raw.tipo ?? raw.marca_tipo, 'cliente')
  const sistema = bool(raw.sistema) ?? false
  const ficha = normalizarFicha(raw)
  const geraReceita = bool(raw.gera_receita)
  const fichaRaw = rec(raw.ficha) ?? {}
  return {
    id,
    marca_id,
    cliente_id,
    nome: str(raw.nome) ?? str(raw.marca_nome) ?? str(raw.cliente_nome) ?? 'Sem nome',
    marca_nome: str(raw.marca_nome) ?? str(raw.nome),
    tipo,
    sistema,
    gera_receita: geraReceita ?? calcularGeraReceita(tipo, sistema),
    status_operacional: str(raw.status_operacional) ?? str(raw.status) ?? 'ativa',
    status_comercial: str(raw.status_comercial) ?? str(raw.cliente_status) ?? str(fichaRaw.status),
    ficha,
    logo_url: str(raw.logo_url),
    cor: str(raw.cor),
    tiktok_username: str(raw.tiktok_username),
    configuracao_comercial: rec(raw.configuracao_comercial),
    apresentadoras: lista(raw.apresentadoras),
    gmv_mes: gmvDoMes(raw),
    lives_mes: num(raw.lives_mes),
    videos_mes: num(raw.videos_mes ?? raw.quantidade_videos),
    origem_dados: str(raw.origem_dados),
    marcas_vinculadas: [],
    raw,
  }
}

/**
 * Corpo de GET /v1/cadastros → lista. Aceita array, `{ data }`, `{ cadastros }` ou `{ items }`.
 * Devolve null se o formato não for reconhecido (o chamador cai na junção legada).
 */
export function normalizarListaCadastros(payload: unknown): Cadastro[] | null {
  const envelope = rec(payload)
  const itens = Array.isArray(payload)
    ? payload
    : envelope
      ? [envelope.data, envelope.cadastros, envelope.items].find(Array.isArray)
      : undefined
  if (!Array.isArray(itens)) return null
  return itens.map(normalizarCadastro).filter((c): c is Cadastro => c !== null)
}

/** Registro atual de /clientes (+ marcas da ficha) → Cadastro, igual à carteira de hoje. */
export function cadastroDeClienteLegado(cliente: JsonRecord, marcasDoCliente: JsonRecord[]): Cadastro | null {
  const clienteId = str(cliente.id)
  if (!clienteId) return null
  const principal = resolverMarcaPrincipal(marcasDoCliente, cliente.nome)
  const marcaId = str(principal?.id)
  const sistema = bool(principal?.sistema) ?? false
  return {
    id: marcaId ?? clienteId,
    marca_id: marcaId,
    cliente_id: clienteId,
    nome: str(cliente.nome) ?? str(cliente.razao_social) ?? 'Sem nome',
    marca_nome: str(principal?.nome) ?? str(cliente.nome),
    tipo: 'cliente',
    sistema,
    gera_receita: bool(principal?.gera_receita) ?? calcularGeraReceita('cliente', sistema),
    status_operacional: str(principal?.status) ?? str(cliente.status) ?? 'ativo',
    status_comercial: str(cliente.status),
    ficha: normalizarFicha(cliente),
    logo_url: str(cliente.logo_url) ?? str(principal?.logo_url),
    cor: str(principal?.cor),
    tiktok_username: str(principal?.tiktok_username) ?? str(cliente.tiktok_username),
    configuracao_comercial: rec(principal?.configuracao_comercial),
    apresentadoras: lista(principal?.apresentadoras),
    gmv_mes: gmvDoMes(cliente),
    lives_mes: num(cliente.lives_mes),
    videos_mes: num(cliente.videos_mes ?? cliente.quantidade_videos),
    origem_dados: str(cliente.origem_dados),
    marcas_vinculadas: marcasDoCliente,
    raw: cliente,
  }
}

/**
 * Junção legada: um cadastro por cliente (com sua marca principal) + um por marca sem
 * cliente. Marcas extras de um cliente continuam escondidas atrás dele (comportamento atual).
 */
export function juntarCadastrosLegado(clientes: JsonRecord[], marcas: JsonRecord[]): Cadastro[] {
  const marcasPorCliente = new Map<string, JsonRecord[]>()
  for (const marca of marcas) {
    const clienteId = str(marca.cliente_id)
    if (!clienteId) continue
    marcasPorCliente.set(clienteId, [...(marcasPorCliente.get(clienteId) ?? []), marca])
  }
  const doCliente = clientes
    .map((cliente) => cadastroDeClienteLegado(cliente, marcasPorCliente.get(str(cliente.id) ?? '') ?? []))
    .filter((c): c is Cadastro => c !== null)
  const semCliente = marcas
    .filter((marca) => !str(marca.cliente_id))
    .map(normalizarCadastro)
    .filter((c): c is Cadastro => c !== null)
  return [...doCliente, ...semCliente]
}

// ── Linha da carteira (ComercialPage) ────────────────────────────────────────

/**
 * Cadastro com ficha que abre o modal de cliente (id = cliente_id). Quando a mesma ficha
 * tem várias marcas, só a principal abre como cliente; as demais abrem como marca.
 */
function principaisPorCliente(cadastros: Cadastro[]): Set<Cadastro> {
  const porCliente = new Map<string, Cadastro[]>()
  for (const c of cadastros) {
    if (!c.cliente_id || c.tipo !== 'cliente') continue
    porCliente.set(c.cliente_id, [...(porCliente.get(c.cliente_id) ?? []), c])
  }
  const principais = new Set<Cadastro>()
  for (const grupo of porCliente.values()) {
    const principal = grupo.length === 1
      ? grupo[0]
      : grupo.find((c) => str(c.raw.cliente_nome)?.toLowerCase() === c.nome.trim().toLowerCase()) ?? grupo[0]
    principais.add(principal)
  }
  return principais
}

function marcaSintetica(c: Cadastro): JsonRecord[] {
  if (c.marcas_vinculadas.length) return c.marcas_vinculadas
  if (!c.marca_id) return []
  return [{
    id: c.marca_id,
    nome: c.marca_nome ?? c.nome,
    tipo: c.tipo,
    cliente_id: c.cliente_id,
    status: c.status_operacional,
    cor: c.cor,
    sistema: c.sistema,
    configuracao_comercial: c.configuracao_comercial,
    apresentadoras: c.apresentadoras,
  }]
}

/**
 * Cadastro → registro no formato que a ComercialPage já usa (tipo_operacional
 * 'cliente_ecommerce' com id do cliente, ou marca com id da marca), mais os campos
 * do cadastro unificado (cadastro_tipo, gera_receita, sistema).
 */
export function cadastroParaLinhaCarteira(c: Cadastro, abreComoCliente: boolean): JsonRecord {
  const comum = {
    cadastro: c,
    cadastro_tipo: c.tipo,
    gera_receita: c.gera_receita,
    sistema: c.sistema,
    cadastro_marca_id: c.marca_id,
    cadastro_cliente_id: c.cliente_id,
    gmv_mes: c.gmv_mes,
    lives_mes: c.lives_mes,
    videos_mes: c.videos_mes,
  }
  if (abreComoCliente && c.cliente_id) {
    return {
      ...c.raw,
      email: c.ficha.email ?? c.raw.email,
      celular: c.ficha.celular ?? c.raw.celular,
      acesso_email: c.ficha.acesso_email ?? c.raw.acesso_email,
      ...comum,
      id: c.cliente_id,
      nome: c.nome,
      status: c.status_comercial ?? c.status_operacional,
      logo_url: c.logo_url ?? c.raw.logo_url,
      tipo_entidade: 'cliente',
      tipo_operacional: 'cliente_ecommerce',
      marca_principal: c.marca_nome ?? c.nome,
      apresentadoras: c.apresentadoras,
      // cor vive na marca; o seed do hash precisa ser o id da MARCA (é o que a agenda usa).
      cor: c.cor ?? '',
      cor_seed_id: c.marca_id ?? c.cliente_id,
      marcas_operacionais: marcaSintetica(c),
      configuracao_comercial: c.configuracao_comercial,
    }
  }
  return {
    ...c.raw,
    ...comum,
    id: c.marca_id ?? c.id,
    nome: c.nome,
    status: c.status_operacional,
    tipo: c.tipo,
    cliente_id: c.cliente_id,
    logo_url: c.logo_url ?? c.raw.logo_url,
    cor: c.cor ?? c.raw.cor,
    tipo_entidade: 'marca',
    tipo_operacional: c.tipo,
    marca_principal: c.nome,
    configuracao_comercial: c.configuracao_comercial,
    apresentadoras: c.apresentadoras,
  }
}

export function cadastrosParaCarteira(cadastros: Cadastro[]): JsonRecord[] {
  const principais = principaisPorCliente(cadastros)
  return cadastros.map((c) => cadastroParaLinhaCarteira(c, principais.has(c) || (!c.marca_id && Boolean(c.cliente_id))))
}
