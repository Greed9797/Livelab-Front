import { LogOut, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { useAuthStore } from '../../stores/auth-store'
import { useThemeStore } from '../../stores/theme-store'
import { menuForUser, roleLabel } from '../../utils/access'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

function initials(name?: string) {
  return (name ?? 'LL')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function Sidebar({
  onNavigate,
  expanded = false,
  onToggle,
  mobile = false,
}: {
  onNavigate?: () => void
  expanded?: boolean
  onToggle?: () => void
  mobile?: boolean
}) {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const location = useLocation()
  const items = menuForUser(user)
  // A arte da logo é monocromática: branca no tema escuro, preta no claro.
  const theme = useThemeStore((state) => state.resolvedTheme)
  const logoSrc = expanded
    ? `/images/logo-wordmark-${theme}.png`
    : `/images/logo-icon-${theme}.png`

  async function handleLogout() {
    await logout()
    onNavigate?.()
  }

  return (
    <aside
      className={clsx(
        'flex h-full flex-col border-r border-line bg-surface',
        mobile ? 'w-full border-r-0' : expanded ? 'w-72 px-3 py-4' : 'w-20 items-center px-0 py-5',
      )}
    >
      <div className={clsx('mb-5 flex items-center', expanded ? 'w-full gap-3 px-2' : 'w-full flex-col gap-3')}>
        {expanded ? (
          <>
            <div className="min-w-0 flex-1">
              <img src={logoSrc} alt="Livelab" className="h-7 w-auto max-w-full object-contain object-left" />
              <p className="mt-1 truncate text-xs text-ink-muted">{user?.tenant_nome ?? 'LiveShop SaaS'}</p>
            </div>
            {onToggle ? (
              <button
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-surface text-ink-muted transition hover:bg-surface-muted hover:text-ink"
                type="button"
                aria-label="Recolher menu"
                title="Recolher menu"
                onClick={onToggle}
              >
                <PanelLeftClose className="h-5 w-5" />
              </button>
            ) : null}
          </>
        ) : null}
        {!expanded ? (
          <img src={logoSrc} alt="Livelab" className="h-10 w-10 shrink-0 object-contain" />
        ) : null}
        {!expanded && onToggle ? (
          <button
            className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-ink-muted transition hover:bg-surface-muted hover:text-ink"
            type="button"
            aria-label="Expandir menu"
            title="Expandir menu"
            onClick={onToggle}
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <nav aria-label="Navegação principal" className={clsx('flex flex-1 flex-col gap-1 overflow-y-auto scrollbar-thin', expanded ? 'w-full px-1' : 'items-center')}>
        {items.map((item) => {
          const Icon = item.icon
          const matches = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
          const selected = matches && !items.some((other) => other.path.length > item.path.length && (location.pathname === other.path || location.pathname.startsWith(`${other.path}/`)))
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              title={item.label}
              aria-label={item.label}
              aria-current={selected ? 'page' : undefined}
              className={clsx(
                'group relative flex items-center rounded-2xl text-sm font-semibold transition',
                expanded ? 'h-11 gap-3 px-3' : 'h-14 w-14 justify-center',
                selected ? 'bg-brand-soft text-brand' : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
              )}
            >
              {selected && !expanded ? <span className="absolute -left-3 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-brand" /> : null}
              <Icon aria-hidden="true" className="h-5 w-5 shrink-0 stroke-[1.9]" />
              {expanded ? (
                <span className="truncate">{item.label}</span>
              ) : (
                <span aria-hidden="true" className="pointer-events-none absolute left-[68px] z-50 hidden rounded-lg border border-line bg-surface px-2 py-1 text-xs font-semibold text-ink shadow-[var(--shadow-card)] group-hover:block group-focus-visible:block">
                  {item.label}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className={clsx('border-t border-line pt-4', expanded ? 'w-full' : 'w-full px-3')}>
        <div className={clsx('rounded-2xl bg-surface-muted', expanded ? 'p-3' : 'grid h-12 place-items-center')}>
          {expanded ? (
            <>
              <p className="truncate text-sm font-bold text-ink">{user?.nome}</p>
              <p className="mt-1 truncate text-xs text-ink-muted">{roleLabel(user?.papel)}</p>
            </>
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand to-[#ff8a3c] text-xs font-bold text-white">
              {initials(user?.nome)}
            </span>
          )}
        </div>
        {expanded ? (
          <Button className="mt-3 w-full justify-start rounded-2xl" variant="secondary" icon={LogOut} onClick={() => void handleLogout()}>
            Sair
          </Button>
        ) : (
          <Button className="mt-3 h-11 w-full rounded-2xl px-0" variant="secondary" icon={LogOut} aria-label="Sair" onClick={() => void handleLogout()}>
            <span className="sr-only">Sair</span>
          </Button>
        )}
      </div>
    </aside>
  )
}

export function Shell() {
  const [open, setOpen] = useState(false)
  const [desktopExpanded, setDesktopExpanded] = useState(() => {
    try { return localStorage.getItem('livelab.sidebar.expanded') === 'true' } catch { return false }
  })
  const theme = useThemeStore((state) => state.resolvedTheme)
  const user = useAuthStore((state) => state.user)

  return (
    <div className="livelab-shell min-h-screen" data-theme={theme}>
      <a href="#main-content" className="skip-to-content">Ir para o conteúdo</a>
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:block">
        <Sidebar expanded={desktopExpanded} onToggle={() => {
          const next = !desktopExpanded
          setDesktopExpanded(next)
          try { localStorage.setItem('livelab.sidebar.expanded', String(next)) } catch { /* Preferência continua em memória. */ }
        }} />
      </div>

      <Modal open={open} title="Menu" size="sm" onClose={() => setOpen(false)}>
        <Sidebar expanded mobile onNavigate={() => setOpen(false)} />
      </Modal>

      <div className={clsx(desktopExpanded ? 'lg:pl-72' : 'lg:pl-20')}>
        <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 px-4 py-3 backdrop-blur md:px-7 lg:hidden">
          <div className="flex items-center justify-between">
            <button
              className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface text-ink-muted"
              aria-label="Abrir menu"
              aria-haspopup="dialog"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Menu aria-hidden="true" className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-xs font-bold text-ink">
                {initials(user?.nome)}
              </span>
              <div className="text-right">
                <p className="text-sm font-bold text-ink">{user?.nome ?? 'Livelab'}</p>
                <p className="text-xs text-ink-muted">{roleLabel(user?.papel)}</p>
              </div>
            </div>
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="min-h-screen px-4 py-6 md:px-7 lg:px-8 lg:py-5">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
