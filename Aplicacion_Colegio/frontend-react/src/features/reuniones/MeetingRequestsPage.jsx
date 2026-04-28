import { useEffect, useMemo, useState } from 'react';

import { apiClient } from '../../lib/apiClient';
import { hasCapability } from '../../lib/capabilities';

const STATES = ['pendiente', 'confirmada', 'reprogramada', 'rechazada', 'completada', 'cancelada'];
const TYPES = ['academica', 'conductual', 'orientacion', 'administrativa', 'general'];

export default function MeetingRequestsPage({ me }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ estado: '', tipo: '' });
  const [responseText, setResponseText] = useState({});
  const [newDate, setNewDate] = useState({});
  const [newTime, setNewTime] = useState({});

  const canView = useMemo(
    () => hasCapability(me, 'CLASS_VIEW') || hasCapability(me, 'SYSTEM_CONFIGURE') || hasCapability(me, 'SYSTEM_ADMIN'),
    [me],
  );

  const canRespond = useMemo(
    () => hasCapability(me, 'CLASS_VIEW') || hasCapability(me, 'SYSTEM_CONFIGURE') || hasCapability(me, 'SYSTEM_ADMIN'),
    [me],
  );

  async function loadRows() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filters.estado) params.set('estado', filters.estado);
      if (filters.tipo) params.set('tipo', filters.tipo);
      const payload = await apiClient.get(`/api/v1/reuniones/mis-reuniones/?${params.toString()}`);
      setRows(Array.isArray(payload?.reuniones) ? payload.reuniones : []);
    } catch (err) {
      setError(err.payload?.detail || 'No se pudieron cargar las reuniones.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canView) return;
    loadRows();
  }, [canView]);

  async function respond(row, action) {
    if (!canRespond) {
      setError('No tienes permisos para responder reuniones.');
      return;
    }

    const payload = {
      accion: action,
      respuesta_profesor: responseText[row.id] || '',
    };
    if (action === 'proponer_fecha') {
      payload.fecha_confirmada = newDate[row.id] || '';
      payload.hora_confirmada = newTime[row.id] || '';
      if (!payload.fecha_confirmada || !payload.hora_confirmada) {
        setError('Debes indicar fecha y hora para reprogramar.');
        return;
      }
    }

    setSavingId(row.id);
    setError('');
    try {
      await apiClient.post(`/api/v1/reuniones/${row.id}/responder/`, payload);
      await loadRows();
    } catch (err) {
      setError(err.payload?.detail || JSON.stringify(err.payload || {}) || 'No se pudo responder la reunion.');
    } finally {
      setSavingId(null);
    }
  }

  async function cancelMeeting(row) {
    if (!window.confirm(`Cancelar reunion #${row.id}?`)) {
      return;
    }

    setSavingId(row.id);
    setError('');
    try {
      await apiClient.post(`/api/v1/reuniones/${row.id}/cancelar/`, {
        motivo: responseText[row.id] || '',
      });
      await loadRows();
    } catch (err) {
      setError(err.payload?.detail || JSON.stringify(err.payload || {}) || 'No se pudo cancelar la reunion.');
    } finally {
      setSavingId(null);
    }
  }

  if (!canView) {
    return (
      <section>
        <header className="page-header">
          <div>
            <h2>Solicitudes de Reunion</h2>
            <p>No tienes permisos para ver esta bandeja.</p>
          </div>
        </header>
      </section>
    );
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Solicitudes de Reunion</h2>
          <p>Bandeja para revisar, responder y cancelar reuniones.</p>
        </div>
      </header>

      {error ? <div className="error-box">{error}</div> : null}

      <form
        className="card form-grid"
        onSubmit={(event) => {
          event.preventDefault();
          loadRows();
        }}
      >
        <h3 className="full">Filtros</h3>
        <label>
          Estado
          <select value={filters.estado} onChange={(e) => setFilters((prev) => ({ ...prev, estado: e.target.value }))}>
            <option value="">Todos</option>
            {STATES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Tipo
          <select value={filters.tipo} onChange={(e) => setFilters((prev) => ({ ...prev, tipo: e.target.value }))}>
            <option value="">Todos</option>
            {TYPES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <div className="actions">
          <button type="submit" className="secondary" disabled={loading}>Aplicar</button>
        </div>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Apoderado</th>
              <th>Profesor</th>
              <th>Motivo</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Fecha Propuesta</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.apoderado_nombre || '-'}</td>
                <td>{row.profesor_nombre || '-'}</td>
                <td>{row.motivo}</td>
                <td>{row.tipo}</td>
                <td>{row.estado_display || row.estado}</td>
                <td>{row.fecha_propuesta || '-'}</td>
                <td>
                  <div className="actions-cell actions-wrap">
                    <input
                      className="small"
                      placeholder="Respuesta"
                      value={responseText[row.id] || ''}
                      onChange={(e) => setResponseText((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    />
                    <input
                      className="small"
                      type="date"
                      value={newDate[row.id] || ''}
                      onChange={(e) => setNewDate((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    />
                    <input
                      className="small"
                      type="time"
                      value={newTime[row.id] || ''}
                      onChange={(e) => setNewTime((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="small secondary"
                      disabled={savingId === row.id}
                      onClick={() => respond(row, 'aceptar')}
                    >
                      Aceptar
                    </button>
                    <button
                      type="button"
                      className="small secondary"
                      disabled={savingId === row.id}
                      onClick={() => respond(row, 'proponer_fecha')}
                    >
                      Reprogramar
                    </button>
                    <button
                      type="button"
                      className="small danger"
                      disabled={savingId === row.id}
                      onClick={() => respond(row, 'rechazar')}
                    >
                      Rechazar
                    </button>
                    <button
                      type="button"
                      className="small"
                      disabled={savingId === row.id}
                      onClick={() => cancelMeeting(row)}
                    >
                      Cancelar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && !loading ? (
              <tr>
                <td colSpan={8}>Sin reuniones para los filtros seleccionados.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {loading ? <p>Cargando...</p> : null}
    </section>
  );
}
