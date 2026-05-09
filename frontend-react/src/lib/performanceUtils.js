/**
 * Utilidades de Optimización de Performance
 * Ayudantes para useMemo, useCallback, React.memo
 */

/**
 * Detecta cambios en array de dependencias
 * Útil para debugging de useMemo/useCallback
 * 
 * Uso:
 * const deps = [user, filter]
 * useEffect(() => {
 *   console.log(detectDepsChange(deps))
 * }, deps)
 */
export function detectDepsChange(deps, prevDeps) {
  if (!prevDeps) return 'Initial'
  
  for (let i = 0; i < deps.length; i++) {
    if (deps[i] !== prevDeps[i]) {
      return `Dep ${i} changed`
    }
  }
  return 'No change'
}

/**
 * Crea función memoizada con logging
 * Para development/debugging
 */
export function createMemoizedFunction(fn, deps, name = 'memoFunc') {
  let memoizedResult = null
  let memoizedDeps = null

  return {
    execute(...args) {
      const depsChanged = !memoizedDeps || 
        !deps.every((d, i) => d === memoizedDeps[i])

      if (depsChanged) {
        console.log(`[${name}] Re-computing (deps changed)`)
        memoizedResult = fn(...args)
        memoizedDeps = deps
      } else {
        console.log(`[${name}] Using cached result`)
      }

      return memoizedResult
    }
  }
}

/**
 * Performance monitoring utilities
 */
export const performanceUtils = {
  /**
   * Mide tiempo de ejecución de una función
   */
  measure(name, fn) {
    const start = performance.now()
    const result = fn()
    const duration = performance.now() - start
    
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`)
    return result
  },

  /**
   * Mide tiempo en async function
   */
  async measureAsync(name, fn) {
    const start = performance.now()
    const result = await fn()
    const duration = performance.now() - start
    
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`)
    return result
  },

  /**
   * Obtiene memoria usada (si available)
   */
  getMemoryUsage() {
    if (!performance.memory) {
      console.warn('performance.memory not available')
      return null
    }
    
    return {
      usedJSHeapSize: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
      totalJSHeapSize: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
      jsHeapSizeLimit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB',
    }
  },

  /**
   * Obtiene Core Web Vitals
   */
  getCoreWebVitals() {
    return {
      FCP: window.performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
      LCP: window.performance.getEntriesByName('largest-contentful-paint')[0]?.startTime,
      CLS: 0, // Requiere PerformanceObserver
      FID: 0, // Requiere PerformanceObserver
    }
  }
}

/**
 * Hook para monitoreo de re-renders (development only)
 */
export function useRenderCount(componentName) {
  const renderCountRef = require('react').useRef(0)

  require('react').useEffect(() => {
    renderCountRef.current++
    console.log(`[${componentName}] Render #${renderCountRef.current}`)
  })

  return renderCountRef.current
}
