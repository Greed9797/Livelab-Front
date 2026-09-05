import { useEffect, useRef } from 'react'
import { Button } from './Button'

export function UnsavedChangesNotice({ guard }: {
  guard: { confirming: boolean; busy: boolean; keepEditing: () => void; discard: () => void }
}) {
  const noticeRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (guard.confirming) noticeRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }, [guard.confirming])
  if (!guard.confirming) return null
  return (
    <div ref={noticeRef} role="alert" className="w-full rounded-xl border border-[var(--warning)] bg-[var(--warning-soft)] p-3 text-sm text-ink">
      <p className="font-semibold">Há alterações não salvas</p>
      <p className="mt-1 text-ink-muted">Continue editando para salvar ou descarte as alterações para sair.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={guard.keepEditing} disabled={guard.busy}>Continuar editando</Button>
        <Button type="button" variant="ghost" onClick={guard.discard} disabled={guard.busy}>Descartar alterações</Button>
      </div>
    </div>
  )
}
