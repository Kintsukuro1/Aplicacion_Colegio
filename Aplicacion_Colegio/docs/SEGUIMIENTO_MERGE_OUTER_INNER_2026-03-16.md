# SEGUIMIENTO MERGE OUTER A INNER 2026-03-16

## Pasos a seguir
1. Inventariar diferencias entre carpetas duplicadas OUTER e INNER por ruta relativa.
2. Crear respaldo de seguridad previo al merge.
3. Copiar de OUTER hacia INNER solo archivos faltantes (sin sobreescritura inicial).
4. Generar reporte de conflictos (misma ruta, contenido distinto) para resolucion posterior.
5. Ejecutar validaciones funcionales en INNER (check Django + tests base).
6. Corregir problemas detectados por validacion.
7. Registrar cierre con resumen de cambios y riesgos pendientes.

## Reglas del proyecto
- Cambios pequenos y verificables.
- No sobreescribir archivos conflictivos sin evidencia tecnica.
- Preservar trazabilidad con reportes de merge y respaldo.
- Mantener INNER como fuente canonica.
- No mezclar esta tarea con refactors funcionales amplios.

## Ejecucion realizada
- Reporte de diferencias generado en: backups/merge_outer_inner_20260316
	- OUTER_ONLY: 242
	- INNER_ONLY: 202
	- CONFLICTS_BY_SIZE: 336
	- BOTH_SAME_SIZE: 661
- Merge seguro aplicado: se copiaron 242 archivos faltantes desde OUTER hacia INNER sin sobreescribir existentes.

## Incidencia detectada y fix aplicado
- Error funcional inicial en pruebas por conflicto de migraciones en app institucion.
- Causa: ingreso de migracion alternativa con mismo numero base (0006) durante merge de archivos faltantes.
- Accion correctiva: eliminada migracion conflictiva en INNER:
	- backend/apps/institucion/migrations/0006_configuracionacademica.py

## Validacion de funcionamiento
- Django check en INNER: OK (sin issues)
- Test base setup en INNER: OK
	- tests/test_django_setup.py -> 1 passed

## Riesgos pendientes
- Persisten 336 rutas conflictivas por contenido/tamano entre OUTER e INNER sin resolver en esta fase.
- Requiere siguiente fase de merge selectivo por modulo (backend/config/frontend/tests) con criterio funcional y pruebas por lote.

## Fase 2 ejecutada (modulos criticos)
- Config: sin conflictos detectados en reporte de merge.
- backend/apps/api: sin conflictos detectados por tamano/hash en rutas coincidentes.
- Validacion funcional sobre API mobile detecto 3 fallos de compatibilidad y contenido.

## Ajustes aplicados en Fase 2
- dashboard_api_service.py:
	- Se agrego `school_id` como alias en el contexto base y secciones school/analytics.
	- Se mantiene `colegio_id` para compatibilidad retroactiva.
- apoderado_views.py:
	- Endpoint `apoderado/justificativos/` ahora acepta `JSONParser` ademas de multipart/form-data.
	- Se corrige error 415 para solicitudes JSON del cliente movil y pruebas de integracion.

## Validacion final Fase 2
- pytest tests/integration/api_mobile: 12 passed
- manage.py check: OK

## Lote adicional backend/apps/core
- Diagnostico: sin conflictos reales de contenido entre OUTER e INNER para rutas coincidentes de core.
- Limpieza de artefactos residuales incorporados por merge (sin uso en codigo):
	- backend/apps/core/models_mejorados.py
	- backend/apps/core/models_nuevos_roles.py
	- backend/apps/core/services/ACADEMIC_SERVICE_CONTRATO.md
- Validacion post-limpieza:
	- manage.py check: OK
	- pytest tests/test_django_setup.py: 1 passed

## Lote adicional frontend/tests residuales
- Eliminados artefactos obsoletos incorporados por merge:
	- frontend/static/css/index_old.css
	- frontend/static/css/login_old.css
	- frontend/static/css/estudiante/calendario_tareas_old.css
	- frontend/static/css/estudiante/detalle_clase_old.css
	- frontend/templates/estudiante/detalle_clase_old.html
	- tests/common/test_base_old.py
- Validacion post-limpieza:
	- manage.py check: OK
	- pytest tests/integration/api_mobile: 12 passed

## Lote 1 completado: rutas core/profesor y reportes
- Problema detectado: pruebas de profesor libro de clases fallaban por 404 en endpoints no registrados en core urls.
- Correcciones aplicadas en backend/apps/core/urls.py:
	- /api/profesor/libro-clases/
	- /api/profesor/libro-clases/registro/
	- /api/profesor/libro-clases/<registro_id>/firmar/
	- /api/coordinador/libro-clases/
	- /api/admin-escolar/libro-clases/
	- /api/reportes/superintendencia/
	- /api/reportes/superintendencia/auditoria/
- Validacion final del lote:
	- pytest tests/profesor/test_profesor_libro_clases.py: 13 passed
	- pytest tests/integration/api_mobile: 12 passed

## Ajustes de gobernanza scripts/pytest (continuacion)
- pytest.ini actualizado en INNER para discovery explicito: `testpaths = tests`.
- scripts/check_nested_mirror_changes.py actualizado para soportar `SOURCE_OF_TRUTH`:
	- `root` (comportamiento original)
	- `nested` (bloquea cambios fuera de `Aplicacion_Colegio/`)
- Resultado de validacion:
	- scripts/check_repo_integrity.py: PASS
	- scripts/check_nested_mirror_changes.py con `SOURCE_OF_TRUTH=nested`: FAIL esperado por cambios activos fuera de nested en el working tree actual.
	- scripts/check_nested_mirror_changes.py con `ALLOW_NESTED_MIRROR_CHANGES=true`: PASS (modo sincronizacion intencional)
	- pytest tests/test_django_setup.py: 1 passed
	- pytest tests/test_domain_redesign.py: 6 passed

## Limpieza segura adicional de artefactos residuales
- Eliminados archivos sin referencia funcional activa:
	- backend/apps/api/student_views.py (duplicado no referenciado por urls/imports activos)
	- backend/common/views_example_template_mapping.py (archivo ejemplo/documentacion mal ubicado)
	- backend/tenant_manager_audit_stage_1_1.md (duplicado de documentacion ya consolidada en docs/)
- Validacion post-limpieza:
	- pytest tests/integration/api_mobile: 12 passed
	- pytest tests/profesor/test_profesor_libro_clases.py: 13 passed
	- manage.py check: OK

## Cierre punto 1: limpieza de scripts duplicados fuera de INNER
- Eliminados duplicados en OUTER:
	- scripts/check_repo_integrity.py
	- scripts/check_nested_mirror_changes.py
- Scripts canónicos permanecen en INNER/scripts.
- Validacion de cierre:
	- scripts/check_repo_integrity.py (INNER): PASS
	- scripts/check_nested_mirror_changes.py (INNER, nested + override): operativo

## Fix funcional dashboard apoderado (datos en cero)
- Síntoma reportado: inicio, mis_pupilos, notas y asistencia sin datos para apoderado.
- Causa raíz: consulta de pupilos en `DashboardApoderadoService` usaba `user.id` como si fuera `apoderado_id` de la tabla de relaciones.
- Corrección aplicada:
	- Reemplazo de SQL crudo por ORM en `dashboard_apoderado_service.py`.
	- Filtro correcto por `RelacionApoderadoEstudiante.apoderado__user=user`.
	- Deduplicación de pupilos preservando orden por prioridad.
- Validación:
	- pytest tests/unit/core/test_dashboard_apoderado_service.py: 9 passed
	- pytest tests/integration/api_mobile: 12 passed
	- manage.py check: OK
	- Verificación de datos reales: apoderado `carmen.silva@gmail.com` con 2 relaciones activas.
