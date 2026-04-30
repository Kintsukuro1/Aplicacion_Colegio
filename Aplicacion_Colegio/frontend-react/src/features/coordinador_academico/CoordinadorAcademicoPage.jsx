import { useEffect, useMemo, useState } from 'react';

import { apiClient } from '../../lib/apiClient';
import { hasCapability } from '../../lib/capabilities';

function resolveError(err, fallback) {
  return err?.payload?.error || err?.payload?.detail || fallback;
}

function formatDisplay(value) {
  if (value === true) {
    return 'Si';
  }
  if (value === false) {
    return 'No';
  }
  return value;
}

function CoordinadorAcademicoLoadingState() {
  return (
    <article className="card section-card" aria-busy="true" aria-live="polite" role="status">
      <div className="section-card-head">
        <div>
          <div style={{ height: '18px', width: '220px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.18)', marginBottom: '0.5rem' }} />
          <div style={{ height: '14px', width: '280px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.12)' }} />
        </div>
      </div>

      <div className="summary-grid" style={{ marginTop: '1.25rem' }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="summary-tile" style={{ minHeight: '96px', background: 'rgba(148, 163, 184, 0.08)' }}>
            <div style={{ height: '12px', width: '84px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.18)', marginBottom: '0.85rem' }} />
            <div style={{ height: '24px', width: index === 0 ? '70px' : '94px', borderRadius: '12px', background: 'rgba(148, 163, 184, 0.14)' }} />
          </div>
        ))}
      </div>

      <div className="table-wrap" style={{ marginTop: '1.25rem' }}>
        <div style={{ height: '18px', width: '180px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.18)', marginBottom: '1rem' }} />
        <div style={{ height: '220px', borderRadius: '16px', background: 'linear-gradient(90deg, rgba(148,163,184,0.08), rgba(148,163,184,0.14), rgba(148,163,184,0.08))' }} />
      </div>
    </article>
  );
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

  const summaryCards = useMemo(
    () => [
      {
        title: 'Planes visibles',
        value: plans.length,
        subtitle: plans.length > 0 ? 'Pendientes en memoria local' : 'Sin planes cargados',
      },
      {
        title: 'Puede revisar',
        value: canApprove,
        subtitle: 'Habilitado por capability',
      },
      {
        title: 'Carga inicial',
        value: loading ? 'Activa' : 'Lista',
        subtitle: 'Estado del listado remoto',
      },
      {
        title: 'Siguiente lote',
        value: plans.length > 20 ? `${plans.length - 20}+` : '0',
        subtitle: 'Elementos fuera del primer corte',
      },
    ],
    [canApprove, loading, plans.length]
  );

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

      {loading ? <CoordinadorAcademicoLoadingState /> : null}
      {error ? <div className="error-box">{error}</div> : null}
      {message ? <div className="card">{message}</div> : null}

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

      <article className="card section-card">
        <h3>Planificaciones pendientes ({plans.length})</h3>
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
