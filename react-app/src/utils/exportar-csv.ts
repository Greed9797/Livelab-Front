import type { Lancamento } from '../types/financeiro'
import { formatDataBR } from './caixa'
import { grupoLabel, origemLabel, statusLabel } from './financeiro'
import { formatBRLWithoutSymbol } from './money'

export const CSV_BOM = '\uFEFF'
const SEPARADOR = ';'

export type CsvColuna<T> = {
  chave: string
  cabecalho: string
  monetario?: boolean
  valor?: (linha: T) => unknown
}

function escaparCampo(texto: string): string {
  if (/["\n\r;,]/.test(texto)) return `"${texto.replace(/"/g, '""')}"`
  return texto
}

function celula(valor: unknown, monetario?: boolean): string {
  if (monetario) return escaparCampo(formatBRLWithoutSymbol(valor))
  if (valor == null) return ''
  return escaparCampo(String(valor))
}

export function gerarCsv<T>(linhas: T[], colunas: CsvColuna<T>[]): string {
  const cabecalho = colunas.map((coluna) => escaparCampo(coluna.cabecalho)).join(SEPARADOR)
  const corpo = linhas.map((linha) => colunas
    .map((coluna) => {
      const bruto = coluna.valor ? coluna.valor(linha) : (linha as Record<string, unknown>)[coluna.chave]
      return celula(bruto, coluna.monetario)
    })
    .join(SEPARADOR))
  return `${CSV_BOM}${[cabecalho, ...corpo].join('\n')}`
}

const COLUNAS_LANCAMENTOS: CsvColuna<Lancamento>[] = [
  { chave: 'data_vencimento', cabecalho: 'Data vencimento', valor: (l) => formatDataBR(l.data_vencimento) },
  { chave: 'descricao', cabecalho: 'Descrição' },
  { chave: 'natureza', cabecalho: 'Natureza', valor: (l) => (l.natureza === 'receita' ? 'Entrada' : 'Saída') },
  { chave: 'origem', cabecalho: 'Origem', valor: (l) => origemLabel(l) },
  { chave: 'status', cabecalho: 'Status', valor: (l) => statusLabel(l.status, l.natureza) },
  { chave: 'grupo', cabecalho: 'Grupo', valor: (l) => grupoLabel(l.grupo) },
  { chave: 'marca_nome', cabecalho: 'Marca', valor: (l) => l.marca_nome ?? '' },
  { chave: 'cliente_nome', cabecalho: 'Cliente', valor: (l) => l.cliente_nome ?? '' },
  { chave: 'valor_previsto', cabecalho: 'Valor previsto', monetario: true },
  { chave: 'valor_pago', cabecalho: 'Valor pago', monetario: true },
  { chave: 'data_pagamento', cabecalho: 'Data pagamento', valor: (l) => formatDataBR(l.data_pagamento) },
  { chave: 'observacao', cabecalho: 'Observação', valor: (l) => l.observacao ?? '' },
  {
    chave: 'parcela',
    cabecalho: 'Parcela',
    valor: (l) => (l.parcela_num && l.parcelas_total ? `${l.parcela_num}/${l.parcelas_total}` : ''),
  },
]

export function csvLancamentos(itens: Lancamento[]): string {
  return gerarCsv(itens, COLUNAS_LANCAMENTOS)
}

export function exportarLancamentosCsv(itens: Lancamento[], nomeArquivo = 'lancamentos.csv'): void {
  const blob = new Blob([csvLancamentos(itens)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
