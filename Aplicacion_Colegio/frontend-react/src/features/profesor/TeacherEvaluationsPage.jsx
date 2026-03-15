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
          <p>CRUD sobre `profesor/evaluaciones`.</p>
        </div>
      </header>

      {loading ? <p>Cargando...</p> : null}
      {error ? <div className="error-box">{error}</div> : null}
      {!canCreate ? <p>Modo restringido: falta capability `GRADE_CREATE` para crear.</p> : null}

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

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Fecha</th>
              <th>Ponderacion</th>
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
                <td>{row.ponderacion}</td>
                <td>{row.tipo_evaluacion}</td>
                <td className="actions-cell">
                  {canEdit ? (
                    <button className="small" onClick={() => startEdit(row)}>
                      Editar
                    </button>
                  ) : null}
                  {canDelete ? (
                    <button className="small danger" onClick={() => onDelete(row.id_evaluacion)}>
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
    </section>
  );
}
