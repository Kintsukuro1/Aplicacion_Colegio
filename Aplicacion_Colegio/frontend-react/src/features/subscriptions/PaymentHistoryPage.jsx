import { useEffect, useState } from 'react';

import { apiClient } from '../../lib/apiClient';

function statusLabel(status) {
  if (status === 'approved') return 'Aprobado';
  if (status === 'rejected') return 'Rechazado';
  if (status === 'cancelled') return 'Cancelado';
  return 'Pendiente';
}

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      setLoading(true);
      setError('');
      try {
        const response = await apiClient.get('/api/v1/payments/history/');
        if (active) {
          setPayments(response.payments || []);
        }
      } catch (err) {
        if (active) {
          setError(err.payload?.detail || 'No se pudo cargar el historial de pagos.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadHistory();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Historial de Pagos</h2>
          <p>Revisa los pagos registrados para tu colegio.</p>
        </div>
      </header>

      {loading ? <div className="loading-dot"><span /><span /><span /></div> : null}
      {error ? <div className="error-box">{error}</div> : null}

      {!loading && payments.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Plan</th>
                <th>Monto</th>
                <th>Estado</th>
                <th>Gateway</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.fecha_pago || payment.fecha_creacion || '—'}</td>
                  <td>{payment.plan}</td>
                  <td>{payment.moneda} {payment.monto}</td>
                  <td><span className={`badge badge-${payment.status}`}>{statusLabel(payment.status)}</span></td>
                  <td>{payment.gateway}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
