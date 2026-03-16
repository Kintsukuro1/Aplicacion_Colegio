# Seguimiento Fix Pagos FieldError colegio_id (2026-03-16)

## Pasos a seguir
1. Localizar la consulta que dispara `Cannot resolve keyword 'colegio_id'` en flujo `mi_estado_cuenta`.
2. Revisar interacción con tenancy manager para modelos que no tienen campo `colegio_id` directo.
3. Aplicar fix mínimo y compatible con filtros de colegio.
4. Validar con `manage.py check` y prueba focalizada de `MatriculasService.get_estado_cuenta_data`.
5. Documentar resultado y riesgo residual.

## Reglas del proyecto
- Mantener `Aplicacion_Colegio/` (INNER) como fuente canónica.
- Realizar cambios mínimos sin reformatear bloques no relacionados.
- No revertir cambios previos no vinculados al incidente.
- Verificar en ejecución local antes de cerrar.

## Diagnóstico
- Error en `/pagos/mi-estado-cuenta/`: `Cannot resolve keyword 'colegio_id' into field` sobre queryset de `Cuota`.
- Causa inmediata: en `MatriculasService._execute_get_estado_cuenta_data` se usaba `matricula.cuotas.all()`.
- Bajo tenancy manager, ese reverse manager derivó un filtro inválido `colegio_id` para `Cuota` (que no posee ese campo directo; corresponde `matricula__colegio_id`).

## Implementación
1. Archivo modificado: `backend/apps/matriculas/services/matriculas_service.py`.
2. Cambio aplicado:
	 - Antes: `matricula.cuotas.all().order_by(...)`
	 - Ahora: `Cuota.objects.filter(matricula=matricula, matricula__colegio_id=escuela_rbd).order_by(...)`
3. Se agregó import local de `Cuota` en el método para mantener alcance acotado.

## Validación
- `manage.py check` -> OK.
- `pytest tests/unit/core/test_dashboard_apoderado_service.py -q` -> 9 passed (regresión rápida).
- Ejecución directa de servicio con usuario apoderado (`carmen.silva@gmail.com`):
	- `get_estado_cuenta_data(...)` -> sin `error`, `cuotas_count=12`, `saldo=280000`.

## Riesgo residual
- Existe posibilidad de comportamiento similar en otros reverse managers tenant-aware de modelos financieros.
- Mitigación propuesta (posterior): revisar flujos que usen relaciones reversas en modelos con `TenantManager` custom y preferir consultas explícitas cuando aplique.
