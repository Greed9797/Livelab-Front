import { Edit2, Eye, Plus, Trash2 } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge, statusTone } from '../ui/Badge'
import { DataTable } from '../ui/DataTable'
import { Modal } from '../ui/Modal'
import { publicationStatusLabel } from '../../pages/conteudo-helpers'
import { asNumber, asString, formatDate, formatMoney } from '../../utils/format'
import { extractErrorMessage } from '../../services/api'
import type { JsonRecord } from '../../types/models'
import type { UseMutationResult } from '@tanstack/react-query'

function clienteMarcaCell(live: JsonRecord): React.ReactNode {
  const tipo = asString(live.tipo, '')
  const isSistema = (live.marca as JsonRecord | undefined)?.sistema === true
  const label = asString(live.marca_nome ?? live.cliente_nome)

  if (['afiliado', 'teste'].includes(tipo) && isSistema) {
    return (
      <div className="flex items-center gap-2">
        <span>{label}</span>
        <Badge tone="sistema">Sistema</Badge>
      </div>
    )
  }

  return label
}

function formatTime(value: unknown) {
  const date = typeof value === 'string' ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date)
}

function buildLiveReport(live: JsonRecord): string {
  const nome = asString(live.marca_nome ?? live.cliente_nome, '')
  const inicio = live.iniciado_em ? new Date(live.iniciado_em as string) : null
  const fim = live.encerrado_em ? new Date(live.encerrado_em as string) : null
  if (!inicio || Number.isNaN(inicio.getTime())) return ''

  const data = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(inicio)
  const hInicio = formatTime(live.iniciado_em)
  const hFim = fim && !Number.isNaN(fim.getTime()) ? formatTime(live.encerrado_em) : null

  let duracao = ''
  if (inicio && fim && !Number.isNaN(fim.getTime())) {
    const mins = Math.floor((fim.getTime() - inicio.getTime()) / 60000)
    const h = Math.floor(mins / 60)
    const m = mins % 60
    duracao = h > 0 ? `${h}:${String(m).padStart(2, '0')}h` : `${m}min`
  }

  const gmv = formatMoney(live.fat_gerado ?? live.manual_gmv)
  const pedidos = asNumber(live.final_orders_count ?? live.manual_orders).toLocaleString('pt-BR')
  const espectadores = new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(
    asNumber(live.total_viewers ?? live.viewer_count),
  )
  const visualizacoes = new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(
    asNumber(live.manual_views),
  )

  const lines = [
    `📊 Relatório de Live${nome ? ` — ${nome}` : ''}`,
    '',
    `📅 Data: ${data}`,
    hFim
      ? `⏰ Horário analisado: ${hInicio} às ${hFim}`
      : `⏰ Horário: ${hInicio}`,
    duracao ? `⏱️ Duração: ${duracao}` : null,
    '',
    `💰 GMV gerado: ${gmv}`,
    `🛒 Pedidos/itens atribuídos: ${pedidos}`,
    `👥 Espectadores: ${espectadores}`,
    `👀 Visualizações: ${visualizacoes}`,
  ]
  return lines.filter((l) => l !== null).join('\n')
}

function clienteMarcaLabel(live: JsonRecord): string {
  const tipo = asString(live.tipo, '')
  const isSistema = (live.marca as JsonRecord | undefined)?.sistema === true
  if (['afiliado', 'teste'].includes(tipo) && isSistema) return 'Sistema'
  return asString(live.marca_nome ?? live.cliente_nome)
}

export interface LivesTabProps {
  livesData: JsonRecord[]
  liveModalMode: 'detail' | null
  selectedLiveRecord: JsonRecord | null
  reportCopied: boolean
  deleteLiveMutation: UseMutationResult<unknown, Error, string>
  onOpenCreateLiveModal: () => void
  onOpenLiveDetail: (live: JsonRecord) => void
  onOpenEditLive: (live: JsonRecord) => void
  onDeleteLive: (live: JsonRecord) => void
  onCloseLiveModal: () => void
  onCopyLiveReport: (text: string) => void
}

export function LivesTab({
  livesData,
  liveModalMode,
  selectedLiveRecord,
  reportCopied,
  deleteLiveMutation,
  onOpenCreateLiveModal,
  onOpenLiveDetail,
  onOpenEditLive,
  onDeleteLive,
  onCloseLiveModal,
  onCopyLiveReport,
}: LivesTabProps) {
  return (
    <section>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-base font-bold text-ink">Lives realizadas</p>
            <Button icon={Plus} onClick={onOpenCreateLiveModal}>
              Cadastrar live manual
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <DataTable<JsonRecord>
            data={livesData}
            columns={[
              {
                key: 'iniciado_em',
                header: 'Data',
                render: (item) => formatDate(asString(item.iniciado_em, '')),
              },
              {
                key: 'cliente_nome',
                header: 'Cliente/Marca',
                render: (item) => clienteMarcaCell(item),
              },
              {
                key: 'cabine_numero',
                header: 'Cabine',
                render: (item) => asString(item.cabine_numero),
              },
              {
                key: 'apresentador_nome',
                header: 'Apresentadora',
                render: (item) =>
                  asString(item.apresentadora_nome ?? item.apresentador_nome),
              },
              {
                key: 'fat_gerado',
                header: 'GMV',
                align: 'right',
                render: (item) => formatMoney(item.fat_gerado ?? item.manual_gmv),
              },
              {
                key: 'final_orders_count',
                header: 'Pedidos',
                align: 'right',
                render: (item) =>
                  asNumber(item.final_orders_count ?? item.manual_orders).toLocaleString('pt-BR'),
              },
              {
                key: 'status_publicacao',
                header: 'Publicação',
                render: (item) => (
                  <Badge tone={statusTone(asString(item.status_publicacao, 'rascunho'))}>
                    {publicationStatusLabel(item.status_publicacao)}
                  </Badge>
                ),
              },
              {
                key: 'acoes',
                header: 'Ações',
                align: 'right',
                render: (item) => (
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" icon={Eye} onClick={() => onOpenLiveDetail(item)}>
                      Abrir
                    </Button>
                    <Button variant="secondary" icon={Edit2} onClick={() => onOpenEditLive(item)}>
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      icon={Trash2}
                      disabled={deleteLiveMutation.isPending}
                      onClick={() => onDeleteLive(item)}
                    >
                      Excluir
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </CardBody>
      </Card>

      <Modal
        open={liveModalMode === 'detail' && !!selectedLiveRecord}
        title="Live realizada"
        subtitle={
          selectedLiveRecord
            ? `${asString(selectedLiveRecord.marca_nome ?? selectedLiveRecord.cliente_nome, 'Sem marca')} · Cabine ${asString(selectedLiveRecord.cabine_numero)}`
            : undefined
        }
        onClose={onCloseLiveModal}
        size="md"
      >
        {selectedLiveRecord ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {[
                [
                  'Data',
                  `${formatDate(asString(selectedLiveRecord.iniciado_em, ''))} ${formatTime(selectedLiveRecord.iniciado_em)}-${formatTime(selectedLiveRecord.encerrado_em)}`,
                ],
                [
                  'Apresentadora',
                  asString(
                    selectedLiveRecord.apresentadora_nome ?? selectedLiveRecord.apresentador_nome,
                    '—',
                  ),
                ],
                ['GMV', formatMoney(selectedLiveRecord.fat_gerado ?? selectedLiveRecord.manual_gmv)],
                [
                  'Pedidos',
                  asNumber(
                    selectedLiveRecord.final_orders_count ?? selectedLiveRecord.manual_orders,
                  ).toLocaleString('pt-BR'),
                ],
                ['Publicação', publicationStatusLabel(selectedLiveRecord.status_publicacao)],
                ['Origem', asString(selectedLiveRecord.origem_dados, 'manual')],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-line bg-surface-muted p-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
                </div>
              ))}
            </div>
            {selectedLiveRecord.resumo ? (
              <p className="rounded-2xl border border-line bg-surface-muted p-3 text-sm text-ink">
                {asString(selectedLiveRecord.resumo)}
              </p>
            ) : null}
            {(() => {
              const report = buildLiveReport(selectedLiveRecord)
              if (!report) return null
              return (
                <div className="rounded-2xl border border-line bg-surface-muted p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                      Relatório para copiar
                    </p>
                    <Button
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => onCopyLiveReport(report)}
                    >
                      {reportCopied ? 'Copiado!' : 'Copiar'}
                    </Button>
                  </div>
                  <pre className="whitespace-pre-wrap text-xs text-ink">{report}</pre>
                </div>
              )
            })()}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                icon={Edit2}
                onClick={() => onOpenEditLive(selectedLiveRecord)}
              >
                Editar
              </Button>
              <Button
                variant="danger"
                icon={Trash2}
                isLoading={deleteLiveMutation.isPending}
                onClick={() => onDeleteLive(selectedLiveRecord)}
              >
                Excluir
              </Button>
            </div>
            {deleteLiveMutation.isError ? (
              <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
                {extractErrorMessage(deleteLiveMutation.error)}
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </section>
  )
}
