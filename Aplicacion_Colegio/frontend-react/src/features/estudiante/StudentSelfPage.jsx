import { useEffect, useState } from 'react';

import { apiClient } from '../../lib/apiClient';

export default function StudentSelfPage() {
  const [profile, setProfile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [grades, setGrades] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [history, setHistory] = useState(null);
  const [selectedCycle, setSelectedCycle] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadAcademicHistory(cycleId = '') {
    setLoadingHistory(true);
    setHistoryError('');
    try {
      const query = cycleId ? `?ciclo=${cycleId}` : '';
      const payload = await apiClient.get(`/api/v1/estudiante/historial-academico/${query}`);
      setHistory(payload || null);
      if (!cycleId && payload?.ciclo?.id) {
        setSelectedCycle(String(payload.ciclo.id));
      }
    } catch (err) {
      setHistory(null);
      setHistoryError(err.payload?.detail || 'No se pudo cargar el historial academico.');
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadStudentData() {
      setLoading(true);
      setError('');
      try {
        const [p, c, g, a] = await Promise.all([
          apiClient.get('/api/v1/estudiante/mi-perfil/'),
          apiClient.get('/api/v1/estudiante/mis-clases/'),
          apiClient.get('/api/v1/estudiante/mis-notas/'),
          apiClient.get('/api/v1/estudiante/mi-asistencia/'),
        ]);
        await loadAcademicHistory();
        if (active) {
          setProfile(p);
          setClasses(c || []);
          setGrades(g || []);
          setAttendance(a || []);
        }
      } catch (err) {
        if (active) {
          setError(err.payload?.detail || 'No se pudo cargar vista estudiante.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadStudentData();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedCycle) {
      return;
    }
    loadAcademicHistory(selectedCycle);
  }, [selectedCycle]);

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Estudiante: Mi Panel</h2>
          <p>Consume endpoints `estudiante/*` de API v1.</p>
        </div>
      </header>

      {loading ? <p>Cargando datos...</p> : null}
      {error ? <div className="error-box">{error}</div> : null}

      {!loading && !error ? (
        <div className="grid-2">
          <article className="card">
            <h3>Mi Perfil</h3>
            <pre>{JSON.stringify(profile, null, 2)}</pre>
          </article>
          <article className="card">
            <h3>Mis Clases ({classes.length})</h3>
            <pre>{JSON.stringify(classes, null, 2)}</pre>
          </article>
          <article className="card">
            <h3>Mis Notas ({grades.length})</h3>
            <pre>{JSON.stringify(grades, null, 2)}</pre>
          </article>
          <article className="card">
            <h3>Mi Asistencia ({attendance.length})</h3>
            <pre>{JSON.stringify(attendance, null, 2)}</pre>
          </article>

          <article className="card" style={{ gridColumn: '1 / -1' }}>
            <h3>Historial Academico</h3>

            <div className="actions">
              <label>
                Ciclo academico
                <select value={selectedCycle} onChange={(e) => setSelectedCycle(e.target.value)}>
                  {(history?.ciclos_disponibles || []).map((ciclo) => (
                    <option key={ciclo.id} value={ciclo.id}>
                      {ciclo.nombre} ({ciclo.estado})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {loadingHistory ? <p>Cargando historial...</p> : null}
            {historyError ? <div className="error-box">{historyError}</div> : null}

            {!loadingHistory && !historyError && history?.ciclo ? (
              <div className="summary-grid" style={{ marginBottom: '0.6rem' }}>
                <div className="summary-tile">
                  <small>Ciclo activo</small>
                  <strong>{history.ciclo.nombre}</strong>
                </div>
                <div className="summary-tile">
                  <small>Asignaturas</small>
                  <strong>{(history.asignaturas || []).length}</strong>
                </div>
                <div className="summary-tile">
                  <small>Promedio general</small>
                  <strong>
                    {(history.asignaturas || []).length
                      ? (() => {
                          const conPromedio = (history.asignaturas || []).filter((item) => item.promedio !== null && item.promedio !== undefined);
                          if (!conPromedio.length) {
                            return '-';
                          }
                          const total = conPromedio.reduce((acc, item) => acc + item.promedio, 0);
                          return (total / conPromedio.length).toFixed(1);
                        })()
                      : '-'}
                  </strong>
                </div>
              </div>
            ) : null}

            {!loadingHistory && !historyError && Array.isArray(history?.asignaturas) && history.asignaturas.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Asignatura</th>
                      <th>Curso</th>
                      <th>Promedio</th>
                      <th>Asistencia</th>
                      <th>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.asignaturas.map((item) => (
                      <tr key={item.clase_id}>
                        <td>{item.asignatura}</td>
                        <td>{item.curso}</td>
                        <td>{item.promedio ?? '-'}</td>
                        <td>{item.porcentaje_asistencia ?? 0}%</td>
                        <td>{Array.isArray(item.notas) && item.notas.length ? item.notas.join(', ') : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </article>
        </div>
      ) : null}
    </section>
  );
}
