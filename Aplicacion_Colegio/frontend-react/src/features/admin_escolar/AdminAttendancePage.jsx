import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import PaginationControls from '../../components/PaginationControls';
import { apiClient } from '../../lib/apiClient';
import { hasCapability } from '../../lib/capabilities';
import { asPaginated, asResults } from '../../lib/httpHelpers';

const ATTENDANCE_STATES = [
  { value: 'P', label: 'Presente' },
  { value: 'A', label: 'Ausente' },
  { value: 'T', label: 'Tardanza' },
  { value: 'J', label: 'Justificada' },
];

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

export default function AdminAttendancePage({ me }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialClass = searchParams.get('clase_id') || '';
  const initialDate = searchParams.get('fecha') || '';
  const initialPage = Number.parseInt(searchParams.get('page') || '1', 10);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(initialClass);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [page, setPage] = useState(Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 1);
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [form, setForm] = useState({
    clase: initialClass,
    estudiante: '',
    fecha: initialDate,
    estado: 'P',
    tipo_asistencia: '',
    observaciones: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [bulkState, setBulkState] = useState('P');
  const [processingBulk, setProcessingBulk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [lastBulkState, setLastBulkState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canView = useMemo(
    () =>
      hasCapability(me, 'CLASS_VIEW_ATTENDANCE') ||
      hasCapability(me, 'CLASS_TAKE_ATTENDANCE') ||
      hasCapability(me, 'SYSTEM_ADMIN'),
    [me]
  );
  const canEdit = useMemo(() => hasCapability(me, 'CLASS_TAKE_ATTENDANCE') || hasCapability(me, 'SYSTEM_ADMIN'), [me]);
  const canSubmit = useMemo(() => {
    return Boolean(form.clase && form.estudiante && form.fecha && form.estado);
  }, [form]);

  function updateFilters(nextClass, nextDate, nextPage = 1) {
    setSelectedClass(nextClass);
    setSelectedDate(nextDate);
    setPage(nextPage);

    const nextParams = new URLSearchParams(searchParams);
    if (nextClass) {
      nextParams.set('clase_id', nextClass);
    } else {
      nextParams.delete('clase_id');
    }
    if (nextDate) {
      nextParams.set('fecha', nextDate);
    } else {
      nextParams.delete('fecha');
    }
    nextParams.set('page', String(nextPage > 0 ? nextPage : 1));
    setSearchParams(nextParams, { replace: true });
  }

  function updatePage(nextPage) {
    const safePage = nextPage > 0 ? nextPage : 1;
    setPage(safePage);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', String(safePage));
    setSearchParams(nextParams, { replace: true });
  }

  function onChange(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      clase: selectedClass || '',
      estudiante: '',
      fecha: selectedDate || '',
      estado: 'P',
      tipo_asistencia: '',
      observaciones: '',
    });
  }

  function toPayload() {
    return {
      clase: Number.parseInt(form.clase, 10),
      estudiante: Number.parseInt(form.estudiante, 10),
      fecha: form.fecha,
      estado: form.estado,
      tipo_asistencia: form.tipo_asistencia || null,
      observaciones: form.observaciones || null,
    };
  }

  function startEdit(row) {
    if (!canEdit) {
      setError('No tienes permisos para editar asistencias.');
      return;
    }

    setEditingId(row.id_asistencia);
    setForm({
      clase: row.clase ? String(row.clase) : selectedClass,
      estudiante: row.estudiante ? String(row.estudiante) : '',
      fecha: row.fecha || '',
      estado: row.estado || 'P',
      tipo_asistencia: row.tipo_asistencia || '',
      observaciones: row.observaciones || '',
    });
  }

  async function loadClasses() {
    const payload = await apiClient.get('/api/v1/profesor/clases/');
    const classRows = asResults(payload);
    setClasses(classRows);
    if (!selectedClass && classRows.length) {
      updateFilters(String(classRows[0].id), selectedDate);
    }
  }

  async function loadAttendance(resetSelection = true, resetBulkResult = true) {
    const params = new URLSearchParams();
    params.set('page', String(page));
    if (selectedClass) {
      params.set('clase_id', selectedClass);
    }
    if (selectedDate) {
      params.set('fecha', selectedDate);
    }
    const query = params.toString();
    const payload = await apiClient.get(`/api/v1/profesor/asistencias/${query ? `?${query}` : ''}`);
    const paginated = asPaginated(payload);
    setRows(paginated.results);
    if (resetSelection) {
      setSelectedIds([]);
    }
    if (resetBulkResult) {
      setBulkResult(null);
    }
    setCount(paginated.count);
    setHasNext(Boolean(paginated.next));
    setHasPrevious(Boolean(paginated.previous));
  }

  function toggleSelect(attendanceId) {
    setSelectedIds((prev) => {
      if (prev.includes(attendanceId)) {
        return prev.filter((id) => id !== attendanceId);
      }
      return [...prev, attendanceId];
    });
  }

  function toggleSelectAllCurrentPage() {
    const currentIds = rows.map((row) => row.id_asistencia);
    const allSelected = currentIds.length > 0 && currentIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(currentIds);
  }

  async function runBulkUpdateState(targetIds, targetState) {
    setProcessingBulk(true);
    setError('');
    setBulkResult(null);
    setLastBulkState(targetState);

    try {
      let result;

      try {
        const payload = await apiClient.post('/api/v1/profesor/asistencias/bulk-update-state/', {
          ids: targetIds,
          estado: targetState,
        });
        result = toBulkResult(payload);
      } catch (batchError) {
        if (!isBatchEndpointUnavailable(batchError)) {
          throw batchError;
        }

        let success = 0;
        const failedIds = [];
        for (const attendanceId of targetIds) {
          try {
            await apiClient.patch(`/api/v1/profesor/asistencias/${attendanceId}/`, { estado: targetState });
            success += 1;
          } catch (_) {
            failedIds.push(attendanceId);
          }
        }

        result = toBulkResult({ success, failed: failedIds.length }, failedIds);
      }

      setBulkResult(result);

      await loadAttendance(true, false);
    } catch (err) {
      setError(err.payload?.detail || 'No se pudo completar la actualizacion masiva.');
    } finally {
      setProcessingBulk(false);
    }
  }

  async function onBulkUpdateState() {
    if (!canEdit) {
      setError('No tienes permisos para editar asistencias.');
      return;
    }

    if (selectedIds.length === 0) {
      setError('Selecciona al menos una asistencia para actualizar.');
      return;
    }

    const targetLabel = ATTENDANCE_STATES.find((option) => option.value === bulkState)?.label || bulkState;
    if (!window.confirm(`Actualizar ${selectedIds.length} registro(s) a estado ${targetLabel}?`)) {
      return;
    }

    await runBulkUpdateState(selectedIds, bulkState);
  }

  async function retryFailedBulkUpdate() {
    if (!bulkResult || bulkResult.failed === 0 || !lastBulkState) {
      return;
    }
    await runBulkUpdateState(bulkResult.failedIds, lastBulkState);
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (!canEdit) {
      setError(editingId ? 'No tienes permisos para editar asistencias.' : 'No tienes permisos para crear asistencias.');
      return;
    }
    if (!canSubmit) {
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = toPayload();
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

  async function onDelete(attendanceId) {
    if (!canEdit) {
      setError('No tienes permisos para eliminar asistencias.');
      return;
    }
    if (!window.confirm('Eliminar esta asistencia?')) {
      return;
    }

    try {
      await apiClient.del(`/api/v1/profesor/asistencias/${attendanceId}/`);
      await loadAttendance();
    } catch (err) {
      setError(err.payload?.detail || 'No se pudo eliminar asistencia.');
    }
  }

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      setLoading(true);
      setError('');
      try {
        if (!canView) {
          return;
        }
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
  }, [canView]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      clase: prev.clase || selectedClass || '',
      fecha: prev.fecha || selectedDate || '',
    }));
  }, [selectedClass, selectedDate]);

  useEffect(() => {
    let active = true;

    async function refreshAttendance() {
      if (!canView || !selectedClass) {
        setRows([]);
        return;
      }
      try {
        await loadAttendance();
      } catch (err) {
        if (active) {
          setError(err.payload?.detail || 'No se pudieron cargar asistencias.');
        }
      }
    }

    refreshAttendance();
    return () => {
      active = false;
    };
  }, [canView, selectedClass, selectedDate, page]);

  if (!canView) {
    return (
      <section>
        <header className="page-header">
          <div>
            <h2>Admin Escolar: Asistencias</h2>
            <p>No tienes permisos para ver asistencias.</p>
          </div>
        </header>
      </section>
    );
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Admin Escolar: Asistencias</h2>
          <p>CRUD de asistencias sobre API v1 (`/api/v1/profesor/asistencias/`).</p>
        </div>
      </header>

      {error ? <div className="error-box">{error}</div> : null}

      {!canEdit ? <p>Modo restringido: falta capability `CLASS_TAKE_ATTENDANCE` para edicion masiva.</p> : null}

      <div className="card form-grid">
        <h3>Filtros</h3>

        <label>
          Clase
          <select value={selectedClass} onChange={(e) => updateFilters(e.target.value, selectedDate)}>
            <option value="">Seleccionar</option>
            {classes.map((row) => (
              <option key={row.id} value={row.id}>
                {row.curso_nombre} - {row.asignatura_nombre}
              </option>
            ))}
          </select>
        </label>

        <label>
          Fecha
          <input type="date" value={selectedDate} onChange={(e) => updateFilters(selectedClass, e.target.value, 1)} />
        </label>
      </div>

      {canEdit ? (
        <form className="card form-grid" onSubmit={onSubmit}>
          <h3>{editingId ? `Editar asistencia #${editingId}` : 'Nueva Asistencia'}</h3>

          <label>
            Clase
            <select value={form.clase} onChange={(e) => onChange('clase', e.target.value)} required disabled={saving}>
              <option value="">Seleccionar</option>
              {classes.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.curso_nombre} - {row.asignatura_nombre}
                </option>
              ))}
            </select>
          </label>

          <label>
            Estudiante ID
            <input
              type="number"
              value={form.estudiante}
              onChange={(e) => onChange('estudiante', e.target.value)}
              min="1"
              required
              disabled={saving}
            />
          </label>

          <label>
            Fecha
            <input type="date" value={form.fecha} onChange={(e) => onChange('fecha', e.target.value)} required disabled={saving} />
          </label>

          <label>
            Estado
            <select value={form.estado} onChange={(e) => onChange('estado', e.target.value)} disabled={saving}>
              {ATTENDANCE_STATES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Tipo Asistencia
            <input value={form.tipo_asistencia} onChange={(e) => onChange('tipo_asistencia', e.target.value)} disabled={saving} />
          </label>

          <label>
            Observaciones
            <input value={form.observaciones} onChange={(e) => onChange('observaciones', e.target.value)} disabled={saving} />
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
      ) : null}

      {loading ? <p>Cargando...</p> : null}

      {!loading ? (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && rows.every((row) => selectedIds.includes(row.id_asistencia))}
                      onChange={toggleSelectAllCurrentPage}
                      disabled={!canEdit || rows.length === 0 || processingBulk}
                    />
                  </th>
                  <th>ID</th>
                  <th>Clase</th>
                  <th>Estudiante</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Tipo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id_asistencia}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.id_asistencia)}
                        onChange={() => toggleSelect(row.id_asistencia)}
                        disabled={!canEdit || processingBulk}
                      />
                    </td>
                    <td>{row.id_asistencia}</td>
                    <td>{row.clase}</td>
                    <td>{row.estudiante_nombre || row.estudiante}</td>
                    <td>{row.fecha}</td>
                    <td>{row.estado}</td>
                    <td>{row.tipo_asistencia || '-'}</td>
                    <td className="actions-cell">
                      {canEdit ? (
                        <button type="button" className="small" onClick={() => startEdit(row)}>
                          Editar
                        </button>
                      ) : null}
                      {canEdit ? (
                        <button type="button" className="small danger" onClick={() => onDelete(row.id_asistencia)}>
                          Eliminar
                        </button>
                      ) : null}
                      {!canEdit ? <span>-</span> : null}
                    </td>
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
              <div className="actions" style={{ justifyContent: 'space-between', alignItems: 'center', gap: '0.8rem' }}>
                <span>{selectedIds.length} seleccionado(s) en la pagina actual.</span>
                <div className="actions" style={{ gap: '0.6rem' }}>
                  <select value={bulkState} onChange={(e) => setBulkState(e.target.value)} disabled={processingBulk}>
                    {ATTENDANCE_STATES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={onBulkUpdateState} disabled={processingBulk || selectedIds.length === 0}>
                    {processingBulk ? 'Actualizando...' : 'Actualizar Estado Seleccionados'}
                  </button>
                </div>
              </div>

              {bulkResult ? (
                <p style={{ marginTop: '0.6rem' }}>
                  Actualizacion masiva completada: {bulkResult.success} ok, {bulkResult.failed} con error
                  {bulkResult.failed > 0
                    ? ` (IDs: ${bulkResult.failedIds.slice(0, 5).join(', ')}${bulkResult.failed > 5 ? ', ...' : ''})`
                    : ''}
                  .
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
