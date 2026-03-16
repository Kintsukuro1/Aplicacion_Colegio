# Seguimiento Roadmap Producto 2026

Fecha: 2026-03-16

## Pasos a Seguir
1. Cerrar Fase 1 con checklist final de cumplimiento funcional y normativo (Libro de Clases + Decreto 67 + Superintendencia).
2. Definir contrato API Mobile MVP (Fase 2) con alcance mínimo por rol: profesor, apoderado, estudiante.
3. Ejecutar matriz de pruebas de contrato para Mobile MVP en endpoints /api/v1 priorizados.
4. Diseñar el modelo base de planificación curricular (Fase 3): anual, unidad y clase.
5. Estructurar backlog de IA curricular (Fase 4) sobre un esquema de entradas/salidas controlado por capability.
6. Definir MVP de convivencia + alertas tempranas + panel sostenedor (Fase 5) con entregables incrementales.

## Reglas del Proyecto
- Permisos sensibles solo por capability y PolicyService.
- Multi-tenant obligatorio en toda consulta/servicio por colegio.
- Mantener contratos API estables; cambios incompatibles solo con versionado explícito.
- No llevar lógica de negocio a views si existe o puede existir capa de servicio.
- Cada incremento funcional debe incluir al menos una prueba asociada y validación local.
- Cambios de roadmap deben dejar trazabilidad (qué, por qué, evidencia de validación).
- Fuente única de ejecución/CI: raíz del repo (tests del root). La carpeta anidada es espejo de referencia y queda fuera del gate principal.

## Estado por Fase

### Fase 1 (1-2 meses)
Entregable: Libro de clases digital básico + compliance Decreto 67

Estado: EN CIERRE AVANZADO
- Implementado: registro de clase, firma docente, inmutabilidad post-firma.
- Implementado: exportaciones normativas Superintendencia (json/csv/xlsx/pdf/sige).
- Implementado: auditoría de exportaciones con filtros, paginación, ordenamiento y descarga csv.
- Pendiente de cierre: checklist formal de aceptación normativa y reporte final de evidencias.

### Fase 2 (2-3 meses)
Entregable: App móvil (React Native / Flutter consumiendo API v1)

Estado: EN PROGRESO
Paso útil inmediato:
- Publicar contrato API Mobile MVP v1 con rutas, payloads, errores esperados y permisos por capability.

Avance realizado:
- Contrato base publicado en docs/API_CONTRACT_MOBILE_MVP_V1.md (version 1.0.0).
- Matriz smoke Mobile MVP agregada en tests/integration/api_mobile/test_mobile_mvp_smoke.py (auth, dashboard, estudiante, apoderado, notificaciones).

Riesgo/Bloqueo detectado:
- Dependencias legacy del árbol anidado pueden reintroducir acoplamiento si se reusa el bridge para endpoints fuera del alcance MVP.
- Mantener la cobertura negativa por capability en cada endpoint nuevo para evitar regresiones de seguridad.

Resolución aplicada (incremental):
- Se habilitó include de /api/v1 en backend/apps/core/urls.py del root.
- Se consolidaron endpoints root-first en backend/apps/api/ para auth, auth/me, dashboard/resumen, estudiante y notificaciones.
- Se migraron endpoints de apoderado a módulo root-first en backend/apps/api/apoderado_views.py.
- Se completaron endpoints Mobile MVP de apoderado en root: comunicados, pagos/estado y justificativos.
- Se amplió la matriz smoke con verify/logout y caso negativo por capability en dashboard.
- Se agregaron casos negativos para estudiante (403 sin capability) y notificaciones (404 al marcar inexistente).
- Se agregó caso negativo apoderado para acceso a pupilo no relacionado/cross-tenant (403 esperado).
- Se agregaron negativos de permisos de relación en apoderado (denegar ver_notas y ver_asistencia).
- La matriz smoke Mobile MVP en root quedó validando ejecución real (sin fallback): 12 passed.

Criterios de éxito:
- Contrato versionado en docs.
- Smoke tests API por rol para rutas Mobile MVP.
- Cero fuga tenant en pruebas de autorización.
- Evidencia actual: tests/integration/api_mobile/test_mobile_mvp_smoke.py -> 12 passed local.

### Fase 3 (3-4 meses)
Entregable: Planificación curricular + banco de evaluaciones inicial

Estado: POR INICIAR
Dependencia principal: contrato y operación estable de Fase 2.

### Fase 4 (4-6 meses)
Entregable: IA curricular (OpenAI/Claude + currículum MINEDUC)

Estado: POR INICIAR
Dependencia principal: modelo de planificación curricular consolidado (Fase 3).

### Fase 5 (6-8 meses)
Entregable: Convivencia escolar + alertas tempranas + panel sostenedor

Estado: POR INICIAR
Enfoque incremental sugerido:
- Tramo A: convivencia y protocolos.
- Tramo B: alertas tempranas académicas/socioemocionales.
- Tramo C: panel sostenedor multi-colegio.

## Proximo Hito Operativo
Hito: Contrato API Mobile MVP v1 publicado y validado por pruebas smoke.

Evidencia esperada:
- Documento de contrato actualizado.
- Suite de pruebas API mínima pasando en CI/local.
- Nota de seguimiento con riesgos abiertos y mitigaciones.

## Endurecimiento CI (aplicado)
- Guard de integridad agregado: scripts/check_repo_integrity.py.
- Verifica marcadores de merge en la fuente única y exige testpaths = tests en pytest.ini.
- CI raíz ejecuta el guard antes de migraciones y fuerza corrida de pytest sobre tests del root.
- Guard adicional de carpeta espejo: scripts/check_nested_mirror_changes.py.
- CI bloquea cambios en Aplicacion_Colegio/ por defecto, salvo override explícito ALLOW_NESTED_MIRROR_CHANGES=true para sincronizaciones intencionales.