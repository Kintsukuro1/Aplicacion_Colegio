import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { TenantProvider } from './lib/tenantContext';
import './styles.css';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      let updatePrompt = null;

      // Listen for SW update notifications
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SW_UPDATE_AVAILABLE') {
          console.log('[PWA] New version available:', event.data.version);
          
          // Simple non-intrusive notification: log + optional user action
          // In production, you could show a toast or banner here
          updatePrompt = {
            version: event.data.version,
            timestamp: Date.now(),
          };
          
          // Auto-reload after 10 minutes if user hasn't reloaded manually
          setTimeout(() => {
            if (updatePrompt && Date.now() - updatePrompt.timestamp > 600000) {
              console.log('[PWA] Auto-reloading to apply new version...');
              window.location.reload();
            }
          }, 600000);
        }
      });

      // When a new SW version is found, skip waiting and reload
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version ready — it will be activated on next page load/refresh
            console.log('[PWA] New version ready. Will activate on next load.');
          }
        });
      });
    }).catch((error) => {
      // Silent fallback: PWA should never block the app shell
      console.debug('[PWA] SW registration failed:', error);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TenantProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </TenantProvider>
  </React.StrictMode>
);
