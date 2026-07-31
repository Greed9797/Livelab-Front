/**
 * Duração digitada à mão, em segundos.
 *
 * Quem preenche o rateio de uma live está olhando para "2h37m" na planilha e digitando rápido.
 * Forçar horas decimais (2.6167) seria fonte garantida de erro num campo que decide comissão,
 * então o parser aceita as formas que a pessoa realmente escreve:
 *
 *   "4"      → 4h        "4h"     → 4h        "4h30"  → 4h30
 *   "4:30"   → 4h30      "4h30m"  → 4h30      "90m"   → 1h30
 *   "4,5"    → 4h30      "4.5h"   → 4h30
 *
 * Devolve null quando não dá para interpretar — o chamador decide se isso bloqueia o salvamento.
 */
export function parseDuracao(input: string): number | null {
  const texto = input.trim().toLowerCase().replace(/\s+/g, '')
  if (!texto) return null

  // "4:30" / "4:30:00"
  const relogio = texto.match(/^(\d+):([0-5]?\d)(?::([0-5]?\d))?$/)
  if (relogio) {
    return Number(relogio[1]) * 3600 + Number(relogio[2]) * 60 + Number(relogio[3] ?? 0)
  }

  // "4,5h" / "4.5h" — horas decimais com a unidade junto. Vem antes das regras de unidade
  // porque "4.5h" não é "4h e 5min": o separador decimal muda o significado do número.
  const decimalComH = texto.match(/^(\d+[.,]\d+)h$/)
  if (decimalComH) return Math.round(Number(decimalComH[1].replace(',', '.')) * 3600)

  // "4h30m" / "4h30" / "4h" / "90m" / "45s"
  const comUnidade = texto.match(/^(?:(\d+)h)?(?:(\d+)m(?:in)?)?(?:(\d+)s)?$/)
  if (comUnidade && (comUnidade[1] || comUnidade[2] || comUnidade[3])) {
    return Number(comUnidade[1] ?? 0) * 3600 + Number(comUnidade[2] ?? 0) * 60 + Number(comUnidade[3] ?? 0)
  }
  const horaEMinuto = texto.match(/^(\d+)h(\d{1,2})$/)
  if (horaEMinuto) return Number(horaEMinuto[1]) * 3600 + Number(horaEMinuto[2]) * 60

  // "4,5" / "4.5" / "4" — horas decimais
  const decimal = texto.replace(',', '.')
  if (/^\d+(\.\d+)?$/.test(decimal)) return Math.round(Number(decimal) * 3600)

  return null
}

/** Segundos → "4h30" (o mesmo formato que parseDuracao aceita de volta). */
export function formatDuracao(segundos: number): string {
  const total = Math.max(0, Math.round(segundos))
  const horas = Math.floor(total / 3600)
  const minutos = Math.round((total % 3600) / 60)
  // 59min59s arredonda para 60 e viraria "4h60".
  if (minutos === 60) return `${horas + 1}h00`
  return `${horas}h${String(minutos).padStart(2, '0')}`
}

/** Rótulo curto para diferenças ("faltam 30min", "sobram 1h05"). */
export function formatDiferenca(segundos: number): string {
  const abs = Math.abs(Math.round(segundos))
  if (abs < 60) return `${abs}s`
  if (abs < 3600) return `${Math.round(abs / 60)}min`
  return formatDuracao(abs)
}
