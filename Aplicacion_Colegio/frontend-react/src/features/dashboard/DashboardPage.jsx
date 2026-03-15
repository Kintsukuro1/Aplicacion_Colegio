import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { apiClient } from '../../lib/apiClient';

const SCOPES = ['auto', 'self', 'school', 'analytics'];

function formatLabel(rawKey) {
  return rawKey
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function MetricCards({ title, data }) {
  if (!data) {
    return null;
  }

  const entries = Object.entries(data).filter(([key, value]) => key !== 'today' && value !== null && value !== undefined);
  if (entries.length === 0) {
    return null;
  }

  return (
    <article className="card">
      <h3>{title}</h3>
      <div className="grid-2">
        {entries.map(([key, value]) => (
          <div key={key} className="card">
            <p>{formatLabel(key)}</p>
            <strong>{String(value)}</strong>
          </div>
        ))}
      </div>
    </article>
  );
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

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Dashboard API v1</h2>
          <p>Metricas por perfil desde `/api/v1/dashboard/resumen/`.</p>
        </div>
        <label>
          Scope
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            {SCOPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </header>

      {loading ? <p>Cargando dashboard...</p> : null}
      {error ? <div className="error-box">{error}</div> : null}

      {data ? (
        <div className="grid-2">
          <article className="card">
            <h3>Resumen</h3>
            <p>
              Scope resuelto: <strong>{data.scope}</strong>
            </p>
            <p>
              Version contrato: <strong>{data.contract_version}</strong>
            </p>
            <p>
              Fecha generacion: <strong>{data.generated_at}</strong>
            </p>
          </article>
          <article className="card">
            <h3>Scopes habilitados</h3>
            <p>{(data.available_scopes || []).join(', ') || 'Sin scopes'}</p>
          </article>

          <MetricCards title="Metricas Self" data={data.sections?.self} />
          <MetricCards title="Metricas School" data={data.sections?.school} />
          <MetricCards title="Metricas Analytics" data={data.sections?.analytics} />
        </div>
      ) : null}
    </section>
  );
}
