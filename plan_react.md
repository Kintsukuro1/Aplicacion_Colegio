# ⚛️ ROADMAP 1: DOMINAR REACT (Nivel Producto) - Aplicación Colegio

**Objetivo:** Pasar de "sé usar React" a "puedo construir frontends escalables tipo SaaS", aplicado directamente al frontend del proyecto **Aplicación Colegio**.

## ✅ Avance Real (implementación en curso)
- [x] Login con validación frontend, manejo de errores y redirección al origen.
- [x] Panel de estudiante migrado desde JSON crudo a una vista de producto con tarjetas, tablas y estados vacíos.
- [x] Dashboard con skeleton de carga estructurado y regresión de render.
- [x] Mis Clases del profesor con resumen, horario y tendencias en layout más legible.
- [x] Evaluaciones del profesor con resumen, loading state y prueba de regresión.
- [x] Asistencias del profesor con resumen, loading state y prueba de regresión.
- [x] Calificaciones del profesor con resumen, loading state, corrección de recarga y prueba de regresión.
- [x] Panel del asesor financiero con resumen, loading state y prueba de regresión.
- [x] Calendario escolar con resumen, loading state y prueba de regresión.
- [x] Soporte técnico con resumen operativo y prueba de regresión.
- [x] Administración de estudiantes con resumen, loading state y prueba de regresión.
- [x] Bibliotecario digital con resumen operativo y prueba de regresión.
- [x] Seguridad de usuario con sesiones activas y historial de contraseñas refinados.
- [x] Panel de apoderado con resumen, loading state y prueba de regresión.
- [x] Administración de clases con resumen, loading state y prueba de regresión.
- [ ] Siguiente foco: seguir con otra pantalla todavía básica del bloque estudiante, administración o soporte.
- [ ] Pendiente de fase 2/3: formalizar más pantallas con resumen, empty states y tests de regresión.

---

## 🟢 FASE 1 — Base Sólida (1–2 semanas)
**🎯 Objetivo:** Entender React en profundidad y asegurar una base sólida en el manejo del estado y ciclo de vida.
**Aprender:** JSX profundo, `useState`, `useEffect`, Props vs State, Componentización real.

**👉 Ejercicio aplicado a Aplicación Colegio:** **Rehacer el Login de Usuarios**
- **Inputs controlados:** Formularios para RUT/Email y contraseña.
- **Manejo de errores:** Mostrar mensajes de error de credenciales incorrectas desde Django.
- **Estado de loading:** Spinner o deshabilitar botón mientras se autentica.
- **Validación frontend:** Validar formato de RUT/Email antes de enviar al backend.

---

## 🟡 FASE 2 — Arquitectura Frontend (2–3 semanas)
**🎯 Objetivo:** Estructurar el proyecto para escalar, dejando de crear "componentes sueltos".
**Aprender:** Estructura por features, Custom hooks, Separación de lógica y UI.
**Stack:** React, Vite (actual), React Router.

**👉 Ejercicio aplicado a Aplicación Colegio:** **Migrar el módulo de "Mis Clases" / "Cursos"**
- **Grid de clases:** Visualización de las asignaturas del estudiante/profesor en formato tarjetas.
- **Consumo API Django:** Llamadas a los endpoints de clases (`/api/core/cursos/` o similar).
- **Loading skeletons:** Usar skeleton loaders mientras se cargan las clases en lugar de spinners básicos.
- **Manejo de errores:** Boundaries para cuando falla la carga de clases.

---

## 🔵 FASE 3 — Estado Global (2 semanas)
**🎯 Objetivo:** Manejar el estado global de la aplicación de manera eficiente.
**Aprender:** Context API vs Zustand (Recomendado Zustand para estado global sencillo y rápido).

**👉 Ejercicio aplicado a Aplicación Colegio:**
- **Usuario logueado global:** Almacenar los datos del usuario activo y recuperarlos en cualquier componente sin prop drilling.
- **Notificaciones globales:** Sistema de toasts/alertas (ej. "Tarea enviada correctamente", "Nueva calificación").
- **Permisos (Roles):** Control de UI basado en roles (Administrador, Profesor, Estudiante, Apoderado). Ocultar o mostrar botones de edición según el rol.

---

## 🟣 FASE 4 — Data Fetching PRO (2 semanas)
**🎯 Objetivo:** Optimizar el consumo de la API de Django y dejar de usar `fetch/axios` manuales en `useEffect`.
**Aprender:** TanStack Query (React Query).

**👉 Ejercicio aplicado a Aplicación Colegio:** **Módulos Interactivos**
- **Implementar en:**
  - **Tareas:** Cacheo de lista de tareas; revalidación al subir una nueva entrega.
  - **Materiales:** Descarga de recursos académicos.
  - **Mensajes:** Sincronización de bandeja de entrada escolar.
- **Beneficios:** Caché automático, manejo de estados `isLoading`/`isError` integrados, reintentos en caso de mala conexión (ideal para usuarios móviles/estudiantes).

---

## 🟠 FASE 5 — UI/UX Nivel Producto (3 semanas)
**🎯 Objetivo:** Lograr un diseño premium y una experiencia de usuario (UX) que se vea "vendible" e institucional.
**Aprender:** Diseño de sistemas, Accesibilidad (a11y), Animaciones.
**Stack:** Tailwind CSS (si está configurado), Framer Motion o transiciones CSS modernas.

**👉 Ejercicio aplicado a Aplicación Colegio:** **Rediseño del Dashboard**
- **Dashboard moderno:** Resumen visual de calificaciones, asistencia y tareas pendientes (gráficos).
- **Sidebar real:** Navegación lateral responsiva y colapsable con los módulos (Calificaciones, Asistencia, etc.).
- **Modales reutilizables:** Crear un componente Modal global para acciones como "Crear Nueva Tarea" o "Justificar Inasistencia".
- **Transiciones suaves:** Animaciones sutiles al cambiar de página o al abrir modales.

---

## 🔴 FASE 6 — Autenticación PRO (1–2 semanas)
**🎯 Objetivo:** Seguridad robusta entre React y Django.

**👉 Ejercicio aplicado a Aplicación Colegio:**
- **JWT Completo:** Configurar interceptores de Axios/Fetch para adjuntar el Bearer Token a cada petición a Django.
- **Refresh Tokens:** Flujo automático para renovar el token en segundo plano sin cerrar la sesión del estudiante/profesor mientras usan la app.
- **Protección de rutas:** Componentes `ProtectedRoute` en React Router para bloquear el acceso si no hay sesión activa o si el rol no corresponde (ej. Estudiante intentando entrar al panel de notas del Profesor).

---

## ⚫ FASE 7 — Performance (1 semana)
**🎯 Objetivo:** Hacer que la plataforma cargue increíblemente rápido, incluso en conexiones lentas.
**Aprender:** Lazy loading, Code splitting, Memoization.

**👉 Ejercicio aplicado a Aplicación Colegio:**
- **Lazy Loading de Módulos:** Cargar el módulo de "Administración" o "Reportes" solo cuando el usuario entra, para no pesar el bundle inicial de los Estudiantes.
- **Memoization:** Usar `useMemo` y `useCallback` en tablas grandes (ej. Tabla de Calificaciones por curso) para evitar re-renderizados innecesarios al filtrar datos.

---

### 🧠 Resultado Final del Roadmap
Al completar esto en el frontend de **Aplicación Colegio**, tendrás:
1. **Frontend Desacoplado:** Total independencia del renderizado clásico de Django (templates).
2. **UI Profesional:** Una interfaz tipo SaaS, intuitiva y rápida, apta para instituciones educativas.
3. **Arquitectura Escalable:** Código preparado para añadir nuevos módulos (Pagos, Video-clases, etc.) sin que el sistema colapse.
