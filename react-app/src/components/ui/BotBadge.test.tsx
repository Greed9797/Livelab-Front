import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BotBadge, isBot } from './BotBadge'

// Sem ambiente DOM no repo: markup estático, como os outros testes de ui/.
describe('BotBadge', () => {
  it("renderiza o chip BOT quando origem_dados é 'bot'", () => {
    const html = renderToStaticMarkup(<BotBadge origem="bot" />)
    expect(html).toContain('BOT')
    expect(isBot('bot')).toBe(true)
  })

  it.each([['manual'], ['api'], [undefined], [null], ['']])('não renderiza nada para %s', (origem) => {
    expect(renderToStaticMarkup(<BotBadge origem={origem} />)).toBe('')
    expect(isBot(origem)).toBe(false)
  })
})
