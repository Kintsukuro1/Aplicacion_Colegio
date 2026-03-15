import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import PaginationControls from '../../components/PaginationControls';
import { apiClient } from '../../lib/apiClient';
import { hasCapability } from '../../lib/capabilities';
import { asPaginated } from '../../lib/httpHelpers';

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
          <p>Lectura desde `GET /api/v1/profesor/clases/`.</p>
        </div>
      </header>

      {loading ? <p>Cargando clases...</p> : null}
      {error ? <div className="error-box">{error}</div> : null}

      {!loading && !error ? (
        <>
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
