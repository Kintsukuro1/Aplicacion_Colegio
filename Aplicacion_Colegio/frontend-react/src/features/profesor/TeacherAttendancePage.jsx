import { useEffect, useMemo, useState } from 'react';

import { apiClient } from '../../lib/apiClient';
import { hasCapability } from '../../lib/capabilities';
import { asResults } from '../../lib/httpHelpers';

const EMPTY_FORM = {
  clase: '',
  estudiante: '',
  fecha: '',
  estado: 'P',
  tipo_asistencia: 'Presencial',
  observaciones: '',
};

export default function TeacherAttendancePage({ me }) {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canTakeAttendance = hasCapability(me, 'CLASS_TAKE_ATTENDANCE');

  const canSubmit = useMemo(() => {
    return canTakeAttendance && Boolean(form.clase && form.estudiante && form.fecha && form.estado);
  }, [canTakeAttendance, form]);

  async function loadBaseData() {
    const [classPayload, studentPayload] = await Promise.all([
      apiClient.get('/api/v1/profesor/clases/'),
      apiClient.get('/api/v1/estudiantes/'),
    ]);

    const classRows = asResults(classPayload);
    const studentRows = asResults(studentPayload);
    setClasses(classRows);
    setStudents(studentRows);

    if (!form.clase && classRows.length) {
      setForm((prev) => ({ ...prev, clase: String(classRows[0].id) }));
    }
  }

  async function loadAttendance() {
    const params = new URLSearchParams();
    if (form.clase) {
      params.set('clase_id', form.clase);
    }
    if (form.fecha) {
      params.set('fecha', form.fecha);
    }
    const query = params.toString();
    const payload = await apiClient.get(`/api/v1/profesor/asistencias/${query ? `?${query}` : ''}`);
    setRows(asResults(payload));
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
          setError(err.payload?.detail || 'No se pudo cargar contexto de asistencia.');
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
    async function refreshList() {
      if (!form.clase) {
        setRows([]);
        return;
      }
      try {
        await loadAttendance();
      } catch (err) {
        if (active) {
          setError(err.payload?.detail || 'No se pudo cargar asistencias.');
        }
      }
    }
    refreshList();
    return () => {
      active = false;
    };
  }, [form.clase, form.fecha]);

  function onChange(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function startEdit(row) {
    setEditingId(row.id_asistencia);
    setForm({
      clase: String(row.clase),
      estudiante: String(row.estudiante),
      fecha: row.fecha,
      estado: row.estado,
      tipo_asistencia: row.tipo_asistencia || 'Presencial',
      observaciones: row.observaciones || '',
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm((prev) => ({
      ...EMPTY_FORM,
      clase: prev.clase || (classes[0] ? String(classes[0].id) : ''),
      fecha: prev.fecha,
    }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (!canTakeAttendance) {
      setError('No tienes permisos para crear o editar asistencias.');
      return;
    }
    if (!canSubmit) {
      return;
    }

    setSaving(true);
    setError('');
    const payload = {
      clase: Number(form.clase),
      estudiante: Number(form.estudiante),
      fecha: form.fecha,
      estado: form.estado,
      tipo_asistencia: form.tipo_asistencia,
      observaciones: form.observaciones,
    };

    try {
      if (editingId) {
        await apiClient.patch(`/api/v1/profesor/asistencias/${editingId}/`, payload);
      } else {
        await apiClient.post('/api/v1/profesor/asistencias/', payload);
      }
      await loadAttendance();
      resetForm();
    } catch (err) {
      setError(err.payload?.detail || JSON.stringify(err.payload || {}) || 'No se pudo guardar asistencia.');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id) {
    if (!canTakeAttendance) {
      setError('No tienes permisos para eliminar asistencias.');
      return;
    }
    if (!window.confirm('Eliminar este registro de asistencia?')) {
      return;
    }
    try {
      await apiClient.del(`/api/v1/profesor/asistencias/${id}/`);
      await loadAttendance();
    } catch (err) {
      setError(err.payload?.detail || 'No se pudo eliminar asistencia.');
    }
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Profesor: Asistencias</h2>
          <p>CRUD sobre `profesor/asistencias`.</p>
        </div>
      </header>

      {loading ? <p>Cargando...</p> : null}
      {error ? <div className="error-box">{error}</div> : null}
      {!canTakeAttendance ? <p>Modo solo lectura: falta capability `CLASS_TAKE_ATTENDANCE`.</p> : null}

      <form className="card form-grid" onSubmit={onSubmit}>
        <h3>{editingId ? `Editar #${editingId}` : 'Nueva Asistencia'}</h3>

        <label>
          Clase
          <select
            value={form.clase}
            onChange={(e) => onChange('clase', e.target.value)}
            required
            disabled={!canTakeAttendance}
          >
            <option value="">Seleccionar</option>
            {classes.map((row) => (
              <option key={row.id} value={row.id}>
                {row.curso_nombre} - {row.asignatura_nombre}
              </option>
            ))}
          </select>
        </label>

        <label>
          Estudiante
          <select
            value={form.estudiante}
            onChange={(e) => onChange('estudiante', e.target.value)}
            required
            disabled={!canTakeAttendance}
          >
            <option value="">Seleccionar</option>
            {students.map((row) => (
              <option key={row.id} value={row.id}>
                {row.nombre} {row.apellido_paterno}
              </option>
            ))}
          </select>
        </label>

        <label>
          Fecha
          <input
            type="date"
            value={form.fecha}
            onChange={(e) => onChange('fecha', e.target.value)}
            required
            disabled={!canTakeAttendance}
          />
        </label>

        <label>
          Estado
          <select
            value={form.estado}
            onChange={(e) => onChange('estado', e.target.value)}
            required
            disabled={!canTakeAttendance}
          >
            <option value="P">Presente</option>
            <option value="A">Ausente</option>
            <option value="T">Tardanza</option>
            <option value="J">Justificada</option>
          </select>
        </label>

        <label>
          Tipo
          <input
            value={form.tipo_asistencia}
            onChange={(e) => onChange('tipo_asistencia', e.target.value)}
            disabled={!canTakeAttendance}
          />
        </label>

        <label className="full">
          Observaciones
          <input
            value={form.observaciones}
            onChange={(e) => onChange('observaciones', e.target.value)}
            disabled={!canTakeAttendance}
          />
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
              <th>Fecha</th>
              <th>Estudiante</th>
              <th>Estado</th>
              <th>Tipo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id_asistencia}>
                <td>{row.id_asistencia}</td>
                <td>{row.fecha}</td>
                <td>{row.estudiante_nombre}</td>
                <td>{row.estado}</td>
                <td>{row.tipo_asistencia}</td>
                <td className="actions-cell">
                  {canTakeAttendance ? (
                    <>
                      <button className="small" onClick={() => startEdit(row)}>
                        Editar
                      </button>
                      <button className="small danger" onClick={() => onDelete(row.id_asistencia)}>
                        Eliminar
                      </button>
                    </>
                  ) : (
                    <span>Solo lectura</span>
                  )}
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
