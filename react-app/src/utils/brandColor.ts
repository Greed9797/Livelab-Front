// Cor por marca: manual (marcas.cor) > automática (hash determinístico) e
// extração de cor dominante do logo (usada no cadastro da marca).
import { corDaMarca } from '../components/conteudo/gradeUtils'

const HEX_RE = /^#[0-9a-fA-F]{6}$/

/**
 * Cor dominante de um buffer RGBA (pura, testável). Agrupa pixels cromáticos
 * por bucket de matiz (12 × 30°), ignorando alpha<128, quase-brancos,
 * quase-pretos e baixa saturação. Devolve o hex médio do bucket dominante,
 * ou null se <10% dos pixels forem cromáticos (logo mono/preto/branco).
 */
export function dominantColorFromPixels(data: Uint8ClampedArray): string | null {
  const total = Math.floor(data.length / 4)
  if (total === 0) return null
  const buckets = Array.from({ length: 12 }, () => ({ n: 0, r: 0, g: 0, b: 0 }))
  let chromatic = 0
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    if (data[i + 3] < 128) continue // transparente
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const lum = (max + min) / 2
    if (lum > 232 || lum < 24) continue // quase-branco / quase-preto
    const delta = max - min
    const sat = delta / (255 - Math.abs(2 * lum - 255))
    if (sat < 0.25) continue // acinzentado
    let hue = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4
    hue = (hue * 60 + 360) % 360
    const bucket = buckets[Math.floor(hue / 30) % 12]
    bucket.n += 1
    bucket.r += r
    bucket.g += g
    bucket.b += b
    chromatic += 1
  }
  if (chromatic < total * 0.1) return null
  const top = buckets.reduce((a, b) => (b.n > a.n ? b : a))
  const toHex = (sum: number) => Math.round(sum / top.n).toString(16).padStart(2, '0')
  return `#${toHex(top.r)}${toHex(top.g)}${toHex(top.b)}`
}

/**
 * Extrai a cor dominante do logo em `url`. Qualquer erro (CORS, canvas
 * tainted, 404) resolve null — chamador cai na cor automática.
 */
export function extractBrandColor(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onerror = () => resolve(null)
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 32
        canvas.height = 32
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(null)
        ctx.drawImage(img, 0, 0, 32, 32)
        resolve(dominantColorFromPixels(ctx.getImageData(0, 0, 32, 32).data))
      } catch {
        resolve(null)
      }
    }
    img.src = url
  })
}

/** Cor de texto legível sobre `hex`, por luminância relativa (WCAG). */
export function textColorOn(hex: string): '#0b0b0b' | '#ffffff' {
  const channel = (offset: number) => {
    const c = parseInt(hex.slice(offset, offset + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const lum = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
  // 0.179 = ponto onde contraste com branco e com preto empatam
  return lum > 0.179 ? '#0b0b0b' : '#ffffff'
}

/** Cor da marca: hex manual válido, senão a cor determinística por hash. */
export function resolveMarcaCor(cor: unknown, marcaId: string): string {
  return typeof cor === 'string' && HEX_RE.test(cor) ? cor : corDaMarca(marcaId).solid
}
