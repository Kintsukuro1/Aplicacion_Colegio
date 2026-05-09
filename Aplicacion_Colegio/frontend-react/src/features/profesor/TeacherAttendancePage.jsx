import { useMemo, useState } from 'react';
import { useAuthStore } from '../../lib/store/useAuthStore';

import { apiClient } from '../../lib/apiClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { asResults } from '../../lib/httpHelpers';
import { SummarySkeleton, TableLoadingState } from '../../components/TableLoadingState';
import { formatNumber } from '../../lib/formatters';
import { usePermissions } from '../../lib/hooks/usePermissions';
import { useToast } from '../../components/Toast';

const EMPTY_FORM = {
  clase: '',
  estudiante: '',
  fecha: '',
  estado: 'P',
  tipo_asistencia: 'Presencial',
  observaciones: '',
};



export default function TeacherAttendancePage() {
  const me = useAuthStore((state) => state.user);
  const { can } = usePermissions(me);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();

  const canTakeAttendance = can('CLASS_TAKE_ATTENDANCE');

  // Load classes and students in parallel
  const { data: classesResp, isLoading: loadingClasses, error: classesErrorObj } = useQuery({
    queryKey: ['profesor-clases'],
    queryFn: () => apiClient.get('/api/v1/profesor/clases/')
  });
  const { data: studentsResp, isLoading: loadingStudents, error: studentsErrorObj } = useQuery({
    queryKey: ['estudiantes'],
    queryFn: () => apiClient.get('/api/v1/estudiantes/')
  });
  const classesError = classesErrorObj?.message;
  const studentsError = studentsErrorObj?.message;
  
  const classes = asResults(classesResp) || [];
  const students = asResults(studentsResp) || [];

  // Initialize form with first class when classes load
  if (!form.clase && classes.length > 0) {
    setForm((prev) => (prev.clase ? prev : { ...prev, clase: String(classes[0].id) }));
  }

  // Load attendance based on selected class and date
  const attendanceParams = new URLSearchParams();
  if (form.clase) {
    attendanceParams.set('clase_id', form.clase);
  }
  if (form.fecha) {
    attendanceParams.set('fecha', form.fecha);
  }
  const attendanceUrl = form.clase 
    ? `/api/v1/profesor/asistencias/?${attendanceParams.toString()}`
    : null;
  const { data: attendanceResp, isLoading: loadingAttendance, error: attendanceErrorObj } = useQuery({
    queryKey: ['profesor-asistencias', form.clase, form.fecha],
    queryFn: () => apiClient.get(attendanceUrl),
    enabled: !!form.clase
  });
  const attendanceError = attendanceErrorObj?.message;
  const rows = asResults(attendanceResp) || [];

  const loading = loadingClasses || loadingStudents || loadingAttendance;
  const apiError = classesError || studentsError || attendanceError;

  const summary = useMemo(() => {
    const total = rows.length;
    const present = rows.filter((row) => row.estado === 'P').length;
    const absent = rows.filter((row) => row.estado === 'A').length;
    const tardy = rows.filter((row) => row.estado === 'T').length;

    return [
      { title: 'Registros', value: total, subtitle: 'Asistencias cargadas para el filtro actual' },
      { title: 'Presentes', value: present, subtitle: 'Estados marcados como presente' },
      { title: 'Ausentes', value: absent, subtitle: 'Estados marcados como ausente' },
      { title: 'Tardanzas', value: tardy, subtitle: 'Estados marcados como tardanza' },
    ];
  }, [rows]);

  const canSubmit = useMemo(() => {
    return canTakeAttendance && Boolean(form.clase && form.estudiante && form.fecha && form.estado);
  }, [canTakeAttendance, form]);

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
      toast.error('No tienes permisos para crear o editar asistencias.');
      return;
    }
    if (!canSubmit) {
      return;
    }

    setSaving(true);
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
      await queryClient.invalidateQueries({ queryKey: ['profesor-asistencias'] });
      resetForm();
      toast.success(editingId ? 'Asistencia actualizada exitosamente' : 'Asistencia creada exitosamente');
    } catch (err) {
      toast.error(err.payload?.detail || JSON.stringify(err.payload || {}) || 'No se pudo guardar asistencia.');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id) {
    if (!canTakeAttendance) {
      toast.error('No tienes permisos para eliminar asistencias.');
      return;
    }
    if (!window.confirm('Eliminar este registro de asistencia?')) {
      return;
    }
    try {
      await apiClient.delete(`/api/v1/profesor/asistencias/${id}/`);
      await queryClient.invalidateQueries({ queryKey: ['profesor-asistencias'] });
      toast.success('Asistencia eliminada exitosamente');
    } catch (err) {
      toast.error(err.payload?.detail || 'No se pudo eliminar asistencia.');
    }
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Profesor: Asistencias</h2>
          <p>Registro de asistencia con filtros por clase y fecha, más permisos por acción.</p>
        </div>
      </header>

      {apiError ? <div className="error-box">{apiError}</div> : null}
      {!canTakeAttendance ? <p>Modo solo lectura: falta capability `CLASS_TAKE_ATTENDANCE`.</p> : null}

      <div className="summary-grid">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <SummarySkeleton key={index} />
            ))
          : summary.map((item) => (
              <article key={item.title} className="summary-tile">
                <small>{item.title}</small>
                <strong>{formatNumber(item.value)}</strong>
                <span>{item.subtitle}</span>
              </article>
            ))}
      </div>

      <form className="card section-card form-grid" onSubmit={onSubmit}>
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
          <select
            value={form.tipo_asistencia}
            onChange={(e) => onChange('tipo_asistencia', e.target.value)}
            disabled={!canTakeAttendance}
          >
            <option value="Presencial">Presencial</option>
            <option value="Remota">Remota</option>
            <option value="Hibrida">Híbrida</option>
          </select>
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

      <article className="card section-card">
        <div className="section-card-head">
          <div>
            <h3>Listado de Asistencias</h3>
            <p>Revisa los registros cargados para la clase y fecha seleccionadas.</p>
          </div>
        </div>

        {loading ? (
          <TableLoadingState />
        ) : (
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
                          <button type="button" className="small" onClick={() => startEdit(row)}>
                            Editar
                          </button>
                          <button type="button" className="small danger" onClick={() => onDelete(row.id_asistencia)}>
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
        )}

        {!loading && rows.length === 0 ? <p className="section-muted">No hay asistencias para el filtro actual.</p> : null}
      </article>
    </section>
  );
}

