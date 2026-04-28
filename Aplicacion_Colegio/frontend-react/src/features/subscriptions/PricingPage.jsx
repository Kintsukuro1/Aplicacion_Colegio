import { useEffect, useState } from 'react';

import SubscriptionStatusCard from '../../components/SubscriptionStatusCard';
import { apiClient } from '../../lib/apiClient';

function PlanCard({ plan, onContract }) {
  return (
    <article className={`card pricing-card${plan.destacado ? ' pricing-card-featured' : ''}`}>
      <div className="pricing-card-head">
        <div>
          <h3>{plan.nombre}</h3>
          <p>{plan.descripcion || 'Plan para colegios que quieren crecer sin fricción.'}</p>
        </div>
        {plan.destacado ? <span className="badge badge-active">Recomendado</span> : null}
      </div>

      <div className="pricing-card-price">
        <strong>${plan.precio_mensual}</strong>
        <span>/ mes</span>
      </div>

      <ul className="pricing-feature-list">
        <li>Estudiantes: {plan.limites.estudiantes}</li>
        <li>Profesores: {plan.limites.profesores}</li>
        <li>Cursos: {plan.limites.cursos}</li>
        <li>Mensajes/mes: {plan.limites.mensajes_mes}</li>
        <li>Evaluaciones/mes: {plan.limites.evaluaciones_mes}</li>
      </ul>

      <button type="button" className="pricing-cta" onClick={() => onContract(plan)}>
        Contratar
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
      setCheckoutMessage('No se pudo obtener el enlace de checkout.');
    } catch (err) {
      setCheckoutMessage(err.payload?.detail || 'No fue posible iniciar el checkout.');
    }
  }

  const currentPlanName = status?.sections?.self?.plan_actual;
  const currentStudents = status?.sections?.self?.total_estudiantes ?? 0;
  const currentMessages = status?.sections?.self?.comunicados_sin_leer ?? 0;

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Planes y Pagos</h2>
          <p>Contrata el plan del colegio y revisa el estado de tus pagos.</p>
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
            <PlanCard key={plan.codigo} plan={plan} onContract={handleContract} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
