# PLAN DE NUEVOS ROLES Y CAPABILITIES (FASE SIGUIENTE)

## 1) Objetivo del documento
Definir los nuevos roles funcionales del sistema, sus responsabilidades, capacidades de autorización y alcance operativo para planificar su incorporación en base de datos sin campos ambiguos ni vacíos.

## 2) Estado de referencia
- Fecha de elaboración: 2026-02-28
- Versión del plan: 1.0
- Ambiente objetivo: SaaS escolar multi-tenant
- Motor de autorización: PolicyService (capability-first)
- Regla de seguridad: ningún rol nuevo se autoriza por nombre de rol; solo por capabilities

## 3) Roles nuevos a crear (ordenados por requerimiento)

| Orden de requerimiento | Código interno | Nombre de rol | Propósito principal | Tipo de alcance | Perfil objetivo | Impacto de negocio |
|---|---|---|---|---|---|---|
| 1 | coordinador_academico | Coordinador Académico / Jefe UTP | Supervisar calidad pedagógica transversal y cumplimiento docente | Escuela (tenant) | Equipo UTP / coordinación | Alto |
| 2 | inspector_convivencia | Inspector / Preceptor / Encargado de Convivencia | Gestionar asistencia operativa diaria y disciplina escolar | Escuela (tenant) | Inspectoría / convivencia | Alto |
| 3 | psicologo_orientador | Psicólogo Educacional / Orientador | Gestionar bienestar socioemocional y casos sensibles | Escuela (tenant) | Psicología / orientación | Crítico |
| 4 | soporte_tecnico_escolar | Soporte Técnico Escolar | Resolver incidencias de acceso y operación digital de la comunidad | Escuela (tenant) | Mesa de ayuda TI escolar | Medio-Alto |
| 5 | bibliotecario_digital | Bibliotecario / Gestor de Recursos Digitales | Administrar recursos bibliográficos físicos y digitales | Escuela (tenant) | Biblioteca / recursos educativos | Medio |

## 4) Matriz de capabilities por rol

### 4.1 Coordinador Académico / Jefe UTP

| Grupo | Capabilities asignadas | Justificación funcional |
|---|---|---|
| Dashboard | DASHBOARD_VIEW_SCHOOL, DASHBOARD_VIEW_ANALYTICS | Ver KPIs globales académicos por curso/asignatura |
| Estudiantes | STUDENT_VIEW, STUDENT_VIEW_ACADEMIC | Analizar rendimiento sin editar datos personales sensibles |
| Profesores | TEACHER_VIEW, TEACHER_VIEW_PERFORMANCE | Revisar desempeño docente y cobertura curricular |
| Cursos y clases | COURSE_VIEW, CLASS_VIEW, CLASS_VIEW_ATTENDANCE | Monitorear ejecución académica y asistencia de clases |
| Notas | GRADE_VIEW, GRADE_VIEW_ANALYTICS | Analizar tendencias, brechas y riesgo de reprobación |
| Reportes | REPORT_VIEW_ACADEMIC, REPORT_EXPORT | Generar reportes para dirección y sostenedor |
| Exclusiones | SIN SYSTEM_ADMIN, SIN SYSTEM_CONFIGURE, SIN USER_ASSIGN_ROLE | Evitar escalación administrativa fuera de su ámbito |

### 4.2 Inspector / Preceptor / Convivencia

| Grupo | Capabilities asignadas | Justificación funcional |
|---|---|---|
| Dashboard | DASHBOARD_VIEW_SCHOOL | Operación diaria rápida por jornada |
| Estudiantes | STUDENT_VIEW, STUDENT_VIEW_DISCIPLINE | Registrar y consultar eventos de convivencia |
| Clases / asistencia | CLASS_VIEW, CLASS_TAKE_ATTENDANCE, CLASS_VIEW_ATTENDANCE | Registrar atrasos, ausencias y regularizaciones |
| Reportes | REPORT_VIEW_BASIC | Seguimiento operativo y reportes internos |
| Comunicados | ANNOUNCEMENT_VIEW | Consultar comunicaciones institucionales vigentes |
| Exclusiones | SIN GRADE_EDIT, SIN STUDENT_VIEW_CONFIDENTIAL, SIN USER_ASSIGN_ROLE | Protección académica y de privacidad sensible |

### 4.3 Psicólogo Educacional / Orientador

| Grupo | Capabilities asignadas | Justificación funcional |
|---|---|---|
| Dashboard | DASHBOARD_VIEW_SCHOOL | Visualizar alertas y casos priorizados |
| Estudiantes | STUDENT_VIEW, STUDENT_VIEW_ACADEMIC, STUDENT_VIEW_CONFIDENTIAL | Gestionar intervenciones con datos reservados |
| Reportes | REPORT_VIEW_ACADEMIC, REPORT_VIEW_BASIC | Seguimiento de riesgo y evolución por caso |
| Comunicados | ANNOUNCEMENT_VIEW | Alinear acciones con orientaciones institucionales |
| Auditoría | AUDIT_VIEW | Trazabilidad de acceso a información confidencial |
| Exclusiones | SIN FINANCE_VIEW, SIN SYSTEM_ADMIN, SIN USER_ASSIGN_ROLE | Separación estricta de funciones no clínicas |

### 4.4 Soporte Técnico Escolar

| Grupo | Capabilities asignadas | Justificación funcional |
|---|---|---|
| Dashboard | DASHBOARD_VIEW_SCHOOL | Operación de soporte por colegio |
| Usuarios | USER_VIEW, USER_EDIT | Diagnóstico de cuentas y soporte de acceso |
| Sistema | SYSTEM_VIEW_AUDIT | Revisión de eventos para troubleshooting |
| Reportes | REPORT_VIEW_BASIC | Métricas básicas de incidencias |
| Comunicados | ANNOUNCEMENT_VIEW | Consultar avisos de caídas o ventanas técnicas |
| Exclusiones | SIN USER_DELETE, SIN USER_ASSIGN_ROLE, SIN SYSTEM_ADMIN | Evitar cambios destructivos o privilegios críticos |

### 4.5 Bibliotecario / Gestor de Recursos Digitales

| Grupo | Capabilities asignadas | Justificación funcional |
|---|---|---|
| Dashboard | DASHBOARD_VIEW_SCHOOL | Ver uso de recursos por comunidad |
| Estudiantes y profesores | STUDENT_VIEW, TEACHER_VIEW | Asociar préstamos/licencias a usuarios |
| Reportes | REPORT_VIEW_BASIC, REPORT_EXPORT | Inventario, préstamos, vencimientos y uso |
| Comunicados | ANNOUNCEMENT_VIEW, ANNOUNCEMENT_CREATE | Difundir disponibilidad de recursos |
| Clases | CLASS_VIEW | Vincular recursos a actividades de clase |
| Exclusiones | SIN GRADE_EDIT, SIN USER_ASSIGN_ROLE, SIN SYSTEM_CONFIGURE | Delimitar su operación a gestión de recursos |

## 5) Rol de cada uno dentro del proyecto (alcance operativo)

| Rol | Qué decide | Qué ejecuta | Qué no puede hacer |
|---|---|---|---|
| Coordinador Académico | Priorización pedagógica por curso/asignatura | Monitoreo de desempeño, revisión de brechas, reportes académicos | No administra sistema, no gestiona usuarios globales |
| Inspector Convivencia | Priorización de casos conductuales y asistencia diaria | Registro de atrasos, inasistencias y eventos disciplinares | No accede a ficha psicológica confidencial completa |
| Psicólogo Orientador | Priorización de intervención socioemocional | Gestión de casos, seguimiento y recomendaciones | No edita finanzas, no gestiona permisos de usuarios |
| Soporte Técnico Escolar | Priorización de incidencias técnicas | Resolución de accesos, diagnóstico de fallas, soporte operacional | No elimina usuarios, no asigna roles, no configura globalmente |
| Bibliotecario Digital | Priorización de disponibilidad de recursos | Gestión de inventario, préstamos, recursos digitales y reportes | No modifica notas, no administra seguridad del sistema |

## 6) Vistas y módulos que se deben planificar

| Rol | Vistas principales | APIs/servicios mínimos |
|---|---|---|
| Coordinador Académico | Dashboard académico consolidado, curva de notas, cumplimiento docente | analytics_academico_service, reportes_academicos_service |
| Inspector Convivencia | Registro rápido de asistencia/incidentes, panel de casos del día | convivencia_service, asistencia_operativa_service |
| Psicólogo Orientador | Ficha socioemocional, alertas tempranas, seguimiento por caso | orientacion_service, riesgo_desercion_service |
| Soporte Técnico Escolar | Mesa de ayuda, estado de cuentas, auditoría técnica | soporte_tecnico_service, accesos_service |
| Bibliotecario Digital | Inventario, préstamos, vencimientos, recursos digitales | biblioteca_service, recursos_digitales_service |

## 7) Plan mínimo de base de datos (para la siguiente etapa)

### 7.1 Catálogo de roles
Tabla sugerida: role_catalog (o extensión de tabla Role actual)

| Campo | Tipo sugerido | Nulo | Regla |
|---|---|---|---|
| id | UUID o BIGINT | No | PK |
| code | VARCHAR(64) | No | Único, slug técnico del rol |
| display_name | VARCHAR(128) | No | Nombre visible |
| description | TEXT | No | Resumen de alcance |
| is_system_role | BOOLEAN | No | False para estos 5 roles |
| is_active | BOOLEAN | No | True por defecto |
| created_at | TIMESTAMP | No | Auto |
| updated_at | TIMESTAMP | No | Auto |

### 7.2 Asignación rol-capability
Tabla sugerida: role_capabilities

| Campo | Tipo sugerido | Nulo | Regla |
|---|---|---|---|
| id | UUID o BIGINT | No | PK |
| role_id | FK role_catalog | No | Índice |
| capability_code | VARCHAR(64) | No | Debe existir en catálogo de capabilities |
| created_at | TIMESTAMP | No | Auto |

### 7.3 Asignación usuario-rol por tenant
Tabla sugerida: user_role_assignments

| Campo | Tipo sugerido | Nulo | Regla |
|---|---|---|---|
| id | UUID o BIGINT | No | PK |
| user_id | FK users | No | Índice |
| role_id | FK role_catalog | No | Índice |
| school_id | FK colegio | No | Obligatorio por multi-tenant |
| assignment_status | VARCHAR(32) | No | active, suspended, revoked |
| assigned_by_user_id | FK users | No | Auditoría |
| assigned_at | TIMESTAMP | No | Auto |
| revoked_at | TIMESTAMP | Sí | Solo cuando aplique |

## 8) Datos obligatorios por rol (sin campos vacíos)

| Código rol | Prioridad implementación | Riesgo seguridad | Dependencia principal | Estado planificación |
|---|---|---|---|---|
| coordinador_academico | Alta | Medio | dashboards y analítica académica | Definido |
| inspector_convivencia | Alta | Medio | asistencia y disciplina | Definido |
| psicologo_orientador | Alta | Alto | privacidad y auditoría de acceso | Definido |
| soporte_tecnico_escolar | Media | Alto | gestión de usuarios y trazas técnicas | Definido |
| bibliotecario_digital | Media | Bajo-Medio | inventario y recursos educativos | Definido |

## 9) Secuencia recomendada de implementación
1. Crear roles en catálogo y asignaciones base role_capabilities.
2. Activar guards en PolicyService para cada capability nueva/reutilizada.
3. Exponer navegación por capability (no por string de rol).
4. Implementar vistas MVP por rol en orden: Coordinador, Inspector, Psicólogo, Soporte, Bibliotecario.
5. Agregar auditoría de accesos para capacidades sensibles (STUDENT_VIEW_CONFIDENTIAL).
6. Ejecutar pruebas de regresión de permisos y aislamiento tenant.

## 10) Criterios de aceptación para pasar a desarrollo DB
- Cada rol tiene código técnico único.
- Cada rol tiene set de capabilities explícito.
- Ningún permiso depende de nombre de rol para autorizar.
- Todo acceso sensible queda auditable.
- No existe alcance cross-tenant sin capability global explícita.

## 11) Estado actual en sistema (registrado)
- Roles registrados en mapeo canónico de capabilities por código interno:
	- coordinador_academico
	- inspector_convivencia
	- psicologo_orientador
	- soporte_tecnico_escolar
	- bibliotecario_digital
- Alias legacy mantenidos temporalmente para compatibilidad:
	- coordinador
	- inspector
	- psicologo
- Normalización de nombres de rol actualizada para resolver a los códigos internos nuevos.

---
Documento listo para usar como base de diseño de migraciones y seed inicial de roles/capabilities.
