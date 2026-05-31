import { ArrowLeft, Mail } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { requestPasswordReset } from '../services/auth'
import { extractErrorMessage } from '../services/api'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await requestPasswordReset(email.trim())
      setMessage('Se este email estiver cadastrado, você receberá o link em breve.')
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="livelab-shell flex min-h-screen items-center justify-center px-4">
      <section className="design-panel w-full max-w-md p-8">
        <Link to="/login" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-ink-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <h1 className="text-2xl font-bold text-ink">Recuperar senha</h1>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="text-sm font-semibold text-ink">E-mail</span>
            <input
              className="design-input mt-2 h-11 w-full px-4"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          {message ? <p className="rounded-2xl bg-[var(--success-soft)] px-4 py-3 text-sm font-medium text-[var(--success)]">{message}</p> : null}
          {error ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{error}</p> : null}
          <Button className="w-full" type="submit" icon={Mail} isLoading={loading}>
            Enviar link
          </Button>
        </form>
      </section>
    </main>
  )
}
