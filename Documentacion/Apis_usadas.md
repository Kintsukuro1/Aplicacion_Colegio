# APIs usadas

## Objetivo
Mapa compacto de las APIs y canales que sostienen la plataforma para auditoría técnica.

## APIs externas
- hCaptcha: validación de formularios y acciones sensibles desde `backend/common/utils/captcha.py`.
- Webpay/Transbank: pagos y flujo financiero del módulo de matrículas/asesoría.
- MercadoPago: pagos y webhooks de confirmación.
- Django Debug Toolbar: diagnóstico solo en desarrollo.

## APIs internas principales
- Autenticación: `/api/v1/auth/token/`, `/api/v1/auth/token/refresh/`, `/api/v1/auth/logout/`, `/api/v1/me/`.
- Dashboard: `/api/dashboard/...` y `/api/v1/dashboard/resumen/` para KPIs, tarjetas y gráficos.
- Notificaciones: `/api/v1/notificaciones/...` para resumen, listado, lectura y estados de entrega.
- Académico: `/api/v1/estudiante/...` y rutas legacy `/estudiante/...` para notas, asistencia, tareas y reportes.
- Apoderado: `/api/v1/apoderado/...` para pupilos, comunicados, justificativos, firmas y pagos.
- Biblioteca: `/api/bibliotecario/...` para recursos, préstamos, publicación y devolución.
- Finanzas: `/api/asesor-financiero/...` y `/api/v1/payments/webhook/` para cuotas, boletas, estados y confirmaciones.
- Importación/exportación: `/api/importacion/...` y `/api/exportacion/...` para plantillas, cargas y reportes.
- Onboarding: `/api/v1/onboarding/...` para alta de colegio y datos demo.

## Tiempo real
- `ws/notificaciones/` entrega eventos en vivo y complementa las consultas por API.

## Lectura recomendada
- Primero autenticación.
- Después dashboard y notificaciones.
- Luego los módulos por rol: académico, apoderado, biblioteca y finanzas.

## Idea clave
- Las APIs internas son el punto de integración central entre frontend y backend.
- Las APIs externas se usan solo para seguridad y pasarelas de pago.
- En auditoría conviene separar rutas públicas, protegidas por rol y protegidas por capability.
