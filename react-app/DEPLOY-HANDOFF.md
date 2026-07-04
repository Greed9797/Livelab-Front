# 🚀 Handoff de Deploy — Livelab Front (react-app)

**Para:** dev responsável pelo deploy
**Data:** 2026-07-03
**Resumo:** Código no GitHub com CI verde. Falta **publicar na Vercel** (o push para `migration/react-vercel` não promove para produção automaticamente). O backend correspondente **já está no ar** no Railway (commit `d7a47f5`, migration 118 aplicada) — o front pode ser publicado a qualquer momento.

---

## 1. O que publicar

| Item | Valor |
|---|---|
| Repositório | `github.com/Greed9797/Livelab-Front` |
| Branch | `migration/react-vercel` |
| Commit a publicar | **`9ab97b8`** (`feat(comissoes): hub de comissões com escada padrão editável + fechamento de mês`) |
| Tamanho | 10 arquivos, +505 / −114 |
| Domínio de produção | **https://app.grupolivelab.com.br** (Vercel) |
| Projeto Vercel | `liveshop-saas-frontend-react` |
| `projectId` | `prj_IPxaQSUF0gWOMt63Wep0fRTkCsXq` |
| `orgId` (team) | `team_ncMJZtGdUvp9d9AiSCgWnPCg` |

> `livelab-3601f.web.app` é o app **antigo (Flutter/Firebase)** — não é este deploy.

## 2. Já validado (não precisa re-testar, mas pode)

- ✅ **GitHub Actions CI** (Typecheck + Test + Build) no commit `9ab97b8`: **success**
- ✅ Local: `tsc -b` limpo · `vitest` **154/154** · `vite build` ok
- ✅ Backend (`Livelab-back`) **já deployado**: `d7a47f5` no Railway, migration 118 aplicada (rotas novas respondem 401 sem token; inexistente responde 404)

## 3. Como publicar — escolha UMA

### Opção A — Dashboard (mais simples)
1. Vercel → projeto **liveshop-saas-frontend-react** → aba **Deployments**.
2. Localize o deployment do commit `9ab97b8` (branch `migration/react-vercel`).
   - Se existir como **Preview**: abra → **⋯ → Promote to Production**.
   - Se **não existir**: **Settings → Git → Production Branch** = `migration/react-vercel` (e ligue "Automatically deploy"), depois **Redeploy**.

### Opção B — Vercel CLI a partir do build já validado
```bash
cd Livelab-Front/react-app
npm ci
vercel link --project liveshop-saas-frontend-react
vercel pull --environment=production
vercel build --prod
vercel deploy --prebuilt --prod
```

### Opção C — CLI build na nuvem
```bash
cd Livelab-Front/react-app
vercel link --project liveshop-saas-frontend-react
vercel --prod
```
> Em B/C, garanta a env **`VITE_API_URL`** (produção) no projeto Vercel:
> `VITE_API_URL=https://liveshop-saas-api-production.up.railway.app/v1`
> CORS no Railway já inclui `https://app.grupolivelab.com.br` — não precisa mexer.

## 4. Confirmar que foi ao ar
```bash
curl -s "https://app.grupolivelab.com.br/version.json"
# {"v":"..."} — o timestamp deve ser MAIOR que 1783083176761 (build de 03/07 09:52)
```

## 5. Rollback (se algo quebrar)
- **Dashboard:** Deployments → deploy anterior (build 03/07 09:52) → **⋯ → Promote to Production** (instantâneo, sem rebuild).
- **Git:** `git revert 9ab97b8 && git push origin migration/react-vercel` e republique.
- O backend novo é **compatível com o front antigo** (rotas novas são aditivas) — rollback do front não exige rollback do back.

## 6. O que mudou neste deploy (smoke-test sugerido)

1. **Menu novo "Comissões"** (roles franqueador_master/franqueado) → abre `/comissoes/config`:
   - **Escada padrão de comissão** editável no topo (deve mostrar 0–70k → 1% | 70k–150k → 1,5% | acima de 150k → 2%, seed da migration 118). Editar uma faixa deve refletir nas apresentadoras com badge "Padrão".
   - **Fechamento do mês**: seletor de mês (default junho) + botão "Recalcular comissões do mês" → mensagem "Recálculo iniciado para N apresentadora(s)".
   - Aba **Por apresentadora**: badge **Padrão** ou **Personalizada** por apresentadora.
2. **Configurações → Usuários e equipe → Editar apresentadora → Escada de comissão**: ação única **Remover** por faixa (sem Inativar/Reativar), badge Padrão/Personalizada no cabeçalho, e **excluir faixa não pode mais dar "O servidor está indisponível"** (o recálculo agora roda em background no back).
3. Campo "Comissão (%)" plano **sumiu** da Remuneração (era ignorado pelo cálculo). ✔️ esperado.
4. Chips de escada no modal "Novo acesso" agora refletem a escada real (1%/1,5%/2%).

## 7. Pós-publicação — fechamento de junho (Lucas)

1. **Comissões → Fechamento do mês → 2026-06 → Recalcular** (só mexe em comissões *pendentes*; aprovadas ficam intactas).
2. Conferir valores na tela de comissões (fim de semana paga 2% fixo por regra — % efetivo pode ficar levemente acima da faixa).
3. Aprovar e pagar.
