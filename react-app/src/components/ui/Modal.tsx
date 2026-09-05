import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'

const FOCUSABLE = 'a[href], button:not([disabled]), summary, textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Pilha de modais abertos. Escape só fecha o do topo — modais empilhados (ex.: confirmação
// sobre um formulário) não podem fechar juntos com um único Escape.
const openModals: symbol[] = []
const modalLayers = new Map<symbol, HTMLDivElement>()
let rootState: { element: HTMLElement; inert: string | null; ariaHidden: string | null } | null = null
let bodyOverflow: string | null = null

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
  if (openModals.length > 0 && bodyOverflow === null) {
    bodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  } else if (openModals.length === 0 && bodyOverflow !== null) {
    document.body.style.overflow = bodyOverflow
    bodyOverflow = null
  }
  const topModal = openModals[openModals.length - 1]
  for (const [id, layer] of modalLayers) {
    const isTopModal = id === topModal
    layer.toggleAttribute('inert', !isTopModal)
    if (isTopModal) layer.removeAttribute('aria-hidden')
    else layer.setAttribute('aria-hidden', 'true')
  }
  setAppInert(openModals.length > 0)
}

function isInsideClosedDetailsContent(element: HTMLElement, panel: HTMLElement) {
  let current: HTMLElement | null = element
  while (current && current !== panel) {
    const closedDetails: HTMLElement | null = current.closest('details:not([open])')
    if (!closedDetails) return false
    // O summary direto continua alcançável; mas ele pode estar dentro de outro details fechado.
    if (element.tagName !== 'SUMMARY' || element.parentElement !== closedDetails) return true
    current = closedDetails.parentElement
  }
  return false
}

function getFocusableElements(panel: HTMLElement) {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((element) => (
    !element.matches(':disabled, [hidden], [aria-hidden="true"]')
    && !element.closest('[hidden], [inert], [aria-hidden="true"]')
    && !isInsideClosedDetailsContent(element, panel)
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
  closeDisabled = false,
  size = 'md',
}: {
  open: boolean
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
  closeDisabled?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const titleId = useId()
  const subtitleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const idRef = useRef<symbol | null>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const restoreFocusFrameRef = useRef<number | null>(null)
  const initialFocusFrameRef = useRef<number | null>(null)
  if (idRef.current === null) idRef.current = Symbol('modal')
  // Ref evita re-registrar o listener a cada render quando onClose é uma arrow inline.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = () => { if (!closeDisabled) onClose() }

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
  // conteúdo chega depois, o observer só move o foco quando o elemento ativo sumiu.
  // Um foco escolhido pelo usuário (ou por um aviso filho) cancela o RAF pendente.
  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (!panel) return
    function cancelPendingInitialFocus() {
      if (initialFocusFrameRef.current === null) return
      cancelAnimationFrame(initialFocusFrameRef.current)
      initialFocusFrameRef.current = null
    }
    initialFocusFrameRef.current = requestAnimationFrame(() => {
      initialFocusFrameRef.current = null
      if (openModals[openModals.length - 1] !== idRef.current) return
      if (document.activeElement !== panel && panel.contains(document.activeElement)) return
      const first = getFocusableElements(panel)[0]
      ;(first ?? panel).focus()
    })
    panel.addEventListener('focusin', cancelPendingInitialFocus)
    const observer = new MutationObserver(() => {
      if (openModals[openModals.length - 1] !== idRef.current) return
      const activeElement = document.activeElement
      if (activeElement instanceof HTMLElement && activeElement !== panel && panel.contains(activeElement)) return
      getFocusableElements(panel)[0]?.focus()
    })
    observer.observe(panel, { childList: true, subtree: true })
    return () => {
      panel.removeEventListener('focusin', cancelPendingInitialFocus)
      cancelPendingInitialFocus()
      observer.disconnect()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div ref={layerRef} className="fixed inset-0 z-[80] overflow-hidden bg-black/55 px-3 py-3 backdrop-blur-sm sm:px-5 sm:py-6" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={subtitle ? subtitleId : undefined} aria-busy={closeDisabled || undefined}>
      <div className="flex min-h-full items-center justify-center">
        <div
          ref={panelRef}
          tabIndex={-1}
          className={clsx(
            'flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-[var(--radius-panel)] border border-line bg-surface shadow-[var(--shadow-card-lg)] outline-none sm:max-h-[calc(100dvh-3rem)]',
            size === 'sm' && 'max-w-lg',
            size === 'md' && 'max-w-2xl',
            size === 'lg' && 'max-w-4xl',
            size === 'xl' && 'max-w-6xl',
          )}
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-4 py-3 sm:px-6 sm:py-4">
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-bold leading-snug tracking-[-0.015em] text-ink">{title}</h2>
              {subtitle ? <p id={subtitleId} className="mt-1 text-sm leading-5 text-ink-muted">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-pill)] border border-line bg-surface text-ink-muted transition-colors duration-150 ease-out hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              aria-label="Fechar"
              disabled={closeDisabled}
              onClick={onClose}
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 scrollbar-thin sm:px-6 sm:py-5">{children}</div>
          {footer ? <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-line px-4 py-3 sm:px-6 sm:py-4">{footer}</div> : null}
        </div>
      </div>
    </div>
    , document.body,
  )
}
