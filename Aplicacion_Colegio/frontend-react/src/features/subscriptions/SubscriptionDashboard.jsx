import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient';

function getDaysUntil(dateValue) {
  if (!dateValue) return null;
  const target = new Date(dateValue);
  if (Number.isNaN(target.getTime())) return null;
  const diffMs = target.getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export default function SubscriptionDashboard() {
  const [subscription, setSubscription] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [subData, histData, planData] = await Promise.all([
          apiClient.get('/api/v1/me/'),
          apiClient.get('/api/v1/payments/history/'),
          apiClient.get('/api/v1/plans/'),
        ]);
        
        if (subData && subData.subscription) {
          setSubscription(subData.subscription);
        }
        if (histData && histData.payments) {
          setPayments(histData.payments);
        }
        if (planData && planData.plans) {
          setPlans(planData.plans);
        }
      } catch (err) {
        setError(err.message || 'Error cargando suscripción');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleUpgrade = async (planCodigo) => {
    try {
      const result = await apiClient.post('/api/v1/subscriptions/upgrade/', {
        plan_codigo: planCodigo,
      });
      setSubscription({
        ...subscription,
        plan_nombre: result.plan_nombre,
        plan_codigo: planCodigo,
        fecha_fin: result.fecha_fin,
      });
      alert(`✅ Suscripción actualizada a ${result.plan_nombre}`);
    } catch (err) {
      alert(`❌ Error: ${err.message || 'No se pudo actualizar'}`);
    }
  };

  const handleRenew = async () => {
    const dias = prompt('¿Cuántos días deseas renovar?', '30');
    if (dias) {
      try {
        const result = await apiClient.post('/api/v1/subscriptions/renew/', {
          dias: parseInt(dias, 10),
        });
        setSubscription({
          ...subscription,
          fecha_fin: result.fecha_fin,
        });
        alert(`✅ Suscripción renovada hasta ${result.fecha_fin}`);
      } catch (err) {
        alert(`❌ Error: ${err.message || 'No se pudo renovar'}`);
      }
    }
  };

  const handleCancel = async () => {
    if (window.confirm('¿Estás seguro de que deseas cancelar la suscripción?')) {
      try {
        const result = await apiClient.post('/api/v1/subscriptions/cancel/', {});
        setSubscription({
          ...subscription,
          status: 'cancelled',
        });
        alert(`✅ ${result.detail}`);
      } catch (err) {
        alert(`❌ Error: ${err.message || 'No se pudo cancelar'}`);
      }
    }
  };

  const daysUntilExpiry = getDaysUntil(subscription?.fecha_fin);
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;
  const isRenewalDue = daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 7;

  if (loading) {
    return <div className="loading-dot"><span /><span /><span /></div>;
  }

  return (
    <div className="subscription-dashboard">
      <header className="page-header">
        <div>
          <h2>💳 Gestión de Suscripción</h2>
          <p>Administra tu plan y pagos</p>
        </div>
      </header>

      {error && <div className="error-box">{error}</div>}

      {subscription && (
        <section className="subscription-section">
          <h3>Plan Actual</h3>
          <div className="subscription-card">
            <div className="subscription-info">
              <h4>{subscription.plan_nombre || 'Sin plan'}</h4>
              <p>Estado: <strong>{subscription.status}</strong></p>
              {subscription.fecha_fin && (
                <p>Expira: <strong>{new Date(subscription.fecha_fin).toLocaleDateString('es-CL')}</strong></p>
              )}
            </div>
            <div className="subscription-actions">
              <button
                className="secondary"
                onClick={handleRenew}
                disabled={subscription.status === 'cancelled'}
              >
                🔄 Renovar
              </button>
              <button
                className="danger"
                onClick={handleCancel}
                disabled={subscription.status === 'cancelled'}
              >
                ✖ Cancelar
              </button>
            </div>
          </div>
          {(isExpired || isRenewalDue) && (
            <div className={`subscription-alert ${isExpired ? 'subscription-alert-danger' : 'subscription-alert-warning'}`}>
              <div>
                <strong>{isExpired ? 'Suscripción vencida' : 'Suscripción por vencer'}</strong>
                <p>
                  {isExpired
                    ? 'Tu colegio ya quedó fuera de vigencia. Renueva ahora para reactivar el acceso.'
                    : `Quedan ${daysUntilExpiry} días para renovar y evitar interrupciones.`}
                </p>
              </div>
              <button className="secondary" onClick={handleRenew}>
                Renovar ahora
              </button>
            </div>
          )}
        </section>
      )}

      {plans.length > 0 && (
        <section className="subscription-section">
          <h3>Planes Disponibles</h3>
          <div className="plans-grid">
            {plans.map((plan) => (
              <div key={plan.codigo} className="plan-card">
                <h4>{plan.nombre}</h4>
                {plan.is_unlimited ? (
                  <p className="plan-price">Ilimitado</p>
                ) : plan.is_trial ? (
                  <p className="plan-price">Prueba 30 días</p>
                ) : (
                  <p className="plan-price">${plan.precio_mensual}/mes</p>
                )}
                <button
                  onClick={() => handleUpgrade(plan.codigo)}
                  disabled={subscription && subscription.plan_codigo === plan.codigo}
                >
                  {subscription && subscription.plan_codigo === plan.codigo ? '✓ Plan Actual' : 'Cambiar a este plan'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {payments.length > 0 && (
        <section className="subscription-section">
          <h3>Historial de Pagos</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Plan</th>
                  <th>Monto</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{new Date(payment.fecha_creacion).toLocaleDateString('es-CL')}</td>
                    <td>{payment.plan}</td>
                    <td>${payment.monto} {payment.moneda}</td>
                    <td className={`badge badge-${payment.status === 'approved' ? 'active' : 'warning'}`}>
                      {payment.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
