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
