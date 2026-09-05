import { Navigate, useLocation } from 'react-router-dom'

export function legacyPageDestination(to: string, search: string, hash = ''): string {
  const params = new URLSearchParams(search)
  const path = to === 'conteudo'
    ? params.get('tab') === 'lives' ? '/lives' : '/agenda'
    : to
  // Abas removidas não devem voltar a selecionar superfícies antigas.
  if (to === 'conteudo' || to === '/clientes') params.delete('tab')
  const query = params.toString()
  return `${path}${query ? `?${query}` : ''}${hash}`
}

export function LegacyPageRedirect({ to }: { to: string }) {
  const { search, hash } = useLocation()
  return <Navigate to={legacyPageDestination(to, search, hash)} replace />
}
