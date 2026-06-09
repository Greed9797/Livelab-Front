import { FormEvent, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { acceptInvite } from '../services/auth'
import { extractErrorMessage } from '../services/api'
import { routeForRole } from '../utils/access'

export function AceitarConvitePage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!token) {
      setError('Link de convite inválido ou expirado.')
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
      const session = await acceptInvite(token, senha)
      // Recarrega para o store de auth ler a sessão salva e rotear pelo papel.
      window.location.assign(routeForRole(session.user.papel, session.user.onboarding_completed ?? true))
    } catch (err) {
      setError(extractErrorMessage(err))
      setLoading(false)
    }
  }

  return (
    <main className="livelab-shell flex min-h-screen items-center justify-center px-4">
      <section className="design-panel w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-ink">Definir senha de acesso</h1>
        <p className="mt-2 text-sm text-ink-muted">Crie sua senha para concluir o convite e acessar o LiveLab.</p>
        {!token ? (
          <p className="mt-6 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
            Link inválido. Solicite um novo convite ao administrador.
          </p>
        ) : (
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
            <Button className="w-full" type="submit" icon={KeyRound} isLoading={loading}>Definir senha e entrar</Button>
          </form>
        )}
        <Link to="/login" className="mt-6 inline-block text-sm font-semibold text-ink-muted hover:text-ink">Voltar para login</Link>
      </section>
    </main>
  )
}
