import { asNumber } from './format'
import type { JsonRecord } from '../types/models'

/**
 * GMV oficial de UMA live — fonte única no frontend.
 *
 * Espelha o backend `liveGmvSql()` (src/lib/metric-sql.js):
 *   COALESCE(ads_gmv, manual_gmv, fat_gerado, 0)
 *
 * `gmv` vem primeiro porque é o alias que o backend já devolve com essa mesma
 * COALESCE aplicada (src/routes/lives.js:1694 — `COALESCE(l.ads_gmv,
 * l.manual_gmv, l.fat_gerado, 0) AS gmv`). Quando o payload traz `gmv`, ele é o
 * valor canônico; quando não traz (rotas que devolvem as colunas cruas), os
 * fallbacks reproduzem a ordem do SQL.
 *
 * `??` só pula null/undefined, igual ao COALESCE do Postgres — um `ads_gmv = 0`
 * explícito vence os fallbacks seguintes nos dois lados.
 */
export function officialLiveGmv(live: JsonRecord): number {
  return asNumber(officialLiveGmvRaw(live) ?? 0)
}

/**
 * Mesma ordem, sem o piso 0: devolve `undefined` quando nenhuma das colunas tem
 * valor. Use em prefill de formulário, onde "nada preenchido" precisa continuar
 * sendo campo vazio — e não um "0" que o PATCH gravaria por cima.
 */
export function officialLiveGmvRaw(live: JsonRecord): unknown {
  return live.gmv ?? live.ads_gmv ?? live.manual_gmv ?? live.fat_gerado
}
