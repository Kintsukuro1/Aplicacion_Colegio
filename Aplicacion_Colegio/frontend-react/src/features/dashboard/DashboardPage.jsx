import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

import { apiClient } from '../../lib/apiClient';
import DemoPanel from '../demo/DemoPanel';
import StatCard from '../../components/charts/StatCard';
import LineChart from '../../components/charts/LineChart';
import DonutChart from '../../components/charts/DonutChart';
import BarChart from '../../components/charts/BarChart';

const SCOPES = ['auto', 'self', 'school', 'analytics'];

const SCOPE_LABELS = {
  auto: 'Automático',
  self: 'Mi Perfil',
  school: 'Colegio',
  analytics: 'Analítica',
};

/* ── Helpers ────────────────────────────────────────── */

function formatLabel(rawKey) {
  return rawKey
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function buildStatCards(data, scope) {
  if (!data?.sections) return [];
  const cards = [];

  if (scope === 'school' || scope === 'auto') {
    const s = data.sections.school || {};
    if (s.students !== undefined) {
      cards.push({ title: 'Estudiantes', value: s.students, icon: '👥', variant: 'default' });
    }
    if (s.teachers !== undefined) {
      cards.push({ title: 'Profesores', value: s.teachers, icon: '👨‍🏫', variant: 'default' });
    }
    if (s.courses_active !== undefined) {
      cards.push({ title: 'Cursos Activos', value: s.courses_active, icon: '📚', variant: 'success' });
    }
    if (s.classes_active !== undefined) {
      cards.push({ title: 'Clases Activas', value: s.classes_active, icon: '🏫', variant: 'success' });
    }
    if (s.attendance_today !== undefined) {
      cards.push({
        title: 'Asistencia Hoy',
        value: s.attendance_today,
        subtitle: 'Registros del día',
        icon: '📋',
        variant: 'default',
      });
    }
    if (s.evaluations_upcoming !== undefined) {
      cards.push({
        title: 'Evaluaciones Próximas',
        value: s.evaluations_upcoming,
        icon: '📝',
        variant: s.evaluations_upcoming > 0 ? 'warning' : 'success',
      });
    }
  }

  if (scope === 'analytics' || scope === 'auto') {
    const a = data.sections.analytics || {};
    if (a.attendance_today_total !== undefined) {
      const rate = a.attendance_rate_today ?? 0;
      cards.push({
        title: 'Tasa Asistencia Hoy',
        value: `${rate}%`,
        trend: rate >= 85 ? 'up' : rate < 70 ? 'down' : 'stable',
        trendValue: rate >= 85 ? 'Buena' : rate < 70 ? 'Baja' : '',
        subtitle: `${a.attendance_today_present ?? 0} de ${a.attendance_today_total} presentes`,
        icon: '✅',
        variant: rate >= 85 ? 'success' : rate < 70 ? 'danger' : 'warning',
      });
    }
    if (a.evaluations_next_7_days !== undefined) {
      cards.push({
        title: 'Evaluaciones 7 Días',
        value: a.evaluations_next_7_days,
        icon: '📅',
        variant: 'default',
      });
    }
    if (a.grades_below_approval !== undefined) {
      cards.push({
        title: `Notas Bajo ${a.nota_aprobacion ?? 4.0}`,
        value: a.grades_below_approval,
        icon: '⚠️',
        variant: a.grades_below_approval > 0 ? 'danger' : 'success',
      });
    }
  }

  if (scope === 'self') {
    const s = data.sections.self || {};

    // Role-specific handling
    if (s.mis_clases !== undefined) {
      cards.push({ title: 'Mis Clases', value: s.mis_clases, icon: '🏫', variant: 'default' });
    }
    if (s.promedio_general !== undefined && s.promedio_general !== null) {
      const nota = s.nota_aprobacion ?? 4.0;
      cards.push({
        title: 'Promedio General',
        value: s.promedio_general,
        icon: '📊',
        variant: s.promedio_general >= nota ? 'success' : 'danger',
      });
    }
    if (s.porcentaje_asistencia !== undefined) {
      cards.push({
        title: 'Mi Asistencia',
        value: `${s.porcentaje_asistencia}%`,
        icon: '✅',
        variant: s.porcentaje_asistencia >= 85 ? 'success' : 'warning',
      });
    }
    if (s.tareas_pendientes !== undefined) {
      cards.push({
        title: 'Tareas Pendientes',
        value: s.tareas_pendientes,
        icon: '📝',
        variant: s.tareas_pendientes > 0 ? 'warning' : 'success',
      });
    }
    if (s.total_estudiantes !== undefined) {
      cards.push({ title: 'Mis Estudiantes', value: s.total_estudiantes, icon: '👥', variant: 'default' });
    }
    if (s.tareas_por_revisar !== undefined) {
      cards.push({
        title: 'Tareas por Revisar',
        value: s.tareas_por_revisar,
        icon: '📋',
        variant: s.tareas_por_revisar > 0 ? 'warning' : 'success',
      });
    }
    if (s.asistencia_pendiente_hoy !== undefined) {
      cards.push({
        title: 'Asistencia Pendiente',
        value: s.asistencia_pendiente_hoy,
        icon: '⏳',
        variant: s.asistencia_pendiente_hoy > 0 ? 'danger' : 'success',
      });
    }
    if (s.matriculas_activas !== undefined) {
      cards.push({ title: 'Matrículas Activas', value: s.matriculas_activas, icon: '🎓', variant: 'default' });
    }
    if (s.asistencia_promedio_mes !== undefined) {
      cards.push({
        title: 'Asistencia Promedio Mes',
        value: `${s.asistencia_promedio_mes}%`,
        icon: '📊',
        variant: s.asistencia_promedio_mes >= 85 ? 'success' : 'warning',
      });
    }
    if (s.total_morosidad !== undefined) {
      cards.push({
        title: 'Morosidad Total',
        value: `$${s.total_morosidad.toLocaleString()}`,
        subtitle: s.alumnos_morosos ? `${s.alumnos_morosos} alumnos` : undefined,
        icon: '💰',
        variant: s.total_morosidad > 0 ? 'danger' : 'success',
      });
    }

    // Pupilos (apoderado)
    if (s.pupilos?.length > 0) {
      s.pupilos.forEach((pupilo) => {
        cards.push({
          title: pupilo.nombre,
          value: pupilo.promedio ?? '—',
          subtitle: `Asistencia: ${pupilo.porcentaje_asistencia}%`,
          icon: '🧒',
          variant: (pupilo.promedio ?? 0) >= 4 ? 'success' : 'warning',
        });
      });
    }
    if (s.comunicados_sin_leer !== undefined) {
      cards.push({
        title: 'Comunicados Sin Leer',
        value: s.comunicados_sin_leer,
        icon: '📬',
        variant: s.comunicados_sin_leer > 0 ? 'warning' : 'success',
      });
    }
    if (s.plan_actual) {
      cards.push({
        title: 'Plan Actual',
        value: s.plan_actual,
        icon: '💎',
        variant: 'default',
      });
    }
  }

  return cards;
}

function buildChartData(data, scope) {
  const charts = { attendance: null, grades: null, courses: null };

  // These require the executive endpoint with chart data
  if (data?.charts) {
    if (data.charts.attendance_trend_30d?.length) {
      const trend = data.charts.attendance_trend_30d;
      charts.attendance = {
        labels: trend.map((d) => d.date?.substring(5) || d.label || ''),
        data: trend.map((d) => d.rate ?? d.value ?? 0),
      };
    }
    if (data.charts.grade_distribution?.length) {
      const dist = data.charts.grade_distribution;
      charts.grades = {
        labels: dist.map((d) => d.range || d.label || ''),
        data: dist.map((d) => d.count ?? d.value ?? 0),
      };
    }
    if (data.charts.attendance_by_course?.length) {
      const byc = data.charts.attendance_by_course;
      charts.courses = {
        labels: byc.map((d) => d.course || d.label || ''),
        data: byc.map((d) => d.rate ?? d.value ?? 0),
      };
    }
  }

  return charts;
}

function buildExecutiveAlerts(execData) {
  const alerts = [];

  if (execData?.subscription_alert?.message) {
    alerts.push({
      type: execData.subscription_alert.type || 'info',
      icon:
        execData.subscription_alert.type === 'danger'
          ? '🔴'
          : execData.subscription_alert.type === 'warning'
            ? '🟡'
            : '🔵',
      message: execData.subscription_alert.message,
    });
  }

  if (Array.isArray(execData?.usage_warnings)) {
    execData.usage_warnings.forEach((warning) => {
      if (!warning?.message) return;
      alerts.push({
        type: warning.type || 'warning',
        icon: warning.type === 'danger' ? '⛔' : '⚠️',
        message: warning.message,
      });
    });
  }

  if (Array.isArray(execData?.alerts)) {
    execData.alerts.forEach((alert) => {
      if (!alert?.message) return;
      alerts.push({
        type: alert.type || 'info',
        icon: alert.icon || (alert.type === 'danger' ? '⛔' : alert.type === 'warning' ? '⚠️' : 'ℹ️'),
        message: alert.message,
      });
    });
  }

  return alerts;
}

function buildExecutiveKpiCards(execData) {
  const kpis = execData?.kpis || {};
  if (!Object.keys(kpis).length) return [];

  const cards = [];

  if (kpis.total_students !== undefined) {
    cards.push({ title: 'Estudiantes', value: kpis.total_students, icon: '👥', variant: 'default' });
  }
  if (kpis.total_teachers !== undefined) {
    cards.push({ title: 'Profesores', value: kpis.total_teachers, icon: '👨‍🏫', variant: 'default' });
  }
  if (kpis.attendance_rate_today !== undefined) {
    cards.push({
      title: 'Asistencia Hoy',
      value: `${kpis.attendance_rate_today}%`,
      subtitle: `${kpis.attendance_today_present ?? 0} de ${kpis.attendance_today_total ?? 0} presentes`,
      icon: '✅',
      variant: kpis.attendance_rate_today >= 85 ? 'success' : kpis.attendance_rate_today < 70 ? 'danger' : 'warning',
    });
  }
  if (kpis.grades_below_threshold !== undefined) {
    cards.push({
      title: 'Notas Bajo 4.0',
      value: kpis.grades_below_threshold,
      icon: '⚠️',
      variant: kpis.grades_below_threshold > 0 ? 'warning' : 'success',
    });
  }

  return cards;
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
    <article className="card section-card">
      <h3>Acciones Rápidas</h3>
      <div className="actions-wrap">
        {actions.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="quick-action-link"
          >
            {a.label}
          </Link>
        ))}
      </div>
    </article>
  );
}

function AlertsList({ data, scope }) {
  const alerts = [];

  // Subscription alerts
  if (data?.subscription_alert) {
    alerts.push({
      type: data.subscription_alert.type || 'info',
      icon: data.subscription_alert.type === 'danger' ? '🔴' : data.subscription_alert.type === 'warning' ? '🟡' : '🔵',
      message: data.subscription_alert.message,
    });
  }

  // Usage warnings
  if (data?.usage_warnings?.length) {
    data.usage_warnings.forEach((w) => {
      alerts.push({
        type: w.type || 'warning',
        icon: w.type === 'danger' ? '⛔' : '⚠️',
        message: w.message,
      });
    });
  }

  // Analytics alerts
  const analytics = data?.sections?.analytics;
  if (analytics) {
    const rate = analytics.attendance_rate_today;
    if (rate !== undefined && rate < 70) {
      alerts.push({
        type: 'danger',
        icon: '📉',
        message: `Asistencia crítica hoy: ${rate}%. Se recomienda revisar las ausencias.`,
      });
    }
    if (analytics.grades_below_approval > 10) {
      alerts.push({
        type: 'warning',
        icon: '📝',
        message: `${analytics.grades_below_approval} estudiantes con notas bajo el mínimo de aprobación.`,
      });
    }
  }

  // Self alerts for teachers
  const selfSection = data?.sections?.self;
  if (selfSection?.asistencia_pendiente_hoy > 0) {
    alerts.push({
      type: 'warning',
      icon: '⏰',
      message: `Tienes ${selfSection.asistencia_pendiente_hoy} clase(s) sin asistencia registrada hoy.`,
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="exec-alerts-list">
      {alerts.map((alert, i) => (
        <div key={i} className={`exec-alert-item alert-${alert.type}`}>
          <span className="exec-alert-icon">{alert.icon}</span>
          <span className="exec-alert-text">{alert.message}</span>
        </div>
      ))}
    </div>
  );
}

function ExecutiveSnapshot({ execData }) {
  const alerts = buildExecutiveAlerts(execData);
  const kpiCards = buildExecutiveKpiCards(execData);
  const recentActivity = Array.isArray(execData?.recent_activity) ? execData.recent_activity : [];

  if (!execData && alerts.length === 0 && kpiCards.length === 0 && recentActivity.length === 0) return null;

  return (
    <article className="card section-card">
      <div className="section-card-head">
        <div>
          <h3>Panel Ejecutivo</h3>
          <p>{execData?.generated_at ? `Actualizado el ${execData.generated_at}` : 'Vista ejecutiva del colegio'}</p>
        </div>
        {execData?.scope ? <span className="badge badge-active">{execData.scope}</span> : null}
      </div>

      {kpiCards.length > 0 ? (
        <div className="exec-dashboard-grid exec-dashboard-grid--compact">
          {kpiCards.map((card) => (
            <StatCard key={card.title} {...card} />
          ))}
        </div>
      ) : null}

      {alerts.length > 0 ? (
        <div className="exec-alerts-list exec-alerts-list--compact">
          {alerts.map((alert, index) => (
            <div key={`${alert.message}-${index}`} className={`exec-alert-item alert-${alert.type}`}>
              <span className="exec-alert-icon">{alert.icon}</span>
              <span className="exec-alert-text">{alert.message}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="section-muted">No hay alertas ejecutivas activas.</p>
      )}

      {recentActivity.length > 0 ? (
        <article className="card section-card">
          <h3>Actividad Reciente</h3>
          <div className="exec-activity-list">
            {recentActivity.map((item, index) => (
              <div key={`${item.type}-${item.timestamp}-${index}`} className="exec-activity-item">
                <span className="exec-activity-dot" />
                <div className="exec-activity-content">
                  <strong>
                    {item.icon ? `${item.icon} ` : ''}
                    {item.title}
                  </strong>
                  <div>{[item.subject, item.course].filter(Boolean).join(' · ')}</div>
                  <div className="exec-activity-time">
                    {item.detail}
                    {item.timestamp ? ` · ${item.timestamp.substring(0, 16).replace('T', ' ')}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      ) : null}
    </article>
  );
}

function TeacherSchedule({ clases }) {
  if (!clases?.length) return null;

  return (
    <article className="card section-card">
      <h3>📅 Clases de Hoy</h3>
      <div className="exec-activity-list">
        {clases.map((c, i) => (
          <div key={i} className="exec-activity-item">
            <span className="exec-activity-dot" />
            <div className="exec-activity-content">
              <strong>{c.asignatura}</strong> — {c.curso}
              <div className="exec-activity-time">
                🕐 {c.hora_inicio} – {c.hora_fin} · Bloque {c.bloque}
              </div>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function UpcomingEvaluations({ evaluaciones }) {
  if (!evaluaciones?.length) return null;

  return (
    <article className="card section-card">
      <h3>📝 Próximas Evaluaciones</h3>
      <div className="exec-activity-list">
        {evaluaciones.map((ev, i) => (
          <div key={i} className="exec-activity-item">
            <span className="exec-activity-dot" style={{ background: '#f59e0b' }} />
            <div className="exec-activity-content">
              <strong>{ev.nombre}</strong>
              {ev.asignatura ? ` — ${ev.asignatura}` : ''}
              <div className="exec-activity-time">
                📅 {ev.fecha} · {ev.tipo || 'Evaluación'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

/* ── Main Component ─────────────────────────────────── */

export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialScope = searchParams.get('scope');
  const [scope, setScope] = useState(SCOPES.includes(initialScope) ? initialScope : 'auto');
  const [data, setData] = useState(null);
  const [execData, setExecData] = useState(null);
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
        // Load standard dashboard
        const response = await apiClient.get(`/api/v1/dashboard/resumen/?scope=${scope}`);
        if (active) {
          setData(response);
        }

        // Try to load executive dashboard (may not exist yet)
        try {
          const execResponse = await apiClient.get(`/api/v1/dashboard/executive/?scope=${scope}`);
          if (active) {
            setExecData(execResponse);
          }
        } catch {
          // Executive endpoint not available yet — that's ok
          if (active) {
            setExecData(null);
          }
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

  const resolvedScope = data?.scope || scope;
  const statCards = buildStatCards(data, resolvedScope);
  const chartData = buildChartData(execData || data, resolvedScope);
  const selfSection = data?.sections?.self;

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
          {/* Alerts Banner */}
          <AlertsList data={data} scope={resolvedScope} />

          {/* Executive snapshot */}
          <ExecutiveSnapshot execData={execData} />

          {/* KPI Stat Cards */}
          <div className="exec-dashboard-grid">
            {statCards.map((card) => (
              <StatCard key={card.title} {...card} />
            ))}
          </div>

          {/* Charts Row — only if chart data is available */}
          {(chartData.attendance || chartData.grades) ? (
            <div className="exec-chart-row">
              {chartData.attendance ? (
                <div className="chart-card">
                  <h3>📈 Tendencia de Asistencia (30 días)</h3>
                  <LineChart
                    labels={chartData.attendance.labels}
                    data={chartData.attendance.data}
                    label="% Asistencia"
                    color="#10b981"
                    height={240}
                  />
                </div>
              ) : null}
              {chartData.grades ? (
                <div className="chart-card">
                  <h3>📊 Distribución de Notas</h3>
                  <DonutChart
                    labels={chartData.grades.labels}
                    data={chartData.grades.data}
                    height={240}
                    centerLabel="Total"
                    centerValue={chartData.grades.data.reduce((a, b) => a + b, 0)}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Course-level attendance bar chart */}
          {chartData.courses ? (
            <div className="chart-card" style={{ marginTop: '1rem' }}>
              <h3>🏫 Asistencia por Curso</h3>
              <BarChart
                labels={chartData.courses.labels}
                data={chartData.courses.data}
                label="% Asistencia"
                color="#6366f1"
                height={220}
              />
            </div>
          ) : null}

          {/* Teacher-specific: Today's schedule */}
          {selfSection?.clases_hoy ? (
            <TeacherSchedule clases={selfSection.clases_hoy} />
          ) : null}

          {/* Student-specific: Upcoming evaluations */}
          {selfSection?.proximas_evaluaciones ? (
            <UpcomingEvaluations evaluaciones={selfSection.proximas_evaluaciones} />
          ) : null}

          {/* Available scopes */}
          {data.available_scopes?.length > 0 ? (
            <article className="card section-card">
              <h3>Scopes Disponibles</h3>
              <div className="actions-wrap">
                {data.available_scopes.map((s) => (
                  <span key={s} className={`badge ${s === data.scope ? 'badge-active' : 'badge-inactive'}`}>
                    {s}
                  </span>
                ))}
              </div>
            </article>
          ) : null}

          <QuickActions scope={resolvedScope} />
          {/* Panel demo — contenido creado por onboarding automático */}
          <DemoPanel />
        </>
      ) : null}
    </section>
  );
}
