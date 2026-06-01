import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand">404</p>
      <h1 className="mt-3 text-3xl font-bold text-ink">Rota não encontrada</h1>
      <Link to="/" className="mt-6">
        <Button>Voltar</Button>
      </Link>
    </div>
  )
}
