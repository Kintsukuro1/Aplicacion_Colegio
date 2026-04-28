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

## Siguiente paso — Onboarding automático

Objetivo:
- Permitir que un colegio se registre en pocos minutos: crear Colegio, Usuario admin, Configuración académica inicial, Ciclo académico y trial de suscripción.

Tareas inmediatas:
1. Crear el servicio `OnboardingService`.
2. Exponer `POST /api/v1/onboarding/register/` y `GET /api/v1/onboarding/check-slug/`.
3. Crear `RegisterPage` y `OnboardingWizard` en React.
4. Conectar la creación de trial de suscripción.
5. Añadir pruebas del flujo.

## Registro de commits

- `906eb3d` - Implement tenant base and mobile UI improvements
- `b3261cd` - Surface executive dashboard alerts
- `39256fd` - Add executive dashboard activity feed
- `3d758f4` - Add subscription pricing and payments flow

## Validaciones realizadas

- `python manage.py check` — OK
- `npm run build` — OK
- `npm run test:run -- src/features/dashboard/DashboardPage.test.jsx` — OK

## Observaciones

- El trabajo se está haciendo en pasos pequeños y verificables.
- Cada avance se valida antes de pasar al siguiente.
- La siguiente expansión natural del producto es onboarding automático.
