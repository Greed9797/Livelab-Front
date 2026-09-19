# react-app/src/components/forms/PresenterSelect.tsx

- PresenterSelectProps · type · L5-L15 — type PresenterSelectProps = { value: string onChange: (value: string) => void rows: JsonRecord[] label?: string placeholder?: string required?: boolean disabled?: boolean includeInactive?: boolean className?: string }
- PresenterSelect · function · L17-L47 — function PresenterSelect({ value, onChange, rows, label = 'Apresentadora', placeholder = 'Selecione uma apresentadora', required = false, disabled = false, includeInactive = true, className = '', }: PresenterSelectProps)
