import { describe, expect, it } from 'vitest'
import { dominantColorFromPixels, resolveMarcaCor, textColorOn } from './brandColor'
import { corDaMarca } from '../components/conteudo/gradeUtils'

/** Monta um buffer RGBA a partir de [r,g,b,a] repetidos. */
function pixels(...px: Array<[number, number, number, number]>): Uint8ClampedArray {
  return new Uint8ClampedArray(px.flat())
}

function fill(count: number, px: [number, number, number, number]) {
  return Array.from({ length: count }, () => px)
}

describe('dominantColorFromPixels', () => {
  it('devolve azul para logo azul', () => {
    const data = pixels(...fill(20, [25, 113, 194, 255]))
    expect(dominantColorFromPixels(data)).toBe('#1971c2')
  })

  it('devolve null para logo preto/branco (sem pixels cromáticos)', () => {
    const data = pixels(...fill(10, [0, 0, 0, 255]), ...fill(10, [255, 255, 255, 255]))
    expect(dominantColorFromPixels(data)).toBeNull()
  })

  it('devolve null quando <10% dos pixels são cromáticos', () => {
    const data = pixels(...fill(95, [255, 255, 255, 255]), ...fill(5, [200, 30, 30, 255]))
    expect(dominantColorFromPixels(data)).toBeNull()
  })

  it('ignora pixels transparentes e acha a cor do restante', () => {
    const data = pixels(...fill(10, [200, 30, 30, 0]), ...fill(10, [25, 113, 194, 255]))
    expect(dominantColorFromPixels(data)).toBe('#1971c2')
  })

  it('escolhe o bucket dominante em logo bicolor', () => {
    const data = pixels(...fill(15, [25, 113, 194, 255]), ...fill(5, [200, 30, 30, 255]))
    expect(dominantColorFromPixels(data)).toBe('#1971c2')
  })
})

describe('textColorOn', () => {
  it('texto escuro sobre cores claras', () => {
    expect(textColorOn('#ffd43b')).toBe('#0b0b0b')
    expect(textColorOn('#ffffff')).toBe('#0b0b0b')
  })

  it('texto branco sobre cores escuras', () => {
    expect(textColorOn('#1971c2')).toBe('#ffffff')
    expect(textColorOn('#000000')).toBe('#ffffff')
  })
})

describe('resolveMarcaCor', () => {
  it('usa a cor manual quando é hex válido', () => {
    expect(resolveMarcaCor('#123abc', 'marca-1')).toBe('#123abc')
  })

  it('cai na cor determinística quando cor é null/undefined/inválida', () => {
    const fallback = corDaMarca('marca-1').solid
    expect(resolveMarcaCor(null, 'marca-1')).toBe(fallback)
    expect(resolveMarcaCor(undefined, 'marca-1')).toBe(fallback)
    expect(resolveMarcaCor('azul', 'marca-1')).toBe(fallback)
  })
})
