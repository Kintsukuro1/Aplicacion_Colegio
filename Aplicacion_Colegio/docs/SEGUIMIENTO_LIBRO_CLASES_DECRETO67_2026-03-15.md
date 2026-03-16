# Seguimiento Implementacion Libro de Clases + Decreto 67

Fecha: 2026-03-15

## Pasos a Seguir
1. Crear modelos base para libro de clases digital (registro y firma) con bloqueo de edicion post-firma.
2. Crear configuracion academica por colegio para cumplimiento Decreto 67.
3. Agregar capabilities nuevas para libro de clases, compliance y reporteria de Superintendencia.
4. Crear migraciones iniciales del incremento y validar carga de modelos.
5. Implementar servicios de dominio y endpoints API por rol.
6. Integrar frontend de profesor/coordinador/admin para firma y reporte.
7. Agregar pruebas unitarias, integracion tenant y regresion de rutas criticas.

## Reglas del Proyecto
- Permisos solo por capabilities/PolicyService.
- Multi-tenant obligatorio en consultas y servicios.
- No ORM en views; logica de negocio en services.
- Contratos existentes de API/servicios no se rompen.
- Cambios pequenos, trazables y validados con pruebas del modulo.

## Avance
- [x] Documento de seguimiento creado.
- [x] Modelos base Libro de Clases agregados.
- [x] Configuracion academica por colegio agregada.
- [x] Capabilities base agregadas.
- [x] Migraciones creadas y aplicables.
- [x] Servicios y endpoints implementados.
- [x] Pruebas agregadas y validadas (flujo profesor libro de clases).
- [x] Frontend dashboard integrado (MVP): profesor edita/firma, coordinador/admin escolar lectura RBD.
- [x] Reporteria Superintendencia implementada: endpoint con exportacion JSON/CSV/XLSX/PDF y pruebas de permiso/descarga.
- [x] Integracion en vista de Reportes institucionales + pruebas de contrato JSON/XLSX para exportacion normativa.
- [x] Soporte SIGE agregado al exportador + pruebas de contrato SIGE y acceso por rol (coordinador/admin escolar) en endpoints RBD.
- [x] Trazabilidad de auditoria para exportaciones normativas: eventos de exito y denegacion con metadata (formato/mes/resultado).
- [x] Consulta operativa de auditoria agregada: endpoint filtrable + tabla en Reportes para revisar historial de exportaciones Superintendencia.
- [x] Paginacion operativa y descarga CSV del historial de auditoria de exportaciones Superintendencia.
- [x] Filtros avanzados en historial de auditoria: rango de fechas y usuario (ID/nombre/email) en API + UI + pruebas.
- [x] Ordenamiento en historial de auditoria (fecha/usuario/resultado asc-desc) consistente en listado paginado y descarga CSV.
