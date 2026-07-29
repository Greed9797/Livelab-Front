import { useMemo } from 'react'
import type { JsonRecord } from '../../types/models'
import { asString } from '../../utils/format'

type MarcaSelectProps = {
  value: string
  onChange: (value: string) => void
  rows: JsonRecord[]
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

/**
 * Select de marca. O cadastro tem nomes repetidos (ex. várias "Liftify"), então o rótulo
 * desambigua pelo nome do cliente quando existe.
 */
export function MarcaSelect({
  value,
  onChange,
  rows,
  label = 'Marca',
  placeholder = 'Selecione uma marca',
  required = false,
  disabled = false,
  className = '',
}: MarcaSelectProps) {
  const options = useMemo(() => {
    const nomeCount = new Map<string, number>()
    for (const row of rows) {
      const nome = asString(row.nome, '').trim()
      if (nome) nomeCount.set(nome, (nomeCount.get(nome) ?? 0) + 1)
    }

    return rows
      .map((row) => {
        const nome = asString(row.nome, '').trim()
        const cliente = asString(row.cliente_nome, '').trim()
        const ambiguo = (nomeCount.get(nome) ?? 0) > 1
        return {
          id: asString(row.id, ''),
          label: ambiguo && cliente ? `${nome} — ${cliente}` : nome,
        }
      })
      .filter((option) => option.id && option.label)
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  }, [rows])

  return (
    <label className={`block ${className}`.trim()}>
      <span className="text-sm font-semibold text-ink">{label}</span>
      <select
        className="design-input mt-2 h-11 w-full px-4"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}
