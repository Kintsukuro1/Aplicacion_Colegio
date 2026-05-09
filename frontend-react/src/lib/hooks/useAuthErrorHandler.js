import { useCallback } from 'react'

/**
 * Hook para Manejo Centralizado de Errores de Autenticación
 * Mapea HTTP status codes a mensajes amigables para el usuario
 * 
 * Uso:
 * const { getErrorMessage, handleAuthError } = useAuthErrorHandler()
 */
export function useAuthErrorHandler() {
  const getErrorMessage = useCallback((error) => {
    // Error response from API
    if (error.response) {
      const status = error.response.status
      const data = error.response.data

      // Casos comunes
      switch (status) {
        case 400:
          if (data.detail) return data.detail
          if (data.username) return 'Usuario no válido'
          if (data.password) return 'Contraseña no válida'
          return 'Datos inválidos'

        case 401:
          return 'Credenciales inválidas'

        case 403:
          return 'No tiene permisos para acceder'

        case 404:
          return 'Usuario no encontrado'

        case 429:
          return 'Demasiados intentos. Intente más tarde'

        case 500:
          return 'Error del servidor. Intente más tarde'

        default:
          return data.detail || 'Error desconocido'
      }
    }

    // Network error
    if (error.message === 'Network Error') {
      return 'Error de conexión. Verifique su internet'
    }

    // Generic error
    return error.message || 'Ha ocurrido un error'
  }, [])

  const handleAuthError = useCallback((error, context = {}) => {
    const message = getErrorMessage(error)
    
    // Logging (opcional)
    console.error('Auth error:', {
      status: error.response?.status,
      message,
      context,
    })

    return message
  }, [getErrorMessage])

  return {
    getErrorMessage,
    handleAuthError,
  }
}
