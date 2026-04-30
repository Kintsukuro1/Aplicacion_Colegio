import { useEffect, useMemo, useState } from 'react';

import { apiClient } from '../../lib/apiClient';
import { hasCapability } from '../../lib/capabilities';
import { asResults } from '../../lib/httpHelpers';

const EMPTY_FORM = {
  evaluacion: '',
  estudiante: '',
  nota: '',
};

function formatNumber(value) {
  if (value === null || value === undefined || value === '') {
    return '0';
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return String(value);
  }

  return numericValue.toFixed(1).replace(/\.0$/, '');
}

function TeacherGradesLoadingState() {
  return (
    <article className="card section-card" aria-busy="true" aria-live="polite" role="status">
      <div className="section-card-head">
        <div>
          <div style={{ height: '12px', width: '112px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.18)', marginBottom: '0.75rem' }} />
          <div style={{ height: '26px', width: '220px', borderRadius: '12px', background: 'rgba(148, 163, 184, 0.14)' }} />
          <div style={{ height: '14px', width: '300px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.12)', marginTop: '0.9rem' }} />
        </div>
      </div>

      <div className="summary-grid" style={{ marginTop: '1.25rem' }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="summary-tile" style={{ minHeight: '100px', background: 'rgba(148, 163, 184, 0.08)' }}>
            <div style={{ height: '12px', width: '88px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.18)', marginBottom: '0.85rem' }} />
            <div style={{ height: '26px', width: index === 0 ? '72px' : '92px', borderRadius: '12px', background: 'rgba(148, 163, 184, 0.14)' }} />
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

export default function TeacherGradesPage({ me }) {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canCreate = hasCapability(me, 'GRADE_CREATE');
  const canEdit = hasCapability(me, 'GRADE_EDIT');
  const canDelete = hasCapability(me, 'GRADE_DELETE');
  const formLocked = editingId ? !canEdit : !canCreate;

  const summary = useMemo(() => {
    const totalGrades = rows.length;
    const totalEvaluations = evaluations.length;
    const totalStudents = students.length;
    const averageGrade = totalGrades
      ? rows.reduce((sum, row) => sum + Number(row.nota || 0), 0) / totalGrades
      : 0;

    return [
      {
        title: 'Calificaciones',
        value: totalGrades,
        subtitle: totalGrades > 0 ? 'Registros cargados para la evaluación' : 'Sin calificaciones todavía',
      },
      {
        title: 'Evaluaciones',
        value: totalEvaluations,
        subtitle: totalEvaluations > 0 ? 'Disponibles para la clase seleccionada' : 'No hay evaluaciones cargadas',
      },
      {
        title: 'Estudiantes',
        value: totalStudents,
        subtitle: totalStudents > 0 ? 'Listado base para registrar notas' : 'No hay estudiantes cargados',
      },
      {
        title: 'Promedio',
        value: averageGrade,
        subtitle: totalGrades > 0 ? 'Promedio actual de la lista' : 'Sin promedio calculado',
      },
    ];
  }, [evaluations.length, rows, students.length]);

  const canSubmit = useMemo(() => {
    const canSaveCurrentAction = editingId ? canEdit : canCreate;
    return canSaveCurrentAction && Boolean(form.evaluacion && form.estudiante && form.nota);
  }, [canCreate, canEdit, editingId, form]);

  async function loadBaseData() {
    const [classPayload, studentPayload] = await Promise.all([
      apiClient.get('/api/v1/profesor/clases/'),
      apiClient.get('/api/v1/estudiantes/'),
    ]);

    const classRows = asResults(classPayload);
    setClasses(classRows);
    setStudents(asResults(studentPayload));

    if (!selectedClass && classRows.length) {
      setSelectedClass(String(classRows[0].id));
    }
  }

  async function loadEvaluationsAndGrades() {
    if (!selectedClass) {
      setEvaluations([]);
      setRows([]);
      return;
    }

    const evaluationPayload = await apiClient.get(`/api/v1/profesor/evaluaciones/?clase_id=${selectedClass}`);
    const evalRows = asResults(evaluationPayload);
    setEvaluations(evalRows);

    const currentEvalId = form.evaluacion;
    const nextEvalId = evalRows.find((row) => String(row.id_evaluacion) === currentEvalId)
      ? currentEvalId
      : (evalRows[0] ? String(evalRows[0].id_evaluacion) : '');

    if (nextEvalId !== currentEvalId) {
      setForm((prev) => ({ ...prev, evaluacion: nextEvalId }));
    }

    if (nextEvalId) {
      const gradePayload = await apiClient.get(`/api/v1/profesor/calificaciones/?evaluacion_id=${nextEvalId}`);
      setRows(asResults(gradePayload));
    } else {
      setRows([]);
    }
  }

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      setLoading(true);
      setError('');
      try {
        await loadBaseData();
      } catch (err) {
        if (active) {
          setError(err.payload?.detail || 'No se pudo cargar contexto de calificaciones.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        await loadEvaluationsAndGrades();
      } catch (err) {
        if (active) {
          setError(err.payload?.detail || 'No se pudo cargar evaluaciones/calificaciones.');
        }
      }
    }
    refresh();
    return () => {
      active = false;
    };
  }, [selectedClass, form.evaluacion]);

  function onChange(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function startEdit(row) {
    if (!canEdit) {
      setError('No tienes permisos para editar calificaciones.');
      return;
    }
    setEditingId(row.id_calificacion);
    setForm({
      evaluacion: String(row.evaluacion),
      estudiante: String(row.estudiante),
      nota: String(row.nota),
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm((prev) => ({
      ...EMPTY_FORM,
      evaluacion: prev.evaluacion || (evaluations[0] ? String(evaluations[0].id_evaluacion) : ''),
    }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (formLocked) {
      setError(editingId ? 'No tienes permisos para editar calificaciones.' : 'No tienes permisos para crear calificaciones.');
      return;
    }
    if (!canSubmit) {
      return;
    }

    setSaving(true);
    setError('');
    const payload = {
      evaluacion: Number(form.evaluacion),
      estudiante: Number(form.estudiante),
      nota: form.nota,
    };

    try {
      if (editingId) {
        await apiClient.patch(`/api/v1/profesor/calificaciones/${editingId}/`, payload);
      } else {
        await apiClient.post('/api/v1/profesor/calificaciones/', payload);
      }
      const gradePayload = await apiClient.get(`/api/v1/profesor/calificaciones/?evaluacion_id=${form.evaluacion}`);
      setRows(asResults(gradePayload));
      resetForm();
    } catch (err) {
      setError(err.payload?.detail || JSON.stringify(err.payload || {}) || 'No se pudo guardar calificacion.');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id) {
    if (!canDelete) {
      setError('No tienes permisos para eliminar calificaciones.');
      return;
    }
    if (!window.confirm('Eliminar esta calificacion?')) {
      return;
    }
    try {
      await apiClient.del(`/api/v1/profesor/calificaciones/${id}/`);
      const gradePayload = await apiClient.get(`/api/v1/profesor/calificaciones/?evaluacion_id=${form.evaluacion}`);
      setRows(asResults(gradePayload));
    } catch (err) {
      setError(err.payload?.detail || 'No se pudo eliminar calificacion.');
    }
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Profesor: Calificaciones</h2>
          <p>Registro de calificaciones con filtro por clase, evaluación y permisos por acción.</p>
        </div>
      </header>

      {loading ? <TeacherGradesLoadingState /> : null}
      {error ? <div className="error-box">{error}</div> : null}
      {!canCreate ? <p>Modo restringido: falta capability `GRADE_CREATE` para crear.</p> : null}

      {!loading && !error ? (
        <div className="summary-grid">
          {summary.map((item) => (
            <article key={item.title} className="summary-tile">
              <small>{item.title}</small>
              <strong>{formatNumber(item.value)}</strong>
              <span>{item.subtitle}</span>
            </article>
          ))}
        </div>
      ) : null}

      <div className="card form-grid">
        <h3>Filtro</h3>
        <label>
          Clase
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
            <option value="">Seleccionar</option>
            {classes.map((row) => (
              <option key={row.id} value={row.id}>
                {row.curso_nombre} - {row.asignatura_nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      <form className="card form-grid" onSubmit={onSubmit}>
        <h3>{editingId ? `Editar #${editingId}` : 'Nueva Calificacion'}</h3>

        <label>
          Evaluacion
          <select value={form.evaluacion} onChange={(e) => onChange('evaluacion', e.target.value)} required disabled={formLocked}>
            <option value="">Seleccionar</option>
            {evaluations.map((row) => (
              <option key={row.id_evaluacion} value={row.id_evaluacion}>
                {row.nombre} ({row.fecha_evaluacion})
              </option>
            ))}
          </select>
        </label>

        <label>
          Estudiante
          <select value={form.estudiante} onChange={(e) => onChange('estudiante', e.target.value)} required disabled={formLocked}>
            <option value="">Seleccionar</option>
            {students.map((row) => (
              <option key={row.id} value={row.id}>
                {row.nombre} {row.apellido_paterno}
              </option>
            ))}
          </select>
        </label>

        <label>
          Nota
          <input value={form.nota} onChange={(e) => onChange('nota', e.target.value)} required disabled={formLocked} />
        </label>

        <div className="actions full">
          <button type="submit" disabled={!canSubmit || saving}>
            {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
          </button>
          {editingId ? (
            <button type="button" className="secondary" onClick={resetForm}>
              Cancelar Edicion
            </button>
          ) : null}
        </div>
      </form>

      {!loading && !error ? (
        <article className="card section-card">
          <div className="section-card-head">
            <div>
              <h3>Listado de Calificaciones</h3>
              <p>Selecciona una fila para editar o eliminar según tus permisos.</p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Estudiante</th>
                  <th>Nota</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id_calificacion}>
                    <td>{row.id_calificacion}</td>
                    <td>{row.estudiante_nombre}</td>
                    <td>{formatNumber(row.nota)}</td>
                    <td>{row.fecha_creacion}</td>
                    <td className="actions-cell">
                      {canEdit ? (
                        <button type="button" className="small" onClick={() => startEdit(row)}>
                          Editar
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button type="button" className="small danger" onClick={() => onDelete(row.id_calificacion)}>
                          Eliminar
                        </button>
                      ) : null}
                      {!canEdit && !canDelete ? <span>Solo lectura</span> : null}
                    </td>
                  </tr>
                ))}
                {!loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan="5">Sin registros</td>
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
