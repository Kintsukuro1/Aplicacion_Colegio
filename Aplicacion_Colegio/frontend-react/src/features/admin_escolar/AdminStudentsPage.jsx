import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import PaginationControls from '../../components/PaginationControls';
import { apiClient } from '../../lib/apiClient';
import { asPaginated } from '../../lib/httpHelpers';
import { hasCapability } from '../../lib/capabilities';

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

const EMPTY_FORM = {
  email: '',
  rut: '',
  nombre: '',
  apellido_paterno: '',
  apellido_materno: '',
  is_active: true,
};

export default function AdminStudentsPage({ me }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPage = Number.parseInt(searchParams.get('page') || '1', 10);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 1);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkResult, setBulkResult] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canView = useMemo(() => hasCapability(me, 'STUDENT_VIEW') || hasCapability(me, 'SYSTEM_ADMIN'), [me]);
  const canCreate = useMemo(() => hasCapability(me, 'STUDENT_EDIT') || hasCapability(me, 'SYSTEM_ADMIN'), [me]);
  const canUpdate = useMemo(() => hasCapability(me, 'STUDENT_EDIT') || hasCapability(me, 'SYSTEM_ADMIN'), [me]);
  const canDeactivate = useMemo(() => hasCapability(me, 'STUDENT_EDIT') || hasCapability(me, 'SYSTEM_ADMIN'), [me]);
  const formLocked = editingId ? !canUpdate : !canCreate;

  const canSubmit = useMemo(() => {
    return Boolean(form.email && form.rut && form.nombre && form.apellido_paterno);
  }, [form]);

  function updatePage(nextPage) {
    const safePage = nextPage > 0 ? nextPage : 1;
    setPage(safePage);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', String(safePage));
    setSearchParams(nextParams, { replace: true });
  }

  async function loadStudents(targetPage = page, resetSelection = true, resetBulkResult = true) {
    const payload = await apiClient.get(`/api/v1/estudiantes/?page=${targetPage}`);
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

  function toggleSelect(studentId) {
    setSelectedIds((prev) => {
      if (prev.includes(studentId)) {
        return prev.filter((id) => id !== studentId);
      }
      return [...prev, studentId];
    });
  }

  function toggleSelectAllCurrentPage() {
    const currentIds = rows.map((row) => row.id);
    const allSelected = currentIds.length > 0 && currentIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(currentIds);
  }

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      setLoading(true);
      setError('');
      try {
        if (canView) {
          await loadStudents();
        }
      } catch (err) {
        if (active) {
          setError(err.payload?.detail || 'No se pudo cargar estudiantes.');
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
  }, [canView, page]);

  function onChange(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function startEdit(row) {
    if (!canUpdate) {
      setError('No tienes permisos para editar estudiantes.');
      return;
    }
    setEditingId(row.id);
    setForm({
      email: row.email || '',
      rut: row.rut || '',
      nombre: row.nombre || '',
      apellido_paterno: row.apellido_paterno || '',
      apellido_materno: row.apellido_materno || '',
      is_active: Boolean(row.is_active),
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (formLocked) {
      setError(editingId ? 'No tienes permisos para editar estudiantes.' : 'No tienes permisos para crear estudiantes.');
      return;
    }
    if (!canSubmit) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (editingId) {
        await apiClient.patch(`/api/v1/estudiantes/${editingId}/`, form);
      } else {
        await apiClient.post('/api/v1/estudiantes/', form);
      }
      await loadStudents(page);
      resetForm();
    } catch (err) {
      setError(err.payload?.detail || JSON.stringify(err.payload || {}) || 'No se pudo guardar estudiante.');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(studentId) {
    if (!canDeactivate) {
      setError('No tienes permisos para desactivar estudiantes.');
      return;
    }

    if (!window.confirm('Desactivar este estudiante?')) {
      return;
    }

    try {
      await apiClient.del(`/api/v1/estudiantes/${studentId}/`);
      await loadStudents(page);
    } catch (err) {
      setError(err.payload?.detail || 'No se pudo desactivar estudiante.');
    }
  }

  async function runBulkDeactivate(targetIds) {
    setSaving(true);
    setError('');
    setBulkResult(null);

    try {
      let result;

      try {
        const payload = await apiClient.post('/api/v1/estudiantes/bulk-deactivate/', {
          ids: targetIds,
        });
        result = toBulkResult(payload);
      } catch (batchError) {
        if (!isBatchEndpointUnavailable(batchError)) {
          throw batchError;
        }

        let success = 0;
        const failedIds = [];
        for (const studentId of targetIds) {
          try {
            await apiClient.del(`/api/v1/estudiantes/${studentId}/`);
            success += 1;
          } catch (_) {
            failedIds.push(studentId);
          }
        }
        result = toBulkResult({ success, failed: failedIds.length }, failedIds);
      }

      setBulkResult(result);

      await loadStudents(page, true, false);
    } catch (err) {
      setError(err.payload?.detail || 'No se pudo completar la desactivacion masiva.');
    } finally {
      setSaving(false);
    }
  }

  async function onBulkDeactivate() {
    if (!canDeactivate) {
      setError('No tienes permisos para desactivar estudiantes.');
      return;
    }

    if (selectedIds.length === 0) {
      setError('Selecciona al menos un estudiante para desactivar.');
      return;
    }

    if (!window.confirm(`Desactivar ${selectedIds.length} estudiante(s) seleccionados?`)) {
      return;
    }

    await runBulkDeactivate(selectedIds);
  }

  async function retryFailedBulkDeactivate() {
    if (!bulkResult || bulkResult.failed === 0) {
      return;
    }
    await runBulkDeactivate(bulkResult.failedIds);
  }

  if (!canView) {
    return (
      <section>
        <header className="page-header">
          <div>
            <h2>Admin Escolar: Estudiantes</h2>
            <p>No tienes permisos para ver estudiantes.</p>
          </div>
        </header>
      </section>
    );
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Admin Escolar: Estudiantes</h2>
          <p>Listado y CRUD sobre `estudiantes` de API v1.</p>
        </div>
      </header>

      {loading ? <p>Cargando...</p> : null}
      {error ? <div className="error-box">{error}</div> : null}

      {!canCreate ? <p>Modo restringido: falta capability `STUDENT_EDIT` para crear.</p> : null}

      {canCreate || canUpdate ? (
        <form className="card form-grid" onSubmit={onSubmit}>
          <h3>{editingId ? `Editar #${editingId}` : 'Nuevo Estudiante'}</h3>

          <label>
            Email
            <input value={form.email} onChange={(e) => onChange('email', e.target.value)} required disabled={formLocked} />
          </label>

          <label>
            RUT
            <input value={form.rut} onChange={(e) => onChange('rut', e.target.value)} required disabled={formLocked} />
          </label>

          <label>
            Nombre
            <input value={form.nombre} onChange={(e) => onChange('nombre', e.target.value)} required disabled={formLocked} />
          </label>

          <label>
            Apellido Paterno
            <input
              value={form.apellido_paterno}
              onChange={(e) => onChange('apellido_paterno', e.target.value)}
              required
              disabled={formLocked}
            />
          </label>

          <label>
            Apellido Materno
            <input
              value={form.apellido_materno}
              onChange={(e) => onChange('apellido_materno', e.target.value)}
              disabled={formLocked}
            />
          </label>

          <label>
            Activo
            <select
              value={form.is_active ? '1' : '0'}
              onChange={(e) => onChange('is_active', e.target.value === '1')}
              disabled={formLocked}
            >
              <option value="1">Si</option>
              <option value="0">No</option>
            </select>
          </label>

          <div className="actions full">
            <button type="submit" disabled={!canSubmit || saving || formLocked}>
              {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
            </button>
            {editingId ? (
              <button type="button" className="secondary" onClick={resetForm}>
                Cancelar Edicion
              </button>
            ) : null}
          </div>
        </form>
      ) : (
        <div className="card">
          <p>Tienes permisos de lectura, pero no de edición (`STUDENT_EDIT`).</p>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={rows.length > 0 && rows.every((row) => selectedIds.includes(row.id))}
                  onChange={toggleSelectAllCurrentPage}
                  disabled={!canDeactivate || rows.length === 0}
                />
              </th>
              <th>ID</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>RUT</th>
              <th>Activo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(row.id)}
                    onChange={() => toggleSelect(row.id)}
                    disabled={!canDeactivate}
                  />
                </td>
                <td>{row.id}</td>
                <td>{`${row.nombre} ${row.apellido_paterno || ''}`.trim()}</td>
                <td>{row.email}</td>
                <td>{row.rut}</td>
                <td>{row.is_active ? 'Si' : 'No'}</td>
                <td className="actions-cell">
                  {canUpdate ? (
                    <>
                      <button type="button" className="small" onClick={() => startEdit(row)}>
                        Editar
                      </button>
                    </>
                  ) : null}
                  {canDeactivate ? (
                    <button type="button" className="small danger" onClick={() => onDelete(row.id)}>
                      Desactivar
                    </button>
                  ) : null}
                  {!canUpdate && !canDeactivate ? <span>-</span> : null}
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan="7">Sin registros</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {canDeactivate ? (
        <div className="card" style={{ marginTop: '0.8rem' }}>
          <div className="actions" style={{ justifyContent: 'space-between' }}>
            <span>{selectedIds.length} seleccionado(s) en la pagina actual.</span>
            <button
              type="button"
              className="danger"
              onClick={onBulkDeactivate}
              disabled={saving || selectedIds.length === 0}
            >
              {saving ? 'Procesando...' : 'Desactivar Seleccionados'}
            </button>
          </div>

          {bulkResult ? (
            <p style={{ marginTop: '0.6rem' }}>
              Desactivacion masiva completada: {bulkResult.success} ok, {bulkResult.failed} con error
              {bulkResult.failed > 0 ? ` (IDs: ${bulkResult.failedIds.slice(0, 5).join(', ')}${bulkResult.failed > 5 ? ', ...' : ''})` : ''}.
            </p>
          ) : null}

          {bulkResult && bulkResult.failed > 0 ? (
            <div className="actions" style={{ marginTop: '0.5rem' }}>
              <button type="button" className="secondary" onClick={retryFailedBulkDeactivate} disabled={saving}>
                {saving ? 'Reintentando...' : 'Reintentar Fallidos'}
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
    </section>
  );
}
