import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import PaginationControls from '../../components/PaginationControls';
import { apiClient } from '../../lib/apiClient';
import { hasCapability } from '../../lib/capabilities';
import { asPaginated } from '../../lib/httpHelpers';

const EVENT_TYPES = [
  'feriado',
  'vacaciones',
  'evaluacion',
  'reunion',
  'actividad',
  'ceremonia',
  'administrativo',
  'otro',
];

const VISIBILITY = ['todos', 'profesores', 'estudiantes', 'apoderados', 'administrativos'];

const EMPTY_FORM = {
  titulo: '',
  descripcion: '',
  tipo: 'actividad',
  fecha_inicio: '',
  fecha_fin: '',
  hora_inicio: '',
  hora_fin: '',
  todo_el_dia: true,
  lugar: '',
  visibilidad: 'todos',
  es_feriado_nacional: false,
  color: '#3B82F6',
};

function formatDisplay(value) {
  if (value === null || value === undefined || value === '') {
    return '0';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return String(value);
}

function CalendarLoadingState() {
  return (
    <article className="card section-card" aria-busy="true" aria-live="polite" role="status">
      <div className="section-card-head">
        <div>
          <div style={{ height: '12px', width: '120px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.18)', marginBottom: '0.75rem' }} />
          <div style={{ height: '26px', width: '240px', borderRadius: '12px', background: 'rgba(148, 163, 184, 0.14)' }} />
          <div style={{ height: '14px', width: '320px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.12)', marginTop: '0.9rem' }} />
        </div>
      </div>

      <div className="summary-grid" style={{ marginTop: '1.25rem' }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="summary-tile" style={{ minHeight: '100px', background: 'rgba(148, 163, 184, 0.08)' }}>
            <div style={{ height: '12px', width: '88px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.18)', marginBottom: '0.85rem' }} />
            <div style={{ height: '26px', width: index === 3 ? '72px' : '92px', borderRadius: '12px', background: 'rgba(148, 163, 184, 0.14)' }} />
          </div>
        ))}
      </div>

      <div className="table-wrap" style={{ marginTop: '1.25rem' }}>
        <div style={{ height: '18px', width: '180px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.18)', marginBottom: '1rem' }} />
        <div style={{ height: '240px', borderRadius: '16px', background: 'linear-gradient(90deg, rgba(148,163,184,0.08), rgba(148,163,184,0.14), rgba(148,163,184,0.08))' }} />
      </div>
    </article>
  );
}

function normalizeFormForApi(form) {
  return {
    ...form,
    fecha_fin: form.fecha_fin || null,
    hora_inicio: form.todo_el_dia ? null : form.hora_inicio || null,
    hora_fin: form.todo_el_dia ? null : form.hora_fin || null,
    descripcion: form.descripcion || '',
    lugar: form.lugar || '',
  };
}

export default function CalendarEventsPage({ me }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPage = Number.parseInt(searchParams.get('page') || '1', 10);
  const [page, setPage] = useState(Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 1);
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    tipo: '',
    mes: '',
    anio: '',
    desde: '',
    hasta: '',
  });

  const canView = useMemo(
    () => hasCapability(me, 'ANNOUNCEMENT_VIEW') || hasCapability(me, 'SYSTEM_ADMIN'),
    [me],
  );
  const canCreate = useMemo(
    () => hasCapability(me, 'ANNOUNCEMENT_CREATE') || hasCapability(me, 'SYSTEM_ADMIN'),
    [me],
  );
  const canEdit = useMemo(
    () => hasCapability(me, 'ANNOUNCEMENT_EDIT') || hasCapability(me, 'SYSTEM_ADMIN'),
    [me],
  );
  const canDelete = useMemo(
    () => hasCapability(me, 'ANNOUNCEMENT_DELETE') || hasCapability(me, 'SYSTEM_ADMIN'),
    [me],
  );
  const activeFilters = useMemo(() => Object.values(filters).filter(Boolean).length, [filters]);
  const summaryCards = useMemo(() => ([
    {
      title: 'Eventos visibles',
      value: rows.length,
      subtitle: 'Registros en la página actual',
    },
    {
      title: 'Total filtrado',
      value: count,
      subtitle: 'Resultados para el conjunto actual',
    },
    {
      title: 'Filtros activos',
      value: activeFilters,
      subtitle: 'Campos usados para acotar la búsqueda',
    },
    {
      title: 'Estado',
      value: loading ? 'Cargando' : 'Listo',
      subtitle: canCreate || canEdit || canDelete ? 'Con permisos de operación' : 'Solo lectura',
    },
  ]), [activeFilters, canCreate, canDelete, canEdit, count, loading, rows.length]);

  function updatePage(nextPage) {
    const safePage = nextPage > 0 ? nextPage : 1;
    setPage(safePage);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', String(safePage));
    setSearchParams(nextParams, { replace: true });
  }

  function buildQuery(targetPage) {
    const params = new URLSearchParams();
    params.set('page', String(targetPage));
    if (filters.tipo) params.set('tipo', filters.tipo);
    if (filters.mes) params.set('mes', filters.mes);
    if (filters.anio) params.set('anio', filters.anio);
    if (filters.desde) params.set('desde', filters.desde);
    if (filters.hasta) params.set('hasta', filters.hasta);
    return params.toString();
  }

  async function loadEvents(targetPage = page) {
    setLoading(true);
    setError('');
    try {
      const payload = await apiClient.get(`/api/v1/calendario/?${buildQuery(targetPage)}`);
      const paginated = asPaginated(payload);
      setRows(paginated.results);
      setCount(paginated.count);
      setHasNext(Boolean(paginated.next));
      setHasPrevious(Boolean(paginated.previous));
    } catch (err) {
      setError(err.payload?.detail || 'No se pudo cargar el calendario.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canView) return;
    loadEvents(page);
  }, [canView, page]);

  function onChange(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function startEdit(row) {
    if (!canEdit) {
      setError('No tienes permisos para editar eventos.');
      return;
    }

    setEditingId(row.id_evento);
    setForm({
      titulo: row.titulo || '',
      descripcion: row.descripcion || '',
      tipo: row.tipo || 'actividad',
      fecha_inicio: row.fecha_inicio || '',
      fecha_fin: row.fecha_fin || '',
      hora_inicio: row.hora_inicio || '',
      hora_fin: row.hora_fin || '',
      todo_el_dia: Boolean(row.todo_el_dia),
      lugar: row.lugar || '',
      visibilidad: row.visibilidad || 'todos',
      es_feriado_nacional: Boolean(row.es_feriado_nacional),
      color: row.color || '#3B82F6',
    });
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (editingId && !canEdit) {
      setError('No tienes permisos para editar eventos.');
      return;
    }
    if (!editingId && !canCreate) {
      setError('No tienes permisos para crear eventos.');
      return;
    }
    if (!form.titulo || !form.fecha_inicio || !form.tipo) {
      setError('Completa titulo, tipo y fecha de inicio.');
      return;
    }

    setSaving(true);
    setError('');
    const body = normalizeFormForApi(form);

    try {
      if (editingId) {
        await apiClient.patch(`/api/v1/calendario/${editingId}/`, body);
      } else {
        await apiClient.post('/api/v1/calendario/', body);
      }
      await loadEvents(page);
      resetForm();
    } catch (err) {
      setError(err.payload?.detail || JSON.stringify(err.payload || {}) || 'No se pudo guardar el evento.');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(row) {
    if (!canDelete) {
      setError('No tienes permisos para eliminar eventos.');
      return;
    }
    if (!window.confirm(`Eliminar evento ${row.titulo}?`)) {
      return;
    }

    setSaving(true);
    setError('');
    try {
      await apiClient.del(`/api/v1/calendario/${row.id_evento}/`);
      await loadEvents(page);
    } catch (err) {
      setError(err.payload?.detail || 'No se pudo eliminar el evento.');
    } finally {
      setSaving(false);
    }
  }

  async function onApplyFilters(event) {
    event.preventDefault();
    updatePage(1);
    await loadEvents(1);
  }

  if (!canView) {
    return (
      <section>
        <header className="page-header">
          <div>
            <h2>Calendario Escolar</h2>
            <p>No tienes permisos para ver eventos del calendario.</p>
          </div>
        </header>
      </section>
    );
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Calendario Escolar</h2>
          <p>CRUD de eventos académicos con filtros por tipo, mes y rango de fechas.</p>
        </div>
      </header>

      {loading ? <CalendarLoadingState /> : null}
      {error ? <div className="error-box">{error}</div> : null}

      {!loading && !error ? (
        <div className="summary-grid">
          {summaryCards.map((item) => (
            <article key={item.title} className="summary-tile">
              <small>{item.title}</small>
              <strong>{formatDisplay(item.value)}</strong>
              <span>{item.subtitle}</span>
            </article>
          ))}
        </div>
      ) : null}

      <form className="card form-grid" onSubmit={onApplyFilters}>
        <h3 className="full">Filtros</h3>
        <label>
          Tipo
          <select value={filters.tipo} onChange={(e) => setFilters((prev) => ({ ...prev, tipo: e.target.value }))}>
            <option value="">Todos</option>
            {EVENT_TYPES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Mes
          <input
            type="number"
            min="1"
            max="12"
            value={filters.mes}
            onChange={(e) => setFilters((prev) => ({ ...prev, mes: e.target.value }))}
          />
        </label>
        <label>
          Anio
          <input
            type="number"
            min="2020"
            max="2100"
            value={filters.anio}
            onChange={(e) => setFilters((prev) => ({ ...prev, anio: e.target.value }))}
          />
        </label>
        <label>
          Desde
          <input type="date" value={filters.desde} onChange={(e) => setFilters((prev) => ({ ...prev, desde: e.target.value }))} />
        </label>
        <label>
          Hasta
          <input type="date" value={filters.hasta} onChange={(e) => setFilters((prev) => ({ ...prev, hasta: e.target.value }))} />
        </label>
        <div className="actions full">
          <button type="submit" className="secondary" disabled={loading}>Aplicar Filtros</button>
          <button
            type="button"
            onClick={() => setFilters({ tipo: '', mes: '', anio: '', desde: '', hasta: '' })}
            disabled={loading}
          >
            Limpiar
          </button>
        </div>
      </form>

      {(canCreate || canEdit) ? (
        <form className="card form-grid" onSubmit={onSubmit}>
          <h3 className="full">{editingId ? `Editar #${editingId}` : 'Nuevo Evento'}</h3>
          <label>
            Titulo
            <input value={form.titulo} onChange={(e) => onChange('titulo', e.target.value)} required disabled={saving} />
          </label>
          <label>
            Tipo
            <select value={form.tipo} onChange={(e) => onChange('tipo', e.target.value)} disabled={saving}>
              {EVENT_TYPES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Visibilidad
            <select value={form.visibilidad} onChange={(e) => onChange('visibilidad', e.target.value)} disabled={saving}>
              {VISIBILITY.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Fecha Inicio
            <input type="date" value={form.fecha_inicio} onChange={(e) => onChange('fecha_inicio', e.target.value)} required disabled={saving} />
          </label>
          <label>
            Fecha Fin
            <input type="date" value={form.fecha_fin} onChange={(e) => onChange('fecha_fin', e.target.value)} disabled={saving} />
          </label>
          <label>
            Hora Inicio
            <input type="time" value={form.hora_inicio} onChange={(e) => onChange('hora_inicio', e.target.value)} disabled={saving || form.todo_el_dia} />
          </label>
          <label>
            Hora Fin
            <input type="time" value={form.hora_fin} onChange={(e) => onChange('hora_fin', e.target.value)} disabled={saving || form.todo_el_dia} />
          </label>
          <label>
            Lugar
            <input value={form.lugar} onChange={(e) => onChange('lugar', e.target.value)} disabled={saving} />
          </label>
          <label>
            Color
            <input type="color" value={form.color} onChange={(e) => onChange('color', e.target.value)} disabled={saving} />
          </label>
          <label>
            Todo el dia
            <input type="checkbox" checked={form.todo_el_dia} onChange={(e) => onChange('todo_el_dia', e.target.checked)} disabled={saving} />
          </label>
          <label>
            Feriado nacional
            <input
              type="checkbox"
              checked={form.es_feriado_nacional}
              onChange={(e) => onChange('es_feriado_nacional', e.target.checked)}
              disabled={saving}
            />
          </label>
          <label className="full">
            Descripcion
            <input value={form.descripcion} onChange={(e) => onChange('descripcion', e.target.value)} disabled={saving} />
          </label>

          <div className="actions full">
            <button type="submit" disabled={saving}>{editingId ? 'Guardar Cambios' : 'Crear Evento'}</button>
            <button type="button" className="secondary" onClick={resetForm} disabled={saving}>Cancelar</button>
          </div>
        </form>
      ) : null}

      {!loading && !error ? (
        <article className="card section-card">
          <div className="section-card-head">
            <div>
              <h3>Listado de Eventos</h3>
              <p>Eventos académicos y administrativos cargados para la consulta actual.</p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Titulo</th>
                  <th>Tipo</th>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th>Visibilidad</th>
                  <th>Color</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id_evento}>
                    <td>{row.titulo}</td>
                    <td>{row.tipo_display || row.tipo}</td>
                    <td>{row.fecha_inicio}</td>
                    <td>{row.fecha_fin || '-'}</td>
                    <td>{row.visibilidad}</td>
                    <td>
                      <span className="calendar-color-chip" style={{ background: row.color || '#3B82F6' }} />
                    </td>
                    <td className="actions-cell">
                      {canEdit ? (
                        <button type="button" className="small secondary" onClick={() => startEdit(row)}>
                          Editar
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button type="button" className="small danger" onClick={() => onDelete(row)}>
                          Eliminar
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7}>Sin eventos para los filtros seleccionados.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
      ) : null}

      <PaginationControls
        page={page}
        count={count}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        onPageChange={updatePage}
        loading={loading}
      />
    </section>
  );
}
