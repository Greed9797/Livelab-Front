import clsx from 'clsx'
import { ArrowDownRight, ArrowUpRight, ChevronDown, Minus } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { useDreMes } from '../../hooks/useDreMes'
import { extractErrorMessage } from '../../services/api'
import type { PrevistoRealizado } from '../../types/financeiro'
import type {
  DreDeltas,
  DreDetalheCliente,
  DreDetalheGrupo,
  DreDetalheItem,
  DreMesDetalheResponse,
  VisaoDre,
} from '../../types/financeiro-dre'
import { detalheVazio, itemEncerrado, margemPct, ordenarGrupos, participacao, tomDelta, valorVisao, variacaoPct } from '../../utils/dre-detalhe'
import { textoAberturaCaixa } from '../../utils/caixa'
import { formatDataCurta, grupoLabel, isStatus, mesLabel, origemLabel, shiftMes } from '../../utils/financeiro'
import { formatMoney, formatPercent } from '../../utils/format'
import { EmptyState, ErrorState } from '../ui/States'
import { StatusChip } from './primitives'

// ── Valores ──────────────────────────────────────────────────────────────────

function Valor({ v, visao, forte, className }: { v: PrevistoRealizado; visao: VisaoDre; forte?: boolean; className?: string }) {
  const main = valorVisao(v, visao)
  return (
    <span className={clsx('inline-flex flex-col items-end text-right', className)}>
      <span className={clsx('num whitespace-nowrap text-[13px]', forte ? 'font-bold text-ink' : 'font-medium text-ink', main < 0 && 'text-[var(--danger)]')}>
        {main === 0 ? <span className="text-ink-muted">—</span> : formatMoney(main, true)}
      </span>
      {visao === 'ambos' ? (
        <span className="num whitespace-nowrap text-[11px] text-ink-muted">{v.previsto === 0 ? '·' : `prev. ${formatMoney(v.previsto, true)}`}</span>
      ) : null}
    </span>
  )
}

const pr = (previsto: number, realizado: number): PrevistoRealizado => ({ previsto, realizado })

function DeltaChip({ chave, delta, anterior, visao, mesAnt }: { chave: keyof DreDeltas; delta: PrevistoRealizado; anterior: PrevistoRealizado | null; visao: VisaoDre; mesAnt: string }) {
  if (!anterior) return <span className="text-[11px] text-ink-muted">sem mês anterior</span>
  const d = valorVisao(delta, visao)
  const tom = tomDelta(chave, d)
  const pct = variacaoPct(valorVisao(anterior, visao) + d, valorVisao(anterior, visao))
  const Icon = tom === 'neutro' ? Minus : d > 0 ? ArrowUpRight : ArrowDownRight
  const cor = tom === 'bom' ? 'var(--success)' : tom === 'ruim' ? 'var(--danger)' : 'var(--text-muted)'
  return (
    <span className="num inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: cor }}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {d > 0 ? '+' : d < 0 ? '−' : ''}
      {formatMoney(Math.abs(d), true)}
      {pct != null ? ` (${pct > 0 ? '+' : ''}${formatPercent(pct)})` : ''}
      <span className="font-normal text-ink-muted">vs {mesLabel(mesAnt, true)}</span>
      <span className="sr-only">{tom === 'bom' ? ' — melhora' : tom === 'ruim' ? ' — piora' : ' — estável'}</span>
    </span>
  )
}

// ── Blocos ───────────────────────────────────────────────────────────────────

function Secao({ titulo, total, visao, children, defaultOpen = true, nota }: { titulo: string; total?: PrevistoRealizado; visao: VisaoDre; children: ReactNode; defaultOpen?: boolean; nota?: ReactNode }) {
  const [aberto, setAberto] = useState(defaultOpen)
  const id = useId()
  return (
    <section className="design-card overflow-hidden" aria-labelledby={`${id}-t`}>
      <h3 id={`${id}-t`} className="m-0">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-surface-muted focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
          aria-expanded={aberto}
          aria-controls={`${id}-c`}
          onClick={() => setAberto((v) => !v)}
        >
          <span className="inline-flex items-center gap-2 text-sm font-bold text-ink">
            <ChevronDown className={clsx('h-4 w-4 text-ink-muted transition', !aberto && '-rotate-90')} aria-hidden />
            {titulo}
          </span>
          {total ? <Valor v={total} visao={visao} forte /> : null}
        </button>
      </h3>
      <div id={`${id}-c`} hidden={!aberto} className="border-t border-line">
        {children}
        {nota ? <p className="border-t border-[var(--hairline)] px-4 py-2.5 text-[11px] text-ink-muted">{nota}</p> : null}
      </div>
    </section>
  )
}

function SubTitulo({ children, total, visao }: { children: ReactNode; total?: PrevistoRealizado; visao: VisaoDre }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-[color-mix(in_srgb,var(--bg-elev-3)_60%,transparent)] px-4 py-2">
      <h4 className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">{children}</h4>
      {total ? <Valor v={total} visao={visao} /> : null}
    </div>
  )
}

function Vazio({ children }: { children: ReactNode }) {
  return <p className="px-4 py-3 text-xs text-ink-muted">{children}</p>
}

function ItemLinha({ item, visao }: { item: DreDetalheItem; visao: VisaoDre }) {
  const encerrado = itemEncerrado(item)
  return (
    <li className={clsx('fin-row flex items-start justify-between gap-3 px-4 py-2.5', encerrado && 'opacity-70')} data-status={item.status ?? undefined}>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-ink" title={item.descricao}>{item.descricao}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-muted">
          {item.origem ? <span>{origemLabel({ origem: item.origem, componente: null })}</span> : null}
          {item.data_vencimento ? <span>vence {formatDataCurta(item.data_vencimento)}</span> : null}
          {isStatus(item.status) ? <StatusChip status={item.status} natureza={item.status === 'perdido' ? 'receita' : 'custo'} className="h-5 px-2 text-[10px]" /> : item.status ? <span>{item.status}</span> : null}
        </p>
        {encerrado ? (
          <p className="mt-0.5 text-[11px] text-[var(--danger)]" title={item.motivo ? `Motivo: ${item.motivo}` : undefined}>
            {item.status === 'perdido' ? 'Perdido' : 'Cancelado'}
            {item.valor_encerrado != null && item.valor_encerrado > 0 ? ` ${formatMoney(item.valor_encerrado, true)}` : ''}
            {item.encerrado_em ? ` em ${formatDataCurta(item.encerrado_em.slice(0, 10))}` : ''} · {item.motivo ? `motivo: ${item.motivo}` : 'sem motivo informado'}
          </p>
        ) : null}
      </div>
      <Valor v={pr(item.previsto, item.realizado)} visao={visao} />
    </li>
  )
}

function Grupos({ grupos, visao, vazio }: { grupos: DreDetalheGrupo[]; visao: VisaoDre; vazio: string }) {
  if (grupos.length === 0) return <Vazio>{vazio}</Vazio>
  return (
    <>
      {ordenarGrupos(grupos, visao).map((g) => (
        <div key={g.grupo}>
          <SubTitulo total={g.total} visao={visao}>{grupoLabel(g.grupo)}</SubTitulo>
          {g.itens.length ? (
            <ul className="divide-y divide-[var(--hairline)]">
              {g.itens.map((i) => <ItemLinha key={i.id} item={i} visao={visao} />)}
            </ul>
          ) : (
            <Vazio>Sem itens detalhados.</Vazio>
          )}
        </div>
      ))}
    </>
  )
}

function Cliente({ c, visao, totalReceita }: { c: DreDetalheCliente; visao: VisaoDre; totalReceita: number }) {
  const [aberto, setAberto] = useState(false)
  const id = useId()
  const share = participacao(valorVisao(c.total, visao), totalReceita)
  return (
    <li>
      <button
        type="button"
        className="fin-row flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
        aria-expanded={aberto}
        aria-controls={id}
        onClick={() => setAberto((v) => !v)}
      >
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
            <ChevronDown className={clsx('h-3.5 w-3.5 shrink-0 text-ink-muted transition', !aberto && '-rotate-90')} aria-hidden />
            <span className="truncate">{c.cliente_nome}</span>
          </span>
          <span className="num ml-5 block text-[11px] text-ink-muted">
            {c.marcas.length} {c.marcas.length === 1 ? 'marca' : 'marcas'} · {formatPercent(share)} da receita
          </span>
        </span>
        <Valor v={c.total} visao={visao} forte />
      </button>
      <ul id={id} hidden={!aberto} className="divide-y divide-[var(--hairline)] bg-[color-mix(in_srgb,var(--bg-elev-3)_35%,transparent)]">
        {c.marcas.map((m) => (
          <li key={m.marca_id} className="px-4 py-2.5 pl-9">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 truncate text-[13px] font-medium text-ink">{m.marca_nome}</p>
              <Valor v={m.total} visao={visao} />
            </div>
            <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] sm:grid-cols-4">
              <div>
                <dt className="text-ink-muted">Fixo</dt>
                <dd><Valor v={m.fixo} visao={visao} className="items-start text-left" /></dd>
              </div>
              <div>
                <dt className="text-ink-muted">Comissão</dt>
                <dd><Valor v={m.comissao} visao={visao} className="items-start text-left" /></dd>
              </div>
              <div>
                <dt className="text-ink-muted">GMV</dt>
                <dd className="num font-medium text-ink">{m.gmv ? formatMoney(m.gmv, true) : '—'}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">% comissão</dt>
                <dd className="num font-medium text-ink">{m.pct ? formatPercent(m.pct) : '—'}</dd>
              </div>
            </dl>
          </li>
        ))}
        {c.marcas.length === 0 ? <li><Vazio>Sem marcas no mês.</Vazio></li> : null}
      </ul>
    </li>
  )
}

function Pessoa({ nome, v, visao, extra }: { nome: string; v: PrevistoRealizado; visao: VisaoDre; extra?: ReactNode }) {
  return (
    <li className="fin-row flex items-start justify-between gap-3 px-4 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-ink">{nome}</p>
        {extra ? <p className="num mt-0.5 text-[11px] text-ink-muted">{extra}</p> : null}
      </div>
      <Valor v={v} visao={visao} />
    </li>
  )
}

// ── Conteúdo ─────────────────────────────────────────────────────────────────

function Resumo({ d, visao }: { d: DreMesDetalheResponse; visao: VisaoDre }) {
  const mesAnt = shiftMes(d.mes, -1)
  const ant = d.anterior
  const cards: { chave: keyof DreDeltas; label: string; v: PrevistoRealizado; ant: PrevistoRealizado | null; sinal: string }[] = [
    { chave: 'receita', label: 'Receita', v: d.receita.total, ant: ant?.receita ?? null, sinal: '+' },
    { chave: 'custos_fixos', label: 'Custos fixos', v: d.custos_fixos.total, ant: ant?.custos_fixos ?? null, sinal: '−' },
    { chave: 'custos_variaveis', label: 'Custos variáveis', v: d.custos_variaveis.total, ant: ant?.custos_variaveis ?? null, sinal: '−' },
    { chave: 'resultado', label: 'Resultado', v: d.atual.resultado, ant: ant?.resultado ?? null, sinal: '=' },
  ]
  const receita = valorVisao(d.receita.total, visao)
  const margemLiq = margemPct(valorVisao(d.atual.resultado, visao), receita)
  const margemContrib = valorVisao(d.margem.pct, visao)
  const perdas = d.atual.perdas.receita
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5">
        {cards.map((c) => {
          const main = valorVisao(c.v, visao)
          return (
            <div key={c.chave} className={clsx('design-card p-3', c.chave === 'resultado' && 'ring-1 ring-[var(--border-strong)]')}>
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
                <span className="num" aria-hidden>{c.sinal}</span>
                {c.label}
              </p>
              <p className={clsx('num mt-1.5 text-lg font-bold tracking-[-0.02em]', c.chave === 'resultado' && main < 0 ? 'text-[var(--danger)]' : 'text-ink')}>
                {formatMoney(main, true)}
              </p>
              {visao === 'ambos' ? <p className="num text-[11px] text-ink-muted">previsto {formatMoney(c.v.previsto, true)}</p> : null}
              <div className="mt-1.5">
                <DeltaChip chave={c.chave} delta={d.delta[c.chave]} anterior={c.ant} visao={visao} mesAnt={mesAnt} />
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 rounded-[var(--radius-control)] border border-line px-3 py-2 text-xs text-ink-muted">
        <span>
          Margem líquida <strong className={clsx('num', margemLiq < 0 ? 'text-[var(--danger)]' : 'text-ink')}>{formatPercent(margemLiq)}</strong>
        </span>
        {perdas > 0 ? (
          <span>
            Receita perdida <strong className="num text-[var(--danger)]">− {formatMoney(perdas, true)}</strong>
            <span className="text-ink-muted"> (desconta só do resultado previsto)</span>
          </span>
        ) : null}
        <span>
          Margem de contribuição <strong className="num text-ink">{formatPercent(margemContrib)}</strong>
          <span className="num"> ({formatMoney(valorVisao(d.margem.contribuicao, visao), true)})</span>
        </span>
      </div>
    </div>
  )
}

function Conteudo({ d, visao }: { d: DreMesDetalheResponse; visao: VisaoDre }) {
  const totalReceita = valorVisao(d.receita.total, visao)
  const perdidos = d.encerrados.filter((i) => i.status === 'perdido')
  const cancelados = d.encerrados.filter((i) => i.status === 'cancelado')
  const temPerdas = d.atual.perdas.receita > 0 || perdidos.length > 0
  const imp = d.custos_variaveis.imposto
  const totalAvulsas = d.receita.avulsas.reduce((s, i) => pr(s.previsto + i.previsto, s.realizado + i.realizado), pr(0, 0))
  const totalAportes = d.aportes.reduce((s, i) => pr(s.previsto + i.previsto, s.realizado + i.realizado), pr(0, 0))
  const apFixo = d.custos_fixos.apresentadoras_fixo
  const apVar = d.custos_variaveis.apresentadoras_variavel
  const somaPessoas = (ps: { previsto: number; realizado: number }[]) => ps.reduce((s, p) => pr(s.previsto + p.previsto, s.realizado + p.realizado), pr(0, 0))

  return (
    <div className="space-y-3">
      <Resumo d={d} visao={visao} />

      <Secao
        titulo="Receita"
        total={d.receita.total}
        visao={visao}
        nota={temPerdas ? 'O previsto da receita não muda: o que o cliente não vai pagar aparece na linha própria “Receita perdida” e desconta apenas do resultado previsto.' : undefined}
      >
        <SubTitulo visao={visao}>Por cliente</SubTitulo>
        {d.receita.por_cliente.length ? (
          <ul className="divide-y divide-[var(--hairline)]">
            {d.receita.por_cliente.map((c) => <Cliente key={c.cliente_id} c={c} visao={visao} totalReceita={totalReceita} />)}
          </ul>
        ) : (
          <Vazio>Nenhuma receita de marca no mês.</Vazio>
        )}
        <SubTitulo visao={visao} total={d.receita.avulsas.length ? totalAvulsas : undefined}>Receitas avulsas</SubTitulo>
        {d.receita.avulsas.length ? (
          <ul className="divide-y divide-[var(--hairline)]">{d.receita.avulsas.map((i) => <ItemLinha key={i.id} item={i} visao={visao} />)}</ul>
        ) : (
          <Vazio>Sem receitas avulsas.</Vazio>
        )}
        {d.atual.perdas.receita > 0 ? (
          <>
            <SubTitulo visao={visao} total={pr(d.atual.perdas.receita, 0)}>Receita perdida</SubTitulo>
            <Vazio>Saldo em aberto de títulos dados como perdidos (detalhes em “Perdidos e cancelados”).</Vazio>
          </>
        ) : null}
      </Secao>

      <Secao titulo="Custos fixos" total={d.custos_fixos.total} visao={visao} nota="Fixos = recorrentes, parcelas e o fixo das apresentadoras.">
        <Grupos grupos={d.custos_fixos.por_grupo} visao={visao} vazio="Sem custos fixos lançados." />
        <SubTitulo visao={visao} total={apFixo.length ? somaPessoas(apFixo) : undefined}>Apresentadoras · fixo</SubTitulo>
        {apFixo.length ? (
          <ul className="divide-y divide-[var(--hairline)]">
            {apFixo.map((p) => <Pessoa key={p.apresentadora_id} nome={p.nome} v={pr(p.previsto, p.realizado)} visao={visao} />)}
          </ul>
        ) : (
          <Vazio>Sem fixo de apresentadoras.</Vazio>
        )}
      </Secao>

      <Secao titulo="Custos variáveis" total={d.custos_variaveis.total} visao={visao} nota="Variáveis = custos pontuais, comissão e adicionais das apresentadoras e imposto.">
        <Grupos grupos={d.custos_variaveis.por_grupo} visao={visao} vazio="Sem custos variáveis lançados." />
        <SubTitulo visao={visao} total={apVar.length ? somaPessoas(apVar) : undefined}>Apresentadoras · comissão e adicionais</SubTitulo>
        {apVar.length ? (
          <ul className="divide-y divide-[var(--hairline)]">
            {apVar.map((p) => (
              <Pessoa
                key={p.apresentadora_id}
                nome={p.nome}
                v={pr(p.previsto, p.realizado)}
                visao={visao}
                extra={`comissão ${formatMoney(p.comissao, true)} · adicionais ${formatMoney(p.adicionais, true)}`}
              />
            ))}
          </ul>
        ) : (
          <Vazio>Sem comissão de apresentadoras.</Vazio>
        )}
        <SubTitulo visao={visao} total={imp}>Imposto</SubTitulo>
        <dl className="grid grid-cols-3 gap-3 px-4 py-3 text-[11px]">
          <div>
            <dt className="text-ink-muted">Base{imp.base_tipo ? ` (${imp.base_tipo})` : ''}</dt>
            <dd className="num mt-0.5 text-[13px] font-medium text-ink">{formatMoney(imp.base, true)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Mês-base</dt>
            <dd className="mt-0.5 text-[13px] font-medium text-ink first-letter:uppercase">{imp.mes_base ? mesLabel(imp.mes_base, true) : '—'}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Alíquota</dt>
            <dd className="num mt-0.5 text-[13px] font-medium text-ink">{formatPercent(imp.aliquota)}</dd>
          </div>
        </dl>
      </Secao>

      {d.encerrados.length ? (
        <Secao
          titulo="Perdidos e cancelados"
          visao={visao}
          nota="Perdido = receita que o cliente não vai pagar (linha “Receita perdida” do DRE; o previsto não muda). Cancelado = custo que não será mais pago (sai do previsto de custos). O valor pago, se houver, continua contando."
        >
          <SubTitulo visao={visao} total={perdidos.length ? pr(d.atual.perdas.receita, 0) : undefined}>Receitas perdidas</SubTitulo>
          {perdidos.length ? <ul className="divide-y divide-[var(--hairline)]">{perdidos.map((i) => <ItemLinha key={i.id} item={i} visao={visao} />)}</ul> : <Vazio>Nenhuma receita perdida.</Vazio>}
          <SubTitulo visao={visao}>Custos cancelados</SubTitulo>
          {cancelados.length ? <ul className="divide-y divide-[var(--hairline)]">{cancelados.map((i) => <ItemLinha key={i.id} item={i} visao={visao} />)}</ul> : <Vazio>Nenhum custo cancelado.</Vazio>}
        </Secao>
      ) : null}

      {d.caixa ? (
        <Secao titulo="Caixa" visao={visao} nota="Informativo: o saldo de caixa fica fora do DRE e não entra no resultado.">
          <dl className="grid gap-3 px-4 py-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-ink-muted">Saldo de caixa no início do mês</dt>
              <dd className={clsx('num mt-0.5 text-[13px] font-medium', d.caixa.saldo_inicio_mes < 0 ? 'text-[var(--danger)]' : 'text-ink')}>{formatMoney(d.caixa.saldo_inicio_mes, true)}</dd>
            </div>
            {textoAberturaCaixa(d.caixa, d.mes, (v) => formatMoney(v, true)) ? (
              <div>
                <dt className="text-xs text-ink-muted">Configuração</dt>
                <dd className="mt-0.5 text-[13px] font-medium text-ink">{textoAberturaCaixa(d.caixa, d.mes, (v) => formatMoney(v, true))}</dd>
              </div>
            ) : null}
          </dl>
        </Secao>
      ) : null}

      <Secao titulo="Aportes" total={d.aportes.length ? totalAportes : undefined} visao={visao} defaultOpen={d.aportes.length > 0} nota="Aportes não são receita operacional: ficam fora do resultado.">
        {d.aportes.length ? (
          <ul className="divide-y divide-[var(--hairline)]">{d.aportes.map((i) => <ItemLinha key={i.id} item={i} visao={visao} />)}</ul>
        ) : (
          <Vazio>Sem aportes no mês.</Vazio>
        )}
      </Secao>
    </div>
  )
}

// ── Inline ───────────────────────────────────────────────────────────────────

function DetalheSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Carregando detalhe do mês</span>
      <div className="grid grid-cols-2 gap-2.5">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface-muted" aria-hidden />
        ))}
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-2xl bg-surface-muted" aria-hidden />
      ))}
    </div>
  )
}

/**
 * Detalhe de um mês do DRE (GET /financeiro/dre/mes) renderizado inline, logo abaixo da linha do mês
 * na tabela anual. Sem overlay: a visão (real × previsto) vem do painel que o contém.
 */
export function DreMesInline({ mes, visao }: { mes: string; visao: VisaoDre }) {
  const q = useDreMes(mes)
  const d = q.data
  return (
    <div className="min-w-0 space-y-3" data-testid={`dre-detalhe-${mes}`}>
      {q.isFetching && d ? <p className="text-[11px] text-ink-muted" aria-live="polite">atualizando…</p> : null}
      {q.isLoading && !d ? (
        <DetalheSkeleton />
      ) : q.isError && !d ? (
        <ErrorState message={extractErrorMessage(q.error)} onRetry={() => void q.refetch()} />
      ) : d && detalheVazio(d) ? (
        <EmptyState title="Mês sem movimento" description="Nenhuma receita, custo ou aporte com competência neste mês." />
      ) : d ? (
        <Conteudo d={d} visao={visao} />
      ) : null}
      <p className="text-[11px] text-ink-muted">
        Regime de competência. Resultado = receita − receita perdida − custos fixos − custos variáveis (imposto incluso). Aportes ficam fora.
      </p>
    </div>
  )
}
