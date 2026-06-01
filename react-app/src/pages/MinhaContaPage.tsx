import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { KeyRound } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { trocarSenha } from '../services/domain'
import { extractErrorMessage } from '../services/api'

export function MinhaContaPage() {
  const [senha, setSenha] = useState({ senha_atual: '', nova_senha: '' })

  const senhaMutation = useMutation({
    mutationFn: trocarSenha,
    onSuccess: () => setSenha({ senha_atual: '', nova_senha: '' }),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Conta"
        accent="Minha"
        title="conta"
        subtitle="Altere a sua senha de acesso. Mínimo 8 caracteres, com letra e número."
      />

      <Card>
        <CardHeader>
          <p className="text-sm font-bold text-ink">Segurança</p>
        </CardHeader>
        <CardBody>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault()
              senhaMutation.mutate(senha)
            }}
          >
            <input
              className="design-input h-11 w-full px-4"
              type="password"
              autoComplete="current-password"
              placeholder="Senha atual"
              value={senha.senha_atual}
              onChange={(event) => setSenha((current) => ({ ...current, senha_atual: event.target.value }))}
              required
            />
            <input
              className="design-input h-11 w-full px-4"
              type="password"
              autoComplete="new-password"
              placeholder="Nova senha"
              value={senha.nova_senha}
              onChange={(event) => setSenha((current) => ({ ...current, nova_senha: event.target.value }))}
              minLength={8}
              required
            />
            {senhaMutation.isError ? (
              <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)] md:col-span-2">
                {extractErrorMessage(senhaMutation.error)}
              </p>
            ) : null}
            {senhaMutation.isSuccess ? (
              <p className="rounded-2xl bg-[var(--success-soft)] px-4 py-3 text-sm font-medium text-[var(--success)] md:col-span-2">
                Senha alterada. Outras sessões foram desconectadas.
              </p>
            ) : null}
            <div className="md:col-span-2">
              <Button type="submit" icon={KeyRound} isLoading={senhaMutation.isPending}>Trocar senha</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
