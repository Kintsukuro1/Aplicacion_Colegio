import { useMemo, useState } from 'react';
import { useAuthStore } from '../../lib/store/useAuthStore';

import { apiClient } from '../../lib/apiClient';
import { usePermissions } from '../../lib/hooks/usePermissions';
import { useToast } from '../../components/Toast';

function resolveError(err, fallback) {
  return err?.payload?.error || err?.payload?.detail || fallback;
}

export default function SoporteTecnicoPage() {
  const me = useAuthStore((state) => state.user);
  const { canAny, isSystemAdmin } = usePermissions(me);
  const [ticketForm, setTicketForm] = useState({
    titulo: '',
    descripcion: '',
    categoria: 'OTRO',
    prioridad: 'MEDIA',
  });
  const [statusForm, setStatusForm] = useState({
    ticket_id: '',
    estado: 'EN_PROGRESO',
    resolucion: '',
  });
  const [resetForm, setResetForm] = useState({
    user_id: '',
    approval_request_id: '',
    new_password: '',
  });
  const [savingTicket, setSavingTicket] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingReset, setSavingReset] = useState(false);
  const toast = useToast();

  const canCreateTicket = isSystemAdmin || canAny(['SUPPORT_CREATE_TICKET']);
  const canResolveTicket = isSystemAdmin || canAny(['SUPPORT_RESOLVE_TICKET']);
  const canResetPassword = isSystemAdmin || canAny(['SUPPORT_RESET_PASSWORD', 'SUPPORT_RESOLVE_TICKET']);

  const summaryCards = useMemo(() => {
    return [
      {
        title: 'Crear tickets',
        value: canCreateTicket ? 'Habilitado' : 'Bloqueado',
        subtitle: canCreateTicket ? 'Puedes abrir nuevas incidencias' : 'Solo lectura para nuevos tickets',
      },
      {
        title: 'Resolver tickets',
        value: canResolveTicket ? 'Habilitado' : 'Bloqueado',
        subtitle: canResolveTicket ? 'Puedes actualizar estados' : 'No puedes cambiar estados',
      },
      {
        title: 'Reset de contraseña',
        value: canResetPassword ? 'Habilitado' : 'Bloqueado',
        subtitle: canResetPassword ? 'Puedes iniciar el flujo de segundo aprobador' : 'No puedes ejecutar resets',
      },
    ];
  }, [canCreateTicket, canResolveTicket, canResetPassword]);

  function onTicketChange(name, value) {
    setTicketForm((prev) => ({ ...prev, [name]: value }));
  }

  function onStatusChange(name, value) {
    setStatusForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onCreateTicket(event) {
    event.preventDefault();
    if (!canCreateTicket) {
      toast.error('No tienes permisos para crear tickets.');
      return;
    }

    setSavingTicket(true);
    try {
      const payload = await apiClient.post('/api/soporte/tickets/crear/', ticketForm);
      toast.success(payload?.message || 'Ticket creado correctamente.');
      setTicketForm({ titulo: '', descripcion: '', categoria: 'OTRO', prioridad: 'MEDIA' });
      if (payload?.id) {
        setStatusForm((prev) => ({ ...prev, ticket_id: String(payload.id) }));
      }
    } catch (err) {
      toast.error(resolveError(err, 'No se pudo crear el ticket.'));
    } finally {
      setSavingTicket(false);
    }
  }

  async function onUpdateStatus(event) {
    event.preventDefault();
    if (!canResolveTicket) {
      toast.error('No tienes permisos para resolver tickets.');
      return;
    }

    setSavingStatus(true);
    try {
      const payload = await apiClient.post(`/api/soporte/tickets/${statusForm.ticket_id}/estado/`, {
        estado: statusForm.estado,
        resolucion: statusForm.resolucion,
      });
      toast.success(payload?.message || 'Estado de ticket actualizado.');
      setStatusForm({ ticket_id: '', estado: 'EN_PROGRESO', resolucion: '' });
    } catch (err) {
      toast.error(resolveError(err, 'No se pudo actualizar el ticket.'));
    } finally {
      setSavingStatus(false);
    }
  }

  async function onResetPassword(event) {
    event.preventDefault();
    if (!canResetPassword) {
      toast.error('No tienes permisos para restablecer contrasenas.');
      return;
    }

    setSavingReset(true);
    try {
      const payload = await apiClient.post(`/api/soporte/usuarios/${resetForm.user_id}/reset_password/`, {
        approval_request_id: resetForm.approval_request_id ? Number(resetForm.approval_request_id) : undefined,
        new_password: resetForm.new_password || undefined,
      });

      if (payload?.requires_approval && payload?.request_id) {
        toast.info(
          `Solicitud registrada (request_id ${payload.request_id}). Usa ese ID y la nueva contrasena para ejecutar el reset con segundo aprobador.`
        );
        setResetForm((prev) => ({ ...prev, approval_request_id: String(payload.request_id) }));
      } else {
        toast.success(payload?.message || 'Contrasena restablecida correctamente.');
        setResetForm({ user_id: '', approval_request_id: '', new_password: '' });
      }
    } catch (err) {
      toast.error(resolveError(err, 'No se pudo ejecutar reset de contrasena.'));
    } finally {
      setSavingReset(false);
    }
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Soporte Tecnico</h2>
          <p>Flujo operativo para tickets, estados y restablecimiento de contraseñas.</p>
        </div>
      </header>

      <div className="summary-grid">
        {summaryCards.map((item) => (
          <article key={item.title} className="summary-tile">
            <small>{item.title}</small>
            <strong>{item.value}</strong>
            <span>{item.subtitle}</span>
          </article>
        ))}
      </div>

      <div className="grid-2">
        <form className="card form-grid" onSubmit={onCreateTicket}>
          <h3>Crear ticket</h3>

          <label>
            Titulo
            <input
              value={ticketForm.titulo}
              onChange={(e) => onTicketChange('titulo', e.target.value)}
              disabled={!canCreateTicket || savingTicket}
              required
            />
          </label>

          <label>
            Descripcion
            <textarea
              value={ticketForm.descripcion}
              onChange={(e) => onTicketChange('descripcion', e.target.value)}
              disabled={!canCreateTicket || savingTicket}
              required
            />
          </label>

          <label>
            Categoria
            <select
              value={ticketForm.categoria}
              onChange={(e) => onTicketChange('categoria', e.target.value)}
              disabled={!canCreateTicket || savingTicket}
            >
              <option value="ACCESO">Acceso</option>
              <option value="PLATAFORMA">Plataforma</option>
              <option value="CONTRASEÑA">Contrasena</option>
              <option value="OTRO">Otro</option>
            </select>
          </label>

          <label>
            Prioridad
            <select
              value={ticketForm.prioridad}
              onChange={(e) => onTicketChange('prioridad', e.target.value)}
              disabled={!canCreateTicket || savingTicket}
            >
              <option value="BAJA">Baja</option>
              <option value="MEDIA">Media</option>
              <option value="ALTA">Alta</option>
              <option value="URGENTE">Urgente</option>
            </select>
          </label>

          <div>
            <button type="submit" disabled={!canCreateTicket || savingTicket || !ticketForm.titulo || !ticketForm.descripcion}>
              {savingTicket ? 'Guardando...' : 'Crear ticket'}
            </button>
          </div>
        </form>

        <form className="card form-grid" onSubmit={onUpdateStatus}>
          <h3>Actualizar ticket</h3>

          <label>
            Ticket ID
            <input
              type="number"
              min="1"
              value={statusForm.ticket_id}
              onChange={(e) => onStatusChange('ticket_id', e.target.value)}
              disabled={!canResolveTicket || savingStatus}
              required
            />
          </label>

          <label>
            Estado
            <select
              value={statusForm.estado}
              onChange={(e) => onStatusChange('estado', e.target.value)}
              disabled={!canResolveTicket || savingStatus}
            >
              <option value="ABIERTO">Abierto</option>
              <option value="EN_PROGRESO">En progreso</option>
              <option value="RESUELTO">Resuelto</option>
              <option value="CERRADO">Cerrado</option>
            </select>
          </label>

          <label>
            Resolucion
            <textarea
              value={statusForm.resolucion}
              onChange={(e) => onStatusChange('resolucion', e.target.value)}
              disabled={!canResolveTicket || savingStatus}
            />
          </label>

          <div>
            <button type="submit" disabled={!canResolveTicket || savingStatus || !statusForm.ticket_id}>
              {savingStatus ? 'Guardando...' : 'Actualizar estado'}
            </button>
          </div>
        </form>
      </div>

      <form className="card form-grid" onSubmit={onResetPassword}>
        <h3>Reset de contrasena</h3>
        <p>
          Fase 1: envia solo usuario para crear solicitud. Fase 2: envia `approval_request_id` y `new_password` para ejecutar.
        </p>

        <label>
          Usuario ID
          <input
            type="number"
            min="1"
            value={resetForm.user_id}
            onChange={(e) => setResetForm((prev) => ({ ...prev, user_id: e.target.value }))}
            disabled={!canResetPassword || savingReset}
            required
          />
        </label>

        <label>
          Approval Request ID (fase 2)
          <input
            type="number"
            min="1"
            value={resetForm.approval_request_id}
            onChange={(e) => setResetForm((prev) => ({ ...prev, approval_request_id: e.target.value }))}
            disabled={!canResetPassword || savingReset}
          />
        </label>

        <label>
          Nueva contrasena (fase 2)
          <input
            type="password"
            value={resetForm.new_password}
            onChange={(e) => setResetForm((prev) => ({ ...prev, new_password: e.target.value }))}
            disabled={!canResetPassword || savingReset}
          />
        </label>

        <div>
          <button type="submit" disabled={!canResetPassword || savingReset || !resetForm.user_id}>
            {savingReset ? 'Procesando...' : 'Ejecutar flujo reset'}
          </button>
        </div>
      </form>
    </section>
  );
}

