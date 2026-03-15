import { useEffect, useMemo, useState } from 'react';

import { apiClient } from '../../lib/apiClient';
import { hasCapability } from '../../lib/capabilities';

const EMPTY_FORM = {
  estudiante_id: '',
  fecha: '',
  motivo: 'ACADEMICO',
  observaciones: '',
  acuerdos: '',
  seguimiento_requerido: false,
};

function resolveError(err, fallback) {
  return err?.payload?.error || err?.payload?.detail || fallback;
}

export default function PsicologoOrientadorPage({ me }) {
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [referralForm, setReferralForm] = useState({
    estudiante_id: '',
    profesional_destino: '',
    especialidad: '',
    motivo: '',
    fecha_derivacion: '',
  });
  const [updateReferralForm, setUpdateReferralForm] = useState({
    derivacion_id: '',
    estado: 'EN_PROCESO',
    informe_retorno: '',
    fecha_retorno: '',
  });
  const [pieForm, setPieForm] = useState({ estudiante_id: '', requiere_pie: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [referralSaving, setReferralSaving] = useState(false);
  const [updateReferralSaving, setUpdateReferralSaving] = useState(false);
  const [pieSaving, setPieSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const canCreate = useMemo(() => hasCapability(me, 'COUNSELING_CREATE') || hasCapability(me, 'SYSTEM_ADMIN'), [me]);
  const canCreateReferral = useMemo(
    () => hasCapability(me, 'REFERRAL_CREATE') || hasCapability(me, 'SYSTEM_ADMIN'),
    [me]
  );
  const canEditReferral = useMemo(
    () => hasCapability(me, 'REFERRAL_EDIT') || hasCapability(me, 'SYSTEM_ADMIN'),
    [me]
  );

  useEffect(() => {
    let active = true;

    async function loadStudents() {
      setLoading(true);
      setError('');
      try {
        const payload = await apiClient.get('/api/psicologo/estudiantes/');
        if (active) {
          setStudents(Array.isArray(payload?.estudiantes) ? payload.estudiantes : []);
        }
      } catch (err) {
        if (active) {
          setError(resolveError(err, 'No se pudo cargar estudiantes.'));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadStudents();
    return () => {
      active = false;
    };
  }, []);

  function onChange(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (!canCreate) {
      setError('No tienes permisos para crear entrevistas.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = await apiClient.post('/api/psicologo/entrevistas/crear/', {
        estudiante_id: Number(form.estudiante_id),
        fecha: form.fecha,
        motivo: form.motivo,
        observaciones: form.observaciones,
        acuerdos: form.acuerdos,
        seguimiento_requerido: Boolean(form.seguimiento_requerido),
      });
      setMessage(payload?.message || 'Entrevista creada.');
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(resolveError(err, 'No se pudo crear la entrevista.'));
    } finally {
      setSaving(false);
    }
  }

  async function onReferralSubmit(event) {
    event.preventDefault();
    if (!canCreateReferral) {
      setError('No tienes permisos para crear derivaciones.');
      return;
    }

    setReferralSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = await apiClient.post('/api/psicologo/derivaciones/crear/', {
        estudiante_id: Number(referralForm.estudiante_id),
        profesional_destino: referralForm.profesional_destino,
        especialidad: referralForm.especialidad,
        motivo: referralForm.motivo,
        fecha_derivacion: referralForm.fecha_derivacion || undefined,
      });
      setMessage(payload?.message || 'Derivacion registrada.');
      setReferralForm({ estudiante_id: '', profesional_destino: '', especialidad: '', motivo: '', fecha_derivacion: '' });
    } catch (err) {
      setError(resolveError(err, 'No se pudo crear la derivacion.'));
    } finally {
      setReferralSaving(false);
    }
  }

  async function onUpdateReferralSubmit(event) {
    event.preventDefault();
    if (!canEditReferral) {
      setError('No tienes permisos para editar derivaciones.');
      return;
    }

    setUpdateReferralSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = await apiClient.post(`/api/psicologo/derivaciones/${updateReferralForm.derivacion_id}/`, {
        estado: updateReferralForm.estado,
        informe_retorno: updateReferralForm.informe_retorno,
        fecha_retorno: updateReferralForm.fecha_retorno || undefined,
      });
      setMessage(payload?.message || 'Derivacion actualizada.');
      setUpdateReferralForm({ derivacion_id: '', estado: 'EN_PROCESO', informe_retorno: '', fecha_retorno: '' });
    } catch (err) {
      setError(resolveError(err, 'No se pudo actualizar la derivacion.'));
    } finally {
      setUpdateReferralSaving(false);
    }
  }

  async function onPieSubmit(event) {
    event.preventDefault();
    if (!canCreate) {
      setError('No tienes permisos para gestionar estado PIE.');
      return;
    }

    setPieSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = await apiClient.post(`/api/psicologo/estudiantes/${pieForm.estudiante_id}/pie/`, {
        requiere_pie: Boolean(pieForm.requiere_pie),
      });
      setMessage(payload?.message || 'Estado PIE actualizado.');
      setPieForm({ estudiante_id: '', requiere_pie: true });
    } catch (err) {
      setError(resolveError(err, 'No se pudo actualizar estado PIE.'));
    } finally {
      setPieSaving(false);
    }
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Psicologo Orientador</h2>
          <p>Registro rapido de entrevistas de orientacion.</p>
        </div>
      </header>

      {loading ? <p>Cargando estudiantes...</p> : null}
      {error ? <div className="error-box">{error}</div> : null}
      {message ? <div className="card">{message}</div> : null}

      <div className="grid-2">
        <form className="card form-grid" onSubmit={onSubmit}>
          <h3>Nueva entrevista</h3>

        <label>
          Estudiante
          <select
            value={form.estudiante_id}
            onChange={(e) => onChange('estudiante_id', e.target.value)}
            disabled={!canCreate || saving}
            required
          >
            <option value="">Selecciona estudiante</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.nombre_completo || student.nombre || `Estudiante #${student.id}`}
              </option>
            ))}
          </select>
        </label>

        <label>
          Fecha
          <input
            type="date"
            value={form.fecha}
            onChange={(e) => onChange('fecha', e.target.value)}
            disabled={!canCreate || saving}
            required
          />
        </label>

        <label>
          Motivo
          <select value={form.motivo} onChange={(e) => onChange('motivo', e.target.value)} disabled={!canCreate || saving}>
            <option value="ACADEMICO">Academico</option>
            <option value="CONDUCTUAL">Conductual</option>
            <option value="SOCIOEMOCIONAL">Socioemocional</option>
            <option value="FAMILIAR">Familiar</option>
            <option value="OTRO">Otro</option>
          </select>
        </label>

        <label>
          Observaciones
          <textarea
            value={form.observaciones}
            onChange={(e) => onChange('observaciones', e.target.value)}
            disabled={!canCreate || saving}
            required
          />
        </label>

        <label>
          Acuerdos
          <textarea value={form.acuerdos} onChange={(e) => onChange('acuerdos', e.target.value)} disabled={!canCreate || saving} />
        </label>

        <label>
          <input
            type="checkbox"
            checked={form.seguimiento_requerido}
            onChange={(e) => onChange('seguimiento_requerido', e.target.checked)}
            disabled={!canCreate || saving}
          />
          Requiere seguimiento
        </label>

          <div>
            <button type="submit" disabled={!canCreate || saving || !form.estudiante_id || !form.fecha || !form.observaciones}>
              {saving ? 'Guardando...' : 'Registrar entrevista'}
            </button>
          </div>
        </form>

        <form className="card form-grid" onSubmit={onReferralSubmit}>
          <h3>Nueva derivacion</h3>

          <label>
            Estudiante
            <select
              value={referralForm.estudiante_id}
              onChange={(e) => setReferralForm((prev) => ({ ...prev, estudiante_id: e.target.value }))}
              disabled={!canCreateReferral || referralSaving}
              required
            >
              <option value="">Selecciona estudiante</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.nombre_completo || student.nombre || `Estudiante #${student.id}`}
                </option>
              ))}
            </select>
          </label>

          <label>
            Profesional destino
            <input
              value={referralForm.profesional_destino}
              onChange={(e) => setReferralForm((prev) => ({ ...prev, profesional_destino: e.target.value }))}
              disabled={!canCreateReferral || referralSaving}
              required
            />
          </label>

          <label>
            Especialidad
            <input
              value={referralForm.especialidad}
              onChange={(e) => setReferralForm((prev) => ({ ...prev, especialidad: e.target.value }))}
              disabled={!canCreateReferral || referralSaving}
              required
            />
          </label>

          <label>
            Fecha derivacion
            <input
              type="date"
              value={referralForm.fecha_derivacion}
              onChange={(e) => setReferralForm((prev) => ({ ...prev, fecha_derivacion: e.target.value }))}
              disabled={!canCreateReferral || referralSaving}
            />
          </label>

          <label>
            Motivo
            <textarea
              value={referralForm.motivo}
              onChange={(e) => setReferralForm((prev) => ({ ...prev, motivo: e.target.value }))}
              disabled={!canCreateReferral || referralSaving}
              required
            />
          </label>

          <div>
            <button
              type="submit"
              disabled={
                !canCreateReferral ||
                referralSaving ||
                !referralForm.estudiante_id ||
                !referralForm.profesional_destino ||
                !referralForm.especialidad ||
                !referralForm.motivo
              }
            >
              {referralSaving ? 'Guardando...' : 'Registrar derivacion'}
            </button>
          </div>
        </form>
      </div>

      <div className="grid-2">
        <form className="card form-grid" onSubmit={onUpdateReferralSubmit}>
          <h3>Actualizar derivacion</h3>

          <label>
            Derivacion ID
            <input
              type="number"
              min="1"
              value={updateReferralForm.derivacion_id}
              onChange={(e) => setUpdateReferralForm((prev) => ({ ...prev, derivacion_id: e.target.value }))}
              disabled={!canEditReferral || updateReferralSaving}
              required
            />
          </label>

          <label>
            Estado
            <select
              value={updateReferralForm.estado}
              onChange={(e) => setUpdateReferralForm((prev) => ({ ...prev, estado: e.target.value }))}
              disabled={!canEditReferral || updateReferralSaving}
            >
              <option value="PENDIENTE">Pendiente</option>
              <option value="EN_PROCESO">En proceso</option>
              <option value="COMPLETADA">Completada</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </label>

          <label>
            Fecha retorno
            <input
              type="date"
              value={updateReferralForm.fecha_retorno}
              onChange={(e) => setUpdateReferralForm((prev) => ({ ...prev, fecha_retorno: e.target.value }))}
              disabled={!canEditReferral || updateReferralSaving}
            />
          </label>

          <label>
            Informe retorno
            <textarea
              value={updateReferralForm.informe_retorno}
              onChange={(e) => setUpdateReferralForm((prev) => ({ ...prev, informe_retorno: e.target.value }))}
              disabled={!canEditReferral || updateReferralSaving}
            />
          </label>

          <div>
            <button type="submit" disabled={!canEditReferral || updateReferralSaving || !updateReferralForm.derivacion_id}>
              {updateReferralSaving ? 'Guardando...' : 'Actualizar derivacion'}
            </button>
          </div>
        </form>

        <form className="card form-grid" onSubmit={onPieSubmit}>
          <h3>Actualizar estado PIE</h3>

          <label>
            Estudiante
            <select
              value={pieForm.estudiante_id}
              onChange={(e) => setPieForm((prev) => ({ ...prev, estudiante_id: e.target.value }))}
              disabled={!canCreate || pieSaving}
              required
            >
              <option value="">Selecciona estudiante</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.nombre_completo || student.nombre || `Estudiante #${student.id}`}
                </option>
              ))}
            </select>
          </label>

          <label>
            <input
              type="checkbox"
              checked={pieForm.requiere_pie}
              onChange={(e) => setPieForm((prev) => ({ ...prev, requiere_pie: e.target.checked }))}
              disabled={!canCreate || pieSaving}
            />
            Requiere PIE
          </label>

          <div>
            <button type="submit" disabled={!canCreate || pieSaving || !pieForm.estudiante_id}>
              {pieSaving ? 'Guardando...' : 'Actualizar PIE'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
