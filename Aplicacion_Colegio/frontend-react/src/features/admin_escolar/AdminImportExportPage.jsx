import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../lib/store/useAuthStore';

import { apiClient } from '../../lib/apiClient';
import { useFetch } from '../../lib/hooks';
import { usePermissions } from '../../lib/hooks/usePermissions';
import { getAccessToken } from '../../lib/authStore';
import { SummarySkeleton } from '../../components/TableLoadingState';
import { formatNumber } from '../../lib/formatters';
import { useToast } from '../../components/Toast';

const TIPOS_IMPORTACION = ['estudiantes', 'profesores', 'apoderados'];

function getFilenameFromDisposition(disposition, fallbackName) {
  if (!disposition) {
    return fallbackName;
  }

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
  if (plainMatch?.[1]) {
    return plainMatch[1];
  }

  return fallbackName;
}

async function parseErrorPayload(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const payload = await response.json();
    return payload?.detail || JSON.stringify(payload);
  }
  const text = await response.text();
  return text || response.statusText;
}

async function downloadWithAuth(path, fallbackName) {
  const access = getAccessToken();
  const headers = {};
  if (access) {
    headers.Authorization = `Bearer ${access}`;
  }

  const response = await fetch(`${apiClient.baseUrl}${path}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const detail = await parseErrorPayload(response);
    throw new Error(detail || 'No se pudo descargar el archivo.');
  }

  const disposition = response.headers.get('content-disposition');
  const fileName = getFilenameFromDisposition(disposition, fallbackName);
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

export default function AdminImportExportPage() {
  const me = useAuthStore((state) => state.user);
  const toast = useToast();
  const permissions = usePermissions(me);
  const [dashboard, setDashboard] = useState(null);

  const [tipo, setTipo] = useState('estudiantes');
  const [archivo, setArchivo] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const [clases, setClases] = useState([]);
  const [claseId, setClaseId] = useState('');
  const [mes, setMes] = useState('');
  const [anio, setAnio] = useState('');
  const [exporting, setExporting] = useState(false);

  const canAccess = useMemo(() => permissions.canAny(['SYSTEM_ADMIN', 'SYSTEM_CONFIGURE']), [permissions]);
  const canMutateImportExport = permissions.isSystemAdmin;



  const { data: dashboardResp, loading: dashboardLoading, error: dashboardError } = useFetch(
    '/api/v1/importacion/dashboard/',
    { skip: !canAccess }
  );

  useEffect(() => {
    setDashboard(dashboardResp || null);
  }, [dashboardResp]);

  const { data: clasesResp, error: clasesErrorHook } = useFetch('/api/v1/profesor/clases/?page=1', { skip: !canAccess });
  useEffect(() => {
    const items = Array.isArray(clasesResp?.results) ? clasesResp.results : [];
    setClases(items);
    if (clasesErrorHook) setClases([]);
  }, [clasesResp, clasesErrorHook]);

  async function onDownloadTemplate() {
    try {
      setExporting(true);
      await downloadWithAuth(`/api/v1/importacion/plantilla/${tipo}/`, `plantilla_${tipo}.csv`);
      toast.success('Plantilla descargada correctamente.');
    } catch (err) {
      toast.error(err.message || 'No se pudo descargar la plantilla.');
    } finally {
      setExporting(false);
    }
  }

  async function onImportSubmit(event) {
    event.preventDefault();

    if (!archivo) {
      toast.error('Debes seleccionar un archivo CSV o XLSX.');
      return;
    }

    try {
      setImporting(true);
      setImportResult(null);

      const formData = new FormData();
      formData.append('tipo', tipo);
      formData.append('archivo', archivo);

      const access = getAccessToken();
      const headers = {};
      if (access) {
        headers.Authorization = `Bearer ${access}`;
      }

      const response = await fetch(`${apiClient.baseUrl}/api/v1/importacion/importar/`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const detail = await parseErrorPayload(response);
        throw new Error(detail || 'No se pudo importar el archivo.');
      }

      const payload = await response.json();
      setImportResult(payload);
      setArchivo(null);
      toast.success('Importacion completada.');

      const dashboardPayload = await apiClient.get('/api/v1/importacion/dashboard/');
      setDashboard(dashboardPayload);
    } catch (err) {
      toast.error(err.message || 'No se pudo importar el archivo.');
    } finally {
      setImporting(false);
    }
  }

  async function onExport(endpoint, queryString, fallbackName) {
    try {
      setExporting(true);
      await downloadWithAuth(`/api/v1/exportacion/${endpoint}/${queryString}`, fallbackName);
      toast.success('Exportacion generada correctamente.');
    } catch (err) {
      toast.error(err.message || 'No se pudo exportar archivo.');
    } finally {
      setExporting(false);
    }
  }

  async function onExportReporteAcademico() {
    if (!claseId.trim()) {
      toast.error('Debes indicar un clase_id para exportar reporte academico.');
      return;
    }
    await onExport('reporte-academico', `?clase_id=${encodeURIComponent(claseId.trim())}`, 'reporte_academico.csv');
  }

  async function onExportAsistencia() {
    if (!claseId.trim()) {
      toast.error('Debes indicar un clase_id para exportar asistencia.');
      return;
    }

    const params = new URLSearchParams();
    params.set('clase_id', claseId.trim());
    if (mes.trim()) {
      params.set('mes', mes.trim());
    }
    if (anio.trim()) {
      params.set('anio', anio.trim());
    }

    await onExport('asistencia', `?${params.toString()}`, 'reporte_asistencia.csv');
  }

  if (!canAccess) {
    return (
      <section>
        <header className="page-header">
          <div>
            <h2>Admin Escolar: Importacion y Exportacion</h2>
            <p>No tienes permisos para acceder a este modulo.</p>
          </div>
        </header>
      </section>
    );
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Admin Escolar: Importacion y Exportacion</h2>
          <p>Modulo funcional para los 7 endpoints de Semana 11-12.</p>
        </div>
      </header>

      {!canMutateImportExport ? (
        <div className="card" role="status">
          <strong>Vista de consulta</strong>
          <p>
            Tu rol puede ver el resumen del colegio, pero no ejecutar importaciones ni exportaciones masivas.
          </p>
        </div>
      ) : null}

      {dashboardError ? <div className="error-box">{dashboardError}</div> : null}

      <div className="grid-2">
        <article className="card">
          <h3>Dashboard de Datos</h3>
          <div className="stats-grid">
            {dashboardLoading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <SummarySkeleton key={index} />
                ))
              : [
                  { label: 'Estudiantes', value: dashboard?.total_estudiantes ?? 0 },
                  { label: 'Profesores', value: dashboard?.total_profesores ?? 0 },
                  { label: 'Apoderados', value: dashboard?.total_apoderados ?? 0 },
                ].map((item) => (
                  <div key={item.label} className="stat-tile">
                    <small>{item.label}</small>
                    <strong>{formatNumber(item.value)}</strong>
                  </div>
                ))}
          </div>
        </article>

        <article className="card">
          <h3>Plantillas CSV</h3>
          <label>
            Tipo
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} disabled={exporting || importing}>
              {TIPOS_IMPORTACION.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <div className="actions section-card">
            <button type="button" onClick={onDownloadTemplate} disabled={exporting || importing}>
              Descargar Plantilla
            </button>
          </div>
        </article>
      </div>

      <article className="card section-card">
        <h3>Importacion Masiva</h3>
        {canMutateImportExport ? (
          <>
            <form className="form-grid" onSubmit={onImportSubmit}>
              <label>
                Tipo de Carga
                <select value={tipo} onChange={(e) => setTipo(e.target.value)} disabled={importing || exporting}>
                  {TIPOS_IMPORTACION.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Archivo (CSV/XLSX)
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                  disabled={importing || exporting}
                />
              </label>

              <div className="actions full">
                <button type="submit" disabled={importing || exporting}>
                  {importing ? 'Importando...' : 'Importar Datos'}
                </button>
              </div>
            </form>

            {importResult ? (
              <div className="import-summary">
                <p>
                  Resultado: {importResult.exitosos} exitosos, {importResult.fallidos} fallidos,
                  total procesados {importResult.total_procesados}.
                </p>
                {Array.isArray(importResult.errores) && importResult.errores.length > 0 ? (
                  <details>
                    <summary>Ver errores ({importResult.errores.length})</summary>
                    <ul>
                      {importResult.errores.map((errorItem, idx) => (
                        <li key={`${idx}-${errorItem}`}>{errorItem}</li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <p>La importacion masiva solo esta disponible para administradores del sistema.</p>
        )}
      </article>

      <article className="card section-card">
        <h3>Exportacion de Reportes</h3>
        {canMutateImportExport ? (
          <div className="form-grid">
            <label>
              Clase ID
              <input
                type="number"
                min="1"
                value={claseId}
                onChange={(e) => setClaseId(e.target.value)}
                placeholder="Ej: 12"
                disabled={exporting || importing}
              />
            </label>

            <label>
              Clases Disponibles (opcional)
              <select
                value={claseId}
                onChange={(e) => setClaseId(e.target.value)}
                disabled={exporting || importing || clases.length === 0}
              >
                <option value="">Selecciona una clase</option>
                {clases.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id} - {item.curso_nombre} / {item.asignatura_nombre}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Mes (asistencia)
              <input
                type="number"
                min="1"
                max="12"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                placeholder="1-12"
                disabled={exporting || importing}
              />
            </label>

            <label>
              Anio (asistencia)
              <input
                type="number"
                min="2000"
                value={anio}
                onChange={(e) => setAnio(e.target.value)}
                placeholder="Ej: 2026"
                disabled={exporting || importing}
              />
            </label>

            <div className="actions full">
              <button type="button" onClick={() => onExport('estudiantes', '', 'estudiantes.csv')} disabled={exporting || importing}>
                Exportar Estudiantes
              </button>
              <button type="button" onClick={() => onExport('profesores', '', 'profesores.csv')} disabled={exporting || importing}>
                Exportar Profesores
              </button>
              <button type="button" onClick={onExportReporteAcademico} disabled={exporting || importing}>
                Exportar Reporte Academico
              </button>
              <button type="button" onClick={onExportAsistencia} disabled={exporting || importing}>
                Exportar Asistencia
              </button>
            </div>
          </div>
        ) : (
          <p>Las exportaciones masivas requieren rol de administrador del sistema.</p>
        )}
      </article>
    </section>
  );
}
