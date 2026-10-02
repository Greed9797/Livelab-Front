import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'
import { extractErrorMessage } from './api'

function makeAxiosError(
  status: number,
  data: unknown,
  baseURL: string,
): AxiosError {
  const config = { baseURL, url: '/auth/login' } as InternalAxiosRequestConfig
  return new AxiosError(
    'Request failed with status code ' + status,
    AxiosError.ERR_BAD_RESPONSE,
    config,
    {},
    {
      status,
      statusText: 'Error',
      data,
      headers: {},
      config,
    },
  )
}

describe('extractErrorMessage', () => {
  it('avoids generic server-down text for suspended legacy API host', () => {
    const error = makeAxiosError(
      503,
      '<html>Service Suspended</html>',
      'https://api.grupolivelab.com.br/v1',
    )
    const message = extractErrorMessage(error)
    expect(message).not.toBe('O servidor está indisponível no momento.')
    expect(message).toMatch(/api\.grupolivelab\.com\.br/i)
  })

  it('keeps generic message for Railway internal errors', () => {
    const error = makeAxiosError(
      500,
      { message: 'Erro interno do servidor' },
      'https://liveshop-saas-api-production.up.railway.app/v1',
    )
    expect(extractErrorMessage(error)).toBe('O servidor está indisponível no momento.')
  })
})
