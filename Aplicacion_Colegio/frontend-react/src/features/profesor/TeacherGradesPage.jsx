import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../lib/store/useAuthStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../../lib/apiClient';
import { formatNumber } from '../../lib/formatters';
import { asResults } from '../../lib/httpHelpers';
import EditableTableRow from '../../components/EditableTableRow';
import { SummarySkeleton, TableLoadingState } from '../../components/TableLoadingState';
import { usePermissions } from '../../lib/hooks/usePermissions';
import { useToast } from '../../components/Toast';

const EMPTY_FORM = {
  evaluacion: '',
  estudiante: '',
  nota: '',
};

function InlineEditGrade({ row, isSaving, onSave, onCancel }) {
  const [nota, setNota] = useState(row.nota);
  return (
    <>
      <td>{row.id_calificacion}</td>
      <td>{row.estudiante_nombre}</td>
      <td>
        <input
          type="number"
          step="0.1"
          style={{ width: '80px', padding: '0.2rem' }}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          disabled={isSaving}
        />
      </td>
      <td>{row.fecha_creacion}</td>
      <td className="actions-cell">
        <button type="button" className="small" disabled={isSaving} onClick={() => onSave({ nota })}>
          Guardar
        </button>
        <button type="button" className="small secondary" disabled={isSaving} onClick={onCancel}>
          Cancelar
        </button>
      </td>
    </>
  );
}

export default function TeacherGradesPage() {
  const me = useAuthStore((state) => state.user);
  const { can } = usePermissions(me);
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const toast = useToast();

  const canCreate = can('GRADE_CREATE');
  const canEdit = can('GRADE_EDIT');
  const canDelete = can('GRADE_DELETE');

  // React Query: Clases
  const { data: classesResp, isLoading: loadingClasses, error: classesError } = useQuery({
    queryKey: ['profesor-clases'],
    queryFn: () => apiClient.get('/api/v1/profesor/clases/'),
  });
  const classes = asResults(classesResp) || [];

  // Initialize selectedClass when classes load (moved to useEffect to avoid setState during render)
  useEffect(() => {
    if (!selectedClass && classes.length > 0) {
      setSelectedClass(String(classes[0].id));
    }
  }, [classes, selectedClass]);

  // React Query: Estudiantes
  const { data: studentsResp, isLoading: loadingStudents, error: studentsError } = useQuery({
    queryKey: ['estudiantes'],
    queryFn: () => apiClient.get('/api/v1/estudiantes/'),
  });
  const students = asResults(studentsResp) || [];

  // React Query: Evaluaciones (depende de selectedClass)
  const { data: evaluationsResp, isLoading: loadingEvaluations, error: evaluationsError } = useQuery({
    queryKey: ['profesor-evaluaciones', selectedClass],
    queryFn: () => apiClient.get(`/api/v1/profesor/evaluaciones/?clase_id=${selectedClass}`),
    enabled: !!selectedClass,
  });
  const evaluations = asResults(evaluationsResp) || [];

  // Auto-initialize form.evaluacion when evaluations change (moved to useEffect)
  useEffect(() => {
    if (evaluations.length > 0) {
      const currentEvalExists = evaluations.some((e) => String(e.id_evaluacion) === form.evaluacion);
      if (!currentEvalExists) {
        setForm((prev) => ({ ...prev, evaluacion: String(evaluations[0].id_evaluacion) }));
      }
    }
  }, [evaluations, form.evaluacion]);

  // React Query: Calificaciones (depende de form.evaluacion)
  const { data: gradesResp, isLoading: loadingGrades, error: gradesError } = useQuery({
    queryKey: ['profesor-calificaciones', form.evaluacion],
    queryFn: () => apiClient.get(`/api/v1/profesor/calificaciones/?evaluacion_id=${form.evaluacion}`),
    enabled: !!form.evaluacion,
  });
  const rows = asResults(gradesResp) || [];

  const loading = loadingClasses || loadingStudents || loadingEvaluations || loadingGrades;
  const apiError = classesError || studentsError || evaluationsError || gradesError;

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
        subtitle: totalGrades > 0 ? 'Registros cargados' : 'Sin calificaciones todavía',
      },
      {
        title: 'Evaluaciones',
        value: totalEvaluations,
        subtitle: totalEvaluations > 0 ? 'Disponibles para la clase' : 'No hay evaluaciones',
      },
      {
        title: 'Estudiantes',
        value: totalStudents,
        subtitle: totalStudents > 0 ? 'Listado base para notas' : 'No hay estudiantes',
      },
      {
        title: 'Promedio',
        value: averageGrade,
        subtitle: totalGrades > 0 ? 'Promedio actual de la lista' : 'Sin promedio',
      },
    ];
  }, [evaluations.length, rows, students.length]);

  const canSubmit = useMemo(() => {
    return canCreate && Boolean(form.evaluacion && form.estudiante && form.nota);
  }, [canCreate, form]);

  function onChange(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function resetForm() {
    setForm((prev) => ({
      ...EMPTY_FORM,
      evaluacion: prev.evaluacion || (evaluations[0] ? String(evaluations[0].id_evaluacion) : ''),
    }));
  }

  const createMutation = useMutation({
    mutationFn: (payload) => apiClient.post('/api/v1/profesor/calificaciones/', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profesor-calificaciones', form.evaluacion] });
      resetForm();
      toast.success('Calificacion creada exitosamente');
    },
    onError: (err) => {
      toast.error(err.payload?.detail || JSON.stringify(err.payload || {}) || 'No se pudo crear calificacion.');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => apiClient.patch(`/api/v1/profesor/calificaciones/${id}/`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profesor-calificaciones', form.evaluacion] });
      toast.success('Calificacion actualizada exitosamente');
    },
    onError: (err) => {
      toast.error(err.payload?.detail || JSON.stringify(err.payload || {}) || 'No se pudo actualizar calificacion.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.del(`/api/v1/profesor/calificaciones/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profesor-calificaciones', form.evaluacion] });
      toast.success('Calificacion eliminada exitosamente');
    },
    onError: (err) => {
      toast.error(err.payload?.detail || 'No se pudo eliminar calificacion.');
    }
  });

  async function onSubmit(event) {
    event.preventDefault();
    if (!canCreate) {
      toast.error('No tienes permisos para crear calificaciones.');
      return;
    }
    if (!canSubmit) return;

    await createMutation.mutateAsync({
      evaluacion: Number(form.evaluacion),
      estudiante: Number(form.estudiante),
      nota: form.nota,
    });
  }

  async function onDelete(id) {
    if (!canDelete) {
      toast.error('No tienes permisos para eliminar calificaciones.');
      return;
    }
    if (!window.confirm('Eliminar esta calificacion?')) return;
    await deleteMutation.mutateAsync(id);
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Profesor: Calificaciones</h2>
          <p>Registro de calificaciones con filtro por clase, evaluación e interactividad inline.</p>
        </div>
      </header>

      {apiError ? <div className="error-box">{apiError?.message || 'Error al cargar datos.'}</div> : null}
      {!canCreate ? <p>Modo restringido: falta capability `GRADE_CREATE` para crear.</p> : null}

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

      {canCreate ? (
        <form className="card form-grid" onSubmit={onSubmit}>
          <h3>Nueva Calificacion</h3>

          <label>
            Evaluacion
            <select value={form.evaluacion} onChange={(e) => onChange('evaluacion', e.target.value)} required disabled={createMutation.isPending}>
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
            <select value={form.estudiante} onChange={(e) => onChange('estudiante', e.target.value)} required disabled={createMutation.isPending}>
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
            <input value={form.nota} onChange={(e) => onChange('nota', e.target.value)} required disabled={createMutation.isPending} />
          </label>

          <div className="actions full">
            <button type="submit" disabled={!canSubmit || createMutation.isPending}>
              {createMutation.isPending ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      ) : null}

      <article className="card section-card">
        <div className="section-card-head">
          <div>
            <h3>Listado de Calificaciones</h3>
            <p>Selecciona Editar en una fila para modificar la nota directamente.</p>
          </div>
        </div>

        {loadingGrades ? (
          <TableLoadingState />
        ) : (
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
                  <EditableTableRow
                    key={row.id_calificacion}
                    onSave={async (data) => {
                      await updateMutation.mutateAsync({
                        id: row.id_calificacion,
                        payload: { nota: data.nota },
                      });
                    }}
                    renderView={({ onEdit }) => (
                      <>
                        <td>{row.id_calificacion}</td>
                        <td>{row.estudiante_nombre}</td>
                        <td>{formatNumber(row.nota)}</td>
                        <td>{row.fecha_creacion}</td>
                        <td className="actions-cell">
                          {canEdit ? (
                            <button type="button" className="small" onClick={onEdit}>
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
                      </>
                    )}
                    renderEdit={({ onSave, onCancel, isSaving }) => (
                      <InlineEditGrade row={row} isSaving={isSaving} onSave={onSave} onCancel={onCancel} />
                    )}
                  />
                ))}
                {!loadingGrades && rows.length === 0 ? (
                  <tr>
                    <td colSpan="5">Sin registros</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}

