# react-app/src/components/ui/DataTable.tsx

- DataTable · function · L6-L86 — function DataTable<T extends object>({ columns, data, rowKey, onRowClick, footer, }: { columns: TableColumn<T>[] data: T[] rowKey?: (item: T, index: number) => string | number /** Quando definido, a linha inteira vira um alvo clicável (drill-down de entidade). */ onRowClick?: (item: T, index: number) => void /** Rodapé livre dentro do mesmo cartão da tabela — usado para linhas de total. */ footer?: ReactNode })
