# Sistema Visual Unificado — Analytics & Financeiro (Franqueada Livelab)
### Versão final para decisão do dono do produto

> Redesign focado em **clareza** (um padrão por tipo de dado, toda entidade clicável, um número por tela) e **fonte única de verdade** (FUV). Ancorado nos endpoints e arquivos reais. Tudo que o backend não entrega hoje está marcado **[NOVO]** ou **[ESTENDER]**. **Nenhum endpoint é apresentado como existente sem confirmação no código.**
>
> **Correções factuais desta versão** (a proposta original tinha 4 erros que invalidavam itens P0/P1):
> - O `/financeiro/resumo` **não** depende de `vendas_atribuidas` — foi reescrito de propósito para derivar de `lives.comissao_calculada` + `video_registros` (`financeiro.js:60-105`). O antigo item #4 ("fazê-lo derivar de vendas_atribuidas") **revertia** uma decisão deliberada e foi **removido**.
> - Clonar `getMarcaOperacional` **não** produz o histórico live-a-live da apresentadora: a função filtra lives por `vendas_atribuidas.marca_id` (`operacional.js:200-208`), omitindo justamente as lives sem venda atribuída (GMV>0, comissão 0) que o drill quer destacar. O endpoint novo foi **re-especificado** sobre `lives` + `live_apresentadoras_v2`.
> - `valor_fixo_minimo` **é lido e usado** pelo engine (`commission-engine.js:45,78`); só não está no `marcaCols` (SELECT/PATCH). A correção é só adicioná-lo à coluna, não "expor algo ignorado".
> - O piso `valor_fixo_minimo` é **o mesmo** para franquia e franqueadora e o `MAX` é aplicado sobre **GMV rateado por apresentadora** (`commission-engine.js:80-81`). A memória de marca foi reescrita (não há piso por ramo).

---

## 1. Princípios

1. **Fonte única de verdade por número (FUV).** Cada métrica nasce de **um** endpoint canônico e é reusada — nunca recalculada no front nem buscada por dois caminhos.
   - **GMV / comissão de franquia (Financeiro):** a fonte canônica **já é** `lives.comissao_calculada` + `video_registros`, somada em `/financeiro/resumo` (`financeiro.js:65-105`). Por invariante, `lives.comissao_calculada` é mantida idêntica a `MAX(piso, gmv×pct)` via `calcularComissaoFranquia` — a mesma regra que o `commission-engine` aplica por linha de `vendas_atribuidas` (`comissao.js:90-109`, nota "garantindo Financeiro == Comissões"). **Não mexer nessa fonte.** Lives sem marca resolvida entram com GMV e comissão 0 — comportamento desejado (alimenta o card "comissão faltante").
   - **GMV/comissão por entidade (rankings/Comissões):** a fonte canônica é `getPerformanceRanking` (`performance-rollups.js`), reusada por `/comissoes/apresentadoras`, `/comissoes/marcas`, `/comissoes/resumo` e `/analytics/dashboard`.
   - **GMV/hora:** há **duas** fórmulas divergentes (não três). O rollup e o `/analytics/funil` usam `gmv_lives / horas_live` (exclui vídeo do numerador — **correto**, `performance-rollups.js:20`; `analytics.js:1069`). O `/analytics/diario` usa `gmv_total / horas_live`, **incluindo `gmv_videos`** no numerador com horas=0 para vídeo → **infla** o GMV/hora (`analytics.js:813`). **Regra:** padronizar tudo para `gmv_lives / horas_live`; corrigir o `/diario` (ver §7).

2. **Uma métrica vive num só lugar canônico (sem espelho de tela).** Comissionamento é assunto de **Financeiro**; operação/conversão é de **Analytics**. As tabelas `/comissoes/apresentadoras` e `/comissoes/marcas` hoje aparecem nas DUAS telas (`AnalyticsPage.tsx:255-301` e `FinanceiroPage.tsx:491-534`) — **remover de Analytics**. Um número aparece **uma vez por tela**: hoje GMV aparece 5× no Financeiro e GMV/Pedidos/Horas aparecem no Hero do Pulso **e** nos 6 cards detalhados logo abaixo.

3. **Entidade-clicável-sempre.** Toda apresentadora/marca/cliente/live em qualquer tabela ou ranking é uma **linha clicável** que abre **um** detalhe canônico. Hoje nenhuma das 4 superfícies de apresentadora tem `onRowClick`; o único caminho ao detalhe é o dropdown do filtro do topo. O detalhe substitui o `RelatorioEntidadeSection` e o segundo ranking.

4. **Hierarquia visão-geral → detalhe.** A tela-mãe responde "como estou?" (KPI + tendência + ranking comparável). O clique responde "por quê / como foi calculado?" (histórico live-a-live + memória de cálculo). Nada de explicar a mesma decomposição duas vezes na mesma altura (hoje waterfall **e** `<details>` textual explicam GMV→comissão→resultado em paralelo no Financeiro).

5. **Um padrão visual por tipo de dado** (§3). Acaba com "quadro numa hora, tabela noutra". Nunca série sintética como se fosse real (o sparkline do `PresenterLeaderboard` é procedural via log/sin quando falta série) — **remover o fallback**, não só restringir o widget.

---

## 2. Arquitetura de Informação

### Papel de cada tela

| | **Analytics** (Pulso / Operação) | **Financeiro** (Resultado / Comissões) |
|---|---|---|
| Pergunta | "Como vai a **operação**? Onde está o problema?" | "Quanto **sobrou** e como a comissão foi formada?" |
| Eixo | Tempo + saúde operacional (GMV/hora, horas, conversão, alertas) | Dinheiro (resultado líquido, comissões, custos, recebíveis) |
| Granularidade | dia × marca × apresentadora; funil; import de Ads | resultado do período; comissão por entidade; custo; fluxo |
| Fonte primária | `/analytics/diario`, `/analytics/funil`, `/analytics/imports/*` | `/financeiro/resumo`, `/comissoes/*`, `/financeiro/custos`, `/financeiro/fluxo-caixa`, `/financeiro/faturamento` |

### O que SAI / ENTRA / FUNDE

- **Sai de Analytics → entra no Financeiro:** as 2 tabelas de comissões (`/comissoes/apresentadoras`, `/comissoes/marcas`) e o bloco "Desempenho e comissionamento por entidade". Comissão é Financeiro.
- **Sai de Analytics (remover de vez):** os **6 MetricCards detalhados** (`AnalyticsPage.tsx:157-215`, repetem o Hero, mesma fonte `/analytics/diario`); o **resumo do funil em chips** (`FunilAnalyticsSection.tsx:57-63`, repete o Hero por **outro** endpoint, `/funil` só lives ≥5min sem vídeo → risco de divergência lado a lado); a barra "Total" do BarPanel "Conteúdos" (soma das outras duas → eixo enganoso).
- **Sai de Analytics → vira drill-down:** o `RelatorioEntidadeSection` (que recalcula `gmv×pct` no front, ignorando o piso `valor_fixo_minimo`) some; vira detalhe de entidade por clique.
- **Funde:** o "Ranking de Apresentadoras" do Pulso (`PulsoDiarioSection.tsx:187-197`) e a tabela de comissões de apresentadora viram **uma só** `EntityTable` clicável por superfície. Em Analytics fica a versão operacional (GMV/hora, status); a comissão vai pro Financeiro; ambas linkam para o **mesmo** drill-down.
- **Elimina redundância de fonte:** o card `/comissoes/resumo` do Financeiro (`FinanceiroPage.tsx:217-224`: "Comissão total / GMV base / GMV lives / GMV vídeos") é literalmente um `SUM` client-side de `getPerformanceRanking(groupBy='marca')` (`comissoes.js:59-103`) — **mesma fonte** das tabelas de Comissões. **Remover** o card; o total vive no `TotalsRow` da tabela.

### Mapa (visão geral → drill-downs)

```
                          ┌─────────────────────────────────────────────┐
                          │            FILTRO ÚNICO (período)            │
                          │   from/to · marca · apresentadora (deep-link)│
                          └───────────────┬──────────────┬──────────────┘
                                          │              │
                ┌─────────────────────────▼──┐   ┌───────▼──────────────────────┐
                │      ANALYTICS (Pulso)      │   │   FINANCEIRO (Resultado)     │
                │  KPI hero operacional       │   │  KPI hero: Resultado líquido │
                │  Combo GMV/h × horas (série) │   │  Waterfall GMV→com→custo→res │
                │  Alertas (clicáveis)        │   │  Fluxo de caixa (série)      │
                │  EntityTable clientes/apres │   │  Tabs: Custos · Faturamento  │
                │  FunnelPanel (conversão)    │   │        Comissões · Recebíveis│
                │  Import TikTok Ads          │   │        Franqueadora(master)  │
                └───────┬─────────────┬───────┘   └─────┬──────────┬─────────────┘
                        │             │                 │          │
        clique em       │             │ clique em       │ clique   │ clique em
        APRESENTADORA   │             │ MARCA/CLIENTE   │ apres.   │ marca / live
                        ▼             ▼                 ▼          ▼
        ┌───────────────────────┐  ┌────────────────────────┐  ┌──────────────────┐
        │  DRILL APRESENTADORA   │  │  DRILL MARCA / CLIENTE │  │  DRILL LIVE      │
        │  (§4) histórico lives  │  │  (§5) histórico lives  │  │  memória/auditoria│
        │  + memória comissão    │  │  + comissão franquia   │  │  /lives/:id/      │
        │  (escada/2%/fixo)      │  │  MAX(piso, gmv_rat×pct) │  │   comissoes +     │
        │  + GMV/hora + evolução │  │  + top apresentadoras  │  │   historico-gmv   │
        └───────────────────────┘  └────────────────────────┘  └──────────────────┘
```

`<EntityDetail kind="apresentadora|marca|cliente">` serve os três primeiros (`kind="cliente"` necessário porque clientes `cliente_ecommerce` têm o % na marca vinculada e `/marcas/:id/operacional` espera `marca_id`, não `cliente_id`; já existe `/clientes/:id/operacional`). O drill de live reaproveita `/lives/:id/comissoes` + `HistoricoGmvModal` (hoje preso em `CabinesPage`).

---

## 3. Padrões de visualização (a regra)

| Padrão | Usar quando | Nunca usar para | Exemplos reais |
|---|---|---|---|
| **KpiHero** (3–4 números, topo) | O(s) resultado(s) "como estou agora" | Repetir número já presente em card/tabela | Resultado líquido (`fat_liquido`), GMV do período, Status do Pulso, GMV/hora |
| **EntityTable** (densa, ordenável, **linha clicável**, `TotalsRow` nativo) | Lista de entidades comparáveis (3+ atributos) | Decoração; série temporal | Rankings de apresentadora/marca, comissões, faturamento por cliente, franqueados |
| **TrendChart** (Line/Bar/Area/Combo, Recharts) | Série temporal ou distribuição | Comparar entidades; repetir agregado já exibido | Combo GMV/h × horas, GMV/dia, fluxo de caixa, evolução mensal |
| **FunnelPanel** | Etapas/conversão de **live** (impressões→pedidos) | Pipeline comercial de leads (semântica e fonte distintas — não unificar) | Funil do Analytics (`/analytics/funil`) |
| **Waterfall** (1 por tela, memória no tooltip) | Decomposição de um total | Repetir os mesmos números em prosa ao lado | GMV→comissão→custos→resultado |
| **EntityCard / linha clicável** | Unidade de navegação | — | toda apresentadora/marca/cliente/live |

**Regra de ouro:** um número aparece **uma vez por tela** (hero **ou** card). Ranking de entidade é **sempre** `EntityTable`; o leaderboard rico (barra+sparkline+pódio) fica **restrito a 1 widget da Home** — e mesmo lá **sem o sparkline procedural** (renderiza série real ou nada).

> **Correção de escopo (não é "front barato"):** unificar `MetricCard/HeroNumber/SummaryCard/FinanceiroHeroPanel/RankingPodium/RankingBars/PresenterLeaderboard` + migrar **todas** as tabelas para `EntityTable` é um redesign de design-system, não um ajuste trivial. Tratado como **Onda 0 faseada** (§8), não como pré-requisito instantâneo.

### Design-system (componentes propostos)

```
<KpiHero>            // 1 a 4 KpiStat; substitui HeroNumber + SummaryCard + stats inline
  <KpiStat>         // número + label + DeltaPill OPCIONAL (ver nota de delta abaixo)
<MetricCard>        // grade secundária (mantém o existente; absorve mini-cards e chips)
<DeltaPill>         // variação vs período anterior — só onde o backend ENTREGA o delta
<EntityTable>       // DataTable + onRowClick obrigatório p/ entidades + <TotalsRow> nativo
  <TotalsRow>       // rodapé de total como prop (mata somatório manual e TotalsBar avulso)
  <StatusBadge>     // saúde/status reusado em qualquer linha de entidade
<TrendChart>        // wrapper Recharts: variant line|bar|area|combo
<WaterfallPanel>    // ReceitaWaterfall + memória de cálculo embutida em tooltip/expand
<EntityDetail>      // painel/rota de drill-down (kind: apresentadora|marca|cliente)
  <MemoriaCalculo>  // breakdown estruturado (não prosa hardcoded)
<EmptyHint>         // estado "não configurado / vazio" único (mata '—' vs 'Não configurado')
```

> **Nota sobre `DeltaPill`:** delta **por entidade** (apresentadora/marca) **não existe** hoje — nem `/comissoes/*` nem `/marcas/:id/operacional` retornam período anterior. Delta agregado existe em `/financeiro/resumo` e no Pulso (`delta_gmv` etc., `performance-rollups.js:888`). **Regra:** só exibir `DeltaPill` onde o backend já entrega o comparativo. Nos drill-downs §4/§5 o delta por entidade é **omitido** até existir endpoint que o entregue (não está no roadmap P0–P2).

Formatadores centralizados (`brDate`, `formatMoney`, faixa, rótulos amigáveis de status/tipo) em 100% das superfícies — hoje o import mostra `live_date` cru, faixas ora em `k/M` ora em `formatMoney`, status mostra `cliente_ecommerce`/`afiliada` crus.

---

## 4. Drill-down da APRESENTADORA (pedido central)

Acionado por clique em qualquer linha de apresentadora (Pulso, Comissões, Home). Rota `/apresentadoras/:id` **(não existe hoje** — `ApresentadorasPage` só redireciona para config).

> Convenção de marcação no wireframe: **(E)** = existe hoje · **(N)** = novo endpoint · **(F)** = calculado no front.

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ‹ Voltar      JÉSSICA SANTOS  · apresentadora            [Período: 01–30/06 ▾]║
║  ┌──────────┐                                                                  ║
║  │  (foto)  │   GMV total          Comissão total       GMV / hora            ║
║  │ foto_url │   R$ 412.300         R$ 6.823             R$ 3.140              ║   ← KpiHero (E: /comissoes/apresentadoras
║  └──────────┘   34 lives · 187h    fixo R$2.700+var      base: gmv_lives/h     ║      ?apresentadora_id=) · SEM delta(*)
╠══════════════════════════════════════════════════════════════════════════════╣
║  EVOLUÇÃO (mensal)                                          [GMV ▾] [Comissão] ║
║   R$                                                                           ║
║   400k ┤                                  ╭──●                                 ║   ← TrendChart combo
║   300k ┤              ╭───●────●─────●────╯                                    ║     (F: /analytics/diario
║   200k ┤      ●───────╯                                                        ║      ?apresentadora_id= agregado
║        └──jan──fev──mar──abr──mai──jun──                                       ║      por mês — GMV/hora NÃO usar
║   ⚠ usar gmv_lives (não gmv_total) p/ não inflar — ver §7 #5                   ║      daqui sem corrigir #5)
╠══════════════════════════════════════════════════════════════════════════════╣
║  MEMÓRIA DE CÁLCULO DA COMISSÃO (período)                          [expandir ▾]║
║  ┌────────────────────────────────────────────────────────────────────────┐  ║
║  │ Fixo mensal ......................................... R$ 2.700,00       │  ║
║  │ GMV-base do mês (acumulado, p/ faixa) ............... R$ 412.300,00     │  ║   ← MemoriaCalculo (N: endpoint
║  │ Faixa aplicada: 150k–500k → 1,5%  [escada cadastrada]                   │  ║      novo — campos hoje calculados
║  │   ⚠ 6 lives (origem=live) em sáb/dom → override 2%                      │  ║      e DESCARTADOS, ver §7 #2)
║  │      • vídeos no fds NÃO recebem 2% (presenter-commission.js:39)         │  ║
║  │ Variável escada (R$ 324.200 × 1,5%) ................. R$ 4.863,00       │  ║
║  │ Variável fim de semana (R$ 88.100 × 2%) ............ R$ 1.762,00       │  ║
║  │ ── Total recebido ................................... R$ 9.325,00       │  ║
║  │ ℹ Rateio co-apresentadoras: 100% (ou rateio explícito; default 1/N)     │  ║
║  └────────────────────────────────────────────────────────────────────────┘  ║
║  ⚠ travado a 1 mês: fixo é MENSAL — período ≠ mês cheio distorce o total(**)  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  HISTÓRICO DE LIVES (live-a-live)                          [▼ ordenar por GMV] ║
║  Data       Marca         Cabine   Dur.   GMV       Ped.  GMV/h    Comissão  ⓘ ║
║ ─────────────────────────────────────────────────────────────────────────────║   ← EntityTable (clicável → drill LIVE)
║  28/06 sáb  Boca Rosa     C2       1h52   R$ 41.200  214  22.100   2%·824  ▸  ║      Cabine/Dur/GMV/Ped: E (/v1/lives)
║  27/06      Quem Disse B. C1       2h05   R$ 28.900  160  13.870   1,5%·433 ▸  ║      GMV/h: F (gmv/duração no front)
║  25/06      Boca Rosa     C3       1h40   R$ 19.400  98   11.640   1,5%·291 ▸  ║      Comissão por live: N (não vem
║  ...                                                                           ║      de /v1/lives — ver §7 #1/#6)
║  ─────────────────────────────────────────────────────────────────────────── ║
║  TOTAL       —            —        187h   R$412.300  ...  3.140    R$6.823   ← TotalsRow nativo
╚══════════════════════════════════════════════════════════════════════════════╝
(*)  delta por entidade não existe no backend — omitido (ver §3).
(**) fixo = R$2.700/mês somado uma vez no rollup (performance-rollups.js:265); travar drill a mês cheio ou exibir pró-rata.
```

### Campos / endpoints que alimentam

| Bloco | Fonte | Status |
|---|---|---|
| **KpiHero** (GMV, GMV/hora, comissão, fixo, total_recebido, foto_url) | `GET /comissoes/apresentadoras` filtrado por `apresentadora_id` + período (`getPerformanceRanking` groupBy='apresentadora'). O filtro `apresentadoraId` **já é suportado** pela engine e repassado pela rota | **(E) existe — não precisa endpoint novo para os KPIs** |
| **Histórico live-a-live** (data, marca, cabine, duração, GMV, pedidos, status) | `GET /v1/lives?apresentadora_id=&data_inicio=&data_fim=` filtra por `COALESCE(ap_v2.apresentadora_id, ae.apresentadora_id, ap_user.id)` (`lives.js:1483`) e **inclui lives sem venda atribuída** | **(E) existe** para esses campos |
| **GMV/h por live** | `gmv_da_live / duração_da_live` | **(F) calculado no front** — não existe por live em nenhum endpoint. Exceção consciente ao "nunca recalcular": é aritmética trivial de dois campos já presentes |
| **Comissão por live** (pct + valor) | **não vem de `/v1/lives`** (a lista não retorna `comissao_apresentadora_pct/valor`) | **(N) novo** — ver #1 ou cruzar com `GET /lives/:id/comissoes` por live (N+1, evitar) |
| **Memória de cálculo** (base_gmv mês, faixa, override 2%, fixo, rateio) | `resolvePresenterCommissionPct` (`presenter-commission.js:29-71`) **calcula e descarta** o detalhe; `/comissoes/pendentes` computa `faixa.comissao_pct` + `gmv_mes` no LATERAL mas **não os inclui no SELECT** (`comissoes.js:212-230`) e **só serve linhas `pendente_aprovacao` com role de aprovador** — não serve comissão já aprovada | **(N) novo endpoint** (ver #2) |
| **Evolução mensal** | `GET /analytics/diario?apresentadora_id=` agregado por mês no front | **(E) existe** — usar `gmv_lives`, não `gmv_total`, para a série de GMV/hora (#5) |

**Por que NÃO clonar `getMarcaOperacional`:** suas `lives[]` são filtradas pela CTE `venda_live_marca` (`vendas_atribuidas.marca_id`, `operacional.js:200-208`), então **só lista lives com venda atribuída**. Clonar herdaria esse defeito e **omitiria** exatamente as lives "comissão pendente de atribuição" que este drill quer marcar. O caminho correto é `GET /v1/lives` (já filtra por apresentadora e inclui todas as lives).

**Aviso de integridade:** quando `comissao_apresentadora=0` mas `gmv>0` (live sem `vendas_atribuidas`), marcar a linha com badge "comissão pendente de atribuição" — não exibir R$ 0 silencioso.

---

## 5. Drill-down da MARCA

Acionado por clique em linha de marca (Comissões, Faturamento). Reusa `<EntityDetail kind="marca">`. **Base parcialmente pronta:** `GET /marcas/:id/operacional` existe (`operacional.js:172-260`) — mas atenção: suas `lives[]` só incluem lives com venda atribuída (mesmo limite do §4). Para o histórico completo da marca, usar `GET /v1/lives?marca_id=` (inclui lives sem atribuição).

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ‹ Voltar     BOCA ROSA  · marca/afiliada                 [Período: 01–30/06 ▾]║
║  ┌──────────┐                                                                  ║
║  │ (logo)   │   GMV total       Comissão franquia   Comissão franqueadora     ║
║  │ logo_url │   R$ 1.204.500    R$ 60.225           R$ 24.090                 ║   ← KpiHero (E: /comissoes/marcas
║  └──────────┘   88 lives · 410h GMV/hora R$ 2.938                             ║      + /marcas/:id/operacional)
╠══════════════════════════════════════════════════════════════════════════════╣
║  MEMÓRIA DA COMISSÃO DE FRANQUIA                                               ║
║  comissao_linha = MAX( piso , gmv_rateado_por_apresentadora × % )             ║
║  ┌────────────────────────────────────────────────────────────────────────┐  ║
║  │ % franquia (editável no Comercial) ................. 5,0%               │  ║   ← MemoriaCalculo
║  │ Piso valor_fixo_minimo (MESMO p/ franquia e franqueadora) R$ 1.500/linha │  ║     % franquia: E (no payload marca)
║  │ Comissão franquia (soma das linhas de vendas_atribuidas) . R$ 60.225    │  ║     piso valor_fixo_minimo: N
║  │ ⚠ O MAX é por linha de venda RATEADA por apresentadora, não por live —  │  ║       (ausente do marcaCols — #3)
║  │   o piso pode disparar por rateio baixo, não só por "GMV baixo da live" │  ║     ramo do MAX por linha: N (#3)
║  │ Piso acionado em N linhas → ver detalhamento                            │  ║
║  │ ✎ Editar % e piso → abre Comercial (PATCH /marcas precisa do #3 p/      │  ║     ⚠ a edição do piso NÃO persiste
║  │   persistir valor_fixo_minimo — hoje não está em marcaCols/schema)      │  ║       hoje sem o #3
║  └────────────────────────────────────────────────────────────────────────┘  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  EVOLUÇÃO MENSAL (GMV / comissão / lives)                  [GMV ▾]             ║   ← TrendChart (F: /analytics/diario
║   ... barras/linha por mês (de /analytics/diario?marca_id= agregado) ...       ║      ?marca_id= agregado por mês)
╠════════════════════════════════════════╦═════════════════════════════════════╣
║  APRESENTADORAS QUE MAIS PERFORMAM      ║  HISTÓRICO DE LIVES (live-a-live)   ║
║  Apres.        GMV       Lives  GMV/h   ║  Data    Apres.    GMV      Ped. ⓘ  ║   ← duas EntityTable clicáveis
║ ──────────────────────────────────────  ║ ───────────────────────────────────  ║      esquerda: E (/comissoes/
║  Jéssica   R$ 312k  ▸    18    17.300   ║  28/06   Jéssica   R$41.200  214 ▸  ║       apresentadoras?marca_id=)
║  Marina    R$ 198k  ▸    14    14.100   ║  27/06   Marina    R$22.900  131 ▸  ║      direita: E (/v1/lives?marca_id=)
║  Carla     R$ 141k  ▸    11    12.800   ║  ...                                ║
║  ────────────────────────────────────   ║  ─────────────────────────────────  ║
║  TOTAL     R$1.204k     88              ║  TOTAL   —         R$1.204k          ║   ← TotalsRow
╚════════════════════════════════════════╩═════════════════════════════════════╝
```

### Campos / endpoints

| Bloco | Fonte | Status |
|---|---|---|
| KpiHero (GMV, GMV/hora, comissao_franquia/franqueadora, logo_url) | `GET /comissoes/marcas` (groupBy='marca') + `GET /marcas/:id/operacional` (`metrics`) | **(E) existe** |
| Histórico live-a-live (data, apresentadora, GMV, pedidos) | `GET /v1/lives?marca_id=` (inclui lives sem atribuição) | **(E) existe** |
| Apresentadoras que mais performam | `GET /comissoes/apresentadoras?marca_id=` (`getPerformanceRanking` aceita `marcaId`) | **(E)** confirmar repasse do `marca_id` na rota |
| Memória franquia `MAX(piso, gmv_rateado×pct)` | fórmula `calcularComissaoFranquia` (`comissao.js:104-109`); `%` no payload de marca; **piso `valor_fixo_minimo` ausente do `marcaCols`** | **% (E)** · **piso (N): expor `valor_fixo_minimo`** no GET/PATCH (#3). Piso é **único** p/ franquia e franqueadora; MAX é por **linha rateada**, não por live |
| Evolução mensal | `GET /analytics/diario?marca_id=` agregado por mês | **(E) existe** (usar gmv_lives, #5) |

> **Correção conceitual (vs proposta original):** não existe "piso por live separado por ramo (franquia/franqueadora)". O `valor_fixo_minimo` é o **mesmo** piso para os dois (`commission-engine.js:78-81`) e o `MAX` opera sobre o **GMV rateado por apresentadora** em cada linha de `vendas_atribuidas`. A memória mostra: % cadastrado, piso único, total da soma das linhas, e (com #3) quantas **linhas** bateram no piso.

---

## 6. Layout das telas-mãe (unificadas e limpas)

### Analytics — novo (Pulso + Funil + Import; sem comissões, sem cards duplicados)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ANALYTICS · Pulso diário        [Hoje|Ontem|7d|30d|Mês|✎]  Marca▾ Apres▾  ↻ ║   ← AnalyticsFilterBar (mantido)
╠══════════════════════════════════════════════════════════════════════════════╣
║  ┌── KpiHero (status como cor de fundo) ──────────────────────────────────┐  ║
║  │  ● ATENÇÃO  GMV R$1,82M ▲9%  Pedidos 9,4k  Horas 612h  GMV/h R$2,97k   │  ║   ← bloco-resumo único (E)
║  │  Clientes críticos: 3   Horas sem venda: 21h                            │  ║     (▲9% = delta agregado existe;
║  └─────────────────────────────────────────────────────────────────────────┘ ║      SEM os 6 MetricCards detalhados)
╠══════════════════════════════════════════════════════════════════════════════╣
║  GMV/HORA × HORAS NO AR (por dia)                          GMV acum.: R$1,82M ║
║   R$/h ┤ ╭●╮      ╭●─╮                     ▏barras = horas                     ║   ← TrendChart combo (E)
║        ┤ ▏▏▏ ╭●╮  ▏▏ ▏  ╭●╮                ●linha = GMV/h (gmv_lives/h, #5)    ║     fonte /diario, corrigida (#5)
║        └─01──02──03──04──05──06──07──                                          ║
╠════════════════════════════════════════╦═════════════════════════════════════╣
║  ALERTAS OPERACIONAIS (clicáveis →)     ║  FUNIL DE CONVERSÃO                  ║
║  ⚠ Boca Rosa 27/06 · GMV/h baixo    ▸  ║  Impressões ███████████ 1,2M        ║   ← FunnelPanel único (E)
║  ⚠ QDB 25/06 · 0 vendas 2h          ▸  ║  Visualizações ████████ 840k  70%   ║     SEM chips de resumo
║  (clique abre a live/cliente/dia)       ║  Produto ██████ 410k  34%           ║     fonte /analytics/funil
║  alertas já têm clienteNome/data        ║  Cliques ███ 96k  8%                ║     (só lives, sem vídeo)
║                                         ║  Pedidos ██ 9,4k  0,8%              ║
║                                         ║  ⓘ impressões/cliques dependem do   ║
║                                         ║    import TikTok (tem_dados_ads)    ║
╠════════════════════════════════════════╩═════════════════════════════════════╣
║  CLIENTES (operacional, ordenável, clicável →)                                ║
║  Cliente        Status  Horas  GMV/h     Pedidos                          ▸   ║   ← EntityTable (E)
║  Boca Rosa      ● OK     88h   R$2,9k    1,4k                              ▸   ║     clique → drill marca/cliente
║  QDB            ● Atenç. 41h   R$1,3k    420                               ▸   ║     (§5 / kind=cliente)
║  ───────────────────────────────────────────────────────────────────────────  ║
║  APRESENTADORAS (operacional, clicável →)  · comissão? → ver Financeiro        ║
║  Apresentadora  Status  Horas  GMV/h     Ped/h                            ▸   ║   ← EntityTable (clique → §4)
║  Jéssica        ● Ótimo 187h  R$3,1k     1,1                              ▸   ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  IMPORTAR TIKTOK ADS   [Selecionar CSV/XLSX] [Pré-visualizar] [Aplicar]        ║   ← AnalyticsImportSection (E)
║  resumo em MetricCards: Linhas · Casadas · Ambíguas · ...                      ║     mini-cards → MetricCard
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Financeiro — novo (resultado + custos + faturamento + comissões com drill)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  FINANCEIRO            [PeriodRangeControl]   Operac.·Cliente·Receb.·Boletos·  ║
║                                               Comissões·Franqueadora(master)   ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  ┌── KpiHero ───────────────────────────────────────────────────────────────┐ ║
║  │  RESULTADO LÍQUIDO   R$ 41.802  ▲6%   (E: /financeiro/resumo, fat_liquido)│ ║   ← KpiHero (delta agregado existe)
║  │  GMV R$1,82M  Take 3,3%  Lives 88  Vídeos 41  Ticket R$194  Custos R$18k │ ║     SEM card /comissoes/resumo
║  │  ⚠ Comissão ausente: 4 lives c/ GMV sem comissão  ▸* (clica → lista)     │ ║     número: E (comissao_faltante_count)
║  └─────────────────────────────────────────────────────────────────────────┘ ║     *lista/drill: N (ver §7 #6)
╠══════════════════════════════════════════════════════════════════════════════╣
║  DECOMPOSIÇÃO DO RESULTADO            (memória de cálculo no tooltip de cada █) ║
║   GMV ███████████████ 1.82M                                                    ║   ← WaterfallPanel ÚNICO (E)
║   −Comissão franquia    ▼ 60k                                                  ║     some o <details> textual;
║   −Custos               ▼ 18k                                                  ║     memória vira tooltip
║   =Resultado            ███ 41.8k                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  [Tab Operacional] FLUXO DE CAIXA (entradas × saídas / dia)                    ║   ← TrendChart line (E)
║  [Tab Custos]      lista + form (competência) — mantém                         ║
║  [Tab Comissões]   ★ LAR CANÔNICO DO COMISSIONAMENTO                           ║
║     ┌─ Comissão por apresentador (EntityTable, clicável → §4) ──────────────┐ ║
║     │ Apres.    GMV base   Registros   Comissão                         ▸   │ ║   ← EntityTable + TotalsRow (E)
║     │ Jéssica   R$412k     34          R$6.823                          ▸   │ ║     (movida de Analytics;
║     │ TOTAL     ...                    R$ ...                                │ ║      fonte /comissoes/apresentadoras)
║     ├─ Comissão por marca (EntityTable, clicável → §5) ─────────────────────┤ ║
║     │ Marca     GMV base   Apres.   Franquia   Franqueadora            ▸   │ ║
║     │ Boca Rosa R$1,2M     R$54k    R$60.2k    R$24k                    ▸   │ ║
║     │ TOTAL     ...                 R$ ...      R$ ...                       │ ║
║     └────────────────────────────────────────────────────────────────────┘  ║
║  [Tab Cliente] Faturamento por cliente (EntityTable clicável → /operacional)  ║
║  [Tab Recebíveis] EmptyHint "Sem integração de recebíveis"                    ║
║  [Tab Franqueadora] Desempenho por franqueado (EntityTable clicável)          ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 7. Lacunas de backend (priorizado e corrigido)

> O antigo item #4 ("`/financeiro/resumo` derivar de `vendas_atribuidas`") foi **REMOVIDO** — invertia uma decisão deliberada e reintroduziria divergência. O antigo item #1 ("clonar `getMarcaOperacional`") foi **re-especificado**.

| # | Prioridade | Endpoint / mudança | Forma do payload | Por quê |
|---|---|---|---|---|
| 1 | **P0** | **[ESTENDER]** `GET /lives/:id/comissoes` **+ batch** `GET /v1/comissoes/por-apresentadora/:id?from=&to=` retornando comissão por live | `lives[]{live_id, comissao_apresentadora_valor, comissao_apresentadora_pct, fim_de_semana}` | `/v1/lives` **não** retorna comissão por live (confirmado no SELECT `lives.js:1505-1525`). O §4 precisa da coluna "Comissão" por live sem N+1. **Não** clonar `getMarcaOperacional` (omite lives sem atribuição) |
| 2 | **P0** | **[NOVO]** `GET /v1/comissoes/:id/memoria` (apresentadora) | `{ origem, gmv_rateado, base_gmv_mes, faixa{id,gmv_inicio,gmv_fim,comissao_pct}, aplicou_2pct_fim_de_semana, percentual_rateio, pct_aplicado, valor }` | `resolvePresenterCommissionPct` **calcula e descarta** o detalhe (`presenter-commission.js:29-71`). `/comissoes/pendentes` computa parte no LATERAL mas **não a inclui no SELECT** e **só serve `pendente_aprovacao` com role de aprovador** — não cobre comissão já aprovada. Endpoint novo é mesmo necessário |
| 3 | **P0** | **[ESTENDER]** `marcaCols` + `marcaBaseSchema` (`marcas.js:7-37`) | adicionar `valor_fixo_minimo` ao SELECT (GET) e ao PATCH; **[NOVO]** no breakdown de marca, por linha de venda, flag `bateu_piso ∈ {true,false}` | `valor_fixo_minimo` **é lido e usado** pelo engine (`commission-engine.js:45,78`) mas **não está exposto** no GET nem **persistido** no PATCH. Sem isso a edição do §5 não funciona e a memória não pode mostrar o piso. Piso é **único** p/ franquia e franqueadora; MAX é por linha **rateada** |
| 4 | **P1** | **[ESTENDER]** helper único `gmvPorHora()` no backend → corrigir `/analytics/diario` | `gmv_por_hora = gmv_lives / horas_live` (excluir `gmv_videos` do numerador) reusado por `/diario`, `/funil`, rollups | Hoje `/diario` usa `gmv_total/horas_live` (`analytics.js:813`), **inflando** o valor (vídeo tem horas=0). Rollup e funil já usam `gmv_lives/horas_live` (corretos). São **2** fórmulas divergentes, não 3 |
| 5 | **P2** | **[NOVO]** `GET /v1/financeiro/comissao-ausente?from=&to=` | `lives[]{live_id,data,marca,apresentadora,gmv}` onde `comissao_calculada=0` e `gmv>0` | Drill do card "Comissão ausente" do §6 (o **número** já vem de `/financeiro/resumo`; a **lista** não existe) |
| 6 | **P3** | **[FIX]** chave de cache `QK.rankingMarcas` no front | usar chave `'YYYY-MM'` completa | Hoje `mes.split('-')[1]` → colisão jun/2025 × jun/2026 |

> **Removidos do roadmap por over-engineering:**
> - Antigo #7 (`/apresentadoras/:id/serie` e `/marcas/:id/serie`): a evolução mensal é trivialmente derivável de `/analytics/diario?...` agregando ~30 linhas/mês no front. Volume baixíssimo — **não criar endpoint**.
> - Forçar `<FunnelPanel>` único compartilhado com o Pipeline do Comercial: são funis semanticamente distintos (leads de CRM × conversão de live, fontes `/crm/summary` × `/analytics/funil`). **Manter separados.**

> **Autorização (especificar antes de implementar):** o §4 mistura dados operacionais (`READ_ANALYTICS`) e de comissão (`READ_FINANCEIRO`/comissões). Definir que o KpiHero/histórico operacional é visível com `READ_ANALYTICS`, mas a **memória de comissão e a coluna "Comissão"** exigem o papel financeiro — escondê-las (não zerar) para quem não tem permissão. Aplicar o mesmo aos endpoints #1 e #2.

---

## 8. Roadmap de implementação (ondas)

### Onda 0 — Front-only, dado existente (faseada)
*Nenhum endpoint novo. Resolve a maior parte da queixa visual, mas é um redesign de design-system — não subestimar o esforço.*

- **0a (estrutural):** criar `EntityTable` (DataTable + `onRowClick` + `TotalsRow` nativo) e `KpiHero`/`MetricCard` únicos. Migrar `HistoricoGmvModal` (`<table>` cru → DataTable + Modal padrão).
- **0b (consolidação):** migrar as tabelas existentes para `EntityTable`. **Remover** os 6 MetricCards detalhados do Analytics, os chips do funil (`FunilAnalyticsSection.tsx:57-63`), a barra "Total" do BarPanel, e o card `/comissoes/resumo` do Financeiro (duplica a fonte das tabelas).
- **0c (realocação):** **mover** as 2 tabelas de comissões de Analytics → Financeiro (tab Comissões). Remover `RelatorioEntidadeSection` (e seu `gmv×pct` no front). Centralizar formatadores + `EmptyHint`. Eliminar tiers hardcoded de `ApresentadoraRemuneracao` (render das faixas reais). Tornar alertas do Pulso clicáveis. Fix chave `rankingMarcas` (#6). **Remover o sparkline procedural** do `PresenterLeaderboard` (não só restringir o widget).
- **0d (drills que já dão pra fazer):** `<EntityDetail kind="marca|cliente">` usando `/marcas/:id/operacional` + `/clientes/:id/operacional` (existem) e o **histórico via `/v1/lives?marca_id=`** (inclui lives sem atribuição). Drill de live via `/lives/:id/comissoes` + `/lives/:id/historico-gmv` (existem). **KpiHero da apresentadora já viável** com `/comissoes/apresentadoras?apresentadora_id=` (filtro suportado pela engine) — sem endpoint novo.

### Onda 1 — Backend mínimo para o drill completo da apresentadora (P0)
- **#1** comissão por live (`/lives/:id/comissoes` estendido + batch) → coluna "Comissão" do histórico §4.
- **#2** `/v1/comissoes/:id/memoria` → memória de cálculo real do §4 (escada, override 2% só para `origem=live`, fixo mensal, rateio).
- **#3** expor + persistir `valor_fixo_minimo` em `marcaCols`/`marcaBaseSchema` + flag `bateu_piso` por linha → memória e edição do §5.
- Ligar rota `/apresentadoras/:id` e `onRowClick` nas linhas → `<EntityDetail kind="apresentadora">`. **Travar o drill de comissão a mês cheio** (ou exibir pró-rata do fixo) — `total_recebido` soma o fixo uma vez por range (`performance-rollups.js:265`).

### Onda 2 — FUV de GMV/hora (P1) + reconciliação de snapshots
- **#4** helper único `gmvPorHora()` corrigindo `/analytics/diario` (parar de inflar com `gmv_videos`).
- **Reconciliação de comissão de apresentadora:** decidir **qual snapshot é canônico por superfície**. Coexistem `lives.comissao_apresentadora_pct/valor` (snapshot operacional, plano/legado via `apresentadoras.comissao_pct`) e `vendas_atribuidas.comissao_apresentadora` (escada real). **Princípio:** o drill §4 e o Financeiro usam a **escada** (`vendas_atribuidas`); o snapshot legado da live é marcado "valor operacional (legado)" e nunca exibido como número oficial. Documentar para o painel da live não conflitar com o drill.

### Onda 3 — Refinamentos (P2/P3)
- **#5** drill do card "Comissão ausente". **#6** fix de cache. `WaterfallPanel` com memória embutida no tooltip (some o `<details>` paralelo).

---

## Resumo executivo

- **Onda 0** entrega ~70% da clareza **sem tocar no backend**: entidade clicável, um padrão por dado, comissão só no Financeiro, fim dos números duplicados intra-tela, drill de **marca/cliente** já funcional, e o **KpiHero da apresentadora** (que não precisa de endpoint novo). É um redesign de design-system — faseado em 0a–0d, não um ajuste instantâneo.
- **Onda 1** (3 mudanças P0) entrega o **drill-down completo da apresentadora** pedido: histórico live-a-live (via `/v1/lives`, que inclui lives sem atribuição), comissão por live e a **memória de cálculo real** (escada, 2% de fds só para lives, piso, rateio).
- **Onda 2** corrige a **única** divergência real de GMV/hora (`/diario` inflado) e fixa qual snapshot de comissão é canônico — **sem** mexer no `/financeiro/resumo`, cuja FUV (`lives.comissao_calculada` + `video_registros`) é deliberada e correta.

**Não faça:** reverter o `/financeiro/resumo` para `vendas_atribuidas`; clonar `getMarcaOperacional` para a apresentadora; criar endpoints de série mensal por entidade; unificar o funil de Analytics com o pipeline do Comercial. Os quatro reintroduzem bugs ou custo sem ganho.

**Arquivos-âncora.** Front: `/Users/lucas/Livelab-Front/react-app/src/pages/{AnalyticsPage,FinanceiroPage,ComercialPage}.tsx`, `components/analytics/{Pulso,Funil,RelatorioEntidade,AnalyticsImport}Section.tsx`, `components/dashboard/{FinanceiroHeroPanel,PresenterLeaderboard,RankingPodium,RankingBars}.tsx`, `pages/HistoricoGmvModal.tsx`, `components/configuracoes/ApresentadoraRemuneracao.tsx`. Back: `/Users/lucas/Livelab-back/src/routes/{analytics,financeiro,comissoes,marcas,apresentadoras,lives}.js`, `src/lib/{performance-rollups,operacional,metric-sql}.js`, `src/services/{comissao,commission-engine,presenter-commission}.js`, `src/config/presenter_defaults.js`. Trechos verificados nesta revisão: `financeiro.js:60-105`, `operacional.js:200-228`, `commission-engine.js:45,78-81`, `comissao.js:104-109`, `presenter-commission.js:39-71`, `marcas.js:7-37`, `lives.js:1505-1525`, `analytics.js:813` vs `performance-rollups.js:20`, `performance-rollups.js:265`.
