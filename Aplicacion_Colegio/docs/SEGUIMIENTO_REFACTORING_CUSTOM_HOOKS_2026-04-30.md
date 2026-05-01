# Seguimiento: Refactorización de Páginas con Custom Hooks

**Fecha:** 30 de abril, 2026  
**Fase:** PASO 2 del Plan React - Arquitectura Frontend  
**Objetivo:** Refactorizar 3 páginas modelo usando `useFetch()` para eliminar repetición de código

---

## Pasos a Seguir

### Página 1: `StudentSelfPage` (Estudiante - Simple)
- **Ruta:** `frontend-react/src/features/estudiante/StudentSelfPage.jsx`
- **Complejidad:** BAJA (una lista simple)
- **Cambios:** Reemplazar `useState + useEffect` con `useFetch()`
- **Estado:** ⏳ En progreso

### Página 2: `TeacherClassesPage` (Profesor - Lista + Filtros)
- **Ruta:** `frontend-react/src/features/profesor/TeacherClassesPage.jsx`
- **Complejidad:** MEDIA (lista + búsqueda/filtros)
- **Cambios:** Usar `useFetch()` con parámetros de búsqueda
- **Estado:** ⏳ Pendiente

### Página 3: `AdminEstudiantesPage` (Admin - Paginación)
- **Ruta:** `frontend-react/src/features/admin_escolar/AdminEstudiantesPage.jsx`
- **Complejidad:** ALTA (tabla con paginación)
- **Cambios:** Usar `usePagination()` para manejo de páginas
- **Estado:** ⏳ Pendiente

---

## Reglas del Proyecto (Aplicadas)

1. ✅ Los hooks están centralizados en `lib/hooks/`
2. ✅ Cada hook tiene tests unitarios con cobertura completa
3. ✅ Los hooks reutilizan `apiClient` centralizado
4. ✅ Error handling es uniforme en todos los hooks
5. ✅ Loading states son consistentes
6. ✅ Callbacks opcionales (`onSuccess`, `onError`) están presentes

---

## Resultados Esperados por Página

**StudentSelfPage:**
- Líneas de código: ~200 → ~120 (40% reducción)
- Tests pasan: ✓
- Visual UI: Sin cambios

**TeacherClassesPage:**
- Líneas de código: ~250 → ~140 (45% reducción)
- Tests pasan: ✓
- Búsqueda sigue funcionando

**AdminEstudiantesPage:**
- Líneas de código: ~300 → ~160 (47% reducción)
- Tests pasan: ✓
- Paginación funciona igual

---

## Validación

- [ ] StudentSelfPage refactorizada y tests pasan
- [ ] TeacherClassesPage refactorizada y tests pasan
- [ ] AdminEstudiantesPage refactorizada y tests pasan
- [ ] Suite completa de tests ejecutada (npm test)
- [ ] Cambios pusheados a GitHub

---
