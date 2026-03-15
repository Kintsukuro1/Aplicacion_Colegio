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
        const payload = await apiClient.get(`/api/v1/dashboard/resumen/?scope=${scope}`);
        if (active) {
          setData(payload);
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
  }, [scope]);

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
          <h2>Admin Escolar: Panel</h2>
          <p>Resumen ejecutivo con contrato `dashboard/resumen`.</p>
        </div>
        <label>
          Scope
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
            <h3>Contexto API</h3>
            <pre>{JSON.stringify(data?.context || {}, null, 2)}</pre>
          </article>
        </>
      ) : null}
    </section>
  );
}
