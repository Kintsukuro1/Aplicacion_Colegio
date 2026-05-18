

**Fecha:** 2026-05-18  
**Alcance:** `Aplicacion_Colegio/frontend_django` — solo HTML y CSS  
**Sin cambios en:** views, urls, modelos, `frontend-react/`

---

## Resumen

Se aplicó una **identidad visual pastel** al portal académico Django: se eliminó el naranja intenso, se unificó el acceso al login y se alinearon la landing, el login y el dashboard interno (navbar, sidebar, tarjetas) con la misma paleta.

Objetivo: portal moderno, suave y consistente (navbar rosa, sidebar rosa, tarjetas lila/amarillo, botones salmón).

---

## Paleta global (`:root`)

Definida en `static/css/design-system.css` y reutilizada en `index.css` y `login.css`:

| Variable | Color | Uso |
|----------|-------|-----|
| `--color-primary` | `#E8967A` | Botones, acentos, badges |
| `--color-secondary` | `#C084A0` | Hover, enlaces, gradientes |
| `--color-background` | `#FDF8F0` | Fondo general (crema) |
| `--color-navbar` | `#FFE4E4` | Barra superior y footer landing |
| `--color-card` | `#E8E4FF` | Tarjetas / bloques lila |
| `--color-card-yellow` | `#FFF9E6` | Tarjetas destacadas |
| `--color-success` | `#E8F5F0` | Avisos positivos |
| `--color-text` | `#3D3D3D` | Texto principal |
| `--color-text-light` | `#7A7A7A` | Texto secundario |
| `--color-border` | `#F0E0E0` | Bordes suaves |
| `--color-white` | `#FFFFFF` | Superficies |

**Reemplazo masivo en CSS:** tonos como `#ff8a00`, `#f97316`, `#f59e0b`, `#ea580c`, `#fd7e14`, etc. pasaron a `var(--color-primary)` o variantes de la paleta en los archivos bajo `static/css/`.

---

## 1. Página de inicio (HOME)

**Plantilla:** `templates/index.html`  
**Estilos:** `static/css/index.css`

| Cambio | Detalle |
|--------|---------|
| Paleta pastel | Fondo crema, navbar rosa, sin naranja fuerte |
| Un solo acceso | Un botón «Ingresar al Portal» en navbar y hero; eliminados «Postular Ahora» y doble login (estudiantes vs personal) |
| Carrusel | 5 imágenes en `static/img/pwa/`: `escolares.avif`, `EscolarPortada.jpg`, `grupo.avif`, `niña.avif`, `patio.jpg` — autoplay, flechas y puntos |
| Portal unificado | Sección `#portal` con una tarjeta y un enlace a `accounts:login` |
| Tipografía | Plus Jakarta Sans |
| Botones | Bordes redondeados (~14px) |
| Footer | Logo EduHub con gradiente pastel (rosa → lila) |

**Cache busting CSS:** `index.css?v=20260518`

---

## 2. Login unificado

**Plantilla:** `templates/login.html`  
**Estilos:** `static/css/login.css`

| Antes | Después |
|-------|---------|
| Pestañas Estudiante / Apoderado | Un solo formulario para todos los roles |
| Marca «EduConnect» | **EduHub** |
| Fondo gris / naranja | Fondo `var(--color-background)`, tarjeta centrada con sombra suave |
| Campo según rol | Etiqueta genérica: «Usuario o correo electrónico» |

El backend sigue usando la misma URL y acción (`accounts:login`); la detección de rol queda del lado del servidor (no se modificó Python).

**Nota:** `templates/login_staff.html` y `login_staff.css` no se rediseñaron en esta pasada; la landing ya no enlaza al login de personal por separado.

**Cache busting CSS:** `login.css?v=20260518`

---

## 3. Portal interno (dashboard y componentes)

**Archivos principales:**

- `static/css/design-system.css` — variables globales
- `static/css/dashboard.css` — sidebar, header, tarjetas, fondos
- `static/css/components.css` — botones y banners (gradientes salmón–lila)

| Elemento | Estilo aplicado |
|----------|-----------------|
| `body` / contenido | Fondo crema (`--color-background`) |
| `.sidebar` | Gradiente rosa pastel (`--color-navbar`) |
| `.top-header` | Navbar rosa pastel |
| Enlaces activos sidebar | Fondo lila (`--color-card`), borde salmón |
| `.card` | Bordes suaves, sombra pastel |
| `.stat-card` | Fondo amarillo pastel (`--color-card-yellow`) |

El resto de CSS por módulo (profesor, estudiante, admin_escolar, etc.) hereda colores vía variables donde ya se reemplazó el naranja.

---

## Archivos tocados (referencia rápida)

### Plantillas HTML

- `templates/index.html` — landing + carrusel + portal único
- `templates/login.html` — login unificado

### CSS (principales)

- `static/css/design-system.css`
- `static/css/index.css`
- `static/css/login.css`
- `static/css/dashboard.css`
- `static/css/components.css`
- Resto de `static/css/**/*.css` — sustitución de hex naranjas por variables

### Imágenes (solo referenciadas, no movidas)

- `static/img/pwa/*` — carrusel del home

---

## Cómo verificar

1. Levantar Django: `python manage.py runserver`
2. Abrir la raíz del sitio: landing con carrusel y un solo CTA de login
3. Ir a login: formulario único, fondo crema, sin pestañas de rol
4. Entrar con un usuario de prueba: sidebar/header en tonos rosa pastel y tarjetas acordes a la paleta
5. Recarga forzada si no se ven estilos: **Ctrl+F5** (query `?v=20260518` en index y login)

---

## Reglas respetadas en esta entrega

- Solo `templates/` y `static/css/` (más referencias a imágenes existentes)
- No se crearon carpetas nuevas de código (solo esta carpeta `documentacion/`)
- No se modificó `frontend-react/`
- No se tocó lógica Python

---

## Próximos pasos visuales (opcional)

- Alinear `login_staff.html` con el mismo diseño que `login.html` o redirigir al login único
- Revisar páginas con CSS muy específico que aún usen fondos `#fff4ed` u otros restos locales
- Añadir entradas nuevas en este archivo (o `CAMBIOS_VISUALES_YYYY-MM-DD.md`) por cada iteración visual
# Cambios visuales — Frontend Django (EduHub)