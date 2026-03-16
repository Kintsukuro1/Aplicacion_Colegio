# Seguimiento Fix Apoderado Notas + Templates (2026-03-16)

## Pasos a seguir
1. Reproducir y localizar errores de templates reportados en `calendario_pupilo` y `firmas_pendientes`.
2. Corregir sintaxis Django Template tags (`if/for/endif/endfor`).
3. Revisar servicio de dashboard apoderado para cálculo de notas y promedios por pupilo.
4. Validar datos en base local para pupilo reportado.
5. Ejecutar pruebas focalizadas y `manage.py check`.
6. Documentar resultado y riesgos residuales.

## Reglas del proyecto
- Mantener `Aplicacion_Colegio/` (INNER) como fuente canónica.
- Aplicar cambios mínimos, sin reformateo masivo ni alteración de APIs públicas.
- No revertir cambios previos no relacionados.
- Validar cada fix con evidencia ejecutable (check/tests/shell).
- Priorizar compatibilidad y no romper flujos existentes de apoderado.

## Diagnóstico y causa raíz
- `calendario_pupilo.html`: condición `{% if ... %}` dentro de `<option>` estaba partida en múltiples líneas, rompiendo el parser de templates de Django.
- `firmas_pendientes.html`: bloque inline `{% if f.estudiante_nombre %}` quedó cortado en dos líneas, provocando desbalance de tags (`endfor` inesperado).
- Notas apoderado: el cálculo dependía de `perfil_estudiante.curso_actual`; para pupilos con desalineación curso/perfil vs evaluaciones existentes, el filtro devolvía vacío aunque sí había calificaciones.

## Cambios implementados
1. Template fix en `frontend/templates/apoderado/calendario_pupilo.html`:
	- Se normalizó condición del `selected` en una sola línea y con comparación válida.
2. Template fix en `frontend/templates/apoderado/firmas_pendientes.html`:
	- Se corrigió bloque `if/endif` inline para evitar desbalance de tags.
3. Servicio fix en `backend/apps/core/services/dashboard_apoderado_service.py`:
	- `_get_apoderado_notas_context` ahora agrupa y calcula desde `Calificacion` reales del estudiante, sin depender de `curso_actual` para filtrar.
	- Se agregó fallback de agrupación por `clase_id` y validación defensiva de llaves para mantener compatibilidad con tests (mocks).

## Validaciones ejecutadas
- `manage.py check` -> OK (sin issues).
- `pytest tests/unit/core/test_dashboard_apoderado_service.py -q` -> 9 passed.
- Carga de templates con `get_template(...)`:
  - `apoderado/calendario_pupilo.html` -> OK
  - `apoderado/firmas_pendientes.html` -> OK
- Verificación de servicio en shell:
  - contexto de notas de apoderado retorna asignaturas con evaluaciones y promedio general para pupilo seleccionado.
