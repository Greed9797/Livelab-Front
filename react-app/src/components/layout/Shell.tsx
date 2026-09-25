import { LogOut, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { useAuthStore } from '../../stores/auth-store'
import { useThemeStore } from '../../stores/theme-store'
import { menuForUser, roleLabel } from '../../utils/access'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { CompactChromeProvider, useCompactChrome } from './compact-chrome'

function initials(name?: string) {
  return (name ?? 'LL')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function AccountAvatar({ user, className = 'h-9 w-9' }: { user: { nome?: string; foto_url?: string | null } | null; className?: string }) {
  const image = user?.foto_url
  return (
    <span className={clsx('grid shrink-0 place-items-center overflow-hidden rounded-[10px] bg-[var(--bg-elev-3)] text-xs font-bold text-ink', className)}>
      {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : initials(user?.nome)}
    </span>
  )
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
        'flex h-full flex-col border-r border-line bg-[var(--bg-base)]',
        mobile ? 'w-full border-r-0' : expanded ? 'w-[248px] px-3 py-4' : 'w-20 items-center px-0 py-5',
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
                className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-pill)] border border-line bg-surface text-ink-muted transition hover:bg-surface-muted hover:text-ink"
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
            className="grid h-10 w-10 place-items-center rounded-[var(--radius-pill)] border border-line bg-surface text-ink-muted transition hover:bg-surface-muted hover:text-ink"
            type="button"
            aria-label="Expandir menu"
            title="Expandir menu"
            onClick={onToggle}
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <nav aria-label="Navegação principal" className={clsx('flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pb-3 scrollbar-thin', expanded ? 'w-full px-1' : 'items-center')}>
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
                'group relative flex shrink-0 items-center rounded-[var(--radius-control)] text-[14.5px] font-medium',
                item.placement === 'footer' && 'mt-auto',
                expanded ? 'h-11 gap-3 px-3' : 'h-11 w-11 justify-center',
                selected ? 'bg-brand-soft font-semibold text-ink [&>svg]:text-brand' : 'menu-item row-hover text-[var(--text-secondary)]',
              )}
            >
              <Icon aria-hidden="true" className="h-5 w-5 shrink-0 stroke-[1.75]" />
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
        <div className={clsx('rounded-xl border border-line bg-[var(--bg-elev-3)]', expanded ? 'p-3' : 'grid h-12 place-items-center')}>
          {expanded ? (
            <div className="flex min-w-0 items-center gap-3">
              <AccountAvatar user={user} />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink">{user?.nome}</p>
                <p className="mt-1 truncate text-xs text-ink-muted">{roleLabel(user?.papel)}</p>
              </div>
            </div>
          ) : (
            <AccountAvatar user={user} />
          )}
        </div>
        {expanded ? (
          <Button className="mt-3 h-11 w-full justify-start" variant="secondary" icon={LogOut} onClick={() => void handleLogout()}>
            Sair
          </Button>
        ) : (
          <Button className="mt-3 h-11 w-full px-0" variant="secondary" icon={LogOut} aria-label="Sair" onClick={() => void handleLogout()}>
            <span className="sr-only">Sair</span>
          </Button>
        )}
      </div>
    </aside>
  )
}

function CompactHeader({ open, onOpen }: { open: boolean; onOpen: () => void }) {
  const user = useAuthStore((state) => state.user)
  const chrome = useCompactChrome()
  const center = chrome?.center ?? chrome?.title

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-1 border-b border-line bg-canvas/95 px-3 backdrop-blur min-[600px]:px-8 lg:hidden">
      <button
        className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] text-ink"
        aria-label="Abrir menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={onOpen}
      >
        <Menu aria-hidden="true" className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1 truncate text-center text-[15px] font-bold text-ink">
        {center}
      </div>
      <span className="grid h-11 w-11 shrink-0 place-items-center" aria-hidden="true">
        <AccountAvatar user={user} className="h-8 w-8" />
      </span>
    </header>
  )
}

export function Shell() {
  const [open, setOpen] = useState(false)
  const [desktopExpanded, setDesktopExpanded] = useState(() => {
    try { return localStorage.getItem('livelab.sidebar.expanded') === 'true' } catch { return false }
  })
  const theme = useThemeStore((state) => state.resolvedTheme)

  return (
    <CompactChromeProvider>
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

      <div className={clsx(desktopExpanded ? 'lg:pl-[248px]' : 'lg:pl-20')}>
        <CompactHeader open={open} onOpen={() => setOpen(true)} />

        <main id="main-content" tabIndex={-1} className="min-h-screen px-3 py-2.5 min-[600px]:px-8 min-[600px]:py-4 lg:px-8 lg:py-5">
          <Outlet />
        </main>
      </div>
    </div>
    </CompactChromeProvider>
  )
}
