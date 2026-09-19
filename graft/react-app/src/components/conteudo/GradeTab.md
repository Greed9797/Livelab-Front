# react-app/src/components/conteudo/GradeTab.tsx

- GradeView · type · L31-L31 — type GradeView = 'dia' | 'semana' | 'mes'
- PadraoScope · type · L34-L34 — type PadraoScope = 'uteis' | 6 | 0
- dowsFromScope · function · L42-L44 — function dowsFromScope(scope: PadraoScope): number[]
- dowRepresentativo · function · L47-L49 — function dowRepresentativo(scope: PadraoScope): number
- todayISO · function · L51-L54 — todayISO = ()
- shiftDate · function · L56-L62 — function shiftDate(dateISO: string, view: GradeView, direction: 1 | -1): string
- formatShortDate · function · L64-L66 — function formatShortDate(dataISO: string)
- GradeTabProps · interface · L68-L74 — interface GradeTabProps
- GradeTab · function · L76-L359 — function GradeTab({ activeCabines, marcaRows, apresentadoraRows, canWrite = true }: GradeTabProps)
- invalidateGrade · function · L116-L119 — function invalidateGrade()
- closePopover · function · L121-L121 — function closePopover()
- onCellClick · function · L159-L167 — function onCellClick(base: Omit<GradeCellTarget, 'data' | 'diaSemana'>)
- onPopoverSave · function · L169-L180 — function onPopoverSave(values: { marca_id: string; apresentadora_id: string | null; observacao: string | null })
- onPopoverClear · function · L182-L196 — function onPopoverClear()
- onCopiarDiaSubmit · function · L198-L202 — function onCopiarDiaSubmit(event: FormEvent<HTMLFormElement>)
