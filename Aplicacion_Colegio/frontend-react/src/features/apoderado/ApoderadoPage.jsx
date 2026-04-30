import { useEffect, useState } from 'react';

import { apiClient } from '../../lib/apiClient';

function resolveError(err, fallback) {
  return err?.payload?.error || err?.payload?.detail || fallback;
}

function formatDisplay(value) {
  if (value === null || value === undefined || value === '') {
    return '0';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return String(value);
}

function ApoderadoLoadingState() {
  return (
    <article className="card section-card" aria-busy="true" aria-live="polite" role="status">
      <div className="section-card-head">
        <div>
          <div style={{ height: '12px', width: '120px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.18)', marginBottom: '0.75rem' }} />
          <div style={{ height: '26px', width: '220px', borderRadius: '12px', background: 'rgba(148, 163, 184, 0.14)' }} />
          <div style={{ height: '14px', width: '300px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.12)', marginTop: '0.9rem' }} />
        </div>
      </div>

      <div className="summary-grid" style={{ marginTop: '1.25rem' }}>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="summary-tile" style={{ minHeight: '100px', background: 'rgba(148, 163, 184, 0.08)' }}>
            <div style={{ height: '12px', width: '88px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.18)', marginBottom: '0.85rem' }} />
            <div style={{ height: '26px', width: index === 0 ? '72px' : '92px', borderRadius: '12px', background: 'rgba(148, 163, 184, 0.14)' }} />
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginTop: '1.25rem' }}>
        <div className="card" style={{ minHeight: '180px', background: 'rgba(148, 163, 184, 0.06)' }} />
        <div className="card" style={{ minHeight: '180px', background: 'rgba(148, 163, 184, 0.06)' }} />
      </div>
    </article>
  );
}

export default function ApoderadoPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [justificativos, setJustificativos] = useState([]);
  const [pendientes, setPendientes] = useState([]);
  const [firmados, setFirmados] = useState([]);
  const [signForm, setSignForm] = useState({
    tipo_documento: 'AUTORIZACION',
    titulo: '',
    contenido: '',
    estudiante_id: '',
  });
  const [saving, setSaving] = useState(false);

  const summaryCards = [
    {
      title: 'Justificativos',
      value: justificativos.length,
      subtitle: justificativos.length > 0 ? 'Registros pendientes o revisados' : 'No hay justificativos cargados',
    },
    {
      title: 'Pendientes de firma',
      value: pendientes.length,
      subtitle: pendientes.length > 0 ? 'Documentos esperando acción' : 'No hay documentos pendientes',
    },
    {
      title: 'Firmados',
      value: firmados.length,
      subtitle: firmados.length > 0 ? 'Documentos ya autorizados' : 'Sin firmas registradas',
    },
  ];

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [justData, signData] = await Promise.all([
        apiClient.get('/api/apoderado/justificativos/'),
        apiClient.get('/api/apoderado/firmas/'),
      ]);
      setJustificativos(Array.isArray(justData?.justificativos) ? justData.justificativos : []);
      setPendientes(Array.isArray(signData?.pendientes) ? signData.pendientes : []);
      setFirmados(Array.isArray(signData?.firmados) ? signData.firmados : []);
    } catch (err) {
      setError(resolveError(err, 'No se pudo cargar panel de apoderado.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function onChange(name, value) {
    setSignForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSign(event) {
    event.preventDefault();

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const payload = await apiClient.post('/api/apoderado/firmas/firmar/', {
        tipo_documento: signForm.tipo_documento,
        titulo: signForm.titulo,
        contenido: signForm.contenido,
        estudiante_id: signForm.estudiante_id ? Number(signForm.estudiante_id) : null,
      });
      setMessage(payload?.message || 'Documento firmado correctamente.');
      setSignForm({ tipo_documento: 'AUTORIZACION', titulo: '', contenido: '', estudiante_id: '' });
      await loadData();
    } catch (err) {
      setError(resolveError(err, 'No se pudo firmar el documento.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Apoderado Panel</h2>
          <p>Seguimiento de justificativos y firma digital con estado resumido.</p>
        </div>
      </header>

      {loading ? <ApoderadoLoadingState /> : null}
      {error ? <div className="error-box">{error}</div> : null}
      {message ? <div className="card">{message}</div> : null}

      {!loading && !error ? (
        <div className="summary-grid">
          {summaryCards.map((item) => (
            <article key={item.title} className="summary-tile">
              <small>{item.title}</small>
              <strong>{formatDisplay(item.value)}</strong>
              <span>{item.subtitle}</span>
            </article>
          ))}
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="grid-2">
          <article className="card section-card">
            <h3>Justificativos ({justificativos.length})</h3>
            {justificativos.length === 0 ? <p>Sin justificativos.</p> : null}
            {justificativos.length > 0 ? (
              <ul>
                {justificativos.slice(0, 10).map((item) => (
                  <li key={item.id || item.id_justificativo}>
                    {item.fecha_ausencia || item.fecha || 'Sin fecha'} - {item.estado || 'Pendiente'}
                  </li>
                ))}
              </ul>
            ) : null}
          </article>

          <article className="card section-card">
            <h3>Firmas</h3>
            <p>Pendientes: {pendientes.length}</p>
            <p>Firmados: {firmados.length}</p>
          </article>
        </div>
      ) : null}

      {!loading && !error ? (
        <form className="card section-card form-grid" onSubmit={onSign}>
        <h3>Firmar documento</h3>

        <label>
          Tipo documento
          <input value={signForm.tipo_documento} onChange={(e) => onChange('tipo_documento', e.target.value)} disabled={saving} required />
        </label>

        <label>
          Titulo
          <input value={signForm.titulo} onChange={(e) => onChange('titulo', e.target.value)} disabled={saving} required />
        </label>

        <label>
          Contenido
          <textarea value={signForm.contenido} onChange={(e) => onChange('contenido', e.target.value)} disabled={saving} />
        </label>

        <label>
          Estudiante ID (opcional)
          <input
            type="number"
            min="1"
            value={signForm.estudiante_id}
            onChange={(e) => onChange('estudiante_id', e.target.value)}
            disabled={saving}
          />
        </label>

        <div>
          <button type="submit" disabled={saving || !signForm.tipo_documento || !signForm.titulo}>
            {saving ? 'Firmando...' : 'Firmar'}
          </button>
        </div>
        </form>
      ) : null}
    </section>
  );
}
