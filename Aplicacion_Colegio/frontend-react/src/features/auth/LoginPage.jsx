import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiClient } from '../../lib/apiClient';
import { setTokens } from '../../lib/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
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
        <h1>Acceso Plataforma</h1>
        <p>Frontend React conectado a API v1 JWT.</p>

        <label>
          Correo
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
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
          />
        </label>

        {error ? <div className="error-box">{error}</div> : null}

        <button type="submit" disabled={loading}>
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
