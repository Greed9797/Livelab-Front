import { Button } from '../ui/Button'

export type FinanceiroTab =
  | 'lancamentos' | 'receber' | 'pagar' | 'visao-geral' | 'conciliacao'
  | 'receita' | 'custos-fixos' | 'custos-variaveis' | 'comissoes'
  | 'dre' | 'fluxo' | 'aging' | 'fechamentos'

interface FinanceiroNavigationProps {
  tab: FinanceiroTab
  podeVerFechamentos: boolean
  onChange: (tab: FinanceiroTab) => void
}

interface NavigationGroup {
  label: string
  entry: FinanceiroTab
  sections: { value: FinanceiroTab; label: string }[]
}

const groups: NavigationGroup[] = [
  {
    label: 'Lançamentos', entry: 'lancamentos',
    sections: [
      { value: 'lancamentos', label: 'Todos os lançamentos' },
      { value: 'receber', label: 'Receber' },
      { value: 'pagar', label: 'Pagar' },
      { value: 'visao-geral', label: 'Conferir: Visão geral' },
      { value: 'conciliacao', label: 'Conferir: Conciliação' },
    ],
  },
  {
    label: 'Receitas e custos', entry: 'receita',
    sections: [
      { value: 'receita', label: 'Receita' },
      { value: 'custos-fixos', label: 'Custos fixos' },
      { value: 'custos-variaveis', label: 'Custos variáveis' },
    ],
  },
  {
    label: 'Comissões', entry: 'comissoes',
    sections: [{ value: 'comissoes', label: 'Comissões' }],
  },
  {
    label: 'Relatórios', entry: 'dre',
    sections: [
      { value: 'dre', label: 'DRE' },
      { value: 'fluxo', label: 'Fluxo de caixa' },
      { value: 'aging', label: 'Aging' },
      { value: 'fechamentos', label: 'Fechamentos' },
    ],
  },
]

export function FinanceiroNavigation({ tab, podeVerFechamentos, onChange }: FinanceiroNavigationProps) {
  // A seleção visual respeita a permissão sem alterar a URL ou disparar navegação.
  const effectiveTab = tab === 'fechamentos' && !podeVerFechamentos ? 'lancamentos' : tab
  const activeGroup = groups.find((group) => group.sections.some((section) => section.value === effectiveTab))!

  return (
    <nav aria-label="Navegação do financeiro" className="min-w-0 space-y-3">
      <div role="group" aria-label="Grupos do financeiro" className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
        {groups.map((group) => (
          <Button
            key={group.entry}
            type="button"
            variant={group === activeGroup ? 'primary' : 'secondary'}
            aria-current={group === activeGroup ? 'page' : undefined}
            className="h-auto min-h-[44px] min-w-0 whitespace-normal px-3 py-2 text-center"
            onClick={() => { if (group !== activeGroup) onChange(group.entry) }}
          >
            {group.label}
          </Button>
        ))}
      </div>
      <div role="group" aria-label={`Seções de ${activeGroup.label}`} className="flex min-w-0 flex-wrap gap-2">
        {activeGroup.sections.filter((section) => section.value !== 'fechamentos' || podeVerFechamentos).map((section) => (
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
      </div>
    </nav>
  )
}
