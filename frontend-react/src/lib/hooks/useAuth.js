import { useCallback } from 'react'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { apiClient } from '@/lib/apiClient'

/**
 * Hook de Autenticación Completo
 * Proporciona: login, logout, isAuthenticated, user, error handling
 * 
 * Uso:
 * const { user, isAuthenticated, login, logout, isLoading, error } = useAuth()
 */
export function useAuth() {
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const setUser = useAuthStore((state) => state.setUser)
  const logout = useAuthStore((state) => state.logout)

  const login = useCallback(async (email, password) => {
    try {
      const response = await apiClient.post('/api/v1/auth/token/', {
        username: email, // Django Rest Framework usa 'username'
        password,
      })

      const { access, refresh } = response.data
      
      // Guardar tokens en localStorage y store
      localStorage.setItem('accessToken', access)
      localStorage.setItem('refreshToken', refresh)

      // Obtener datos del usuario
      const userResponse = await apiClient.get('/api/v1/me/')
      setUser(userResponse.data)

      return {
        success: true,
        user: userResponse.data,
      }
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.detail || 'Login failed',
      }
    }
  }, [setUser])

  const handleLogout = useCallback(() => {
    logout()
    localStorage.clear()
  }, [logout])

  return {
    user,
    isAuthenticated,
    login,
    logout: handleLogout,
  }
}
