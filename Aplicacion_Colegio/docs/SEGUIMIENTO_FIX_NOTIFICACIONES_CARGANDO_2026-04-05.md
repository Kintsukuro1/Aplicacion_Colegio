# Seguimiento Fix Notificaciones Cargando (2026-04-05)

## Pasos a seguir

1. Confirmar flujo activo en dashboard legacy (`frontend/templates/dashboard.html`) para el dropdown de notificaciones.
2. Implementar carga asíncrona en `frontend/static/js/notificaciones.js` usando API v1:
   - `GET /api/v1/notificaciones/resumen/`
   - `GET /api/v1/notificaciones/?limit=30`
3. Reemplazar estado fijo "Cargando..." por estados dinámicos:
   - cargando
   - con datos
   - sin datos
   - error recuperable
4. Evitar estados colgados con timeout y limpieza de estado al finalizar requests.
5. Conectar acción "Marcar todas" con `POST /api/v1/notificaciones/marcar-todas-leidas/`.
6. Refrescar badge y lista luego de cambios de estado (marcado individual o masivo).
7. Verificar manualmente con usuario alumno1 (Pedro) que el dropdown deja de quedar en "Cargando...".

## Reglas del proyecto

1. Cambio incremental sin refactor masivo (solo módulo de notificaciones legacy de frontend).
2. Mantener compatibilidad multi-tenant usando endpoints existentes ya filtrados por usuario.
3. No romper contratos actuales de API v1.
4. Priorizar estabilidad y seguridad (manejo de errores y timeout explícito).
5. Mantener comportamiento no destructivo para otros roles del dashboard.

## Estado

- Implementado y validado manualmente en dashboard de estudiante (Pedro González).
- Causa raíz principal corregida: `frontend/static/js/notificaciones.js` solo abría/cerraba dropdown y no cargaba datos.
- Hallazgo adicional en validación E2E: `POST /api/v1/notificaciones/marcar-todas-leidas/` devolvía 403 por CSRF inválido al usar botón "✓".
- Corrección aplicada:
   - token CSRF inyectado en contenedor del dashboard (`data-csrf-token="{{ csrf_token }}"`),
   - lectura robusta de token en JS (template/cookie/input/meta),
   - validación de formato del token antes de adjuntar header.
- Resultado final:
   - el dropdown deja de quedar pegado en "Cargando...",
   - carga lista correctamente,
   - badge refleja no leídas,
   - acción "Marcar todas" funciona sin 403 y limpia contador.

## Mejora visual aplicada

- Se mejoró la presentación de las notificaciones para hacerla más amigable y legible.
- Se eliminaron estilos de enlace por defecto (texto azul/subrayado) en items del dropdown.
- Se añadieron estilos de jerarquía visual:
   - título con mayor peso,
   - mensaje secundario con color neutro,
   - metadata/tiempo más sutil,
   - estados hover y no leído más claros.
- Se agregó cache-buster al `dashboard.css` en el template para forzar carga de estilos actualizados.

## Corrección de navegación por permisos

- Incidencia reportada: al hacer click en notificaciones de clase, algunos enlaces iban a `dashboard/?pagina=clase...` y el estudiante veía el error de permisos.
- Causa raíz: la página `clase` no está habilitada en el validador de páginas del dashboard para rol estudiante.
- Solución aplicada (doble capa):
   - Backend: nuevos enlaces de notificación se generan hacia `/estudiante/clase/<id>/?...`.
   - Frontend: enlaces legacy almacenados en notificaciones antiguas se normalizan en runtime a la ruta correcta.
- Resultado validado: click en notificación abre detalle de clase sin error de permisos.

## Implementación "Ver todas" + ajuste final

- Se implementó página dedicada para ver el histórico completo de notificaciones desde el dashboard (`pagina=notificaciones`).
- Se creó template compartido con:
   - encabezado de contexto,
   - contadores de total/no leídas,
   - filtros por estado (todas/no leídas/leídas),
   - listado completo con estilo de lectura.
- Se conectó el enlace "Ver todas" del dropdown para navegar a `/dashboard/?pagina=notificaciones`.

### Hallazgo final durante validación

- En la nueva página, notificaciones legacy podían seguir trayendo enlaces `dashboard/?pagina=clase...`, reproduciendo el error de permisos.
- Se corrigió normalización también en backend para contexto de listado completo (`get_notificaciones_full_context`), no solo en JS del dropdown.

### Resultado E2E final

- Flujo validado:
   - abrir campana,
   - click en "Ver todas",
   - carga de `/dashboard/?pagina=notificaciones` con lista y filtros,
   - click en notificación de clase legacy abre `/estudiante/clase/<id>/?...` sin error de permisos.
