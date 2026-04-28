import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { TenantProvider } from './lib/tenantContext';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TenantProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </TenantProvider>
  </React.StrictMode>
);
