import { useEffect, useMemo, useState } from 'react';

import { apiClient } from '../../lib/apiClient';
import { getAccessToken } from '../../lib/authStore';
import { asPaginated } from '../../lib/httpHelpers';
import { hasCapability } from '../../lib/capabilities';

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

export default function AdminImportExportPage({ me }) {
  const [dashboard, setDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');

  const [tipo, setTipo] = useState('estudiantes');
  const [archivo, setArchivo] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');

  const [clases, setClases] = useState([]);
  const [claseId, setClaseId] = useState('');
  const [mes, setMes] = useState('');
  const [anio, setAnio] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const canAccess = useMemo(() => {
    return hasCapability(me, 'SYSTEM_ADMIN') || hasCapability(me, 'SYSTEM_CONFIGURE');
  }, [me]);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setDashboardLoading(true);
      setDashboardError('');
      try {
        if (!canAccess) {
          return;
        }
        const payload = await apiClient.get('/api/v1/importacion/dashboard/');
        if (active) {
          setDashboard(payload);
        }
      } catch (err) {
        if (active) {
          setDashboardError(err.payload?.detail || 'No se pudo cargar dashboard de importacion.');
        }
      } finally {
        if (active) {
          setDashboardLoading(false);
        }
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, [canAccess]);

  useEffect(() => {
    let active = true;

    async function loadClases() {
      try {
        if (!canAccess) {
          return;
        }
        const payload = await apiClient.get('/api/v1/profesor/clases/?page=1');
        const paginated = asPaginated(payload);
        if (active) {
          setClases(paginated.results || []);
        }
      } catch {
        if (active) {
          setClases([]);
        }
      }
    }

    loadClases();
    return () => {
      active = false;
    };
  }, [canAccess]);

  async function onDownloadTemplate() {
    try {
      setExportError('');
      setExporting(true);
      await downloadWithAuth(`/api/v1/importacion/plantilla/${tipo}/`, `plantilla_${tipo}.csv`);
    } catch (err) {
      setExportError(err.message || 'No se pudo descargar la plantilla.');
    } finally {
      setExporting(false);
    }
  }

  async function onImportSubmit(event) {
    event.preventDefault();

    if (!archivo) {
      setImportError('Debes seleccionar un archivo CSV o XLSX.');
      return;
    }

    try {
      setImporting(true);
      setImportError('');
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

      const dashboardPayload = await apiClient.get('/api/v1/importacion/dashboard/');
      setDashboard(dashboardPayload);
    } catch (err) {
      setImportError(err.message || 'No se pudo importar el archivo.');
    } finally {
      setImporting(false);
    }
  }

  async function onExport(endpoint, queryString, fallbackName) {
    try {
      setExportError('');
      setExporting(true);
      await downloadWithAuth(`/api/v1/exportacion/${endpoint}/${queryString}`, fallbackName);
    } catch (err) {
      setExportError(err.message || 'No se pudo exportar archivo.');
    } finally {
      setExporting(false);
    }
  }

  async function onExportReporteAcademico() {
    if (!claseId.trim()) {
      setExportError('Debes indicar un clase_id para exportar reporte academico.');
      return;
    }
    await onExport('reporte-academico', `?clase_id=${encodeURIComponent(claseId.trim())}`, 'reporte_academico.csv');
  }

  async function onExportAsistencia() {
    if (!claseId.trim()) {
      setExportError('Debes indicar un clase_id para exportar asistencia.');
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

      {dashboardError ? <div className="error-box">{dashboardError}</div> : null}

      <div className="grid-2">
        <article className="card">
          <h3>Dashboard de Datos</h3>
          {dashboardLoading ? <p>Cargando resumen...</p> : null}
          {!dashboardLoading ? (
            <div className="stats-grid">
              <div className="stat-tile">
                <small>Estudiantes</small>
                <strong>{dashboard?.total_estudiantes ?? 0}</strong>
              </div>
              <div className="stat-tile">
                <small>Profesores</small>
                <strong>{dashboard?.total_profesores ?? 0}</strong>
              </div>
              <div className="stat-tile">
                <small>Apoderados</small>
                <strong>{dashboard?.total_apoderados ?? 0}</strong>
              </div>
            </div>
          ) : null}
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

        {importError ? <div className="error-box">{importError}</div> : null}

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
      </article>

      <article className="card section-card">
        <h3>Exportacion de Reportes</h3>
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

        {exportError ? <div className="error-box">{exportError}</div> : null}
      </article>
    </section>
  );
}