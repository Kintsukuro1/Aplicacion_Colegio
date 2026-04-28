import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiClient } from '../../lib/apiClient';
import { setTokens } from '../../lib/authStore';
import { useTenant } from '../../lib/tenantContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = await apiClient.post('/api/v1/auth/token/', { email, password });
      setTokens({ access: payload.access, refresh: payload.refresh });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.payload?.detail || 'No se pudo iniciar sesion.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="auth-logo">
          {tenant?.logo ? (
            <img src={tenant.logo} alt={`Logo ${tenant.nombre}`} className="tenant-logo" />
          ) : (
            <span className="auth-logo-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </span>
          )}
          <span className="brand-text">{tenant?.nombre || 'Colegio SaaS'}</span>
        </div>

        <h1>Acceso Plataforma</h1>
        <p>Ingresa tus credenciales para acceder al sistema de gestión.</p>

        <label>
          Correo
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
            placeholder="correo@ejemplo.cl"
          />
        </label>

        <label>
          Contrasena
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </label>

        {error ? <div className="error-box">{error}</div> : null}

        <button type="submit" disabled={loading}>
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>

        <div className="register-link">
          ¿Eres un colegio nuevo?{' '}
          <a href="/register">Registra tu institución</a>
        </div>
      </form>
    </div>
  );
}
