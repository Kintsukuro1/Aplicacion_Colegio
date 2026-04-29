import { useEffect, useRef } from 'react';
import { useToast } from './Toast';

/**
 * UpdateListener
 *
 * Escucha mensajes de actualización del Service Worker y muestra notificaciones
 * al usuario cuando hay una nueva versión disponible.
 *
 * Se renderiza en App.jsx para tener acceso a useToast().
 */
export function UpdateListener() {
  const toast = useToast();
  const updatePromptRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const handleUpdateMessage = (event) => {
      if (event.data?.type === 'SW_UPDATE_AVAILABLE') {
        const version = event.data.version;
        console.log('[PWA] New version available:', version);

        // Store update info for potential reload
        updatePromptRef.current = {
          version,
          timestamp: Date.now(),
        };

        // Show toast notification with dismiss + reload options
        toast.info(`✨ Nueva versión disponible (${version}). Se recargará en 10 minutos.`, 0); // 0 = never auto-dismiss

        // Auto-reload after 10 minutes if user hasn't reloaded manually
        const reloadTimer = setTimeout(() => {
          if (updatePromptRef.current && Date.now() - updatePromptRef.current.timestamp > 600000) {
            console.log('[PWA] Auto-reloading to apply new version...');
            window.location.reload();
          }
        }, 600000);

        // Return cleanup
        return () => clearTimeout(reloadTimer);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleUpdateMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleUpdateMessage);
    };
  }, [toast]);

  return null; // This is just a listener, no UI rendered here
}
