# react-app/src/components/dashboard/BrandLeaderboard.tsx

- BrandLeaderboardProps · type · L8-L15 — type BrandLeaderboardProps = { rows: JsonRecord[] title?: string subtitle?: string action?: ReactNode limit?: number emptyLabel?: string }
- BrandRow · type · L17-L31 — type BrandRow = { key: string name: string initials: string logoUrl: string color: string gmvPorHora: number faturamento: number horasLive: number lives: number /** null = marca sem meta configurada (backend não chuta valor). */ pctMeta: number | null /** % da barra relativa ao líder em GMV/h. */ progress: number }
- initialsOf · function · L33-L40 — function initialsOf(name: string): string
- normalizeRows · function · L42-L77 — function normalizeRows(rows: JsonRecord[], limit?: number): BrandRow[]
- metaTone · function · L79-L83 — function metaTone(pct: number)
- MetaBadge · function · L85-L98 — function MetaBadge({ pct }: { pct: number | null })
- BrandLogo · function · L100-L117 — function BrandLogo({ row }: { row: BrandRow })
- BrandLeaderboardRow · function · L124-L182 — function BrandLeaderboardRow({ row, index }: { row: BrandRow; index: number })
- BrandLeaderboard · function · L184-L232 — function BrandLeaderboard({ rows, title = 'Ranking de marcas', subtitle = 'Eficiência do mês · GMV por hora no ar', action, limit, emptyLabel = 'Nenhuma marca com GMV registrado neste mês.', }: BrandLeaderboardProps)
