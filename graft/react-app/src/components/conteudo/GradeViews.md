# react-app/src/components/conteudo/GradeViews.tsx

- dayLabel · function · L16-L20 — function dayLabel(dataISO: string)
- cabineNumero · function · L22-L25 — function cabineNumero(cabine: JsonRecord | Cabine): number | null
- GradeDiaView · function · L29-L96 — function GradeDiaView({ celulas, cabines, onCellClick, marcarExcecoes = true, }: { celulas: GradeCelula[] cabines: JsonRecord[] onCellClick: (target: Omit<GradeCellTarget, 'data' | 'diaSemana'>) => void /** false no modo editar padrão (tudo é padrão, sem indicador). */ marcarExcecoes?: boolean })
- GradeSemanaView · function · L100-L154 — function GradeSemanaView({ dias, today, onOpenDia, }: { dias: GradeDia[] today: string onOpenDia: (data: string) => void })
- GradeMesView · function · L158-L216 — function GradeMesView({ monthDays, monthRef, today, gradePorData, filtroAtivo, onOpenDia, }: { monthDays: string[] monthRef: string today: string gradePorData: Map<string, GradeCelula[]> filtroAtivo: boolean onOpenDia: (data: string) => void })
