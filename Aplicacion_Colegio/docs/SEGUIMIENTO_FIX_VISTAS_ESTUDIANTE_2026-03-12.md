# Seguimiento Fix Vistas Estudiante (2026-03-12)

## Pasos a seguir

1. Corregir backend en vistas de estudiante para resolver curso de forma robusta (matricula activa -> perfil -> claseestudiante).
2. Corregir contexto dashboard `mis_tareas` para usar la misma estrategia robusta y evitar listas vacias falsas.
3. Validar errores de sintaxis/linter en archivos modificados.
4. Repoblar tablas con `autopoblar.py` (limpieza total solicitada).
5. Verificar consistencia de datos para estudiante demo (`alumno1@colegio.cl`).
6. Validar funcionalmente las URLs:
   - `/dashboard/?pagina=mi_horario`
   - `/estudiante/tareas/`
   - `/estudiante/calendario-tareas/`
   - `/dashboard/?pagina=mis_tareas`

## Reglas del proyecto

- No romper contratos existentes.
- Mantener autorización basada en capabilities con `PolicyService`.
- Evitar cambios masivos; aplicar fix incremental y acotado.
- Mantener aislamiento multi-tenant (`colegio_id`/`rbd_colegio`) en consultas.
- Priorizar integridad de datos y estabilidad.
