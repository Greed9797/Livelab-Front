import clsx from 'clsx'
import type { TableColumn } from '../../types/models'
import { EmptyState } from './States'

export function DataTable<T extends object>({
  columns,
  data,
  rowKey,
}: {
  columns: TableColumn<T>[]
  data: T[]
  rowKey?: (item: T, index: number) => string | number
}) {
  if (data.length === 0) return <EmptyState />

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
            <tr key={rowKey ? rowKey(item, index) : index} className="transition hover:bg-surface-muted/70">
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
    </div>
  )
}
