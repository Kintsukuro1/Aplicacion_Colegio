import { useEffect, useState } from 'react';

import { apiClient } from '../../lib/apiClient';

function resolveError(err, fallback) {
  return err?.payload?.error || err?.payload?.detail || fallback;
}

function formatCurrency(value) {
  const numeric = Number(value || 0);
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(numeric);
}

export default function AsesorFinancieroPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [morosos, setMorosos] = useState([]);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState('');

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError('');
      try {
        const query = new URLSearchParams({ anio: String(anio) });
        if (mes) {
          query.set('mes', mes);
        }

        const [dashboardData, morososData] = await Promise.all([
          apiClient.get(`/api/v1/finanzas/dashboard/?${query.toString()}`),
          apiClient.get('/api/v1/finanzas/morosos/'),
        ]);

        if (!active) {
          return;
        }

        setDashboard(dashboardData);
        setMorosos(Array.isArray(morososData?.morosos) ? morososData.morosos.slice(0, 8) : []);
      } catch (err) {
        if (active) {
          setError(resolveError(err, 'No se pudo cargar informacion financiera v1.'));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, [anio, mes]);

  const resumen = dashboard?.resumen || {};
  const morosidad = dashboard?.morosidad || {};
  const cuotasPorEstado = Array.isArray(dashboard?.cuotas_por_estado) ? dashboard.cuotas_por_estado : [];
  const becas = dashboard?.becas || {};
  const pagosRecientes = Array.isArray(dashboard?.pagos_recientes) ? dashboard.pagos_recientes : [];

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Asesor Financiero</h2>
          <p>Dashboard financiero consolidado y reporte de morosos.</p>
        </div>
        <div className="actions">
          <label>
            Anio
            <input
              type="number"
              min="2020"
              max="2100"
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value) || new Date().getFullYear())}
            />
          </label>
          <label>
            Mes
            <select value={mes} onChange={(e) => setMes(e.target.value)}>
              <option value="">Todos</option>
              {Array.from({ length: 12 }).map((_, idx) => {
                const month = String(idx + 1);
                return (
                  <option key={month} value={month}>
                    {month}
                  </option>
                );
              })}
            </select>
          </label>
        </div>
      </header>

      {loading ? <p>Cargando panel financiero...</p> : null}
      {error ? <div className="error-box">{error}</div> : null}

      {!loading && !error ? (
        <div className="grid-2">
          <article className="card">
            <h3>Resumen Financiero</h3>
            <p>Total emitido: {formatCurrency(resumen.total_emitido)}</p>
            <p>Total pagado: {formatCurrency(resumen.total_pagado)}</p>
            <p>Total pendiente: {formatCurrency(resumen.total_pendiente)}</p>
            <p>Tasa de cobranza: {resumen.tasa_cobranza ?? 0}%</p>
          </article>

          <article className="card">
            <h3>Morosidad</h3>
            <p>Familias morosas: {morosidad.familias_morosas ?? 0}</p>
            <p>Monto vencido: {formatCurrency(morosidad.monto_vencido)}</p>
            <p>Total de casos listados: {morosos.length}</p>
          </article>

          <article className="card">
            <h3>Becas</h3>
            <p>Vigentes: {becas.vigentes ?? 0}</p>
            {Array.isArray(becas.por_tipo) && becas.por_tipo.length ? (
              <ul>
                {becas.por_tipo.map((item) => (
                  <li key={item.tipo}>
                    {item.tipo}: {item.total}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Sin becas vigentes.</p>
            )}
          </article>

          <article className="card">
            <h3>Cuotas por Estado</h3>
            {cuotasPorEstado.length ? (
              <ul>
                {cuotasPorEstado.map((item) => (
                  <li key={item.estado}>
                    {item.estado}: {item.cantidad} ({formatCurrency(item.monto)})
                  </li>
                ))}
              </ul>
            ) : (
              <p>Sin datos del periodo.</p>
            )}
          </article>

          <article className="card">
            <h3>Pagos recientes</h3>
            {pagosRecientes.length === 0 ? <p>Sin pagos para mostrar.</p> : null}
            {pagosRecientes.length > 0 ? (
              <ul>
                {pagosRecientes.map((item) => (
                  <li key={item.id}>
                    {item.estudiante || 'Sin estudiante'} - {formatCurrency(item.monto)} ({item.estado})
                  </li>
                ))}
              </ul>
            ) : null}
          </article>

          <article className="card">
            <h3>Top Morosos</h3>
            {morosos.length === 0 ? <p>Sin morosos al corte.</p> : null}
            {morosos.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Estudiante</th>
                      <th>Cuotas vencidas</th>
                      <th>Monto adeudado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {morosos.map((item) => (
                      <tr key={item.estudiante_id}>
                        <td>{item.nombre}</td>
                        <td>{item.cuotas_vencidas}</td>
                        <td>{formatCurrency(item.monto_total_adeudado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </article>
        </div>
      ) : null}
    </section>
  );
}
