import { useMemo } from 'react'

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  stroke?: string
}

let idCounter = 0

export function Sparkline({ data, width = 70, height = 24, stroke = 'var(--primary)' }: SparklineProps) {
  const id = useMemo(() => `spg-${++idCounter}`, [])

  const { line, area } = useMemo(() => {
    if (!data || data.length < 2) return { line: '', area: '' }
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const pts = data.map((v, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - 2 - ((v - min) / range) * (height - 4)
      return [x, y] as [number, number]
    })
    const linePath = pts.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(' ')
    const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`
    return { line: linePath, area: areaPath }
  }, [data, width, height])

  if (!line) return null

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
