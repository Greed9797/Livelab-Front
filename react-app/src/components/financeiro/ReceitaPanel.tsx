// Aba Receita do Financeiro (substitui "Por cliente"). Fonte: GET /financeiro/receita?mes= —
// mesma base do DRE (condições comerciais vigentes), não o GMV de lives encerradas.
// Competência (padrão) = o ganho do mês, bate com DRE.receita.previsto.
// Vencimento = o que cai no caixa no mês, bate com as entradas do fluxo de caixa.
import clsx from 'clsx'
import { useMutation } from '@tanstack/react-query'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  CircleDollarSign,
  Hourglass,
  Ban,
  Info,
  Landmark,
  Pencil,
  Plus,
  Sparkles,
  RotateCcw,
  Search,
  Undo2,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { type ReactNode, useMemo, useState } from 'react'
import { useBaixaMutation, useInvalidateFinanceiro } from '../../hooks/useFinanceiro'
import { useReceitaMensal } from '../../hooks/useReceitaMensal'
import { extractErrorMessage } from '../../services/api'
import { gerarTitulosReceita } from '../../services/financeiro-receita'
import type { Lancamento } from '../../types/financeiro'
import type { LancamentoReceita, ReceitaCliente, ReceitaMarca, ReceitaMensal, TituloReceita, VisaoReceita } from '../../types/financeiro-receita'
import { textoCorte } from '../../utils/caixa'
import { acoesPerda, formatDataCurta, grupoLabel, mesLabel, partesData, valorEmAberto } from '../../utils/financeiro'
import { formatMoney } from '../../utils/format'
import {
  agruparPorVencimento,
  avisoMarcaNaoCliente,
  contextoTitulo,
  filtrarClientes,
  formatPct,
  isAporte,
  isPerdido,
  labelTipoCobranca,
  motivoPerda,
  notaCompetenciaVencimento,
  janelaInicioDia,
  notaFixoOuComissao,
  notaJanelaComissao,
  pctRecebido,
  receitaVazia,
  rotuloComponente,
  totaisDaVisao,
  chaveClienteReceita,
  complementoMarcaUnica,
  marcaUnicaDoCliente,
  nomeLinhaCliente,
} from '../../utils/receita-mensal'
import { Button } from '../ui/Button'
import { EmptyState, ErrorState } from '../ui/States'
import { useToast } from '../ui/Toast'
import { BaixaModal, DesfazerModal } from './LancamentoModals'
import { PerdaModal } from './PerdaModal'
import { type ReceitaModalState, ReceitaAvulsaModal } from './ReceitaAvulsaModal'
import { ProgressBar, Segmented, StatusChip } from './primitives'
import './financeiro.css'

type Acoes = {
  podeEscrever: boolean
  onBaixar: (l: Lancamento) => void
  onDesfazer: (l: Lancamento) => void
  onPerda: (l: Lancamento, modo: 'perder' | 'desfazer') => void
}

// ── Resumo ───────────────────────────────────────────────────────────────────

function Tile({
  label,
  value,
  hint,
  icon: Icon,
  color,
  soft,
  destaque,
  children,
}: {
  label: string
  value: number
  hint: string
  icon: LucideIcon
  color: string
  soft: string
  destaque?: boolean
  children?: ReactNode
}) {
  return (
    <div
      className={clsx('fin-rise flex min-w-0 flex-col gap-2 p-4 sm:p-5', destaque ? 'design-panel col-span-2 lg:col-span-1' : 'design-card')}
      aria-label={`${label}: ${formatMoney(value, true)}`}
      role="group"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">{label}</span>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl" style={{ background: soft, color }}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className="num break-words text-[20px] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[26px] sm:leading-none">
        {formatMoney(value, true)}
      </p>
      {children}
      <p className="text-xs text-ink-muted">{hint}</p>
    </div>
  )
}

function ResumoReceita({ data, visao }: { data: ReceitaMensal; visao: VisaoReceita }) {
  const t = totaisDaVisao(data, visao)
  const nomeMes = mesLabel(data.mes).split(' de ')[0]
  const base = visao === 'competencia' ? `competência de ${nomeMes}` : `vencendo em ${nomeMes}`
  return (
    <section aria-label="Totais da receita" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      <Tile destaque label="Previsto" value={t.previsto} hint={base} icon={CircleDollarSign} color="var(--primary)" soft="var(--primary-soft)">
        <ProgressBar value={t.pago} max={t.previsto} color="var(--success)" label="Recebido sobre o previsto" />
      </Tile>
      <Tile label="Recebido" value={t.pago} hint={`${pctRecebido(t)}% do previsto`} icon={Wallet} color="var(--success)" soft="var(--success-soft)" />
      <Tile
        label="Em aberto"
        value={t.aberto}
        hint={t.perdido > 0 ? 'previsto − recebido − perdido' : 'previsto − recebido'}
        icon={Hourglass}
        color="var(--warning)"
        soft="var(--warning-soft)"
      />
      {t.perdido > 0 ? (
        <p
          className="col-span-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-line bg-surface-muted px-4 py-2.5 text-xs text-[var(--text-secondary)] lg:col-span-3"
          aria-label={`Perdido: ${formatMoney(t.perdido, true)}`}
        >
          <Ban className="h-4 w-4 shrink-0 text-[var(--danger)]" aria-hidden />
          <strong className="text-ink">Perdido</strong>
          <span className="num font-bold text-ink">{formatMoney(t.perdido, true)}</span>
          <span className="text-ink-muted">
            — saldo de títulos dados como perdidos. O previsto não muda; sai do “em aberto” e aparece como “Receita perdida” no DRE.
          </span>
        </p>
      ) : null}
    </section>
  )
}

function NotaCompetencia({ mes }: { mes: string }) {
  const n = notaCompetenciaVencimento(mes)
  return (
    <aside className="flex gap-3 rounded-2xl border border-line bg-surface-muted px-4 py-3 text-xs text-[var(--text-secondary)]" aria-label="Competência × vencimento">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--info)]" aria-hidden />
      <p>
        <strong className="text-ink">Competência</strong> × <strong className="text-ink">vencimento.</strong> {n.competencia} {n.vencimento}{' '}
        <span className="text-ink-muted">{n.exemplo}</span>
      </p>
    </aside>
  )
}

// ── Ações de baixa ───────────────────────────────────────────────────────────

function BaixaBotoes({ l, podeEscrever, onBaixar, onDesfazer, onPerda, onEditar }: Acoes & { l: Lancamento; onEditar?: (l: Lancamento) => void }) {
  if (!podeEscrever) return null
  const perdido = isPerdido(l)
  // Aporte não perde (SPEC); acoesPerda (FA) decide o resto (título 100% pago, etc.).
  const perda = isAporte(l) ? null : acoesPerda(l)
  return (
    <div className="flex items-center justify-end gap-1">
      {perdido && perda?.podeDesfazer ? (
        <button
          type="button"
          onClick={() => onPerda(l, 'desfazer')}
          className="inline-flex h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-xs font-bold sm:h-9 sm:px-3 text-ink transition hover:border-[var(--info)] hover:bg-[var(--info-soft)] hover:text-[var(--info)] focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
          aria-label={`Desfazer perda: ${l.descricao}`}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Desfazer perda
        </button>
      ) : null}
      {!perdido && l.status !== 'pago' ? (
        <button
          type="button"
          onClick={() => onBaixar(l)}
          className="inline-flex h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-xs font-bold sm:h-9 sm:px-3 text-ink transition hover:border-[var(--success)] hover:bg-[var(--success-soft)] hover:text-[var(--success)] focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
          aria-label={`Receber: ${l.descricao}`}
        >
          <Check className="h-3.5 w-3.5" aria-hidden /> Receber
        </button>
      ) : null}
      {!perdido && perda?.podePerder ? (
        <button
          type="button"
          onClick={() => onPerda(l, 'perder')}
          className="grid h-11 w-11 place-items-center sm:h-9 sm:w-9 rounded-full text-ink-muted transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
          aria-label={`Dar como perdida: ${l.descricao}`}
          title="Dar como perdida"
        >
          <Ban className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
      {!perdido && l.valor_pago > 0 ? (
        <button
          type="button"
          onClick={() => onDesfazer(l)}
          className="grid h-11 w-11 place-items-center sm:h-9 sm:w-9 rounded-full text-ink-muted transition hover:bg-surface-muted hover:text-ink focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
          aria-label={`Desfazer recebimento: ${l.descricao}`}
          title="Desfazer recebimento"
        >
          <Undo2 className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
      {onEditar ? (
        <button
          type="button"
          onClick={() => onEditar(l)}
          className="grid h-11 w-11 place-items-center sm:h-9 sm:w-9 rounded-full text-ink-muted transition hover:bg-surface-muted hover:text-ink focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
          aria-label={`Editar: ${l.descricao}`}
          title="Editar"
        >
          <Pencil className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  )
}

/** Registro da perda: quando e por quê (linha visível; o motivo também vai no tooltip). */
function InfoPerda({ l }: { l: LancamentoReceita }) {
  const motivo = motivoPerda(l)
  const em = l.perdido_em ? formatDataCurta(l.perdido_em.slice(0, 10)) : null
  return (
    <span className="mt-0.5 block text-[11px] text-[var(--danger)]" title={motivo ? `Motivo: ${motivo}` : 'Sem motivo informado'}>
      Perdido{em ? ` em ${em}` : ''} · {motivo ? `motivo: ${motivo}` : 'sem motivo informado'}
    </span>
  )
}

function ValorTitulo({ l }: { l: Lancamento }) {
  const aberto = valorEmAberto(l)
  if (isPerdido(l)) {
    return (
      <div className="text-right">
        <p className="num text-sm font-bold text-ink-muted line-through decoration-1">{formatMoney(l.valor_previsto, true)}</p>
        <p className="num text-[11px] text-ink-muted">
          {l.valor_pago > 0 ? `recebido ${formatMoney(l.valor_pago, true)} · ` : ''}perdido {formatMoney(aberto, true)}
        </p>
      </div>
    )
  }
  return (
    <div className="text-right">
      <p className="num text-sm font-bold text-ink">{formatMoney(l.valor_previsto, true)}</p>
      {l.valor_pago > 0 ? (
        <p className="num text-[11px] text-ink-muted">
          recebido {formatMoney(l.valor_pago, true)}
          {aberto > 0 ? ` · falta ${formatMoney(aberto, true)}` : ''}
        </p>
      ) : null}
    </div>
  )
}

// ── Competência: cliente → marcas ────────────────────────────────────────────

function TituloLinha({ t, ...acoes }: Acoes & { t: TituloReceita }) {
  return (
    <li
      className={clsx(
        'fin-row grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:grid-cols-[7.5rem_1fr_auto_auto_auto] sm:px-5',
        isPerdido(t) && 'opacity-70',
      )}
      data-status={t.status}
    >
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          {rotuloComponente(t.componente)}
          {t.divergente ? (
            <AlertTriangle className="h-3.5 w-3.5 text-[var(--warning)]" aria-label="Valor recebido diverge do previsto" />
          ) : null}
        </p>
        <p className="text-[11px] text-ink-muted">
          vence {formatDataCurta(t.data_vencimento)}
          {t.status === 'pago' && t.data_pagamento ? ` · recebido em ${formatDataCurta(t.data_pagamento)}` : ''}
        </p>
        {isPerdido(t) ? <InfoPerda l={t} /> : null}
      </div>
      <span className="hidden sm:block" aria-hidden />
      <StatusChip status={t.status} natureza="receita" className="justify-self-start sm:justify-self-end" />
      <ValorTitulo l={t} />
      <div className="col-span-2 sm:col-span-1">
        <BaixaBotoes l={t} {...acoes} />
      </div>
    </li>
  )
}

function ApuracaoLinha({ m }: { m: ReceitaMarca }) {
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-2.5 sm:px-5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">Comissão</p>
        <p className="text-[11px] text-ink-muted">
          GMV até hoje × {formatPct(m.pct)}
          {m.comissao_bruta !== null ? ` = ${formatMoney(m.comissao_bruta, true)}` : ''} · título gerado no fechamento
        </p>
      </div>
      <span
        className="inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-bold uppercase tracking-[0.05em]"
        style={{ color: 'var(--info)', background: 'var(--info-soft)' }}
      >
        <Hourglass className="h-3 w-3" aria-hidden /> Em apuração
      </span>
    </li>
  )
}

/** `semNome`: cliente com uma marca só — a marca não é aninhada (o card já é a linha dela). */
function MarcaBloco({ m, semNome = false, ...acoes }: Acoes & { m: ReceitaMarca; semNome?: boolean }) {
  const nota = notaFixoOuComissao(m)
  const avisoTipo = avisoMarcaNaoCliente(m)
  const notaJanela = janelaInicioDia(m) !== 1 ? notaJanelaComissao(m) : null
  const semTitulos = !m.fixo && !m.comissao && !m.em_apuracao
  return (
    <li className="border-t border-[var(--hairline)] first:border-t-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 pt-3 sm:px-5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {semNome ? null : <h4 className="truncate text-sm font-bold text-ink">{m.marca_nome}</h4>}
          <span className="rounded-md bg-surface-muted px-1.5 py-0.5 text-[11px] font-semibold text-ink-muted">{labelTipoCobranca(m.tipo_cobranca)}</span>
        </div>
        <dl className="num flex gap-4 text-xs text-ink-muted">
          <div className="flex gap-1">
            <dt>GMV</dt>
            <dd className="font-semibold text-ink">{formatMoney(m.gmv)}</dd>
          </div>
          <div className="flex gap-1">
            <dt>Comissão</dt>
            <dd className="font-semibold text-ink">{formatPct(m.pct)}</dd>
          </div>
        </dl>
      </div>
      {nota ? <p className="px-4 pt-1 text-[11px] text-[var(--text-secondary)] sm:px-5">{nota}</p> : null}
      {avisoTipo ? (
        <p role="note" className="flex items-start gap-1.5 px-4 pt-1 text-[11px] font-semibold text-[var(--warning)] sm:px-5">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          {avisoTipo}
        </p>
      ) : null}
      {notaJanela ? <p className="px-4 pt-1 text-[11px] text-[var(--text-secondary)] sm:px-5">{notaJanela}</p> : null}
      <ul className="pb-1" aria-label={`Títulos de ${m.marca_nome}`}>
        {m.fixo ? <TituloLinha t={m.fixo} {...acoes} /> : null}
        {m.comissao ? <TituloLinha t={m.comissao} {...acoes} /> : m.em_apuracao ? <ApuracaoLinha m={m} /> : null}
        {semTitulos ? <li className="px-4 py-2.5 text-xs text-ink-muted sm:px-5">Sem títulos neste mês.</li> : null}
      </ul>
    </li>
  )
}

function ClienteCard({ c, aberto, onToggle, ...acoes }: Acoes & { c: ReceitaCliente; aberto: boolean; onToggle: () => void }) {
  const corpoId = `receita-cliente-${chaveClienteReceita(c)}`.replace(/[^\w-]+/g, '-')
  // Cliente com uma marca só: uma linha (sem aninhar a marca dentro do cliente).
  const unica = marcaUnicaDoCliente(c)
  const titulo = nomeLinhaCliente(c)
  const complemento = unica ? complementoMarcaUnica(titulo, unica.marca_nome) : null
  return (
    <article className="design-card overflow-hidden">
      <h3>
        <button
          type="button"
          aria-expanded={aberto}
          aria-controls={corpoId}
          onClick={onToggle}
          className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-left transition hover:bg-surface-muted focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-brand/20 sm:px-5"
        >
          <ChevronDown className={clsx('h-4 w-4 shrink-0 text-ink-muted transition-transform', !aberto && '-rotate-90')} aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-bold text-ink">{titulo}</span>
            <span className="block text-xs font-normal text-ink-muted">
              {unica
                ? `${complemento ? `${complemento} · ` : ''}${pctRecebido(c.total)}% recebido`
                : `${c.marcas.length} marca${c.marcas.length === 1 ? '' : 's'} · ${pctRecebido(c.total)}% recebido`}
            </span>
          </span>
          <span className="num ml-auto text-right">
            <span className="block text-sm font-bold text-ink">{formatMoney(c.total.previsto, true)}</span>
            <span className="block text-[11px] font-normal text-ink-muted">recebido {formatMoney(c.total.pago, true)}</span>
          </span>
        </button>
      </h3>
      {aberto ? (
        <ul id={corpoId} className="border-t border-line">
          {unica ? (
            <MarcaBloco m={unica} semNome {...acoes} />
          ) : c.marcas.map((m) => (
            <MarcaBloco key={m.marca_id || m.marca_nome} m={m} {...acoes} />
          ))}
        </ul>
      ) : null}
    </article>
  )
}

function AvulsaLinha({ l, onEditar, ...acoes }: Acoes & { l: LancamentoReceita; onEditar?: (l: Lancamento) => void }) {
  return (
    <li
      className={clsx('fin-row flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:flex-nowrap sm:px-5', isPerdido(l) && 'opacity-70')}
      data-status={l.status}
    >
      <div className="min-w-0 flex-1 basis-full sm:basis-auto">
        <p className="truncate text-sm font-semibold text-ink">{l.descricao}</p>
        <p className="text-[11px] text-ink-muted">
          {grupoLabel(l.grupo)} · vence {formatDataCurta(l.data_vencimento)}
          {l.status === 'pago' && l.data_pagamento ? ` · recebido em ${formatDataCurta(l.data_pagamento)}` : ''}
        </p>
        {isPerdido(l) ? <InfoPerda l={l} /> : null}
      </div>
      <StatusChip status={l.status} natureza="receita" />
      <div className="ml-auto sm:ml-0 sm:w-36">
        <ValorTitulo l={l} />
      </div>
      <BaixaBotoes l={l} {...acoes} onEditar={onEditar} />
    </li>
  )
}

function BlocoLista({
  titulo,
  destaque,
  descricao,
  total,
  acao,
  vazio,
  children,
}: {
  titulo: string
  destaque: string
  descricao: string
  total: number
  acao?: ReactNode
  vazio: string
  children: ReactNode[]
}) {
  return (
    <section className="design-card overflow-hidden" aria-label={`${titulo} ${destaque}`}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-ink">
            {titulo} <span className="serif font-normal text-brand">{destaque}</span>
          </h3>
          <p className="mt-0.5 text-xs text-ink-muted">{descricao}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="num text-sm font-bold text-ink">{formatMoney(total, true)}</span>
          {acao}
        </div>
      </header>
      {children.length ? <ul className="divide-y divide-[var(--hairline)]">{children}</ul> : <p className="px-4 py-4 text-sm text-ink-muted sm:px-5">{vazio}</p>}
    </section>
  )
}

function VisaoCompetencia({
  data,
  busca,
  onNovaReceita,
  onEditarAvulsa,
  ...acoes
}: Acoes & { data: ReceitaMensal; busca: string; onNovaReceita: () => void; onEditarAvulsa: (l: Lancamento) => void }) {
  const [fechados, setFechados] = useState<Set<string>>(() => new Set())
  const clientes = useMemo(() => filtrarClientes(data.competencia.clientes, busca), [data.competencia.clientes, busca])
  const { avulsas, aportes } = data.competencia
  const toggle = (id: string) =>
    setFechados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const somaPrev = (ls: Lancamento[]) => ls.reduce((acc, l) => acc + l.valor_previsto, 0)
  const editar = acoes.podeEscrever ? onEditarAvulsa : undefined

  return (
    <div className="space-y-4">
      <section aria-label="Receita por cliente" className="space-y-3">
        <h3 className="sr-only">Por cliente</h3>
        {clientes.length ? (
          clientes.map((c) => {
            const key = chaveClienteReceita(c)
            return <ClienteCard key={key} c={c} aberto={!fechados.has(key)} onToggle={() => toggle(key)} {...acoes} />
          })
        ) : (
          <EmptyState
            title={busca ? 'Nenhum cliente ou marca com esse nome' : 'Nenhuma receita de cliente nesta competência'}
            description={busca ? 'Ajuste a busca para ver mais.' : 'Fixos e comissões vêm das condições comerciais vigentes das marcas (Comercial).'}
          />
        )}
      </section>

      <BlocoLista
        titulo="Receitas"
        destaque="avulsas"
        descricao="Serviços, reembolsos e outras entradas lançadas à mão — entram na receita do mês."
        total={somaPrev(avulsas)}
        vazio="Nenhuma receita avulsa neste mês."
        acao={
          acoes.podeEscrever ? (
            <Button variant="secondary" icon={Plus} onClick={onNovaReceita} className="h-9 min-h-11 sm:min-h-0">
              Nova receita
            </Button>
          ) : undefined
        }
      >
        {avulsas.map((l) => (
          <AvulsaLinha key={l.id} l={l} onEditar={editar} {...acoes} />
        ))}
      </BlocoLista>

      <BlocoLista
        titulo="Aportes"
        destaque="fora da receita"
        descricao="Dinheiro que entra no caixa sem ser ganho operacional — não soma na receita nem no resultado do DRE."
        total={somaPrev(aportes)}
        vazio="Nenhum aporte neste mês."
      >
        {aportes.map((l) => (
          <AvulsaLinha key={l.id} l={l} onEditar={editar} {...acoes} />
        ))}
      </BlocoLista>
    </div>
  )
}

// ── Vencimento: lista por dia ────────────────────────────────────────────────

function VisaoVencimento({ data, ...acoes }: Acoes & { data: ReceitaMensal }) {
  const grupos = agruparPorVencimento(data.vencimento.itens)
  if (!grupos.length) {
    return <EmptyState title="Nada vence neste mês" description="Nenhum título ou receita avulsa com vencimento no mês selecionado." />
  }
  return (
    <section className="design-card overflow-hidden" aria-label="Receitas por vencimento">
      <ol className="divide-y divide-[var(--border)]">
        {grupos.map((g) => {
          const p = g.data ? partesData(g.data) : null
          const isHoje = g.data === data.hoje
          return (
            <li key={g.data ?? 'sem-data'}>
              <div className="flex items-center justify-between gap-3 bg-[color-mix(in_srgb,var(--bg-elev-3)_55%,transparent)] px-4 py-2 sm:px-5">
                {p ? (
                  <div className="flex items-baseline gap-2">
                    <span className={clsx('fin-daystamp text-2xl leading-none', isHoje ? 'text-brand' : 'text-ink')}>{p.dia}</span>
                    <span className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-muted">
                      {p.semana} · {p.mes}
                      {isHoje ? <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] text-brand">hoje</span> : null}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-muted">Sem vencimento</span>
                )}
                <span className="num text-xs font-semibold text-[var(--success)]">+ {formatMoney(g.previsto)}</span>
              </div>
              <ul className="divide-y divide-[var(--hairline)]">
                {g.itens.map((l) => {
                  const comercial = l.origem !== 'avulsa'
                  const meta = comercial
                    ? [l.cliente_nome, l.marca_nome, l.componente === 'fixo' || l.componente === 'comissao' ? rotuloComponente(l.componente) : null]
                    : [isAporte(l) ? 'Aporte (fora da receita)' : `Receita avulsa · ${grupoLabel(l.grupo)}`]
                  return (
                    <li
                      key={l.id}
                      className={clsx('fin-row flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:flex-nowrap sm:px-5', isPerdido(l) && 'opacity-70')}
                      data-status={l.status}
                    >
                      <span
                        aria-hidden
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl"
                        style={{ background: isAporte(l) ? 'var(--primary-soft)' : 'var(--success-soft)', color: isAporte(l) ? 'var(--primary)' : 'var(--success)' }}
                      >
                        {isAporte(l) ? <Landmark className="h-4 w-4" /> : <CircleDollarSign className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1 basis-[calc(100%-3rem)] sm:basis-auto">
                        <p className="truncate text-sm font-semibold text-ink">{l.descricao}</p>
                        <p className="truncate text-[11px] text-ink-muted">
                          {[...meta, contextoTitulo(l)].filter(Boolean).join(' · ')}
                        </p>
                        {isPerdido(l) ? <InfoPerda l={l} /> : null}
                      </div>
                      <StatusChip status={l.status} natureza="receita" />
                      <div className="ml-auto sm:ml-0 sm:w-36">
                        <ValorTitulo l={l} />
                      </div>
                      <BaixaBotoes l={l} {...acoes} />
                    </li>
                  )
                })}
              </ul>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

// ── Estados ──────────────────────────────────────────────────────────────────

function ReceitaSkeleton() {
  const bar = 'rounded-full bg-surface-muted animate-pulse motion-reduce:animate-none'
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="space-y-4">
      <span className="sr-only">Carregando receita do mês</span>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={clsx('design-card space-y-3 p-4 sm:p-5', i === 0 && 'col-span-2 lg:col-span-1')}>
            <span className={clsx(bar, 'block h-3 w-24')} />
            <span className={clsx(bar, 'block h-7 w-32')} />
            <span className={clsx(bar, 'block h-2 w-full')} />
          </div>
        ))}
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="design-card space-y-3 p-4 sm:p-5" aria-hidden>
          <div className="flex justify-between gap-4">
            <span className={clsx(bar, 'block h-4 w-40')} />
            <span className={clsx(bar, 'block h-4 w-24')} />
          </div>
          <span className={clsx(bar, 'block h-3 w-3/4')} />
          <span className={clsx(bar, 'block h-3 w-2/3')} />
        </div>
      ))}
    </div>
  )
}

// ── Painel ───────────────────────────────────────────────────────────────────

export function ReceitaPanel({ mes, podeEscrever }: { mes: string; podeEscrever: boolean }) {
  const query = useReceitaMensal(mes)
  const [visao, setVisao] = useState<VisaoReceita>('competencia')
  const [busca, setBusca] = useState('')
  const [baixa, setBaixa] = useState<Lancamento | null>(null)
  const [desfazer, setDesfazer] = useState<Lancamento | null>(null)
  const [receitaModal, setReceitaModal] = useState<ReceitaModalState | null>(null)
  const [perda, setPerda] = useState<{ item: Lancamento; modo: 'perder' | 'desfazer' } | null>(null)
  const baixaMut = useBaixaMutation()
  const invalidate = useInvalidateFinanceiro()
  const toast = useToast()
  const gerarTitulos = useMutation({
    mutationFn: () => gerarTitulosReceita(mes),
    onSuccess: (raw) => {
      invalidate()
      const res = (raw ?? {}) as Record<string, unknown>
      const criados = Number(res.criados ?? 0)
      const atualizados = Number(res.atualizados ?? 0)
      const removidos = Number(res.removidos ?? 0)
      const perdidosPreservados = Number(res.perdidos_preservados ?? 0)
      toast.push(
        `Títulos gerados: ${criados} criado(s), ${atualizados} atualizado(s), ${removidos} removido(s), ${perdidosPreservados} perdido(s) preservado(s).`,
        'success',
      )
    },
    onError: (e) => toast.push(extractErrorMessage(e), 'error'),
  })

  const acoes: Acoes = {
    podeEscrever,
    onBaixar: (l) => {
      baixaMut.reset()
      setBaixa(l)
    },
    onDesfazer: (l) => {
      baixaMut.reset()
      setDesfazer(l)
    },
    onPerda: (item, modo) => setPerda({ item, modo }),
  }

  function confirmarBaixa(payload: { valor_pago: number; data_pagamento: string }) {
    if (!baixa) return
    baixaMut.mutate(
      { lancamento: baixa, acao: 'pagar', payload },
      {
        onSuccess: () => {
          toast.push(payload.valor_pago < baixa.valor_previsto ? 'Recebimento parcial registrado.' : 'Recebimento registrado.', 'success')
          setBaixa(null)
        },
      },
    )
  }

  function confirmarDesfazer() {
    if (!desfazer) return
    baixaMut.mutate(
      { lancamento: desfazer, acao: 'desfazer' },
      {
        onSuccess: () => {
          toast.push('Recebimento desfeito.', 'success')
          setDesfazer(null)
        },
      },
    )
  }

  const data = query.data
  const corte = textoCorte(data?.data_corte)

  let corpo: ReactNode
  if (query.isLoading && !data) corpo = <ReceitaSkeleton />
  else if (query.isError && !data) corpo = <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />
  else if (data) {
    corpo = (
      <>
        <ResumoReceita data={data} visao={visao} />
        <NotaCompetencia mes={data.mes} />
        {visao === 'competencia' && receitaVazia(data, 'competencia') && !busca ? (
          <EmptyState
            title={`Sem receita na competência de ${mesLabel(data.mes)}`}
            description="Nenhuma marca com condição comercial vigente, receita avulsa ou aporte neste mês."
          />
        ) : null}
        {visao === 'competencia' && !(receitaVazia(data, 'competencia') && !busca) ? (
          <VisaoCompetencia
            data={data}
            busca={busca}
            onNovaReceita={() => setReceitaModal({ kind: 'nova' })}
            onEditarAvulsa={(l) => setReceitaModal({ kind: 'editar', lancamento: l })}
            {...acoes}
          />
        ) : null}
        {visao === 'vencimento' ? <VisaoVencimento data={data} {...acoes} /> : null}
      </>
    )
  }

  return (
    <section className="space-y-4" aria-label={`Receita de ${mesLabel(mes)}`} aria-busy={query.isFetching || undefined}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-ink">
            Receita <span className="serif font-normal text-brand">{visao === 'competencia' ? 'por competência' : 'por vencimento'}</span>
          </h2>
          <p className="mt-0.5 text-xs text-ink-muted" aria-live="polite">
            {visao === 'competencia' ? 'O que foi ganho no mês — bate com a receita do DRE.' : 'O que cai no caixa no mês — bate com as entradas do fluxo de caixa.'}
            {query.isFetching && data ? ' · atualizando…' : ''}
          </p>
          {corte ? <p className="mt-0.5 text-xs text-ink-muted">{corte}</p> : null}
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {podeEscrever ? (
            <Button
              variant="secondary"
              icon={Sparkles}
              isLoading={gerarTitulos.isPending}
              disabled={gerarTitulos.isPending}
              onClick={() => {
                if (!window.confirm(`Gerar e reconciliar os títulos de receita de ${mesLabel(mes)}?`)) return
                gerarTitulos.mutate()
              }}
              title="Gera e reconcilia os títulos de receita do mês"
            >
              Gerar títulos
            </Button>
          ) : null}
          {visao === 'competencia' ? (
            <div className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
              <input
                type="search"
                aria-label="Buscar cliente ou marca"
                placeholder="Buscar cliente ou marca…"
                className="design-input h-11 w-full pl-9 pr-3 text-sm sm:h-9"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          ) : null}
          <Segmented<VisaoReceita>
            label="Visão da receita"
            size="sm"
            value={visao}
            onChange={setVisao}
            options={[
              { value: 'competencia', label: 'Competência' },
              { value: 'vencimento', label: 'Vencimento' },
            ]}
          />
        </div>
      </header>

      {corpo}

      <BaixaModal
        lancamento={baixa}
        onClose={() => setBaixa(null)}
        onConfirm={confirmarBaixa}
        isPending={baixaMut.isPending}
        error={baixaMut.error ? extractErrorMessage(baixaMut.error) : null}
      />
      <DesfazerModal
        lancamento={desfazer}
        onClose={() => setDesfazer(null)}
        onConfirm={confirmarDesfazer}
        isPending={baixaMut.isPending}
        error={baixaMut.error ? extractErrorMessage(baixaMut.error) : null}
      />
      {perda ? <PerdaModal item={perda.item} modo={perda.modo} onClose={() => setPerda(null)} /> : null}
      <ReceitaAvulsaModal state={receitaModal} mes={mes} onClose={() => setReceitaModal(null)} onSaved={(msg) => toast.push(msg, 'success')} />
    </section>
  )
}
