import { useEffect, useMemo, useState } from 'react';

import { apiClient } from '../../lib/apiClient';
import { hasCapability } from '../../lib/capabilities';

const EMPTY_FORM = {
  estudiante_id: '',
  tipo: 'NEUTRA',
  categoria: 'OTRO',
  descripcion: '',
  gravedad: 1,
};

function resolveError(err, fallback) {
  return err?.payload?.error || err?.payload?.detail || fallback;
}

function InspectorConvivenciaLoadingState() {
  return (
    <article className="card section-card" aria-busy="true" aria-live="polite" role="status">
      <div style={{ height: '18px', width: '220px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.18)', marginBottom: '0.75rem' }} />
      <div style={{ height: '14px', width: '280px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.12)' }} />

      <div className="summary-grid" style={{ marginTop: '1.25rem' }}>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="summary-tile" style={{ minHeight: '96px', background: 'rgba(148, 163, 184, 0.08)' }}>
            <div style={{ height: '12px', width: '88px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.18)', marginBottom: '0.85rem' }} />
            <div style={{ height: '24px', width: index === 0 ? '74px' : '92px', borderRadius: '12px', background: 'rgba(148, 163, 184, 0.14)' }} />
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginTop: '1.25rem' }}>
        <div className="card section-card" style={{ minHeight: '220px', background: 'rgba(148, 163, 184, 0.06)' }} />
        <div className="card section-card" style={{ minHeight: '220px', background: 'rgba(148, 163, 184, 0.06)' }} />
      </div>
    </article>
  );
}

export default function InspectorConvivenciaPage({ me }) {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [justifications, setJustifications] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [reviewForm, setReviewForm] = useState({ justificativo_id: '', estado: 'APROBADO', observaciones: '' });
  const [delayForm, setDelayForm] = useState({ estudiante_id: '', clase_id: '', fecha: '', observaciones: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [delaySaving, setDelaySaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const canCreate = useMemo(() => hasCapability(me, 'DISCIPLINE_CREATE') || hasCapability(me, 'SYSTEM_ADMIN'), [me]);
  const canReview = useMemo(
    () => hasCapability(me, 'JUSTIFICATION_APPROVE') || hasCapability(me, 'SYSTEM_ADMIN'),
    [me]
  );

  const summaryCards = useMemo(
    () => [
      {
        title: 'Estudiantes cargados',
        value: students.length,
        subtitle: students.length > 0 ? 'Disponibles para anotaciones' : 'Sin estudiantes cargados',
      },
      {
        title: 'Clases disponibles',
        value: classes.length,
        subtitle: classes.length > 0 ? 'Usables para registrar atrasos' : 'Sin clases para seleccionar',
      },
      {
        title: 'Justificativos pendientes',
        value: justifications.length,
        subtitle: justifications.length > 0 ? 'Requieren revisión' : 'Sin pendientes por revisar',
      },
    ],
    [classes.length, justifications.length, students.length]
  );

  useEffect(() => {
    let active = true;

    async function loadStudentsAndClasses() {
      setLoading(true);
      setError('');
      try {
        const [studentsPayload, classesPayload, justificationsPayload] = await Promise.all([
          apiClient.get('/api/inspector/estudiantes/'),
          apiClient.get('/api/v1/profesor/clases/').catch(() => ({ results: [] })),
          apiClient.get('/api/inspector/justificativos/').catch(() => ({ justificativos: [] })),
        ]);
        if (active) {
          setStudents(Array.isArray(studentsPayload?.estudiantes) ? studentsPayload.estudiantes : []);
          const classRows = Array.isArray(classesPayload?.results)
            ? classesPayload.results
            : Array.isArray(classesPayload)
              ? classesPayload
              : [];
          setClasses(classRows);
          setJustifications(Array.isArray(justificationsPayload?.justificativos) ? justificationsPayload.justificativos : []);
        }
      } catch (err) {
        if (active) {
          setError(resolveError(err, 'No se pudo cargar estudiantes.'));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadStudentsAndClasses();
    return () => {
      active = false;
    };
  }, []);

  function onChange(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (!canCreate) {
      setError('No tienes permisos para registrar anotaciones.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = await apiClient.post('/api/inspector/anotaciones/crear/', {
        estudiante_id: Number(form.estudiante_id),
        tipo: form.tipo,
        categoria: form.categoria,
        descripcion: form.descripcion,
        gravedad: Number(form.gravedad),
      });
      setMessage(payload?.message || 'Anotacion registrada.');
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(resolveError(err, 'No se pudo registrar la anotacion.'));
    } finally {
      setSaving(false);
    }
  }

  async function onReviewSubmit(event) {
    event.preventDefault();
    if (!canReview) {
      setError('No tienes permisos para revisar justificativos.');
      return;
    }

    setReviewSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = await apiClient.post(
        `/api/inspector/justificativos/${reviewForm.justificativo_id}/estado/`,
        {
          estado: reviewForm.estado,
          observaciones: reviewForm.observaciones,
        }
      );
      setMessage(payload?.message || 'Justificativo actualizado.');
      setJustifications((prev) => prev.filter((item) => String(item.id) !== String(reviewForm.justificativo_id)));
      setReviewForm({ justificativo_id: '', estado: 'APROBADO', observaciones: '' });
    } catch (err) {
      setError(resolveError(err, 'No se pudo actualizar el justificativo.'));
    } finally {
      setReviewSaving(false);
    }
  }

  async function onQuickReview(justificativoId, estado) {
    if (!canReview) {
      setError('No tienes permisos para revisar justificativos.');
      return;
    }

    setReviewSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = await apiClient.post(`/api/inspector/justificativos/${justificativoId}/estado/`, {
        estado,
        observaciones: '',
      });
      setMessage(payload?.message || 'Justificativo actualizado.');
      setJustifications((prev) => prev.filter((item) => String(item.id) !== String(justificativoId)));
    } catch (err) {
      setError(resolveError(err, 'No se pudo actualizar el justificativo.'));
    } finally {
      setReviewSaving(false);
    }
  }

  async function onDelaySubmit(event) {
    event.preventDefault();
    if (!canCreate) {
      setError('No tienes permisos para registrar atrasos.');
      return;
    }

    setDelaySaving(true);
    setError('');
    setMessage('');
    try {
      const payload = await apiClient.post('/api/inspector/asistencia/registrar_atraso/', {
        estudiante_id: Number(delayForm.estudiante_id),
        clase_id: Number(delayForm.clase_id),
        fecha: delayForm.fecha,
        observaciones: delayForm.observaciones,
      });
      setMessage(payload?.message || 'Atraso registrado.');
      setDelayForm({ estudiante_id: '', clase_id: '', fecha: '', observaciones: '' });
    } catch (err) {
      setError(resolveError(err, 'No se pudo registrar el atraso.'));
    } finally {
      setDelaySaving(false);
    }
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Inspector Convivencia</h2>
          <p>Registro rapido de anotaciones sobre estudiantes.</p>
        </div>
      </header>

      {loading ? <InspectorConvivenciaLoadingState /> : null}
      {error ? <div className="error-box">{error}</div> : null}
      {message ? <div className="card">{message}</div> : null}

      {!loading && !error ? (
        <div className="summary-grid">
          {summaryCards.map((item) => (
            <article key={item.title} className="summary-tile">
              <small>{item.title}</small>
              <strong>{item.value}</strong>
              <span>{item.subtitle}</span>
            </article>
          ))}
        </div>
      ) : null}

      <div className="grid-2">
        <form className="card form-grid" onSubmit={onSubmit}>
          <h3>Nueva anotacion</h3>

        <label>
          Estudiante
          <select
            value={form.estudiante_id}
            onChange={(e) => onChange('estudiante_id', e.target.value)}
            disabled={!canCreate || saving}
            required
          >
            <option value="">Selecciona estudiante</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.nombre_completo || student.nombre || `Estudiante #${student.id}`}
              </option>
            ))}
          </select>
        </label>

        <label>
          Tipo
          <select value={form.tipo} onChange={(e) => onChange('tipo', e.target.value)} disabled={!canCreate || saving}>
            <option value="POSITIVA">Positiva</option>
            <option value="NEUTRA">Neutra</option>
            <option value="NEGATIVA">Negativa</option>
          </select>
        </label>

        <label>
          Categoria
          <input
            value={form.categoria}
            onChange={(e) => onChange('categoria', e.target.value)}
            disabled={!canCreate || saving}
          />
        </label>

        <label>
          Gravedad
          <input
            type="number"
            min="1"
            max="5"
            value={form.gravedad}
            onChange={(e) => onChange('gravedad', e.target.value)}
            disabled={!canCreate || saving}
          />
        </label>

        <label>
          Descripcion
          <textarea
            value={form.descripcion}
            onChange={(e) => onChange('descripcion', e.target.value)}
            disabled={!canCreate || saving}
            required
          />
        </label>

          <div>
            <button type="submit" disabled={!canCreate || saving || !form.estudiante_id || !form.descripcion}>
              {saving ? 'Guardando...' : 'Registrar anotacion'}
            </button>
          </div>
        </form>

        <form className="card form-grid" onSubmit={onReviewSubmit}>
          <h3>Revisar justificativo</h3>

          <label>
            Justificativo ID
            <input
              type="number"
              min="1"
              value={reviewForm.justificativo_id}
              onChange={(e) => setReviewForm((prev) => ({ ...prev, justificativo_id: e.target.value }))}
              disabled={!canReview || reviewSaving}
              required
            />
          </label>

          <label>
            Estado
            <select
              value={reviewForm.estado}
              onChange={(e) => setReviewForm((prev) => ({ ...prev, estado: e.target.value }))}
              disabled={!canReview || reviewSaving}
            >
              <option value="APROBADO">Aprobado</option>
              <option value="RECHAZADO">Rechazado</option>
            </select>
          </label>

          <label>
            Observaciones
            <textarea
              value={reviewForm.observaciones}
              onChange={(e) => setReviewForm((prev) => ({ ...prev, observaciones: e.target.value }))}
              disabled={!canReview || reviewSaving}
            />
          </label>

          <div>
            <button type="submit" disabled={!canReview || reviewSaving || !reviewForm.justificativo_id}>
              {reviewSaving ? 'Guardando...' : 'Actualizar justificativo'}
            </button>
          </div>
        </form>
      </div>

      <article className="card section-card">
        <h3>Justificativos pendientes ({justifications.length})</h3>
        {justifications.length === 0 ? <p>Sin justificativos pendientes.</p> : null}
        {justifications.length > 0 ? (
          <ul>
            {justifications.slice(0, 15).map((item) => (
              <li key={item.id}>
                <strong>#{item.id}</strong> {item.estudiante} - {item.fecha_ausencia}
                <div>
                  <button
                    type="button"
                    disabled={!canReview || reviewSaving}
                    onClick={() => onQuickReview(item.id, 'APROBADO')}
                  >
                    Aprobar
                  </button>
                  <button
                    type="button"
                    disabled={!canReview || reviewSaving}
                    onClick={() => onQuickReview(item.id, 'RECHAZADO')}
                  >
                    Rechazar
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewForm((prev) => ({ ...prev, justificativo_id: String(item.id) }))}
                    disabled={!canReview || reviewSaving}
                  >
                    Usar en formulario
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </article>

      <form className="card form-grid" onSubmit={onDelaySubmit}>
        <h3>Registrar atraso</h3>

        <label>
          Estudiante
          <select
            value={delayForm.estudiante_id}
            onChange={(e) => setDelayForm((prev) => ({ ...prev, estudiante_id: e.target.value }))}
            disabled={!canCreate || delaySaving}
            required
          >
            <option value="">Selecciona estudiante</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.nombre_completo || student.nombre || `Estudiante #${student.id}`}
              </option>
            ))}
          </select>
        </label>

        <label>
          Clase
          <select
            value={delayForm.clase_id}
            onChange={(e) => setDelayForm((prev) => ({ ...prev, clase_id: e.target.value }))}
            disabled={!canCreate || delaySaving}
            required
          >
            <option value="">Selecciona clase</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nombre || item.asignatura || `Clase #${item.id}`}
              </option>
            ))}
          </select>
        </label>

        <label>
          Fecha
          <input
            type="date"
            value={delayForm.fecha}
            onChange={(e) => setDelayForm((prev) => ({ ...prev, fecha: e.target.value }))}
            disabled={!canCreate || delaySaving}
            required
          />
        </label>

        <label>
          Observaciones
          <textarea
            value={delayForm.observaciones}
            onChange={(e) => setDelayForm((prev) => ({ ...prev, observaciones: e.target.value }))}
            disabled={!canCreate || delaySaving}
          />
        </label>

        <div>
          <button
            type="submit"
            disabled={!canCreate || delaySaving || !delayForm.estudiante_id || !delayForm.clase_id || !delayForm.fecha}
          >
            {delaySaving ? 'Guardando...' : 'Registrar atraso'}
          </button>
        </div>
      </form>
    </section>
  );
}
