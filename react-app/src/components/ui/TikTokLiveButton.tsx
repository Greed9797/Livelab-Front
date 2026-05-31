import { ExternalLink } from 'lucide-react'
import clsx from 'clsx'
import { getTikTokLiveUrl, normalizeTikTokUsername } from '../../utils/tiktok'

type Props = {
  username?: unknown
  compact?: boolean
  className?: string
}

export function TikTokLiveButton({ username, compact = false, className }: Props) {
  const normalized = normalizeTikTokUsername(username)
  const url = getTikTokLiveUrl(normalized)
  const baseClass = compact
    ? 'inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs transition'
    : 'inline-flex h-10 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold transition'

  if (!url) {
    return (
      <button
        type="button"
        className={clsx(baseClass, 'cursor-not-allowed border-line bg-surface text-ink-muted opacity-60', className)}
      disabled
      title="TikTok não cadastrado"
      aria-label="TikTok não cadastrado"
      onClick={(event) => event.stopPropagation()}
      >
        <ExternalLink className="h-4 w-4" />
        {compact ? null : 'Abrir live'}
      </button>
    )
  }

  return (
    <a
      className={clsx(baseClass, 'border-line bg-surface text-ink hover:border-[var(--border-strong)] hover:bg-surface-muted', className)}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={`Abrir live TikTok @${normalized}`}
      aria-label={`Abrir live TikTok @${normalized}`}
      onClick={(event) => event.stopPropagation()}
    >
      <ExternalLink className="h-4 w-4" />
      {compact ? null : 'Abrir live'}
    </a>
  )
}
