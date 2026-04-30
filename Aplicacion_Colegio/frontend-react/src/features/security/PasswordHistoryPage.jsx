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

function PasswordHistoryLoadingState() {
  return (
    <article className="card section-card" aria-busy="true" aria-live="polite" role="status">
      <div className="section-card-head">
        <div>
          <div style={{ height: '12px', width: '140px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.18)', marginBottom: '0.75rem' }} />
          <div style={{ height: '26px', width: '240px', borderRadius: '12px', background: 'rgba(148, 163, 184, 0.14)' }} />
          <div style={{ height: '14px', width: '320px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.12)', marginTop: '0.9rem' }} />
        </div>
      </div>

      <div className="summary-grid" style={{ marginTop: '1.25rem' }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="summary-tile" style={{ minHeight: '100px', background: 'rgba(148, 163, 184, 0.08)' }}>
            <div style={{ height: '12px', width: '88px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.18)', marginBottom: '0.85rem' }} />
            <div style={{ height: '26px', width: index === 2 ? '84px' : '92px', borderRadius: '12px', background: 'rgba(148, 163, 184, 0.14)' }} />
          </div>
        ))}
      </div>

      <div className="table-wrap" style={{ marginTop: '1.25rem' }}>
        <div style={{ height: '18px', width: '200px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.18)', marginBottom: '1rem' }} />
        <div style={{ height: '200px', borderRadius: '16px', background: 'linear-gradient(90deg, rgba(148,163,184,0.08), rgba(148,163,184,0.14), rgba(148,163,184,0.08))' }} />
      </div>
    </article>
  );
}

export default function PasswordHistoryPage({ me }) {
  const [rows, setRows] = useState([]);
  const [auditRows, setAuditRows] = useState([]);
  const [periodDays, setPeriodDays] = useState('7');
  const [modelFilter, setModelFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [error, setError] = useState('');
  const [auditError, setAuditError] = useState('');

  const canView = useMemo(
    () => hasCapability(me, 'AUDIT_VIEW') || hasCapability(me, 'SYSTEM_ADMIN'),
    [me],
  );

  const summaryCards = useMemo(() => {
    return [
      {
        title: 'Historial',
        value: rows.length,
        subtitle: rows.length > 0 ? 'Cambios de contrasena registrados' : 'Sin historial visible',
      },
      {
        title: 'Auditoria',
        value: auditRows.length,
        subtitle: auditRows.length > 0 ? 'Eventos sensibles detectados' : 'Sin eventos sensibles',
      },
      {
        title: 'Ventana',
        value: `${periodDays} días`,
        subtitle: 'Periodo consultado para la auditoria',
      },
      {
        title: 'Filtro modelo',
        value: modelFilter.trim() || 'Todos',
        subtitle: 'Modelo utilizado en la consulta',
      },
    ];
  }, [auditRows.length, modelFilter, periodDays, rows.length]);

  async function loadRows() {
    setLoading(true);
    setError('');
    try {
      const payload = await apiClient.get('/api/v1/seguridad/password-history/');
      setRows(Array.isArray(payload?.entries) ? payload.entries : []);
    } catch (err) {
      setError(err.payload?.detail || 'No se pudo cargar el historial de contrasenas.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadSensitiveAudit() {
    setLoadingAudit(true);
    setAuditError('');
    try {
      const params = new URLSearchParams();
      if (periodDays) {
        params.set('dias', periodDays);
      }
      if (modelFilter.trim()) {
        params.set('modelo', modelFilter.trim());
      }
      const query = params.toString();
      const payload = await apiClient.get(`/api/v1/seguridad/auditoria-datos-sensibles/${query ? `?${query}` : ''}`);
      setAuditRows(Array.isArray(payload?.eventos) ? payload.eventos : []);
    } catch (err) {
      setAuditError(err.payload?.detail || 'No se pudo cargar la auditoria de datos sensibles.');
      setAuditRows([]);
    } finally {
      setLoadingAudit(false);
    }
  }

  useEffect(() => {
    if (!canView) return;
    loadRows();
    loadSensitiveAudit();
  }, [canView]);

  if (!canView) {
    return (
      <section>
        <header className="page-header">
          <div>
            <h2>Seguridad: Password History</h2>
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
          <h2>Seguridad: Password History</h2>
          <p>Auditoría de eventos de cambio de contraseña y accesos sensibles.</p>
        </div>
      </header>

      {error ? <div className="error-box">{error}</div> : null}

      {loading ? <PasswordHistoryLoadingState /> : null}

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

      {!loading && !error ? (
        <article className="card section-card">
          <div className="section-card-head">
            <div>
              <h3>Historial de contraseñas</h3>
              <p>Registro de cambios de credenciales y metadatos visibles para auditoría.</p>
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
                  <th>Fecha Registro</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.user_email}</td>
                    <td>{row.user_rol || '-'}</td>
                    <td>{row.colegio_rbd || '-'}</td>
                    <td>{row.created_at}</td>
                  </tr>
                ))}
                {!rows.length ? (
                  <tr>
                    <td colSpan={5}>No hay registros de historial para mostrar.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
      ) : null}

      <article className="card section-card">
        <h3>Auditoria de Datos Sensibles</h3>
        <div className="actions">
          <label>
            Dias
            <input
              type="number"
              min="1"
              max="90"
              value={periodDays}
              onChange={(e) => setPeriodDays(e.target.value)}
            />
          </label>
          <label>
            Modelo
            <input
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              placeholder="Ej: PerfilEstudiante"
            />
          </label>
          <button type="button" className="secondary" onClick={loadSensitiveAudit}>
            Aplicar
          </button>
        </div>

        {auditError ? <div className="error-box section-card">{auditError}</div> : null}
        {loadingAudit ? <p>Cargando auditoria...</p> : null}

        {!loadingAudit && !auditError && auditRows.length === 0 ? (
          <p className="section-muted">No hay accesos sensibles en el periodo consultado.</p>
        ) : null}

        <div className="table-wrap section-card">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Modelo</th>
                <th>Object ID</th>
                <th>IP</th>
                <th>Campos</th>
              </tr>
            </thead>
            <tbody>
              {auditRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.timestamp}</td>
                  <td>{row.usuario}</td>
                  <td>{row.rol || '-'}</td>
                  <td>{row.modelo || '-'}</td>
                  <td>{row.object_id || '-'}</td>
                  <td>{row.ip || '-'}</td>
                  <td>{Array.isArray(row.campos) && row.campos.length ? row.campos.join(', ') : '-'}</td>
                </tr>
              ))}
              {!auditRows.length && !loadingAudit ? (
                <tr>
                  <td colSpan={7}>No hay accesos sensibles para mostrar.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
