import { describe, expect, it } from 'vitest'
import { captureError, flushSentry, initSentry, scrubUrl } from './sentry'

describe('scrubUrl', () => {
  it('filtra querystring sensível e preserva o resto', () => {
    expect(scrubUrl('/v1/lives?token=abc123&page=2')).toBe('/v1/lives?token=[Filtered]&page=2')
    expect(scrubUrl('/login?email=leo@livelab.com&senha=123')).toBe(
      '/login?email=[Filtered]&senha=[Filtered]',
    )
    expect(scrubUrl('/aceitar-convite?TOKEN=xyz')).toBe('/aceitar-convite?TOKEN=[Filtered]')
  })

  it('não mexe em URL sem querystring', () => {
    expect(scrubUrl('/v1/cabines')).toBe('/v1/cabines')
  })
})

describe('Sentry sem DSN', () => {
  it('fica desligado e não quebra o app', async () => {
    // VITE_SENTRY_DSN não está setada no ambiente de teste.
    expect(() => initSentry()).not.toThrow()
    expect(() => captureError(new Error('boom'), { stage: 'test' })).not.toThrow()
    await expect(flushSentry()).resolves.toBe(true)
  })
})
