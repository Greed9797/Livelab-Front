import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

const currentDir = dirname(fileURLToPath(import.meta.url))
const shellSource = readFileSync(join(currentDir, 'Shell.tsx'), 'utf8')

describe('Shell layout source contract', () => {
  it('does not render the global SaaS search in the shell header', () => {
    expect(shellSource).not.toContain(['Buscar', 'no', 'SaaS'].join(' '))
  })

  it('does not render the tenant header above the page content on desktop', () => {
    expect(shellSource).not.toContain('isHomeRoute')
    expect(shellSource).not.toContain('tenant_nome ?? user?.nome')
  })
})
