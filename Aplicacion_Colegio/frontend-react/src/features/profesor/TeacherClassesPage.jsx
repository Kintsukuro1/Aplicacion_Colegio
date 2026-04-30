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

function TeacherClassesLoadingState() {
  return (
    <article className="card section-card" aria-busy="true" aria-live="polite" role="status">
      <div className="section-card-head">
        <div>
          <div style={{ height: '12px', width: '110px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.18)', marginBottom: '0.75rem' }} />
          <div style={{ height: '26px', width: '240px', borderRadius: '12px', background: 'rgba(148, 163, 184, 0.14)' }} />
          <div style={{ height: '14px', width: '300px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.12)', marginTop: '0.9rem' }} />
        </div>
      </div>

      <div className="summary-grid" style={{ marginTop: '1.25rem' }}>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="summary-tile" style={{ minHeight: '108px', background: 'rgba(148, 163, 184, 0.08)' }}>
            <div style={{ height: '12px', width: '84px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.18)', marginBottom: '0.85rem' }} />
            <div style={{ height: '26px', width: index === 1 ? '72px' : '96px', borderRadius: '12px', background: 'rgba(148, 163, 184, 0.14)' }} />
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginTop: '1.25rem' }}>
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="card section-card" style={{ minHeight: '220px' }}>
            <div style={{ height: '18px', width: '170px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.18)', marginBottom: '1rem' }} />
            <div style={{ height: '150px', borderRadius: '16px', background: 'linear-gradient(90deg, rgba(148,163,184,0.08), rgba(148,163,184,0.14), rgba(148,163,184,0.08))' }} />
          </div>
        ))}
      </div>
    </article>
  );
}

export default function TeacherClassesPage() {
  const [rows, setRows] = useState([]);
  const [trends, setTrends] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [periodo, setPeriodo] = useState('semestre');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [trendsError, setTrendsError] = useState('');
  const [scheduleError, setScheduleError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const summary = useMemo(() => {
    const totalClasses = rows.length;
    const activeClasses = rows.filter((row) => row.activo).length;
    const totalStudents = rows.reduce((acc, row) => acc + (Number(row.total_estudiantes) || 0), 0);
    const averageAttendance = trends?.tendencia_general?.porcentaje_asistencia;
    const averageGrade = trends?.tendencia_general?.promedio_general;

    return [
      {
        title: 'Clases cargadas',
        value: totalClasses,
        subtitle: totalClasses > 0 ? `${activeClasses} activas` : 'Sin clases por ahora',
      },
      {
        title: 'Estudiantes',
        value: totalStudents,
        subtitle: totalStudents > 0 ? 'Distribuidos en tus cursos' : 'Sin estudiantes registrados',
      },
      {
        title: 'Promedio general',
        value: averageGrade !== undefined && averageGrade !== null ? formatNumber(averageGrade) : '-',
        subtitle: averageGrade ? 'Del periodo seleccionado' : 'Sin datos de promedio',
      },
      {
        title: 'Asistencia general',
        value: averageAttendance !== undefined && averageAttendance !== null ? formatPercentage(averageAttendance) : '-',
        subtitle: averageAttendance !== undefined ? 'Consolidado de tendencias' : 'Sin datos de asistencia',
      },
    ];
  }, [rows, trends]);

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

  useEffect(() => {
    let active = true;

    async function loadTrends() {
      setLoadingTrends(true);
      setTrendsError('');
      try {
        const params = new URLSearchParams({ periodo });
        if (selectedClassId) {
          params.set('clase_id', selectedClassId);
        }
        const response = await apiClient.get(`/api/v1/profesor/tendencias/?${params.toString()}`);
        if (active) {
          setTrends(response);
        }
      } catch (err) {
        if (active) {
          setTrends(null);
          setTrendsError(err.payload?.detail || 'No se pudieron cargar tendencias docentes.');
        }
      } finally {
        if (active) {
          setLoadingTrends(false);
        }
      }
    }

    loadTrends();
    return () => {
      active = false;
    };
  }, [periodo, selectedClassId]);

  useEffect(() => {
    if (!selectedClassId) {
      return;
    }
    const exists = rows.some((row) => String(row.id) === String(selectedClassId));
    if (!exists) {
      setSelectedClassId('');
    }
  }, [rows, selectedClassId]);

  useEffect(() => {
    let active = true;

    async function loadSchedule() {
      setLoadingSchedule(true);
      setScheduleError('');
      try {
        const response = await apiClient.get('/api/v1/profesor/mi-horario/');
        if (active) {
          setSchedule(response || null);
        }
      } catch (err) {
        if (active) {
          setSchedule(null);
          setScheduleError(err.payload?.detail || 'No se pudo cargar el horario docente.');
        }
      } finally {
        if (active) {
          setLoadingSchedule(false);
        }
      }
    }

    loadSchedule();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Profesor: Mis Clases</h2>
          <p>Vista operativa de clases, tendencias y horario semanal.</p>
        </div>
      </header>

      {loading ? <TeacherClassesLoadingState /> : null}
      {error ? <div className="error-box">{error}</div> : null}

      {!loading && !error ? (
        <div className="summary-grid">
          {summary.map((item) => (
            <article key={item.title} className="summary-tile">
              <small>{item.title}</small>
              <strong>{item.value}</strong>
              <span>{item.subtitle}</span>
            </article>
          ))}
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="grid-2">
          <article className="card section-card">
            <div className="section-card-head">
              <div>
                <h3>Tendencias del Profesor</h3>
                <p>Filtra por periodo y clase para ver la evolución del curso.</p>
              </div>
            </div>

            <div className="actions">
              <label>
                Periodo
                <select value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
                  <option value="mes">Mes</option>
                  <option value="semestre">Semestre</option>
                  <option value="anual">Anual</option>
                </select>
              </label>
              <label>
                Clase
                <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
                  <option value="">Todas</option>
                  {rows.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.curso_nombre} - {row.asignatura_nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {loadingTrends ? <p>Cargando tendencias...</p> : null}
            {trendsError ? <div className="error-box">{trendsError}</div> : null}

            {!loadingTrends && !trendsError && trends?.tendencia_general ? (
              <div className="summary-grid section-card">
                <article className="summary-tile">
                  <small>Promedio general</small>
                  <strong>{formatNumber(trends.tendencia_general.promedio_general)}</strong>
                </article>
                <article className="summary-tile">
                  <small>Asistencia general</small>
                  <strong>{formatPercentage(trends.tendencia_general.porcentaje_asistencia)}</strong>
                </article>
                <article className="summary-tile">
                  <small>Total clases</small>
                  <strong>{trends.tendencia_general.total_clases ?? 0}</strong>
                </article>
              </div>
            ) : null}

            {!loadingTrends && !trendsError && !trends?.tendencia_general ? (
              <p className="section-muted">No hay tendencias disponibles para el periodo seleccionado.</p>
            ) : null}

            {!loadingTrends && !trendsError && Array.isArray(trends?.asistencia_mensual) && trends.asistencia_mensual.length ? (
              <div className="monthly-list section-card">
                <h4>Asistencia mensual</h4>
                <ul>
                  {trends.asistencia_mensual.map((item) => (
                    <li key={item.mes}>
                      {item.mes}: {item.porcentaje}% ({item.total_registros} registros)
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {!loadingTrends && !trendsError && Array.isArray(trends?.asistencia_mensual) && trends.asistencia_mensual.length === 0 ? (
              <p className="section-muted">No hay registro mensual para graficar.</p>
            ) : null}
          </article>

          <article className="card section-card">
            <div className="section-card-head">
              <div>
                <h3>Mi Horario Semanal</h3>
                <p>Bloques asignados para hoy y el resto de la semana.</p>
              </div>
            </div>
            {loadingSchedule ? <p>Cargando horario...</p> : null}
            {scheduleError ? <div className="error-box">{scheduleError}</div> : null}

            {!loadingSchedule && !scheduleError && schedule ? (
              <>
                <div className="summary-grid section-card">
                  <article className="summary-tile">
                    <small>Bloques totales</small>
                    <strong>{schedule.total_bloques ?? 0}</strong>
                  </article>
                  <article className="summary-tile">
                    <small>Días con clases</small>
                    <strong>{Object.keys(schedule.horario || {}).filter((dia) => Array.isArray(schedule.horario[dia]) && schedule.horario[dia].length).length}</strong>
                  </article>
                </div>

                <div className="grid-2">
                  {Object.entries(schedule.horario || {}).map(([dia, bloques]) => (
                    <article key={dia} className="card info-box">
                      <h4>{dia}</h4>
                      {Array.isArray(bloques) && bloques.length ? (
                        <ul>
                          {bloques.map((bloque) => (
                            <li key={bloque.id || `${dia}-${bloque.bloque_numero}-${bloque.hora_inicio}`}>
                              <strong>Bloque {bloque.bloque_numero}</strong>
                              <span>{bloque.hora_inicio} - {bloque.hora_fin}</span>
                              <span>{bloque.curso_nombre} / {bloque.asignatura_nombre}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>Sin bloques asignados.</p>
                      )}
                    </article>
                  ))}
                </div>
              </>
            ) : null}

            {!loadingSchedule && !scheduleError && !schedule ? (
              <p className="section-muted">No fue posible construir el horario semanal.</p>
            ) : null}
          </article>
        </div>
      ) : null}

      {!loading && !error ? (
        <article className="card section-card">
          <div className="section-card-head">
            <div>
              <h3>Clases Asignadas</h3>
              <p>Listado operativo con acceso directo a tus clases.</p>
            </div>
          </div>

          {rows.length ? (
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
                </tbody>
              </table>
            </div>
          ) : (
            <p>No tienes clases asignadas todavía.</p>
          )}
        </article>
      ) : null}

      {!loadingTrends && !trendsError && Array.isArray(trends?.tendencias_por_clase) && trends.tendencias_por_clase.length ? (
        <article className="card section-card">
          <div className="section-card-head">
            <div>
              <h3>Tendencias por Clase</h3>
              <p>Comparativa de rendimiento y asistencia por curso.</p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Curso</th>
                  <th>Asignatura</th>
                  <th>Promedio actual</th>
                  <th>Promedio anterior</th>
                  <th>Tendencia</th>
                  <th>Aprobación</th>
                  <th>Asistencia</th>
                </tr>
              </thead>
              <tbody>
                {trends.tendencias_por_clase.map((row) => (
                  <tr key={row.clase_id}>
                    <td>{row.curso}</td>
                    <td>{row.asignatura}</td>
                    <td>{formatNumber(row.promedio_actual)}</td>
                    <td>{formatNumber(row.promedio_anterior)}</td>
                    <td>{row.tendencia || 'sin dato'}</td>
                    <td>{formatPercentage(row.porcentaje_aprobacion)}</td>
                    <td>{formatPercentage(row.porcentaje_asistencia)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      ) : null}
    </section>
  );
}
