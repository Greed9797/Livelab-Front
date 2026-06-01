import { ImagePlus, Upload, X } from 'lucide-react'
import { useRef } from 'react'
import { asString } from '../../utils/format'
import { Button } from './Button'

export function ImagePicker({
  label,
  value,
  onChange,
  onFileSelect,
  isUploading,
  helper = 'Cole uma URL ou envie uma imagem.',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  onFileSelect?: (file: File) => void
  isUploading?: boolean
  helper?: string
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const src = asString(value, '').trim()

  return (
    <div className="grid gap-3 rounded-2xl border border-line bg-surface p-3 md:grid-cols-[72px_1fr] md:items-center">
      <div className="grid h-[72px] w-[72px] place-items-center overflow-hidden rounded-2xl border border-line bg-surface-muted text-ink-muted">
        {src ? (
          <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <ImagePlus className="h-6 w-6" />
        )}
      </div>
      <div className="min-w-0 space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="block min-w-0 flex-1">
            <span className="text-sm font-semibold text-ink">{label}</span>
            <input
              className="design-input mt-2 h-10 w-full px-3 text-sm"
              type="url"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder="https://..."
            />
          </label>
          <div className="flex gap-2">
            {onFileSelect ? (
              <>
                <input
                  ref={fileInputRef}
                  className="hidden"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    event.target.value = ''
                    if (file) onFileSelect(file)
                  }}
                />
                <Button type="button" variant="secondary" icon={Upload} isLoading={isUploading} onClick={() => fileInputRef.current?.click()}>
                  Enviar
                </Button>
              </>
            ) : null}
            {src ? (
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-ink-muted transition hover:bg-surface-muted hover:text-ink"
                aria-label="Remover imagem"
                onClick={() => onChange('')}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
        <p className="text-xs text-ink-muted">{helper}</p>
      </div>
    </div>
  )
}
