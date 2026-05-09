/**
 * EJEMPLO: Integración Completa de Fase 6 (JWT) + Fase 7 (Performance)
 * 
 * Este archivo demuestra:
 * 1. Cómo usar los hooks de autenticación
 * 2. Cómo implementar lazy loading de rutas
 * 3. Cómo usar image optimization
 * 4. Cómo medir performance
 */

import React, { lazy, Suspense, useMemo, useCallback } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRefreshToken } from '@/lib/hooks/useRefreshToken'
import { useAuthErrorHandler } from '@/lib/hooks/useAuthErrorHandler'
import { LazyRouteWrapper } from '@/components/LazyRouteWrapper'
import { OptimizedImage } from '@/lib/imageOptimization'
import { performanceUtils } from '@/lib/performanceUtils'

// ============================================
// EJEMPLO 1: Usar useAuth para Login/Logout
// ============================================
export function AuthExample() {
  const { user, isAuthenticated, login, logout } = useAuth()
  const { handleAuthError } = useAuthErrorHandler()

  const handleLogin = useCallback(async (e) => {
    e.preventDefault()
    const email = e.target.email.value
    const password = e.target.password.value

    try {
      const result = await login(email, password)
      if (result.success) {
        alert('¡Login exitoso!')
      }
    } catch (err) {
      const message = handleAuthError(err)
      alert(message)
    }
  }, [login, handleAuthError])

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>Bienvenido, {user?.name}</p>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <form onSubmit={handleLogin}>
          <input type="email" name="email" placeholder="Email" />
          <input type="password" name="password" placeholder="Password" />
          <button type="submit">Login</button>
        </form>
      )}
    </div>
  )
}

// ============================================
// EJEMPLO 2: Lazy Loading Routes
// ============================================
const AdminPage = lazy(() => import('@/pages/AdminPage'))
const ReportsPage = lazy(() => import('@/pages/ReportsPage'))

export function AppWithLazyRoutes() {
  return (
    <div>
      <LazyRouteWrapper>
        <AdminPage />
      </LazyRouteWrapper>
    </div>
  )
}

// ============================================
// EJEMPLO 3: Image Optimization
// ============================================
export function ImageOptimizationExample({ students }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {students.map((student) => (
        <div key={student.id}>
          <OptimizedImage
            src={student.photoUrl}
            alt={student.name}
            sizes="(max-width: 640px) 100vw, 25vw"
            className="w-full h-auto rounded-lg"
          />
          <p className="mt-2">{student.name}</p>
        </div>
      ))}
    </div>
  )
}

// ============================================
// EJEMPLO 4: Memoization en Listas
// ============================================
function StudentRow({ student, onDelete }) {
  // Este componente está memoizado
  // Solo se re-renderiza si student o onDelete cambian
  return (
    <tr>
      <td>{student.name}</td>
      <td>{student.email}</td>
      <td>
        <button onClick={() => onDelete(student.id)}>Delete</button>
      </td>
    </tr>
  )
}

const StudentRowMemo = React.memo(StudentRow)

export function StudentTableWithMemoization({ students, filter }) {
  // useMemo evita re-filtrar en cada render
  const filtered = useMemo(() => {
    console.log('Filtering students...')
    return students.filter((s) =>
      s.name.toLowerCase().includes(filter.toLowerCase())
    )
  }, [students, filter])

  // useCallback evita crear nueva función en cada render
  const handleDelete = useCallback((id) => {
    console.log(`Deleting student ${id}`)
    // API call aquí
  }, [])

  return (
    <table>
      <tbody>
        {filtered.map((student) => (
          <StudentRowMemo
            key={student.id}
            student={student}
            onDelete={handleDelete}
          />
        ))}
      </tbody>
    </table>
  )
}

// ============================================
// EJEMPLO 5: Performance Monitoring
// ============================================
export function PerformanceMonitoringExample() {
  React.useEffect(() => {
    // Mide Core Web Vitals
    const vitals = performanceUtils.getCoreWebVitals()
    console.log('Core Web Vitals:', vitals)

    // Mide memoria
    const memory = performanceUtils.getMemoryUsage()
    console.log('Memory:', memory)

    // Mide tiempo de operación
    const result = performanceUtils.measure('Data fetch', () => {
      // Simula operación costosa
      return Array.from({ length: 1000000 }, (_, i) => i)
    })
  }, [])

  return (
    <div>
      <p>Abre DevTools Console para ver mediciones</p>
    </div>
  )
}

// ============================================
// EJEMPLO 6: Refresh Token Manual
// ============================================
export function ManualRefreshExample() {
  const { refresh } = useRefreshToken()

  const handleRefresh = useCallback(async () => {
    const result = await refresh()
    if (result.success) {
      console.log('Token refreshed:', result.accessToken)
    } else {
      console.error('Refresh failed:', result.error)
    }
  }, [refresh])

  return (
    <button onClick={handleRefresh}>
      Refresh Token
    </button>
  )
}

// ============================================
// RESUMEN
// ============================================
/*
 * FASE 6 - IMPLEMENTADO:
 * ✅ useAuth() - Login/logout completo
 * ✅ useRefreshToken() - Refresh manual
 * ✅ useAuthErrorHandler() - Error handling centralizado
 * ✅ JWT interceptors - En apiClient.js
 * ✅ ProtectedRoute - En components
 *
 * FASE 7 - IMPLEMENTADO:
 * ✅ LazyRouteWrapper - Suspense boundaries
 * ✅ OptimizedImage - Lazy loading + responsive
 * ✅ useMemo & useCallback - En ejemplos
 * ✅ Performance utilities - Medición y monitoring
 *
 * PRÓXIMOS PASOS:
 * 1. Copia estos ejemplos a tu App.jsx
 * 2. Refactoriza rutas pesadas con lazy()
 * 3. Aplica memoización en tablas grandes
 * 4. Usa OptimizedImage en galerías
 * 5. Ejecuta webpack-bundle-analyzer para validar
 */
