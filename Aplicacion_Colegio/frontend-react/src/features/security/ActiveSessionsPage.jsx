import { useEffect, useMemo, useState } from 'react';

import { apiClient } from '../../lib/apiClient';
import { hasCapability } from '../../lib/capabilities';

export default function ActiveSessionsPage({ me }) {
  const [rows, setRows] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const canView = useMemo(
    () => hasCapability(me, 'AUDIT_VIEW') || hasCapability(me, 'SYSTEM_ADMIN'),
    [me],
  );

  async function loadRows() {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const [sessionsPayload, dashboardPayload] = await Promise.all([
        apiClient.get('/api/v1/seguridad/sesiones-activas/'),
        apiClient.get('/api/v1/seguridad/dashboard/'),
      ]);
      setRows(Array.isArray(sessionsPayload?.sesiones) ? sessionsPayload.sesiones : []);
      setDashboard(dashboardPayload || null);
    } catch (err) {
      setError(err.payload?.detail || 'No se pudieron cargar las sesiones activas.');
      setRows([]);
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }

  async function revokeSession(row) {
    if (!window.confirm(`Revocar sesion #${row.id} de ${row.user_email}?`)) {
      return;
    }
    setError('');
    try {
      await apiClient.post(`/api/v1/seguridad/sesiones/${row.id}/revocar/`, {});
      setMessage(`Sesion #${row.id} revocada correctamente.`);
      await loadRows();
    } catch (err) {
      setError(err.payload?.detail || 'No se pudo revocar la sesion.');
    }
  }

  async function unblockIp(ip) {
    if (!window.confirm(`Desbloquear IP ${ip}?`)) {
      return;
    }
    setError('');
    setMessage('');
    try {
      const payload = await apiClient.post('/api/v1/seguridad/desbloquear-ip/', { ip });
      setMessage(payload?.detail || `IP ${ip} desbloqueada.`);
      await loadRows();
    } catch (err) {
      setError(err.payload?.detail || 'No se pudo desbloquear la IP.');
    }
  }

  useEffect(() => {
    if (!canView) return;
    loadRows();
  }, [canView]);

  if (!canView) {
    return (
      <section>
        <header className="page-header">
          <div>
            <h2>Seguridad: Sesiones Activas</h2>
            <p>No tienes permisos para ver esta pagina.</p>
          </div>
        </header>
      </section>
    );
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Seguridad: Sesiones Activas</h2>
          <p>Monitoreo y revocacion remota por usuario.</p>
        </div>
      </header>

      {error ? <div className="error-box">{error}</div> : null}
      {message ? <div className="info-box">{message}</div> : null}
      {loading ? <p>Cargando...</p> : null}

      {!loading && !error && dashboard ? (
        <div className="summary-grid" style={{ marginBottom: '0.8rem' }}>
          <div className="summary-tile">
            <small>Colegio</small>
            <strong>{dashboard.colegio || '-'}</strong>
          </div>
          <div className="summary-tile">
            <small>Intentos fallidos 24h</small>
            <strong>{dashboard.intentos_fallidos_24h ?? 0}</strong>
          </div>
          <div className="summary-tile">
            <small>IPs bloqueadas</small>
            <strong>{dashboard.ips_bloqueadas ?? 0}</strong>
          </div>
          <div className="summary-tile">
            <small>Sesiones activas</small>
            <strong>{dashboard.sesiones_activas ?? 0}</strong>
          </div>
          <div className="summary-tile">
            <small>Accesos datos sensibles 24h</small>
            <strong>{dashboard.accesos_datos_sensibles_24h ?? 0}</strong>
          </div>
        </div>
      ) : null}

      {!loading && !error && dashboard && Array.isArray(dashboard.ips_bloqueadas_lista) ? (
        <article className="card" style={{ marginBottom: '0.8rem' }}>
          <h3>IPs bloqueadas</h3>
          {dashboard.ips_bloqueadas_lista.length ? (
            <ul>
              {dashboard.ips_bloqueadas_lista.map((ip) => (
                <li key={ip} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span>{ip}</span>
                  <button type="button" className="small secondary" onClick={() => unblockIp(ip)}>
                    Desbloquear
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>Sin IPs bloqueadas.</p>
          )}
        </article>
      ) : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Usuario</th>
              <th>Rol</th>
              <th>RBD</th>
              <th>IP</th>
              <th>Dispositivo</th>
              <th>Ultima Actividad</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.user_email}</td>
                <td>{row.user_rol || '-'}</td>
                <td>{row.colegio_rbd || '-'}</td>
                <td>{row.ip}</td>
                <td>{row.dispositivo}</td>
                <td>{row.ultima_actividad}</td>
                <td className="actions-cell">
                  <button type="button" className="small danger" onClick={() => revokeSession(row)}>
                    Revocar
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && !loading ? (
              <tr>
                <td colSpan={8}>No hay sesiones activas para mostrar.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
