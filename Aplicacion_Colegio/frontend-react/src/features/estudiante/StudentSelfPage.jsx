import { useEffect, useMemo, useState } from 'react';

import { apiClient } from '../../lib/apiClient';

function formatNumber(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return String(value);
  }

  return numericValue.toFixed(1).replace(/\.0$/, '');
}

function formatPercentage(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  return `${formatNumber(value)}%`;
}

function buildAverage(items) {
  const numericValues = items
    .map((item) => Number(item?.promedio))
    .filter((value) => !Number.isNaN(value));

  if (!numericValues.length) {
    return null;
  }

  const total = numericValues.reduce((acc, value) => acc + value, 0);
  return total / numericValues.length;
}

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

  const profileCards = useMemo(() => {
    const subjectCount = classes.length;
    const gradeAverage = buildAverage(history?.asignaturas || []);
    const attendanceAverage = history?.asignaturas?.length
      ? buildAverage(history.asignaturas.map((item) => ({ promedio: item.porcentaje_asistencia })))
      : null;
    const pendingTasks = Array.isArray(grades)
      ? grades.reduce((acc, item) => acc + (Number(item?.pendientes) || 0), 0)
      : 0;

    return [
      {
        title: 'Mi Curso',
        value: profile?.curso_actual || profile?.curso || 'Sin curso',
        subtitle: profile?.colegio || profile?.escuela || 'Perfil estudiante',
      },
      {
        title: 'Asignaturas',
        value: subjectCount,
        subtitle: subjectCount > 0 ? 'Clases activas en el ciclo' : 'Sin clases registradas',
      },
      {
        title: 'Promedio general',
        value: gradeAverage !== null ? formatNumber(gradeAverage) : '-',
        subtitle: gradeAverage !== null ? 'Promedio ponderado del historial' : 'Aún no hay notas suficientes',
      },
      {
        title: 'Asistencia',
        value: attendanceAverage !== null ? formatPercentage(attendanceAverage) : '-',
        subtitle: attendanceAverage !== null ? 'Promedio del ciclo actual' : 'Sin datos de asistencia',
      },
      {
        title: 'Tareas pendientes',
        value: pendingTasks,
        subtitle: pendingTasks > 0 ? 'Revisa tareas abiertas' : 'Sin tareas pendientes',
      },
    ];
  }, [classes.length, grades, history, profile]);

  const historyAverage = useMemo(() => buildAverage(history?.asignaturas || []), [history]);

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
          <p>Resumen personal con perfil, clases, notas, asistencia e historial académico.</p>
        </div>
      </header>

      {loading ? (
        <div className="card section-card">
          <p>Cargando tu panel...</p>
          <div className="summary-grid" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="summary-tile" style={{ minHeight: 96 }} />
            ))}
          </div>
        </div>
      ) : null}
      {error ? <div className="error-box">{error}</div> : null}

      {!loading && !error ? (
        <div className="stack">
          <div className="summary-grid">
            {profileCards.map((card) => (
              <article key={card.title} className="summary-tile">
                <small>{card.title}</small>
                <strong>{card.value}</strong>
                <span>{card.subtitle}</span>
              </article>
            ))}
          </div>

          <div className="grid-2">
            <article className="card section-card">
              <h3>Mi Perfil</h3>
              <dl className="detail-list">
                <div>
                  <dt>Nombre</dt>
                  <dd>{profile?.nombre_completo || profile?.nombre || 'Pendiente'}</dd>
                </div>
                <div>
                  <dt>Correo</dt>
                  <dd>{profile?.email || profile?.correo || 'Pendiente'}</dd>
                </div>
                <div>
                  <dt>RUT</dt>
                  <dd>{profile?.rut || 'Pendiente'}</dd>
                </div>
                <div>
                  <dt>Curso actual</dt>
                  <dd>{profile?.curso_actual || profile?.curso || 'Sin asignar'}</dd>
                </div>
              </dl>
            </article>

            <article className="card section-card">
              <h3>Mis Clases</h3>
              {classes.length ? (
                <ul className="compact-list">
                  {classes.slice(0, 6).map((item) => (
                    <li key={item.clase_id || item.id || `${item.curso}-${item.asignatura}`}>
                      <strong>{item.asignatura || item.nombre || 'Asignatura'}</strong>
                      <span>{item.curso || item.curso_nombre || 'Curso no disponible'}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No hay clases asignadas todavía.</p>
              )}
            </article>

            <article className="card section-card">
              <h3>Mis Notas</h3>
              {grades.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Evaluación</th>
                        <th>Curso</th>
                        <th>Nota</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grades.slice(0, 8).map((item, index) => (
                        <tr key={item.evaluacion_id || item.id || `${item.nombre}-${index}`}>
                          <td>{item.evaluacion || item.nombre || 'Evaluación'}</td>
                          <td>{item.curso || item.clase || 'Curso'}</td>
                          <td>{formatNumber(item.nota ?? item.promedio)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>Sin notas registradas por ahora.</p>
              )}
            </article>

            <article className="card section-card">
              <h3>Mi Asistencia</h3>
              {attendance.length ? (
                <ul className="compact-list">
                  {attendance.slice(0, 8).map((item, index) => (
                    <li key={item.id || item.fecha || index}>
                      <strong>{item.fecha || item.dia || 'Registro'}</strong>
                      <span>{item.estado || item.porcentaje || 'Sin estado'}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Sin registros de asistencia todavía.</p>
              )}
            </article>
          </div>

          <article className="card section-card grid-full">
            <h3>Historial Académico</h3>

            <div className="actions">
              <label>
                Ciclo académico
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
              <div className="summary-grid section-card">
                <article className="summary-tile">
                  <small>Ciclo activo</small>
                  <strong>{history.ciclo.nombre}</strong>
                  <span>{history.ciclo.estado || 'Activo'}</span>
                </article>
                <article className="summary-tile">
                  <small>Asignaturas</small>
                  <strong>{(history.asignaturas || []).length}</strong>
                  <span>Consolidado del ciclo</span>
                </article>
                <article className="summary-tile">
                  <small>Promedio general</small>
                  <strong>{historyAverage !== null ? formatNumber(historyAverage) : '-'}</strong>
                  <span>Promedio de asignaturas con nota</span>
                </article>
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
                        <td>{formatNumber(item.promedio)}</td>
                        <td>{formatPercentage(item.porcentaje_asistencia)}</td>
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
