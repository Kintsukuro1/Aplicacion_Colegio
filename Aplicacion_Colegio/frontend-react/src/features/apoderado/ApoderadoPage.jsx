import { useEffect, useState } from 'react';

import { apiClient } from '../../lib/apiClient';

function resolveError(err, fallback) {
  return err?.payload?.error || err?.payload?.detail || fallback;
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
          <p>Seguimiento de justificativos y firma digital.</p>
        </div>
      </header>

      {loading ? <p>Cargando panel...</p> : null}
      {error ? <div className="error-box">{error}</div> : null}
      {message ? <div className="card">{message}</div> : null}

      {!loading ? (
        <div className="grid-2">
          <article className="card">
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

          <article className="card">
            <h3>Firmas</h3>
            <p>Pendientes: {pendientes.length}</p>
            <p>Firmados: {firmados.length}</p>
          </article>
        </div>
      ) : null}

      <form className="card form-grid" onSubmit={onSign}>
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
    </section>
  );
}
