import { Link, useLocation } from 'react-router-dom'
import clsx from 'clsx'

// Alterna entre os dois rankings operacionais. Ambos os destinos vivem no bloco
// opsRoles do AppRouter, então qualquer papel que veja o menu "Ranking" alterna.
const tabs = [
  { label: 'Apresentadoras', to: '/ranking/apresentadoras' },
  { label: 'Marcas', to: '/ranking/marcas' },
]

export function RankingNavTabs() {
  const { pathname } = useLocation()
  const isMarcas = pathname.includes('marca')

  return (
    <div className="inline-flex rounded-xl border border-line bg-surface p-1">
      {tabs.map((tab) => {
        const active = tab.to.includes('marca') ? isMarcas : !isMarcas
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={clsx(
              'rounded-[var(--radius-pill)] px-3 py-1.5 text-sm font-semibold transition',
              active ? 'bg-brand-soft text-brand' : 'text-ink-muted hover:text-ink',
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
