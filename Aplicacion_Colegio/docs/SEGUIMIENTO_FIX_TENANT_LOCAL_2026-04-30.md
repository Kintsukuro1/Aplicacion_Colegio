# Seguimiento fix tenant local

## Pasos a seguir
- Verificar por qué `TenantProvider` no resuelve tenant en `localhost`.
- Agregar fallback de desarrollo para identificar el colegio de prueba sin subdominio.
- Ajustar el backend para aceptar ese fallback en `/api/v1/tenant/info/`.
- Validar que el login de React deje de fallar al cargar tenant y autenticación.

## Reglas del proyecto
- Mantener el cambio mínimo y localizado.
- No alterar el flujo de producción para dominios con subdominio real.
- Conservar compatibilidad con el tenant por subdominio existente.
- Validar el cambio con una prueba rápida del endpoint y la app de frontend.
