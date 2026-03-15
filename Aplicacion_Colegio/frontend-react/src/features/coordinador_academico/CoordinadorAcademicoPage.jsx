import { useEffect, useMemo, useState } from 'react';

import { apiClient } from '../../lib/apiClient';
import { hasCapability } from '../../lib/capabilities';

function resolveError(err, fallback) {
  return err?.payload?.error || err?.payload?.detail || fallback;
}

export default function CoordinadorAcademicoPage({ me }) {
  const [form, setForm] = useState({
    planificacion_id: '',
    estado: 'APROBADA',
    observaciones: '',
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const canApprove = useMemo(() => hasCapability(me, 'PLANNING_APPROVE') || hasCapability(me, 'SYSTEM_ADMIN'), [me]);

  useEffect(() => {
    let active = true;

    async function loadPlans() {
      setLoading(true);
      setError('');
      try {
        const payload = await apiClient.get('/api/coordinador/planificaciones/');
        if (active) {
          setPlans(Array.isArray(payload?.planificaciones) ? payload.planificaciones : []);
        }
      } catch (_) {
        if (active) {
          setPlans([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPlans();
    return () => {
      active = false;
    };
  }, []);

  function onChange(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (!canApprove) {
      setError('No tienes permisos para revisar planificaciones.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = await apiClient.post(`/api/coordinador/planificaciones/${form.planificacion_id}/estado/`, {
        estado: form.estado,
        observaciones: form.observaciones,
      });
      setMessage(payload?.message || 'Estado de planificacion actualizado.');
      setPlans((prev) => prev.filter((item) => String(item.id) !== String(form.planificacion_id)));
      setForm({ planificacion_id: '', estado: 'APROBADA', observaciones: '' });
    } catch (err) {
      setError(resolveError(err, 'No se pudo actualizar la planificacion.'));
    } finally {
      setSaving(false);
    }
  }

  async function quickUpdatePlan(planId, estado) {
    if (!canApprove) {
      setError('No tienes permisos para revisar planificaciones.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = await apiClient.post(`/api/coordinador/planificaciones/${planId}/estado/`, {
        estado,
        observaciones: '',
      });
      setMessage(payload?.message || 'Estado de planificacion actualizado.');
      setPlans((prev) => prev.filter((item) => String(item.id) !== String(planId)));
    } catch (err) {
      setError(resolveError(err, 'No se pudo actualizar la planificacion.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Coordinador Academico</h2>
          <p>Aprobacion/rechazo rapido de planificaciones por ID.</p>
        </div>
      </header>

      {error ? <div className="error-box">{error}</div> : null}
      {message ? <div className="card">{message}</div> : null}

      <form className="card form-grid" onSubmit={onSubmit}>
        <h3>Actualizar estado planificacion</h3>

        <label>
          Planificacion ID
          <input
            type="number"
            min="1"
            value={form.planificacion_id}
            onChange={(e) => onChange('planificacion_id', e.target.value)}
            disabled={!canApprove || saving}
            required
          />
        </label>

        <label>
          Estado
          <select value={form.estado} onChange={(e) => onChange('estado', e.target.value)} disabled={!canApprove || saving}>
            <option value="APROBADA">Aprobada</option>
            <option value="RECHAZADA">Rechazada</option>
          </select>
        </label>

        <label>
          Observaciones
          <textarea
            value={form.observaciones}
            onChange={(e) => onChange('observaciones', e.target.value)}
            disabled={!canApprove || saving}
          />
        </label>

        <div>
          <button type="submit" disabled={!canApprove || saving || !form.planificacion_id}>
            {saving ? 'Guardando...' : 'Actualizar'}
          </button>
        </div>
      </form>

      <article className="card">
        <h3>Planificaciones pendientes ({plans.length})</h3>
        {loading ? <p>Cargando planificaciones...</p> : null}
        {!loading && plans.length === 0 ? <p>Sin planificaciones pendientes.</p> : null}
        {plans.length > 0 ? (
          <ul>
            {plans.slice(0, 20).map((item) => (
              <li key={item.id}>
                <strong>#{item.id}</strong> {item.titulo} - {item.clase}
                <div>
                  <button type="button" disabled={!canApprove || saving} onClick={() => quickUpdatePlan(item.id, 'APROBADA')}>
                    Aprobar
                  </button>
                  <button type="button" disabled={!canApprove || saving} onClick={() => quickUpdatePlan(item.id, 'RECHAZADA')}>
                    Rechazar
                  </button>
                  <button
                    type="button"
                    disabled={!canApprove || saving}
                    onClick={() => setForm((prev) => ({ ...prev, planificacion_id: String(item.id) }))}
                  >
                    Usar en formulario
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </article>
    </section>
  );
}
