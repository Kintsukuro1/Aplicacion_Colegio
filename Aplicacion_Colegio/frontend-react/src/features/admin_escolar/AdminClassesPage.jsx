import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import PaginationControls from '../../components/PaginationControls';
import { apiClient } from '../../lib/apiClient';
import { hasCapability } from '../../lib/capabilities';
import { asPaginated } from '../../lib/httpHelpers';

function formatDisplay(value) {
  if (value === null || value === undefined || value === '') {
    return '0';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return String(value);
}

function AdminClassesLoadingState() {
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

export default function AdminClassesPage({ me }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPage = Number.parseInt(searchParams.get('page') || '1', 10);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 1);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canView = hasCapability(me, 'CLASS_VIEW') || hasCapability(me, 'SYSTEM_ADMIN');
  const summaryCards = useMemo(() => {
    return [
      {
        title: 'Clases visibles',
        value: rows.length,
        subtitle: rows.length > 0 ? 'Registros de la pagina actual' : 'Sin clases cargadas',
      },
      {
        title: 'Total paginado',
        value: count,
        subtitle: 'Resultados totales en el backend',
      },
      {
        title: 'Siguiente pagina',
        value: hasNext ? 'Si' : 'No',
        subtitle: 'Indica si hay más registros',
      },
      {
        title: 'Pagina previa',
        value: hasPrevious ? 'Si' : 'No',
        subtitle: 'Indica si existe retroceso',
      },
    ];
  }, [count, hasNext, hasPrevious, rows.length]);

  function updatePage(nextPage) {
    const safePage = nextPage > 0 ? nextPage : 1;
    setPage(safePage);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', String(safePage));
    setSearchParams(nextParams, { replace: true });
  }

  useEffect(() => {
    let active = true;

    async function loadClasses() {
      setLoading(true);
      setError('');
      try {
        if (!canView) {
          return;
        }
        const payload = await apiClient.get(`/api/v1/profesor/clases/?page=${page}`);
        const paginated = asPaginated(payload);
        if (active) {
          setRows(paginated.results);
          setCount(paginated.count);
          setHasNext(Boolean(paginated.next));
          setHasPrevious(Boolean(paginated.previous));
        }
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

    loadClasses();
    return () => {
      active = false;
    };
  }, [canView, page]);

  if (!canView) {
    return (
      <section>
        <header className="page-header">
          <div>
            <h2>Admin Escolar: Clases</h2>
            <p>No tienes permisos para ver clases.</p>
          </div>
        </header>
      </section>
    );
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Admin Escolar: Clases</h2>
          <p>Lectura desde `GET /api/v1/profesor/clases/` con paginación.</p>
        </div>
      </header>

      {loading ? <AdminClassesLoadingState /> : null}
      {error ? <div className="error-box">{error}</div> : null}

      {!loading && !error ? (
        <>
          <div className="summary-grid">
            {summaryCards.map((item) => (
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
                <h3>Listado de Clases</h3>
                <p>Clases del profesor con sus datos de operación visibles para administración.</p>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Curso</th>
                    <th>Asignatura</th>
                    <th>Profesor ID</th>
                    <th>Estudiantes</th>
                    <th>Activa</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.id}</td>
                      <td>{row.curso_nombre}</td>
                      <td>{row.asignatura_nombre}</td>
                      <td>{row.profesor_id ?? '-'}</td>
                      <td>{row.total_estudiantes ?? '-'}</td>
                      <td>{row.activo ? 'Si' : 'No'}</td>
                    </tr>
                  ))}
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan="6">Sin registros</td>
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
