import { ClipboardCheck, Edit2, PhoneCall, Trash2, Trophy, XCircle } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { asArray, asString, formatDate, formatMoney } from '../../utils/format'
import { leadTitle, leadValue, normalizeCrmStage, stageLabel } from '../../utils/crm'
import type { JsonRecord } from '../../types/models'

interface LeadDrawerProps {
  lead: JsonRecord | null
  open: boolean
  loading?: boolean
  onClose: () => void
  onEdit: (lead: JsonRecord) => void
  onAddContact: (lead: JsonRecord) => void
  onAddTask: (lead: JsonRecord) => void
  onWin: (lead: JsonRecord) => void
  onLose: (lead: JsonRecord) => void
  onDelete: (lead: JsonRecord) => void
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-muted p-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-ink">{value}</p>
    </div>
  )
}

export function LeadDrawer({
  lead,
  open,
  loading = false,
  onClose,
  onEdit,
  onAddContact,
  onAddTask,
  onWin,
  onLose,
  onDelete,
}: LeadDrawerProps) {
  const history = asArray<JsonRecord>(lead?.contatos_estruturados).length
    ? asArray<JsonRecord>(lead?.contatos_estruturados)
    : asArray<JsonRecord>(lead?.historico_contatos)
  const tasks = asArray<JsonRecord>(lead?.tarefas_estruturadas).length
    ? asArray<JsonRecord>(lead?.tarefas_estruturadas)
    : asArray<JsonRecord>(lead?.tarefas)
  const stageHistory = asArray<JsonRecord>(lead?.etapa_historico)

  return (
    <Modal
      open={open}
      title={lead ? leadTitle(lead) : 'Lead'}
      subtitle={lead ? `${stageLabel(lead.crm_etapa)} · ${formatMoney(leadValue(lead))}` : undefined}
      onClose={onClose}
      size="lg"
    >
      {loading ? <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-muted">Carregando lead...</p> : null}
      {lead ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={normalizeCrmStage(lead) === 'ganho' ? 'success' : normalizeCrmStage(lead) === 'perdido' ? 'danger' : 'brand'}>{stageLabel(lead.crm_etapa)}</Badge>
            {lead.convertido_cliente_id ? <Badge tone="success">Cliente convertido</Badge> : null}
            {lead.ganho_em ? <span className="text-xs text-ink-muted">Ganho em {formatDate(asString(lead.ganho_em))}</span> : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Responsável" value={asString(lead.responsavel_nome, 'sem responsável')} />
            <Field label="Origem" value={asString(lead.origem, '—')} />
            <Field label="Nicho" value={asString(lead.nicho, '—')} />
            <Field label="Cidade/UF" value={`${asString(lead.cidade, '—')}/${asString(lead.estado, '—')}`} />
            <Field label="WhatsApp" value={asString(lead.contato_whatsapp, '—')} />
            <Field label="E-mail" value={asString(lead.contato_email, '—')} />
            <Field label="Criado em" value={formatDate(asString(lead.criado_em, ''))} />
            <Field label="Atualizado em" value={formatDate(asString(lead.atualizado_em, ''))} />
          </div>

          {lead.observacoes_internas ? (
            <div className="rounded-2xl border border-line bg-surface-muted p-4">
              <p className="text-sm font-bold text-ink">Observações internas</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink-muted">{asString(lead.observacoes_internas)}</p>
            </div>
          ) : null}

          {lead.motivo_perda ? (
            <div className="rounded-2xl border border-[var(--danger)] bg-[var(--danger-soft)] p-4">
              <p className="text-sm font-bold text-[var(--danger)]">Motivo de perda</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{asString(lead.motivo_perda)}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={Edit2} onClick={() => onEdit(lead)}>Editar</Button>
            <Button variant="secondary" icon={PhoneCall} onClick={() => onAddContact(lead)}>Registrar contato</Button>
            <Button variant="secondary" icon={ClipboardCheck} onClick={() => onAddTask(lead)}>Criar tarefa</Button>
            {normalizeCrmStage(lead) !== 'ganho' ? <Button variant="secondary" icon={Trophy} onClick={() => onWin(lead)}>Converter/ganhar</Button> : null}
            {normalizeCrmStage(lead) !== 'perdido' ? <Button variant="ghost" icon={XCircle} onClick={() => onLose(lead)}>Marcar perdido</Button> : null}
            <Button variant="danger" icon={Trash2} onClick={() => onDelete(lead)}>Excluir</Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-line bg-surface-muted p-4">
              <p className="text-sm font-bold text-ink">Histórico de contatos</p>
              <div className="mt-3 space-y-2">
                {history.map((item, index) => (
                  <div key={asString(item.id, String(index))} className="rounded-xl bg-surface p-3 text-sm text-ink">
                    <p className="font-semibold">{asString(item.tipo, 'Contato')}</p>
                    <p className="mt-1 text-ink-muted">{asString(item.resumo)}</p>
                    <p className="mt-2 text-[11px] text-ink-muted">{formatDate(asString(item.criado_em ?? item.data, ''))}</p>
                  </div>
                ))}
                {!history.length ? <p className="text-sm text-ink-muted">Nenhum contato registrado.</p> : null}
              </div>
            </div>
            <div className="rounded-2xl border border-line bg-surface-muted p-4">
              <p className="text-sm font-bold text-ink">Tarefas</p>
              <div className="mt-3 space-y-2">
                {tasks.map((item, index) => (
                  <div key={asString(item.id, String(index))} className="rounded-xl bg-surface p-3 text-sm text-ink">
                    <p className="font-semibold">{asString(item.titulo, 'Tarefa')}</p>
                    <p className="mt-1 text-ink-muted">{item.concluida ? 'Concluída' : 'Aberta'}</p>
                    {item.due_date ? <p className="mt-2 text-[11px] text-ink-muted">Vence em {formatDate(asString(item.due_date))}</p> : null}
                  </div>
                ))}
                {!tasks.length ? <p className="text-sm text-ink-muted">Nenhuma tarefa criada.</p> : null}
              </div>
            </div>
            <div className="rounded-2xl border border-line bg-surface-muted p-4">
              <p className="text-sm font-bold text-ink">Linha do tempo de etapas</p>
              <div className="mt-3 space-y-2">
                {stageHistory.map((item, index) => (
                  <div key={asString(item.id, String(index))} className="rounded-xl bg-surface p-3 text-sm text-ink">
                    <p className="font-semibold">{stageLabel(item.etapa_anterior)} → {stageLabel(item.etapa_nova)}</p>
                    <p className="mt-1 text-ink-muted">{asString(item.alterado_por_nome, 'Sistema')}</p>
                    <p className="mt-2 text-[11px] text-ink-muted">{formatDate(asString(item.criado_em, ''))}</p>
                  </div>
                ))}
                {!stageHistory.length ? <p className="text-sm text-ink-muted">Nenhuma mudança registrada.</p> : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
