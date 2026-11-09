import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Building2, GitBranch, Pencil, RefreshCw, Users, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { EmptyState } from '../ui/States'
import { useToast } from '../ui/Toast'
import { extractErrorMessage } from '../../services/api'
import type { RhColaborador, RhStatus } from '../../types/models'
import {
  ORG_NODE_HEIGHT,
  ORG_NODE_WIDTH,
  buildHierarchyEdges,
  layoutHierarquia,
  layoutPorSetor,
  setoresComCor,
  wouldCreateCycle,
} from '../../utils/rh-organograma'

interface OrgNodeData extends Record<string, unknown> {
  nome: string
  cargo: string | null
  setor: string | null
  status: RhStatus
  cor: string
  reportes: number
  mostrarCargo: boolean
  mostrarSetor: boolean
  editMode: boolean
}

type OrgNode = Node<OrgNodeData, 'colaborador'>

const STATUS_DOT: Record<RhStatus, string> = {
  ativo: 'var(--success)',
  ferias: 'var(--info)',
  afastado: 'var(--warning)',
  inativo: 'var(--text-muted)',
}

function iniciais(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('')
}

function ColaboradorOrgNode({ data }: NodeProps) {
  const dados = data as OrgNodeData
  return (
    <div
      className="relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]"
      style={{ width: ORG_NODE_WIDTH, height: ORG_NODE_HEIGHT, borderTopColor: dados.cor, borderTopWidth: 4 }}
    >
      {dados.editMode ? (
        <Handle type="target" position={Position.Top} style={{ background: 'var(--primary)', borderColor: 'var(--bg-elev-1)' }} />
      ) : null}
      <div className="flex items-start gap-2.5 px-3.5 pt-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold"
          style={{ background: 'var(--bg-elev-2)', color: dados.cor }}
        >
          {iniciais(dados.nome)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{dados.nome}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-muted">
            <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: STATUS_DOT[dados.status] }} />
            {dados.reportes} {dados.reportes === 1 ? 'reporte' : 'reportes'}
          </p>
        </div>
      </div>
      <div className="mt-auto space-y-0.5 px-3.5 pb-3 text-xs text-ink-muted">
        {dados.mostrarCargo && dados.cargo ? <p className="truncate">{dados.cargo}</p> : null}
        {dados.mostrarSetor && dados.setor ? <p className="truncate text-[11px]">{dados.setor}</p> : null}
      </div>
      {dados.editMode ? (
        <Handle type="source" position={Position.Bottom} style={{ background: 'var(--primary)', borderColor: 'var(--bg-elev-1)' }} />
      ) : null}
    </div>
  )
}

const nodeTypes: NodeTypes = { colaborador: ColaboradorOrgNode }

function KpiCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
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

export interface RhOrganogramaProps {
  colaboradores: RhColaborador[]
  podeEscrever: boolean
  onEdit: (colaborador: RhColaborador) => void
  onUpdateResponsavel: (colaboradorId: string, responsavelId: string | null) => Promise<void> | void
  atualizando?: boolean
}

export function RhOrganograma({
  colaboradores,
  podeEscrever,
  onEdit,
  onUpdateResponsavel,
  atualizando = false,
}: RhOrganogramaProps) {
  const toast = useToast()
  const [busca, setBusca] = useState('')
  const [setorFiltro, setSetorFiltro] = useState('todos')
  const [modo, setModo] = useState<'hierarquia' | 'setor'>('hierarquia')
  const [mostrarCargo, setMostrarCargo] = useState(true)
  const [mostrarSetor, setMostrarSetor] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [organizarTick, setOrganizarTick] = useState(0)

  const ativos = useMemo(
    () => colaboradores.filter((colaborador) => (colaborador.status ?? (colaborador.ativo ? 'ativo' : 'inativo')) !== 'inativo'),
    [colaboradores],
  )

  const setores = useMemo(() => setoresComCor(ativos), [ativos])
  const corPorSetor = useMemo(() => new Map(setores.map((item) => [item.setor, item.cor])), [setores])
  const porId = useMemo(() => new Map(colaboradores.map((colaborador) => [colaborador.id, colaborador])), [colaboradores])

  const semSetor = ativos.filter((colaborador) => !colaborador.setor?.trim())

  const reportesPorId = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const colaborador of ativos) {
      if (!colaborador.responsavel_id) continue
      mapa.set(colaborador.responsavel_id, (mapa.get(colaborador.responsavel_id) ?? 0) + 1)
    }
    return mapa
  }, [ativos])

  const buscaNormalizada = busca.trim().toLowerCase()
  const visiveis = useMemo(() => ativos.filter((colaborador) => {
    const setor = colaborador.setor?.trim() || 'Sem setor'
    const texto = [colaborador.nome, colaborador.cargo].filter(Boolean).join(' ').toLowerCase()
    return (!buscaNormalizada || texto.includes(buscaNormalizada))
      && (setorFiltro === 'todos' || setor === setorFiltro)
  }), [ativos, buscaNormalizada, setorFiltro])

  const layout = useMemo(
    () => (modo === 'setor' ? layoutPorSetor(visiveis) : layoutHierarquia(visiveis)),
    [visiveis, modo, organizarTick],
  )

  const nodesBase = useMemo<OrgNode[]>(() => visiveis.map((colaborador) => {
    const status = colaborador.status ?? (colaborador.ativo ? 'ativo' : 'inativo')
    const setor = colaborador.setor?.trim() || 'Sem setor'
    return {
      id: colaborador.id,
      type: 'colaborador' as const,
      position: layout[colaborador.id] ?? { x: 0, y: 0 },
      draggable: false,
      data: {
        nome: colaborador.nome,
        cargo: colaborador.cargo,
        setor: colaborador.setor,
        status,
        cor: corPorSetor.get(setor) ?? 'var(--border-strong)',
        reportes: reportesPorId.get(colaborador.id) ?? 0,
        mostrarCargo,
        mostrarSetor,
        editMode: editMode && podeEscrever,
      },
    }
  }), [visiveis, layout, corPorSetor, reportesPorId, mostrarCargo, mostrarSetor, editMode, podeEscrever])

  const [nodes, setNodes, onNodesChange] = useNodesState<OrgNode>(nodesBase)

  useEffect(() => {
    setNodes(nodesBase)
  }, [nodesBase, setNodes])

  const edges = useMemo<Edge[]>(() => buildHierarchyEdges(visiveis).map((edge) => ({
    id: `${edge.source}-${edge.target}`,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    style: { stroke: 'var(--border-strong)', strokeWidth: 1.5 },
  })), [visiveis])

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return
    if (wouldCreateCycle(connection.target, connection.source, ativos)) {
      toast.push('Esse vínculo criaria um ciclo na hierarquia.', 'error')
      return
    }
    const resultado = onUpdateResponsavel(connection.target, connection.source)
    if (resultado && typeof (resultado as Promise<void>).catch === 'function') {
      void (resultado as Promise<void>).catch((error) => toast.push(extractErrorMessage(error), 'error'))
    }
  }, [ativos, onUpdateResponsavel, toast])

  const comGestor = ativos.filter((colaborador) => Boolean(colaborador.responsavel_id)).length
  const editando = editMode && podeEscrever

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard icon={Users} label="Ativos" value={ativos.length} />
        <KpiCard icon={GitBranch} label="Com gestor" value={comGestor} />
        <KpiCard icon={Building2} label="Setores" value={setores.length} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          className="design-input h-10 min-w-48 flex-1 px-4"
          placeholder="Buscar nome ou cargo"
          aria-label="Buscar no organograma"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
        />
        <select
          className="design-input h-10 px-3"
          aria-label="Filtrar setor do organograma"
          value={setorFiltro}
          onChange={(event) => setSetorFiltro(event.target.value)}
        >
          <option value="todos">Todos os setores</option>
          {setores.map((item) => <option key={item.setor} value={item.setor}>{item.setor}</option>)}
        </select>
        <Button variant={modo === 'hierarquia' ? 'primary' : 'secondary'} onClick={() => setModo('hierarquia')}>
          Hierarquia
        </Button>
        <Button variant={modo === 'setor' ? 'primary' : 'secondary'} onClick={() => setModo('setor')}>
          Por setor
        </Button>
        <Button variant={mostrarCargo ? 'secondary' : 'ghost'} onClick={() => setMostrarCargo((valor) => !valor)}>
          Cargo
        </Button>
        <Button variant={mostrarSetor ? 'secondary' : 'ghost'} onClick={() => setMostrarSetor((valor) => !valor)}>
          Setor
        </Button>
        <Button variant="secondary" icon={RefreshCw} onClick={() => setOrganizarTick((valor) => valor + 1)}>
          Organizar
        </Button>
        {podeEscrever ? (
          <Button
            variant={editando ? 'primary' : 'secondary'}
            icon={Pencil}
            isLoading={atualizando}
            onClick={() => setEditMode((valor) => !valor)}
          >
            Editar
          </Button>
        ) : null}
      </div>

      {setores.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {setores.map((item) => (
            <span key={item.setor} className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: item.cor }} />
              {item.setor}
            </span>
          ))}
        </div>
      ) : null}

      {editando ? (
        <p className="rounded-xl border border-dashed border-line bg-surface px-3 py-2 text-xs text-ink-muted">
          Conecte a alça inferior de um responsável à alça superior do colaborador. Vínculos que criam ciclo são bloqueados.
        </p>
      ) : null}

      {visiveis.length === 0 ? (
        <EmptyState title="Nenhum colaborador no organograma" description="Ajuste a busca ou o filtro de setor." />
      ) : (
        <div className="h-[640px] w-full overflow-hidden rounded-2xl border border-line bg-surface">
          <ReactFlow
            key={`${modo}-${organizarTick}`}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => {
              const colaborador = porId.get(node.id)
              if (colaborador) onEdit(colaborador)
            }}
            nodesConnectable={editando}
            fitView
            minZoom={0.3}
            maxZoom={1.6}
          >
            <Background color="var(--border)" gap={24} />
            <Controls />
            <MiniMap nodeColor={(node) => String((node.data as OrgNodeData).cor ?? 'var(--border)')} pannable zoomable />
          </ReactFlow>
        </div>
      )}

      {semSetor.length > 0 ? (
        <Card>
          <div className="border-b border-line px-4 py-3">
            <p className="text-sm font-bold text-ink">Cadastros sem setor</p>
            <p className="mt-0.5 text-xs text-ink-muted">Defina o setor para colorir e agrupar o organograma.</p>
          </div>
          <ul className="divide-y divide-line">
            {semSetor.map((colaborador) => (
              <li key={colaborador.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-surface-muted"
                  onClick={() => onEdit(colaborador)}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-ink">{colaborador.nome}</span>
                    <span className="block truncate text-xs text-ink-muted">{colaborador.cargo || 'Sem cargo'}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-brand">Editar</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  )
}
