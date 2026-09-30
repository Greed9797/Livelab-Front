import { describe, expect, it } from 'vitest'
import { SEED_CUSTOS_PLANILHA } from '../data/seed-custos-planilha'
import { montarPayloadImportacao, totalMensalRecorrentes } from './importar-custos'

describe('importar-custos', () => {
  it('soma recorrentes sem erro de ponto flutuante', () => {
    expect(totalMensalRecorrentes([{ valor: 0.1, fim: null }, { valor: 0.2, fim: null }])).toBe(0.3)
  })

  it('ignora recorrentes já encerrados quando recebe a data de referência', () => {
    const itens = [{ valor: 100, fim: null }, { valor: 50, fim: '2026-08-31' }]
    expect(totalMensalRecorrentes(itens, '2026-09-15')).toBe(100)
    expect(totalMensalRecorrentes(itens)).toBe(150)
  })

  it('seed tem recorrentes e pontuais com campos obrigatórios', () => {
    expect(SEED_CUSTOS_PLANILHA.recorrentes.length).toBe(19)
    expect(SEED_CUSTOS_PLANILHA.pontuais.length).toBe(5)
    expect(totalMensalRecorrentes(SEED_CUSTOS_PLANILHA.recorrentes)).toBeGreaterThan(0)
  })

  it('monta payload com dry_run só quando pedido', () => {
    const seed = SEED_CUSTOS_PLANILHA
    const real = montarPayloadImportacao(seed)
    expect('dry_run' in real).toBe(false)
    expect(real.recorrentes).toEqual(seed.recorrentes)
    expect(real.pontuais).toEqual(seed.pontuais)
    expect(montarPayloadImportacao(seed, true).dry_run).toBe(true)
    expect('versao' in real).toBe(false)
  })
})
