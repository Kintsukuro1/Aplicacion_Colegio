import { useEffect, useMemo, useState } from 'react';

import { apiClient } from '../../lib/apiClient';
import { hasCapability } from '../../lib/capabilities';

function resolveError(err, fallback) {
  return err?.payload?.error || err?.payload?.detail || fallback;
}

const EMPTY_RESOURCE = {
  titulo: '',
  descripcion: '',
  tipo: 'DOCUMENTO',
  url_externa: '',
  publicado: false,
  es_plan_lector: false,
};

export default function BibliotecarioDigitalPage({ me }) {
  const [resources, setResources] = useState([]);
  const [users, setUsers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [resourceForm, setResourceForm] = useState(EMPTY_RESOURCE);
  const [publishForm, setPublishForm] = useState({ recurso_id: '' });
  const [loanForm, setLoanForm] = useState({ recurso_id: '', usuario_id: '', dias_prestamo: 14 });
  const [returnForm, setReturnForm] = useState({ prestamo_id: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishSaving, setPublishSaving] = useState(false);
  const [loanSaving, setLoanSaving] = useState(false);
  const [returnSaving, setReturnSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const canCreate = useMemo(() => hasCapability(me, 'LIBRARY_CREATE') || hasCapability(me, 'SYSTEM_ADMIN'), [me]);
  const canEdit = useMemo(() => hasCapability(me, 'LIBRARY_EDIT') || hasCapability(me, 'SYSTEM_ADMIN'), [me]);
  const canManageLoans = useMemo(
    () => hasCapability(me, 'LIBRARY_MANAGE_LOANS') || hasCapability(me, 'SYSTEM_ADMIN'),
    [me]
  );

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError('');
      try {
        const [resourceData, userData, loanData] = await Promise.all([
          apiClient.get('/api/bibliotecario/recursos/'),
          apiClient.get('/api/bibliotecario/usuarios/').catch(() => ({ usuarios: [] })),
          apiClient.get('/api/bibliotecario/prestamos/').catch(() => ({ prestamos: [] })),
        ]);
        if (!active) {
          return;
        }
        setResources(Array.isArray(resourceData?.recursos) ? resourceData.recursos : []);
        setUsers(Array.isArray(userData?.usuarios) ? userData.usuarios : []);
        setLoans(Array.isArray(loanData?.prestamos) ? loanData.prestamos : []);
      } catch (err) {
        if (active) {
          setError(resolveError(err, 'No se pudo cargar informacion de biblioteca.'));
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

  function onChange(name, value) {
    setResourceForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (!canCreate) {
      setError('No tienes permisos para crear recursos.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = await apiClient.post('/api/bibliotecario/recursos/crear/', resourceForm);
      setMessage(payload?.message || 'Recurso creado.');
      setResourceForm(EMPTY_RESOURCE);
      const refresh = await apiClient.get('/api/bibliotecario/recursos/');
      setResources(Array.isArray(refresh?.recursos) ? refresh.recursos : []);
    } catch (err) {
      setError(resolveError(err, 'No se pudo crear el recurso.'));
    } finally {
      setSaving(false);
    }
  }

  async function onTogglePublish(event) {
    event.preventDefault();
    if (!canEdit) {
      setError('No tienes permisos para publicar/despublicar recursos.');
      return;
    }

    setPublishSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = await apiClient.post(`/api/bibliotecario/recursos/${publishForm.recurso_id}/publicar/`, {});
      setMessage(payload?.message || 'Publicacion actualizada.');
      setPublishForm({ recurso_id: '' });
      const refresh = await apiClient.get('/api/bibliotecario/recursos/');
      setResources(Array.isArray(refresh?.recursos) ? refresh.recursos : []);
    } catch (err) {
      setError(resolveError(err, 'No se pudo cambiar publicacion.'));
    } finally {
      setPublishSaving(false);
    }
  }

  async function onCreateLoan(event) {
    event.preventDefault();
    if (!canManageLoans) {
      setError('No tienes permisos para gestionar prestamos.');
      return;
    }

    setLoanSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = await apiClient.post('/api/bibliotecario/prestamos/crear/', {
        recurso_id: Number(loanForm.recurso_id),
        usuario_id: Number(loanForm.usuario_id),
        dias_prestamo: Number(loanForm.dias_prestamo),
      });
      setMessage(payload?.message || 'Prestamo registrado.');
      if (payload?.id) {
        setReturnForm({ prestamo_id: String(payload.id) });
      }
      const refreshLoans = await apiClient.get('/api/bibliotecario/prestamos/').catch(() => ({ prestamos: [] }));
      setLoans(Array.isArray(refreshLoans?.prestamos) ? refreshLoans.prestamos : []);
      setLoanForm({ recurso_id: '', usuario_id: '', dias_prestamo: 14 });
    } catch (err) {
      setError(resolveError(err, 'No se pudo crear el prestamo.'));
    } finally {
      setLoanSaving(false);
    }
  }

  async function onReturnLoan(event) {
    event.preventDefault();
    if (!canManageLoans) {
      setError('No tienes permisos para registrar devoluciones.');
      return;
    }

    setReturnSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = await apiClient.post(`/api/bibliotecario/prestamos/${returnForm.prestamo_id}/devolver/`, {});
      setMessage(payload?.message || 'Devolucion registrada.');
      setLoans((prev) => prev.filter((item) => String(item.id) !== String(returnForm.prestamo_id)));
      setReturnForm({ prestamo_id: '' });
    } catch (err) {
      setError(resolveError(err, 'No se pudo registrar devolucion.'));
    } finally {
      setReturnSaving(false);
    }
  }

  async function quickReturnLoan(loanId) {
    if (!canManageLoans) {
      setError('No tienes permisos para registrar devoluciones.');
      return;
    }

    setReturnSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = await apiClient.post(`/api/bibliotecario/prestamos/${loanId}/devolver/`, {});
      setMessage(payload?.message || 'Devolucion registrada.');
      setLoans((prev) => prev.filter((item) => String(item.id) !== String(loanId)));
    } catch (err) {
      setError(resolveError(err, 'No se pudo registrar devolucion.'));
    } finally {
      setReturnSaving(false);
    }
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Bibliotecario Digital</h2>
          <p>Catalogo de recursos y datos para prestamos.</p>
        </div>
      </header>

      {loading ? <p>Cargando catalogo...</p> : null}
      {error ? <div className="error-box">{error}</div> : null}
      {message ? <div className="card">{message}</div> : null}

      <div className="grid-2">
        <article className="card">
          <h3>Recursos ({resources.length})</h3>
          {resources.length === 0 ? <p>Sin recursos.</p> : null}
          {resources.length > 0 ? (
            <ul>
              {resources.slice(0, 12).map((item) => (
                <li key={item.id || item.id_recurso}>
                  {item.titulo || 'Sin titulo'} - {item.tipo || 'N/A'}
                </li>
              ))}
            </ul>
          ) : null}
        </article>

        <article className="card">
          <h3>Usuarios para prestamo ({users.length})</h3>
          {users.length === 0 ? <p>Sin usuarios visibles o sin permisos.</p> : null}
          {users.length > 0 ? (
            <ul>
              {users.slice(0, 12).map((item) => (
                <li key={item.id}>{item.nombre || item.full_name || `Usuario #${item.id}`}</li>
              ))}
            </ul>
          ) : null}
        </article>
      </div>

      <form className="card form-grid" onSubmit={onSubmit}>
        <h3>Nuevo recurso</h3>

        <label>
          Titulo
          <input
            value={resourceForm.titulo}
            onChange={(e) => onChange('titulo', e.target.value)}
            disabled={!canCreate || saving}
            required
          />
        </label>

        <label>
          Descripcion
          <textarea
            value={resourceForm.descripcion}
            onChange={(e) => onChange('descripcion', e.target.value)}
            disabled={!canCreate || saving}
          />
        </label>

        <label>
          Tipo
          <select value={resourceForm.tipo} onChange={(e) => onChange('tipo', e.target.value)} disabled={!canCreate || saving}>
            <option value="LIBRO">Libro</option>
            <option value="VIDEO">Video</option>
            <option value="DOCUMENTO">Documento</option>
            <option value="ENLACE">Enlace</option>
            <option value="SOFTWARE">Software</option>
            <option value="MATERIAL_CRA">Material CRA</option>
          </select>
        </label>

        <label>
          URL externa
          <input value={resourceForm.url_externa} onChange={(e) => onChange('url_externa', e.target.value)} disabled={!canCreate || saving} />
        </label>

        <label>
          <input
            type="checkbox"
            checked={resourceForm.publicado}
            onChange={(e) => onChange('publicado', e.target.checked)}
            disabled={!canCreate || saving}
          />
          Publicado
        </label>

        <label>
          <input
            type="checkbox"
            checked={resourceForm.es_plan_lector}
            onChange={(e) => onChange('es_plan_lector', e.target.checked)}
            disabled={!canCreate || saving}
          />
          Plan lector
        </label>

        <div>
          <button type="submit" disabled={!canCreate || saving || !resourceForm.titulo}>
            {saving ? 'Guardando...' : 'Crear recurso'}
          </button>
        </div>
      </form>

      <div className="grid-2">
        <form className="card form-grid" onSubmit={onTogglePublish}>
          <h3>Publicar o despublicar recurso</h3>
          <label>
            Recurso
            <select
              value={publishForm.recurso_id}
              onChange={(e) => setPublishForm({ recurso_id: e.target.value })}
              disabled={!canEdit || publishSaving}
              required
            >
              <option value="">Selecciona recurso</option>
              {resources.map((item) => (
                <option key={item.id || item.id_recurso} value={item.id || item.id_recurso}>
                  {item.titulo || `Recurso #${item.id || item.id_recurso}`}
                </option>
              ))}
            </select>
          </label>
          <div>
            <button type="submit" disabled={!canEdit || publishSaving || !publishForm.recurso_id}>
              {publishSaving ? 'Guardando...' : 'Toggle publicar'}
            </button>
          </div>
        </form>

        <form className="card form-grid" onSubmit={onCreateLoan}>
          <h3>Crear prestamo</h3>
          <label>
            Recurso
            <select
              value={loanForm.recurso_id}
              onChange={(e) => setLoanForm((prev) => ({ ...prev, recurso_id: e.target.value }))}
              disabled={!canManageLoans || loanSaving}
              required
            >
              <option value="">Selecciona recurso</option>
              {resources.map((item) => (
                <option key={item.id || item.id_recurso} value={item.id || item.id_recurso}>
                  {item.titulo || `Recurso #${item.id || item.id_recurso}`}
                </option>
              ))}
            </select>
          </label>

          <label>
            Usuario
            <select
              value={loanForm.usuario_id}
              onChange={(e) => setLoanForm((prev) => ({ ...prev, usuario_id: e.target.value }))}
              disabled={!canManageLoans || loanSaving}
              required
            >
              <option value="">Selecciona usuario</option>
              {users.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre || item.full_name || `Usuario #${item.id}`}
                </option>
              ))}
            </select>
          </label>

          <label>
            Dias prestamo
            <input
              type="number"
              min="1"
              max="90"
              value={loanForm.dias_prestamo}
              onChange={(e) => setLoanForm((prev) => ({ ...prev, dias_prestamo: e.target.value }))}
              disabled={!canManageLoans || loanSaving}
            />
          </label>

          <div>
            <button type="submit" disabled={!canManageLoans || loanSaving || !loanForm.recurso_id || !loanForm.usuario_id}>
              {loanSaving ? 'Guardando...' : 'Registrar prestamo'}
            </button>
          </div>
        </form>
      </div>

      <form className="card form-grid" onSubmit={onReturnLoan}>
        <h3>Registrar devolucion</h3>
        <label>
          Prestamo ID
          <input
            type="number"
            min="1"
            value={returnForm.prestamo_id}
            onChange={(e) => setReturnForm({ prestamo_id: e.target.value })}
            disabled={!canManageLoans || returnSaving}
            required
          />
        </label>
        <div>
          <button type="submit" disabled={!canManageLoans || returnSaving || !returnForm.prestamo_id}>
            {returnSaving ? 'Guardando...' : 'Registrar devolucion'}
          </button>
        </div>
      </form>

      <article className="card">
        <h3>Prestamos activos ({loans.length})</h3>
        {loans.length === 0 ? <p>Sin prestamos activos.</p> : null}
        {loans.length > 0 ? (
          <ul>
            {loans.slice(0, 20).map((item) => (
              <li key={item.id}>
                <strong>#{item.id}</strong> {item.recurso} - {item.usuario}
                <div>
                  <button type="button" disabled={!canManageLoans || returnSaving} onClick={() => quickReturnLoan(item.id)}>
                    Devolver ahora
                  </button>
                  <button
                    type="button"
                    disabled={!canManageLoans || returnSaving}
                    onClick={() => setReturnForm({ prestamo_id: String(item.id) })}
                  >
                    Usar en formulario
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </article>
    </section>
  );
}
