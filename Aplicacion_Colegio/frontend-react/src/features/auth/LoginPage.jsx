import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { apiClient } from '../../lib/apiClient';
import { setTokens } from '../../lib/authStore';
import { useTenant } from '../../lib/tenantContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tenant } = useTenant();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });

  const emailError = useMemo(() => {
    if (!touched.email) {
      return '';
    }

    const value = email.trim();
    if (!value) {
      return 'Ingresa tu correo institucional.';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Ingresa un correo válido.';
    }

    return '';
  }, [email, touched.email]);

  const passwordError = useMemo(() => {
    if (!touched.password) {
      return '';
    }

    if (!password.trim()) {
      return 'Ingresa tu contraseña.';
    }

    return '';
  }, [password, touched.password]);

  const canSubmit = Boolean(!loading && !emailError && !passwordError && email.trim() && password.trim());

  function getRedirectTarget() {
    const fromPath = location.state?.from?.pathname;
    return fromPath && fromPath !== '/login' ? fromPath : '/dashboard';
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError('');

    setTouched({ email: true, password: true });

    if (!email.trim() || !password.trim()) {
      return;
    }

    if (emailError || passwordError) {
      return;
    }

    setLoading(true);

    try {
      const payload = await apiClient.post('/api/v1/auth/token/', { email: email.trim().toLowerCase(), password });
      setTokens({ access: payload.access, refresh: payload.refresh });
      navigate(getRedirectTarget(), { replace: true });
    } catch (err) {
      setError(err.payload?.detail || 'No se pudo iniciar sesion.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit} noValidate>
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
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            onBlur={() => setTouched((current) => ({ ...current, email: true }))}
            required
            autoComplete="username"
            placeholder="correo@ejemplo.cl"
            aria-invalid={Boolean(emailError || error)}
            aria-describedby={emailError ? 'login-email-error' : undefined}
          />
          {emailError ? <small id="login-email-error" className="field-error">{emailError}</small> : null}
        </label>

        <label>
          Contrasena
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            onBlur={() => setTouched((current) => ({ ...current, password: true }))}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            aria-invalid={Boolean(passwordError || error)}
            aria-describedby={passwordError ? 'login-password-error' : undefined}
          />
          {passwordError ? <small id="login-password-error" className="field-error">{passwordError}</small> : null}
        </label>

        {error ? <div className="error-box">{error}</div> : null}

        <button type="submit" disabled={!canSubmit} aria-busy={loading}>
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
