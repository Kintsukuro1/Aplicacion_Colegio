# Caracteristicas

## Vision general
- Aplicacion_Colegio es una plataforma escolar SaaS construida con Django, DRF, React 18, Vite, HTML/CSS y JavaScript.
- Conviven pantallas nuevas en React con vistas legacy en templates Django.
- La lógica importante está en servicios, helpers y APIs propias; las vistas solo coordinan.
- El control de acceso se apoya en roles y capabilities, no solo en el rol visible.

## Caracteristicas principales
- Dashboard: KPIs, gráficos, tarjetas y alertas por rol.
- Gestión académica: clases, asignaturas, evaluaciones, calificaciones, asistencia, libro de clases y reportes.
- Calendario escolar: eventos con filtros por tipo, mes, año y rango.
- Calendario de alumno: tareas y entregas por día y mes con template Django, CSS y JS propio.
- Reuniones: creación, aprobación, reprogramación y cancelación entre apoderado y profesor.
- Comunicados y mensajería: plantillas, envíos, bandejas, conversaciones y seguimiento.
- Notificaciones: resumen, listado, leído y entrega en tiempo real.
- Portal de apoderado: pupilos, notas, asistencia, justificativos, firmas, comunicados y pagos.
- Biblioteca: recursos, préstamos, devoluciones, publicaciones y disponibilidad.
- Finanzas: cuotas, pagos, becas, boletas, estados de cuenta, reportes y webhooks.
- Importación/exportación: CSV/XLSX, plantillas y reportes.
- Onboarding: alta de colegio, admin inicial, ciclo y datos demo.
- Seguridad: sesiones, auditoría, cambios de contraseña, bloqueo de IPs y monitoreo.
- Multi-tenant: cada colegio opera aislado con su propio contexto.

## Cómo se construyen
- Legacy: templates Django, CSS por módulo y JavaScript vanilla con `fetch`.
- Moderno: React 18 con Vite, rutas y componentes reutilizables.
- Servicios: `backend/apps/*/services` y `backend/apps/api/services` concentran la regla de negocio.
- Infraestructura: serializers, viewsets, signals, websockets y helpers compartidos separan responsabilidades.

## Ejemplo útil
- El calendario de alumno se carga desde datos en JSON, pinta el mes en pantalla y abre modales de detalle al seleccionar un día o una tarea.

## Cómo explicarlo en auditoría
- Distinguir si la pantalla es legacy, React o API.
- Nombrar el template, componente o service que la soporta.
- Aclarar si los datos vienen de API interna, service de dominio o websocket.
- Mencionar capability, JWT/sesión, captcha y validaciones para flujos sensibles.
