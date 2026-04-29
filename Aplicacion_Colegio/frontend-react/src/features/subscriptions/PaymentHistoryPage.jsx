import { useEffect, useMemo, useState } from 'react';

import { apiClient } from '../../lib/apiClient';

function statusLabel(status) {
  if (status === 'approved') return 'Aprobado';
  if (status === 'rejected') return 'Rechazado';
  if (status === 'cancelled') return 'Cancelado';
  return 'Pendiente';
}

function providerLabel(provider) {
  if (provider === 'bank_transfer_bancoestado') return 'BancoEstado';
  if (provider === 'bank_transfer') return 'Transferencia';
  if (provider === 'webpay') return 'Webpay';
  if (provider === 'mercadopago') return 'MercadoPago';
  return provider || '—';
}

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [gatewayFilter, setGatewayFilter] = useState('');

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

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const matchesStatus = !statusFilter || payment.status === statusFilter;
      const matchesGateway = !gatewayFilter || payment.gateway === gatewayFilter;
      return matchesStatus && matchesGateway;
    });
  }, [payments, statusFilter, gatewayFilter]);

  function handleExportCsv() {
    const rows = [
      ['Fecha', 'Plan', 'Monto', 'Moneda', 'Estado', 'Gateway', 'Proveedor', 'External ID'],
      ...filteredPayments.map((payment) => [
        payment.fecha_pago || payment.fecha_creacion || '—',
        payment.plan || '—',
        payment.monto || '0',
        payment.moneda || 'CLP',
        statusLabel(payment.status),
        payment.gateway || '—',
        providerLabel(payment.gateway),
        payment.external_id || '—',
      ]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'historial_pagos.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Historial de Pagos</h2>
          <p>Revisa los pagos registrados para tu colegio.</p>
        </div>
        <div className="subscription-section-actions">
          <button type="button" className="secondary" onClick={handleExportCsv} disabled={filteredPayments.length === 0}>
            Exportar CSV
          </button>
        </div>
      </header>

      {!loading ? (
        <div className="transfer-notices-filters">
          <label>
            Estado
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">Todos</option>
              <option value="pending">Pendiente</option>
              <option value="approved">Aprobado</option>
              <option value="rejected">Rechazado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </label>
          <label>
            Gateway
            <select value={gatewayFilter} onChange={(event) => setGatewayFilter(event.target.value)}>
              <option value="">Todos</option>
              <option value="bank_transfer_bancoestado">BancoEstado</option>
              <option value="bank_transfer">Transferencia</option>
              <option value="webpay">Webpay</option>
              <option value="mercadopago">MercadoPago</option>
            </select>
          </label>
        </div>
      ) : null}

      {loading ? <div className="loading-dot"><span /><span /><span /></div> : null}
      {error ? <div className="error-box">{error}</div> : null}

      {!loading && filteredPayments.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Plan</th>
                <th>Monto</th>
                <th>Estado</th>
                <th>Gateway</th>
                <th>Proveedor</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.fecha_pago || payment.fecha_creacion || '—'}</td>
                  <td>{payment.plan}</td>
                  <td>{payment.moneda} {payment.monto}</td>
                  <td><span className={`badge badge-${payment.status}`}>{statusLabel(payment.status)}</span></td>
                  <td>{payment.gateway}</td>
                  <td>{providerLabel(payment.gateway)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !loading ? (
        <article className="card section-card">
          <h3>Sin resultados</h3>
          <p className="section-muted">No hay pagos que coincidan con los filtros seleccionados.</p>
        </article>
      ) : null}
    </section>
  );
}
