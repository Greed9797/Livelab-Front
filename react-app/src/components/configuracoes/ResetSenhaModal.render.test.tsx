/** @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ResetSenhaModal } from './ResetSenhaModal'

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

afterEach(() => {
  cleanup()
  if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard)
  else Reflect.deleteProperty(navigator, 'clipboard')
})

function renderModal(overrides: Partial<Parameters<typeof ResetSenhaModal>[0]> = {}) {
  return render(<ResetSenhaModal
    open
    nome="Amanda"
    email="amanda@example.test"
    password="Temporary123"
    pending={false}
    error={null}
    onClose={vi.fn()}
    {...overrides}
  />)
}

describe('modal de senha temporária', () => {
  it('requires explicit confirmation before generating a replacement password', () => {
    const onConfirm = vi.fn()
    renderModal({ password: null, onConfirm })

    expect(screen.getByText(/encerra as sessões ativas/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Gerar senha temporária' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('exibe a pessoa, tenta copiar automaticamente e confirma somente após sucesso', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })

    renderModal()

    expect(screen.getByRole('dialog', { name: 'Senha temporária' })).toBeTruthy()
    expect(screen.getByText('Amanda · amanda@example.test')).toBeTruthy()
    expect((screen.getByLabelText('Senha temporária gerada') as HTMLInputElement).value).toBe('Temporary123')
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('Temporary123'))
    expect(await screen.findByText('Senha copiada para a área de transferência.')).toBeTruthy()
  })

  it('mantém fallback manual quando o navegador recusa a cópia automática', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('permission denied'))
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    renderModal()

    expect(await screen.findByText('Não foi possível copiar automaticamente. Tente usar o botão Copiar senha.')).toBeTruthy()
    writeText.mockResolvedValue(undefined)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copiar senha' })) })
    expect(writeText).toHaveBeenCalledTimes(2)
    expect(await screen.findByText('Senha copiada para a área de transferência.')).toBeTruthy()
  })

  it('permite copiar manualmente quando a tentativa automática foi bloqueada', async () => {
    const writeText = vi.fn()
      .mockRejectedValueOnce(new Error('permission denied'))
      .mockResolvedValueOnce(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    renderModal()

    expect(await screen.findByText('Não foi possível copiar automaticamente. Tente usar o botão Copiar senha.')).toBeTruthy()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copiar senha' })) })
    expect(await screen.findByText('Senha copiada para a área de transferência.')).toBeTruthy()
  })

  it('permite selecionar e copiar manualmente se o navegador não oferece clipboard API', async () => {
    Reflect.deleteProperty(navigator, 'clipboard')
    renderModal()

    expect(await screen.findByText('A cópia não está disponível neste navegador. Selecione e copie a senha manualmente.')).toBeTruthy()
    expect((screen.getByLabelText('Senha temporária gerada') as HTMLInputElement).value).toBe('Temporary123')
  })

  it('serializa cópias entre destinatários e não marca a senha anterior como copiada', async () => {
    let finishFirstWrite!: () => void
    let clipboardValue = ''
    const writeText = vi.fn((value: string) => {
      if (value === 'PasswordA') {
        return new Promise<void>((resolve) => {
          finishFirstWrite = () => { clipboardValue = value; resolve() }
        })
      }
      clipboardValue = value
      return Promise.resolve()
    })
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    const props = {
      open: true,
      nome: 'Pessoa A',
      email: 'a@example.test',
      password: 'PasswordA',
      pending: false,
      error: null,
      onClose: vi.fn(),
    }
    const view = render(<ResetSenhaModal {...props} />)
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('PasswordA'))

    view.rerender(<ResetSenhaModal {...props} open={false} password={null} />)
    view.rerender(<ResetSenhaModal {...props} nome="Pessoa B" email="b@example.test" password="PasswordB" />)
    expect(screen.getByLabelText('Senha temporária gerada').getAttribute('value')).toBe('PasswordB')
    expect(writeText).toHaveBeenCalledTimes(1)

    await act(async () => { finishFirstWrite() })
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('PasswordB'))
    expect(await screen.findByText('Senha copiada para a área de transferência.')).toBeTruthy()
    expect(clipboardValue).toBe('PasswordB')
  })

  it('expõe falha de reset e impede fechar enquanto a solicitação está pendente', () => {
    const onClose = vi.fn()
    renderModal({ pending: true, password: null, error: new Error('Falha no reset'), onClose })

    expect(screen.getByRole('status').textContent).toContain('Gerando senha temporária')
    expect(screen.getAllByRole('button', { name: 'Fechar' }).every((button) => (button as HTMLButtonElement).disabled)).toBe(true)
    expect(screen.queryByLabelText('Senha temporária gerada')).toBeNull()
    fireEvent.click(screen.getAllByRole('button', { name: 'Fechar' })[1])
    expect(onClose).not.toHaveBeenCalled()
  })

  it('mostra erro do endpoint e oferece fechar sem revelar senha', () => {
    renderModal({ password: null, error: new Error('Reset indisponível') })

    expect(screen.getByRole('alert').textContent).toBe('Reset indisponível')
    expect(screen.queryByLabelText('Senha temporária gerada')).toBeNull()
  })
})
