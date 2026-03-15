import { useEffect, useState } from 'react';

import { apiClient } from '../../lib/apiClient';

export default function TeacherClassesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadClasses() {
      setLoading(true);
      setError('');
      try {
        const response = await apiClient.get('/api/v1/profesor/clases/');
        if (active) {
          setRows(response.results || []);
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
  }, []);

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Profesor: Mis Clases</h2>
          <p>Consume `GET /api/v1/profesor/clases/`.</p>
        </div>
      </header>

      {loading ? <p>Cargando clases...</p> : null}
      {error ? <div className="error-box">{error}</div> : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Curso</th>
              <th>Asignatura</th>
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
                <td>{row.total_estudiantes}</td>
                <td>{row.activo ? 'Si' : 'No'}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan="5">Sin resultados</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
