import { useState } from 'react'
import { Check, Edit2, X } from 'lucide-react'
import { formatMoney } from '../../utils/format'
import { parseBRMoneyToDecimal } from '../../utils/money'
import type { JsonRecord } from '../../types/models'
import type { LiveFilterOption } from './live-helpers'

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((s) => s[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

// Célula de GMV editável inline (somente para lives em rascunho).
// Reusa updateLive (PATCH parcial) via onSave; grava fat_gerado + manual_gmv.
export function InlineGmvCell({
  gmv,
  hasValue = true,
  editable,
  onSave,
}: {
  gmv: number
  hasValue?: boolean
  editable: boolean
  onSave: (payload: JsonRecord) => Promise<unknown>
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  function begin() {
    setValue(hasValue ? String(gmv).replace('.', ',') : '')
    setError(false)
    setEditing(true)
  }
  function cancel() {
    setEditing(false)
    setError(false)
  }
  async function commit() {
    const decimal = parseBRMoneyToDecimal(value)
    if (!Number.isFinite(decimal) || decimal < 0) {
      setError(true)
      return
    }
    setSaving(true)
    try {
      await onSave({ fat_gerado: decimal, manual_gmv: decimal })
      setEditing(false)
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  const iconBtn = (color: string): React.CSSProperties => ({
    width: 24,
    height: 24,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 'var(--radius-pill)',
    border: '1px solid var(--border)',
    background: 'var(--bg-elev-2)',
    color,
    cursor: 'pointer',
    flexShrink: 0,
  })

  if (editing) {
    return (
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, paddingRight: 6 }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void commit()
            } else if (e.key === 'Escape') {
              cancel()
            }
          }}
          aria-label="GMV faturado"
          placeholder="0,00"
          inputMode="decimal"
          disabled={saving}
          style={{
            width: 86,
            textAlign: 'right',
            padding: '4px 6px',
            borderRadius: 6,
            border: `1px solid ${error ? 'var(--danger)' : 'var(--primary)'}`,
            background: 'var(--bg-input)',
            color: 'var(--text-primary)',
            fontSize: 12.5,
            fontFamily: 'inherit',
            fontVariantNumeric: 'tabular-nums',
          }}
        />
        <button type="button" title="Salvar GMV" onClick={() => void commit()} disabled={saving} style={iconBtn('var(--success)')}>
          <Check style={{ width: 13, height: 13 }} />
        </button>
        <button type="button" title="Cancelar" onClick={cancel} disabled={saving} style={iconBtn('var(--text-muted)')}>
          <X style={{ width: 13, height: 13 }} />
        </button>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 6,
        paddingRight: editable ? 6 : 14,
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
      }}
    >
      {hasValue ? (
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', letterSpacing: -0.005 }}>{formatMoney(gmv)}</span>
      ) : (
        <span style={{ color: 'var(--text-faint)', fontSize: 13 }}>—</span>
      )}
      {editable ? (
        <button
          type="button"
          title="Editar GMV (rascunho)"
          onClick={(e) => {
            e.stopPropagation()
            begin()
          }}
          style={{ width: 22, height: 22, display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-pill)', border: '1px solid transparent', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <Edit2 style={{ width: 12, height: 12 }} />
        </button>
      ) : null}
    </div>
  )
}

// Célula de Pedidos editável inline (rascunho). Grava qtd_pedidos + manual_orders.
export function InlinePedidosCell({
  pedidos,
  hasValue = true,
  editable,
  onSave,
}: {
  pedidos: number
  hasValue?: boolean
  editable: boolean
  onSave: (payload: JsonRecord) => Promise<unknown>
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  function begin() {
    setValue(hasValue ? String(pedidos) : '')
    setError(false)
    setEditing(true)
  }
  function cancel() {
    setEditing(false)
    setError(false)
  }
  async function commit() {
    const n = Math.trunc(Number(value.replace(/[^\d]/g, '')))
    if (!Number.isFinite(n) || n < 0) {
      setError(true)
      return
    }
    setSaving(true)
    try {
      await onSave({ qtd_pedidos: n, manual_orders: n })
      setEditing(false)
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  const iconBtn = (color: string): React.CSSProperties => ({
    width: 24,
    height: 24,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 'var(--radius-pill)',
    border: '1px solid var(--border)',
    background: 'var(--bg-elev-2)',
    color,
    cursor: 'pointer',
    flexShrink: 0,
  })

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }} onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void commit()
            } else if (e.key === 'Escape') {
              cancel()
            }
          }}
          aria-label="Pedidos"
          placeholder="0"
          inputMode="numeric"
          disabled={saving}
          style={{
            width: 56,
            textAlign: 'right',
            padding: '4px 6px',
            borderRadius: 6,
            border: `1px solid ${error ? 'var(--danger)' : 'var(--primary)'}`,
            background: 'var(--bg-input)',
            color: 'var(--text-primary)',
            fontSize: 12.5,
            fontFamily: 'inherit',
            fontVariantNumeric: 'tabular-nums',
          }}
        />
        <button type="button" title="Salvar pedidos" onClick={() => void commit()} disabled={saving} style={iconBtn('var(--success)')}>
          <Check style={{ width: 13, height: 13 }} />
        </button>
        <button type="button" title="Cancelar" onClick={cancel} disabled={saving} style={iconBtn('var(--text-muted)')}>
          <X style={{ width: 13, height: 13 }} />
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
      {hasValue ? (
        <span style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>{pedidos.toLocaleString('pt-BR')}</span>
      ) : (
        <span style={{ color: 'var(--text-faint)', fontSize: 12.5 }}>—</span>
      )}
      {editable ? (
        <button
          type="button"
          title="Editar pedidos (rascunho)"
          onClick={(e) => {
            e.stopPropagation()
            begin()
          }}
          style={{ width: 22, height: 22, display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-pill)', border: '1px solid transparent', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <Edit2 style={{ width: 12, height: 12 }} />
        </button>
      ) : null}
    </div>
  )
}

// Célula de Apresentadora editável inline (rascunho). Grava apresentador_id (= apresentadoras.id).
export function InlineApresentadoraCell({
  name,
  editable,
  options,
  onSave,
}: {
  name: string
  editable: boolean
  options: LiveFilterOption[]
  onSave: (payload: JsonRecord) => Promise<unknown>
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  function begin() {
    const match = options.find((o) => o.nome === name)
    setValue(match?.id ?? '')
    setEditing(true)
  }
  function cancel() {
    setEditing(false)
  }
  async function commit() {
    setSaving(true)
    try {
      await onSave({ apresentador_id: value || null })
      setEditing(false)
    } catch {
      /* mantém em edição em caso de erro */
    } finally {
      setSaving(false)
    }
  }

  const iconBtn = (color: string): React.CSSProperties => ({
    width: 24,
    height: 24,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 'var(--radius-pill)',
    border: '1px solid var(--border)',
    background: 'var(--bg-elev-2)',
    color,
    cursor: 'pointer',
    flexShrink: 0,
  })

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }} onClick={(e) => e.stopPropagation()}>
        <select
          aria-label="Apresentadora"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') cancel()
          }}
          disabled={saving}
          style={{ flex: 1, minWidth: 0, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--primary)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 12, fontFamily: 'inherit' }}
        >
          <option value="">Sem apresentadora definida</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
        <button type="button" title="Salvar apresentadora" onClick={() => void commit()} disabled={saving} style={iconBtn('var(--success)')}>
          <Check style={{ width: 13, height: 13 }} />
        </button>
        <button type="button" title="Cancelar" onClick={cancel} disabled={saving} style={iconBtn('var(--text-muted)')}>
          <X style={{ width: 13, height: 13 }} />
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', fontSize: 12.5, minWidth: 0 }}>
      {name ? (
        <>
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              flexShrink: 0,
              background: 'linear-gradient(135deg, var(--primary-soft), var(--primary-softer))',
              color: 'var(--primary)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.02em',
              border: '1px solid var(--primary-soft)',
            }}
          >
            {getInitials(name)}
          </span>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
        </>
      ) : (
        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 12 }}>Sem apresentadora</span>
      )}
      {editable ? (
        <button
          type="button"
          title="Editar apresentadora (rascunho)"
          onClick={(e) => {
            e.stopPropagation()
            begin()
          }}
          style={{ marginLeft: 'auto', width: 22, height: 22, display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-pill)', border: '1px solid transparent', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}
        >
          <Edit2 style={{ width: 12, height: 12 }} />
        </button>
      ) : null}
    </div>
  )
}
