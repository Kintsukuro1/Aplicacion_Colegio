import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

import { apiClient } from '../../lib/apiClient';

const SCOPES = ['auto', 'self', 'school', 'analytics'];

const SCOPE_LABELS = {
  auto: 'Automático',
  self: 'Mi Perfil',
  school: 'Colegio',
  analytics: 'Analítica',
};

function KpiCard({ title, value, subtitle, trend, color }) {
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : null;
  const trendClass = trend === 'up' ? 'badge-active' : trend === 'down' ? 'badge-danger' : '';

  return (
    <article className="card" style={{ position: 'relative' }}>
      <small style={{ color: 'var(--muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </small>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.3rem' }}>
        <strong style={{ fontSize: '1.8rem', color: color || 'var(--ink)' }}>
          {value ?? '—'}
        </strong>
        {trendIcon ? (
          <span className={`badge ${trendClass}`}>{trendIcon}</span>
        ) : null}
      </div>
      {subtitle ? (
        <p style={{ margin: '0.3rem 0 0', color: 'var(--muted)', fontSize: '0.82rem' }}>{subtitle}</p>
      ) : null}
    </article>
  );
}

function QuickActions({ scope }) {
  const actions = [];

  if (scope === 'school' || scope === 'auto') {
    actions.push(
      { label: '📋 Estudiantes', to: '/admin-escolar/estudiantes' },
      { label: '📊 Asistencias', to: '/admin-escolar/asistencias' },
      { label: '📝 Evaluaciones', to: '/admin-escolar/evaluaciones' },
      { label: '📥 Importar Datos', to: '/admin-escolar/importacion-exportacion' },
    );
  } else if (scope === 'self') {
    actions.push(
      { label: '👤 Mi Perfil', to: '/estudiante/panel' },
    );
  }

  if (actions.length === 0) return null;

  return (
    <article className="card" style={{ marginTop: '0.8rem' }}>
      <h3>Acciones Rápidas</h3>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {actions.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            style={{
              padding: '0.5rem 0.8rem',
              borderRadius: '8px',
              background: 'var(--brand-light)',
              color: 'var(--brand-strong)',
              fontWeight: 600,
              fontSize: '0.88rem',
              textDecoration: 'none',
              transition: 'background 0.15s',
            }}
          >
            {a.label}
          </Link>
        ))}
      </div>
    </article>
  );
}

function formatLabel(rawKey) {
  return rawKey
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function extractKpis(data, scope) {
  if (!data?.sections) return [];

  const kpis = [];

  if (scope === 'school' || scope === 'auto') {
    const s = data.sections.school || {};
    if (s.students !== undefined) kpis.push({ title: 'Estudiantes', value: s.students, color: 'var(--brand)' });
    if (s.teachers !== undefined) kpis.push({ title: 'Profesores', value: s.teachers, color: 'var(--brand)' });
    if (s.courses_active !== undefined) kpis.push({ title: 'Cursos Activos', value: s.courses_active });
    if (s.classes_active !== undefined) kpis.push({ title: 'Clases Activas', value: s.classes_active });
    if (s.attendance_today !== undefined) kpis.push({ title: 'Asistencia Hoy', value: s.attendance_today, subtitle: 'Registros del día' });
    if (s.evaluations_upcoming !== undefined) kpis.push({ title: 'Evaluaciones Próximas', value: s.evaluations_upcoming, color: s.evaluations_upcoming > 0 ? 'var(--warning)' : undefined });
  }

  if (scope === 'analytics' || scope === 'auto') {
    const a = data.sections.analytics || {};
    if (a.attendance_today_total !== undefined) {
      const rate = a.attendance_rate_today ?? 0;
      kpis.push({
        title: 'Tasa Asistencia Hoy',
        value: `${rate}%`,
        trend: rate >= 85 ? 'up' : rate < 70 ? 'down' : null,
        subtitle: `${a.attendance_today_present ?? 0} de ${a.attendance_today_total} presentes`,
        color: rate >= 85 ? 'var(--success)' : rate < 70 ? 'var(--danger)' : undefined,
      });
    }
    if (a.evaluations_next_7_days !== undefined) kpis.push({ title: 'Evaluaciones 7 Días', value: a.evaluations_next_7_days });
    if (a.grades_below_4 !== undefined) kpis.push({ title: 'Notas Bajo 4.0', value: a.grades_below_4, color: a.grades_below_4 > 0 ? 'var(--danger)' : 'var(--success)' });
  }

  if (scope === 'self') {
    const s = data.sections.self || {};
    Object.entries(s).filter(([k, v]) => k !== 'today' && v !== null && v !== undefined).forEach(([key, val]) => {
      kpis.push({ title: formatLabel(key), value: String(val) });
    });
  }

  return kpis;
}

export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialScope = searchParams.get('scope');
  const [scope, setScope] = useState(SCOPES.includes(initialScope) ? initialScope : 'auto');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

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

    async function loadDashboard() {
      setLoading(true);
      setError('');
      try {
        const response = await apiClient.get(`/api/v1/dashboard/resumen/?scope=${scope}`);
        if (active) {
          setData(response);
        }
      } catch (err) {
        if (active) {
          setError(err.payload?.detail || 'No se pudo cargar dashboard.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, [scope]);

  const kpis = extractKpis(data, data?.scope || scope);

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>
            {data ? (
              <>
                Vista: <strong>{data.scope}</strong> · Contrato: <strong>{data.contract_version}</strong>
              </>
            ) : (
              'Cargando métricas...'
            )}
          </p>
        </div>
        <label>
          Vista
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            {SCOPES.map((item) => (
              <option key={item} value={item}>
                {SCOPE_LABELS[item] || item}
              </option>
            ))}
          </select>
        </label>
      </header>

      {loading ? (
        <div className="loading-dot">
          <span /><span /><span />
        </div>
      ) : null}
      {error ? <div className="error-box">{error}</div> : null}

      {!loading && data ? (
        <>
          <div className="grid-2">
            {kpis.map((kpi) => (
              <KpiCard key={kpi.title} {...kpi} />
            ))}
          </div>

          {data.available_scopes?.length > 0 ? (
            <article className="card" style={{ marginTop: '0.8rem' }}>
              <h3>Scopes Disponibles</h3>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {data.available_scopes.map((s) => (
                  <span key={s} className={`badge ${s === data.scope ? 'badge-active' : 'badge-inactive'}`}>
                    {s}
                  </span>
                ))}
              </div>
            </article>
          ) : null}

          <QuickActions scope={data.scope || scope} />
        </>
      ) : null}
    </section>
  );
}
