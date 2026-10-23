import { NavLink, Outlet } from 'react-router-dom'
import clsx from 'clsx'
import { PageHeader } from '../components/ui/PageHeader'

export function ClientesLayout() {
  return (
    <div className="min-w-0 space-y-6">
      <PageHeader title="Clientes" subtitle="Clientes, afiliadas, marcas próprias e parceiras num só lugar. Só cliente gera receita." />
      <nav aria-label="Navegação de Clientes" className="flex max-w-full flex-wrap gap-1 rounded-xl border border-line bg-surface p-1 sm:w-fit">
        {[
          { to: '/clientes', label: 'Carteira' },
          { to: '/clientes/crm', label: 'CRM' },
        ].map((tab) => (
          <NavLink key={tab.to} to={tab.to} end className={({ isActive }) => clsx(
            'flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-pill)] px-5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] sm:flex-none',
            isActive ? 'bg-brand-soft text-brand' : 'text-ink-muted hover:text-ink',
          )}>{tab.label}</NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
