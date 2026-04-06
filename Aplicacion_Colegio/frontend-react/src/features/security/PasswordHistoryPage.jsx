import { useEffect, useMemo, useState } from 'react';

import { apiClient } from '../../lib/apiClient';
import { hasCapability } from '../../lib/capabilities';

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
          <p>Auditoria de eventos de cambio de contrasena (sin exponer hashes).</p>
        </div>
      </header>

      {error ? <div className="error-box">{error}</div> : null}
      {loading ? <p>Cargando...</p> : null}

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
            {!rows.length && !loading ? (
              <tr>
                <td colSpan={5}>No hay registros de historial para mostrar.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <article className="card" style={{ marginTop: '0.8rem' }}>
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

        {auditError ? <div className="error-box" style={{ marginTop: '0.6rem' }}>{auditError}</div> : null}
        {loadingAudit ? <p>Cargando auditoria...</p> : null}

        <div className="table-wrap" style={{ marginTop: '0.6rem' }}>
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
