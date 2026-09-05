import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Pilha de modais abertos. Escape só fecha o do topo — modais empilhados (ex.: confirmação
// sobre um formulário) não podem fechar juntos com um único Escape.
const openModals: symbol[] = []
const modalLayers = new Map<symbol, HTMLDivElement>()
let rootState: { element: HTMLElement; inert: string | null; ariaHidden: string | null } | null = null

function setAppInert(isModalOpen: boolean) {
  if (isModalOpen) {
    if (rootState) return
    const root = document.getElementById('root')
    if (!root) return
    rootState = { element: root, inert: root.getAttribute('inert'), ariaHidden: root.getAttribute('aria-hidden') }
    root.setAttribute('inert', '')
    root.setAttribute('aria-hidden', 'true')
    return
  }

  if (!rootState) return
  const { element, inert, ariaHidden } = rootState
  if (inert === null) element.removeAttribute('inert')
  else element.setAttribute('inert', inert)
  if (ariaHidden === null) element.removeAttribute('aria-hidden')
  else element.setAttribute('aria-hidden', ariaHidden)
  rootState = null
}

function updateModalLayers() {
  const topModal = openModals[openModals.length - 1]
  for (const [id, layer] of modalLayers) {
    const isTopModal = id === topModal
    layer.toggleAttribute('inert', !isTopModal)
    if (isTopModal) layer.removeAttribute('aria-hidden')
    else layer.setAttribute('aria-hidden', 'true')
  }
  setAppInert(openModals.length > 0)
}

function getFocusableElements(panel: HTMLElement) {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((element) => (
    !element.matches(':disabled, [hidden], [aria-hidden="true"]')
    && !element.closest('[hidden], [inert], [aria-hidden="true"]')
    && element.tabIndex >= 0
    && element.getClientRects().length > 0
    && !['hidden', 'collapse'].includes(window.getComputedStyle(element).visibility)
  ))
}

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
  const layerRef = useRef<HTMLDivElement>(null)
  const idRef = useRef<symbol | null>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const restoreFocusFrameRef = useRef<number | null>(null)
  if (idRef.current === null) idRef.current = Symbol('modal')
  // Ref evita re-registrar o listener a cada render quando onClose é uma arrow inline.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const id = idRef.current
    const layer = layerRef.current
    if (restoreFocusFrameRef.current !== null) cancelAnimationFrame(restoreFocusFrameRef.current)
    restoreFocusFrameRef.current = null
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    openModals.push(id as symbol)
    if (layer) modalLayers.set(id as symbol, layer)
    updateModalLayers()

    function onKeyDown(event: KeyboardEvent) {
      // Só o modal do topo da pilha reage.
      if (openModals[openModals.length - 1] !== id) return
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const panel = panelRef.current
      if (!panel) return
      const focusable = getFocusableElements(panel)
      if (focusable.length === 0) {
        event.preventDefault()
        panel.focus()
        return
      }

      const activeElement = document.activeElement
      const currentIndex = focusable.indexOf(activeElement as HTMLElement)
      if (event.shiftKey ? currentIndex <= 0 : currentIndex === -1 || currentIndex === focusable.length - 1) {
        event.preventDefault()
        focusable[event.shiftKey ? focusable.length - 1 : 0].focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      const index = openModals.indexOf(id as symbol)
      const wasTopModal = index === openModals.length - 1
      if (index !== -1) openModals.splice(index, 1)
      modalLayers.delete(id as symbol)
      updateModalLayers()

      const restoreFocus = restoreFocusRef.current
      const nextTopModal = openModals[openModals.length - 1]
      if (wasTopModal && restoreFocus?.isConnected) {
        restoreFocusFrameRef.current = requestAnimationFrame(() => {
          const currentTopModal = openModals[openModals.length - 1]
          const currentTopLayer = modalLayers.get(currentTopModal)
          if (currentTopModal === nextTopModal && (!currentTopLayer || currentTopLayer.contains(restoreFocus))) restoreFocus.focus()
          restoreFocusFrameRef.current = null
        })
      }
    }
  }, [open])

  // Foco inicial: primeiro elemento focável do painel, senão o próprio painel. Se o
  // conteúdo chega depois, o observer só move o foco enquanto ele ainda está no painel.
  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (!panel) return
    const frame = requestAnimationFrame(() => {
      if (openModals[openModals.length - 1] !== idRef.current) return
      const first = getFocusableElements(panel)[0]
      ;(first ?? panel).focus()
    })
    const observer = new MutationObserver(() => {
      if (openModals[openModals.length - 1] !== idRef.current) return
      if (document.activeElement !== panel) return
      getFocusableElements(panel)[0]?.focus()
    })
    observer.observe(panel, { childList: true, subtree: true })
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div ref={layerRef} className="fixed inset-0 z-[80] overflow-y-auto bg-black/55 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
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
    , document.body,
  )
}
