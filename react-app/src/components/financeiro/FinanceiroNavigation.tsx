import { Button } from '../ui/Button'

export type FinanceiroTab =
  | 'caixa' | 'vencimentos' | 'lancamentos' | 'receber' | 'pagar' | 'visao-geral' | 'conciliacao'
  | 'receita' | 'custos-fixos' | 'custos-variaveis' | 'comissoes'
  | 'dre' | 'fluxo' | 'aging' | 'fechamentos'

interface FinanceiroNavigationProps {
  tab: FinanceiroTab
  podeVerFechamentos: boolean
  onChange: (tab: FinanceiroTab) => void
}

interface NavigationArea {
  label: string
  entry: FinanceiroTab
  primary: boolean
}

const areas: NavigationArea[] = [
  { label: 'Caixa', entry: 'caixa', primary: true },
  { label: 'Vencimentos', entry: 'vencimentos', primary: true },
  { label: 'Conciliação', entry: 'conciliacao', primary: true },
  { label: 'Mais', entry: 'receita', primary: false },
]

const moreSections: { value: FinanceiroTab; label: string }[] = [
  { value: 'receber', label: 'A receber (detalhado)' },
  { value: 'pagar', label: 'A pagar (detalhado)' },
  { value: 'visao-geral', label: 'Conferência de dados' },
  { value: 'receita', label: 'Receita' },
  { value: 'custos-fixos', label: 'Custos fixos e recorrências' },
  { value: 'custos-variaveis', label: 'Custos variáveis' },
  { value: 'comissoes', label: 'Comissões' },
  { value: 'dre', label: 'DRE' },
  { value: 'fluxo', label: 'Fluxo de caixa' },
  { value: 'aging', label: 'Aging' },
  { value: 'fechamentos', label: 'Fechamentos' },
]

function areaFor(tab: FinanceiroTab): FinanceiroTab {
  if (tab === 'caixa') return 'caixa'
  if (tab === 'vencimentos' || tab === 'lancamentos') return 'vencimentos'
  if (tab === 'conciliacao') return 'conciliacao'
  return 'receita'
}

export function FinanceiroNavigation({ tab, podeVerFechamentos, onChange }: FinanceiroNavigationProps) {
  // A seleção visual respeita a permissão sem alterar a URL ou disparar navegação.
  const effectiveTab = tab === 'fechamentos' && !podeVerFechamentos ? 'caixa' : tab
  const activeArea = areaFor(effectiveTab)
  const moreActive = activeArea === 'receita'

  return (
    <nav aria-label="Navegação do financeiro" className="min-w-0 space-y-3">
      <div role="group" aria-label="Áreas principais do financeiro" className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
        {areas.map((area) => {
          const active = area.primary ? activeArea === area.entry : moreActive
          return (
          <Button
            key={area.entry}
            type="button"
            variant={active ? 'primary' : 'secondary'}
            aria-current={active ? 'page' : undefined}
            className="h-auto min-h-[44px] min-w-0 whitespace-normal px-3 py-2 text-center"
            onClick={() => { if (!active) onChange(area.entry) }}
          >
            {area.label}
          </Button>
          )
        })}
      </div>
      {moreActive ? <div role="group" aria-label="Itens de Mais" className="flex min-w-0 flex-wrap gap-2">
        {moreSections.filter((section) => section.value !== 'fechamentos' || podeVerFechamentos).map((section) => (
          <Button
            key={section.value}
            type="button"
            variant={section.value === effectiveTab ? 'secondary' : 'ghost'}
            aria-current={section.value === effectiveTab ? 'page' : undefined}
            className="h-auto min-h-[44px] min-w-0 max-w-full whitespace-normal px-3 py-2 text-center"
            onClick={() => { if (section.value !== effectiveTab) onChange(section.value) }}
          >
            {section.label}
          </Button>
        ))}
      </div> : null}
    </nav>
  )
}
