# react-app/src/components/ui/MoneyInput.tsx

- MoneyInputProps · type · L4-L7 — type MoneyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type' | 'inputMode'> & { value: string onChange: (raw: string, decimal: number) => void }
- MoneyInput · function · L9-L24 — function MoneyInput({ value, onChange, onBlur, ...props }: MoneyInputProps)
