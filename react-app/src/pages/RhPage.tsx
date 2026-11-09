import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Building2, Cake, CalendarDays, Check, Lock, Pencil, Plus, PowerOff, Users, Wallet, type LucideIcon } from 'lucide-react'
import { useState, lazy, Suspense, type FormEvent, type ReactNode } from 'react'
import { Badge, type BadgeTone } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { Modal } from '../components/ui/Modal'
import { MoneyInput } from '../components/ui/MoneyInput'
import { PageHeader } from '../components/ui/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States'
import { useToast } from '../components/ui/Toast'
import { extractErrorMessage } from '../services/api'
import {
  createRhColaborador,
  getRhColaboradores,
  getRhFolha,
  saveRhFolha,
  setRhFolhaStatus,
  updateRhColaborador,
  type RhColaboradorPayload,
  type RhFolhaSavePayload,
} from '../services/domain'
import { QK } from '../services/query-keys'
import { useCurrentUser } from '../stores/auth-store'
import type { RhColaborador, RhFolhaRow, RhFolhaStatus, RhStatus, RhTipoContrato, TableColumn } from '../types/models'
import { canWriteRh } from '../utils/access'
import { asNumber, formatDate, formatMoney, formatPercent } from '../utils/format'
import { aniversariantesDoMes, competenciaAtual, metaAtingida, resumoFolha, resumoPorSetor, totalFolha, type RhSetorResumo } from '../utils/rh'

type RhTab = 'visao-geral' | 'colaboradores' | 'organograma' | 'folha' | 'aniversariantes' | 'setores'

const TABS: Array<{ id: RhTab; label: string }> = [
  { id: 'visao-geral', label: 'Visão Geral' },
  { id: 'colaboradores', label: 'Colaboradores' },
  { id: 'organograma', label: 'Organograma' },
  { id: 'folha', label: 'Folha do mês' },
  { id: 'aniversariantes', label: 'Aniversariantes' },
  { id: 'setores', label: 'Por Setor' },
]

const RhOrganograma = lazy(() => import('../components/rh/RhOrganograma').then((module) => ({ default: module.RhOrganograma })))

const STATUS_LABEL: Record<RhStatus, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  ferias: 'Férias',
  afastado: 'Afastado',
}

const STATUS_TONE: Record<RhStatus, BadgeTone> = {
  ativo: 'success',
  inativo: 'neutral',
  ferias: 'info',
  afastado: 'warning',
}

const CONTRATO_LABEL: Record<RhTipoContrato, string> = {
  clt: 'CLT',
  pj: 'PJ',
  estagio: 'Estágio',
  freelancer: 'Freelancer',
}

const STATUS_OPTIONS: Array<{ value: RhStatus; label: string }> = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
  { value: 'ferias', label: 'Férias' },
  { value: 'afastado', label: 'Afastado' },
]

const CONTRATO_OPTIONS: Array<{ value: RhTipoContrato; label: string }> = [
  { value: 'clt', label: 'CLT' },
  { value: 'pj', label: 'PJ' },
  { value: 'estagio', label: 'Estágio' },
  { value: 'freelancer', label: 'Freelancer' },
]

const inputClass = 'design-input mt-2 h-11 w-full px-4'

interface ColaboradorForm {
  nome: string
  cargo: string
  setor: string
  email: string
  telefone: string
  cpf: string
  data_nascimento: string
  data_admissao: string
  data_desligamento: string
  salario_fixo: string
  comissao_pct: string
  status: RhStatus
  tipo_contrato: RhTipoContrato
  centro_custo: string
  responsavel_id: string
  ote_comissao: string
  chave_pix: string
  observacoes: string
}

const FORM_VAZIO: ColaboradorForm = {
  nome: '',
  cargo: '',
  setor: '',
  email: '',
  telefone: '',
  cpf: '',
  data_nascimento: '',
  data_admissao: '',
  data_desligamento: '',
  salario_fixo: '',
  comissao_pct: '',
  status: 'ativo',
  tipo_contrato: 'clt',
  centro_custo: '',
  responsavel_id: '',
  ote_comissao: '',
  chave_pix: '',
  observacoes: '',
}

interface FolhaForm {
  salario_fixo: string
  meta_valor: string
  meta_realizado: string
  comissao: string
  bonus: string
  descontos: string
  observacoes: string
}

function moneyValue(value: number | string | null | undefined): string {
  if (value == null || value === '') return ''
  return String(value)
}

function statusDoColaborador(colaborador: RhColaborador): RhStatus {
  return colaborador.status ?? (colaborador.ativo ? 'ativo' : 'inativo')
}

function contratoDoColaborador(colaborador: RhColaborador): RhTipoContrato {
  return colaborador.tipo_contrato ?? 'clt'
}

function formFromColaborador(colaborador: RhColaborador): ColaboradorForm {
  return {
    nome: colaborador.nome,
    cargo: colaborador.cargo ?? '',
    setor: colaborador.setor ?? '',
    email: colaborador.email ?? '',
    telefone: colaborador.telefone ?? '',
    cpf: colaborador.cpf ?? '',
    data_nascimento: colaborador.data_nascimento ?? '',
    data_admissao: colaborador.data_admissao ?? '',
    data_desligamento: colaborador.data_desligamento ?? '',
    salario_fixo: moneyValue(colaborador.salario_fixo),
    comissao_pct: moneyValue(colaborador.comissao_pct),
    status: statusDoColaborador(colaborador),
    tipo_contrato: contratoDoColaborador(colaborador),
    centro_custo: (colaborador.centro_custo ?? []).join(', '),
    responsavel_id: colaborador.responsavel_id ?? '',
    ote_comissao: colaborador.ote_comissao ?? '',
    chave_pix: colaborador.chave_pix ?? '',
    observacoes: colaborador.observacoes ?? '',
  }
}

function parseCentroCusto(value: string): string[] | null {
  const itens = value.split(',').map((item) => item.trim()).filter(Boolean)
  return itens.length > 0 ? itens : null
}

function payloadFromForm(form: ColaboradorForm): RhColaboradorPayload {
  return {
    nome: form.nome.trim(),
    cargo: form.cargo.trim() || null,
    setor: form.setor.trim() || null,
    email: form.email.trim() || null,
    telefone: form.telefone.trim() || null,
    cpf: form.cpf.trim() || null,
    data_nascimento: form.data_nascimento || null,
    data_admissao: form.data_admissao || null,
    data_desligamento: form.data_desligamento || null,
    salario_fixo: form.salario_fixo.trim() ? asNumber(form.salario_fixo) : null,
    comissao_pct: asNumber(form.comissao_pct),
    status: form.status,
    tipo_contrato: form.tipo_contrato,
    centro_custo: parseCentroCusto(form.centro_custo),
    responsavel_id: form.responsavel_id || null,
    ote_comissao: form.ote_comissao.trim() || null,
    chave_pix: form.chave_pix.trim() || null,
    ativo: form.status !== 'inativo',
    observacoes: form.observacoes.trim() || null,
  }
}

function folhaFormFromRow(row: RhFolhaRow): FolhaForm {
  return {
    salario_fixo: moneyValue(row.salario_fixo),
    meta_valor: moneyValue(row.meta_valor),
    meta_realizado: moneyValue(row.meta_realizado),
    comissao: moneyValue(row.comissao),
    bonus: moneyValue(row.bonus),
    descontos: moneyValue(row.descontos),
    observacoes: row.observacoes ?? '',
  }
}

function folhaStatusInfo(row: RhFolhaRow): { label: string; tone: BadgeTone } {
  if (!row.folha_id) return { label: 'Sem lançamento', tone: 'neutral' }
  if (row.status === 'pago') return { label: 'Pago', tone: 'success' }
  if (row.status === 'fechado') return { label: 'Fechado', tone: 'warning' }
  return { label: 'Rascunho', tone: 'neutral' }
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-ink">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-ink-muted">{hint}</span> : null}
    </label>
  )
}

function ResumoCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <Card>
      <div className="flex items-center gap-3 p-4">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-soft text-brand">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink-muted">{label}</p>
          <p className="num truncate text-xl font-semibold text-ink">{value}</p>
        </div>
      </div>
    </Card>
  )
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Card>
      <div className="border-b border-line px-4 py-3">
        <p className="text-sm font-bold text-ink">{title}</p>
        {subtitle ? <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p> : null}
      </div>
      <div className="p-4">{children}</div>
    </Card>
  )
}

function ColaboradorModal({
  colaborador,
  colaboradores,
  isPending,
  onClose,
  onSubmit,
}: {
  colaborador: RhColaborador | null
  colaboradores: RhColaborador[]
  isPending: boolean
  onClose: () => void
  onSubmit: (payload: RhColaboradorPayload) => void
}) {
  const [form, setForm] = useState<ColaboradorForm>(() => (colaborador ? formFromColaborador(colaborador) : { ...FORM_VAZIO }))
  const [erro, setErro] = useState('')

  const responsaveis = colaboradores.filter((item) => item.id !== colaborador?.id && (item.ativo || item.id === colaborador?.responsavel_id))

  function setField<K extends keyof ColaboradorForm>(key: K, value: ColaboradorForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.nome.trim()) {
      setErro('Informe o nome do colaborador.')
      return
    }
    setErro('')
    onSubmit(payloadFromForm(form))
  }

  return (
    <Modal
      open
      size="lg"
      title={colaborador ? 'Editar colaborador' : 'Novo colaborador'}
      subtitle="Cadastro usado pela folha mensal do setor."
      onClose={onClose}
      closeDisabled={isPending}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button type="submit" form="rh-colaborador-form" isLoading={isPending}>Salvar</Button>
        </>
      )}
    >
      <form id="rh-colaborador-form" className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome">
            <input className={inputClass} value={form.nome} onChange={(event) => setField('nome', event.target.value)} required />
          </Field>
          <Field label="Cargo">
            <input className={inputClass} value={form.cargo} onChange={(event) => setField('cargo', event.target.value)} />
          </Field>
          <Field label="Setor">
            <input className={inputClass} value={form.setor} onChange={(event) => setField('setor', event.target.value)} />
          </Field>
          <Field label="Salário fixo (R$)">
            <MoneyInput className={inputClass} value={form.salario_fixo} onChange={(raw) => setField('salario_fixo', raw)} placeholder="0,00" />
          </Field>
          <Field label="Comissão (%)">
            <input type="number" min="0" max="100" step="0.01" className={inputClass} value={form.comissao_pct} onChange={(event) => setField('comissao_pct', event.target.value)} placeholder="0" />
          </Field>
          <Field label="E-mail">
            <input type="email" className={inputClass} value={form.email} onChange={(event) => setField('email', event.target.value)} />
          </Field>
          <Field label="Telefone">
            <input className={inputClass} value={form.telefone} onChange={(event) => setField('telefone', event.target.value)} />
          </Field>
          <Field label="CPF">
            <input className={inputClass} value={form.cpf} onChange={(event) => setField('cpf', event.target.value)} />
          </Field>
          <Field label="Nascimento">
            <input type="date" className={inputClass} value={form.data_nascimento} onChange={(event) => setField('data_nascimento', event.target.value)} />
          </Field>
          <Field label="Admissão">
            <input type="date" className={inputClass} value={form.data_admissao} onChange={(event) => setField('data_admissao', event.target.value)} />
          </Field>
          <Field label="Desligamento">
            <input type="date" className={inputClass} value={form.data_desligamento} onChange={(event) => setField('data_desligamento', event.target.value)} />
          </Field>
          <Field label="Status">
            <select className={inputClass} value={form.status} onChange={(event) => setField('status', event.target.value as RhStatus)}>
              {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
          <Field label="Tipo de contrato">
            <select className={inputClass} value={form.tipo_contrato} onChange={(event) => setField('tipo_contrato', event.target.value as RhTipoContrato)}>
              {CONTRATO_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
          <Field label="Responsável">
            <select className={inputClass} value={form.responsavel_id} onChange={(event) => setField('responsavel_id', event.target.value)}>
              <option value="">Sem responsável</option>
              {responsaveis.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
            </select>
          </Field>
          <Field label="Centro de custo" hint="Separe múltiplos centros por vírgula.">
            <input className={inputClass} value={form.centro_custo} onChange={(event) => setField('centro_custo', event.target.value)} placeholder="Operação, Marketing" />
          </Field>
          <Field label="OTE de comissão">
            <input className={inputClass} value={form.ote_comissao} onChange={(event) => setField('ote_comissao', event.target.value)} placeholder="Opcional" />
          </Field>
          <Field label="Chave PIX">
            <input className={inputClass} value={form.chave_pix} onChange={(event) => setField('chave_pix', event.target.value)} placeholder="Opcional" />
          </Field>
        </div>
        <Field label="Observações">
          <textarea className="design-input mt-2 min-h-24 w-full px-4 py-3" value={form.observacoes} onChange={(event) => setField('observacoes', event.target.value)} />
        </Field>
        {erro ? (
          <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{erro}</p>
        ) : null}
      </form>
    </Modal>
  )
}

function FolhaModal({
  row,
  mes,
  isPending,
  onClose,
  onSubmit,
}: {
  row: RhFolhaRow
  mes: string
  isPending: boolean
  onClose: () => void
  onSubmit: (payload: RhFolhaSavePayload) => void
}) {
  const [form, setForm] = useState<FolhaForm>(() => folhaFormFromRow(row))

  function setField<K extends keyof FolhaForm>(key: K, value: FolhaForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit({
      mes,
      salario_fixo: asNumber(form.salario_fixo),
      meta_valor: asNumber(form.meta_valor),
      meta_realizado: asNumber(form.meta_realizado),
      comissao: asNumber(form.comissao),
      bonus: asNumber(form.bonus),
      descontos: asNumber(form.descontos),
      observacoes: form.observacoes.trim() || undefined,
    })
  }

  const total = totalFolha({
    salario_fixo: asNumber(form.salario_fixo),
    comissao: asNumber(form.comissao),
    bonus: asNumber(form.bonus),
    descontos: asNumber(form.descontos),
  })

  return (
    <Modal
      open
      size="lg"
      title={row.folha_id ? 'Editar folha' : 'Lançar folha'}
      subtitle={`${row.nome} · ${mes}`}
      onClose={onClose}
      closeDisabled={isPending}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button type="submit" form="rh-folha-form" isLoading={isPending}>Salvar</Button>
        </>
      )}
    >
      <form id="rh-folha-form" className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Salário fixo (R$)">
            <MoneyInput className={inputClass} value={form.salario_fixo} onChange={(raw) => setField('salario_fixo', raw)} placeholder="0,00" />
          </Field>
          <Field label="Meta (valor)">
            <MoneyInput className={inputClass} value={form.meta_valor} onChange={(raw) => setField('meta_valor', raw)} placeholder="0,00" />
          </Field>
          <Field label="Meta realizado">
            <MoneyInput className={inputClass} value={form.meta_realizado} onChange={(raw) => setField('meta_realizado', raw)} placeholder="0,00" />
          </Field>
          <Field label="Comissão (R$)">
            <MoneyInput className={inputClass} value={form.comissao} onChange={(raw) => setField('comissao', raw)} placeholder="0,00" />
          </Field>
          <Field label="Bônus (R$)">
            <MoneyInput className={inputClass} value={form.bonus} onChange={(raw) => setField('bonus', raw)} placeholder="0,00" />
          </Field>
          <Field label="Descontos (R$)">
            <MoneyInput className={inputClass} value={form.descontos} onChange={(raw) => setField('descontos', raw)} placeholder="0,00" />
          </Field>
        </div>
        <Field label="Observações">
          <textarea className="design-input mt-2 min-h-24 w-full px-4 py-3" value={form.observacoes} onChange={(event) => setField('observacoes', event.target.value)} />
        </Field>
        <p className="text-sm text-ink-muted">
          Total calculado: <strong className="num text-ink">{formatMoney(total)}</strong>
        </p>
      </form>
    </Modal>
  )
}

export function RhPage() {
  const user = useCurrentUser()
  const toast = useToast()
  const client = useQueryClient()
  const podeEscrever = canWriteRh(user)

  const [mes, setMes] = useState(competenciaAtual)
  const [tab, setTab] = useState<RhTab>('visao-geral')
  const [colaboradorModal, setColaboradorModal] = useState<{ colaborador: RhColaborador | null } | null>(null)
  const [desativar, setDesativar] = useState<RhColaborador | null>(null)
  const [folhaModal, setFolhaModal] = useState<{ row: RhFolhaRow } | null>(null)
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState<'todos' | RhStatus>('todos')
  const [setorFiltro, setSetorFiltro] = useState('todos')
  const [contratoFiltro, setContratoFiltro] = useState<'todos' | RhTipoContrato>('todos')

  const colaboradoresQuery = useQuery({
    queryKey: QK.rhColaboradores,
    queryFn: () => getRhColaboradores({ include_inactive: true }),
  })
  const folhaQuery = useQuery({
    queryKey: QK.rhFolha(mes),
    queryFn: () => getRhFolha(mes),
  })

  const colaboradores = colaboradoresQuery.data ?? []
  const rows = folhaQuery.data?.colaboradores ?? []
  const totais = folhaQuery.data?.totais ?? resumoFolha(rows)
  const aniversariantes = aniversariantesDoMes(colaboradores, mes)
  const setoresResumo = resumoPorSetor(colaboradores, rows)
  const nomePorId = new Map(colaboradores.map((colaborador) => [colaborador.id, colaborador.nome]))

  const ativos = colaboradores.filter((colaborador) => statusDoColaborador(colaborador) === 'ativo')
  const feriasAfastados = colaboradores.filter((colaborador) => ['ferias', 'afastado'].includes(statusDoColaborador(colaborador)))
  const semSalario = ativos.filter((colaborador) => asNumber(colaborador.salario_fixo) <= 0)
  const semAniversario = ativos.filter((colaborador) => !colaborador.data_nascimento)
  const semResponsavel = ativos.filter((colaborador) => !colaborador.responsavel_id)
  const raizes = ativos.filter((colaborador) => !colaborador.responsavel_id)
  const reportesDiretos = new Map<string, number>()
  for (const colaborador of ativos) {
    if (!colaborador.responsavel_id) continue
    reportesDiretos.set(colaborador.responsavel_id, (reportesDiretos.get(colaborador.responsavel_id) ?? 0) + 1)
  }

  const setoresDisponiveis = Array.from(
    new Set(colaboradores.map((colaborador) => (colaborador.setor ?? '').trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b))

  const buscaNormalizada = busca.trim().toLowerCase()
  const colaboradoresFiltrados = colaboradores.filter((colaborador) => {
    const status = statusDoColaborador(colaborador)
    const setor = (colaborador.setor ?? '').trim() || 'Sem setor'
    const texto = [colaborador.nome, colaborador.cargo, colaborador.setor].filter(Boolean).join(' ').toLowerCase()
    return (!buscaNormalizada || texto.includes(buscaNormalizada))
      && (statusFiltro === 'todos' || status === statusFiltro)
      && (setorFiltro === 'todos' || setor === setorFiltro)
      && (contratoFiltro === 'todos' || contratoDoColaborador(colaborador) === contratoFiltro)
  })

  function invalidarRh() {
    void client.invalidateQueries({ queryKey: QK.rhColaboradores })
    void client.invalidateQueries({ queryKey: QK.rhFolha(mes) })
  }

  const criar = useMutation({
    mutationFn: createRhColaborador,
    onSuccess: () => {
      invalidarRh()
      setColaboradorModal(null)
      toast.push('Colaborador criado.', 'success')
    },
    onError: (error) => toast.push(extractErrorMessage(error), 'error'),
  })

  const atualizar = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<RhColaboradorPayload> }) => updateRhColaborador(id, payload),
    onSuccess: () => {
      invalidarRh()
      setColaboradorModal(null)
      toast.push('Colaborador atualizado.', 'success')
    },
    onError: (error) => toast.push(extractErrorMessage(error), 'error'),
  })

  const desativarMut = useMutation({
    mutationFn: (id: string) => updateRhColaborador(id, { ativo: false, status: 'inativo' }),
    onSuccess: () => {
      invalidarRh()
      setDesativar(null)
      toast.push('Colaborador desativado.', 'success')
    },
    onError: (error) => toast.push(extractErrorMessage(error), 'error'),
  })

  const salvarFolha = useMutation({
    mutationFn: ({ colaboradorId, payload }: { colaboradorId: string; payload: RhFolhaSavePayload }) => saveRhFolha(colaboradorId, payload),
    onSuccess: () => {
      invalidarRh()
      setFolhaModal(null)
      toast.push('Folha salva.', 'success')
    },
    onError: (error) => toast.push(extractErrorMessage(error), 'error'),
  })

  const mudarStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RhFolhaStatus }) => setRhFolhaStatus(id, status),
    onSuccess: () => {
      invalidarRh()
      toast.push('Status da folha atualizado.', 'success')
    },
    onError: (error) => toast.push(extractErrorMessage(error), 'error'),
  })

  const colaboradorColumns: TableColumn<RhColaborador>[] = [
    {
      key: 'nome',
      header: 'Nome',
      render: (item) => <span className="font-semibold text-ink">{item.nome}</span>,
    },
    {
      key: 'cargo',
      header: 'Cargo / setor',
      render: (item) => [item.cargo, item.setor].filter(Boolean).join(' · ') || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => {
        const status = statusDoColaborador(item)
        return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
      },
    },
    {
      key: 'contrato',
      header: 'Contrato',
      render: (item) => CONTRATO_LABEL[contratoDoColaborador(item)],
    },
    {
      key: 'admissao',
      header: 'Entrada',
      render: (item) => formatDate(item.data_admissao ?? undefined),
    },
    {
      key: 'salario_fixo',
      header: 'Salário fixo',
      align: 'right',
      render: (item) => <span className="num">{formatMoney(item.salario_fixo)}</span>,
    },
    {
      key: 'comissao_pct',
      header: 'Comissão %',
      align: 'right',
      render: (item) => <span className="num">{formatPercent(item.comissao_pct)}</span>,
    },
    {
      key: 'centro_custo',
      header: 'Centro de custo',
      render: (item) => (item.centro_custo ?? []).join(', ') || '—',
    },
    {
      key: 'responsavel',
      header: 'Responsável',
      render: (item) => (item.responsavel_id ? nomePorId.get(item.responsavel_id) ?? '—' : '—'),
    },
    ...(podeEscrever
      ? [{
          key: 'acoes',
          header: '',
          align: 'right' as const,
          render: (item: RhColaborador) => (
            <div className="flex items-center justify-end gap-1">
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Editar ${item.nome}`}
                title="Editar"
                onClick={() => setColaboradorModal({ colaborador: item })}
              >
                <Pencil aria-hidden="true" className="h-[18px] w-[18px]" />
              </Button>
              {statusDoColaborador(item) !== 'inativo' ? (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Desativar ${item.nome}`}
                  title="Desativar"
                  onClick={() => setDesativar(item)}
                >
                  <PowerOff aria-hidden="true" className="h-[18px] w-[18px]" />
                </Button>
              ) : null}
            </div>
          ),
        } satisfies TableColumn<RhColaborador>]
      : []),
  ]

  const folhaColumns: TableColumn<RhFolhaRow>[] = [
    {
      key: 'nome',
      header: 'Colaborador',
      render: (row) => (
        <div className="min-w-0">
          <p className="font-semibold text-ink">{row.nome}</p>
          <p className="text-xs text-ink-muted">{[row.cargo, row.setor].filter(Boolean).join(' · ') || '—'}</p>
        </div>
      ),
    },
    {
      key: 'salario_fixo',
      header: 'Fixo',
      align: 'right',
      render: (row) => <span className="num">{formatMoney(row.salario_fixo)}</span>,
    },
    {
      key: 'meta',
      header: 'Meta',
      align: 'right',
      render: (row) => (
        <div className="flex flex-col items-end gap-1">
          <span className="num text-sm">
            {formatMoney(row.meta_valor)} <span className="text-ink-muted">/ {formatMoney(row.meta_realizado)}</span>
          </span>
          {metaAtingida(row) ? <Badge tone="success">Atingida</Badge> : null}
        </div>
      ),
    },
    {
      key: 'comissao',
      header: 'Comissão',
      align: 'right',
      render: (row) => <span className="num">{formatMoney(row.comissao)}</span>,
    },
    {
      key: 'bonus',
      header: 'Bônus',
      align: 'right',
      render: (row) => <span className="num">{formatMoney(row.bonus)}</span>,
    },
    {
      key: 'descontos',
      header: 'Descontos',
      align: 'right',
      render: (row) => <span className="num">{formatMoney(row.descontos)}</span>,
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (row) => (
        <span className="num font-semibold text-ink">{formatMoney(totalFolha(row))}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const info = folhaStatusInfo(row)
        return <Badge tone={info.tone}>{info.label}</Badge>
      },
    },
    ...(podeEscrever
      ? [{
          key: 'acoes',
          header: '',
          align: 'right' as const,
          render: (row: RhFolhaRow) => {
            const folhaId = row.folha_id
            return (
              <div className="flex items-center justify-end gap-1">
                {row.status !== 'pago' ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={folhaId ? `Editar folha de ${row.nome}` : `Lançar folha de ${row.nome}`}
                    title={folhaId ? 'Editar' : 'Lançar'}
                    onClick={() => setFolhaModal({ row })}
                  >
                    {folhaId
                      ? <Pencil aria-hidden="true" className="h-[18px] w-[18px]" />
                      : <Plus aria-hidden="true" className="h-[18px] w-[18px]" />}
                  </Button>
                ) : null}
                {folhaId && row.status === 'rascunho' ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Fechar folha de ${row.nome}`}
                    title="Fechar"
                    onClick={() => mudarStatus.mutate({ id: folhaId, status: 'fechado' })}
                  >
                    <Lock aria-hidden="true" className="h-[18px] w-[18px]" />
                  </Button>
                ) : null}
                {folhaId && row.status === 'fechado' ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Marcar folha de ${row.nome} como paga`}
                    title="Marcar pago"
                    onClick={() => mudarStatus.mutate({ id: folhaId, status: 'pago' })}
                  >
                    <Check aria-hidden="true" className="h-[18px] w-[18px]" />
                  </Button>
                ) : null}
              </div>
            )
          },
        } satisfies TableColumn<RhFolhaRow>]
      : []),
  ]

  const setorColumns: TableColumn<RhSetorResumo>[] = [
    {
      key: 'setor',
      header: 'Setor',
      render: (item) => <span className="font-semibold text-ink">{item.setor}</span>,
    },
    {
      key: 'ativos',
      header: 'Ativos',
      align: 'right',
      render: (item) => <span className="num">{item.ativos}</span>,
    },
    {
      key: 'folha',
      header: 'Folha do mês',
      align: 'right',
      render: (item) => <span className="num">{formatMoney(item.folha)}</span>,
    },
    {
      key: 'percentual',
      header: '% do total',
      align: 'right',
      render: (item) => <span className="num">{formatPercent(item.percentual)}</span>,
    },
  ]

  const alertas = [
    { key: 'salario', label: 'Sem salário fixo', itens: semSalario },
    { key: 'aniversario', label: 'Sem data de nascimento', itens: semAniversario },
    { key: 'responsavel', label: 'Sem responsável', itens: semResponsavel },
  ]

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        title="Setor RH"
        subtitle="Pessoas, folha, setores e comissões"
        actions={(
          <input
            type="month"
            aria-label="Competência"
            className="design-input h-[42px] px-3"
            value={mes}
            onChange={(event) => event.target.value && setMes(event.target.value)}
          />
        )}
      />

      {colaboradoresQuery.isError ? (
        <ErrorState message={extractErrorMessage(colaboradoresQuery.error)} onRetry={() => void colaboradoresQuery.refetch()} />
      ) : colaboradoresQuery.isLoading ? (
        <LoadingState label="Carregando colaboradores" />
      ) : (
        <>
          <div role="tablist" aria-label="Seções do Setor RH" className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={`press whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${tab === item.id ? 'bg-brand-soft text-brand' : 'text-ink-muted hover:text-ink'}`}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === 'visao-geral' ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <ResumoCard icon={Users} label="Colaboradores ativos" value={String(ativos.length)} />
                <ResumoCard icon={CalendarDays} label="Férias / afastados" value={String(feriasAfastados.length)} />
                <ResumoCard icon={Cake} label="Aniversariantes do mês" value={String(aniversariantes.length)} />
                <ResumoCard icon={Wallet} label="Total da folha do mês" value={formatMoney(totais.total)} />
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <SectionCard title="Composição por setor" subtitle="Headcount ativo e participação">
                  {setoresResumo.length === 0 ? (
                    <p className="text-sm text-ink-muted">Sem setores cadastrados.</p>
                  ) : (
                    <div className="space-y-3">
                      {setoresResumo.map((item) => (
                        <div key={item.setor}>
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="truncate text-ink">{item.setor}</span>
                            <span className="num shrink-0 text-ink-muted">{item.ativos} · {formatPercent(item.percentual)}</span>
                          </div>
                          <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-muted">
                            <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, item.percentual)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>

                <SectionCard title="Hierarquia — Nível Raiz" subtitle={`${raizes.length} sem gestor definido`}>
                  {raizes.length === 0 ? (
                    <p className="text-sm text-ink-muted">Todos os colaboradores ativos têm responsável.</p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {raizes.slice(0, 8).map((colaborador) => (
                        <li key={colaborador.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink">{colaborador.nome}</p>
                            <p className="truncate text-xs text-ink-muted">{colaborador.cargo || colaborador.setor || '—'}</p>
                          </div>
                          <span className="num shrink-0 text-xs text-ink-muted">
                            {reportesDiretos.get(colaborador.id) ?? 0} direto(s)
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3 flex justify-end">
                    <Button variant="secondary" onClick={() => setTab('organograma')}>Abrir organograma</Button>
                  </div>
                </SectionCard>

                <SectionCard title="Alertas de cadastro" subtitle="Colaboradores ativos com pendência">
                  <div className="space-y-3">
                    {alertas.map((alerta) => (
                      <div key={alerta.key} className="flex items-start gap-3 rounded-xl border border-line px-3 py-2.5">
                        <AlertTriangle
                          aria-hidden="true"
                          className={`mt-0.5 h-4 w-4 shrink-0 ${alerta.itens.length > 0 ? 'text-[var(--warning)]' : 'text-ink-muted'}`}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink">
                            {alerta.label} <span className="num text-ink-muted">({alerta.itens.length})</span>
                          </p>
                          <p className="truncate text-xs text-ink-muted">
                            {alerta.itens.length > 0 ? alerta.itens.slice(0, 3).map((item) => item.nome).join(', ') : 'Sem pendências'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>

              <SectionCard title="Aniversariantes do mês" subtitle="Ativos que fazem aniversário na competência">
                {aniversariantes.length === 0 ? (
                  <p className="text-sm text-ink-muted">Nenhum aniversariante no mês.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {aniversariantes.slice(0, 6).map((colaborador) => (
                      <li key={colaborador.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                          {colaborador.data_nascimento?.slice(8, 10)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">{colaborador.nome}</p>
                          <p className="truncate text-xs text-ink-muted">
                            {[colaborador.cargo, colaborador.setor].filter(Boolean).join(' · ') || '—'}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            </div>
          ) : null}

          {tab === 'colaboradores' ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <input
                  className="design-input h-11 w-full px-4"
                  placeholder="Buscar nome, cargo ou setor"
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  aria-label="Buscar colaborador"
                />
                <select
                  className="design-input h-11 w-full px-3"
                  aria-label="Filtrar por status"
                  value={statusFiltro}
                  onChange={(event) => setStatusFiltro(event.target.value as 'todos' | RhStatus)}
                >
                  <option value="todos">Todos os status</option>
                  {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <select
                  className="design-input h-11 w-full px-3"
                  aria-label="Filtrar por setor"
                  value={setorFiltro}
                  onChange={(event) => setSetorFiltro(event.target.value)}
                >
                  <option value="todos">Todos os setores</option>
                  {setoresDisponiveis.map((setor) => <option key={setor} value={setor}>{setor}</option>)}
                </select>
                <select
                  className="design-input h-11 w-full px-3"
                  aria-label="Filtrar por tipo de contrato"
                  value={contratoFiltro}
                  onChange={(event) => setContratoFiltro(event.target.value as 'todos' | RhTipoContrato)}
                >
                  <option value="todos">Todos os contratos</option>
                  {CONTRATO_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>

              {podeEscrever ? (
                <div className="flex justify-end">
                  <Button icon={Plus} onClick={() => setColaboradorModal({ colaborador: null })}>
                    Novo colaborador
                  </Button>
                </div>
              ) : null}

              <DataTable
                columns={colaboradorColumns}
                data={colaboradoresFiltrados}
                rowKey={(item) => item.id}
                stackOnMobile
                mobileColumnKeys={['nome', 'cargo', 'status', 'contrato']}
              />
            </div>
          ) : null}

          {tab === 'organograma' ? (
            <Suspense fallback={<LoadingState label="Carregando organograma" />}>
              <RhOrganograma
                colaboradores={colaboradores}
                podeEscrever={podeEscrever}
                onEdit={(colaborador) => setColaboradorModal({ colaborador })}
                onUpdateResponsavel={(id, responsavelId) => atualizar.mutate({ id, payload: { responsavel_id: responsavelId } })}
                atualizando={atualizar.isPending}
              />
            </Suspense>
          ) : null}

          {tab === 'folha' ? (
            folhaQuery.isError ? (
              <ErrorState message={extractErrorMessage(folhaQuery.error)} onRetry={() => void folhaQuery.refetch()} />
            ) : folhaQuery.isLoading && !folhaQuery.data ? (
              <LoadingState label="Carregando folha do mês" />
            ) : (
              <DataTable
                columns={folhaColumns}
                data={rows}
                rowKey={(row) => row.colaborador_id}
                stackOnMobile
                mobileColumnKeys={['nome', 'total', 'status']}
                footer={(
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <span className="font-bold text-ink">Totais do mês</span>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-ink-muted">
                      <span>Fixo <strong className="num text-ink">{formatMoney(totais.salario_fixo)}</strong></span>
                      <span>Comissão <strong className="num text-ink">{formatMoney(totais.comissao)}</strong></span>
                      <span>Bônus <strong className="num text-ink">{formatMoney(totais.bonus)}</strong></span>
                      <span>Descontos <strong className="num text-ink">{formatMoney(totais.descontos)}</strong></span>
                      <span>Total <strong className="num text-ink">{formatMoney(totais.total)}</strong></span>
                    </div>
                  </div>
                )}
              />
            )
          ) : null}

          {tab === 'aniversariantes' ? (
            aniversariantes.length === 0 ? (
              <EmptyState title="Nenhum aniversariante no mês" description="Selecione outro mês ou confira as datas de nascimento no cadastro." />
            ) : (
              <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
                {aniversariantes.map((colaborador) => (
                  <li key={colaborador.id} className="flex items-center gap-4 px-4 py-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand">
                      {colaborador.data_nascimento?.slice(8, 10)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{colaborador.nome}</p>
                      <p className="truncate text-xs text-ink-muted">
                        {[colaborador.cargo, colaborador.setor].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : null}

          {tab === 'setores' ? (
            <div className="space-y-5">
              {setoresResumo.length === 0 ? (
                <EmptyState title="Nenhum setor cadastrado" description="Atribua setor aos colaboradores para ver a composição." />
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {setoresResumo.map((item) => (
                      <Card key={item.setor}>
                        <div className="p-4">
                          <div className="flex items-center gap-2">
                            <Building2 aria-hidden="true" className="h-4 w-4 shrink-0 text-brand" />
                            <p className="truncate font-semibold text-ink">{item.setor}</p>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink-muted">Ativos</p>
                              <p className="num text-xl font-semibold text-ink">{item.ativos}</p>
                            </div>
                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink-muted">Folha do mês</p>
                              <p className="num text-xl font-semibold text-ink">{formatMoney(item.folha)}</p>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  <DataTable columns={setorColumns} data={setoresResumo} rowKey={(item) => item.setor} stackOnMobile />
                </>
              )}
            </div>
          ) : null}
        </>
      )}

      {colaboradorModal ? (
        <ColaboradorModal
          key={colaboradorModal.colaborador?.id ?? 'novo'}
          colaborador={colaboradorModal.colaborador}
          colaboradores={colaboradores}
          isPending={criar.isPending || atualizar.isPending}
          onClose={() => setColaboradorModal(null)}
          onSubmit={(payload) => {
            if (colaboradorModal.colaborador) {
              atualizar.mutate({ id: colaboradorModal.colaborador.id, payload })
            } else {
              criar.mutate(payload)
            }
          }}
        />
      ) : null}

      {folhaModal ? (
        <FolhaModal
          key={folhaModal.row.folha_id ?? folhaModal.row.colaborador_id}
          row={folhaModal.row}
          mes={mes}
          isPending={salvarFolha.isPending}
          onClose={() => setFolhaModal(null)}
          onSubmit={(payload) => salvarFolha.mutate({ colaboradorId: folhaModal.row.colaborador_id, payload })}
        />
      ) : null}

      {desativar ? (
        <Modal
          open
          size="sm"
          title="Desativar colaborador"
          subtitle={desativar.nome}
          onClose={() => setDesativar(null)}
          closeDisabled={desativarMut.isPending}
          footer={(
            <>
              <Button variant="secondary" onClick={() => setDesativar(null)} disabled={desativarMut.isPending}>Cancelar</Button>
              <Button variant="danger" isLoading={desativarMut.isPending} onClick={() => desativarMut.mutate(desativar.id)}>
                Desativar
              </Button>
            </>
          )}
        >
          <p className="text-sm text-ink">
            O colaborador sai das listas ativas e deixa de entrar na folha dos próximos meses. O histórico é mantido.
          </p>
        </Modal>
      ) : null}
    </div>
  )
}
