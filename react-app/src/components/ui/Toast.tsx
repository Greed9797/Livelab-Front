import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type ToastVariant = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  message: string
  variant: ToastVariant
  /** internal: controls CSS enter/exit animation */
  visible: boolean
}

interface ToastContextValue {
  push: (message: string, variant?: ToastVariant) => void
}

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

// ── Config ────────────────────────────────────────────────────────────────────

const AUTO_DISMISS_MS = 4000
const EXIT_ANIMATION_MS = 150

// ── Helpers ───────────────────────────────────────────────────────────────────

const variantMeta: Record<ToastVariant, { Icon: typeof CheckCircle; color: string; soft: string }> = {
  success: { Icon: CheckCircle,    color: 'var(--success)', soft: 'var(--success-soft)' },
  error:   { Icon: XCircle,        color: 'var(--danger)',  soft: 'var(--danger-soft)'  },
  info:    { Icon: Info,            color: 'var(--info)',    soft: 'var(--info-soft)'    },
  warning: { Icon: AlertTriangle,   color: 'var(--warning)', soft: 'var(--warning-soft)' },
}

// ── Single toast item ─────────────────────────────────────────────────────────

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const { Icon, color, soft } = variantMeta[toast.variant]

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '12px 14px',
        borderRadius: 'var(--radius-control)',
        background: 'var(--bg-elev-2)',
        border: `1px solid var(--border)`,
        boxShadow: 'var(--shadow-card)',
        color: 'var(--text-primary)',
        fontSize: '13px',
        lineHeight: '1.45',
        maxWidth: '360px',
        width: '100%',
        /* A short opacity transition avoids a distracting fixed-position slide. */
        opacity: toast.visible ? 1 : 0,
        transition: `opacity ${EXIT_ANIMATION_MS}ms ease-out`,
      }}
    >
      <span
        style={{
          flexShrink: 0,
          width: 28,
          height: 28,
          borderRadius: 'var(--radius-control)',
          background: soft,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={15} color={color} strokeWidth={2.2} />
      </span>

      <span style={{ display: 'flex', flex: 1, alignItems: 'flex-start', gap: 8, paddingTop: '4px', color: 'var(--text-primary)' }}>
        <span aria-hidden="true" style={{ width: 8, height: 8, flexShrink: 0, marginTop: 5, borderRadius: '50%', background: color }} />
        {toast.message}
      </span>

      <button
        aria-label="Fechar notificação"
        onClick={() => onDismiss(toast.id)}
        style={{
          flexShrink: 0,
          background: 'none',
          border: 'none',
          padding: '2px',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          borderRadius: 'var(--radius-pill)',
          marginTop: '2px',
        }}
      >
        <X size={13} strokeWidth={2.5} />
      </button>
    </div>
  )
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  // keep a ref to timers so we can clear them on manual dismiss
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    // start exit animation
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, visible: false } : t)))
    // remove from DOM after animation
    const tid = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
      timers.current.delete(id)
    }, EXIT_ANIMATION_MS)
    timers.current.set(`exit-${id}`, tid)
  }, [])

  const push = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      // mount with visible:false first so CSS can transition in
      setToasts((prev) => [...prev, { id, message, variant, visible: false }])

      // trigger enter transition on next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, visible: true } : t)))
        })
      })

      // auto-dismiss
      const tid = setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
      timers.current.set(id, tid)
    },
    [dismiss],
  )

  // clean up all timers on unmount
  useEffect(() => {
    const timerMap = timers.current
    return () => {
      timerMap.forEach((tid) => clearTimeout(tid))
    }
  }, [])

  return (
    <ToastContext.Provider value={{ push }}>
      {children}

      {/* Portal-like fixed stack — bottom-right */}
      <div
        aria-label="Notificações"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          alignItems: 'flex-end',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => (
          <div key={toast.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem toast={toast} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
