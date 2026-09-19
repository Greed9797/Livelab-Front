# src/pages/ConfiguracoesPage.tsx

- SettingsTab · type · L21-L21 — type SettingsTab = 'unidade' | 'usuarios' | 'metas' | 'comissoes-livelab' | 'ranking' | 'aparencia' | 'integracoes' | 'seguranca'
- ConfiguracoesPage · function · L24-L697 — function ConfiguracoesPage({ clienteMode = false }: { clienteMode?: boolean })
- setField · function · L263-L265 — function setField(key: string, value: string)
- onSubmit · function · L267-L270 — function onSubmit(event: FormEvent<HTMLFormElement>)
- onRankingSubmit · function · L272-L282 — function onRankingSubmit(event: FormEvent<HTMLFormElement>)
- switchSettingsTab · function · L284-L291 — function switchSettingsTab(next: SettingsTab | 'apresentadoras')
