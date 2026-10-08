import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { extractErrorMessage } from '../../services/api'

interface ResetSenhaModalProps {
  open: boolean
  nome: string
  email: string
  password: string | null
  pending: boolean
  error: unknown
  onClose: () => void
  onConfirm?: () => void
}

export function ResetSenhaModal({ open, nome, email, password, pending, error, onClose, onConfirm }: ResetSenhaModalProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied' | 'denied' | 'unavailable'>('idle')
  const autoCopyPassword = useRef<string | null>(null)
  const copySequence = useRef(0)
  const copyQueue = useRef<Promise<void>>(Promise.resolve())
  const currentPassword = useRef<string | null>(null)
  currentPassword.current = open ? password : null

  const copyPassword = useCallback(async () => {
    if (!password) return
    const sequence = ++copySequence.current
    const value = password
    setCopyState('copying')
    const write = copyQueue.current.then(async () => {
      if (sequence !== copySequence.current || currentPassword.current !== value) return false
      if (!navigator.clipboard?.writeText) throw new Error('clipboard-unavailable')
      await navigator.clipboard.writeText(value)
      return true
    })
    copyQueue.current = write.then(() => undefined, () => undefined)
    try {
      const copied = await write
      if (!copied || sequence !== copySequence.current || currentPassword.current !== value) return
      setCopyState('copied')
    } catch (copyError) {
      if (sequence !== copySequence.current || currentPassword.current !== value) return
      setCopyState(copyError instanceof Error && copyError.message === 'clipboard-unavailable' ? 'unavailable' : 'denied')
    }
  }, [password])

  useEffect(() => {
    if (!open) {
      autoCopyPassword.current = null
      copySequence.current += 1
      setCopyState('idle')
      return
    }
    if (password && autoCopyPassword.current !== password) {
      autoCopyPassword.current = password
      void copyPassword()
    }
  }, [copyPassword, open, password])

  return (
    <Modal
      open={open}
      title="Senha temporária"
      subtitle={nome ? `${nome} · ${email}` : email}
      onClose={onClose}
      closeDisabled={pending}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>Fechar</Button>
          {!password && !pending && onConfirm ? <Button onClick={onConfirm}>Gerar senha temporária</Button> : null}
          {password ? (
            <Button icon={copyState === 'copied' ? Check : Copy} onClick={() => void copyPassword()}>
              {copyState === 'copied' ? 'Copiada' : copyState === 'copying' ? 'Copiando…' : 'Copiar senha'}
            </Button>
          ) : null}
        </>
      )}
    >
      {!password && !pending && !error && onConfirm ? (
        <p className="text-sm text-ink-muted">Isso encerra as sessões ativas de {nome || email} e substitui a senha atual por uma senha temporária.</p>
      ) : null}
      {pending ? <p role="status" className="text-sm text-ink-muted">Gerando senha temporária…</p> : null}
      {error ? <p role="alert" className="text-sm font-medium text-[var(--danger)]">{extractErrorMessage(error)}</p> : null}
      {password ? (
        <div className="grid gap-2">
          <label htmlFor="temporary-password" className="text-sm font-semibold text-ink">Senha de {nome || email}</label>
          <input
            id="temporary-password"
            aria-label="Senha temporária gerada"
            className="design-input h-12 w-full select-all px-4 font-mono text-base"
            value={password}
            readOnly
            onFocus={(event) => event.currentTarget.select()}
          />
          <p role="status" aria-live="polite" className="text-sm text-ink-muted">
            {copyState === 'copied'
              ? 'Senha copiada para a área de transferência.'
              : copyState === 'copying'
                ? 'Copiando senha para a área de transferência…'
              : copyState === 'denied'
                ? 'Não foi possível copiar automaticamente. Tente usar o botão Copiar senha.'
                : copyState === 'unavailable'
                  ? 'A cópia não está disponível neste navegador. Selecione e copie a senha manualmente.'
                : 'A senha fica visível somente enquanto esta janela estiver aberta.'}
          </p>
        </div>
      ) : null}
    </Modal>
  )
}
