import { useCallback } from 'react'
import { getRefreshToken, setTokens, clearTokens } from '@/lib/authStore'
import { apiClient } from '@/lib/apiClient'

/**
 * Hook para Refresh Token Manual
 * Permite renovar el access token bajo demanda
 * 
 * Uso:
 * const { refresh, isLoading, error } = useRefreshToken()
 * await refresh()
 */
export function useRefreshToken() {
  const refreshAccessToken = useCallback(async () => {
    try {
      const refresh = getRefreshToken()
      if (!refresh) {
        throw new Error('No refresh token available')
      }

      const response = await apiClient.post('/api/v1/auth/token/refresh/', {
        refresh,
      })

      const { access } = response.data
      setTokens({
        access,
        refresh: response.data.refresh || refresh,
      })

      return {
        success: true,
        accessToken: access,
      }
    } catch (err) {
      clearTokens()
      return {
        success: false,
        error: err.response?.data?.detail || 'Token refresh failed',
      }
    }
  }, [])

  return {
    refresh: refreshAccessToken,
  }
}
