import { asString } from './format'

export function getFaviconUrl(site?: string | null): string {
  const raw = asString(site, '').trim()
  if (!raw) return ''
  try {
    const candidate = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`
    const url = new URL(candidate)
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url.hostname)}&sz=64`
  } catch {
    return ''
  }
}

type BrandLike = {
  logo_url?: unknown
  marca_logo_url?: unknown
  site?: unknown
  marca_site?: unknown
}

export function getBrandImage(brand?: BrandLike | null): string {
  if (!brand) return ''
  const logo = asString(brand.logo_url ?? brand.marca_logo_url, '')
  if (logo) return logo
  return getFaviconUrl(asString(brand.site ?? brand.marca_site, ''))
}
