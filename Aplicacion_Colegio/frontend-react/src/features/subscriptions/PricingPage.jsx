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
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('bank_transfer_bancoestado');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const [checkoutDetails, setCheckoutDetails] = useState(null);
  const [lastPaymentId, setLastPaymentId] = useState(null);
  const [transferForm, setTransferForm] = useState({ reference: '', amount: '', bank_name: '', account_holder: '', notes: '' });

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError('');
      try {
        const [plansResponse, dashboardResponse, providersResponse] = await Promise.all([
          apiClient.get('/api/v1/plans/'),
          apiClient.get('/api/v1/dashboard/resumen/?scope=school').catch(() => null),
          apiClient.get('/api/v1/payments/providers/').catch(() => ({ providers: [] })),
        ]);
        if (!active) return;
        setPlans(plansResponse.plans || []);
        setStatus(dashboardResponse);
        const loadedProviders = providersResponse.providers || [];
        setProviders(loadedProviders);
        const initialProvider = loadedProviders.find((provider) => provider.active) || loadedProviders[0];
        if (initialProvider?.codigo) {
          setSelectedProvider(initialProvider.codigo);
        }
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
    setCheckoutDetails(null);
    setLastPaymentId(null);
    try {
      const response = await apiClient.post('/api/v1/payments/create-checkout/', {
        plan_codigo: plan.codigo,
        provider: selectedProvider,
      });
      if (response?.payment_id) {
        setLastPaymentId(response.payment_id);
      }
      if (response?.instructions) {
        setCheckoutDetails(response.instructions);
        setTransferForm((current) => ({
          ...current,
          amount: response.instructions.amount || current.amount,
          reference: response.instructions.reference || current.reference,
          bank_name: response.instructions.bank_name || current.bank_name,
          account_holder: response.instructions.account_holder || current.account_holder,
        }));
      }
      if (response?.checkout_url && response.provider === 'webpay') {
        window.location.assign(response.checkout_url);
        return;
      }
      if (response?.checkout_url && response.provider === 'bank_transfer_bancoestado') {
        setCheckoutMessage('Se generaron las instrucciones de transferencia. Revisa los datos debajo y valida el pago desde el historial.');
        return;
      }
      setCheckoutMessage(
        response?.detail || 'Checkout no disponible. Modo demo activo.',
      );
    } catch (err) {
      setCheckoutMessage(err.payload?.detail || 'No fue posible iniciar el checkout.');
    }
  }

  async function handleTransferNotice() {
    if (!lastPaymentId) {
      setCheckoutMessage('Primero crea el checkout para generar el pago asociado.');
      return;
    }

    try {
      const response = await apiClient.post('/api/v1/payments/notify-transfer/', {
        payment_id: lastPaymentId,
        ...transferForm,
      });
      setCheckoutMessage(response?.detail || 'Aviso de transferencia registrado.');
    } catch (err) {
      setCheckoutMessage(err.payload?.detail || 'No fue posible registrar el aviso de transferencia.');
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

      {!loading && providers.length > 0 ? (
        <section className="subscription-section">
          <h3>Medio de Pago</h3>
          <div className="payment-provider-picker">
            {providers.map((provider) => (
              <button
                key={provider.codigo}
                type="button"
                className={`provider-chip ${selectedProvider === provider.codigo ? 'active' : ''} ${provider.active ? '' : 'disabled'}`}
                onClick={() => provider.active && setSelectedProvider(provider.codigo)}
                disabled={!provider.active}
              >
                <strong>{provider.nombre}</strong>
                <span>{provider.descripcion}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {checkoutDetails ? (
        <section className="subscription-section">
          <h3>Instrucciones de Pago</h3>
          <div className="payment-instructions-card">
            {checkoutDetails.bank_name ? <p><strong>Banco:</strong> {checkoutDetails.bank_name}</p> : null}
            {checkoutDetails.account_holder ? <p><strong>Titular:</strong> {checkoutDetails.account_holder}</p> : null}
            {checkoutDetails.account_type ? <p><strong>Tipo de cuenta:</strong> {checkoutDetails.account_type}</p> : null}
            {checkoutDetails.account_number ? <p><strong>Número:</strong> {checkoutDetails.account_number}</p> : null}
            {checkoutDetails.account_rut ? <p><strong>RUT:</strong> {checkoutDetails.account_rut}</p> : null}
            {checkoutDetails.reference ? <p><strong>Referencia:</strong> {checkoutDetails.reference}</p> : null}
            {Array.isArray(checkoutDetails.instructions) ? (
              <ul className="payment-instructions-list">
                {checkoutDetails.instructions.map((instruction) => (
                  <li key={instruction}>{instruction}</li>
                ))}
              </ul>
            ) : null}
            {selectedProvider === 'bank_transfer_bancoestado' ? (
              <div className="transfer-notice-form">
                <label>
                  Referencia
                  <input value={transferForm.reference} onChange={(event) => setTransferForm((current) => ({ ...current, reference: event.target.value }))} placeholder="Referencia del comprobante" />
                </label>
                <label>
                  Monto
                  <input value={transferForm.amount} onChange={(event) => setTransferForm((current) => ({ ...current, amount: event.target.value }))} placeholder="Monto transferido" />
                </label>
                <label>
                  Banco
                  <input value={transferForm.bank_name} onChange={(event) => setTransferForm((current) => ({ ...current, bank_name: event.target.value }))} placeholder="Banco emisior" />
                </label>
                <label>
                  Titular
                  <input value={transferForm.account_holder} onChange={(event) => setTransferForm((current) => ({ ...current, account_holder: event.target.value }))} placeholder="Titular de la cuenta" />
                </label>
                <label>
                  Observaciones
                  <textarea value={transferForm.notes} onChange={(event) => setTransferForm((current) => ({ ...current, notes: event.target.value }))} rows="3" placeholder="Nombre del apoderado, fecha, sucursal, etc." />
                </label>
                <button type="button" onClick={handleTransferNotice} className="pricing-cta pricing-cta-primary">
                  Registrar aviso de transferencia
                </button>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

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
