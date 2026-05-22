import { useEffect, useRef } from 'react'

const CHECK_INTERVAL_MS = 5 * 60_000 // 5 min

/**
 * Detecta deploy de versão nova e recarrega automaticamente (silencioso).
 *
 * Compara o `__APP_VERSION__` embutido no build atual com o `version.json`
 * servido (Cache-Control: no-cache). Quando diferem, força reload — pegando
 * o index.html novo e os assets com hash atualizados, sem o usuário limpar cache.
 *
 * Dispara em: intervalo de 5 min e quando a aba volta ao foco (visibilitychange).
 */
export function useVersionCheck(): void {
  const reloadingRef = useRef(false)

  useEffect(() => {
    const current = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : ''

    async function check() {
      if (reloadingRef.current || document.hidden) return
      try {
        const res = await fetch(`/version.json?ts=${Date.now()}`, { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as { v?: string }
        const latest = String(data?.v ?? '')
        if (latest && current && latest !== current) {
          reloadingRef.current = true
          window.location.reload()
        }
      } catch {
        // offline / falha de rede — ignora, tenta de novo no próximo ciclo
      }
    }

    const interval = window.setInterval(check, CHECK_INTERVAL_MS)
    const onVisible = () => { if (!document.hidden) void check() }
    document.addEventListener('visibilitychange', onVisible)
    // checagem inicial após pequeno delay (deixa app montar)
    const t = window.setTimeout(check, 10_000)

    return () => {
      window.clearInterval(interval)
      window.clearTimeout(t)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
}
