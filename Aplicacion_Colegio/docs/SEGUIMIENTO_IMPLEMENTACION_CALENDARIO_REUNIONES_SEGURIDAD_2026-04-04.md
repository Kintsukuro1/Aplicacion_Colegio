# SEGUIMIENTO IMPLEMENTACION CALENDARIO REUNIONES SEGURIDAD (2026-04-04)

## Pasos a seguir
1. Implementar EventoCalendario en React con CRUD completo y filtros por tipo/mes/anio/rango.
2. Exponer pagina legacy de EventoCalendario en dashboard para Admin General, Admin Escolar y Profesor.
3. Normalizar permisos de lectura del API de calendario para usar capability de anuncios.
4. Implementar SolicitudReunion en React y legacy con estados y transiciones controladas.
5. Implementar ActiveSession en React y legacy con listado y revocacion segura.
6. Implementar PasswordHistory en React y legacy con vista de auditoria segura.
7. Agregar pruebas de permisos y flujos criticos en API y UI.
8. Integrar registro/revocacion de ActiveSession en login/logout JWT.
9. Agregar pruebas del ciclo de vida de ActiveSession en auth y listados admin scopeados.

## Reglas del proyecto
- Mantener contratos API existentes y extender de forma incremental.
- Toda autorizacion debe basarse en capabilities via PolicyService.
- Mantener aislamiento multi-tenant en todos los listados y acciones.
- Evitar refactorizaciones masivas fuera del alcance funcional.
- Priorizar seguridad e integridad de datos sobre nuevas pantallas.

## Alcance de esta iteracion
- Incluye: inicio de implementacion vertical de EventoCalendario (backend + React + legacy).
- Excluye: cierre total de reuniones y seguridad en este primer commit de avance.

## Avance ejecutado
- [x] Documento de seguimiento inicial creado.
- [x] Pagina React de EventoCalendario creada y enrutada.
- [x] Integracion legacy de EventoCalendario en dashboard.
- [x] Ajuste de permisos de lectura del API de calendario.
- [x] Flujo de SolicitudReunion iniciado en API para Profesor/Admin (listar, responder y cancelar).
- [x] Pagina React de SolicitudReunion creada y enrutada.
- [x] Integracion legacy de SolicitudReunion en dashboard.
- [x] Endpoints de seguridad agregados para listado admin de ActiveSession y PasswordHistory.
- [x] Paginas React de ActiveSession y PasswordHistory creadas y enrutadas.
- [x] Integracion legacy de ActiveSession y PasswordHistory en dashboard.
- [x] Pruebas y validacion de build/tests del incremento.
- [x] Integracion de registro/revocacion de ActiveSession en auth JWT (token/refresh/logout).
- [x] Pruebas de auth + scope admin para endpoints de seguridad.

## Evidencia de verificacion
- npm run build (frontend-react) -> OK (vite build)
- pytest tests/unit/core/test_importacion_exportacion_api.py -q -> 46 passed
