import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { apiClient } from '../../lib/apiClient';

const SCOPES = ['school', 'analytics'];

function MetricCard({ title, value }) {
  return (
    <article className="card">
      <h3>{title}</h3>
      <p style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>{value ?? '-'}</p>
    </article>
  );
}

export default function AdminOverviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialScope = searchParams.get('scope');
  const [scope, setScope] = useState(SCOPES.includes(initialScope) ? initialScope : 'school');
  const [data, setData] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [cycleStats, setCycleStats] = useState(null);
  const [cycleError, setCycleError] = useState('');
  const [transitionMessage, setTransitionMessage] = useState('');
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const currentScope = searchParams.get('scope');
    if (currentScope === scope) {
      return;
    }
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('scope', scope);
    setSearchParams(nextParams, { replace: true });
  }, [scope, searchParams, setSearchParams]);

  useEffect(() => {
    let active = true;

    async function loadOverview() {
      setLoading(true);
      setError('');
      try {
        const [payload, cyclesPayload] = await Promise.all([
          apiClient.get(`/api/v1/dashboard/resumen/?scope=${scope}`),
          apiClient.get('/api/v1/ciclos-academicos/').catch(() => ({ results: [] })),
        ]);
        if (active) {
          setData(payload);
          const cycleRows = Array.isArray(cyclesPayload?.results) ? cyclesPayload.results : [];
          setCycles(cycleRows);
          if (!selectedCycleId && cycleRows.length) {
            setSelectedCycleId(String(cycleRows[0].id));
          }
        }
      } catch (err) {
        if (active) {
          setError(err.payload?.detail || 'No se pudo cargar panel admin escolar.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadOverview();
    return () => {
      active = false;
    };
  }, [scope, selectedCycleId]);

  useEffect(() => {
    if (!selectedCycleId) {
      setCycleStats(null);
      return;
    }

    let active = true;
    async function loadCycleStats() {
      setCycleError('');
      setTransitionMessage('');
      try {
        const payload = await apiClient.get(`/api/v1/ciclos-academicos/${selectedCycleId}/estadisticas/`);
        if (active) {
          setCycleStats(payload);
        }
      } catch (err) {
        if (active) {
          setCycleStats(null);
          setCycleError(err.payload?.detail || 'No se pudieron cargar estadisticas del ciclo.');
        }
      }
    }

    loadCycleStats();
    return () => {
      active = false;
    };
  }, [selectedCycleId]);

  async function refreshCycles() {
    const cyclesPayload = await apiClient.get('/api/v1/ciclos-academicos/');
    const cycleRows = Array.isArray(cyclesPayload?.results) ? cyclesPayload.results : [];
    setCycles(cycleRows);
    if (!cycleRows.some((item) => String(item.id) === String(selectedCycleId)) && cycleRows.length) {
      setSelectedCycleId(String(cycleRows[0].id));
    }
  }

  async function transitionCycle(nuevoEstado) {
    if (!selectedCycleId) {
      return;
    }
    setTransitionLoading(true);
    setCycleError('');
    setTransitionMessage('');
    try {
      const payload = await apiClient.post(`/api/v1/ciclos-academicos/${selectedCycleId}/transicion/`, {
        nuevo_estado: nuevoEstado,
      });
      setTransitionMessage(
        `Transicion aplicada: ${payload.estado_anterior} -> ${payload.estado_actual}${
          Array.isArray(payload.warnings) && payload.warnings.length ? ` | Alertas: ${payload.warnings.join(' | ')}` : ''
        }`,
      );
      const statsPayload = await apiClient.get(`/api/v1/ciclos-academicos/${selectedCycleId}/estadisticas/`);
      setCycleStats(statsPayload);
      await refreshCycles();
    } catch (err) {
      setCycleError(err.payload?.detail || err.payload?.nuevo_estado || 'No se pudo aplicar transicion.');
    } finally {
      setTransitionLoading(false);
    }
  }

  const metrics = useMemo(() => {
    if (!data || !data.sections) {
      return [];
    }

    if (scope === 'school') {
      const school = data.sections.school || {};
      return [
        { title: 'Estudiantes', value: school.students },
        { title: 'Profesores', value: school.teachers },
        { title: 'Cursos Activos', value: school.courses_active },
        { title: 'Clases Activas', value: school.classes_active },
        { title: 'Asistencia Hoy', value: school.attendance_today },
        { title: 'Evaluaciones Proximas', value: school.evaluations_upcoming },
      ];
    }

    const analytics = data.sections.analytics || {};
    return [
      { title: 'Asistencias Hoy (Total)', value: analytics.attendance_today_total },
      { title: 'Asistencias Hoy (Presentes)', value: analytics.attendance_today_present },
      { title: 'Tasa Asistencia Hoy', value: `${analytics.attendance_rate_today ?? 0}%` },
      { title: 'Evaluaciones 7 Dias', value: analytics.evaluations_next_7_days },
      { title: 'Notas Bajo 4.0', value: analytics.grades_below_4 },
    ];
  }, [data, scope]);

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Panel Administrativo</h2>
          <p>Resumen general del colegio y gestión de ciclos académicos.</p>
        </div>
        <label>
          Vista
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            {SCOPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </header>

      {loading ? <p>Cargando panel...</p> : null}
      {error ? <div className="error-box">{error}</div> : null}

      {!loading && !error ? (
        <>
          <div className="grid-2">
            {metrics.map((metric) => (
              <MetricCard key={metric.title} title={metric.title} value={metric.value} />
            ))}
          </div>

          <article className="card" style={{ marginTop: '0.8rem' }}>
            <h3>Gestion de Ciclos Academicos</h3>
            <div className="actions" style={{ marginBottom: '0.6rem' }}>
              <label>
                Ciclo
                <select value={selectedCycleId} onChange={(e) => setSelectedCycleId(e.target.value)}>
                  <option value="">Seleccionar</option>
                  {cycles.map((cycle) => (
                    <option key={cycle.id} value={cycle.id}>
                      {cycle.nombre} ({cycle.estado})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {cycleError ? <div className="error-box">{cycleError}</div> : null}
            {transitionMessage ? <div className="info-box">{transitionMessage}</div> : null}

            {cycleStats ? (
              <>
                <div className="summary-grid">
                  <div className="summary-tile">
                    <small>Estado</small>
                    <strong>{cycleStats.ciclo?.estado || '-'}</strong>
                  </div>
                  <div className="summary-tile">
                    <small>Matriculas</small>
                    <strong>{cycleStats.matriculas?.total ?? 0}</strong>
                  </div>
                  <div className="summary-tile">
                    <small>Cursos activos</small>
                    <strong>{cycleStats.academico?.cursos ?? 0}</strong>
                  </div>
                  <div className="summary-tile">
                    <small>Promedio general</small>
                    <strong>{cycleStats.academico?.promedio_general ?? '-'}</strong>
                  </div>
                  <div className="summary-tile">
                    <small>Asistencia</small>
                    <strong>{cycleStats.academico?.porcentaje_asistencia ?? 0}%</strong>
                  </div>
                  <div className="summary-tile">
                    <small>Tasa cobranza</small>
                    <strong>{cycleStats.financiero?.tasa_cobranza ?? 0}%</strong>
                  </div>
                </div>

                <div className="actions" style={{ marginTop: '0.8rem', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => transitionCycle('PLANIFICACION')} disabled={transitionLoading || !selectedCycleId}>
                    PLANIFICACION
                  </button>
                  <button type="button" onClick={() => transitionCycle('ACTIVO')} disabled={transitionLoading || !selectedCycleId}>
                    ACTIVO
                  </button>
                  <button type="button" onClick={() => transitionCycle('EVALUACION')} disabled={transitionLoading || !selectedCycleId}>
                    EVALUACION
                  </button>
                  <button type="button" onClick={() => transitionCycle('FINALIZADO')} disabled={transitionLoading || !selectedCycleId}>
                    FINALIZADO
                  </button>
                  <button type="button" className="danger" onClick={() => transitionCycle('CERRADO')} disabled={transitionLoading || !selectedCycleId}>
                    CERRADO
                  </button>
                </div>
              </>
            ) : (
              <p>Selecciona un ciclo para ver estadisticas.</p>
            )}
          </article>
        </>
      ) : null}
    </section>
  );
}
