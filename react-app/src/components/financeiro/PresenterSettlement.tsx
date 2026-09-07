import { Download, ExternalLink, Gift, Trash2 } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { DataTable } from '../ui/DataTable'
import { Modal } from '../ui/Modal'
import { MoneyInput } from '../ui/MoneyInput'
import { EmptyState, ErrorState, LoadingState } from '../ui/States'
import { useToast } from '../ui/Toast'
import { createPresenterExtra, deletePresenterExtra, getPresenterSettlement, type PresenterExtra, type PresenterSettlementRow } from '../../services/remuneration'
import { extractErrorMessage } from '../../services/api'
import { formatDate, formatMoney } from '../../utils/format'
import { parseBRMoneyToDecimal } from '../../utils/money'
import type { RelatorioPdfInput } from '../../utils/pdfReport'
import { useCurrentUser } from '../../stores/auth-store'

const settlementKey = (tenantId: string, mes: string) => ['financeiro-fechamento-apresentadoras', tenantId, mes] as const
const VALID_MONTH = /^\d{4}-(?:0[1-9]|1[0-2])$/

function newBonusRequestId() {
  return globalThis.crypto.randomUUID()
}

/** Retorna datas-calendário locais; Date.UTC evita que sábado vire sexta no fuso americano. */
export function getMonthWeekendDates(mes: string): string[] {
  const match = /^(\d{4})-(\d{2})$/.exec(mes)
  if (!match) return []
  const year = Number(match[1])
  const month = Number(match[2])
  if (!Number.isInteger(year) || month < 1 || month > 12) return []
  const end = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const result: string[] = []
  for (let day = 1; day <= end; day += 1) {
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
    if (weekday === 0 || weekday === 6) result.push(`${match[1]}-${match[2]}-${String(day).padStart(2, '0')}`)
  }
  return result
}

export function monthLabel(mes: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(mes)
  if (!match) return mes
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)))
}

export function buildSettlementPdfInput(row: PresenterSettlementRow, mes: string): RelatorioPdfInput {
  return {
    titulo: `Fechamento mensal — ${row.nome}`,
    subtitulo: 'Remuneração da apresentadora',
    mes: monthLabel(mes),
    metrics: [
      { label: 'Fixo', value: formatMoney(row.fixo, true) },
      { label: 'Comissão', value: formatMoney(row.comissao, true) },
      { label: 'Extras', value: formatMoney(row.adicionais, true) },
      { label: 'Total a pagar', value: formatMoney(row.total, true) },
    ],
    tables: row.extras.length ? [{
      title: 'Adicionais confirmados',
      head: ['Tipo', 'Referência', 'Descrição', 'Valor'],
      rightAlign: [3],
      body: row.extras.map((extra) => [
        extra.tipo === 'fim_de_semana' ? 'Fim de semana' : 'Bonificação',
        extra.data_referencia ? formatDate(extra.data_referencia) : '—',
        extra.descricao,
        formatMoney(extra.valor, true),
      ]),
    }] : [],
    geradoEm: new Date().toLocaleString('pt-BR'),
  }
}

function weekendDescription(date: string) {
  return `Presença confirmada em ${formatDate(date)}`
}

function ExtraList({ extras, editable, onDelete, deletingId }: {
  extras: PresenterExtra[]
  editable: boolean
  deletingId?: string
  onDelete: (extra: PresenterExtra) => void
}) {
  if (!extras.length) return <p className="text-sm text-ink-muted">Nenhum adicional confirmado neste mês.</p>
  return (
    <ul className="divide-y divide-line rounded-xl border border-line">
      {extras.map((extra) => (
        <li key={extra.id} className="flex items-center gap-3 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">{extra.tipo === 'fim_de_semana' ? 'Fim de semana' : 'Bonificação'}{extra.data_referencia ? ` · ${formatDate(extra.data_referencia)}` : ''}</p>
            {extra.tipo === 'bonificacao' ? <p className="whitespace-pre-wrap break-words text-xs text-ink-muted">{extra.descricao}</p> : null}
          </div>
          <span className="num text-sm font-bold text-ink">{formatMoney(extra.valor, true)}</span>
          {editable ? <Button type="button" variant="ghost" size="icon" aria-label={`Remover ${extra.descricao}`} title="Remover adicional" isLoading={deletingId === extra.id} onClick={() => onDelete(extra)}><Trash2 className="h-4 w-4" /></Button> : null}
        </li>
      ))}
    </ul>
  )
}

function SettlementModal({ row, mes, editable, writeBlocked, onClose, onChanged }: {
  row: PresenterSettlementRow | null
  mes: string
  editable: boolean
  writeBlocked: boolean
  onClose: () => void
  onChanged: () => Promise<void>
}) {
  const toast = useToast()
  const [bonusDescription, setBonusDescription] = useState('')
  const [bonusValue, setBonusValue] = useState('')
  const [bonusRequestId, setBonusRequestId] = useState(newBonusRequestId)
  const [deletingId, setDeletingId] = useState<string>()
  const [exporting, setExporting] = useState(false)
  const weekends = useMemo(() => getMonthWeekendDates(mes), [mes])
  const weekendsByDate = new Map((row?.extras ?? [])
    .filter((extra) => extra.tipo === 'fim_de_semana' && extra.data_referencia)
    .map((extra) => [extra.data_referencia as string, extra]))

  useEffect(() => {
    setBonusDescription('')
    setBonusValue('')
    setBonusRequestId(newBonusRequestId())
  }, [row?.apresentadora_id, mes])

  const addExtra = useMutation({
    mutationFn: createPresenterExtra,
    onSuccess: async (_extra, variables) => {
      if (variables.tipo === 'bonificacao') {
        setBonusDescription('')
        setBonusValue('')
        setBonusRequestId(newBonusRequestId())
      }
      await onChanged()
    },
    onError: (error) => toast.push(extractErrorMessage(error), 'error'),
  })
  const removeExtra = useMutation({
    mutationFn: deletePresenterExtra,
    onSuccess: async () => {
      await onChanged()
    },
    onError: (error) => toast.push(extractErrorMessage(error), 'error'),
    onSettled: () => setDeletingId(undefined),
  })
  const busy = writeBlocked || addExtra.isPending || removeExtra.isPending

  function addWeekend(date: string) {
    if (!row || busy) return
    addExtra.mutate({ mes, apresentadora_id: row.apresentadora_id, tipo: 'fim_de_semana', data_referencia: date, descricao: weekendDescription(date) })
  }
  function submitBonus(event: FormEvent) {
    event.preventDefault()
    if (!row || busy) return
    const valor = parseBRMoneyToDecimal(bonusValue)
    if (!bonusDescription.trim() || valor <= 0) {
      toast.push('Informe a descrição e um valor maior que zero.', 'error')
      return
    }
    addExtra.mutate({ mes, apresentadora_id: row.apresentadora_id, tipo: 'bonificacao', descricao: bonusDescription.trim(), valor, request_id: bonusRequestId })
  }
  async function exportPdf() {
    if (!row || busy || exporting) return
    setExporting(true)
    try {
      const { buildRelatorioPdf } = await import('../../utils/pdfReport')
        buildRelatorioPdf(buildSettlementPdfInput(row, mes))
    } catch (error) {
      toast.push(extractErrorMessage(error), 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Modal open={Boolean(row)} title={`Fechamento mensal: ${row?.nome ?? ''}`} subtitle={monthLabel(mes)} size="lg" onClose={onClose} closeDisabled={busy} footer={<div className="flex w-full flex-wrap justify-between gap-2"><Link aria-disabled={busy || undefined} onClick={(event) => { if (busy) event.preventDefault() }} className={`inline-flex h-[42px] items-center gap-2 px-2 text-sm font-semibold text-ink hover:text-[var(--primary)] ${busy ? 'pointer-events-none opacity-45' : ''}`} to={row ? `/apresentadoras/${row.apresentadora_id}` : '/apresentadoras'}><ExternalLink className="h-4 w-4" />Abrir perfil</Link><Button type="button" variant="secondary" icon={Download} onClick={exportPdf} disabled={busy || exporting} isLoading={exporting}>Exportar PDF</Button></div>}>
      {row ? <div className="space-y-5">
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[['Fixo', row.fixo], ['Comissão', row.comissao], ['Extras', row.adicionais], ['Total a pagar', row.total]].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-surface-muted px-3 py-3"><p className="text-xs font-semibold text-ink-muted">{label}</p><p className="num mt-1 text-base font-bold text-ink">{formatMoney(value, true)}</p></div>)}
        </section>
        <section className="space-y-3"><div><h3 className="text-sm font-bold text-ink">Extras confirmados</h3><p className="mt-0.5 text-xs text-ink-muted">Só entram no pagamento após confirmação manual.</p></div><ExtraList extras={row.extras} editable={editable} deletingId={deletingId} onDelete={(extra) => { if (busy) return; setDeletingId(extra.id); removeExtra.mutate(extra.id) }} /></section>
        {editable ? <>
          <section className="space-y-3 border-t border-line pt-5"><div><h3 className="text-sm font-bold text-ink">Fim de semana</h3><p className="mt-0.5 text-xs text-ink-muted">Marque somente os dias em que ela trabalhou. Cada dia soma R$ 100,00.</p></div><div className="grid gap-2 sm:grid-cols-2">{weekends.map((date) => { const extra = weekendsByDate.get(date); return <label key={date} className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-sm text-ink has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"><input type="checkbox" className="h-4 w-4 shrink-0 accent-[var(--primary)]" aria-label={`Trabalhou em ${formatDate(date)}`} checked={Boolean(extra)} disabled={busy} onChange={(event) => { if (event.target.checked) addWeekend(date); else if (extra) { setDeletingId(extra.id); removeExtra.mutate(extra.id) } }} /><span className="flex-1">{formatDate(date)}</span><span className="num text-xs text-ink-muted">R$ 100,00</span></label> })}</div></section>
          <form className="space-y-3 border-t border-line pt-5" onSubmit={submitBonus}><div><h3 className="text-sm font-bold text-ink">Bonificação</h3><p className="mt-0.5 text-xs text-ink-muted">Registre um adicional individual e sua justificativa.</p></div><div className="grid gap-3 sm:grid-cols-[1fr_160px_auto]"><label className="grid gap-1 text-xs font-semibold text-ink-muted">Descrição<input aria-label="Descrição" className="design-input h-11 px-3 text-sm" value={bonusDescription} onChange={(event) => { setBonusDescription(event.target.value); setBonusRequestId(newBonusRequestId()) }} maxLength={160} required disabled={busy} /></label><label className="grid gap-1 text-xs font-semibold text-ink-muted">Valor<MoneyInput aria-label="Valor" className="design-input h-11 px-3 text-sm" value={bonusValue} onChange={(value) => { setBonusValue(value); setBonusRequestId(newBonusRequestId()) }} placeholder="0,00" required disabled={busy} /></label><Button type="submit" icon={Gift} className="self-end" isLoading={addExtra.isPending} disabled={busy}>Adicionar</Button></div></form>
        </> : <p className="rounded-xl bg-surface-muted px-3 py-2 text-xs text-ink-muted">Este fechamento está somente para consulta.</p>}
      </div> : null}
    </Modal>
  )
}

export function PresenterSettlement({ mes, apresentadoraId, embedded = false }: { mes: string; apresentadoraId?: string; embedded?: boolean }) {
  const client = useQueryClient()
  const user = useCurrentUser()
  const [selectedMes, setSelectedMes] = useState(mes)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const validMes = VALID_MONTH.test(selectedMes)
  const query = useQuery({ queryKey: settlementKey(user?.tenant_id ?? 'anonymous', selectedMes), queryFn: () => getPresenterSettlement(selectedMes), enabled: validMes })
  const rows = useMemo(() => (query.data?.apresentadoras ?? []).filter((row) => !apresentadoraId || row.apresentadora_id === apresentadoraId), [apresentadoraId, query.data?.apresentadoras])
  const selected = rows.find((row) => row.apresentadora_id === selectedId) ?? null
  useEffect(() => { setSelectedMes(mes) }, [mes])
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: settlementKey(user?.tenant_id ?? 'anonymous', selectedMes) }),
      client.invalidateQueries({ queryKey: ['financeiro-operacional'] }),
      client.invalidateQueries({ queryKey: ['financeiro-resumo'] }),
    ])
  }

  if (query.isLoading) return <LoadingState label="Carregando fechamento mensal" />
  const title = apresentadoraId ? 'Fechamento mensal' : 'Fechamento mensal de apresentadoras'
  const content = !validMes ? <ErrorState message="Informe uma competência válida para consultar o fechamento." /> : query.isError ? <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} /> : rows.length ? <DataTable<PresenterSettlementRow> data={rows} onRowClick={(row) => setSelectedId(row.apresentadora_id)} columns={[
    { key: 'nome', header: 'Apresentadora', render: (row) => <span className="font-semibold text-ink">{row.nome}</span> },
    { key: 'fixo', header: 'Fixo', align: 'right', render: (row) => <span className="num">{formatMoney(row.fixo, true)}</span> },
    { key: 'comissao', header: 'Comissão', align: 'right', render: (row) => <span className="num">{formatMoney(row.comissao, true)}</span> },
    { key: 'adicionais', header: 'Extras', align: 'right', render: (row) => <span className="num">{formatMoney(row.adicionais, true)}</span> },
    { key: 'total', header: 'Total a pagar', align: 'right', render: (row) => <span className="num font-bold">{formatMoney(row.total, true)}</span> },
    { key: 'acao', header: '', align: 'right', render: (row) => <Button type="button" variant="secondary" onClick={(event) => { event.stopPropagation(); setSelectedId(row.apresentadora_id) }}>Abrir fechamento</Button> },
  ]} /> : <EmptyState title="Sem apresentadoras neste mês" description="Não há fechamento mensal para o período selecionado." />

  return <><Card className={embedded ? '' : undefined}><CardHeader><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-base font-bold text-ink">{title}</p><p className="mt-1 text-xs text-ink-muted">Fixo, comissão e extras formam o total a pagar.</p></div><label className="grid gap-1 text-xs font-semibold text-ink-muted">Competência<input aria-label="Competência do fechamento" className="design-input h-10 px-3 text-sm" type="month" value={selectedMes} onChange={(event) => setSelectedMes(event.target.value)} /></label></div></CardHeader><CardBody>{content}</CardBody></Card><SettlementModal row={selected} mes={selectedMes} editable={Boolean(query.data?.pode_editar)} writeBlocked={query.isFetching} onClose={() => setSelectedId(null)} onChanged={refresh} /></>
}
