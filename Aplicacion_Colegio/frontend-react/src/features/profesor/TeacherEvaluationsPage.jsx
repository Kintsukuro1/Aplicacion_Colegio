import { useEffect, useMemo, useState } from 'react';

import { apiClient } from '../../lib/apiClient';
import { hasCapability } from '../../lib/capabilities';
import { asResults } from '../../lib/httpHelpers';

const EMPTY_FORM = {
  clase: '',
  nombre: '',
  fecha_evaluacion: '',
  ponderacion: '100.00',
  tipo_evaluacion: 'sumativa',
  periodo: '',
};

function formatNumber(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return String(value);
  }

  return numericValue.toFixed(1).replace(/\.0$/, '');
}

function TeacherEvaluationsLoadingState() {
  return (
    <article className="card section-card" aria-busy="true" aria-live="polite" role="status">
      <div className="section-card-head">
        <div>
          <div style={{ height: '12px', width: '120px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.18)', marginBottom: '0.75rem' }} />
          <div style={{ height: '26px', width: '220px', borderRadius: '12px', background: 'rgba(148, 163, 184, 0.14)' }} />
          <div style={{ height: '14px', width: '280px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.12)', marginTop: '0.9rem' }} />
        </div>
      </div>

      <div className="summary-grid" style={{ marginTop: '1.25rem' }}>
        {Array.from({ length: 3 }).map((_, index) => (
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

export default function TeacherEvaluationsPage({ me }) {
  const [classes, setClasses] = useState([]);
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
    const totalEvaluations = rows.length;
    const classCount = classes.length;
    const editableCount = canEdit ? totalEvaluations : 0;
    const deletableCount = canDelete ? totalEvaluations : 0;

    return [
      {
        title: 'Evaluaciones',
        value: totalEvaluations,
        subtitle: totalEvaluations > 0 ? 'Registradas para la clase seleccionada' : 'Sin evaluaciones todavía',
      },
      {
        title: 'Clases disponibles',
        value: classCount,
        subtitle: classCount > 0 ? 'Puedes filtrar por curso' : 'No hay clases cargadas',
      },
      {
        title: 'Editables',
        value: editableCount,
        subtitle: canEdit ? 'Tienes permiso de edición' : 'Solo lectura para edición',
      },
      {
        title: 'Eliminables',
        value: deletableCount,
        subtitle: canDelete ? 'Tienes permiso de eliminación' : 'Solo lectura para eliminación',
      },
    ];
  }, [canDelete, canEdit, classes.length, rows.length]);

  const canSubmit = useMemo(() => {
    const canSaveCurrentAction = editingId ? canEdit : canCreate;
    return canSaveCurrentAction && Boolean(form.clase && form.nombre && form.fecha_evaluacion);
  }, [canCreate, canEdit, editingId, form]);

  async function loadClasses() {
    const classPayload = await apiClient.get('/api/v1/profesor/clases/');
    const classRows = asResults(classPayload);
    setClasses(classRows);
    if (!form.clase && classRows.length) {
      setForm((prev) => ({ ...prev, clase: String(classRows[0].id) }));
    }
  }

  async function loadEvaluations() {
    const params = new URLSearchParams();
    if (form.clase) {
      params.set('clase_id', form.clase);
    }
    const query = params.toString();
    const payload = await apiClient.get(`/api/v1/profesor/evaluaciones/${query ? `?${query}` : ''}`);
    setRows(asResults(payload));
  }

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      setLoading(true);
      setError('');
      try {
        await loadClasses();
      } catch (err) {
        if (active) {
          setError(err.payload?.detail || 'No se pudieron cargar clases.');
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
      if (!form.clase) {
        setRows([]);
        return;
      }
      try {
        await loadEvaluations();
      } catch (err) {
        if (active) {
          setError(err.payload?.detail || 'No se pudieron cargar evaluaciones.');
        }
      }
    }
    refresh();
    return () => {
      active = false;
    };
  }, [form.clase]);

  function onChange(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function startEdit(row) {
    if (!canEdit) {
      setError('No tienes permisos para editar evaluaciones.');
      return;
    }
    setEditingId(row.id_evaluacion);
    setForm({
      clase: String(row.clase),
      nombre: row.nombre,
      fecha_evaluacion: row.fecha_evaluacion,
      ponderacion: String(row.ponderacion),
      tipo_evaluacion: row.tipo_evaluacion,
      periodo: row.periodo || '',
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm((prev) => ({
      ...EMPTY_FORM,
      clase: prev.clase || (classes[0] ? String(classes[0].id) : ''),
    }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (formLocked) {
      setError(editingId ? 'No tienes permisos para editar evaluaciones.' : 'No tienes permisos para crear evaluaciones.');
      return;
    }
    if (!canSubmit) {
      return;
    }

    setSaving(true);
    setError('');
    const payload = {
      clase: Number(form.clase),
      nombre: form.nombre,
      fecha_evaluacion: form.fecha_evaluacion,
      ponderacion: form.ponderacion,
      tipo_evaluacion: form.tipo_evaluacion,
      periodo: form.periodo || null,
    };

    try {
      if (editingId) {
        await apiClient.patch(`/api/v1/profesor/evaluaciones/${editingId}/`, payload);
      } else {
        await apiClient.post('/api/v1/profesor/evaluaciones/', payload);
      }
      await loadEvaluations();
      resetForm();
    } catch (err) {
      setError(err.payload?.detail || JSON.stringify(err.payload || {}) || 'No se pudo guardar evaluacion.');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id) {
    if (!canDelete) {
      setError('No tienes permisos para eliminar evaluaciones.');
      return;
    }
    if (!window.confirm('Eliminar esta evaluacion?')) {
      return;
    }
    try {
      await apiClient.del(`/api/v1/profesor/evaluaciones/${id}/`);
      await loadEvaluations();
    } catch (err) {
      setError(err.payload?.detail || 'No se pudo eliminar evaluacion.');
    }
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Profesor: Evaluaciones</h2>
          <p>Gestión de evaluaciones con permisos por acción y filtros por clase.</p>
        </div>
      </header>

      {loading ? <TeacherEvaluationsLoadingState /> : null}
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

      <form className="card form-grid" onSubmit={onSubmit}>
        <h3>{editingId ? `Editar #${editingId}` : 'Nueva Evaluacion'}</h3>

        <label>
          Clase
          <select value={form.clase} onChange={(e) => onChange('clase', e.target.value)} required disabled={formLocked}>
            <option value="">Seleccionar</option>
            {classes.map((row) => (
              <option key={row.id} value={row.id}>
                {row.curso_nombre} - {row.asignatura_nombre}
              </option>
            ))}
          </select>
        </label>

        <label>
          Nombre
          <input value={form.nombre} onChange={(e) => onChange('nombre', e.target.value)} required disabled={formLocked} />
        </label>

        <label>
          Fecha Evaluacion
          <input
            type="date"
            value={form.fecha_evaluacion}
            onChange={(e) => onChange('fecha_evaluacion', e.target.value)}
            required
            disabled={formLocked}
          />
        </label>

        <label>
          Ponderacion
          <input value={form.ponderacion} onChange={(e) => onChange('ponderacion', e.target.value)} disabled={formLocked} />
        </label>

        <label>
          Tipo
          <select value={form.tipo_evaluacion} onChange={(e) => onChange('tipo_evaluacion', e.target.value)} disabled={formLocked}>
            <option value="sumativa">Sumativa</option>
            <option value="formativa">Formativa</option>
            <option value="diagnostica">Diagnostica</option>
            <option value="acumulativa">Acumulativa</option>
          </select>
        </label>

        <label>
          Periodo
          <input value={form.periodo} onChange={(e) => onChange('periodo', e.target.value)} disabled={formLocked} />
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
              <h3>Listado de Evaluaciones</h3>
              <p>Selecciona una evaluación para editar o eliminar según tus permisos.</p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Fecha</th>
                  <th>Ponderación</th>
                  <th>Tipo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id_evaluacion}>
                    <td>{row.id_evaluacion}</td>
                    <td>{row.nombre}</td>
                    <td>{row.fecha_evaluacion}</td>
                    <td>{formatNumber(row.ponderacion)}</td>
                    <td>{row.tipo_evaluacion}</td>
                    <td className="actions-cell">
                      {canEdit ? (
                        <button type="button" className="small" onClick={() => startEdit(row)}>
                          Editar
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button type="button" className="small danger" onClick={() => onDelete(row.id_evaluacion)}>
                          Eliminar
                        </button>
                      ) : null}
                      {!canEdit && !canDelete ? <span>Solo lectura</span> : null}
                    </td>
                  </tr>
                ))}
                {!loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan="6">Sin registros</td>
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
