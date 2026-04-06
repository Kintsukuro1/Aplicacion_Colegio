# SEGUIMIENTO REGLA VISIBILIDAD SOLICITUD REUNIONES (2026-04-05)

## Pasos a seguir
1. Revisar endpoint de reuniones para detectar reglas actuales de creacion y visibilidad.
2. Permitir creacion de reuniones desde profesor y administrador escolar.
3. Restringir que profesor cree reuniones solo para si mismo.
4. Mantener que administrador escolar pueda ver todas las reuniones del colegio.
5. Mantener que profesor vea solo reuniones donde el es el profesor asignado.
6. Agregar formulario de creacion en la vista compartida de solicitud_reuniones.
7. Validar errores de sintaxis/template tras los cambios.

## Reglas del proyecto
1. No romper el contrato existente de listado y acciones sobre reuniones.
2. Mantener aislamiento por colegio (tenant/rbd_colegio).
3. Evitar privilegios indebidos: profesor no puede crear para otros profesores.
4. Mantener compatibilidad con CSRF y flujo actual de frontend.

## Estado
- [x] Documento de seguimiento creado.
- [x] API actualizada para creacion por profesor/admin.
- [x] Formulario de creacion agregado en template.
- [x] Validacion final sin errores.
