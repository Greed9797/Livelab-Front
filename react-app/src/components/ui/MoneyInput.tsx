import { InputHTMLAttributes } from 'react'
import { normalizeMoneyInputText, parseBRMoneyToDecimal } from '../../utils/money'

type MoneyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type' | 'inputMode'> & {
  value: string
  onChange: (raw: string, decimal: number) => void
}

export function MoneyInput({ value, onChange, onBlur, ...props }: MoneyInputProps) {
  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(event) => onChange(event.target.value, parseBRMoneyToDecimal(event.target.value))}
      onBlur={(event) => {
        const normalized = normalizeMoneyInputText(event.target.value)
        if (normalized !== event.target.value) onChange(normalized, parseBRMoneyToDecimal(normalized))
        onBlur?.(event)
      }}
    />
  )
}
