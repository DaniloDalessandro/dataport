import { describe, it, expect, beforeEach, vi } from 'vitest'
import { apiGet, apiPost, apiDelete } from '../api'
import * as auth from '../auth'

// Mock do módulo auth
vi.mock('../auth', () => ({
  getAccessToken: vi.fn(),
  refreshAccessToken: vi.fn(),
  logout: vi.fn(),
  isTokenExpired: vi.fn(),
}))

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(global.fetch).mockClear()
  })

  describe('apiGet', () => {
    it('deve fazer requisição GET com token de autenticação', async () => {
      vi.mocked(auth.getAccessToken).mockReturnValue('mock-token')
      vi.mocked(auth.isTokenExpired).mockReturnValue(false)
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
      } as Response)

      const result = await apiGet('/test-endpoint')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test-endpoint'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
          }),
        })
      )

      expect(result).toEqual({ data: 'test' })
    })

    it('deve lançar erro quando resposta não é ok', async () => {
      vi.mocked(auth.getAccessToken).mockReturnValue('mock-token')
      vi.mocked(auth.isTokenExpired).mockReturnValue(false)
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Test error' }),
      } as Response)

      await expect(apiGet('/test-endpoint')).rejects.toThrow('Test error')
    })
  })

  describe('apiPost', () => {
    it('deve fazer requisição POST com dados', async () => {
      vi.mocked(auth.getAccessToken).mockReturnValue('mock-token')
      vi.mocked(auth.isTokenExpired).mockReturnValue(false)
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)

      const testData = { name: 'Test' }
      const result = await apiPost('/test-endpoint', testData)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test-endpoint'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(testData),
        })
      )

      expect(result).toEqual({ success: true })
    })
  })

  describe('apiDelete', () => {
    it('deve fazer requisição DELETE', async () => {
      vi.mocked(auth.getAccessToken).mockReturnValue('mock-token')
      vi.mocked(auth.isTokenExpired).mockReturnValue(false)
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)

      const result = await apiDelete('/test-endpoint/1')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test-endpoint/1'),
        expect.objectContaining({
          method: 'DELETE',
        })
      )

      expect(result).toEqual({ success: true })
    })
  })

  describe('Token Refresh', () => {
    it('deve atualizar token quando receber 401', async () => {
      vi.mocked(auth.getAccessToken)
        .mockReturnValueOnce('old-token')
        .mockReturnValueOnce('new-token')
      vi.mocked(auth.isTokenExpired).mockReturnValue(false)
      vi.mocked(auth.refreshAccessToken).mockResolvedValueOnce('new-token')

      // Primeira chamada retorna 401
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({}),
        } as Response)
        // Segunda chamada (após refresh) retorna sucesso
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'success' }),
        } as Response)

      const result = await apiGet('/test-endpoint')

      expect(auth.refreshAccessToken).toHaveBeenCalled()
      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ data: 'success' })
    })
  })
})
