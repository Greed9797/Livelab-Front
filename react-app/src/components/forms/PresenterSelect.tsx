import { useMemo } from 'react'
import type { JsonRecord } from '../../types/models'
import { toPresenterOptions } from '../../utils/presenters'

type PresenterSelectProps = {
  value: string
  onChange: (value: string) => void
  rows: JsonRecord[]
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  includeInactive?: boolean
  className?: string
  /** id do <span> de erro da linha — liga a mensagem ao controle no leitor de tela. */
  describedBy?: string
}

export function PresenterSelect({
  value,
  onChange,
  rows,
  label = 'Apresentadora',
  placeholder = 'Selecione uma apresentadora',
  required = false,
  disabled = false,
  includeInactive = true,
  className = '',
  describedBy,
}: PresenterSelectProps) {
  const options = useMemo(() => toPresenterOptions(rows, { includeInactive }), [includeInactive, rows])

  return (
    <label className={`block ${className}`.trim()}>
      <span className="text-sm font-semibold text-ink">{label}</span>
      <select
        className="design-input mt-2 h-11 w-full px-4"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        disabled={disabled}
        aria-describedby={describedBy}
        aria-invalid={describedBy ? true : undefined}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}
