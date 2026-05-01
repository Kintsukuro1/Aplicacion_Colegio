# PASO 4: Replicación de Patrón Custom Hooks a 12+ Páginas

**Fecha:** 1 de mayo, 2026  
**Fase:** PASO 4 del Plan React - Refactorización  
**Objetivo:** Replicar patrones de `useFetch()` y `usePagination()` a 12 páginas prioritarias

---

## Estado Actual

✅ **PASO 1:** 3 custom hooks (21/21 tests)  
✅ **PASO 2:** 3 páginas refactorizadas (StudentSelfPage, TeacherClassesPage, AdminStudentsPage)  
✅ **PASO 3:** Todos tests actualizados (106/106 tests)  
🔄 **PASO 4:** Iniciando replicación a 12+ páginas restantes

---

## Análisis de Candidatos

**Total de páginas:** 30  
**Ya refactorizadas:** 3  
**Restantes:** 27  
**Meta PASO 4:** 12 páginas prioritarias  

---

## Priorización de Páginas (12 seleccionadas)

### LOTE 1: Profesor (3 páginas)
Estas páginas tienen patrones similares a TeacherClassesPage con listas + datos resumidos.

| # | Página | Ruta | Patrón | Endpoints | Complejidad | Estado |
|---|--------|------|--------|-----------|-------------|--------|
| 1 | TeacherEvaluationsPage | `profesor/evaluaciones/` | Lista + resumen | `GET /api/v1/profesor/evaluaciones/` | MEDIA | ⏳ Pendiente |
| 2 | TeacherAttendancePage | `profesor/asistencia/` | Lista + resumen | `GET /api/v1/profesor/asistencia/` | MEDIA | ⏳ Pendiente |
| 3 | TeacherGradesPage | `profesor/calificaciones/` | Lista + resumen | `GET /api/v1/profesor/calificaciones/` | MEDIA | ⏳ Pendiente |

### LOTE 2: Admin (4 páginas)
Estas páginas tienen paginación y búsqueda, son ideales para `usePagination()`.

| # | Página | Ruta | Patrón | Endpoints | Complejidad | Estado |
|---|--------|------|--------|-----------|-------------|--------|
| 4 | AdminOverviewPage | `admin/resumen/` | Dashboard + resumen | Múltiples GET | MEDIA | ⏳ Pendiente |
| 5 | AdminClassesPage | `admin/clases/` | Tabla paginada | `GET /api/v1/clases/` | MEDIA | ⏳ Pendiente |
| 6 | AdminEvaluationsPage | `admin/evaluaciones/` | Tabla paginada | `GET /api/v1/evaluaciones/` | MEDIA | ⏳ Pendiente |
| 7 | AdminGradesPage | `admin/calificaciones/` | Tabla paginada | `GET /api/v1/calificaciones/` | MEDIA | ⏳ Pendiente |

### LOTE 3: Otros Roles (4 páginas)
Dashboards y vistas de roles específicos.

| # | Página | Ruta | Patrón | Endpoints | Complejidad | Estado |
|---|--------|------|--------|-----------|-------------|--------|
| 8 | DashboardPage | `dashboard/` | Dashboard multi-widget | Múltiples GET paralelos | MEDIA | ⏳ Pendiente |
| 9 | PsicologoOrientadorPage | `psicologo/` | Lista + formulario | `GET /api/v1/psicologo/estudiantes/` | MEDIA | ⏳ Pendiente |
| 10 | InspectorConvivenciaPage | `inspector/` | Lista + acciones | `GET /api/v1/inspector/eventos/` | MEDIA | ⏳ Pendiente |
| 11 | CoordinadorAcademicoPage | `coordinador/` | Dashboard + lista | Múltiples GET | MEDIA | ⏳ Pendiente |
| 12 | ApoderadoPage | `apoderado/` | Lista + acciones | `GET /api/v1/apoderado/datos/` | MEDIA | ⏳ Pendiente |

---

## Criterios de Refactorización Aplicados a Cada Página

### 1. Identificar Patrones useState + useEffect

```javascript
// PATRÓN ANTERIOR (ANTES)
const [data, setData] = useState([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

useEffect(() => {
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/v1/endpoint/');
      setData(response.results || response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, []);
```

### 2. Aplicar Hook Corresponde

**Para listas simples → `useFetch()`**
```javascript
// PATRÓN NUEVO (DESPUÉS)
const { data = [], loading, error, refetch } = useFetch('/api/v1/endpoint/');
```

**Para tablas paginadas → `usePagination()`**
```javascript
// PATRÓN NUEVO (DESPUÉS)  
const { items, pagination, goToPage, refetch } = usePagination('/api/v1/endpoint/');
```

**Para múltiples endpoints en paralelo → múltiples `useFetch()`**
```javascript
// PATRÓN NUEVO (DESPUÉS)
const { data: data1, loading: loading1 } = useFetch('/api/v1/endpoint1/');
const { data: data2, loading: loading2 } = useFetch('/api/v1/endpoint2/');
const loading = loading1 || loading2;
```

### 3. Actualizar Tests Correspondientes

- Actualizar mocks de `apiClient` a usar named import
- Usar `vi.hoisted()` para mocks de hooks
- Usar `.includes()` para URLs con query parameters
- Agregar `waitFor()` para esperar carga de datos

---

## Estimación de Esfuerzo

| Categoría | Tiempo por Página | Dependencias |
|-----------|-------------------|---|
| Refactorización página | 10-15 min | Lógica clara de datos |
| Actualizar tests | 10-15 min | Mocks establecidos |
| Total por página | 20-30 min | - |
| **Total PASO 4** | **4-6 horas** | Ejecución paralela posible |

---

## Plan de Ejecución

### Fase A: Páginas de Profesor (30 min)
1. TeacherEvaluationsPage → `useFetch()`
2. TeacherAttendancePage → `useFetch()`
3. TeacherGradesPage → `useFetch()`

### Fase B: Páginas de Admin (45 min)
4. AdminOverviewPage → múltiples `useFetch()`
5. AdminClassesPage → `usePagination()`
6. AdminEvaluationsPage → `usePagination()`
7. AdminGradesPage → `usePagination()`

### Fase C: Otros Roles (45 min)
8. DashboardPage → múltiples `useFetch()`
9. PsicologoOrientadorPage → `useFetch()`
10. InspectorConvivenciaPage → `useFetch()`
11. CoordinadorAcademicoPage → múltiples `useFetch()`
12. ApoderadoPage → `useFetch()`

**Tiempo total estimado:** 4-6 horas (con paralelización)

---

## Progreso Esperado

```
Inicio PASO 4:   0/12 páginas completas
Meta Intermedia: 6/12 páginas (50%)
Meta Final:      12/12 páginas (100%)
```

**Tests esperados al final:** 
- Actuales: 106/106
- Nuevos: +40-60 tests (4-5 tests por página nueva)
- Total: 146-166/146-166

---

## Reglas Aplicadas

1. ✅ Usar `useFetch()` para GET simples (listas, detalles)
2. ✅ Usar `usePagination()` para tablas con paginación
3. ✅ Usar múltiples `useFetch()` para dashboards con datos paralelos
4. ✅ Mantener `loading = hook1.loading || hook2.loading` para estado global
5. ✅ Refetch en CRUD: `onSuccess: () => refetch()`
6. ✅ Tests: vi.hoisted() + waitFor() para async
7. ✅ URLs dinámicas: .includes() en mocks

---

## Próximos Pasos

### PASO 5: Replicación a Páginas Restantes (15 páginas)
- Aplicar mismo patrón a páginas no incluidas en PASO 4
- Login, Register, Auth, Pagos, etc.

### PASO 6: Optimización y Caching
- Integrar React Query (TanStack Query)
- Implementar caching automático
- Manejo de invalidación de cache

---

**Estado:** 🔄 EN PROGRESO  
**Inicio:** 1 de mayo, 2026  
**Target:** Completar en 1-2 sesiones de desarrollo
