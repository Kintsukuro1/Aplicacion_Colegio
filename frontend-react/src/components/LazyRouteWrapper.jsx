import React, { Suspense } from 'react'

/**
 * Componente Reutilizable para Lazy Loading de Rutas
 * Proporciona Suspense boundary con fallback profesional
 * 
 * Uso:
 * <LazyRouteWrapper>
 *   <AdminPage />
 * </LazyRouteWrapper>
 */
function SkeletonPage() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      <div className="p-6 space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function LazyRouteWrapper({ children, fallback = null }) {
  return (
    <Suspense fallback={fallback || <SkeletonPage />}>
      {children}
    </Suspense>
  )
}
