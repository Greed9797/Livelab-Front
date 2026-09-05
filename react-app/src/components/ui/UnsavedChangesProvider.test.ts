import { describe, expect, it, vi } from 'vitest'
import { blockedGuardStillActive, createUnsavedGuardRegistry, dispatchBlockedNavigation, shouldBlockUnsavedNavigation } from './UnsavedChangesProvider'

describe('UnsavedChangesProvider registry', () => {
  it('selects the most recently opened active guard and ignores mounted closed guards', () => {
    const registry = createUnsavedGuardRegistry()
    const first = Symbol('first')
    const second = Symbol('second')
    const firstBlocked = vi.fn()
    const secondBlocked = vi.fn()
    registry.register(first, firstBlocked)
    registry.register(second, secondBlocked)

    registry.update(first, { open: true, dirty: true, busy: false })
    registry.update(second, { open: false, dirty: true, busy: false })
    expect(registry.active()?.id).toBe(first)

    registry.update(second, { open: true, dirty: true, busy: false })
    expect(registry.active()?.id).toBe(second)
    registry.update(first, { open: true, dirty: false, busy: true })
    expect(registry.active()?.id).toBe(first)
    const navigation = { reset: vi.fn(), proceed: vi.fn() }
    expect(dispatchBlockedNavigation(registry, navigation)).toBe('busy')
    expect(navigation.reset).toHaveBeenCalledOnce()
    expect(secondBlocked).not.toHaveBeenCalled()
  })

  it('blocks pathname/search changes, while allowing a hash-only navigation', () => {
    const registry = createUnsavedGuardRegistry()
    const id = Symbol('form')
    registry.register(id, vi.fn())
    registry.update(id, { open: true, dirty: true, busy: false })

    expect(shouldBlockUnsavedNavigation(
      { pathname: '/conteudo', search: '?tab=lives' },
      { pathname: '/', search: '' },
      registry,
    )).toBe(true)
    expect(shouldBlockUnsavedNavigation(
      { pathname: '/conteudo', search: '?tab=lives' },
      { pathname: '/conteudo', search: '?tab=lives' },
      registry,
    )).toBe(false)
  })

  it('cancels navigation while saving and delegates a dirty idle form to its warning', () => {
    const registry = createUnsavedGuardRegistry()
    const id = Symbol('form')
    const onBlocked = vi.fn()
    const navigation = { reset: vi.fn(), proceed: vi.fn() }
    registry.register(id, onBlocked)
    registry.update(id, { open: true, dirty: true, busy: true })

    expect(dispatchBlockedNavigation(registry, navigation)).toBe('busy')
    expect(navigation.reset).toHaveBeenCalledOnce()
    expect(onBlocked).not.toHaveBeenCalled()

    registry.update(id, { open: true, dirty: true, busy: false })
    expect(dispatchBlockedNavigation(registry, navigation)).toBe('confirming')
    expect(onBlocked).toHaveBeenCalledOnce()
    expect(navigation.proceed).not.toHaveBeenCalled()
    onBlocked.mock.calls[0][0].proceed()
    expect(navigation.proceed).toHaveBeenCalledOnce()
  })

  it('requires discarding each dirty form and rechecks a save that starts after confirmation', () => {
    const registry = createUnsavedGuardRegistry()
    const parent = Symbol('parent')
    const child = Symbol('child')
    const parentWarning = vi.fn()
    const childWarning = vi.fn()
    const navigation = { reset: vi.fn(), proceed: vi.fn() }
    registry.register(parent, parentWarning)
    registry.update(parent, { open: true, dirty: true, busy: false })
    registry.register(child, childWarning)
    registry.update(child, { open: true, dirty: true, busy: false })
    dispatchBlockedNavigation(registry, navigation)
    childWarning.mock.calls[0][0].proceed()
    expect(parentWarning).toHaveBeenCalledOnce()
    expect(navigation.proceed).not.toHaveBeenCalled()
    parentWarning.mock.calls[0][0].proceed()
    expect(navigation.proceed).toHaveBeenCalledOnce()

    navigation.proceed.mockClear()
    dispatchBlockedNavigation(registry, navigation)
    registry.update(parent, { open: true, dirty: true, busy: true })
    childWarning.mock.calls[1][0].proceed()
    expect(navigation.reset).toHaveBeenCalledOnce()
    expect(navigation.proceed).not.toHaveBeenCalled()
  })

  it('recognizes when the guard that blocked Back closed before the blocker effect', () => {
    const registry = createUnsavedGuardRegistry()
    const id = Symbol('fast-save')
    registry.register(id, vi.fn())
    registry.update(id, { open: true, dirty: true, busy: false })
    const captured = registry.active() ?? null

    registry.update(id, { open: false, dirty: false, busy: false })
    expect(blockedGuardStillActive(captured, registry)).toBe(false)
  })
})
