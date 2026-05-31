import clsx from 'clsx'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Globe2,
  Instagram,
  Loader2,
  Music2,
  Package,
  Percent,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  Target,
  Upload,
  UserRound,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import { FormEvent, ReactNode, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { extractErrorMessage } from '../services/api'
import { submitOnboarding, type LiveExperience, type OnboardingPayload } from '../services/onboarding'
import { useAuthStore } from '../stores/auth-store'
import { routeForRole } from '../utils/access'

type Step = 1 | 2 | 3

type OnboardingForm = Omit<OnboardingPayload, 'available_offers' | 'live_experience'> & {
  live_owner: string
  available_offers: string
  live_experience: LiveExperience | ''
}

type FormKey = keyof OnboardingForm

const initialForm: OnboardingForm = {
  company_name: '',
  responsible_name: '',
  main_products: '',
  sales_history: '',
  focus_products: '',
  current_stock: '',
  product_margin: '',
  gmv_expectation: '',
  traffic_budget: '',
  live_owner: '',
  website_url: '',
  instagram_url: '',
  tiktok_url: '',
  tiktok_shop_url: '',
  available_offers: '',
  live_experience: '',
}

const requiredKeys: FormKey[] = [
  'company_name',
  'responsible_name',
  'main_products',
  'sales_history',
  'focus_products',
  'current_stock',
  'product_margin',
  'gmv_expectation',
  'traffic_budget',
  'live_owner',
  'live_experience',
]

const trackedKeys: FormKey[] = [
  'company_name',
  'responsible_name',
  'main_products',
  'sales_history',
  'focus_products',
  'current_stock',
  'product_margin',
  'gmv_expectation',
  'traffic_budget',
  'live_owner',
  'website_url',
  'instagram_url',
  'tiktok_shop_url',
  'live_experience',
]

const liveExperienceOptions: Array<{ value: LiveExperience; label: string; description: string }> = [
  { value: 'advanced', label: 'Sim, com frequência', description: 'Lives já fazem parte da rotina.' },
  { value: 'moderate', label: 'Poucas vezes', description: 'Já testamos e queremos evoluir.' },
  { value: 'low', label: 'Estamos começando', description: 'Temos intenção, mas pouca prática.' },
  { value: 'none', label: 'Nunca fizemos', description: 'Precisamos estruturar do zero.' },
]

function textOrNull(value?: string | null): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function formToPayload(form: OnboardingForm): OnboardingPayload {
  const offers = [
    form.live_owner.trim() ? `Responsável pelas lives: ${form.live_owner.trim()}` : '',
    form.available_offers.trim(),
  ]
    .filter(Boolean)
    .join('\n\n')

  return {
    company_name: form.company_name.trim(),
    responsible_name: form.responsible_name.trim(),
    main_products: form.main_products.trim(),
    sales_history: form.sales_history.trim(),
    focus_products: form.focus_products.trim(),
    current_stock: form.current_stock.trim(),
    product_margin: form.product_margin.trim(),
    gmv_expectation: form.gmv_expectation.trim(),
    traffic_budget: form.traffic_budget.trim(),
    website_url: textOrNull(form.website_url),
    instagram_url: textOrNull(form.instagram_url),
    tiktok_url: textOrNull(form.tiktok_url),
    tiktok_shop_url: textOrNull(form.tiktok_shop_url),
    available_offers: textOrNull(offers),
    live_experience: form.live_experience as LiveExperience,
  }
}

function StepItem({ step, current, label }: { step: Step; current: Step; label: string }) {
  const done = step < current
  const active = step === current

  return (
    <div className="flex flex-1 items-center gap-2">
      <span
        className={clsx(
          'grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-bold transition',
          done && 'border-[var(--success)] bg-[var(--success)] text-white',
          active && 'border-brand bg-brand text-white shadow-[0_10px_24px_-8px_rgba(255,90,31,0.45)]',
          !done && !active && 'border-[var(--border-strong)] bg-surface text-ink-muted',
        )}
      >
        {done ? <Check className="h-3.5 w-3.5" /> : step}
      </span>
      <span className={clsx('hidden whitespace-nowrap text-xs font-medium sm:inline', active ? 'text-ink' : done ? 'text-[var(--text-secondary)]' : 'text-ink-muted')}>
        {label}
      </span>
    </div>
  )
}

function SectionTitle({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
  return (
    <div className="mb-5 flex items-start gap-3 border-b border-dashed border-[var(--border-strong)] pb-4">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-soft font-serif text-sm italic text-brand">
        {number}
      </span>
      <div>
        <h2 className="m-0 text-base font-semibold tracking-[-0.01em] text-ink">{title}</h2>
        <p className="mt-1 text-xs text-ink-muted">{subtitle}</p>
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  help,
  icon: Icon,
  children,
}: {
  label: string
  required?: boolean
  help?: string
  icon?: LucideIcon
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-ink">
        {label}
        {required ? <span className="text-brand">*</span> : null}
        {help ? <span className="ml-auto text-xs font-normal text-ink-muted">{help}</span> : null}
      </span>
      <span className="relative block">
        {Icon ? <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" /> : null}
        {children}
      </span>
    </label>
  )
}

export function OnboardingPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const markOnboardingCompleted = useAuthStore((state) => state.markOnboardingCompleted)
  const [step, setStep] = useState<Step>(1)
  const [completionShown, setCompletionShown] = useState(false)
  const [form, setForm] = useState<OnboardingForm>(initialForm)
  const [invalidKeys, setInvalidKeys] = useState<Set<FormKey>>(() => new Set())
  const [logoFileName, setLogoFileName] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filledCount = useMemo(
    () => trackedKeys.reduce((total, key) => total + (String(form[key] ?? '').trim() ? 1 : 0), 0),
    [form],
  )
  const progress = Math.round((filledCount / trackedKeys.length) * 100)

  if (!user) return null
  if (user.papel !== 'cliente_parceiro') {
    return <Navigate to={routeForRole(user.papel, user.onboarding_completed ?? true)} replace />
  }
  if (user.onboarding_completed && !completionShown) return <Navigate to="/cliente" replace />

  function updateField<K extends FormKey>(key: K, value: OnboardingForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    if (invalidKeys.has(key)) {
      setInvalidKeys((current) => {
        const next = new Set(current)
        next.delete(key)
        return next
      })
    }
  }

  function goTo(nextStep: Step) {
    setStep(nextStep)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const missing = requiredKeys.filter((key) => !String(form[key] ?? '').trim())
    setInvalidKeys(new Set(missing))
    if (missing.length > 0) {
      setSubmitError('Preencha os campos obrigatórios antes de finalizar.')
      return
    }

    setSubmitError(null)
    setIsSubmitting(true)
    try {
      await submitOnboarding(formToPayload(form))
      setCompletionShown(true)
      setStep(3)
      markOnboardingCompleted()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setSubmitError(extractErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClass = (key: FormKey, hasIcon = false) =>
    clsx(
      'design-input h-12 w-full px-4 text-sm placeholder:text-[var(--text-faint)]',
      hasIcon && 'pl-11',
      invalidKeys.has(key) && 'border-[var(--danger)] bg-[var(--danger-soft)]',
    )
  const textareaClass = (key: FormKey) =>
    clsx(
      'design-input min-h-24 w-full resize-y px-4 py-3 text-sm leading-6 placeholder:text-[var(--text-faint)]',
      invalidKeys.has(key) && 'border-[var(--danger)] bg-[var(--danger-soft)]',
    )

  return (
    <div className="onboarding-shell min-h-screen text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-4 sm:px-8 lg:flex-nowrap lg:gap-8">
          <div className="text-[22px] font-extrabold tracking-[-0.04em] text-ink">
            Live<span className="font-serif italic">lab</span><span className="text-brand">.</span>
          </div>
          <div className="order-3 flex w-full items-center gap-3 lg:order-none lg:max-w-2xl lg:flex-1">
            <StepItem step={1} current={step} label="Boas-vindas" />
            <span className={clsx('h-0.5 min-w-6 flex-1 rounded-full bg-[var(--border-strong)]', step > 1 && 'bg-brand')} />
            <StepItem step={2} current={step} label="Sobre o negócio" />
            <span className={clsx('h-0.5 min-w-6 flex-1 rounded-full bg-[var(--border-strong)]', step > 2 && 'bg-brand')} />
            <StepItem step={3} current={step} label="Pronto" />
          </div>
          {step === 2 ? (
            <div className="ml-auto inline-flex items-center gap-2 text-xs text-ink-muted">
              <span className="onboarding-save-dot h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
              Salvo ao finalizar
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-8 lg:py-12">
        {step === 1 ? (
          <section className="mx-auto mt-4 max-w-xl overflow-hidden rounded-[22px] border border-line bg-surface px-6 py-10 text-center shadow-[var(--shadow-card-lg)] sm:mt-10 sm:px-12 sm:py-14">
            <div className="relative">
              <div className="absolute inset-x-0 -top-36 mx-auto h-80 w-80 rounded-full bg-brand-soft blur-3xl" />
              <div className="relative">
                <div className="mx-auto mb-6 grid h-18 w-18 place-items-center rounded-[22px] border border-brand-soft bg-[var(--primary-softer)] text-4xl font-black tracking-[-0.04em] text-brand shadow-[0_12px_32px_-8px_rgba(255,90,31,0.25)]">
                  L
                </div>
                <p className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand before:h-px before:w-4 before:bg-brand/50 after:h-px after:w-4 after:bg-brand/50">
                  Onboarding · 2 min
                </p>
                <h1 className="m-0 text-3xl font-bold leading-tight tracking-[-0.03em] text-ink sm:text-4xl">
                  Bem-vindo(a) ao <span className="font-serif text-[1.1em] font-normal italic text-brand">Livelab</span>
                </h1>
                <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
                  Antes de começar, precisamos conhecer melhor o seu negócio. Suas respostas ajudam nosso time a personalizar a estratégia de lives.
                </p>
                <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
                  {[
                    { icon: Sparkles, title: 'Personalizado', sub: 'Recomendações sob medida pro seu segmento' },
                    { icon: Clock3, title: 'Rápido', sub: 'Leva cerca de 2 minutos' },
                    { icon: ShieldCheck, title: 'Privado', sub: 'Seus dados ficam com você' },
                  ].map((item) => {
                    const Icon = item.icon
                    return (
                      <div key={item.title} className="rounded-2xl border border-line bg-canvas p-4">
                        <span className="mb-3 grid h-8 w-8 place-items-center rounded-xl bg-[var(--primary-softer)] text-brand">
                          <Icon className="h-4 w-4" />
                        </span>
                        <p className="text-xs font-bold text-ink">{item.title}</p>
                        <p className="mt-1 text-[11px] leading-4 text-ink-muted">{item.sub}</p>
                      </div>
                    )
                  })}
                </div>
                <Button className="mt-8 h-13 w-full text-base" icon={ArrowRight} onClick={() => goTo(2)}>
                  Começar
                </Button>
              </div>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <form className="overflow-hidden rounded-[22px] border border-line bg-surface shadow-[var(--shadow-card)]" onSubmit={onSubmit}>
            <header className="border-b border-line bg-gradient-to-b from-[var(--primary-softer)] to-transparent px-5 py-7 sm:px-9">
              <p className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted before:h-px before:w-5 before:bg-brand">
                Etapa 2 de 3
              </p>
              <h1 className="m-0 text-2xl font-bold tracking-[-0.025em] text-ink sm:text-3xl">
                Formulário de <span className="font-serif text-[1.12em] font-normal italic text-brand">onboarding</span>
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                Preencha os campos obrigatórios pra que possamos configurar sua conta. Os campos marcados com <span className="font-bold text-brand">*</span> são essenciais.
              </p>
              <div className="mt-5 flex items-center gap-3 text-xs text-ink-muted">
                <span className="font-bold text-ink">{filledCount} / {trackedKeys.length}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
                  <span className="block h-full rounded-full bg-gradient-to-r from-brand to-[#ff8a3c] transition-all" style={{ width: `${progress}%` }} />
                </span>
                <span>preenchidos</span>
              </div>
            </header>

            <div className="space-y-9 px-5 py-7 sm:px-9">
              <section>
                <SectionTitle number="i" title="Identificação da empresa" subtitle="Como vocês se apresentam ao mercado." />
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Field label="Nome da empresa" required icon={Building2}>
                      <input className={inputClass('company_name', true)} value={form.company_name} onChange={(event) => updateField('company_name', event.target.value)} placeholder="Ex: Atelier Dois Irmãos" />
                    </Field>
                  </div>
                  <Field label="Responsável pelo onboarding" required icon={UserRound}>
                    <input className={inputClass('responsible_name', true)} value={form.responsible_name} onChange={(event) => updateField('responsible_name', event.target.value)} placeholder="Nome de quem vai acompanhar a implantação" />
                  </Field>
                  <Field label="Produto principal" required icon={Store}>
                    <input className={inputClass('main_products', true)} value={form.main_products} onChange={(event) => updateField('main_products', event.target.value)} placeholder="Ex: Vestidos midi" />
                  </Field>
                  <Field label="Histórico de vendas" required icon={WalletCards}>
                    <select className={inputClass('sales_history', true)} value={form.sales_history} onChange={(event) => updateField('sales_history', event.target.value)}>
                      <option value="">Selecione uma faixa</option>
                      <option>Até R$ 10 mil/mês</option>
                      <option>R$ 10 mil a R$ 50 mil/mês</option>
                      <option>R$ 50 mil a R$ 200 mil/mês</option>
                      <option>R$ 200 mil a R$ 1 milhão/mês</option>
                      <option>Acima de R$ 1 milhão/mês</option>
                    </select>
                  </Field>
                  <Field label="Produtos foco para live" required icon={Target}>
                    <input className={inputClass('focus_products', true)} value={form.focus_products} onChange={(event) => updateField('focus_products', event.target.value)} placeholder="Ex: Kits promocionais, lançamentos, ponta de estoque" />
                  </Field>
                </div>
              </section>

              <section>
                <SectionTitle number="ii" title="Operação" subtitle="Estoque, margem, equipe e metas." />
                <div className="grid gap-5 md:grid-cols-3">
                  <Field label="Estoque disponível" required icon={Package}>
                    <input className={inputClass('current_stock', true)} value={form.current_stock} onChange={(event) => updateField('current_stock', event.target.value)} placeholder="0 SKUs" inputMode="numeric" />
                  </Field>
                  <Field label="Margem dos produtos" required icon={Percent}>
                    <input className={inputClass('product_margin', true)} value={form.product_margin} onChange={(event) => updateField('product_margin', event.target.value)} placeholder="0%" inputMode="decimal" />
                  </Field>
                  <Field label="Meta de GMV com lives" required icon={CircleDollarSign}>
                    <input className={inputClass('gmv_expectation', true)} value={form.gmv_expectation} onChange={(event) => updateField('gmv_expectation', event.target.value)} placeholder="Ex: R$ 30 mil/mês" />
                  </Field>
                  <Field label="Verba de tráfego" required icon={WalletCards}>
                    <input className={inputClass('traffic_budget', true)} value={form.traffic_budget} onChange={(event) => updateField('traffic_budget', event.target.value)} placeholder="Ex: R$ 5 mil/mês" />
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Quem cuida das lives hoje?" required icon={UsersRound}>
                      <input className={inputClass('live_owner', true)} value={form.live_owner} onChange={(event) => updateField('live_owner', event.target.value)} placeholder="Ex: Equipe interna de marketing, freelancers, agência..." />
                    </Field>
                  </div>
                </div>
              </section>

              <section>
                <SectionTitle number="iii" title="Presença digital" subtitle="Onde encontramos sua marca online." />
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Instagram da empresa" icon={Instagram}>
                    <input className={inputClass('instagram_url', true)} value={form.instagram_url ?? ''} onChange={(event) => updateField('instagram_url', event.target.value)} placeholder="@suaempresa" />
                  </Field>
                  <Field label="TikTok da empresa" icon={Music2}>
                    <input className={inputClass('tiktok_url', true)} value={form.tiktok_url ?? ''} onChange={(event) => updateField('tiktok_url', event.target.value)} placeholder="@suaempresa" />
                  </Field>
                  <Field label="TikTok Shop" icon={ShoppingCart}>
                    <input className={inputClass('tiktok_shop_url', true)} value={form.tiktok_shop_url ?? ''} onChange={(event) => updateField('tiktok_shop_url', event.target.value)} placeholder="Link da loja" />
                  </Field>
                  <Field label="Site / loja online" icon={Globe2}>
                    <input className={inputClass('website_url', true)} value={form.website_url ?? ''} onChange={(event) => updateField('website_url', event.target.value)} placeholder="https://suaempresa.com.br" />
                  </Field>
                </div>
              </section>

              <section>
                <SectionTitle number="iv" title="Experiência com lives" subtitle="Conta pra gente seu histórico." />
                <div className="space-y-5">
                  <div>
                    <p className="mb-2 text-sm font-semibold text-ink">
                      Já fizeram lives antes? <span className="text-brand">*</span>
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {liveExperienceOptions.map((option) => {
                        const selected = form.live_experience === option.value
                        return (
                          <button
                            key={option.value}
                            type="button"
                            className={clsx(
                              'rounded-2xl border p-4 text-left transition',
                              selected ? 'border-brand bg-[var(--primary-softer)] text-ink' : 'border-line bg-[var(--bg-input)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-surface',
                              invalidKeys.has('live_experience') && !selected && 'border-[var(--danger)]',
                            )}
                            onClick={() => updateField('live_experience', option.value)}
                          >
                            <span className="mb-3 flex items-center gap-2">
                              <span className={clsx('grid h-5 w-5 place-items-center rounded-full border', selected ? 'border-brand bg-brand' : 'border-[var(--border-strong)] bg-surface')}>
                                {selected ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
                              </span>
                              <span className="text-sm font-bold">{option.label}</span>
                            </span>
                            <span className="block text-xs leading-5 text-ink-muted">{option.description}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <Field label="Informações relevantes" help="opcional">
                    <textarea className={textareaClass('available_offers')} value={form.available_offers ?? ''} onChange={(event) => updateField('available_offers', event.target.value)} placeholder="Conte algo sobre ofertas, sazonalidade, operação ou produtos que possa ser importante..." />
                  </Field>

                  {/* TODO: enviar a mídia quando o backend expuser endpoint multipart para logo do onboarding. */}
                  <label className="flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-input)] p-4 transition hover:border-brand hover:bg-[var(--primary-softer)]">
                    <input
                      hidden
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml"
                      onChange={(event) => setLogoFileName(event.target.files?.[0]?.name ?? '')}
                    />
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-surface text-brand">
                      <Upload className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-ink">{logoFileName || 'Logo / mídia da empresa'}</span>
                      <span className="block truncate text-xs text-ink-muted">PNG, JPG ou SVG · até 10MB</span>
                    </span>
                  </label>
                </div>
              </section>

              {submitError ? (
                <div className="rounded-2xl border border-[var(--danger-soft)] bg-[var(--danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--danger)]">
                  {submitError}
                </div>
              ) : null}
            </div>

            <footer className="flex flex-wrap items-center gap-3 border-t border-line bg-canvas px-5 py-5 sm:px-9">
              <span className="inline-flex items-center gap-2 text-xs text-ink-muted">
                <Check className="h-4 w-4 text-[var(--success)]" />
                Suas respostas serão gravadas com segurança
              </span>
              <div className="ml-auto flex w-full gap-2 sm:w-auto">
                <Button className="h-12 flex-1 sm:flex-none" type="button" variant="secondary" icon={ArrowLeft} onClick={() => goTo(1)}>
                  Voltar
                </Button>
                <Button className="h-12 flex-1 sm:flex-none" type="submit" icon={isSubmitting ? Loader2 : Check} isLoading={isSubmitting}>
                  Finalizar
                </Button>
              </div>
            </footer>
          </form>
        ) : null}

        {step === 3 ? (
          <section className="mx-auto mt-4 max-w-xl overflow-hidden rounded-[22px] border border-line bg-surface px-6 py-10 text-center shadow-[var(--shadow-card-lg)] sm:mt-10 sm:px-12 sm:py-14">
            <div className="onboarding-success-icon relative mx-auto mb-6 grid h-22 w-22 place-items-center rounded-full bg-[var(--success-soft)] text-[var(--success)] shadow-[0_12px_32px_-8px_rgba(31,157,85,0.3)]">
              <CheckCircle2 className="h-11 w-11 stroke-[2.6]" />
            </div>
            <p className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--success)] before:h-px before:w-4 before:bg-[var(--success)]/40 after:h-px after:w-4 after:bg-[var(--success)]/40">
              Tudo certo
            </p>
            <h1 className="m-0 text-3xl font-bold leading-tight tracking-[-0.03em] text-ink">
              Obrigado por compartilhar suas <span className="font-serif text-[1.12em] font-normal italic text-brand">informações</span>
            </h1>
            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
              Sua equipe Livelab já pode começar a trabalhar com você. Em breve você receberá um email com os próximos passos.
            </p>
            <ul className="my-8 space-y-3 p-0 text-left">
              {[
                ['Análise do perfil', 'Nosso time analisa suas respostas em até 24h.'],
                ['Reunião de kick-off', 'Marcamos uma call pra alinhar expectativas e cronograma.'],
                ['Primeira live', 'Em até 7 dias, você está no ar.'],
              ].map(([title, description], index) => (
                <li key={title} className="flex gap-3 rounded-2xl border border-line bg-canvas p-4 text-sm text-[var(--text-secondary)]">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--primary-softer)] text-xs font-bold text-brand">{index + 1}</span>
                  <span>
                    <strong className="block text-sm text-ink">{title}</strong>
                    {description}
                  </span>
                </li>
              ))}
            </ul>
            <Button className="h-13 w-full text-base" icon={ArrowRight} onClick={() => navigate('/cliente', { replace: true })}>
              Ir para o Dashboard
            </Button>
          </section>
        ) : null}
      </main>
    </div>
  )
}
