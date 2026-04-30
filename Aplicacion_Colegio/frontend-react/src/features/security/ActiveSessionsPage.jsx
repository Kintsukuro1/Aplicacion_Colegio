import { useEffect, useMemo, useState } from 'react';

import { apiClient } from '../../lib/apiClient';
import { hasCapability } from '../../lib/capabilities';

function formatDisplay(value) {
  if (value === null || value === undefined || value === '') {
    return '0';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return String(value);
}

function ActiveSessionsLoadingState() {
  return (
    <article className="card section-card" aria-busy="true" aria-live="polite" role="status">
      <div className="section-card-head">
        <div>
          <div style={{ height: '12px', width: '126px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.18)', marginBottom: '0.75rem' }} />
          <div style={{ height: '26px', width: '240px', borderRadius: '12px', background: 'rgba(148, 163, 184, 0.14)' }} />
          <div style={{ height: '14px', width: '320px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.12)', marginTop: '0.9rem' }} />
        </div>
      </div>

      <div className="summary-grid" style={{ marginTop: '1.25rem' }}>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="summary-tile" style={{ minHeight: '100px', background: 'rgba(148, 163, 184, 0.08)' }}>
            <div style={{ height: '12px', width: '88px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.18)', marginBottom: '0.85rem' }} />
            <div style={{ height: '26px', width: index === 0 ? '72px' : '92px', borderRadius: '12px', background: 'rgba(148, 163, 184, 0.14)' }} />
          </div>
        ))}
      </div>

      <div className="table-wrap" style={{ marginTop: '1.25rem' }}>
        <div style={{ height: '18px', width: '200px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.18)', marginBottom: '1rem' }} />
        <div style={{ height: '220px', borderRadius: '16px', background: 'linear-gradient(90deg, rgba(148,163,184,0.08), rgba(148,163,184,0.14), rgba(148,163,184,0.08))' }} />
      </div>
    </article>
  );
}

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

  const summaryCards = useMemo(() => {
    const sessionCount = rows.length;
    const blockedCount = dashboard?.ips_bloqueadas ?? 0;
    const failedCount = dashboard?.intentos_fallidos_24h ?? 0;
    const sensitiveAccessCount = dashboard?.accesos_datos_sensibles_24h ?? 0;

    return [
      {
        title: 'Sesiones activas',
        value: sessionCount,
        subtitle: sessionCount > 0 ? 'Usuarios con sesión vigente' : 'Sin sesiones visibles',
      },
      {
        title: 'IPs bloqueadas',
        value: blockedCount,
        subtitle: 'Direcciones con restricción activa',
      },
      {
        title: 'Fallos 24h',
        value: failedCount,
        subtitle: 'Intentos fallidos recientes',
      },
      {
        title: 'Accesos sensibles',
        value: sensitiveAccessCount,
        subtitle: 'Eventos de acceso auditados',
      },
    ];
  }, [dashboard, rows.length]);

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
          <p>Monitoreo y revocación remota por usuario y por IP bloqueada.</p>
        </div>
      </header>

      {error ? <div className="error-box">{error}</div> : null}
      {message ? <div className="info-box">{message}</div> : null}

      {loading ? <ActiveSessionsLoadingState /> : null}

      {!loading && !error ? (
        <div className="summary-grid">
          {summaryCards.map((item) => (
            <article key={item.title} className="summary-tile">
              <small>{item.title}</small>
              <strong>{formatDisplay(item.value)}</strong>
              <span>{item.subtitle}</span>
            </article>
          ))}
        </div>
      ) : null}

      {!loading && !error && dashboard ? (
        <div className="summary-grid section-card">
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
        <article className="card section-card">
          <h3>IPs bloqueadas</h3>
          {dashboard.ips_bloqueadas_lista.length ? (
            <ul>
              {dashboard.ips_bloqueadas_lista.map((ip) => (
                <li key={ip} className="blocked-ip-item">
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

      {!loading && !error ? (
        <article className="card section-card">
          <div className="section-card-head">
            <div>
              <h3>Tabla de sesiones</h3>
              <p>Sesiones activas detectadas para el usuario y el colegio actual.</p>
            </div>
          </div>

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
                {!rows.length ? (
                  <tr>
                    <td colSpan={8}>No hay sesiones activas para mostrar.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
      ) : null}
    </section>
  );
}
