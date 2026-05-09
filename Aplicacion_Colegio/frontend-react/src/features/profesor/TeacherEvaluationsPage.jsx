import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../lib/store/useAuthStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../../lib/apiClient';
import { formatNumber } from '../../lib/formatters';
import { asResults } from '../../lib/httpHelpers';
import FormOverlay from '../../components/FormOverlay';
import { SummarySkeleton, TableLoadingState } from '../../components/TableLoadingState';
import { usePermissions } from '../../lib/hooks/usePermissions';
import { useToast } from '../../components/Toast';

const EMPTY_FORM = {
  clase: '',
  nombre: '',
  fecha_evaluacion: '',
  ponderacion: '100.00',
  tipo_evaluacion: 'sumativa',
  periodo: '',
};

export default function TeacherEvaluationsPage() {
  const me = useAuthStore((state) => state.user);
  const { can } = usePermissions(me);
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const toast = useToast();

  const canCreate = can('GRADE_CREATE');
  const canEdit = can('GRADE_EDIT');
  const canDelete = can('GRADE_DELETE');
  const formLocked = editingId ? !canEdit : !canCreate;

  // React Query: Clases
  const { data: classesResp, isLoading: loadingClasses, error: classesError } = useQuery({
    queryKey: ['profesor-clases'],
    queryFn: () => apiClient.get('/api/v1/profesor/clases/'),
  });
  const classes = asResults(classesResp) || [];

  // Initialize selectedClass with first class when classes load
  useEffect(() => {
    if (!selectedClass && classes.length > 0) {
      setSelectedClass(String(classes[0].id));
    }
  }, [classes, selectedClass]);

  // React Query: Evaluaciones (depende de selectedClass)
  const { data: evaluationsResp, isLoading: loadingEvaluations, error: evaluationsError } = useQuery({
    queryKey: ['profesor-evaluaciones', selectedClass],
    queryFn: () => apiClient.get(`/api/v1/profesor/evaluaciones/?clase_id=${selectedClass}`),
    enabled: !!selectedClass,
  });
  const rows = asResults(evaluationsResp) || [];

  const loading = loadingClasses || loadingEvaluations;
  const apiError = classesError || evaluationsError;

  const summary = useMemo(() => {
    const totalEvaluations = rows.length;
    const classCount = classes.length;
    const editableCount = canEdit ? totalEvaluations : 0;
    const deletableCount = canDelete ? totalEvaluations : 0;

    return [
      {
        title: 'Evaluaciones',
        value: totalEvaluations,
        subtitle: totalEvaluations > 0 ? 'Registradas en esta clase' : 'Sin evaluaciones',
      },
      {
        title: 'Clases',
        value: classCount,
        subtitle: classCount > 0 ? 'Cursos asignados' : 'No hay clases',
      },
      {
        title: 'Editables',
        value: editableCount,
        subtitle: canEdit ? 'Permiso de edición' : 'Lectura',
      },
      {
        title: 'Eliminables',
        value: deletableCount,
        subtitle: canDelete ? 'Permiso de eliminación' : 'Lectura',
      },
    ];
  }, [canDelete, canEdit, classes.length, rows.length]);

  const canSubmit = useMemo(() => {
    const canSaveCurrentAction = editingId ? canEdit : canCreate;
    return canSaveCurrentAction && Boolean(form.clase && form.nombre && form.fecha_evaluacion);
  }, [canCreate, canEdit, editingId, form]);

  function onChange(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function startCreate() {
    if (!canCreate) {
      toast.error('No tienes permisos para crear evaluaciones.');
      return;
    }
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      clase: selectedClass || (classes[0] ? String(classes[0].id) : ''),
    });
    setIsFormOpen(true);
  }

  function startEdit(row) {
    if (!canEdit) {
      toast.error('No tienes permisos para editar evaluaciones.');
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
    setIsFormOpen(true);
  }

  function handleCloseModal() {
    setIsFormOpen(false);
  }

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      return await apiClient.post('/api/v1/profesor/evaluaciones/', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profesor-evaluaciones', selectedClass] });
      setIsFormOpen(false);
      toast.success('Evaluación creada exitosamente');
    },
    onError: (err) => {
      toast.error(err.payload?.detail || JSON.stringify(err.payload || {}) || 'No se pudo crear evaluación.');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      return await apiClient.patch(`/api/v1/profesor/evaluaciones/${id}/`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profesor-evaluaciones', selectedClass] });
      setIsFormOpen(false);
      toast.success('Evaluación actualizada exitosamente');
    },
    onError: (err) => {
      toast.error(err.payload?.detail || JSON.stringify(err.payload || {}) || 'No se pudo actualizar evaluación.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await apiClient.del(`/api/v1/profesor/evaluaciones/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profesor-evaluaciones', selectedClass] });
      toast.success('Evaluación eliminada exitosamente');
    },
    onError: (err) => {
      toast.error(err.payload?.detail || 'No se pudo eliminar evaluación.');
    }
  });

  async function onSubmit(event) {
    event.preventDefault();
    if (formLocked) {
      toast.error(editingId ? 'No tienes permisos para editar evaluaciones.' : 'No tienes permisos para crear evaluaciones.');
      return;
    }
    if (!canSubmit) {
      return;
    }

    const payload = {
      clase: Number(form.clase),
      nombre: form.nombre,
      fecha_evaluacion: form.fecha_evaluacion,
      ponderacion: form.ponderacion,
      tipo_evaluacion: form.tipo_evaluacion,
      periodo: form.periodo || null,
    };

    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  }

  async function onDelete(id) {
    if (!canDelete) {
      toast.error('No tienes permisos para eliminar evaluaciones.');
      return;
    }
    if (!window.confirm('¿Eliminar esta evaluación?')) {
      return;
    }
    await deleteMutation.mutateAsync(id);
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <section>
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>Profesor: Evaluaciones</h2>
          <p>Gestión de evaluaciones mediante modales superpuestos y caché avanzado.</p>
        </div>
        {canCreate ? (
          <button type="button" className="primary" onClick={startCreate}>
            + Nueva Evaluación
          </button>
        ) : null}
      </header>

      {apiError ? <div className="error-box">{apiError?.message || 'Error en la petición'}</div> : null}
      {!canCreate && !canEdit && !canDelete ? <p>Modo lectura.</p> : null}

      <div className="summary-grid">
        {loadingClasses
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

      <article className="card section-card">
        <div className="section-card-head">
          <div>
            <h3>Listado de Evaluaciones</h3>
            <p>Selecciona una evaluación para editar o eliminar según tus permisos.</p>
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
                    <td>{formatNumber(row.ponderacion)}%</td>
                    <td>{row.tipo_evaluacion}</td>
                    <td className="actions-cell">
                      {canEdit ? (
                        <button type="button" className="small" onClick={() => startEdit(row)}>
                          Editar
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button type="button" className="small danger" onClick={() => onDelete(row.id_evaluacion)} disabled={deleteMutation.isPending}>
                          Eliminar
                        </button>
                      ) : null}
                      {!canEdit && !canDelete ? <span>Solo lectura</span> : null}
                    </td>
                  </tr>
                ))}
                {!loadingEvaluations && rows.length === 0 ? (
                  <tr>
                    <td colSpan="6">Sin registros</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}

        {!loading && rows.length === 0 ? <p className="section-muted">No hay evaluaciones para la clase seleccionada.</p> : null}
      </article>

      <FormOverlay
        isOpen={isFormOpen}
        onClose={handleCloseModal}
        title={editingId ? `Editar Evaluación #${editingId}` : 'Nueva Evaluación'}
      >
        <form className="form-grid" onSubmit={onSubmit} style={{ marginTop: '0', padding: '0', background: 'transparent', boxShadow: 'none' }}>
          
          <label style={{ gridColumn: '1 / -1' }}>
            Clase
            <select value={form.clase} onChange={(e) => onChange('clase', e.target.value)} required disabled={formLocked || isSaving}>
              <option value="">Seleccionar</option>
              {classes.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.curso_nombre} - {row.asignatura_nombre}
                </option>
              ))}
            </select>
          </label>

          <label style={{ gridColumn: '1 / -1' }}>
            Nombre
            <input value={form.nombre} onChange={(e) => onChange('nombre', e.target.value)} required disabled={formLocked || isSaving} />
          </label>

          <label>
            Fecha Evaluación
            <input
              type="date"
              value={form.fecha_evaluacion}
              onChange={(e) => onChange('fecha_evaluacion', e.target.value)}
              required
              disabled={formLocked || isSaving}
            />
          </label>

          <label>
            Ponderación (%)
            <input type="number" step="0.1" value={form.ponderacion} onChange={(e) => onChange('ponderacion', e.target.value)} disabled={formLocked || isSaving} />
          </label>

          <label>
            Tipo
            <select value={form.tipo_evaluacion} onChange={(e) => onChange('tipo_evaluacion', e.target.value)} disabled={formLocked || isSaving}>
              <option value="sumativa">Sumativa</option>
              <option value="formativa">Formativa</option>
              <option value="diagnostica">Diagnostica</option>
              <option value="acumulativa">Acumulativa</option>
            </select>
          </label>

          <label>
            Periodo
            <input value={form.periodo} onChange={(e) => onChange('periodo', e.target.value)} disabled={formLocked || isSaving} />
          </label>

          <div className="actions full" style={{ marginTop: '1rem' }}>
            <button type="submit" disabled={!canSubmit || isSaving}>
              {isSaving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
            </button>
            <button type="button" className="secondary" onClick={handleCloseModal} disabled={isSaving}>
              Cancelar
            </button>
          </div>
        </form>
      </FormOverlay>
    </section>
  );
}

