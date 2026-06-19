import clsx from 'clsx'
import type { ReactNode } from 'react'
import type { TableColumn } from '../../types/models'
import { EmptyState } from './States'

export function DataTable<T extends object>({
  columns,
  data,
  rowKey,
  onRowClick,
  footer,
}: {
  columns: TableColumn<T>[]
  data: T[]
  rowKey?: (item: T, index: number) => string | number
  /** Quando definido, a linha inteira vira um alvo clicável (drill-down de entidade). */
  onRowClick?: (item: T, index: number) => void
  /** Rodapé livre dentro do mesmo cartão da tabela — usado para linhas de total. */
  footer?: ReactNode
}) {
  if (data.length === 0) return <EmptyState />

  const clickable = Boolean(onRowClick)

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface scrollbar-thin">
      <table className="min-w-full divide-y divide-line text-left text-sm">
        <thead className="bg-surface-muted/70 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={clsx(
                  'whitespace-nowrap px-4 py-3.5',
                  column.align === 'right' && 'text-right',
                  column.align === 'center' && 'text-center',
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {data.map((item, index) => (
            <tr
              key={rowKey ? rowKey(item, index) : index}
              className={clsx(
                'transition hover:bg-surface-muted/70',
                clickable && 'cursor-pointer focus:bg-surface-muted/70 focus:outline-none',
              )}
              {...(clickable
                ? {
                    role: 'button',
                    tabIndex: 0,
                    'aria-label': 'Abrir detalhes',
                    onClick: () => onRowClick?.(item, index),
                    onKeyDown: (event: React.KeyboardEvent<HTMLTableRowElement>) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onRowClick?.(item, index)
                      }
                    },
                  }
                : {})}
            >
              {columns.map((column) => (
                <td
                  key={String(column.key)}
                  className={clsx(
                    'px-4 py-4 text-ink',
                    column.align === 'right' && 'text-right',
                    column.align === 'center' && 'text-center',
                  )}
                >
                  {column.render ? column.render(item) : String((item as Record<string, unknown>)[String(column.key)] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {footer ? <div className="border-t border-line px-4 py-3">{footer}</div> : null}
    </div>
  )
}
