# Seguimiento: models_nuevos_roles a models

## Pasos a seguir

1. Verificar que `backend/apps/core/models.py` contenga todos los modelos antes alojados en `models_nuevos_roles.py`.
2. Actualizar todos los imports de código y tests para usar `backend.apps.core.models`.
3. Eliminar `backend/apps/core/models_nuevos_roles.py` para evitar una doble fuente de verdad.
4. Ejecutar pruebas dirigidas sobre endpoints y servicios que usan estos modelos.
5. Confirmar que no queden referencias activas al módulo eliminado.

## Reglas del proyecto

- No romper contratos existentes.
- Mantener cambios incrementales y acotados.
- Validar con pytest antes de cerrar la tarea.
- Evitar tocar archivos no relacionados con la migración de imports.