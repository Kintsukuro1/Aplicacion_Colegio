import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import PaginationControls from '../../components/PaginationControls';
import { apiClient } from '../../lib/apiClient';
import { hasCapability } from '../../lib/capabilities';
import { asPaginated } from '../../lib/httpHelpers';

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

export default function AdminEvaluationsPage({ me }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPage = Number.parseInt(searchParams.get('page') || '1', 10);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 1);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [processingBulk, setProcessingBulk] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [lastBulkTargetActive, setLastBulkTargetActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canView =
    hasCapability(me, 'GRADE_VIEW') ||
    hasCapability(me, 'GRADE_CREATE') ||
    hasCapability(me, 'GRADE_EDIT') ||
    hasCapability(me, 'GRADE_DELETE') ||
    hasCapability(me, 'SYSTEM_ADMIN');
  const canEdit = hasCapability(me, 'GRADE_EDIT') || hasCapability(me, 'SYSTEM_ADMIN');

  function updatePage(nextPage) {
    const safePage = nextPage > 0 ? nextPage : 1;
    setPage(safePage);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', String(safePage));
    setSearchParams(nextParams, { replace: true });
  }

  useEffect(() => {
    let active = true;

    async function loadEvaluations() {
      setLoading(true);
      setError('');
      try {
        if (!canView) {
          return;
        }
        const payload = await apiClient.get(`/api/v1/profesor/evaluaciones/?page=${page}`);
        const paginated = asPaginated(payload);
        if (active) {
          setRows(paginated.results);
          setSelectedIds([]);
          setBulkResult(null);
          setCount(paginated.count);
          setHasNext(Boolean(paginated.next));
          setHasPrevious(Boolean(paginated.previous));
        }
      } catch (err) {
        if (active) {
          setError(err.payload?.detail || 'No se pudieron cargar evaluaciones.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadEvaluations();
    return () => {
      active = false;
    };
  }, [canView, page]);

  function toggleSelect(evaluationId) {
    setSelectedIds((prev) => {
      if (prev.includes(evaluationId)) {
        return prev.filter((id) => id !== evaluationId);
      }
      return [...prev, evaluationId];
    });
  }

  function toggleSelectAllCurrentPage() {
    const currentIds = rows.map((row) => row.id_evaluacion);
    const allSelected = currentIds.length > 0 && currentIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(currentIds);
  }

  async function runBulkToggleActive(targetIds, targetActive) {
    setProcessingBulk(true);
    setError('');
    setBulkResult(null);
    setLastBulkTargetActive(targetActive);

    try {
      let result;

      try {
        const payload = await apiClient.post('/api/v1/profesor/evaluaciones/bulk-toggle-active/', {
          ids: targetIds,
          activa: targetActive,
        });
        result = toBulkResult(payload);
      } catch (batchError) {
        if (!isBatchEndpointUnavailable(batchError)) {
          throw batchError;
        }

        let success = 0;
        const failedIds = [];
        for (const evaluationId of targetIds) {
          try {
            await apiClient.patch(`/api/v1/profesor/evaluaciones/${evaluationId}/`, { activa: targetActive });
            success += 1;
          } catch (_) {
            failedIds.push(evaluationId);
          }
        }
        result = toBulkResult({ success, failed: failedIds.length }, failedIds);
      }

      setBulkResult(result);

      const payload = await apiClient.get(`/api/v1/profesor/evaluaciones/?page=${page}`);
      const paginated = asPaginated(payload);
      setRows(paginated.results);
      setSelectedIds([]);
      setCount(paginated.count);
      setHasNext(Boolean(paginated.next));
      setHasPrevious(Boolean(paginated.previous));
    } catch (err) {
      setError(err.payload?.detail || 'No se pudo completar la actualizacion masiva.');
    } finally {
      setProcessingBulk(false);
    }
  }

  async function onBulkToggleActive(targetActive) {
    if (!canEdit) {
      setError('No tienes permisos para editar evaluaciones.');
      return;
    }

    if (selectedIds.length === 0) {
      setError('Selecciona al menos una evaluacion para actualizar.');
      return;
    }

    const label = targetActive ? 'activar' : 'desactivar';
    if (!window.confirm(`${label} ${selectedIds.length} evaluacion(es) seleccionada(s)?`)) {
      return;
    }

    await runBulkToggleActive(selectedIds, targetActive);
  }

  async function retryFailedBulkUpdate() {
    if (!bulkResult || bulkResult.failed === 0 || lastBulkTargetActive === null) {
      return;
    }
    await runBulkToggleActive(bulkResult.failedIds, lastBulkTargetActive);
  }

  if (!canView) {
    return (
      <section>
        <header className="page-header">
          <div>
            <h2>Admin Escolar: Evaluaciones</h2>
            <p>No tienes permisos para ver evaluaciones.</p>
          </div>
        </header>
      </section>
    );
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Admin Escolar: Evaluaciones</h2>
          <p>Lectura desde `GET /api/v1/profesor/evaluaciones/`.</p>
        </div>
      </header>

      {loading ? <p>Cargando evaluaciones...</p> : null}
      {error ? <div className="error-box">{error}</div> : null}
      {!canEdit ? <p>Modo restringido: falta capability `GRADE_EDIT` para edicion masiva.</p> : null}

      {!loading && !error ? (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && rows.every((row) => selectedIds.includes(row.id_evaluacion))}
                      onChange={toggleSelectAllCurrentPage}
                      disabled={!canEdit || rows.length === 0 || processingBulk}
                    />
                  </th>
                  <th>ID</th>
                  <th>Clase</th>
                  <th>Nombre</th>
                  <th>Fecha</th>
                  <th>Ponderacion</th>
                  <th>Tipo</th>
                  <th>Activa</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id_evaluacion}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.id_evaluacion)}
                        onChange={() => toggleSelect(row.id_evaluacion)}
                        disabled={!canEdit || processingBulk}
                      />
                    </td>
                    <td>{row.id_evaluacion}</td>
                    <td>{row.clase}</td>
                    <td>{row.nombre}</td>
                    <td>{row.fecha_evaluacion}</td>
                    <td>{row.ponderacion}</td>
                    <td>{row.tipo_evaluacion}</td>
                    <td>{row.activa ? 'Si' : 'No'}</td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan="8">Sin registros</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {canEdit ? (
            <div className="card" style={{ marginTop: '0.8rem' }}>
              <div className="actions" style={{ justifyContent: 'space-between', gap: '0.8rem' }}>
                <span>{selectedIds.length} seleccionado(s) en la pagina actual.</span>
                <div className="actions" style={{ gap: '0.6rem' }}>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => onBulkToggleActive(true)}
                    disabled={processingBulk || selectedIds.length === 0}
                  >
                    {processingBulk ? 'Procesando...' : 'Activar Seleccionadas'}
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => onBulkToggleActive(false)}
                    disabled={processingBulk || selectedIds.length === 0}
                  >
                    {processingBulk ? 'Procesando...' : 'Desactivar Seleccionadas'}
                  </button>
                </div>
              </div>

              {bulkResult ? (
                <p style={{ marginTop: '0.6rem' }}>
                  Actualizacion masiva completada: {bulkResult.success} ok, {bulkResult.failed} con error
                  {bulkResult.failed > 0 ? ` (IDs: ${bulkResult.failedIds.slice(0, 5).join(', ')}${bulkResult.failed > 5 ? ', ...' : ''})` : ''}.
                </p>
              ) : null}

              {bulkResult && bulkResult.failed > 0 ? (
                <div className="actions" style={{ marginTop: '0.5rem' }}>
                  <button type="button" className="secondary" onClick={retryFailedBulkUpdate} disabled={processingBulk}>
                    {processingBulk ? 'Reintentando...' : 'Reintentar Fallidos'}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          <PaginationControls
            page={page}
            count={count}
            hasNext={hasNext}
            hasPrevious={hasPrevious}
            onPageChange={updatePage}
            loading={loading}
          />
        </>
      ) : null}
    </section>
  );
}
