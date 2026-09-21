import { useEffect, useState } from 'react'

/** Padding inferior quando o teclado virtual reduz o visual viewport (mobile). */
export function useVisualViewportKeyboardInset(enabled: boolean): number {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !window.visualViewport) {
      setInset(0)
      return
    }
    const viewport = window.visualViewport
    function update() {
      const obscured = window.innerHeight - viewport.height - viewport.offsetTop
      setInset(Math.max(0, Math.round(obscured)))
    }
    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
    }
  }, [enabled])

  return inset
}
