import type { JsonRecord } from '../../types/models'
import { asNumber, formatMoney } from '../../utils/format'
import { officialLiveGmv } from '../../utils/live-gmv'
import { calcDuration } from './live-helpers'

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/
const SAO_PAULO_TZ = 'America/Sao_Paulo'

export function formatMinsToHours(mins: number): string {
  const mTotal = Math.max(0, Math.round(mins))
  const h = Math.floor(mTotal / 60)
  const m = mTotal % 60
  return `${h}h ${String(m).padStart(2, '0')}min`
}

export function formatDayLabel(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(DATE_ONLY_RE.test(String(dateStr)) ? `${dateStr}T12:00:00-03:00` : dateStr)
  if (Number.isNaN(d.getTime())) return String(dateStr)

  const weekdayStr = new Intl.DateTimeFormat('pt-BR', {
    timeZone: SAO_PAULO_TZ,
    weekday: 'long',
  }).format(d)

  const dateFormatted = new Intl.DateTimeFormat('pt-BR', {
    timeZone: SAO_PAULO_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)

  const weekdayCapitalized = weekdayStr.charAt(0).toUpperCase() + weekdayStr.slice(1)
  return `${weekdayCapitalized}, ${dateFormatted}`
}

export function formatTimestampLabel(date: Date = new Date()): string {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''

  const dateParts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: SAO_PAULO_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)

  return dateParts.replace(', ', ' às ')
}

export interface ResumoMarcaItem {
  marca_id: string | null
  nome: string
  gmv: number
  pedidos: number
  minutos: number
  horas_formatadas: string
  gmv_por_hora: number
  lives_count: number
}

export interface ResumoApresentadoraItem {
  apresentadora_id: string | null
  nome: string
  gmv: number
  minutos: number
  horas_formatadas: string
  gmv_por_hora: number
  lives_count: number
}

export function buildClientResumoDiaText(
  lives: JsonRecord[],
  dateKey: string,
  now: Date = new Date(),
): string {
  const totalLives = lives.length
  let totalGmv = 0
  let totalPedidos = 0
  let totalMinutos = 0

  const marcasMap = new Map<string, ResumoMarcaItem>()
  const apresentadorasMap = new Map<string, ResumoApresentadoraItem>()

  for (const live of lives) {
    const liveGmv = asNumber(officialLiveGmv(live))
    const livePedidos = asNumber(live.pedidos ?? live.manual_orders ?? live.final_orders_count ?? live.qtd_pedidos)
    const { mins: liveMins } = calcDuration(live)

    totalGmv += liveGmv
    totalPedidos += livePedidos
    totalMinutos += liveMins

    // Marca
    const marcaNome = (live.marca_nome ?? live.cliente_nome ?? 'Sem marca').toString().trim()
    const marcaKey = marcaNome.toLowerCase()
    if (!marcasMap.has(marcaKey)) {
      marcasMap.set(marcaKey, {
        marca_id: (live.marca_id as string) || null,
        nome: marcaNome,
        gmv: 0,
        pedidos: 0,
        minutos: 0,
        horas_formatadas: '',
        gmv_por_hora: 0,
        lives_count: 0,
      })
    }
    const marcaObj = marcasMap.get(marcaKey)!
    marcaObj.gmv += liveGmv
    marcaObj.pedidos += livePedidos
    marcaObj.minutos += liveMins
    marcaObj.lives_count += 1

    // Apresentadoras
    const rateio = Array.isArray(live.apresentadoras) ? live.apresentadoras : []
    if (rateio.length > 0) {
      for (const p of rateio) {
        if (!p || typeof p !== 'object') continue
        const pRecord = p as JsonRecord
        const pNome = (pRecord.nome ?? 'Sem apresentadora').toString().trim()
        const pKey = pNome.toLowerCase()
        if (!apresentadorasMap.has(pKey)) {
          apresentadorasMap.set(pKey, {
            apresentadora_id: (pRecord.apresentadora_id as string) || null,
            nome: pNome,
            gmv: 0,
            minutos: 0,
            horas_formatadas: '',
            gmv_por_hora: 0,
            lives_count: 0,
          })
        }
        const apObj = apresentadorasMap.get(pKey)!

        let pGmv = 0
        if (pRecord.gmv != null) {
          pGmv = asNumber(pRecord.gmv)
        } else if (pRecord.percentual != null) {
          pGmv = (liveGmv * asNumber(pRecord.percentual)) / 100
        } else if (pRecord.papel === 'principal') {
          pGmv = liveGmv
        }

        let pMins = 0
        if (pRecord.segundos != null && asNumber(pRecord.segundos) > 0) {
          pMins = Math.round(asNumber(pRecord.segundos) / 60)
        } else if (pRecord.percentual != null) {
          pMins = Math.round((liveMins * asNumber(pRecord.percentual)) / 100)
        } else if (pRecord.papel === 'principal') {
          pMins = liveMins
        }

        apObj.gmv += pGmv
        apObj.minutos += pMins
        apObj.lives_count += 1
      }
    } else {
      const pNome = (live.apresentadora_nome ?? live.apresentador_nome ?? 'Sem apresentadora').toString().trim()
      const pKey = pNome.toLowerCase()
      if (!apresentadorasMap.has(pKey)) {
        apresentadorasMap.set(pKey, {
          apresentadora_id: (live.apresentadora_id as string) || null,
          nome: pNome,
          gmv: 0,
          minutos: 0,
          horas_formatadas: '',
          gmv_por_hora: 0,
          lives_count: 0,
        })
      }
      const apObj = apresentadorasMap.get(pKey)!
      apObj.gmv += liveGmv
      apObj.minutos += liveMins
      apObj.lives_count += 1
    }
  }

  const totalHoras = totalMinutos / 60
  const totalGmvPorHora = totalHoras > 0 ? totalGmv / totalHoras : 0

  const marcas = [...marcasMap.values()]
    .map((m) => {
      const horas = m.minutos / 60
      const gmvPorHora = horas > 0 ? m.gmv / horas : 0
      return {
        ...m,
        horas_formatadas: formatMinsToHours(m.minutos),
        gmv_por_hora: gmvPorHora,
      }
    })
    .sort((a, b) => b.gmv - a.gmv || b.minutos - a.minutos || a.nome.localeCompare(b.nome))

  const apresentadoras = [...apresentadorasMap.values()]
    .map((a) => {
      const horas = a.minutos / 60
      const gmvPorHora = horas > 0 ? a.gmv / horas : 0
      return {
        ...a,
        horas_formatadas: formatMinsToHours(a.minutos),
        gmv_por_hora: gmvPorHora,
      }
    })
    .sort((a, b) => b.gmv - a.gmv || b.minutos - a.minutos || a.nome.localeCompare(b.nome))

  const dateFormatted = formatDayLabel(dateKey)
  const timestampFormatted = formatTimestampLabel(now)

  const separator = '━━━━━━━━━━━━━━━━━━━━'
  const lines: string[] = [
    '📊 *RESUMO DO DIA — LIVES*',
    `📅 *Data:* ${dateFormatted}`,
    `🕒 *Consolidado em:* ${timestampFormatted}`,
    '',
    separator,
    '📈 *TOTAIS DO DIA*',
  ]

  if (totalLives === 0) {
    lines.push('Nenhuma live registrada neste dia.')
    lines.push(separator)
  } else {
    lines.push(`💰 *GMV Total:* ${formatMoney(totalGmv)}`)
    lines.push(`⚡ *GMV/h:* ${formatMoney(totalGmvPorHora)}/h`)
    lines.push(`🛒 *Vendas:* ${totalPedidos} ${totalPedidos === 1 ? 'pedido' : 'pedidos'}`)
    lines.push(`⏱️ *Tempo no Ar:* ${formatMinsToHours(totalMinutos)} (${totalLives} ${totalLives === 1 ? 'live' : 'lives'})`)
    lines.push('')

    lines.push(separator)
    lines.push('🏷️ *POR MARCA*')
    for (const m of marcas) {
      lines.push(`*${m.nome}*`)
      const pedidosStr = `${m.pedidos} ${m.pedidos === 1 ? 'pedido' : 'pedidos'}`
      lines.push(`${formatMoney(m.gmv)} · ${m.horas_formatadas} · ${formatMoney(m.gmv_por_hora)}/h · ${pedidosStr}`)
      lines.push('')
    }
    if (lines[lines.length - 1] === '') lines.pop()

    lines.push(separator)
    lines.push('🎤 *POR APRESENTADORA*')
    for (const a of apresentadoras) {
      lines.push(`*${a.nome}*`)
      lines.push(`${formatMoney(a.gmv)} · ${a.horas_formatadas} · ${formatMoney(a.gmv_por_hora)}/h`)
      lines.push('')
    }
    if (lines[lines.length - 1] === '') lines.pop()
    lines.push(separator)
  }

  return lines.join('\n')
}
