import { Badge } from './Badge'

/**
 * Chip BOT: aparece só em registro que a automação (chave de API) criou.
 * `origem_dados` vale 'manual' | 'api' | 'bot'; 'api' é o autostart da agenda,
 * não é bot, e não ganha chip.
 */
export function isBot(origem: unknown): boolean {
  return origem === 'bot'
}

export function BotBadge({ origem, className }: { origem: unknown; className?: string }) {
  if (!isBot(origem)) return null
  return (
    <Badge tone="sistema" className={className}>
      BOT
    </Badge>
  )
}
