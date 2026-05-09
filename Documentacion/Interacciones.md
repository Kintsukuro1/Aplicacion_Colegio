# Interacciones

## Arranque
- `manage.py` levanta Django con `backend.apps.core.settings`.
- Las rutas principales se concentran en `backend/apps/core/urls.py`.
- En desarrollo se usa SQLite; el sistema expone vistas, APIs y websocket channels.

## Cómo interactúan las partes
- `backend/common/utils/view_auth.py` permite autenticación por sesión o JWT.
- `backend/common/utils/captcha.py` valida hCaptcha antes de aceptar acciones sensibles.
- La lógica de negocio vive en services y helpers por módulo.
- El frontend legacy usa `fetch` para hablar con `/api/...` y actualizar tablas, filtros, modales y PDFs sin recargar.
- Los scripts de `frontend/static/js/` sincronizan notificaciones, dashboard y otras vistas con el backend.
- `service-worker.js` solo cachea páginas y assets estáticos; no interfiere con `/api/`.
- `ws/notificaciones/` entrega notificaciones en tiempo real y se complementa con APIs de historial.

## Qué necesita
- Python, Django y dependencias instaladas.
- Node/Vite si se trabaja con `frontend-react/` o con el pipeline moderno.
- Variables o credenciales para hCaptcha y pasarelas de pago.
- Permisos por capability y datos correctos de usuario/escuela.

## Resumen rápido
- Backend: lógica, permisos, validaciones, persistencia y respuestas.
- Frontend: consume APIs y decide cuándo renderizar o refrescar.
- Servicios externos: apoyan seguridad y pagos, pero no reemplazan la lógica central.

## Flujos que conviene explicar
- Inicio de sesión: login, emisión de sesión/JWT y carga de contexto por rol.
- Navegación: el dashboard decide qué módulo mostrar según el contexto del usuario.
- Operación normal: pantalla → API interna → respuesta JSON → actualización de UI.
- Acciones críticas: capability, CSRF y/o captcha antes de guardar.
- Pagos: cálculo de estados, registro de movimientos y envío al gateway.
