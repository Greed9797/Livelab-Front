// Wrapper lazy de Charts.impl.tsx — Recharts (~113K gzip) só baixa quando
// primeiro gráfico aparece. Páginas sem gráfico (Cabines, Conteúdo tabs
// sem analytics) nunca pagam o custo.
//
// API permanece idêntica: import { AreaPanel, BarPanel, LinePanel, DonutPanel } from '.../Charts'.

import { lazy, Suspense, type ComponentType } from 'react'
import type { ChartPoint } from '../../types/models'
import { Card, CardBody, CardHeader } from '../ui/Card'

type PanelProps = { title: string; subtitle?: string; data: ChartPoint[]; secondary?: boolean }

function ChartFallback({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Card>
      <CardHeader>
        <p className="text-base font-bold tracking-[-0.01em] text-ink">{title}</p>
        {subtitle ? <p className="mt-1 text-xs text-ink-muted">{subtitle}</p> : null}
      </CardHeader>
      <CardBody>
        <div className="h-64 animate-pulse rounded-xl bg-surface-muted" />
      </CardBody>
    </Card>
  )
}

function makePanel(name: 'AreaPanel' | 'BarPanel' | 'LinePanel' | 'DonutPanel') {
  return function LazyPanel(props: PanelProps) {
    // Re-import named export via wrapper component
    const Inner = lazy(async () => {
      const mod = await import('./Charts.impl')
      const C = mod[name] as ComponentType<PanelProps>
      return { default: C }
    })
    return (
      <Suspense fallback={<ChartFallback title={props.title} subtitle={props.subtitle} />}>
        <Inner {...props} />
      </Suspense>
    )
  }
}

export const AreaPanel = makePanel('AreaPanel')
export const BarPanel = makePanel('BarPanel')
export const LinePanel = makePanel('LinePanel')
export const DonutPanel = makePanel('DonutPanel')

