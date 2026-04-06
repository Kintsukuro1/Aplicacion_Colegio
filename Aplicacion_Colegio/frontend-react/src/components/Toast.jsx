import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Sistema de notificaciones toast minimalista.
 *
 * Uso:
 *   import { ToastProvider, useToast } from './Toast';
 *
 *   // En App root:
 *   <ToastProvider><App /></ToastProvider>
 *
 *   // En cualquier componente:
 *   const toast = useToast();
 *   toast.success('Guardado correctamente');
 *   toast.error('No se pudo eliminar');
 *   toast.info('Datos actualizados');
 */

import { createContext, useContext } from 'react';

const ToastContext = createContext(null);

let nextId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const api = useRef({
    success: (msg, ms) => add(msg, 'success', ms),
    error: (msg, ms) => add(msg, 'error', ms ?? 6000),
    info: (msg, ms) => add(msg, 'info', ms),
    warning: (msg, ms) => add(msg, 'warning', ms ?? 5000),
  });

  return (
    <ToastContext.Provider value={api.current}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span className="toast-icon">
              {t.type === 'success' && '✓'}
              {t.type === 'error' && '✕'}
              {t.type === 'info' && 'ℹ'}
              {t.type === 'warning' && '⚠'}
            </span>
            <span className="toast-message">{t.message}</span>
            <button
              type="button"
              className="toast-dismiss"
              onClick={() => dismiss(t.id)}
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback silencioso si se usa fuera del Provider
    return {
      success: () => {},
      error: () => {},
      info: () => {},
      warning: () => {},
    };
  }
  return ctx;
}
