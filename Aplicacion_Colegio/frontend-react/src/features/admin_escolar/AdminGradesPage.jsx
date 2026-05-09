import { useMemo, useState } from 'react';
import { useAuthStore } from '../../lib/store/useAuthStore';
import { useSearchParams } from 'react-router-dom';

import PaginationControls from '../../components/PaginationControls';
import { SummarySkeleton, TableLoadingState } from '../../components/TableLoadingState';
import { apiClient } from '../../lib/apiClient';
import { usePagination } from '../../lib/hooks';
import { formatNumber } from '../../lib/formatters';
import { usePermissions } from '../../lib/hooks/usePermissions';
import { useToast } from '../../components/Toast';

function isBatchEndpointUnavailable(error) {
  return error?.status === 404 || error?.status === 405;
}

function toBulkResult(payload, fallbackFailedIds = []) {
  const failedIds = Array.isArray(payload?.failed_ids)
    ? payload.failed_ids
    : Array.isArray(payload?.failedIds)
      ? payload.failedIds
      : fallbackFailedIds;

  const success = Number.isFinite(payload?.success) ? payload.success : 0;
  const failed = Number.isFinite(payload?.failed) ? payload.failed : failedIds.length;
  return { success, failed, failedIds };
}

export default function AdminGradesPage() {
  const me = useAuthStore((state) => state.user);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPage = Number.parseInt(searchParams.get('page') || '1', 10);
  const page = Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 1;
  const [selectedIds, setSelectedIds] = useState([]);
  const [form, setForm] = useState({
    evaluacion: '',
    estudiante: '',
    nota: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [processingBulk, setProcessingBulk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const toast = useToast();
  const { canAny } = usePermissions(me);

  const canView = useMemo(
    () =>
      canAny(['GRADE_VIEW', 'GRADE_CREATE', 'GRADE_EDIT', 'GRADE_DELETE', 'SYSTEM_ADMIN']),
    [canAny]
  );
  const canCreate = useMemo(() => canAny(['GRADE_CREATE', 'SYSTEM_ADMIN']), [canAny]);
  const canEdit = useMemo(() => canAny(['GRADE_EDIT', 'SYSTEM_ADMIN']), [canAny]);
  const canDelete = useMemo(() => canAny(['GRADE_DELETE', 'SYSTEM_ADMIN']), [canAny]);
  const paginationUrl = '/api/v1/profesor/calificaciones/';
  const { items: rows, pagination, loading, error: apiError, refetch: refetchGrades } = usePagination(paginationUrl, {
    params: { page },
    pageMode: true,
    skip: !canView,
  });

  const formLocked = editingId ? !canEdit : !canCreate;
  const canSubmit = useMemo(() => {
    return Boolean(form.evaluacion && form.estudiante && form.nota !== '');
  }, [form]);

  function onChange(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      evaluacion: '',
      estudiante: '',
      nota: '',
    });
  }

  function toPayload() {
    return {
      evaluacion: Number.parseInt(form.evaluacion, 10),
      estudiante: Number.parseInt(form.estudiante, 10),
      nota: Number.parseFloat(form.nota),
    };
  }

  function startEdit(row) {
    if (!canEdit) {
      toast.error('No tienes permisos para editar calificaciones.');
      return;
    }

    setEditingId(row.id_calificacion);
    setForm({
      evaluacion: String(row.evaluacion),
      estudiante: String(row.estudiante),
      nota: String(row.nota),
    });
  }

  function updatePage(nextPage) {
    const safePage = nextPage > 0 ? nextPage : 1;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', String(safePage));
    setSearchParams(nextParams, { replace: true });
    setSelectedIds([]);
    setBulkResult(null);
  }

  const summaryCards = useMemo(() => {
    return [
      {
        title: 'Calificaciones visibles',
        value: rows.length,
        subtitle: rows.length > 0 ? 'Registros de la pagina actual' : 'Sin calificaciones cargadas',
      },
      {
        title: 'Total paginado',
        value: pagination.total,
        subtitle: 'Resultados totales en el backend',
      },
      {
        title: 'Siguiente pagina',
        value: pagination.hasNext ? 'Si' : 'No',
        subtitle: 'Indica si hay más registros',
      },
      {
        title: 'Pagina previa',
        value: pagination.hasPrevious ? 'Si' : 'No',
        subtitle: 'Indica si existe retroceso',
      },
    ];
  }, [pagination.total, pagination.hasNext, pagination.hasPrevious, rows.length]);

  async function onSubmit(event) {
    event.preventDefault();

    if (formLocked) {
      toast.error(editingId ? 'No tienes permisos para editar calificaciones.' : 'No tienes permisos para crear calificaciones.');
      return;
    }
    if (!canSubmit) {
      return;
    }

    setSaving(true);
    try {
      const payload = toPayload();
      if (editingId) {
        await apiClient.patch(`/api/v1/profesor/calificaciones/${editingId}/`, payload);
      } else {
        await apiClient.post('/api/v1/profesor/calificaciones/', payload);
      }
      await refetchGrades();
      resetForm();
      toast.success(editingId ? 'Calificacion actualizada' : 'Calificacion creada');
    } catch (err) {
      toast.error(err.payload?.detail || JSON.stringify(err.payload || {}) || 'No se pudo guardar calificacion.');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(gradeId) {
    if (!canDelete) {
      toast.error('No tienes permisos para eliminar calificaciones.');
      return;
    }

    if (!window.confirm('Eliminar esta calificacion?')) {
      return;
    }

    try {
      await apiClient.del(`/api/v1/profesor/calificaciones/${gradeId}/`);
      await refetchGrades();
      toast.success('Calificacion eliminada');
    } catch (err) {
      toast.error(err.payload?.detail || 'No se pudo eliminar calificacion.');
    }
  }

  function toggleSelect(gradeId) {
    setSelectedIds((prev) => {
      if (prev.includes(gradeId)) {
        return prev.filter((id) => id !== gradeId);
      }
      return [...prev, gradeId];
    });
  }

  function toggleSelectAllCurrentPage() {
    const currentIds = rows.map((row) => row.id_calificacion);
    const allSelected = currentIds.length > 0 && currentIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(currentIds);
  }

  async function runBulkDelete(targetIds) {
    setProcessingBulk(true);
    setBulkResult(null);

    try {
      let result;

      try {
        const payload = await apiClient.post('/api/v1/profesor/calificaciones/bulk-delete/', {
          ids: targetIds,
        });
        result = toBulkResult(payload);
      } catch (batchError) {
        if (!isBatchEndpointUnavailable(batchError)) {
          throw batchError;
        }

        let success = 0;
        const failedIds = [];
        for (const gradeId of targetIds) {
          try {
            await apiClient.del(`/api/v1/profesor/calificaciones/${gradeId}/`);
            success += 1;
          } catch (_) {
            failedIds.push(gradeId);
          }
        }
        result = toBulkResult({ success, failed: failedIds.length }, failedIds);
      }

      setBulkResult(result);

      await refetchGrades();
      setSelectedIds([]);
      toast.success('Eliminacion masiva completada');
    } catch (err) {
      toast.error(err.payload?.detail || 'No se pudo completar la eliminacion masiva.');
    } finally {
      setProcessingBulk(false);
    }
  }

  async function onBulkDelete() {
    if (!canDelete) {
      toast.error('No tienes permisos para eliminar calificaciones.');
      return;
    }

    if (selectedIds.length === 0) {
      toast.error('Selecciona al menos una calificacion para eliminar.');
      return;
    }

    if (!window.confirm(`Eliminar ${selectedIds.length} calificacion(es) seleccionada(s)?`)) {
      return;
    }

    await runBulkDelete(selectedIds);
  }

  async function retryFailedBulkDelete() {
    if (!bulkResult || bulkResult.failed === 0) {
      return;
    }
    await runBulkDelete(bulkResult.failedIds);
  }

  if (!canView) {
    return (
      <section>
        <header className="page-header">
          <div>
            <h2>Admin Escolar: Calificaciones</h2>
            <p>No tienes permisos para ver calificaciones.</p>
          </div>
        </header>
      </section>
    );
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Admin Escolar: Calificaciones</h2>
          <p>Lectura desde `GET /api/v1/profesor/calificaciones/`.</p>
        </div>
      </header>

      {apiError ? <div className="error-box">{apiError}</div> : null}
      {!canCreate ? <p>Modo restringido: falta capability `GRADE_CREATE` para crear.</p> : null}
      {!canDelete ? <p>Modo restringido: falta capability `GRADE_DELETE` para eliminacion masiva.</p> : null}

      {canCreate || canEdit ? (
        <form className="card form-grid" onSubmit={onSubmit}>
          <h3>{editingId ? `Editar calificacion #${editingId}` : 'Nueva Calificacion'}</h3>

          <label>
            Evaluacion ID
            <input
              type="number"
              value={form.evaluacion}
              onChange={(e) => onChange('evaluacion', e.target.value)}
              required
              disabled={formLocked}
              min="1"
            />
          </label>

          <label>
            Estudiante ID
            <input
              type="number"
              value={form.estudiante}
              onChange={(e) => onChange('estudiante', e.target.value)}
              required
              disabled={formLocked}
              min="1"
            />
          </label>

          <label>
            Nota
            <input
              type="number"
              step="0.1"
              value={form.nota}
              onChange={(e) => onChange('nota', e.target.value)}
              required
              disabled={formLocked}
              min="1"
              max="7"
            />
          </label>

          <div className="actions full">
            <button type="submit" disabled={!canSubmit || formLocked || saving}>
              {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
            </button>
            {editingId ? (
              <button type="button" className="secondary" onClick={resetForm}>
                Cancelar Edicion
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      <div className="summary-grid">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <SummarySkeleton key={index} />
            ))
          : summaryCards.map((item) => (
              <article key={item.title} className="summary-tile">
                <small>{item.title}</small>
                <strong>{formatNumber(item.value)}</strong>
                <span>{item.subtitle}</span>
              </article>
            ))}
      </div>

      <article className="card section-card">
        <div className="section-card-head">
          <div>
            <h3>Listado de Calificaciones</h3>
            <p>Calificaciones del profesor con sus datos de operación visibles para administración.</p>
          </div>
        </div>

        {loading ? (
          <TableLoadingState />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && rows.every((row) => selectedIds.includes(row.id_calificacion))}
                      onChange={toggleSelectAllCurrentPage}
                      disabled={!canDelete || rows.length === 0 || processingBulk}
                    />
                  </th>
                  <th>ID</th>
                  <th>Evaluacion</th>
                  <th>Estudiante</th>
                  <th>Nota</th>
                  <th>Fecha Creacion</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id_calificacion}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.id_calificacion)}
                        onChange={() => toggleSelect(row.id_calificacion)}
                        disabled={!canDelete || processingBulk}
                      />
                    </td>
                    <td>{row.id_calificacion}</td>
                    <td>{row.evaluacion}</td>
                    <td>{row.estudiante_nombre || row.estudiante}</td>
                    <td>{row.nota}</td>
                    <td>{row.fecha_creacion || '-'}</td>
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
                      {!canEdit && !canDelete ? <span>-</span> : null}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan="7">Sin registros</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {canDelete ? (
        <div className="card section-card">
          <div className="bulk-actions-bar">
            <span>{selectedIds.length} seleccionado(s) en la pagina actual.</span>
            <button
              type="button"
              className="danger"
              onClick={onBulkDelete}
              disabled={processingBulk || selectedIds.length === 0}
            >
              {processingBulk ? 'Eliminando...' : 'Eliminar Seleccionadas'}
            </button>
          </div>

          {bulkResult ? (
            <p className="bulk-result-text">
              Eliminacion masiva completada: {bulkResult.success} ok, {bulkResult.failed} con error
              {bulkResult.failed > 0 ? ` (IDs: ${bulkResult.failedIds.slice(0, 5).join(', ')}${bulkResult.failed > 5 ? ', ...' : ''})` : ''}.
            </p>
          ) : null}

          {bulkResult && bulkResult.failed > 0 ? (
            <div className="bulk-retry-actions">
              <button type="button" className="secondary" onClick={retryFailedBulkDelete} disabled={processingBulk}>
                {processingBulk ? 'Reintentando...' : 'Reintentar Fallidos'}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <PaginationControls
        page={page}
        count={pagination.total}
        hasNext={pagination.hasNext}
        hasPrevious={pagination.hasPrevious}
        onPageChange={updatePage}
        loading={loading}
      />
    </section>
  );
}

