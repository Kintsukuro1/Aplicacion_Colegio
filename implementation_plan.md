# 🚀 Plan: De Sistema Completo a Producto SaaS Vendible

Transformar la aplicación académica de un sistema técnicamente completo pero difícil de vender, en un producto SaaS con experiencia premium, onboarding instantáneo, pagos integrados y experiencia móvil.

## Estado Actual (Diagnóstico)

| Área | Estado | Detalle |
|------|--------|---------|
| **Backend** | ✅ Muy fuerte | Django + DRF, 14 apps, tenancy lógica vía `TenantManager`, subscriptions con Plan/Subscription/UsageLog |
| **Frontend React** | ⚠️ Funcional pero básico | 15 features, 7 components, dashboard con KPIs simples, sin gráficos |
| **Multi-tenancy** | ⚠️ Solo lógica | `TenantManager` filtra por `rbd_colegio` en contextvars, sin subdominios |
| **Pagos** | ❌ Inexistente | Modelos de Plan/Subscription existen pero sin gateway de pago |
| **Dashboard ejecutivo** | ⚠️ Básico | KPI cards planas, sin gráficos, sin métricas de tendencia |
| **Mobile** | ❌ No responsive | Grid fijo 280px sidebar, sin media queries, sin mobile nav |
| **Onboarding** | ❌ No existe | Solo login directo, sin registro público ni setup wizard |

---

## User Review Required

> [!IMPORTANT]
> **Prioridad de fases**: El plan está organizado en 5 fases independientes. Recomiendo ejecutarlas en este orden, pero cada fase puede implementarse por separado. ¿Quieres priorizar alguna fase sobre otra?

> [!IMPORTANT]
> **Proveedor de pagos**: El plan contempla **MercadoPago** (Chile/LATAM) como principal y Stripe como alternativa. MercadoPago tiene mejor penetración en Chile. ¿Confirmas MercadoPago como primera opción?

> [!WARNING]
> **Base de datos**: Actualmente usas SQLite en desarrollo (`db.sqlite3`). El multi-tenancy con subdominios y pagos asíncronos requiere PostgreSQL. El `docker-compose.yml` ya lo tiene configurado. ¿Estás usando PostgreSQL en staging/producción?

## Open Questions

> [!IMPORTANT]
> 1. **Dominio base**: ¿Cuál será el dominio principal? (ej: `tusistema.cl`) — Necesario para configurar subdominios `colegio1.tusistema.cl`
> 2. **Credenciales MercadoPago**: ¿Ya tienes una cuenta de MercadoPago Developers para obtener Access Tokens de prueba?
> 3. **Librería de gráficos**: Para el dashboard ejecutivo propongo **Chart.js** (ligera, ~60KB) o **Recharts** (React-native). ¿Preferencia?
> 4. **PWA**: ¿Quieres que la experiencia móvil incluya capacidad de instalarse como PWA (Progressive Web App)?

---

## Fase 1: 📱 EXPERIENCIA MOBILE-FIRST (Prioridad Alta — Base para todo)

**Justificación**: Sin mobile no hay ventas. Es la base que habilita demos presenciales en tablet/celular.

### Frontend React — CSS Responsive

#### [MODIFY] [styles.css](file:///c:/Proyectos/Aplicacion_Colegio/Aplicacion_Colegio/frontend-react/src/styles.css)

Agregar sistema responsive completo:

```css
/* Breakpoints:
   - Mobile:  < 768px  (sidebar colapsada, layout vertical)
   - Tablet:  768-1024px (sidebar mini 72px)
   - Desktop: > 1024px (sidebar full 280px, actual)
*/
```

Cambios específicos:
- **`.app-shell`**: Cambiar de `grid-template-columns: 280px 1fr` a layout responsivo con sidebar colapsable
- **`.sidebar-grouped`**: Agregar modo colapsado (solo íconos) para tablet, drawer overlay para mobile
- **`main`**: Padding responsivo (`1rem` mobile, `1.5rem` tablet, `2.25rem` desktop)
- **`.grid-2`**: `1fr` en mobile, `repeat(2, 1fr)` en tablet+
- **`.page-header`**: Stack vertical en mobile
- **Tablas**: Scroll horizontal en mobile con indicador visual
- **`.auth-card`**: Full-width en mobile con padding reducido

#### [MODIFY] [GroupedSidebar.jsx](file:///c:/Proyectos/Aplicacion_Colegio/Aplicacion_Colegio/frontend-react/src/components/GroupedSidebar.jsx)

- Agregar botón hamburguesa para mobile
- Estado `isOpen` controlado por prop/context
- Overlay backdrop para cerrar en mobile
- Transición slide-in desde la izquierda

#### [MODIFY] [App.jsx](file:///c:/Proyectos/Aplicacion_Colegio/Aplicacion_Colegio/frontend-react/src/App.jsx)

- `ShellLayout`: Agregar estado `sidebarOpen` con toggle
- Pasar `onToggle` y `isOpen` al `GroupedSidebar`
- Agregar botón hamburguesa en `main-topbar`

#### [NEW] MobileBottomNav.jsx — `frontend-react/src/components/MobileBottomNav.jsx`

- Barra de navegación inferior para las 4-5 secciones principales (solo en mobile)
- Iconos + label, highlight activo
- Visible solo en `< 768px`

### Frontend — Meta tags para mobile

#### [MODIFY] [index.html](file:///c:/Proyectos/Aplicacion_Colegio/Aplicacion_Colegio/frontend-react/index.html)

- Agregar `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`
- Agregar `<meta name="theme-color" content="#1e1b4b">`
- Agregar `<link rel="manifest" href="/manifest.json">` (si PWA)
- Agregar touch icons para iOS/Android

---

## Fase 2: 🧩 MULTI-TENANCY REAL (Subdominios)

**Justificación**: Cada colegio necesita su propia URL para sentirse "dueño" del sistema.

### Backend — Middleware de subdominios

#### [NEW] SubdomainMiddleware — `backend/common/subdomain_middleware.py`

```python
class SubdomainMiddleware:
    """
    Extrae el subdominio del Host header y lo mapea a un colegio.
    
    colegio1.tusistema.cl → busca Colegio con slug='colegio1'
    tusistema.cl → landing/admin general
    """
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        host = request.get_host().split(':')[0]
        parts = host.split('.')
        
        # Si tiene subdominio (ej: colegio1.tusistema.cl)
        if len(parts) > 2:
            subdomain = parts[0]
            request.subdomain = subdomain
            request.is_subdomain = True
            # Resolver colegio y setear tenant
        else:
            request.subdomain = None
            request.is_subdomain = False
        
        return self.get_response(request)
```

#### [MODIFY] [models.py (Colegio)](file:///c:/Proyectos/Aplicacion_Colegio/Aplicacion_Colegio/backend/apps/institucion/models.py)

- Agregar campo `slug = models.SlugField(max_length=50, unique=True)` al modelo `Colegio`
- Agregar campo `logo = models.ImageField(upload_to='colegios/logos/', null=True, blank=True)`
- Agregar campo `color_primario = models.CharField(max_length=7, default='#6366f1')`
- Override `save()` para auto-generar slug desde nombre

#### [MODIFY] [tenancy.py](file:///c:/Proyectos/Aplicacion_Colegio/Aplicacion_Colegio/backend/common/tenancy.py)

- El `SubdomainMiddleware` se encarga de llamar `set_current_tenant_school_id()` al resolver el subdominio
- El `TenantManager` existente ya filtra automáticamente — **no necesita cambios**

#### [MODIFY] [nginx.conf](file:///c:/Proyectos/Aplicacion_Colegio/Aplicacion_Colegio/gateway/nginx/nginx.conf)

- Agregar `server_name *.tusistema.cl tusistema.cl`
- Pasar `$host` al upstream para que Django resuelva subdominios
- Configurar wildcard SSL con certbot

### Frontend — Contexto de tenant

#### [NEW] TenantContext — `frontend-react/src/lib/tenantContext.js`

- Detectar subdominio desde `window.location.hostname`
- Proveer contexto con: `{ slug, nombre, logo, colorPrimario }`
- Endpoint: `GET /api/v1/tenant/info/` (público, sin auth)

#### [MODIFY] [LoginPage.jsx](file:///c:/Proyectos/Aplicacion_Colegio/Aplicacion_Colegio/frontend-react/src/features/auth/LoginPage.jsx)

- Mostrar logo y nombre del colegio (desde TenantContext)
- Aplicar `color_primario` como accent color
- Si no hay subdominio, mostrar campo para seleccionar colegio

### Backend — API de tenant

#### [NEW] Tenant views — `backend/apps/api/tenant_views.py`

- `GET /api/v1/tenant/info/` — Info pública del colegio (nombre, logo, color) — Sin auth
- `GET /api/v1/tenant/config/` — Configuración completa — Requiere auth admin

---

## Fase 3: 📊 DASHBOARD EJECUTIVO (Vendible)

**Justificación**: El dashboard es lo primero que ve el director. Debe "vender" el sistema con métricas impactantes.

### Frontend — Componentes de gráficos

#### [NEW] Chart components — `frontend-react/src/components/charts/`

- `BarChart.jsx` — Gráfico de barras (asistencia por curso, notas promedio)
- `LineChart.jsx` — Tendencias (asistencia semanal, rendimiento mensual)
- `DonutChart.jsx` — Distribución (tipos de inasistencia, distribución de notas)
- `StatCard.jsx` — Card mejorado con sparkline, tendencia, ícono y color semántico

Usando **Chart.js + react-chartjs-2** (~60KB gzipped):
```bash
npm install chart.js react-chartjs-2
```

#### [MODIFY] [DashboardPage.jsx](file:///c:/Proyectos/Aplicacion_Colegio/Aplicacion_Colegio/frontend-react/src/features/dashboard/DashboardPage.jsx)

Reescribir completamente para incluir:

**Sección 1 — KPIs ejecutivos (fila superior)**:
| Estudiantes | Profesores | Asistencia Hoy | Notas Bajo 4.0 |
|-------------|------------|-----------------|-----------------|
| 342 ↑2.3% | 28 | 94.2% ↑ | 12 ↓ |

**Sección 2 — Gráficos (2 columnas)**:
- **Izquierda**: LineChart — "Tendencia de Asistencia" (últimos 30 días)
- **Derecha**: DonutChart — "Distribución de Notas" (1-2, 2-3, 3-4, 4-5, 5-6, 6-7)

**Sección 3 — Alertas activas**:
- Inasistencias consecutivas (> umbral configurado)
- Notas bajo promedio
- Suscripción próxima a vencer

**Sección 4 — Actividad reciente**:
- Timeline de últimas acciones (evaluaciones creadas, asistencia tomada, etc.)

### Backend — API de métricas

#### [NEW] Dashboard analytics service — `backend/apps/api/services/dashboard_analytics.py`

Nuevo service que calcula métricas avanzadas:

```python
def get_executive_metrics(colegio_rbd):
    """Retorna métricas ejecutivas para el dashboard"""
    return {
        'kpis': {
            'total_students': ...,
            'total_teachers': ...,
            'attendance_rate_today': ...,
            'attendance_trend': ...,  # 'up' | 'down' | 'stable'
            'grades_below_threshold': ...,
            'upcoming_evaluations': ...,
        },
        'charts': {
            'attendance_trend_30d': [...],  # [{date, present, absent, rate}]
            'grade_distribution': [...],    # [{range, count}]
            'attendance_by_course': [...],  # [{course, rate}]
        },
        'alerts': [...],
        'recent_activity': [...],
    }
```

#### [MODIFY] [urls.py](file:///c:/Proyectos/Aplicacion_Colegio/Aplicacion_Colegio/backend/apps/api/urls.py)

- Agregar `GET /api/v1/dashboard/executive/` — Nuevo endpoint ejecutivo
- Mantener `GET /api/v1/dashboard/resumen/` existente para compatibilidad

---

## Fase 4: 💳 SISTEMA DE PAGOS

**Justificación**: Sin pagos no hay ingresos. En Chile conviene partir con formatos locales: transferencia bancaria, Webpay/Transbank y, como opción secundaria, wallets como MercadoPago.

**Estado actual**: Ya existe `PaymentService` con checkout local, historial de pagos, webhook genérico, abstracción de proveedor para soportar transferencia bancaria chilena/Webpay, registro de aviso de transferencia, conciliación manual desde una vista administrativa, exportación CSV y filtros por estado/proveedor/fecha en avisos pendientes. La UI de suscripción también muestra alerta de vencimiento, selector de medio de pago y acción rápida de renovación.

### Backend — Integración de proveedores chilenos

#### [NEW] Payment service — `backend/apps/subscriptions/services/payment_service.py`

```python
class PaymentService:
    """Integración con MercadoPago Checkout Pro"""
    
    def create_checkout(self, plan, colegio, provider):
        """Crea un checkout según el proveedor chileno seleccionado"""
        # Retorna URL, instrucciones o referencia bancaria
    
    def process_webhook(self, data):
        """Procesa notificación de pago del proveedor seleccionado"""
        # Actualiza Subscription.status, fecha_ultimo_pago, etc.
    
    def get_payment_status(self, payment_id):
        """Consulta estado de un pago"""
```

#### [NEW] Payment models — Agregar en `backend/apps/subscriptions/models.py`

```python
class Payment(models.Model):
    """Registro de pagos procesados"""
    subscription = models.ForeignKey(Subscription, ...)
    external_id = models.CharField(max_length=100)  # ID externo del proveedor
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    moneda = models.CharField(max_length=3, default='CLP')
    status = models.CharField(...)  # pending, approved, rejected
    gateway = models.CharField(default='bank_transfer')
    metadata_json = models.JSONField(default=dict)
    fecha_pago = models.DateTimeField(null=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
```

#### [NEW] Payment views — `backend/apps/api/payment_views.py`

- `POST /api/v1/payments/create-checkout/` — Crear sesión de checkout
- `POST /api/v1/payments/webhook/` — Webhook IPN (sin auth, con verificación de firma)
- `GET /api/v1/payments/history/` — Historial de pagos del colegio
- `GET /api/v1/plans/` — Lista de planes disponibles (público)

#### [MODIFY] [requirements.txt](file:///c:/Proyectos/Aplicacion_Colegio/Aplicacion_Colegio/requirements.txt)

- Agregar SDKs según proveedor elegido (por ejemplo Webpay/Transbank; MercadoPago solo si se habilita)

### Frontend — UI de planes y pagos

#### [NEW] PricingPage — `frontend-react/src/features/subscriptions/PricingPage.jsx`

- Tabla de precios estilo SaaS moderno (3-4 columnas)
- Destacar plan recomendado
- Botón "Contratar" → redirige a checkout del proveedor local o muestra instrucciones bancarias
- Badge "Plan Actual" si ya está suscrito

#### [NEW] PaymentHistoryPage — `frontend-react/src/features/subscriptions/PaymentHistoryPage.jsx`

- Tabla con historial de pagos
- Status con badges (Aprobado ✅, Pendiente ⏳, Rechazado ❌)
- Botón de descarga de comprobante (PDF)

#### [NEW] SubscriptionStatusCard — `frontend-react/src/components/SubscriptionStatusCard.jsx`

- Widget para sidebar/dashboard mostrando plan actual, días restantes, uso
- Barra de progreso de uso (estudiantes/límite, mensajes/límite)
- CTA "Upgrade" si está cerca del límite

---

## Fase 5: 🚀 ONBOARDING AUTOMÁTICO

**Justificación**: "Crear colegio en 3 minutos" es el diferenciador comercial.

### Frontend — Flujo de registro

#### [NEW] RegisterPage — `frontend-react/src/features/auth/RegisterPage.jsx`

**Paso 1 — Datos del Admin**:
- Nombre, Email, Contraseña
- Validación en tiempo real

**Paso 2 — Datos del Colegio**:
- Nombre del colegio, RBD (opcional), Comuna, Tipo
- Auto-generar slug desde nombre

**Paso 3 — Configuración rápida**:
- Régimen (Semestral/Trimestral)
- Rango de notas (default Chile: 1-7)
- ¿Generar datos demo? ✅ (checkbox)

**Paso 4 — Confirmación**:
- Resumen de lo creado
- Botón "Entrar a mi colegio" → Login automático → Dashboard

#### [NEW] OnboardingWizard — `frontend-react/src/components/OnboardingWizard.jsx`

- Componente stepper reutilizable (barra de progreso 1-2-3-4)
- Transiciones animadas entre pasos
- Validación por paso antes de avanzar
- Mobile-first design

### Backend — API de onboarding

#### [NEW] Onboarding service — `backend/apps/api/services/onboarding_service.py`

```python
class OnboardingService:
    """Servicio de onboarding automático"""
    
    def create_school(self, data):
        """
        Crea todo en una transacción:
        1. Colegio con slug
        2. Usuario admin
        3. ConfiguracionAcademica
        4. CicloAcademico actual
        5. Subscription (Trial 30 días)
        6. (Opcional) Datos demo: cursos, estudiantes, profesores
        """
    
    def generate_demo_data(self, colegio):
        """Genera datos demo para el colegio"""
        # 3 cursos, 5 profesores, 30 estudiantes ficticios
        # Asistencia de últimos 7 días
        # 2 evaluaciones con notas
```

#### [NEW] Onboarding views — `backend/apps/api/onboarding_views.py`

- `POST /api/v1/onboarding/register/` — Registro público (sin auth) con rate limiting
- `GET /api/v1/onboarding/check-slug/` — Verificar disponibilidad de slug
- `POST /api/v1/onboarding/generate-demo/` — Generar datos demo (requiere auth)

#### [MODIFY] [urls.py](file:///c:/Proyectos/Aplicacion_Colegio/Aplicacion_Colegio/backend/apps/api/urls.py)

- Agregar rutas de onboarding, pagos y tenant

#### [MODIFY] [App.jsx](file:///c:/Proyectos/Aplicacion_Colegio/Aplicacion_Colegio/frontend-react/src/App.jsx)

- Agregar ruta `/register` → `RegisterPage`
- Agregar rutas `/planes` y `/pagos/historial`

---

## Resumen de Archivos por Fase

### Fase 1 — Mobile (5 archivos)
| Archivo | Acción | Complejidad |
|---------|--------|-------------|
| `styles.css` | MODIFY | 🟡 Media |
| `GroupedSidebar.jsx` | MODIFY | 🟡 Media |
| `App.jsx` | MODIFY | 🟢 Baja |
| `MobileBottomNav.jsx` | NEW | 🟢 Baja |
| `index.html` | MODIFY | 🟢 Baja |

### Fase 2 — Multi-tenancy (7 archivos)
| Archivo | Acción | Complejidad |
|---------|--------|-------------|
| `subdomain_middleware.py` | NEW | 🟡 Media |
| `Colegio models.py` | MODIFY | 🟢 Baja |
| `tenancy.py` | SIN CAMBIOS | — |
| `nginx.conf` | MODIFY | 🟢 Baja |
| `tenantContext.js` | NEW | 🟢 Baja |
| `LoginPage.jsx` | MODIFY | 🟢 Baja |
| `tenant_views.py` | NEW | 🟢 Baja |

### Fase 3 — Dashboard Ejecutivo (4 archivos)
| Archivo | Acción | Complejidad |
|---------|--------|-------------|
| `charts/*.jsx` (4 comp.) | NEW | 🟡 Media |
| `DashboardPage.jsx` | MODIFY (rewrite) | 🔴 Alta |
| `dashboard_analytics.py` | NEW | 🔴 Alta |
| `urls.py` | MODIFY | 🟢 Baja |

### Fase 4 — Pagos (7 archivos)
| Archivo | Acción | Complejidad |
|---------|--------|-------------|
| `payment_service.py` | NEW | 🔴 Alta |
| `subscriptions/models.py` | MODIFY | 🟡 Media |
| `payment_views.py` | NEW | 🟡 Media |
| `requirements.txt` | MODIFY | 🟢 Baja |
| `PricingPage.jsx` | NEW | 🟡 Media |
| `PaymentHistoryPage.jsx` | NEW | 🟡 Media |
| `SubscriptionStatusCard.jsx` | NEW | 🟡 Media |

### Fase 5 — Onboarding (5 archivos)
| Archivo | Acción | Complejidad |
|---------|--------|-------------|
| `RegisterPage.jsx` | NEW | 🟡 Media |
| `OnboardingWizard.jsx` | NEW | 🟡 Media |
| `onboarding_service.py` | NEW | 🔴 Alta |
| `onboarding_views.py` | NEW | 🟡 Media |
| `urls.py` | MODIFY | 🟢 Baja |

**Total: ~28 archivos (16 nuevos, 12 modificados)**

---

## Verification Plan

### Automated Tests

**Fase 1 (Mobile)**:
```bash
# Visual: Abrir en browser con DevTools en modo responsive
# Test de renderizado en 375px, 768px, 1024px, 1440px
```

**Fase 2 (Multi-tenancy)**:
```bash
python manage.py test backend.apps.api.tests --pattern="*tenant*"
# Test: SubdomainMiddleware resuelve colegio correcto
# Test: TenantManager filtra correctamente por subdominio
# Test: Endpoint /tenant/info/ retorna datos sin auth
```

**Fase 3 (Dashboard)**:
```bash
python manage.py test backend.apps.api.tests --pattern="*dashboard*"
# Test: Métricas ejecutivas calculan correctamente
# Test: Tendencia de asistencia de 30 días
# Test: Distribución de notas
```

**Fase 4 (Pagos)**:
```bash
python manage.py test backend.apps.subscriptions.tests
# Test: Crear preferencia de pago
# Test: Procesar webhook IPN
# Test: Modelo Payment registra pagos correctamente
# Test con MercadoPago sandbox
```

**Fase 5 (Onboarding)**:
```bash
python manage.py test backend.apps.api.tests --pattern="*onboarding*"
# Test: Registro crea colegio + admin + subscription trial
# Test: Datos demo se generan correctamente
# Test: Slug unique validation
```

### Manual Verification

- **Mobile**: Probar en dispositivo real (iPhone/Android) con ngrok o similar
- **Multi-tenancy**: Configurar hosts locales (`colegio1.localhost`) y verificar aislamiento
- **Dashboard**: Poblar con datos via `autopoblar.py` y verificar métricas vs. cálculo manual
- **Pagos**: Flujo completo en sandbox MercadoPago
- **Onboarding**: Cronometrar que el flujo completo toma < 3 minutos

---

## Diagrama de Arquitectura Final

```mermaid
graph TB
    subgraph "Cliente"
        B["🌐 Browser / Mobile"]
    end
    
    subgraph "Gateway"
        N["Nginx<br/>Wildcard SSL<br/>*.tusistema.cl"]
    end
    
    subgraph "Frontend React"
        LP["Landing / Pricing"]
        REG["Register / Onboarding"]
        LOGIN["Login (con branding)"]
        DASH["Dashboard Ejecutivo"]
        APP["App SaaS completa"]
    end
    
    subgraph "Backend Django"
        SM["SubdomainMiddleware"]
        TM["TenantManager"]
        SUBM["SubscriptionMiddleware"]
        API["API REST v1"]
        PS["PaymentService"]
        OS["OnboardingService"]
        DAS["DashboardAnalytics"]
    end
    
    subgraph "Externos"
        MP["MercadoPago"]
    end
    
    subgraph "Data"
        PG["PostgreSQL"]
        RD["Redis"]
    end
    
    B --> N
    N --> SM
    SM --> TM
    TM --> SUBM
    SUBM --> API
    API --> PS
    API --> OS
    API --> DAS
    PS --> MP
    API --> PG
    API --> RD
```

## Estimación de Esfuerzo

| Fase | Esfuerzo | Dependencias |
|------|----------|--------------|
| **Fase 1**: Mobile | ~2-3 sesiones | Ninguna |
| **Fase 2**: Multi-tenancy | ~2 sesiones | Fase 1 (responsive) |
| **Fase 3**: Dashboard | ~3-4 sesiones | Ninguna (puede ir en paralelo) |
| **Fase 4**: Pagos | ~3-4 sesiones | Fase 2 (tenant para contexto) |
| **Fase 5**: Onboarding | ~3-4 sesiones | Fases 2 + 4 (tenant + trial) |

> [!TIP]
> **Recomendación**: Empezar por **Fase 1 (Mobile)** + **Fase 3 (Dashboard)** en paralelo. Estas son las que más impacto visual tienen para demos y ventas, y no tienen dependencias entre sí.
