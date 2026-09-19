# react-app/src/pages/ComercialPage.tsx

- ComercialTab · type · L31-L31 — type ComercialTab = 'dashboard' | 'crm' | 'ativos'
- statusLabel · function · L57-L59 — function statusLabel(status: string)
- normalizarBusca · function · L62-L64 — function normalizarBusca(value: string)
- officialOperationalGmv · function · L94-L96 — function officialOperationalGmv(item: JsonRecord)
- ComercialPage · function · L98-L1145 — function ComercialPage()
- setClienteField · function · L370-L372 — function setClienteField(key: keyof typeof emptyClienteForm, value: string | boolean)
- setAfiliadoField · function · L374-L376 — function setAfiliadoField(key: keyof typeof emptyAfiliadoForm, value: string)
- exportAtivosCsv · function · L378-L396 — function exportAtivosCsv()
- openAtivo · function · L398-L417 — function openAtivo(item: JsonRecord)
- abrirAtivo · function · L420-L426 — function abrirAtivo(item: JsonRecord)
- onClienteSubmit · function · L428-L446 — function onClienteSubmit(event: FormEvent<HTMLFormElement>)
- onAfiliadoSubmit · function · L448-L470 — async function onAfiliadoSubmit(event: FormEvent<HTMLFormElement>)
- onAtivoSubmit · function · L472-L536 — async function onAtivoSubmit(event: FormEvent<HTMLFormElement>)
- toggleAtivoStatus · function · L538-L551 — function toggleAtivoStatus(item = selectedAtivo)
- toggleArquivarAtivo · function · L553-L568 — function toggleArquivarAtivo(item = selectedAtivo)
- deleteAtivo · function · L570-L580 — function deleteAtivo()
- CorMarcaField · function · L1149-L1175 — function CorMarcaField({ cor, seed, onManual, onAuto }: { cor: string seed: string onManual: (hex: string) => void onAuto: () => void })
