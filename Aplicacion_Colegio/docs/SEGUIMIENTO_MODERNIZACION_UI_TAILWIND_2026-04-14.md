# SEGUIMIENTO MODERNIZACION UI TAILWIND 2026-04-14

## contexto

Inicio de implementacion de modernizacion visual Premium para templates Django.

Alcance confirmado para esta fase:
- Solo presentacion visual y estructural de HTML/CSS.
- Sin cambios en logica de negocio, permisos, servicios o contratos.
- Integracion de Tailwind para la capa Django templates.
- Cobertura objetivo: frontend/templates completo (ejecucion incremental por lotes).

## pasos a seguir

1. Definir baseline visual global (paleta pastel profesional, tipografia Inter, espaciado y sombras suaves).
2. Integrar pipeline Tailwind en frontend/ para compilar utilidades usadas por templates Django.
3. Conectar CSS compilado en los layouts globales sin eliminar compatibilidad previa.
4. Modernizar shell compartido (base_app y dashboard) con estructura visual consistente.
5. Unificar sidebars por rol (estados active/hover/focus, jerarquia visual y espaciado).
6. Migrar templates por dominios funcionales en lotes para controlar riesgo.
7. Consolidar CSS por pagina, reducir duplicidad y mantener aliases legacy necesarios.
8. Ejecutar QA visual y smoke funcional por rol y viewport.

## reglas del proyecto

1. No modificar logica de backend ni contratos de servicios existentes.
2. No cambiar flujo de autorizacion ni validaciones de seguridad.
3. No alterar variables de contexto dinamico (sidebar_template, content_template, rol, etc).
4. Mantener compatibilidad multi-tenant y comportamiento actual.
5. Cambios incrementales y reversibles, evitando refactorizaciones masivas.
6. Priorizar accesibilidad, legibilidad y contraste sin sobrecargar la interfaz.

## entregables iniciales de esta fase

- Documento de seguimiento creado.
- Definicion de tokens visuales base en CSS global.
- Configuracion inicial de Tailwind para templates Django.
- Integracion no disruptiva del CSS compilado en layouts principales.

## estado

- Fecha inicio: 2026-04-14
- Estado: En curso
- Responsable: Copilot (GPT-5.3-Codex)

## hito de saneamiento tecnico (2026-04-14)

Acciones ejecutadas para estabilizar templates antes de continuar la modernizacion visual:
- Correccion de atributos class corruptos detectados en templates de asistencia.
- Fusion automatica y segura de atributos class duplicados en templates Django (11 archivos actualizados).
- Normalizacion de encoding en HTML a UTF-8 sin BOM para evitar artefactos de render.
- Recuperacion iterativa de texto mojibake en templates HTML (acentos y simbolos corruptos).
- Verificacion posterior sin errores reportados por el analizador en templates.
- Verificacion posterior sin patrones de class duplicada ni rastros de mojibake detectados.
- Compilacion Tailwind de Django ejecutada correctamente (build css completado).
- Ajuste visual global de sidebar en dashboard css (hover, active, sombras y tipografia) para consistencia entre roles.
- Limpieza de estilos inline en inicio de estudiante, reemplazados por clases reutilizables en components css.
- Limpieza de estilos inline no dinamicos en reporte de asistencia de profesor (icono KPI, estado vacio y focus/blur inline removido en selects).
- Refactor visual de mi asistencia de estudiante: hero estadistico migrado a clases reutilizables, focus de selects por CSS y correccion de referencia a hoja de estilos inexistente.
- Limpieza completa de estilos inline en soporte tecnico usuarios (modal de restablecer contraseña migrado a CSS del modulo).
- Limpieza completa de estilos inline en soporte tecnico tickets (botones de accion, modal resolver y botones de envio migrados a CSS del modulo).
- Limpieza de estilos inline no dinamicos en detalle de clase de profesor (bloques de asistencia y anuncios migrados a clases; se mantienen solo colores dinamicos por asignatura).
- Limpieza completa de estilos inline en disponibilidad de profesor (leyenda de estados migrada a clases CSS).
- Limpieza completa de estilos inline en detalle de comunicado (badges prioritario/destacado y texto de confirmacion migrados a CSS del modulo).
- Limpieza de estilos inline no dinamicos en estadisticas de comunicado (subtitulo migrado a CSS; se conserva inline dinamico de ancho de progreso).
- Limpieza completa de estilos inline en lista de comunicados (link de estadisticas migrado a clase CSS del modulo).
- Limpieza completa de estilos inline en entrevistas de psicologo orientador (modal, notas de etiqueta y bloque de seguimiento migrados a CSS del modulo).
- Limpieza completa de estilos inline en ficha integral de psicologo orientador (selector, barra de acciones, switch PIE, estado vacio y fila inline de modal migrados a CSS del modulo).
- Ajuste visible en /accounts/ landing: cache-busting de index.css y refinamiento premium de navbar/hero para confirmar cambios en la ruta principal de accounts.
- Ajuste visible en /accounts/login y /accounts/login/staff: cache-busting de login.css/login_staff.css y refinamiento visual de accesos para reflejar cambios inmediatamente.

Objetivo de este hito:
- Reducir riesgo de regresiones visuales y de marcado HTML invalido.
- Continuar la modernizacion por lotes sobre una base estable.
