export function normalizeTikTokUsername(value: unknown): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''

  const match = trimmed.match(/tiktok\.com\/@([a-zA-Z0-9_.]{2,24})/i)
  const username = match?.[1] ?? trimmed.replace(/^@+/, '').replace(/\/live\/?$/i, '').replace(/^\/+/, '')
  return /^[a-zA-Z0-9_.]{2,24}$/.test(username) ? username : ''
}

export function getTikTokLiveUrl(value: unknown): string {
  const username = normalizeTikTokUsername(value)
  return username ? `https://www.tiktok.com/@${username}/live` : ''
}
