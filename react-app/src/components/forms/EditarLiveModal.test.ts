import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { presenterIdsFromLive } from './EditarLiveModal'

describe('EditarLiveModal presenter id contract', () => {
  const source = readFileSync(new URL('./EditarLiveModal.tsx', import.meta.url), 'utf8')

  it('prefers apresentadoras ids over legacy user ids when hydrating presenter selects', () => {
    expect(source).toContain("apresentador_id: asString(live.apresentadora_id ?? live.apresentador_id, '')")
    expect(source).toContain("apresentador2_id: asString(live.apresentadora2_id ?? live.apresentador2_id, '')")
  })

  it('compares saved presenter fields against apresentadoras ids', () => {
    expect(source).toContain("setIfChanged('apresentador_id', form.apresentador_id, live.apresentadora_id ?? live.apresentador_id)")
    expect(source).toContain("setIfChanged('apresentador2_id', form.apresentador2_id, live.apresentadora2_id ?? live.apresentador2_id)")
  })

  it('hydrates both selects from the authoritative rateio before legacy aliases', () => {
    expect(presenterIdsFromLive({
      apresentadoras: [
        { apresentadora_id: 'sandy', papel: 'principal' },
        { apresentadora_id: 'cliceane', papel: 'apoio' },
      ],
      apresentadora_id: 'legacy-primary',
      apresentadora2_id: 'legacy-support',
    })).toEqual({ principalId: 'sandy', supportId: 'cliceane' })
  })
})
