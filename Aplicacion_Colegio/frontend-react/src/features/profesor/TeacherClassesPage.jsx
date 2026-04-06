import { useEffect, useState } from 'react';

import { apiClient } from '../../lib/apiClient';

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
          <p>Consume `GET /api/v1/profesor/clases/`.</p>
        </div>
      </header>

      {loading ? <p>Cargando clases...</p> : null}
      {error ? <div className="error-box">{error}</div> : null}

      <article className="card" style={{ marginBottom: '0.8rem' }}>
        <h3>Tendencias del Profesor</h3>
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
          <div className="summary-grid" style={{ marginTop: '0.6rem' }}>
            <div className="summary-tile">
              <small>Promedio general</small>
              <strong>{trends.tendencia_general.promedio_general ?? '-'}</strong>
            </div>
            <div className="summary-tile">
              <small>Asistencia general</small>
              <strong>{trends.tendencia_general.porcentaje_asistencia ?? 0}%</strong>
            </div>
            <div className="summary-tile">
              <small>Total clases</small>
              <strong>{trends.tendencia_general.total_clases ?? 0}</strong>
            </div>
          </div>
        ) : null}

        {!loadingTrends && !trendsError && Array.isArray(trends?.asistencia_mensual) && trends.asistencia_mensual.length ? (
          <div style={{ marginTop: '0.6rem' }}>
            <h4 style={{ margin: '0 0 0.3rem' }}>Asistencia mensual</h4>
            <ul>
              {trends.asistencia_mensual.map((item) => (
                <li key={item.mes}>
                  {item.mes}: {item.porcentaje}% ({item.total_registros} registros)
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </article>

      <article className="card" style={{ marginBottom: '0.8rem' }}>
        <h3>Mi Horario Semanal</h3>
        {loadingSchedule ? <p>Cargando horario...</p> : null}
        {scheduleError ? <div className="error-box">{scheduleError}</div> : null}

        {!loadingSchedule && !scheduleError && schedule ? (
          <>
            <p style={{ margin: '0 0 0.5rem' }}>
              Bloques totales: <strong>{schedule.total_bloques ?? 0}</strong>
            </p>
            <div className="grid-2">
              {Object.entries(schedule.horario || {}).map(([dia, bloques]) => (
                <article key={dia} className="info-box">
                  <h4 style={{ marginTop: 0 }}>{dia}</h4>
                  {Array.isArray(bloques) && bloques.length ? (
                    <ul>
                      {bloques.map((bloque) => (
                        <li key={bloque.id || `${dia}-${bloque.bloque_numero}-${bloque.hora_inicio}`}>
                          Bloque {bloque.bloque_numero} ({bloque.hora_inicio} - {bloque.hora_fin}) - {bloque.curso_nombre} / {bloque.asignatura_nombre}
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
      </article>

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

      {!loadingTrends && !trendsError && Array.isArray(trends?.tendencias_por_clase) && trends.tendencias_por_clase.length ? (
        <div className="table-wrap" style={{ marginTop: '0.8rem' }}>
          <table>
            <thead>
              <tr>
                <th>Curso</th>
                <th>Asignatura</th>
                <th>Promedio actual</th>
                <th>Promedio anterior</th>
                <th>Tendencia</th>
                <th>Aprobacion</th>
                <th>Asistencia</th>
              </tr>
            </thead>
            <tbody>
              {trends.tendencias_por_clase.map((row) => (
                <tr key={row.clase_id}>
                  <td>{row.curso}</td>
                  <td>{row.asignatura}</td>
                  <td>{row.promedio_actual ?? '-'}</td>
                  <td>{row.promedio_anterior ?? '-'}</td>
                  <td>{row.tendencia || 'sin dato'}</td>
                  <td>{row.porcentaje_aprobacion ?? 0}%</td>
                  <td>{row.porcentaje_asistencia ?? 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
