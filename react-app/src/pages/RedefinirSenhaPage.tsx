import { FormEvent, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { resetPassword } from '../services/auth'
import { extractErrorMessage } from '../services/api'

export function RedefinirSenhaPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!token) {
      setError('Link de redefinição inválido ou expirado.')
      return
    }
    if (senha.length < 8) {
      setError('A senha deve ter ao menos 8 caracteres.')
      return
    }
    if (senha !== confirmar) {
      setError('As senhas não conferem.')
      return
    }
    setLoading(true)
    try {
      await resetPassword(token, senha)
      setDone(true)
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="livelab-shell flex min-h-screen items-center justify-center px-4">
      <section className="design-panel w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-ink">Redefinir senha</h1>
        {done ? (
          <>
            <p className="mt-4 rounded-2xl bg-[var(--success-soft)] px-4 py-3 text-sm font-medium text-[var(--success)]">
              Senha redefinida com sucesso. Faça login com a nova senha.
            </p>
            <Link to="/login" className="mt-6 inline-block text-sm font-semibold text-ink-muted hover:text-ink">Ir para login</Link>
          </>
        ) : !token ? (
          <p className="mt-6 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
            Link inválido. Solicite uma nova recuperação de senha.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-ink-muted">Escolha uma nova senha para sua conta.</p>
            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Nova senha</span>
                <input className="design-input mt-2 h-11 w-full px-4" type="password" value={senha} autoComplete="new-password" onChange={(e) => setSenha(e.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Confirmar senha</span>
                <input className="design-input mt-2 h-11 w-full px-4" type="password" value={confirmar} autoComplete="new-password" onChange={(e) => setConfirmar(e.target.value)} />
              </label>
              {error ? <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">{error}</p> : null}
              <Button className="w-full" type="submit" icon={KeyRound} isLoading={loading}>Redefinir senha</Button>
            </form>
            <Link to="/login" className="mt-6 inline-block text-sm font-semibold text-ink-muted hover:text-ink">Voltar para login</Link>
          </>
        )}
      </section>
    </main>
  )
}
