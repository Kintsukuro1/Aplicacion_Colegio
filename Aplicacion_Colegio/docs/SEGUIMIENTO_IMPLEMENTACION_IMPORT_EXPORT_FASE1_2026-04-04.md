# SEGUIMIENTO IMPLEMENTACION IMPORTACION-EXPORTACION FASE 1 (2026-04-04)

## Pasos a seguir
1. Endurecer validaciones de parametros en endpoints de exportacion (`clase_id`, `mes`, `anio`) para devolver errores 400 controlados.
2. Homologar validacion de archivos en importacion para Excel y CSV, incluyendo limite de tamano y tipos permitidos.
3. Agregar validacion explicita de colegio asignado en dashboard de importacion.
4. Mantener aislamiento multi-tenant en todas las consultas existentes.
5. Agregar pruebas unitarias/API para los nuevos casos de validacion y permisos criticos.
6. Ejecutar subset de tests del modulo y corregir regresiones.
7. Entregar resumen de cambios y matriz de verificacion funcional.

## Reglas del proyecto
- Mantener compatibilidad de contratos de API existentes (rutas, metodos, estructura de respuesta principal).
- Priorizar seguridad e integridad de datos por sobre nuevas mejoras.
- No introducir refactorizaciones masivas.
- Mantener enfoque multi-tenant obligatorio en queries y filtros.
- No exponer datos cross-tenant en exportaciones.
- Cambios incrementales con cobertura de pruebas donde sea viable.

## Alcance de esta iteracion
- Incluye: robustez de validaciones y manejo de errores en importacion/exportacion.
- Incluye: cobertura de pruebas para escenarios de error comunes.
- Excluye: rediseno completo de arquitectura de views/services en esta iteracion.

## Avance ejecutado
- [x] Validacion robusta de parametros en exportacion (`clase_id`, `mes`, `anio`) con errores 400 controlados.
- [x] Validacion robusta de importacion para archivos y tamano maximo en flujo CSV/XLSX.
- [x] Validacion explicita de colegio asignado en dashboard de importacion.
- [x] Pruebas unitarias nuevas para validaciones API de importacion/exportacion.
- [x] Regresion verificada en pruebas relacionadas.
- [x] Caso borde: rechazo de mes fuera de rango (`mes=13`) en exportacion de asistencia.
- [x] Caso borde: rechazo de anio no positivo (`anio=0`) en exportacion de asistencia.
- [x] Caso borde: rechazo de archivo sin filas de datos en importacion.
- [x] Caso borde: rechazo de archivo `.xlsx` corrupto en importacion.
- [x] Matriz de permisos: rechazo 403 en importacion, plantilla, dashboard de importacion y exportacion de profesores para usuarios sin capability.
- [x] Matriz de permisos: caso permitido 200 en exportacion de estudiantes con capability `STUDENT_VIEW`.
- [x] Aislamiento tenant en exportacion de estudiantes: CSV incluye solo alumnos del colegio del usuario solicitante.
- [x] Aislamiento tenant en exportacion de profesores: CSV incluye solo profesores del colegio del usuario solicitante.
- [x] Aislamiento tenant en exportacion por clase: `reporte-academico` rechaza `clase_id` de otro colegio con error 400 controlado.
- [x] Aislamiento tenant en exportacion por clase: `asistencia` rechaza `clase_id` de otro colegio con error 400 controlado.
- [x] Flujo permitido en exportacion por clase: `reporte-academico` responde 200 y CSV valido cuando `clase_id` pertenece al mismo colegio.
- [x] Flujo permitido en exportacion por clase: `asistencia` responde 200 y CSV valido cuando `clase_id` pertenece al mismo colegio.
- [x] Escenario vacio en exportacion de estudiantes: respuesta 200 con CSV de solo encabezado cuando el colegio no tiene alumnos.
- [x] Escenario vacio en exportacion de profesores: respuesta 200 con CSV de solo encabezado cuando el colegio no tiene profesores.
- [x] Contrato HTTP de exportaciones: `Content-Disposition` con prefijo de nombre de archivo esperado en estudiantes, profesores, reporte academico y asistencia.
- [x] Contrato CSV de exportaciones: `Content-Type` con `charset=utf-8` y orden de encabezados estable en estudiantes, profesores, reporte academico y asistencia.
- [x] Filtro opcional en exportacion de estudiantes: `?estado=Activo` restringe correctamente filas exportadas.
- [x] Filtro opcional en exportacion de asistencia: `?mes` y `?anio` filtran correctamente los agregados por estudiante.
- [x] Robustez en exportacion de asistencia: `mes=` vacio no genera error y mantiene agregados sin filtro mensual.
- [x] Robustez en exportacion de asistencia: `anio=` vacio con `mes` valido no genera error y mantiene filtro mensual esperado.
- [x] Validacion en exportacion de asistencia: `anio` no numerico con `mes` valido responde 400 controlado (`Debe ser un entero valido.`).
- [x] Borde de parseo `clase_id` en reporte y asistencia: se acepta valor con espacios (`" 1 "`) y se rechaza formato decimal (`"1.0"`) con error 400 controlado.
- [x] Validacion de limites en `clase_id` para reporte y asistencia: `0` y negativos responden 400 controlado (`Debe ser un entero mayor a 0.`).
- [x] Politica de acceso consolidada: los 7 endpoints de importacion/exportacion quedaron en modo admin-only (Administrador Escolar / General).
- [x] Integracion de rutas: se mantienen endpoints en `/api/v1/*` y se agregan alias equivalentes en `/api/*` para importacion/exportacion.
- [x] Pruebas API actualizadas para nueva politica admin-only y cobertura de disponibilidad dual de rutas (`/api` y `/api/v1`).
- [x] Integracion React: nuevo modulo funcional de Importacion/Exportacion para admin en `frontend-react` (dashboard, plantillas, importacion y exportaciones).
- [x] Integracion legacy dashboard: acceso habilitado para Admin General y Admin Escolar en vista `importar_datos` y enlace de sidebar admin general.

## Evidencia de verificacion
- `pytest tests/unit/core/test_importacion_exportacion_api.py -q` -> `4 passed`
- `pytest tests/unit/core/test_import_csv_service.py tests/unit/core/test_importacion_exportacion_api.py -q` -> `52 passed`
- `pytest tests/unit/core/test_importacion_exportacion_api.py tests/unit/core/test_import_csv_service.py -q` -> `56 passed`
- `pytest tests/unit/core/test_importacion_exportacion_api.py -q` -> `13 passed`
- `pytest tests/unit/core/test_import_csv_service.py tests/unit/core/test_importacion_exportacion_api.py -q` -> `61 passed`
- `pytest tests/unit/core/test_importacion_exportacion_api.py -q` -> `15 passed`
- `pytest tests/unit/core/test_import_csv_service.py tests/unit/core/test_importacion_exportacion_api.py -q` -> `63 passed`
- `pytest tests/unit/core/test_importacion_exportacion_api.py -q` -> `17 passed`
- `pytest tests/unit/core/test_import_csv_service.py tests/unit/core/test_importacion_exportacion_api.py -q` -> `65 passed`
- `pytest tests/unit/core/test_importacion_exportacion_api.py -q` -> `19 passed`
- `pytest tests/unit/core/test_import_csv_service.py tests/unit/core/test_importacion_exportacion_api.py -q` -> `67 passed`
- `pytest tests/unit/core/test_importacion_exportacion_api.py -q` -> `21 passed`
- `pytest tests/unit/core/test_import_csv_service.py tests/unit/core/test_importacion_exportacion_api.py -q` -> `69 passed`
- `pytest tests/unit/core/test_importacion_exportacion_api.py -q` -> `25 passed`
- `pytest tests/unit/core/test_import_csv_service.py tests/unit/core/test_importacion_exportacion_api.py -q` -> `73 passed`
- `pytest tests/unit/core/test_importacion_exportacion_api.py -q` -> `29 passed`
- `pytest tests/unit/core/test_import_csv_service.py tests/unit/core/test_importacion_exportacion_api.py -q` -> `77 passed`
- `pytest tests/unit/core/test_importacion_exportacion_api.py -q` -> `31 passed`
- `pytest tests/unit/core/test_import_csv_service.py tests/unit/core/test_importacion_exportacion_api.py -q` -> `79 passed`
- `pytest tests/unit/core/test_importacion_exportacion_api.py -q` -> `33 passed`
- `pytest tests/unit/core/test_import_csv_service.py tests/unit/core/test_importacion_exportacion_api.py -q` -> `81 passed`
- `pytest tests/unit/core/test_importacion_exportacion_api.py -q` -> `34 passed`
- `pytest tests/unit/core/test_import_csv_service.py tests/unit/core/test_importacion_exportacion_api.py -q` -> `82 passed`
- `pytest tests/unit/core/test_importacion_exportacion_api.py -q` -> `38 passed`
- `pytest tests/unit/core/test_import_csv_service.py tests/unit/core/test_importacion_exportacion_api.py -q` -> `86 passed`
- `pytest tests/unit/core/test_importacion_exportacion_api.py -q` -> `42 passed`
- `pytest tests/unit/core/test_import_csv_service.py tests/unit/core/test_importacion_exportacion_api.py -q` -> `90 passed`
- `pytest tests/unit/core/test_importacion_exportacion_api.py -q` -> `46 passed`
- `pytest tests/unit/core/test_import_csv_service.py tests/unit/core/test_importacion_exportacion_api.py -q` -> `94 passed`
- `npm run build` (en `frontend-react`) -> `vite build` OK (`✓ built in 1.46s`)
