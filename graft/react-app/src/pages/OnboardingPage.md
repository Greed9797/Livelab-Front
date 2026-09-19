# react-app/src/pages/OnboardingPage.tsx

- Step · type · L35-L35 — type Step = 1 | 2 | 3
- OnboardingForm · type · L37-L41 — type OnboardingForm = Omit<OnboardingPayload, 'available_offers' | 'live_experience'> & { live_owner: string available_offers: string live_experience: LiveExperience | '' }
- FormKey · type · L43-L43 — type FormKey = keyof OnboardingForm
- textOrNull · function · L102-L105 — function textOrNull(value?: string | null): string | null
- formToPayload · function · L107-L132 — function formToPayload(form: OnboardingForm): OnboardingPayload
- StepItem · function · L134-L155 — function StepItem({ step, current, label }: { step: Step; current: Step; label: string })
- SectionTitle · function · L157-L169 — function SectionTitle({ number, title, subtitle }: { number: string; title: string; subtitle: string })
- Field · function · L171-L197 — function Field({ label, required, help, icon: Icon, children, }: { label: string required?: boolean help?: string icon?: LucideIcon children: ReactNode })
- OnboardingPage · function · L199-L553 — function OnboardingPage()
- updateField · function · L223-L232 — function updateField<K extends FormKey>(key: K, value: OnboardingForm[K])
- goTo · function · L234-L237 — function goTo(nextStep: Step)
- onSubmit · function · L239-L261 — async function onSubmit(event: FormEvent<HTMLFormElement>)
- inputClass · function · L263-L268 — inputClass = (key: FormKey, hasIcon = false)
- textareaClass · function · L269-L273 — textareaClass = (key: FormKey)
