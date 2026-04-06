# PLAN DE MEJORAS — MERCADO CHILENO
*Fecha: 2026-03-03 · Basado en análisis del estado actual del proyecto*

---

## ESTADO ACTUAL (resumen ejecutivo)

| Área | Estado |
|---|---|
| Autenticación por RUT/email | ✅ Implementado |
| Multi-tenant por `rbd_colegio` | ✅ Implementado |
| PolicyService (capabilities) | ✅ Implementado — capas legacy en retiro |
| Roles operativos nuevos (5) | ✅ Modelos y capabilities definidos |
| Módulo financiero (Matrículas, Pagos, Becas, Boletas) | ✅ Implementado |
| Módulo académico (Planificación, Asistencia, Notas, Tareas) | ✅ Implementado |
| Convivencia (Anotaciones, Justificativos) | ✅ Modelos presentes |
| Orientación (Entrevistas, Derivaciones) | ✅ Modelos presentes |
| Escala de notas chilena 1.0–7.0 | ⚠️ Sin configuración por colegio |
| Jefe UTP como rol independiente | ⚠️ Fusionado con coordinador_academico |
| Módulo SEP | ❌ No existe |
| Alertas tempranas automáticas | ❌ No existe |
| Certificados con QR verificable | ❌ No existe |
| Libro de clases digital (firma inmutable) | ❌ No existe |
| Tipo de colegio (Municipal / Subvencionado / Particular / TP) | ❌ No existe |
| Reportes estilo diagnóstico SIMCE | ❌ No existe |

---

## FASE 1 — CIMIENTOS (requisito previo a todo lo demás)

### 1.1 Separar Jefe UTP del Coordinador Académico

El `coordinador_academico` actual mezcla dos roles distintos en Chile. En cualquier colegio de más de 400 alumnos son cargos diferentes.

**Archivos afectados:**
- `backend/common/capabilities.py` → agregar bloque `'jefe_utp'`
- `backend/apps/accounts/migrations/` → nueva migración seed del rol
- `backend/common/utils/auth_helpers.py` → ampliar `normalizar_rol`

**Capabilities para `jefe_utp`:**
```
DASHBOARD_VIEW_SCHOOL, DASHBOARD_VIEW_ANALYTICS,
STUDENT_VIEW, STUDENT_VIEW_ACADEMIC,
TEACHER_VIEW, TEACHER_VIEW_PERFORMANCE,
COURSE_VIEW, CLASS_VIEW, CLASS_VIEW_ATTENDANCE,
GRADE_VIEW, GRADE_VIEW_ANALYTICS,
REPORT_VIEW_ACADEMIC, REPORT_EXPORT,
PLANNING_VIEW, PLANNING_APPROVE,
ACADEMIC_SUPERVISION          ← capability nueva
```

**Nueva capability en `CAPABILITIES` list:**
```python
'ACADEMIC_SUPERVISION',        # supervisión pedagógica transversal
'TEACHER_PERFORMANCE_VIEW',    # ver métricas de desempeño docente
```

### 1.2 Configuración de escala de notas por colegio

Chile usa escala 1.0–7.0, nota mínima de aprobación 4.0 (puede variar por decreto: 3.5 en algunos casos). El modelo `Evaluacion` / `Calificacion` debe soportarlo.

**Modelo nuevo sugerido** (`backend/apps/institucion/models.py` o `backend/apps/academico/models.py`):

```python
class ConfiguracionAcademica(models.Model):
    colegio = models.OneToOneField(Colegio, on_delete=models.CASCADE)
    nota_minima       = models.DecimalField(default=1.0, max_digits=3, decimal_places=1)
    nota_maxima       = models.DecimalField(default=7.0, max_digits=3, decimal_places=1)
    nota_aprobacion   = models.DecimalField(default=4.0, max_digits=3, decimal_places=1)
    redondeo_decimales = models.IntegerField(default=1)   # 1 = un decimal
    escala_porcentual = models.BooleanField(default=False) # Para modalidad TP
```

**Validación:** en `Calificacion.save()` verificar que `nota` esté en rango `[nota_minima, nota_maxima]`.

### 1.3 Tipo de colegio y habilitación de módulos

```python
class Colegio(models.Model):  # campo nuevo
    TIPO_CHOICES = [
        ('MUNICIPAL', 'Municipal'),
        ('SUBVENCIONADO', 'Subvencionado'),
        ('PARTICULAR', 'Particular pagado'),
        ('TP', 'Técnico Profesional'),
    ]
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='SUBVENCIONADO')
```

Esto permite condicionar en el frontend qué módulos se muestran y orientar el plan de suscripción.

---

## FASE 2 — LIBRO DE CLASES DIGITAL

El libro de clases digital es **exigencia ministerial** en Chile desde 2024 para colegios con más de 3 cursos. Actualmente el modelo `Asistencia` existe pero no cumple los requisitos de inmutabilidad y firma docente.

### 2.1 Modelo de Registro de Clase (inmutable)

**Ubicación sugerida:** `backend/apps/academico/models.py`

```python
class RegistroClase(models.Model):
    """Entrada del libro de clases digital. Inmutable tras firma del profesor."""
    clase          = models.ForeignKey('cursos.Clase', on_delete=models.PROTECT)
    profesor       = models.ForeignKey(User, on_delete=models.PROTECT, related_name='clases_impartidas')
    fecha          = models.DateField()
    numero_clase   = models.PositiveIntegerField()    # correlativo por curso/año
    contenido      = models.TextField()               # OA / contenido tratado
    observaciones  = models.TextField(blank=True)
    firmado        = models.BooleanField(default=False)
    fecha_firma    = models.DateTimeField(null=True)
    hash_contenido = models.CharField(max_length=64, blank=True)  # SHA-256 del contenido
    colegio_id     = models.IntegerField(db_index=True)

    class Meta:
        unique_together = [('clase', 'fecha', 'numero_clase')]
```

**Regla:** una vez `firmado=True` ninguna operación puede modificar `contenido` ni `fecha`. Implementar en `save()` o vía señales.

### 2.2 Asistencia inmutable vinculada al registro

El `RegistroClase` agrupa todos los `Asistencia` de esa sesión. Agregar FK:

```python
class Asistencia(models.Model):
    registro_clase = models.ForeignKey(RegistroClase, null=True, on_delete=models.PROTECT)
    # ... campos existentes
```

### 2.3 Capability nueva

```
LIBRO_CLASE_FIRMAR    → profesor
LIBRO_CLASE_VIEW_RBD  → coordinador_academico, jefe_utp, admin_escolar
```

---

## FASE 3 — MÓDULO SEP (Subvención Escolar Preferencial)

Solo aplica a **colegios municipales y subvencionados**. Exigido por ley N° 20.248. Alta diferenciación competitiva.

### 3.1 Modelos

**`backend/apps/matriculas/models.py`** (o app nueva `sep`):

```python
class EstudiantePrioritario(models.Model):
    """Registro SEP: estudiante clasificado como prioritario o preferente."""
    CLASIFICACION = [
        ('PRIORITARIO', 'Prioritario'),
        ('PREFERENTE', 'Preferente'),
    ]
    estudiante     = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sep')
    colegio_id     = models.IntegerField(db_index=True)
    anio           = models.IntegerField()
    clasificacion  = models.CharField(max_length=20, choices=CLASIFICACION)
    activo         = models.BooleanField(default=True)
    fuente         = models.CharField(max_length=50, default='JUNAEB')  # JUNAEB, manual
    fecha_registro = models.DateTimeField(auto_now_add=True)
```

### 3.2 Capability

```
SEP_VIEW           → jefe_utp, coordinador_academico, admin_escolar
SEP_MANAGE         → admin_escolar
SEP_REPORT_EXPORT  → jefe_utp, admin_escolar
```

### 3.3 Módulo habilitado solo si `colegio.tipo in ['MUNICIPAL', 'SUBVENCIONADO']`

---

## FASE 4 — SISTEMA DE ALERTAS TEMPRANAS

Motor de reglas nocturno que detecta estudiantes en riesgo. **Muy vendible:** "sistema preventivo de deserción".

### 4.1 Modelo de Alerta

```python
class AlertaTemprana(models.Model):
    TIPO = [
        ('BAJO_RENDIMIENTO', 'Promedio < nota aprobación'),
        ('BAJA_ASISTENCIA',  'Asistencia < umbral'),
        ('CONDUCTA',         'Anotaciones negativas acumuladas'),
        ('COMBINADA',        'Múltiples factores de riesgo'),
    ]
    estudiante   = models.ForeignKey(User, on_delete=models.CASCADE, related_name='alertas_tempranas')
    colegio_id   = models.IntegerField(db_index=True)
    tipo         = models.CharField(max_length=30, choices=TIPO)
    descripcion  = models.TextField()
    valor_actual = models.DecimalField(max_digits=5, decimal_places=2, null=True)
    umbral       = models.DecimalField(max_digits=5, decimal_places=2, null=True)
    activa       = models.BooleanField(default=True)
    fecha_emision = models.DateTimeField(auto_now_add=True)
    fecha_cierre  = models.DateTimeField(null=True)
    notificado_orientador = models.BooleanField(default=False)
    notificado_jefe_clase = models.BooleanField(default=False)
```

### 4.2 Servicio de evaluación (Django management command o Celery)

```python
class AlertasTempranaService:
    UMBRAL_RENDIMIENTO  = 4.0    # configurable por colegio
    UMBRAL_ASISTENCIA   = 85.0   # %
    UMBRAL_ANOTACIONES  = 3      # anotaciones negativas en 30 días

    @classmethod
    def evaluar_colegio(cls, colegio_id: int) -> int:
        """Ejecutar 1 vez por noche. Retorna cantidad de alertas generadas."""
        ...
```

**Management command:** `python manage.py evaluar_alertas --colegio <rbd>`

### 4.3 Capability

```
ALERT_VIEW       → psicologo_orientador, jefe_utp, coordinador_academico, profesor (solo sus alumnos)
ALERT_MANAGE     → admin_escolar
ALERT_RESOLVE    → psicologo_orientador
```

---

## FASE 5 — CERTIFICADOS CON QR VERIFICABLE

Alto impacto, bajo esfuerzo. Ahorra horas de secretaría.

### 5.1 Tipos de certificado

| Tipo | Datos clave | Firmante |
|---|---|---|
| Alumno regular | RUT, nombre, curso, año | Admin escolar |
| Certificado de notas | Notas por asignatura, promedio | Admin escolar |
| Certificado asistencia | % asistencia por semestre | Admin escolar |
| Informe de rendimiento | Notas + asistencia + observaciones | Coordinador / UTP |

### 5.2 Modelo

```python
class CertificadoEmitido(models.Model):
    TIPO = [
        ('ALUMNO_REGULAR', 'Alumno Regular'),
        ('NOTAS',          'Certificado de Notas'),
        ('ASISTENCIA',     'Certificado de Asistencia'),
        ('INFORME',        'Informe de Rendimiento'),
    ]
    estudiante   = models.ForeignKey(User, on_delete=models.CASCADE)
    colegio_id   = models.IntegerField(db_index=True)
    tipo         = models.CharField(max_length=30, choices=TIPO)
    anio         = models.IntegerField()
    semestre     = models.IntegerField(null=True)
    emitido_por  = models.ForeignKey(User, on_delete=models.PROTECT, related_name='certificados_emitidos')
    fecha_emision = models.DateTimeField(auto_now_add=True)
    codigo_qr    = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)
    archivo_pdf  = models.FileField(upload_to='certificados/%Y/%m/', null=True)
    valido       = models.BooleanField(default=True)
```

### 5.3 Endpoint público de verificación

```
GET /verificar/<uuid_codigo_qr>/
```

Retorna JSON o página HTML con datos del certificado sin requerir login.

### 5.4 Capability

```
CERTIFICATE_EMIT  → admin_escolar, jefe_utp
CERTIFICATE_VERIFY → público (sin auth)
```

---

## FASE 6 — REPORTES TIPO DIAGNÓSTICO (inspiración SIMCE)

Sin replicar el SIMCE, sí ofrecer lo que coordinadores UTP piden siempre.

### 6.1 Reportes a implementar

| Reporte | Descripción | Rol consumidor |
|---|---|---|
| Rendimiento por curso | Promedio, aprobación y reprobación por asignatura | UTP, coordinador |
| Curva histórica de notas | Evolución semestral por curso (gráfico) | UTP, director |
| Brechas por asignatura | Comparativa entre cursos del mismo nivel | UTP |
| Asistencia acumulada | % por curso, por mes, tendencia | Inspector, UTP |
| Atraso en registro de notas | Profesores con evaluaciones sin calificar > 7 días | UTP |
| Cobertura curricular | % de planificaciones aprobadas / ejecutadas | UTP |

### 6.2 Implementación sugerida

Servicio de agregación: `backend/apps/core/services/reportes_academicos_service.py`  
Exportación PDF/Excel: usar `reportlab` (ya disponible en muchos proyectos Django) o `openpyxl`.

---

## FASE 7 — MEJORAS AL PORTAL APODERADO

El apoderado es el usuario más crítico para la venta en Chile.

### 7.1 Funcionalidades faltantes

| Funcionalidad | Prioridad | Complejidad |
|---|---|---|
| Justificar inasistencia con foto adjunta | Alta | Baja — modelo existe, falta UI móvil |
| Ver notas en tiempo real (pushback cuando se publican) | Alta | Media — requiere notificación push |
| Pagar mensualidad desde portal | Alta | Alta — integración Webpay/Mercado Pago |
| Firmar digitalmente citaciones | Media | Media — modelo `FirmaDigitalApoderado` existe |
| Recibir alertas tempranas de su pupilo | Alta | Baja (una vez implementada Fase 4) |
| Ver certificados del pupilo con QR | Media | Baja (una vez implementada Fase 5) |

### 7.2 Notificaciones push

Agregar campo al modelo de usuario:

```python
class DispositivoMovil(models.Model):
    user         = models.ForeignKey(User, on_delete=models.CASCADE, related_name='dispositivos_moviles')
    token_push   = models.CharField(max_length=256)
    plataforma   = models.CharField(max_length=10, choices=[('FCM','Android'),('APNS','iOS')])
    activo       = models.BooleanField(default=True)
    fecha_reg    = models.DateTimeField(auto_now_add=True)
```

---

## RESUMEN DE NUEVAS CAPABILITIES A REGISTRAR

Las siguientes capabilities deben agregarse a `backend/common/capabilities.py` en la lista `CAPABILITIES`:

```python
# Jefe UTP / Supervisión académica
'ACADEMIC_SUPERVISION',
'TEACHER_PERFORMANCE_VIEW',

# Libro de clases digital
'LIBRO_CLASE_FIRMAR',
'LIBRO_CLASE_VIEW_RBD',

# SEP
'SEP_VIEW',
'SEP_MANAGE',
'SEP_REPORT_EXPORT',

# Alertas tempranas
'ALERT_VIEW',
'ALERT_MANAGE',
'ALERT_RESOLVE',

# Certificados
'CERTIFICATE_EMIT',
```

---

## ROADMAP PRIORIZADO

```
Semana 1–2   ·  Fase 1: Jefe UTP + ConfiguracionAcademica + tipo de colegio
Semana 3–4   ·  Fase 2: RegistroClase inmutable (libro digital MVP)
Semana 5–6   ·  Fase 4: AlertaTemprana modelo + management command
Semana 7     ·  Fase 3: EstudiantePrioritario (SEP)
Semana 8     ·  Fase 5: CertificadoEmitido + endpoint público QR
Semana 9–10  ·  Fase 6: Reportes diagnóstico (UTP dashboard)
Semana 11–12 ·  Fase 7: Portal apoderado (notificaciones + pago)
```

---

## CRITERIOS DE ACEPTACIÓN GLOBALES

- Toda query sensible filtrada por `colegio_id` (multi-tenant)
- Todo acceso autorizado exclusivamente por `PolicyService.has_capability()`
- Toda acción sensible registrada en `AuditoriaEvento`
- `pytest` pasa al 100% antes de mergear cada fase
- Ningún campo de contraseña ni dato personal retornado en responses JSON
