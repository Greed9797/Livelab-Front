import { FormEvent, useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { asString } from '../../utils/format'
import type { JsonRecord } from '../../types/models'
import type { GradeCelula } from './gradeUtils'

export interface GradeCellTarget {
  cabineId: string
  cabineNumero: number | null
  horaInicio: string
  horaFim: string
  /** Data do dia (visão normal) — ausente no modo editar padrão. */
  data?: string
  /** Dia da semana (modo editar padrão). */
  diaSemana?: number
  celula: GradeCelula | null
}

interface GradeCellPopoverProps {
  target: GradeCellTarget | null
  marcas: JsonRecord[]
  apresentadoras: JsonRecord[]
  isSaving: boolean
  errorMessage: string | null
  onClose: () => void
  onSave: (values: { marca_id: string; apresentadora_id: string | null; observacao: string | null }) => void
  onClear: () => void
}

export function GradeCellPopover({ target, marcas, apresentadoras, isSaving, errorMessage, onClose, onSave, onClear }: GradeCellPopoverProps) {
  const [marcaId, setMarcaId] = useState('')
  const [apresentadoraId, setApresentadoraId] = useState('')
  const [observacao, setObservacao] = useState('')

  useEffect(() => {
    setMarcaId(target?.celula?.marca_id ?? '')
    setApresentadoraId(target?.celula?.apresentadora_id ?? '')
    setObservacao(target?.celula?.observacao ?? '')
  }, [target])

  if (!target) return null

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!marcaId) return
    onSave({ marca_id: marcaId, apresentadora_id: apresentadoraId || null, observacao: observacao.trim() || null })
  }

  const titulo = `Cabine ${target.cabineNumero ?? '—'} · ${target.horaInicio}–${target.horaFim}`
  const subtitulo = target.data
    ? `Ajuste válido apenas em ${target.data.split('-').reverse().join('/')}`
    : 'Editando o padrão semanal — repete toda semana'

  return (
    <Modal open title={titulo} subtitle={subtitulo} size="sm" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4 px-5 py-4">
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Marca</span>
          <select className="design-input h-10 w-full px-3" value={marcaId} onChange={(e) => setMarcaId(e.target.value)} required>
            <option value="">Selecione a marca…</option>
            {marcas.map((m) => (
              <option key={asString(m.id)} value={asString(m.id)}>{asString(m.nome, 'Sem nome')}</option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Apresentadora</span>
          <select className="design-input h-10 w-full px-3" value={apresentadoraId} onChange={(e) => setApresentadoraId(e.target.value)}>
            <option value="">Sem apresentadora</option>
            {apresentadoras.map((a) => (
              <option key={asString(a.id)} value={asString(a.id)}>{asString(a.nome, 'Sem nome')}</option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Observação</span>
          <input className="design-input h-10 w-full px-3" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Opcional" />
        </label>

        {errorMessage ? <p className="text-sm font-semibold text-[color:var(--danger)]">{errorMessage}</p> : null}

        <div className="flex items-center justify-between gap-2 pt-1">
          {target.celula ? (
            <Button type="button" variant="danger" onClick={onClear} disabled={isSaving}>Limpar célula</Button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>Cancelar</Button>
            <Button type="submit" isLoading={isSaving} disabled={!marcaId}>Salvar</Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
