import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import clsx from 'clsx'

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Pilha de modais abertos. Escape só fecha o do topo — modais empilhados (ex.: confirmação
// sobre um formulário) não podem fechar juntos com um único Escape.
const openModals: symbol[] = []

export function Modal({
  open,
  title,
  subtitle,
  children,
  footer,
  onClose,
  size = 'md',
}: {
  open: boolean
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const idRef = useRef<symbol | null>(null)
  if (idRef.current === null) idRef.current = Symbol('modal')
  // Ref evita re-registrar o listener a cada render quando onClose é uma arrow inline.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const id = idRef.current
    openModals.push(id as symbol)

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      // Só o modal do topo da pilha reage.
      if (openModals[openModals.length - 1] !== id) return
      event.stopPropagation()
      onCloseRef.current()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      const index = openModals.indexOf(id as symbol)
      if (index !== -1) openModals.splice(index, 1)
    }
  }, [open])

  // Foco inicial: primeiro elemento focável do painel, senão o próprio painel.
  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (!panel) return
    const first = panel.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? panel).focus()
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/55 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex min-h-full items-center justify-center">
        <div
          ref={panelRef}
          tabIndex={-1}
          className={clsx(
            'w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)] outline-none',
            size === 'sm' && 'max-w-lg',
            size === 'md' && 'max-w-2xl',
            size === 'lg' && 'max-w-4xl',
            size === 'xl' && 'max-w-6xl',
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <p className="text-base font-bold text-ink">{title}</p>
              {subtitle ? <p className="mt-1 text-sm text-ink-muted">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-surface text-ink-muted transition hover:bg-surface-muted hover:text-ink"
              aria-label="Fechar"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[72vh] overflow-y-auto px-5 py-4 scrollbar-thin">{children}</div>
          {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4">{footer}</div> : null}
        </div>
      </div>
    </div>
  )
}
