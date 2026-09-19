# react-app/src/pages/ConfiguracoesPage.tsx

- SettingsTab · type · L21-L21 — type SettingsTab = 'unidade' | 'usuarios' | 'metas' | 'comissoes-livelab' | 'ranking' | 'aparencia' | 'integracoes' | 'seguranca'
- ConfiguracoesPage · function · L24-L872 — function ConfiguracoesPage({ clienteMode = false }: { clienteMode?: boolean })
- setField · function · L309-L311 — function setField(key: string, value: string)
- onSubmit · function · L313-L316 — function onSubmit(event: FormEvent<HTMLFormElement>)
- onRankingSubmit · function · L318-L328 — function onRankingSubmit(event: FormEvent<HTMLFormElement>)
- switchSettingsTab · function · L330-L337 — function switchSettingsTab(next: SettingsTab | 'apresentadoras')
