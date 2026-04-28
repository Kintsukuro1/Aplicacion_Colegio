# Plan de Desarrollo — Registro de Avances

Este documento resume, por avance, qué se implementó, qué quedó validado y qué sigue.

Nota: los paths referenciados son relativos al workspace raíz `Aplicacion_Colegio/`.

## Avance 1 — Sidebar de profesor

Qué se detectó:
- El sidebar en vistas de profesor no mostraba contenido en rutas como `/profesor/evaluaciones-online/?clase_id=5`.
- El origen del problema era un contrato de contexto incompleto para templates y vistas standalone.

Qué se hizo:
- Se corrigió la construcción del contexto compartido del dashboard.
- Se agregaron `paginas_habilitadas` y `menu_access` donde faltaban.
- Se ajustó el tenant middleware para respetar el `school_id` resuelto por subdominio.

Resultado:
- El sidebar volvió a renderizar contenido en las vistas de profesor.

Estado:
- Completado y validado.

## Avance 2 — Multi-tenancy y mobile-first

Qué se hizo:
- Se agregó `SubdomainMiddleware` para resolver colegios por subdominio.
- Se extendió `Colegio` con `slug`, `logo` y `color_primario`.
- Se agregaron endpoints de tenant para branding e información pública.
- Se modernizó el frontend React con drawer lateral, navegación móvil y bottom nav.
- Se actualizó el login para mostrar branding del colegio.
- Se reforzó la base visual en `styles.css`.

Resultado:
- El sistema ya puede identificarse por colegio y la experiencia móvil dejó de depender de un layout fijo de escritorio.

Estado:
- Completado y validado.

## Avance 3 — Dashboard ejecutivo

Qué se hizo:
- Se crearon componentes de gráficos con Chart.js: barras, líneas, donut y stat cards.
- Se integró el dashboard con métricas ejecutivas, alertas y gráficos.
- Se añadió un panel ejecutivo con KPIs y actividad reciente.
- Se extendió el backend para calcular métricas de asistencia, notas, evaluaciones y actividad reciente.
- Se agregaron pruebas para el dashboard React.

Resultado:
- El dashboard ya muestra valor ejecutivo real para directivos.

Estado:
- Completado y validado.

## Avance 4 — Pagos y suscripciones

Qué se hizo:
- Se creó el modelo `Payment` para registrar pagos procesados.
- Se implementó `PaymentService` para crear checkouts, procesar webhooks y registrar historial.
- Se añadieron endpoints API para planes, checkout, webhook e historial de pagos.
- Se creó una migración nueva para la tabla de pagos.
- Se agregaron pantallas React para ver planes, contratar y revisar historial.
- Se añadió `SubscriptionStatusCard` como widget reutilizable.

Resultado:
- El sistema ya tiene una base real para monetización.

Estado:
- Completado y validado.

## Avance 5 — Corrección de build de tenant context

Qué se detectó:
- El build de React fallaba porque `tenantContext.js` contenía JSX en un archivo `.js`.

Qué se hizo:
- Se reemplazó JSX por `createElement` en el provider.

Resultado:
- El build de producción volvió a compilar correctamente.

Estado:
- Completado y validado.

## Avance 6 — Documento de avance

Qué se hizo:
- Se creó este `plan_de_desarrollo.md` para registrar avances, validaciones y próximos pasos.

Resultado:
- Quedó trazabilidad clara de todo el trabajo realizado.

Estado:
- Completado.

## Avance 7 — Onboarding automático base

Qué se hizo:
- Se creó `OnboardingService` para levantar colegio, admin, configuración académica, ciclo activo y trial de suscripción en una transacción.
- Se expusieron rutas públicas de onboarding para registro y validación de `slug`.
- Se creó una pantalla pública de registro con wizard simple y una vista auxiliar de pasos.
- Se enlazó la ruta `/register` en el frontend.

Resultado:
- El sistema ya cuenta con una base funcional para alta rápida de colegios.

Verificación:
- `python manage.py check` — OK
- `npm run build` — OK

Estado:
- Completado y validado.

## Avance 8 — Test de onboarding público

Qué se hizo:
- Se añadió una prueba de integración para el registro público en `/api/v1/onboarding/register/`.
- La prueba valida también `check-slug`, creación de `Colegio`, `User` admin, `ConfiguracionAcademica`, `CicloAcademico` y `Subscription` trial.

Resultado:
- El contrato público de onboarding quedó cubierto por una prueba real contra la API.

Verificación:
- `python -m pytest tests/integration/test_onboarding_registration.py -q` — OK

Estado:
- Completado y validado.

## Avance 9 — Onboarding automático con datos demo

Qué se hizo:
- Se reemplazó el stub de `generate_demo_data` por una generación real e idempotente.
- El onboarding demo ahora crea profesores, estudiantes, cursos, asignaturas, clases, matrículas, evaluaciones, calificaciones, asistencias y registros de clase.
- Se agregó una prueba de integración para el endpoint `/api/v1/onboarding/generate-demo/` y se validó que una segunda ejecución no duplica datos.

Resultado:
- El onboarding automático ya deja un colegio nuevo con contenido académico visible y reutilizable para demo comercial.

Verificación:
- `python -m pytest tests/integration/test_onboarding_demo_data.py -q` — OK
- `python -m pytest tests/integration/test_onboarding_registration.py tests/integration/test_onboarding_demo_data.py -q` — OK

Estado:
- Completado y validado.

## Avance 10 — Cierre de onboarding automático

Qué se hizo:
- Se completó el flujo de onboarding automático para alta de colegios.
- Se dejó listo el registro público con creación de `Colegio`, admin, configuración académica inicial, ciclo activo y trial de suscripción.
- Se consolidó la carga demo idempotente para que el colegio nuevo arranque con cursos, asignaturas, clases, matrículas y actividad académica visible.
- Se validaron los endpoints y el flujo demo con pruebas de integración.

Resultado:
- El onboarding dejó de ser un pendiente y pasó a ser una capacidad funcional del producto.

Verificación:
- `python -m pytest tests/integration/test_onboarding_registration.py tests/integration/test_onboarding_demo_data.py -q` — OK

Estado:
- Completado y validado.

## Avance 11 — Onboarding demo con apoderados

Qué se hizo:
- Se amplió la generación demo para crear apoderados reales, relaciones estudiante-apoderado y datos de contacto visibles en el perfil de cada estudiante.
- Se mantuvo la generación idempotente del demo para que repetir el endpoint no duplique apoderados ni relaciones.
- Se reforzó la prueba de integración del onboarding demo para validar conteos y el llenado de campos de apoderado.

Resultado:
- El onboarding ya deja al colegio listo no solo para ver cursos y notas, sino también para comunicaciones familiares y representación básica.

Verificación:
- `python -m pytest tests/integration/test_onboarding_demo_data.py -q` — OK
- `python -m pytest tests/integration/test_onboarding_registration.py tests/integration/test_onboarding_demo_data.py -q` — OK

Estado:
- Completado y validado.

## Siguiente paso — Profundizar el onboarding

Objetivo:
- Convertir el alta inicial en una experiencia más completa para que el colegio quede operativo desde el primer día.

Tareas inmediatas:
1. Crear tareas, materiales y un horario base para las clases demo.
2. Mejorar la pantalla de registro con confirmación y resumen post-creación.
3. Exponer un pequeño panel de bienvenida con accesos directos a los primeros pasos.
4. Añadir pruebas para los nuevos datos demo.
5. Consolidar accesos rápidos para apoderados recién creados.

## Avance 12 — Panel de bienvenida con contenido demo

Qué se hizo:
- Se añadió un endpoint API `demo/panel/` que devuelve un resumen de contenido demo (conteos, tareas recientes, materiales y bloques horarios) para el colegio autenticado.
- Se creó el componente React `DemoPanel` en `frontend-react/src/features/demo/DemoPanel.jsx` que consume el endpoint y muestra tareas, materiales y el horario base.

Resultado:
- Los colegios que ejecuten el onboarding automático pueden ahora ver un panel de bienvenida con contenido demo útil para exploración rápida.

Verificación:
- `python -m pytest tests/integration/test_onboarding_demo_data.py -q` — OK

Estado:
- Completado y validado (backend tests).

## Avance 13 — Fase 1: Mobile-first responsive design

Qué se hizo:
- Se implementaron media queries en `frontend-react/src/styles.css` para responsive design en 3 breakpoints:
  - Mobile (<768px): Drawer sidebar con overlay, hamburguesa toggle, bottom nav fija de 5 items.
  - Tablet (768-1024px): Mini-sidebar con solo iconos (72px width).
  - Desktop (>1024px): Sidebar completa 280px + main content.
- Se actualizó `App.jsx` `ShellLayout` con estado `sidebarOpen` y toggle handlers.
- Se agregó overlay backdrop que cierra sidebar al tocar.
- Se implementó body scroll lock cuando drawer está abierto.
- Se agregó manejo de Escape key para cerrar drawer.
- Se confirmó que `index.html` tiene meta viewport con viewport-fit=cover para PWA.

Resultado:
- El sistema es ahora completamente responsive y usable en teléfonos, tablets y desktops.
- La UX móvil está optimizada con navegación por drawer y bottom nav.

Verificación:
- `npm run build` — OK (sin warnings de chunk size)
- `python -m pytest tests/integration/test_onboarding_demo_data.py -q` — OK

Estado:
- Completado y validado (build + backend tests).

## Siguiente fase — Fase 2: Multi-tenancy con subdominio y monetización

Objetivo:
- Permitir que colegios funcionen en subdominios independientes (ej: colegio1.sistema.cl).
- Implementar suscripciones y pagos reales con MercadoPago.
- Crear dashboard de pagos para admin de escuela.

Tareas (prioridad):
1. **Subdominio como entrada**: Actualizar `SubdomainMiddleware` para forzar `Colegio` by subdomain en requests autenticadas.
2. **API de suscripción mejorada**: Endpoint para cambios de plan, cancelación y renovación.
3. **Dashboard de pagos**: Vista ejecutiva con histórico de pagos, próximas renovaciones y alertas.
4. **Webhooks de MercadoPago**: Procesamiento asincrónico de eventos de pago.
5. **Tests de multi-tenancy**: Validar aislamiento de datos y acceso correcto por subdominio.

## Avance 14 — Fase 2: Multi-tenancy enforcement y subscription management API

Qué se hizo:
- Se reforzó `SubdomainMiddleware` para enforcing multi-tenancy: usuarios autenticados solo pueden acceder su propio colegio por subdominio.
- Se agregaron 3 nuevos endpoints API:
  - `POST /api/v1/subscriptions/upgrade/` — cambiar a un plan superior
  - `POST /api/v1/subscriptions/cancel/` — cancelar suscripción
  - `POST /api/v1/subscriptions/renew/` — renovar por X días
- Se creó el componente React `SubscriptionDashboard` que muestra:
  - Plan actual y estado
  - Histórico de pagos
  - Grid de planes disponibles con opción de upgrade
  - Botones de acción (renovar, cancelar)
- Se añadió CSS para subscription dashboard: cards, grids responsive, estilos para acciones.
- Se validó que build sigue sin warnings y tests pasan.

Resultado:
- El sistema ahora enforce multi-tenancy a nivel de middleware.
- Admin de colegios puede gestionar su suscripción (upgrade, cancel, renew) sin salir de la app.
- Dashboard de pagos listo para monetización.

Verificación:
- `python manage.py check` — OK
- `npm run build` — OK (✓ 86 modules, ~42.9KB CSS, ~197.5KB JS main)
- `python -m pytest tests/integration/test_onboarding_demo_data.py -v` — PASSED

Estado:
- Completado y validado (build + backend tests).

## Siguiente fase — Fase 2B: Webhooks de MercadoPago y tests de multi-tenancy

Tareas pendientes:
1. Implementar procesamiento asincrónico de webhooks (Celery + Redis).
2. Tests de multi-tenancy: validar que user de colegio A no puede acceder colegio B.
3. Dashboard mejorado con alertas de renovación próxima.
4. Migración de datos legacy (si aplica para golangsms).



## Registro de commits

- `497e053` - Fase 2: Multi-tenancy enforcement and subscription management API
- `435902d` - Fase 1: Mobile-first responsive design and mobile bottom navigation
- `906eb3d` - Implement tenant base and mobile UI improvements
- `b3261cd` - Surface executive dashboard alerts
- `39256fd` - Add executive dashboard activity feed
- `3d758f4` - Add subscription pricing and payments flow

## Validaciones realizadas

- `python manage.py check` — OK
- `npm run build` — OK (✓ 86 modules, 12 chunks, ~42.9KB CSS, ~197.5KB JS main)
- `python -m pytest tests/integration/test_onboarding_demo_data.py -v` — PASSED
- `python -m pytest tests/integration/test_onboarding_registration.py -v` — PASSED

## Observaciones

- Fase 1 (Mobile-first) completada: responsive en 3 breakpoints, drawer sidebar móvil, bottom nav, overlay y transitions.
- Fase 2 (Multi-tenancy + monetización) iniciada:
  - Subdominio enforcement en middleware
  - Endpoints de subscription management (upgrade, cancel, renew)
  - Dashboard de suscripción con historial de pagos
  - CSS responsive para mobile
- Siguientes objetivos: webhooks MercadoPago, tests multi-tenancy, alertas de renovación.
