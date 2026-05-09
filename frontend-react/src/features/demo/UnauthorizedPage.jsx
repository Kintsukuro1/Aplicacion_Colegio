import React from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Página 403 - Acceso Denegado
 * Se muestra cuando usuario está autenticado pero no tiene permisos
 */
export function UnauthorizedPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center px-4">
        <div className="text-6xl font-bold text-red-600 mb-4">403</div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Acceso Denegado
        </h1>
        
        <p className="text-xl text-gray-600 mb-8">
          No tienes permisos para acceder a este recurso
        </p>

        <div className="space-y-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Ir al Dashboard
          </button>

          <button
            onClick={() => navigate(-1)}
            className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition"
          >
            Volver Atrás
          </button>
        </div>

        <p className="text-gray-500 text-sm mt-8">
          Si crees que esto es un error, contacta al administrador
        </p>
      </div>
    </div>
  )
}
