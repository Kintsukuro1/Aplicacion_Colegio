# Seguimiento API Produccion

## Pasos a seguir

1. Auditar endpoints actuales `api/v1` y legacy en `core/urls.py`.
2. Consolidar CRUD REST para modulos faltantes de Admin Escolar:
   - Asignaturas
   - Ciclos academicos
   - Matriculas
   - Apoderados
3. Estandarizar permisos por capability y aislamiento tenant en todos los ViewSets nuevos.
4. Completar autenticacion API para cliente movil:
   - JWT token
   - refresh
   - verify
   - logout invalidando refresh token cuando sea posible
5. Mantener compatibilidad backward con rutas existentes y sin romper contratos de frontend web actual.
6. Agregar pruebas unitarias API para cobertura minima de endpoints nuevos.
7. Ejecutar tests focalizados y registrar resultados.

## Reglas del proyecto aplicadas

1. Fuente unica de autorizacion: `PolicyService` via `HasCapability`.
2. Multi-tenant obligatorio: todas las queries nuevas se filtran por `rbd_colegio` salvo admin global.
3. Cambios incrementales: se extiende `backend/apps/api` sin reemplazar masivamente rutas legacy.
4. Seguridad primero: endpoints API autenticados por defecto con JWT en `REST_FRAMEWORK`.
5. Compatibilidad: no se eliminan endpoints existentes; se agregan rutas unificadas para movil.

## Alcance de esta iteracion

- Entregar capa REST unificada inicial de produccion para roles con cobertura parcial.
- Dejar base para migrar gradualmente el resto de endpoints legacy a `api/v1`.
