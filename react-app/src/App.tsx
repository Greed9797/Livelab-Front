import { useEffect } from 'react'
import { AppRouter } from './routes/AppRouter'
import { useAuthStore } from './stores/auth-store'
import { useVersionCheck } from './hooks/useVersionCheck'

export default function App() {
  const bootstrap = useAuthStore((state) => state.bootstrap)
  useVersionCheck()

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  return <AppRouter />
}
