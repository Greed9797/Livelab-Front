export function pluralizePt(count: number, singular: string, plural: string) {
  return `${count.toLocaleString('pt-BR')} ${count === 1 ? singular : plural}`
}

export function liveCountLabel(count: number) {
  return pluralizePt(count, 'live realizada', 'lives realizadas')
}

export function cabineCountLabel(count: number) {
  return pluralizePt(count, 'cabine operacional', 'cabines operacionais')
}
