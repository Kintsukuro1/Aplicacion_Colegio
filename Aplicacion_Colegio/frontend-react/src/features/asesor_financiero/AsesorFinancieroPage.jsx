import { useEffect, useState } from 'react';

import { apiClient } from '../../lib/apiClient';

function resolveError(err, fallback) {
  return err?.payload?.error || err?.payload?.detail || fallback;
}

export default function AsesorFinancieroPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [kpis, setKpis] = useState(null);
  const [cuotas, setCuotas] = useState(null);
  const [becas, setBecas] = useState(null);
  const [boletas, setBoletas] = useState(null);
  const [pagos, setPagos] = useState([]);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError('');
      try {
        const [kpisData, cuotasData, becasData, boletasData, pagosData] = await Promise.all([
          apiClient.get('/api/asesor-financiero/dashboard/kpis/'),
          apiClient.get('/api/asesor-financiero/cuotas/estadisticas/'),
          apiClient.get('/api/asesor-financiero/becas/estadisticas/'),
          apiClient.get('/api/asesor-financiero/boletas/estadisticas/'),
          apiClient.get('/api/asesor-financiero/pagos/'),
        ]);

        if (!active) {
          return;
        }

        setKpis(kpisData);
        setCuotas(cuotasData);
        setBecas(becasData);
        setBoletas(boletasData);
        setPagos(Array.isArray(pagosData?.resultados) ? pagosData.resultados.slice(0, 8) : []);
      } catch (err) {
        if (active) {
          setError(resolveError(err, 'No se pudo cargar informacion financiera.'));
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
  }, []);

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Asesor Financiero</h2>
          <p>Vista rapida de KPIs, cuotas, becas y boletas.</p>
        </div>
      </header>

      {loading ? <p>Cargando panel financiero...</p> : null}
      {error ? <div className="error-box">{error}</div> : null}

      {!loading && !error ? (
        <div className="grid-2">
          <article className="card">
            <h3>Dashboard</h3>
            <p>Ingresos mes: {kpis?.ingresos_mes ?? 0}</p>
            <p>Tasa cobro: {kpis?.tasa_cobro ?? 0}%</p>
            <p>Deuda vencida: {kpis?.deuda_vencida ?? 0}</p>
            <p>Cuotas total: {kpis?.cuotas_total ?? 0}</p>
          </article>

          <article className="card">
            <h3>Cuotas</h3>
            <p>Total: {cuotas?.total_cuotas ?? 0}</p>
            <p>Pagadas: {cuotas?.cuotas_pagadas ?? 0}</p>
            <p>Pendientes: {cuotas?.cuotas_pendientes ?? 0}</p>
            <p>Vencidas: {cuotas?.cuotas_vencidas ?? 0}</p>
          </article>

          <article className="card">
            <h3>Becas</h3>
            <p>Activas: {becas?.activas ?? 0}</p>
            <p>Pendientes: {becas?.pendientes ?? 0}</p>
            <p>Rechazadas: {becas?.rechazadas ?? 0}</p>
            <p>Monto total: {becas?.monto_total ?? 0}</p>
          </article>

          <article className="card">
            <h3>Boletas</h3>
            <p>Hoy: {boletas?.boletas_hoy ?? 0}</p>
            <p>Mes: {boletas?.boletas_mes ?? 0}</p>
            <p>Monto mes: {boletas?.monto_total_mes ?? 0}</p>
          </article>

          <article className="card">
            <h3>Pagos recientes</h3>
            {pagos.length === 0 ? <p>Sin pagos para mostrar.</p> : null}
            {pagos.length > 0 ? (
              <ul>
                {pagos.map((item) => (
                  <li key={item.id}>
                    {item.estudiante?.nombre || 'Sin estudiante'} - {item.monto_pagado} ({item.estado})
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        </div>
      ) : null}
    </section>
  );
}
