# react-app/src/components/conteudo/gradeUtils.ts

- GradeCelula · interface · L5-L18 — interface GradeCelula
- GradeDia · interface · L20-L23 — interface GradeDia
- GradePadraoCelula · interface · L25-L27 — interface GradePadraoCelula extends GradeCelula
- hashString · function · L47-L53 — function hashString(value: string): number
- corDaMarca · function · L56-L59 — function corDaMarca(marcaId: string): { solid: string; soft: string }
- gradeCellKey · function · L61-L63 — function gradeCellKey(cabineId: string, horaInicio: string)
- indexCelulas · function · L66-L70 — function indexCelulas(celulas: GradeCelula[]): Map<string, GradeCelula>
- marcasPresentes · function · L73-L79 — function marcasPresentes(celulas: GradeCelula[]): Array<{ id: string; nome: string; cor: string | null }>
