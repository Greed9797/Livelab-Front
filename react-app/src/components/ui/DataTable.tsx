import clsx from 'clsx'
import type { ReactNode } from 'react'
import type { TableColumn } from '../../types/models'
import { EmptyState } from './States'

function cellContent<T extends object>(column: TableColumn<T>, item: T) {
  return column.render ? column.render(item) : String((item as Record<string, unknown>)[String(column.key)] ?? '—')
}

export function DataTable<T extends object>({
  columns,
  data,
  rowKey,
  onRowClick,
  footer,
  stackOnMobile = false,
  mobileColumnKeys,
  rowClassName,
}: {
  columns: TableColumn<T>[]
  data: T[]
  rowKey?: (item: T, index: number) => string | number
  /** Quando definido, a linha inteira vira um alvo clicável (drill-down de entidade). */
  onRowClick?: (item: T, index: number) => void
  /** Rodapé livre dentro do mesmo cartão da tabela — usado para linhas de total. */
  footer?: ReactNode
  /** Abaixo de md: cartão por linha em vez de tabela horizontal. */
  stackOnMobile?: boolean
  /** Colunas exibidas no cartão (padrão: até 4 primeiras). */
  mobileColumnKeys?: string[]
  /** Classe da linha. Quando definida, substitui o hover padrão da tabela. */
  rowClassName?: string
}) {
  if (data.length === 0) return <EmptyState />

  const clickable = Boolean(onRowClick)
  const mobileKeys = mobileColumnKeys ?? columns.slice(0, 4).map((c) => String(c.key))
  const mobileColumns = mobileKeys
    .map((key) => columns.find((column) => String(column.key) === key))
    .filter((column): column is TableColumn<T> => Boolean(column))

  const shellClass = 'rounded-2xl border border-line bg-surface'

  return (
    <div className={shellClass}>
      {stackOnMobile ? (
        <ul className="divide-y divide-line md:hidden">
          {data.map((item, index) => {
            const key = rowKey ? rowKey(item, index) : index
            const titleCol = mobileColumns[0]
            const statusCol = mobileColumns.find((column) => String(column.key) === 'status' || String(column.header).toLowerCase() === 'status')
            const detailCols = mobileColumns.filter((column) => column !== titleCol && column !== statusCol)
            const inner = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 text-sm font-semibold text-ink">
                    {titleCol ? cellContent(titleCol, item) : null}
                  </div>
                  {statusCol ? (
                    <div className="shrink-0 text-sm">{cellContent(statusCol, item)}</div>
                  ) : null}
                </div>
                {detailCols.length > 0 ? (
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                    {detailCols.map((column) => (
                      <div key={String(column.key)} className={column.align === 'right' ? 'text-right' : ''}>
                        <dt className="font-bold uppercase tracking-[0.08em] text-ink-muted">{column.header}</dt>
                        <dd className="mt-0.5 text-sm text-ink">{cellContent(column, item)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </>
            )
            if (clickable) {
              return (
                <li key={key}>
                  <button
                    type="button"
                    className="block w-full min-h-11 px-4 py-4 text-left transition hover:bg-surface-muted/70 focus:bg-surface-muted/70 focus:outline-none"
                    aria-label="Abrir detalhes"
                    onClick={() => onRowClick?.(item, index)}
                  >
                    {inner}
                  </button>
                </li>
              )
            }
            return (
              <li key={key} className="px-4 py-4">
                {inner}
              </li>
            )
          })}
        </ul>
      ) : null}

      <div className={clsx('overflow-x-auto scrollbar-thin', stackOnMobile && 'hidden md:block')}>
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
                  rowClassName ?? 'transition hover:bg-surface-muted/70',
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
                    {cellContent(column, item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer ? <div className="border-t border-line px-4 py-3">{footer}</div> : null}
    </div>
  )
}
