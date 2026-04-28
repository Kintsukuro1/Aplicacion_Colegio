import { useEffect, useState } from 'react';

import SubscriptionStatusCard from '../../components/SubscriptionStatusCard';
import { apiClient } from '../../lib/apiClient';

const FEATURE_LABELS = {
  attendance: 'Asistencia',
  grades: 'Calificaciones',
  messaging: 'Mensajería',
  reports: 'Reportes',
  advanced_reports: 'Reportes Avanzados',
  attachments: 'Adjuntos',
  api_access: 'Acceso API',
  priority_support: 'Soporte Prioritario',
  branding: 'Marca personalizada',
};

function PlanCard({ plan, onContract, currentPlan }) {
  const isCurrent = currentPlan && plan.codigo === currentPlan;

  return (
    <article className={`pricing-card ${plan.destacado ? 'pricing-featured' : ''}`}>
      {plan.destacado ? (
        <span className="pricing-badge">⭐ Recomendado</span>
      ) : null}

      <div className="pricing-header">
        <h3>{plan.nombre}</h3>
        {plan.is_trial ? (
          <div className="pricing-price">
            <span className="pricing-amount">Gratis</span>
            <span className="pricing-period">30 días</span>
          </div>
        ) : plan.is_unlimited ? (
          <div className="pricing-price">
            <span className="pricing-amount">Demo</span>
            <span className="pricing-period">Ilimitado</span>
          </div>
        ) : (
          <div className="pricing-price">
            <span className="pricing-currency">$</span>
            <span className="pricing-amount">
              {parseInt(plan.precio_mensual).toLocaleString('es-CL')}
            </span>
            <span className="pricing-period">/mes</span>
          </div>
        )}
        <p className="pricing-desc">
          {plan.descripcion || 'Plan para colegios que quieren crecer sin fricción.'}
        </p>
      </div>

      <div className="pricing-limits">
        <div className="pricing-limit-item">
          <span>👥</span>
          <span>{plan.limites.estudiantes} estudiantes</span>
        </div>
        <div className="pricing-limit-item">
          <span>👨‍🏫</span>
          <span>{plan.limites.profesores} profesores</span>
        </div>
        <div className="pricing-limit-item">
          <span>📚</span>
          <span>{plan.limites.cursos} cursos</span>
        </div>
        <div className="pricing-limit-item">
          <span>💾</span>
          <span>{plan.limites.almacenamiento_mb} MB</span>
        </div>
      </div>

      <div className="pricing-features">
        {Object.entries(plan.features || {}).map(([key, enabled]) => (
          <div key={key} className={`pricing-feature ${enabled ? '' : 'disabled'}`}>
            <span>{enabled ? '✅' : '❌'}</span>
            <span>{FEATURE_LABELS[key] || key}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        className={`pricing-cta ${plan.destacado ? 'pricing-cta-primary' : ''}`}
        onClick={() => onContract(plan)}
        disabled={isCurrent || plan.is_unlimited}
      >
        {isCurrent
          ? '✓ Plan Actual'
          : plan.is_trial
            ? 'Comenzar Prueba'
            : plan.is_unlimited
              ? 'Solo Desarrollo'
              : 'Contratar'}
      </button>
    </article>
  );
}

export default function PricingPage() {
  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkoutMessage, setCheckoutMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError('');
      try {
        const [plansResponse, dashboardResponse] = await Promise.all([
          apiClient.get('/api/v1/plans/'),
          apiClient.get('/api/v1/dashboard/resumen/?scope=school').catch(() => null),
        ]);
        if (!active) return;
        setPlans(plansResponse.plans || []);
        setStatus(dashboardResponse);
      } catch (err) {
        if (active) {
          setError(err.payload?.detail || 'No se pudieron cargar los planes.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, []);

  async function handleContract(plan) {
    setCheckoutMessage('');
    try {
      const response = await apiClient.post('/api/v1/payments/create-checkout/', {
        plan_codigo: plan.codigo,
      });
      if (response?.checkout_url) {
        window.location.assign(response.checkout_url);
        return;
      }
      setCheckoutMessage(
        response?.detail || 'Checkout no disponible. Modo demo activo.',
      );
    } catch (err) {
      setCheckoutMessage(err.payload?.detail || 'No fue posible iniciar el checkout.');
    }
  }

  const currentPlanCode = status?.sections?.self?.plan_codigo;
  const currentPlanName = status?.sections?.self?.plan_actual;
  const currentStudents = status?.sections?.self?.total_estudiantes ?? 0;
  const currentMessages = status?.sections?.self?.comunicados_sin_leer ?? 0;

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>💎 Planes y Precios</h2>
          <p>Elige el plan que mejor se adapte a tu institución</p>
        </div>
      </header>

      {currentPlanName ? (
        <SubscriptionStatusCard
          planName={currentPlanName}
          daysRemaining={status?.sections?.self?.dias_restantes}
          studentsUsed={currentStudents}
          messagesUsed={currentMessages}
        />
      ) : null}

      {loading ? <div className="loading-dot"><span /><span /><span /></div> : null}
      {error ? <div className="error-box">{error}</div> : null}
      {checkoutMessage ? <div className="error-box">{checkoutMessage}</div> : null}

      {!loading && plans.length > 0 ? (
        <div className="pricing-grid">
          {plans.map((plan) => (
            <PlanCard
              key={plan.codigo}
              plan={plan}
              onContract={handleContract}
              currentPlan={currentPlanCode}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
