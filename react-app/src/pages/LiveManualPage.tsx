import { AlertCircle, Plus } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ErrorState, LoadingState } from '../components/ui/States'
import { criarLiveManual, getCabines, getClientes } from '../services/domain'
import { extractErrorMessage } from '../services/api'
import { asString, asNumber } from '../utils/format'
import { useCurrentUser } from '../stores/auth-store'
import type { JsonRecord } from '../types/models'

const writeRoles = new Set(['franqueador_master', 'franqueado', 'gerente', 'produtor_live'])

const emptyForm = {
  cabine_id: '',
  cliente_id: '',
  hora_inicio: '',
  hora_fim: '',
  fat_gerado: '',
  tipo: 'cliente' as 'cliente' | 'afiliado' | 'teste',
}

export function LiveManualPage() {
  const user = useCurrentUser()
  const canWrite = writeRoles.has(user?.papel ?? '')
  const [form, setForm] = useState(emptyForm)
  const [successMessage, setSuccessMessage] = useState('')
  const client = useQueryClient()

  const cabinesQuery = useQuery({ queryKey: ['cabines'], queryFn: getCabines, enabled: canWrite })
  const clientesQuery = useQuery({ queryKey: ['clientes'], queryFn: getClientes, enabled: canWrite && form.tipo === 'cliente' })

  const createMutation = useMutation({
    mutationFn: criarLiveManual,
    onSuccess: () => {
      setForm(emptyForm)
      setSuccessMessage('Live manual criada com sucesso!')
      setTimeout(() => setSuccessMessage(''), 5000)
      void client.invalidateQueries({ queryKey: ['lives'] })
      void client.invalidateQueries({ queryKey: ['cabines'] })
    },
  })

  if (!canWrite) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Operação" accent="Live" title="Manual" subtitle="Você não tem permissão para acessar esta página." />
        <Card>
          <CardBody>
            <p className="text-sm text-ink-muted">Apenas gerentes, produtores e franqueados podem criar lives manualmente.</p>
          </CardBody>
        </Card>
      </div>
    )
  }

  if (cabinesQuery.isLoading || clientesQuery.isLoading) return <LoadingState />
  if (cabinesQuery.isError) return <ErrorState message={extractErrorMessage(cabinesQuery.error)} onRetry={() => void cabinesQuery.refetch()} />

  function setField(key: keyof typeof emptyForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function validateForm(): string | null {
    if (!form.cabine_id.trim()) return 'Cabine é obrigatória'
    if (!form.hora_inicio.trim()) return 'Hora de início é obrigatória'
    if (!form.hora_fim.trim()) return 'Hora de término é obrigatória'

    const inicioDate = new Date(form.hora_inicio)
    const fimDate = new Date(form.hora_fim)
    if (fimDate <= inicioDate) return 'Hora de término deve ser após a hora de início'

    if (form.tipo === 'cliente' && !form.cliente_id.trim()) {
      return 'Cliente é obrigatório para lives do tipo cliente'
    }

    return null
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validationError = validateForm()
    if (validationError) {
      return
    }

    const payload: JsonRecord = {
      cabine_id: form.cabine_id,
      hora_inicio: form.hora_inicio,
      hora_fim: form.hora_fim,
      tipo: form.tipo,
    }

    if (form.cliente_id) {
      payload.cliente_id = form.cliente_id
    }

    if (form.fat_gerado.trim()) {
      payload.fat_gerado = asNumber(form.fat_gerado)
    }

    createMutation.mutate(payload)
  }

  const cabines = cabinesQuery.data ?? []
  const clientes = clientesQuery.data ?? []
  const tipoClienteSelecionado = form.tipo === 'cliente'
  const validationError = validateForm()

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operação"
        accent="Live"
        title="Manual"
        subtitle="Criar uma live retroativa manualmente para uma cabine."
      />

      <Card>
        <CardBody>
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={onSubmit}>
            <label className="block">
              <span className="text-sm font-semibold text-ink">Cabine *</span>
              <select
                className="design-input mt-2 h-11 w-full px-4"
                value={form.cabine_id}
                onChange={(event) => setField('cabine_id', event.target.value)}
                required
                disabled={createMutation.isPending}
              >
                <option value="">Selecione uma cabine</option>
                {cabines.map((cabine) => (
                  <option key={cabine.id} value={cabine.id}>
                    Cabine {asString(cabine.numero)} {cabine.cliente_nome ? `- ${cabine.cliente_nome}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-ink">Tipo *</span>
              <select
                className="design-input mt-2 h-11 w-full px-4"
                value={form.tipo}
                onChange={(event) => setField('tipo', event.target.value as 'cliente' | 'afiliado' | 'teste')}
                disabled={createMutation.isPending}
              >
                <option value="cliente">Cliente</option>
                <option value="afiliado">Afiliado</option>
                <option value="teste">Teste</option>
              </select>
            </label>

            {tipoClienteSelecionado ? (
              <label className="block">
                <span className="text-sm font-semibold text-ink">Cliente *</span>
                <select
                  className="design-input mt-2 h-11 w-full px-4"
                  value={form.cliente_id}
                  onChange={(event) => setField('cliente_id', event.target.value)}
                  disabled={clientesQuery.isLoading || createMutation.isPending}
                  required={tipoClienteSelecionado}
                >
                  <option value="">Selecione um cliente</option>
                  {clientes.map((cliente) => (
                    <option key={asString(cliente.id)} value={asString(cliente.id)}>
                      {asString(cliente.nome ?? cliente.razao_social ?? cliente.email, 'Cliente')}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="block">
              <span className="text-sm font-semibold text-ink">Hora de Início *</span>
              <input
                className="design-input mt-2 h-11 w-full px-4"
                type="datetime-local"
                value={form.hora_inicio}
                onChange={(event) => setField('hora_inicio', event.target.value)}
                required
                disabled={createMutation.isPending}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-ink">Hora de Término *</span>
              <input
                className="design-input mt-2 h-11 w-full px-4"
                type="datetime-local"
                value={form.hora_fim}
                onChange={(event) => setField('hora_fim', event.target.value)}
                required
                disabled={createMutation.isPending}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-ink">GMV Gerado (opcional)</span>
              <input
                className="design-input mt-2 h-11 w-full px-4"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.fat_gerado}
                onChange={(event) => setField('fat_gerado', event.target.value)}
                disabled={createMutation.isPending}
              />
            </label>

            {validationError ? (
              <p className="flex items-center gap-2 rounded-2xl bg-[var(--warning-soft)] px-4 py-3 text-sm font-medium text-[var(--warning)] md:col-span-2 xl:col-span-3">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {validationError}
              </p>
            ) : null}

            {createMutation.isError ? (
              <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)] md:col-span-2 xl:col-span-3">
                {extractErrorMessage(createMutation.error)}
              </p>
            ) : null}

            {successMessage ? (
              <p className="rounded-2xl bg-[var(--success-soft)] px-4 py-3 text-sm font-medium text-[var(--success)] md:col-span-2 xl:col-span-3">
                {successMessage}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-3">
              <Button
                type="submit"
                icon={Plus}
                isLoading={createMutation.isPending}
                disabled={Boolean(validationError)}
              >
                Criar Live Manual
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
