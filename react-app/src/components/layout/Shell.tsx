import { Bell, LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { useAuthStore } from '../../stores/auth-store'
import { useThemeStore } from '../../stores/theme-store'
import { menuForUser, roleLabel } from '../../utils/access'
import { Button } from '../ui/Button'

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
}: {
  onNavigate?: () => void
  expanded?: boolean
  onToggle?: () => void
}) {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const location = useLocation()
  const items = menuForUser(user)

  async function handleLogout() {
    await logout()
    onNavigate?.()
  }

  return (
    <aside
      className={clsx(
        'flex h-full flex-col border-r border-line bg-surface',
        expanded ? 'w-72 px-3 py-4' : 'w-20 items-center px-0 py-5',
      )}
    >
      <div className={clsx('mb-5 flex items-center', expanded ? 'w-full gap-3 px-2' : 'w-full flex-col gap-3')}>
        <img
          src="/images/favicon.png"
          alt=""
          className="h-12 w-12 rounded-xl object-cover shadow-[0_6px_16px_-4px_rgba(255,90,31,0.5)]"
        />
        {expanded ? (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-extrabold text-ink">Livelab</p>
              <p className="truncate text-xs text-ink-muted">{user?.tenant_nome ?? 'LiveShop SaaS'}</p>
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

      <nav className={clsx('flex flex-1 flex-col gap-1 overflow-y-auto scrollbar-thin', expanded ? 'w-full px-1' : 'items-center')}>
        {items.map((item) => {
          const Icon = item.icon
          const selected = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              title={item.label}
              className={clsx(
                'group relative flex items-center rounded-2xl text-sm font-semibold transition',
                expanded ? 'h-11 gap-3 px-3' : 'h-14 w-14 justify-center',
                selected ? 'bg-brand-soft text-brand' : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
              )}
            >
              {selected && !expanded ? <span className="absolute -left-3 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-brand" /> : null}
              <Icon className="h-5 w-5 shrink-0 stroke-[1.9]" />
              {expanded ? (
                <span className="truncate">{item.label}</span>
              ) : (
                <span className="pointer-events-none absolute left-[68px] z-50 hidden rounded-lg border border-line bg-surface px-2 py-1 text-xs font-semibold text-ink shadow-[var(--shadow-card)] group-hover:block">
                  {item.label}
                </span>
              )}
            </NavLink>
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
  const [desktopExpanded, setDesktopExpanded] = useState(false)
  const theme = useThemeStore((state) => state.resolvedTheme)
  const user = useAuthStore((state) => state.user)
  const location = useLocation()
  const isHomeRoute = location.pathname === '/' || location.pathname === '/master'

  return (
    <div className="livelab-shell min-h-screen" data-theme={theme}>
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:block">
        <Sidebar expanded={desktopExpanded} onToggle={() => setDesktopExpanded((value) => !value)} />
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/30" aria-label="Fechar menu" onClick={() => setOpen(false)} />
          <div className="relative h-full">
            <Sidebar expanded onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className={clsx(desktopExpanded ? 'lg:pl-72' : 'lg:pl-20')}>
        <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 px-4 py-3 backdrop-blur md:px-7 lg:hidden">
          <div className="flex items-center justify-between">
            <button
              className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface text-ink-muted"
              aria-label="Abrir menu"
              onClick={() => setOpen(true)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand to-[#ff8a3c] text-xs font-bold text-white">
                {initials(user?.nome)}
              </span>
              <div className="text-right">
                <p className="text-sm font-bold text-ink">{user?.nome ?? 'Livelab'}</p>
                <p className="text-xs text-ink-muted">{roleLabel(user?.papel)}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-screen px-4 py-6 md:px-7 lg:px-8 lg:py-5">
          {isHomeRoute ? (
            <div className="mb-5 hidden items-center justify-between gap-3 border-b border-line pb-4 lg:flex">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand to-[#ff8a3c] text-sm font-bold text-white shadow-[0_4px_12px_-4px_rgba(255,90,31,0.55)]">
                  {initials(user?.tenant_nome ?? user?.nome)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold leading-tight text-ink">{user?.tenant_nome ?? 'Livelab'}</p>
                  <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <span className="truncate">{user?.nome ?? 'Usuário'}</span>
                    <span className="h-1 w-1 rounded-full bg-ink-muted/60" />
                    <span className="rounded-full border border-line bg-surface px-2 py-0.5 font-semibold text-ink-muted">
                      {roleLabel(user?.papel)}
                    </span>
                  </div>
                </div>
              </div>
              <button
                className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-surface text-ink-muted transition hover:bg-surface-muted hover:text-ink"
                aria-label="Notificações"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-surface bg-brand" />
              </button>
            </div>
          ) : null}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
