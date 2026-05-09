import { useEffect, useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { useToast } from '../../components/Toast';
import { SummarySkeleton, TableLoadingState } from '../../components/TableLoadingState';
import { formatNumber } from '../../lib/formatters';

function resolveError(err, fallback) {
  return err?.payload?.error || err?.payload?.detail || fallback;
}



export default function ApoderadoPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
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

  const { data: justData, isLoading: justLoading, error: justErrorObj } = useQuery({
    queryKey: ['apoderado-justificativos'],
    queryFn: () => apiClient.get('/api/apoderado/justificativos/')
  });
  const { data: signData, isLoading: signLoading, error: signErrorObj } = useQuery({
    queryKey: ['apoderado-firmas'],
    queryFn: () => apiClient.get('/api/apoderado/firmas/')
  });

  const justError = justErrorObj?.message;
  const signError = signErrorObj?.message;

  useEffect(() => {
    if (justData) {
      setJustificativos(Array.isArray(justData.justificativos) ? justData.justificativos : []);
    }
  }, [justData]);

  useEffect(() => {
    if (signData) {
      setPendientes(Array.isArray(signData.pendientes) ? signData.pendientes : []);
      setFirmados(Array.isArray(signData.firmados) ? signData.firmados : []);
    }
  }, [signData]);

  const loading = justLoading || signLoading;
  const error = justError || signError;

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

  function onChange(name, value) {
    setSignForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSign(event) {
    event.preventDefault();

    setSaving(true);

    try {
      const payload = await apiClient.post('/api/apoderado/firmas/firmar/', {
        tipo_documento: signForm.tipo_documento,
        titulo: signForm.titulo,
        contenido: signForm.contenido,
        estudiante_id: signForm.estudiante_id ? Number(signForm.estudiante_id) : null,
      });
      toast.success(payload?.message || 'Documento firmado correctamente.');
      setSignForm({ tipo_documento: 'AUTORIZACION', titulo: '', contenido: '', estudiante_id: '' });
      await queryClient.invalidateQueries({ queryKey: ['apoderado-justificativos'] });
      await queryClient.invalidateQueries({ queryKey: ['apoderado-firmas'] });
    } catch (err) {
      toast.error(resolveError(err, 'No se pudo firmar el documento.'));
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

      {error ? <div className="error-box">{error}</div> : null}

      <div className="summary-grid">
        {loading
          ? Array.from({ length: 3 }).map((_, index) => (
              <SummarySkeleton key={index} />
            ))
          : summaryCards.map((item) => (
              <article key={item.title} className="summary-tile">
                <small>{item.title}</small>
                <strong>{formatNumber(item.value)}</strong>
                <span>{item.subtitle}</span>
              </article>
            ))}
      </div>

      <div className="grid-2">
        <article className="card section-card">
          <h3>Justificativos ({justificativos.length})</h3>
          {loading ? (
            <TableLoadingState />
          ) : justificativos.length === 0 ? (
            <p>Sin justificativos.</p>
          ) : (
            <ul>
              {justificativos.slice(0, 10).map((item) => (
                <li key={item.id || item.id_justificativo}>
                  {item.fecha_ausencia || item.fecha || 'Sin fecha'} - {item.estado || 'Pendiente'}
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="card section-card">
          <h3>Firmas</h3>
          {loading ? (
            <TableLoadingState />
          ) : (
            <>
              <p>Pendientes: {pendientes.length}</p>
              <p>Firmados: {firmados.length}</p>
            </>
          )}
        </article>
      </div>

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
    </section>
  );
}
