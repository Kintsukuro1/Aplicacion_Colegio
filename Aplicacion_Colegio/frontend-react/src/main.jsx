import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { TenantProvider } from './lib/tenantContext';
import './styles.css';

// Register Service Worker for PWA support
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((error) => {
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
