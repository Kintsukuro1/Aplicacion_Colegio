/**
 * TESTS UNITARIOS - FASE 6: JWT Authentication
 * 
 * Tests para:
 * - useAuth hook
 * - useRefreshToken hook
 * - useAuthErrorHandler hook
 * - Token management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRefreshToken } from '@/lib/hooks/useRefreshToken'
import { useAuthErrorHandler } from '@/lib/hooks/useAuthErrorHandler'

// ============================================
// MOCK API CLIENT
// ============================================
vi.mock('@/lib/apiClient', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  }
}))

vi.mock('@/lib/authStore', () => ({
  getAccessToken: vi.fn(() => 'mock-access-token'),
  getRefreshToken: vi.fn(() => 'mock-refresh-token'),
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
}))

// ============================================
// TEST: useAuth Hook
// ============================================
describe('useAuth Hook', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('debería retornar estado inicial no autenticado', () => {
    const { result } = renderHook(() => useAuth())
    
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('debería hacer login exitoso', async () => {
    const { apiClient } = await import('@/lib/apiClient')
    apiClient.post.mockResolvedValue({
      data: {
        access: 'new-access-token',
        refresh: 'new-refresh-token',
      }
    })
    apiClient.get.mockResolvedValue({
      data: { id: 1, name: 'John', email: 'john@example.com' }
    })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      const response = await result.current.login('john@example.com', 'password123')
      expect(response.success).toBe(true)
      expect(response.user.name).toBe('John')
    })
  })

  it('debería manejar error de login', async () => {
    const { apiClient } = await import('@/lib/apiClient')
    apiClient.post.mockRejectedValue({
      response: {
        data: { detail: 'Invalid credentials' }
      }
    })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      const response = await result.current.login('invalid@example.com', 'wrong')
      expect(response.success).toBe(false)
      expect(response.error).toBe('Invalid credentials')
    })
  })

  it('debería hacer logout y limpiar localStorage', async () => {
    localStorage.setItem('accessToken', 'token')
    const { result } = renderHook(() => useAuth())

    act(() => {
      result.current.logout()
    })

    expect(localStorage.getItem('accessToken')).toBeNull()
  })
})

// ============================================
// TEST: useRefreshToken Hook
// ============================================
describe('useRefreshToken Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería refrescar token exitosamente', async () => {
    const { apiClient } = await import('@/lib/apiClient')
    const { setTokens } = await import('@/lib/authStore')
    
    apiClient.post.mockResolvedValue({
      data: {
        access: 'new-access-token',
        refresh: 'new-refresh-token',
      }
    })

    const { result } = renderHook(() => useRefreshToken())

    let refreshResult
    await act(async () => {
      refreshResult = await result.current.refresh()
    })

    expect(refreshResult.success).toBe(true)
    expect(refreshResult.accessToken).toBe('new-access-token')
    expect(setTokens).toHaveBeenCalled()
  })

  it('debería manejar error de refresh', async () => {
    const { apiClient } = await import('@/lib/apiClient')
    const { clearTokens } = await import('@/lib/authStore')
    
    apiClient.post.mockRejectedValue({
      response: {
        data: { detail: 'Invalid refresh token' }
      }
    })

    const { result } = renderHook(() => useRefreshToken())

    let refreshResult
    await act(async () => {
      refreshResult = await result.current.refresh()
    })

    expect(refreshResult.success).toBe(false)
    expect(clearTokens).toHaveBeenCalled()
  })
})

// ============================================
// TEST: useAuthErrorHandler Hook
// ============================================
describe('useAuthErrorHandler Hook', () => {
  it('debería mapear error 401 a mensaje legible', () => {
    const { result } = renderHook(() => useAuthErrorHandler())

    const error = {
      response: { status: 401, data: {} }
    }

    const message = result.current.getErrorMessage(error)
    expect(message).toBe('Credenciales inválidas')
  })

  it('debería mapear error 403 a mensaje legible', () => {
    const { result } = renderHook(() => useAuthErrorHandler())

    const error = {
      response: { status: 403, data: {} }
    }

    const message = result.current.getErrorMessage(error)
    expect(message).toBe('No tiene permisos para acceder')
  })

  it('debería mapear error 400 a mensaje específico', () => {
    const { result } = renderHook(() => useAuthErrorHandler())

    const error = {
      response: {
        status: 400,
        data: { password: 'Invalid password' }
      }
    }

    const message = result.current.getErrorMessage(error)
    expect(message).toBe('Contraseña no válida')
  })

  it('debería manejar error de red', () => {
    const { result } = renderHook(() => useAuthErrorHandler())

    const error = { message: 'Network Error' }
    const message = result.current.getErrorMessage(error)
    expect(message).toBe('Error de conexión. Verifique su internet')
  })
})

// ============================================
// RESUMEN DE TESTS
// ============================================
/*
 * EJECUTAR:
 * npm run test -- auth.test.js
 *
 * COBERTURA ESPERADA:
 * ✅ Login flow
 * ✅ Token refresh
 * ✅ Error handling
 * ✅ Logout y limpieza
 * ✅ Mapeo de errores HTTP
 *
 * TODOS DEBEN PASAR: ✓
 */
