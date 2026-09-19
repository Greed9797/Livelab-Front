# react-app/src/types/models.ts

- Role · type · L5-L25 — type Role = | 'franqueador_master' // Papel real do backend (migration 070 + src/plugins/auth.js). Multi-tenant // Tier 4: enxerga um subset de unidades. No front é normalizado para // franqueador_master até a Fase C ter UI própria. | 'gerente_regional' | 'franqueado' | /** @deprecated use franqueado or operacional */ 'gerente' | /** @deprecated use operacional */ 'gerente_comercial' | /** @deprecated use franqueado */ 'financeiro' | /** @deprecated use operacional */ 'financeiro_readonly' | 'operacional' | /** @deprecated use operacional */ 'auditor' | /** @deprecated use operacional */ 'suporte' | /** @deprecated use operacional */ 'produtor_live' | /** @deprecated use operacional */ 'marketing' | /** @deprecated use operacional */ 'comercial_readonly' | 'apresentador' | /** @deprecated use apresentador (typo fix) */ 'apresentadora' | 'cliente_parceiro' | string
- OfficialRole · type · L31-L36 — type OfficialRole = | 'franqueador_master' | 'franqueado' | 'operacional' | 'apresentador' | 'cliente_parceiro'
- JsonRecord · type · L38-L38 — type JsonRecord = Record<string, unknown>
- User · interface · L40-L48 — interface User
- AuthResponse · interface · L50-L54 — interface AuthResponse
- Session · interface · L56-L60 — interface Session
- Metric · interface · L62-L67 — interface Metric
- ChartPoint · interface · L69-L73 — interface ChartPoint
- TableColumn · interface · L75-L80 — interface TableColumn<T>
- Period · interface · L82-L85 — interface Period
- Lead · interface · L87-L116 — interface Lead
- Cabine · interface · L118-L138 — interface Cabine
- Solicitacao · interface · L140-L149 — interface Solicitacao
- ApiListResponse · interface · L151-L156 — interface ApiListResponse<T>
- LiveAtual · interface · L158-L193 — interface LiveAtual
