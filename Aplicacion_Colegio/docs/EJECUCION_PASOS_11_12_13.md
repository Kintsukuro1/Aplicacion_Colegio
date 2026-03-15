# Ejecucion Pasos 11, 12 y 13

## Paso 11 - Arquitectura SaaS operable

### 11.1 Infraestructura base por ambientes
- Entregable: templates de variables por ambiente.
- Evidencia: `.env.dev.example`, `.env.staging.example`, `.env.prod.example`.
- Entregable: stack dev estandar con Django + PostgreSQL + Redis.
- Evidencia: `docker-compose.yml` (servicios `web`, `db`, `redis`).
- Entregable: backup diario PostgreSQL + retencion.
- Evidencia: `scripts/backup_postgres.ps1` (retencion parametrizable, default 30 dias).
- Politica sugerida:
  - Frecuencia: diario 02:00.
  - Retencion: 30 dias online + export semanal fuera del host.
  - Restauracion de prueba: 1 vez por sprint.

### 11.2 Gateway gradual (Nginx)
- Entregable: gateway delante de Django con compresion, limites por ruta y trazabilidad.
- Evidencia:
  - `gateway/nginx/nginx.conf`
  - `docker-compose.gateway.yml`
- Reglas implementadas:
  - `limit_req` por IP para `/api/v1/auth/`, `/api/v1/uploads/`, `/api/v1/reportes/`.
  - Propagacion de `X-Request-ID` hacia backend.
  - Compresion `gzip` habilitada.

### 11.3 Redis con casos concretos
- Entregable: cache de lecturas frecuentes con TTL corto.
- Evidencia: `backend/apps/api/resources_views.py` (`dashboard_summary` con cache tenant-aware, TTL `CACHE_TIMEOUT_SHORT`).
- Entregable: locking para procesos concurrentes de notificaciones.
- Evidencia: `backend/apps/notificaciones/services/dispatch_service.py` (lock por notificacion via cache/redis).
- Entregable: invalidacion centralizada por tenant.
- Evidencia:
  - `backend/common/services/tenant_cache_service.py`
  - `backend/apps/core/management/commands/invalidate_tenant_cache.py`

### 11.4 Observabilidad operativa
- Entregable: healthchecks profundos (`db`, `redis`, `migrations`) ademas de `/health/`.
- Evidencia:
  - `backend/apps/core/services/system_health_service.py`
  - `backend/apps/core/views/healthcheck.py`
- Entregable: metricas minimas (p95, error rate, throughput por endpoint).
- Evidencia:
  - `backend/apps/core/services/operational_metrics_service.py`
  - `backend/apps/core/middleware/operational_metrics.py`
  - `GET /api/v1/ops/metrics/` (`SYSTEM_ADMIN`).
- Entregable: correlacion request-id en auditoria/logs.
- Evidencia:
  - `backend/apps/core/middleware/request_id.py`
  - `backend/apps/core/logging_filters.py`
  - `backend/apps/core/settings.py` (formatters con `[req:{request_id}]`).

## Paso 12 - Diagnostico y validacion de direccion

### 12.1 Baseline tecnico actual
- Performance (snapshot actual):
  - p95 y tasa de error disponibles por endpoint via `/api/v1/ops/metrics/`.
  - baseline inicial: ejecutar en staging con carga real por 24h y exportar JSON de endpoint.
- Cobertura/estabilidad de pruebas:
  - evidencia actual: `test_results.txt` registra `1142 passed, 2 warnings`.
  - smoke reciente tras cambios: `30 passed` (tests focales salud/plataforma).
- Top 10 riesgos tecnicos identificados:
  1. Acoplamiento de cache a endpoints sin invalidacion de eventos de dominio.
  2. Falta de prueba de restauracion automatica de backups en CI de ops.
  3. Riesgo de configuraciones mixtas `.env` entre ambientes.
  4. Cobertura no uniforme por capa funcional (picos en unit, menor en e2e real).
  5. Riesgo de latencia variable por consultas complejas en dashboard bajo carga.
  6. Dependencia de Redis para locks sin monitor de saturacion/eviccion.
  7. Rotacion/gestion de secretos aun manual en algunos entornos.
  8. Posibles endpoints legacy con contratos menos estrictos que v1.
  9. Warning de datetimes naive en pruebas de seguridad.
  10. Falta de SLO formal publicado por endpoint critico.

### 12.2 Matriz de riesgos y priorizacion
- Severidades definidas:
  - `S1`: caida total o riesgo de integridad de datos.
  - `S2`: degradacion severa de flujo critico (login, asistencia, notas).
  - `S3`: error funcional acotado con workaround.
  - `S4`: mejora pendiente o deuda tecnica sin impacto inmediato.
- Priorizacion inicial (impacto/probabilidad):
  - R1 Backup sin restore test: impacto alto, prob media, severidad `S1`, owner `DevOps`.
  - R2 Latencia dashboard en carga: impacto medio-alto, prob media, severidad `S2`, owner `Backend`.
  - R3 Secretos fuera de vault: impacto alto, prob baja-media, severidad `S2`, owner `Security`.
  - R4 Cobertura e2e insuficiente: impacto medio, prob media, severidad `S3`, owner `QA`.
- Mitigaciones por sprint (resumen):
  - Sprint N: restore drill backup + dashboard load test + hardening secretos staging.
  - Sprint N+1: aumentar cobertura e2e en flujos admin/profesor/apoderado.

### 12.3 Validacion con usuarios reales
- Plan de validacion (ejecutable):
  - Perfiles: admin escolar, profesor, apoderado.
  - Flujos: login, asistencia, notas, comunicados.
  - Medicion: tiempo por tarea, friccion UX, errores API/contrato.
- Estado: pendiente de ejecucion en terreno (requiere agenda con usuarios reales).

## Paso 13 - Ejecucion inmediata (siguiente ciclo)

### 13.1 Alcance congelado (3 objetivos)
1. Objetivo A - Operaciones base: backups diarios + restore drill + healthchecks productivos.
2. Objetivo B - Gateway y seguridad: activar Nginx en staging con rate limits y request-id end-to-end.
3. Objetivo C - Performance inicial: cache dashboard + baseline p95/error-rate + tuning inicial.

Entregables verificables por objetivo:
- A: script backup operativo, evidencia de restore, reporte health diario.
- B: deploy gateway, logs con request-id correlacionado, pruebas de throttling por endpoint.
- C: reporte comparativo pre/post (p95, error-rate), tests focales en verde.

### 13.2 Plan semanal
- Semana 1: infraestructura base (`postgres + redis + envs`) y healthchecks.
- Semana 2: gateway, rate limit y trazabilidad request-id.
- Semana 3: caching selectivo y validacion de performance comparativa.

### 13.3 Criterios de cierre
- Pruebas focales del ciclo en verde y sin regresiones criticas.
- p95 y tasa de error mejoradas respecto al baseline inicial.
- `Pasos a seguir.md` actualizado con estado real `[x]/[ ]` y referencias a evidencias.
