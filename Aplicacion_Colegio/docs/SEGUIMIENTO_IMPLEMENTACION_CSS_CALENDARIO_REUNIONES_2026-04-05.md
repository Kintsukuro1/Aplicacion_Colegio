# SEGUIMIENTO IMPLEMENTACION CSS CALENDARIO Y REUNIONES (2026-04-05)

## Pasos a seguir
1. Crear CSS dedicado por rol para:
   - dashboard/?pagina=calendario_eventos
   - dashboard/?pagina=solicitud_reuniones
2. Eliminar estilos inline de ambos templates compartidos y reemplazarlos por clases semanticas.
3. Agregar carga condicional de CSS en dashboard base segun pagina_actual y rol activo.
4. Mantener coherencia visual con el dashboard existente (sin rediseño radical).
5. Verificar responsive en formularios, tablas y bloques de acciones.
6. Probar URLs objetivo con rol Administrador escolar y Profesor.

## Reglas del proyecto
1. Organizacion de archivos CSS por rol:
   - frontend/static/css/admin_escolar/
   - frontend/static/css/profesor/
2. Mantener los estilos globales existentes:
   - css/design-system.css
   - css/components.css
   - css/dashboard.css
3. Evitar estilos inline en templates objetivo.
4. No alterar logica de negocio ni contratos de API.
5. Usar nombres de clases claros y reutilizables para formularios, cards, tablas y feedback.
6. Evitar duplicacion innecesaria de reglas; donde aplique, compartir mismo estilo entre roles mediante archivos gemelos equivalentes.

## Estado
- [x] Documento de seguimiento creado.
- [ ] CSS por rol implementado.
- [ ] Templates sin inline styles.
- [ ] Carga condicional en dashboard implementada.
- [ ] Verificacion final visual y funcional.
