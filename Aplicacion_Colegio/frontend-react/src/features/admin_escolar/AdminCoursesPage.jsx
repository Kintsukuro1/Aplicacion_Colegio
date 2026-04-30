import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import PaginationControls from '../../components/PaginationControls';
import { apiClient } from '../../lib/apiClient';
import { asPaginated } from '../../lib/httpHelpers';
import { hasCapability } from '../../lib/capabilities';

export default function AdminCoursesPage({ me }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPage = Number.parseInt(searchParams.get('page') || '1', 10);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 1);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    activo: true,
    nivel_id: '',
    ciclo_academico_id: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canView = useMemo(() => hasCapability(me, 'COURSE_VIEW') || hasCapability(me, 'SYSTEM_ADMIN'), [me]);
  const canCreate = useMemo(() => hasCapability(me, 'COURSE_CREATE') || hasCapability(me, 'SYSTEM_ADMIN'), [me]);
  const canUpdate = useMemo(() => hasCapability(me, 'COURSE_EDIT') || hasCapability(me, 'SYSTEM_ADMIN'), [me]);
  const canDelete = useMemo(() => hasCapability(me, 'COURSE_DELETE') || hasCapability(me, 'SYSTEM_ADMIN'), [me]);
  const formLocked = editingId ? !canUpdate : !canCreate;
  const canSubmit = useMemo(() => {
    return Boolean(form.nombre && form.nivel_id);
  }, [form]);

  function formatDisplay(value) {
    if (value === null || value === undefined || value === '') return '0';
    if (typeof value === 'number') return String(value);
    return String(value);
  }

  function AdminCoursesLoadingState() {
    return (
      <article className="card section-card" aria-busy="true" aria-live="polite" role="status">
        <div className="section-card-head">
          <div>
            <div style={{ height: '12px', width: '120px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.18)', marginBottom: '0.75rem' }} />
            <div style={{ height: '26px', width: '220px', borderRadius: '12px', background: 'rgba(148, 163, 184, 0.14)' }} />
            <div style={{ height: '14px', width: '300px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.12)', marginTop: '0.9rem' }} />
          </div>
        </div>

        <div className="summary-grid" style={{ marginTop: '1.25rem' }}>
          {Array.from({ length: 4 }).map((_, index) => (
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
      nombre: '',
      activo: true,
      nivel_id: '',
      ciclo_academico_id: '',
    });
  }

  function toPayload() {
    const payload = {
      nombre: form.nombre,
      activo: Boolean(form.activo),
      nivel_id: Number.parseInt(form.nivel_id, 10),
    };

    if (form.ciclo_academico_id) {
      payload.ciclo_academico_id = Number.parseInt(form.ciclo_academico_id, 10);
    }
    return payload;
  }

  function startEdit(row) {
    if (!canUpdate) {
      setError('No tienes permisos para editar cursos.');
      return;
    }

    setEditingId(row.id_curso);
    setForm({
      nombre: row.nombre || '',
      activo: Boolean(row.activo),
      nivel_id: row.nivel_id ? String(row.nivel_id) : '',
      ciclo_academico_id: row.ciclo_academico_id ? String(row.ciclo_academico_id) : '',
    });
  }

  async function loadCourses(targetPage = page) {
    const payload = await apiClient.get(`/api/v1/cursos/?page=${targetPage}`);
    const paginated = asPaginated(payload);
    setRows(paginated.results);
    setCount(paginated.count);
    setHasNext(Boolean(paginated.next));
    setHasPrevious(Boolean(paginated.previous));
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
        await loadCourses(page);
      } catch (err) {
        if (active) {
          setError(err.payload?.detail || 'No se pudieron cargar cursos.');
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

  async function onSubmit(event) {
    event.preventDefault();

    if (formLocked) {
      setError(editingId ? 'No tienes permisos para editar cursos.' : 'No tienes permisos para crear cursos.');
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
        await apiClient.patch(`/api/v1/cursos/${editingId}/`, payload);
      } else {
        await apiClient.post('/api/v1/cursos/', payload);
      }
      await loadCourses(page);
      resetForm();
    } catch (err) {
      setError(err.payload?.detail || JSON.stringify(err.payload || {}) || 'No se pudo guardar curso.');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(courseId) {
    if (!canDelete) {
      setError('No tienes permisos para eliminar cursos.');
      return;
    }

    if (!window.confirm('Eliminar este curso?')) {
      return;
    }

    try {
      await apiClient.del(`/api/v1/cursos/${courseId}/`);
      await loadCourses(page);
    } catch (err) {
      setError(err.payload?.detail || 'No se pudo eliminar curso.');
    }
  }

  if (!canView) {
    return (
      <section>
        <header className="page-header">
          <div>
            <h2>Admin Escolar: Cursos</h2>
            <p>No tienes permisos para ver cursos.</p>
          </div>
        </header>
      </section>
    );
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Admin Escolar: Cursos</h2>
          <p>CRUD de cursos sobre API v1 (`/api/v1/cursos/`).</p>
        </div>
      </header>

      {loading ? <AdminCoursesLoadingState /> : null}
      {error ? <div className="error-box">{error}</div> : null}

      {!canCreate ? <p>Modo restringido: falta capability `COURSE_CREATE` para crear.</p> : null}

      {canCreate || canUpdate ? (
        <form className="card form-grid" onSubmit={onSubmit}>
          <h3>{editingId ? `Editar curso #${editingId}` : 'Nuevo Curso'}</h3>

          <label>
            Nombre
            <input
              value={form.nombre}
              onChange={(e) => onChange('nombre', e.target.value)}
              required
              disabled={formLocked}
            />
          </label>

          <label>
            Nivel ID
            <input
              type="number"
              value={form.nivel_id}
              onChange={(e) => onChange('nivel_id', e.target.value)}
              required
              disabled={formLocked}
              min="1"
            />
          </label>

          <label>
            Ciclo Academico ID (opcional)
            <input
              type="number"
              value={form.ciclo_academico_id}
              onChange={(e) => onChange('ciclo_academico_id', e.target.value)}
              disabled={formLocked}
              min="1"
            />
          </label>

          <label>
            Activo
            <select
              value={form.activo ? '1' : '0'}
              onChange={(e) => onChange('activo', e.target.value === '1')}
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
      ) : null}

      {!loading && !error ? (
        <>
          <div className="summary-grid">
            {(
              [
                { title: 'Cursos visibles', value: rows.length, subtitle: rows.length > 0 ? 'Registros de la pagina actual' : 'Sin cursos cargados' },
                { title: 'Total paginado', value: count, subtitle: 'Resultados totales en el backend' },
                { title: 'Siguiente pagina', value: hasNext ? 'Si' : 'No', subtitle: 'Indica si hay más registros' },
                { title: 'Pagina previa', value: hasPrevious ? 'Si' : 'No', subtitle: 'Indica si existe retroceso' },
              ]
            ).map((item) => (
              <article key={item.title} className="summary-tile">
                <small>{item.title}</small>
                <strong>{formatDisplay(item.value)}</strong>
                <span>{item.subtitle}</span>
              </article>
            ))}
          </div>

          <article className="card section-card">
            <div className="section-card-head">
              <div>
                <h3>Listado de Cursos</h3>
                <p>Cursos con sus datos de operación visibles para administración.</p>
              </div>
            </div>

            <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Activo</th>
                  <th>Colegio</th>
                  <th>Nivel</th>
                  <th>Ciclo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id_curso}>
                    <td>{row.id_curso}</td>
                    <td>{row.nombre}</td>
                    <td>{row.activo ? 'Si' : 'No'}</td>
                    <td>{row.colegio_id ?? '-'}</td>
                    <td>{row.nivel_id ?? '-'}</td>
                    <td>{row.ciclo_academico_id ?? '-'}</td>
                    <td className="actions-cell">
                      {canUpdate ? (
                        <button type="button" className="small" onClick={() => startEdit(row)}>
                          Editar
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button type="button" className="small danger" onClick={() => onDelete(row.id_curso)}>
                          Eliminar
                        </button>
                      ) : null}
                      {!canUpdate && !canDelete ? <span>-</span> : null}
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

          </article>

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
