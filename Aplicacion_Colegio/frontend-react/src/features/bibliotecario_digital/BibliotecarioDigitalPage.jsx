import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../lib/store/useAuthStore';

import { apiClient } from '../../lib/apiClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePermissions } from '../../lib/hooks/usePermissions';
import { useToast } from '../../components/Toast';
import { SummarySkeleton, TableLoadingState } from '../../components/TableLoadingState';
import { formatNumber } from '../../lib/formatters';

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



export default function BibliotecarioDigitalPage() {
  const me = useAuthStore((state) => state.user);
  const toast = useToast();
  const queryClient = useQueryClient();
  const [resources, setResources] = useState([]);
  const [users, setUsers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [resourceForm, setResourceForm] = useState(EMPTY_RESOURCE);
  const [publishForm, setPublishForm] = useState({ recurso_id: '' });
  const [loanForm, setLoanForm] = useState({ recurso_id: '', usuario_id: '', dias_prestamo: 14 });
  const [returnForm, setReturnForm] = useState({ prestamo_id: '' });
  const [saving, setSaving] = useState(false);
  const [publishSaving, setPublishSaving] = useState(false);
  const [loanSaving, setLoanSaving] = useState(false);
  const [returnSaving, setReturnSaving] = useState(false);

  const { canAny } = usePermissions(me);
  const canCreate = canAny(['LIBRARY_CREATE', 'SYSTEM_ADMIN']);
  const canEdit = canAny(['LIBRARY_EDIT', 'SYSTEM_ADMIN']);
  const canManageLoans = canAny(['LIBRARY_MANAGE_LOANS', 'SYSTEM_ADMIN']);

  const { data: resourcesData, isLoading: loadingResources, error: errorResourcesObj } = useQuery({
    queryKey: ['bibliotecario-recursos'],
    queryFn: () => apiClient.get('/api/bibliotecario/recursos/')
  });
  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['bibliotecario-usuarios'],
    queryFn: () => apiClient.get('/api/bibliotecario/usuarios/')
  });
  const { data: loansData, isLoading: loadingLoans } = useQuery({
    queryKey: ['bibliotecario-prestamos'],
    queryFn: () => apiClient.get('/api/bibliotecario/prestamos/')
  });

  const loading = loadingResources || loadingUsers || loadingLoans;
  const error = errorResourcesObj?.message;

  const summaryCards = useMemo(() => {
    const publishedCount = resources.filter((item) => item.publicado).length;
    const loanCount = loans.length;

    return [
      {
        title: 'Recursos',
        value: resources.length,
        subtitle: resources.length > 0 ? 'Materiales cargados en el catálogo' : 'Sin recursos cargados',
      },
      {
        title: 'Publicados',
        value: publishedCount,
        subtitle: 'Recursos visibles para la comunidad',
      },
      {
        title: 'Usuarios',
        value: users.length,
        subtitle: 'Disponibles para préstamos y búsquedas',
      },
      {
        title: 'Préstamos activos',
        value: loanCount,
        subtitle: loanCount > 0 ? 'Circulación actual en curso' : 'No hay préstamos activos',
      },
    ];
  }, [loans.length, resources, users.length]);

  useEffect(() => {
    if (resourcesData) {
      setResources(Array.isArray(resourcesData?.recursos) ? resourcesData.recursos : []);
    }
  }, [resourcesData]);

  useEffect(() => {
    if (usersData) {
      setUsers(Array.isArray(usersData?.usuarios) ? usersData.usuarios : []);
    }
  }, [usersData]);

  useEffect(() => {
    if (loansData) {
      setLoans(Array.isArray(loansData?.prestamos) ? loansData.prestamos : []);
    }
  }, [loansData]);

  function onChange(name, value) {
    setResourceForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (!canCreate) {
      toast.error('No tienes permisos para crear recursos.');
      return;
    }

    setSaving(true);
    try {
      const payload = await apiClient.post('/api/bibliotecario/recursos/crear/', resourceForm);
      toast.success(payload?.message || 'Recurso creado.');
      setResourceForm(EMPTY_RESOURCE);
      await queryClient.invalidateQueries({ queryKey: ['bibliotecario-recursos'] });
    } catch (err) {
      toast.error(resolveError(err, 'No se pudo crear el recurso.'));
    } finally {
      setSaving(false);
    }
  }

  async function onTogglePublish(event) {
    event.preventDefault();
    if (!canEdit) {
      toast.error('No tienes permisos para publicar/despublicar recursos.');
      return;
    }

    setPublishSaving(true);
    try {
      const payload = await apiClient.post(`/api/bibliotecario/recursos/${publishForm.recurso_id}/publicar/`, {});
      toast.success(payload?.message || 'Publicacion actualizada.');
      setPublishForm({ recurso_id: '' });
      await queryClient.invalidateQueries({ queryKey: ['bibliotecario-recursos'] });
    } catch (err) {
      toast.error(resolveError(err, 'No se pudo cambiar publicacion.'));
    } finally {
      setPublishSaving(false);
    }
  }

  async function onCreateLoan(event) {
    event.preventDefault();
    if (!canManageLoans) {
      toast.error('No tienes permisos para gestionar prestamos.');
      return;
    }

    setLoanSaving(true);
    try {
      const payload = await apiClient.post('/api/bibliotecario/prestamos/crear/', {
        recurso_id: Number(loanForm.recurso_id),
        usuario_id: Number(loanForm.usuario_id),
        dias_prestamo: Number(loanForm.dias_prestamo),
      });
      toast.success(payload?.message || 'Prestamo registrado.');
      if (payload?.id) {
        setReturnForm({ prestamo_id: String(payload.id) });
      }
      await queryClient.invalidateQueries({ queryKey: ['bibliotecario-prestamos'] });
      setLoanForm({ recurso_id: '', usuario_id: '', dias_prestamo: 14 });
    } catch (err) {
      toast.error(resolveError(err, 'No se pudo crear el prestamo.'));
    } finally {
      setLoanSaving(false);
    }
  }

  async function onReturnLoan(event) {
    event.preventDefault();
    if (!canManageLoans) {
      toast.error('No tienes permisos para registrar devoluciones.');
      return;
    }

    setReturnSaving(true);
    try {
      const payload = await apiClient.post(`/api/bibliotecario/prestamos/${returnForm.prestamo_id}/devolver/`, {});
      toast.success(payload?.message || 'Devolucion registrada.');
      setLoans((prev) => prev.filter((item) => String(item.id) !== String(returnForm.prestamo_id)));
      setReturnForm({ prestamo_id: '' });
      await queryClient.invalidateQueries({ queryKey: ['bibliotecario-prestamos'] });
    } catch (err) {
      toast.error(resolveError(err, 'No se pudo registrar devolucion.'));
    } finally {
      setReturnSaving(false);
    }
  }

  async function quickReturnLoan(loanId) {
    if (!canManageLoans) {
      toast.error('No tienes permisos para registrar devoluciones.');
      return;
    }

    setReturnSaving(true);
    try {
      const payload = await apiClient.post(`/api/bibliotecario/prestamos/${loanId}/devolver/`, {});
      toast.success(payload?.message || 'Devolucion registrada.');
      setLoans((prev) => prev.filter((item) => String(item.id) !== String(loanId)));
      await queryClient.invalidateQueries({ queryKey: ['bibliotecario-prestamos'] });
    } catch (err) {
      toast.error(resolveError(err, 'No se pudo registrar devolucion.'));
    } finally {
      setReturnSaving(false);
    }
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Bibliotecario Digital</h2>
          <p>Catálogo de recursos, publicaciones y préstamos con permisos por acción.</p>
        </div>
      </header>

      {error ? <div className="error-box">{error}</div> : null}

      <div className="summary-grid">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
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
          <h3>Recursos ({resources.length})</h3>
          {loading ? (
            <TableLoadingState />
          ) : resources.length === 0 ? (
            <p>Sin recursos.</p>
          ) : (
            <ul>
              {resources.slice(0, 12).map((item) => (
                <li key={item.id || item.id_recurso}>
                  {item.titulo || 'Sin titulo'} - {item.tipo || 'N/A'}
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="card section-card">
          <h3>Usuarios para prestamo ({users.length})</h3>
          {loading ? (
            <TableLoadingState />
          ) : users.length === 0 ? (
            <p>Sin usuarios visibles o sin permisos.</p>
          ) : (
            <ul>
              {users.slice(0, 12).map((item) => (
                <li key={item.id}>{item.nombre || item.full_name || `Usuario #${item.id}`}</li>
              ))}
            </ul>
          )}
        </article>
      </div>

      <form className="card section-card form-grid" onSubmit={onSubmit}>
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
        <form className="card section-card form-grid" onSubmit={onTogglePublish}>
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

        <form className="card section-card form-grid" onSubmit={onCreateLoan}>
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

      <form className="card section-card form-grid" onSubmit={onReturnLoan}>
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

      <article className="card section-card">
        <div className="section-card-head">
          <div>
            <h3>Préstamos activos ({loans.length})</h3>
            <p>Control de circulación y devoluciones desde el mismo panel.</p>
          </div>
        </div>

        {loading ? (
          <TableLoadingState />
        ) : loans.length === 0 ? (
          <p>Sin prestamos activos.</p>
        ) : (
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
        )}
      </article>
    </section>
  );
}

