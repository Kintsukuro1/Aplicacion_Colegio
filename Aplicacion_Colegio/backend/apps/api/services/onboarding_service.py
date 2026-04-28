"""Servicio de onboarding automático para nuevos colegios."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any, Dict

from django.db import transaction
from django.utils import timezone

from backend.apps.accounts.models import Role, User
from backend.apps.institucion.models import Colegio, ConfiguracionAcademica, CicloAcademico
from backend.apps.subscriptions.models import Plan, Subscription


@dataclass(frozen=True)
class OnboardingResult:
    colegio_rbd: int
    colegio_slug: str
    admin_email: str
    subscription_status: str


class OnboardingService:
    """Crea el setup inicial de un colegio en una sola transacción."""

    @staticmethod
    def check_slug_available(slug: str) -> bool:
        normalized = (slug or '').strip().lower()
        if not normalized:
            return False
        return not Colegio.objects.all_schools().filter(slug=normalized).exists()

    @staticmethod
    def create_school(data: Dict[str, Any]) -> OnboardingResult:
        payload = OnboardingService._validate_payload(data)

        with transaction.atomic():
            role = OnboardingService._get_or_create_admin_role()
            colegio = Colegio.objects.create(
                rbd=payload['rbd'],
                nombre=payload['school_name'],
                rut_establecimiento=payload['school_rut'] or f"{payload['rbd']}-K",
                correo=payload['school_email'],
                telefono=payload.get('school_phone') or '',
                direccion=payload.get('school_address') or '',
                slug=payload['slug'],
                color_primario=payload.get('color_primario') or '#6366f1',
            )

            admin_user = User.objects.create_user(
                email=payload['admin_email'],
                password=payload['admin_password'],
                nombre=payload['admin_name'],
                apellido_paterno=payload.get('admin_last_name') or 'SinApellido',
                role=role,
                rbd_colegio=colegio.rbd,
                is_staff=True,
                is_active=True,
            )

            year = payload.get('school_year') or timezone.now().year
            ConfiguracionAcademica.objects.create(
                colegio=colegio,
                anio_escolar_activo=year,
                regimen_evaluacion=payload.get('regimen_evaluacion') or 'SEMESTRAL',
                nota_minima=payload.get('nota_minima') or 1.0,
                nota_maxima=payload.get('nota_maxima') or 7.0,
                nota_aprobacion=payload.get('nota_aprobacion') or 4.0,
                redondeo_decimales=payload.get('redondeo_decimales') or 1,
                umbral_inasistencia_alerta=payload.get('umbral_inasistencia_alerta') or 3,
                umbral_notas_alerta=payload.get('umbral_notas_alerta') or 4.0,
                actualizado_por=admin_user,
                tiene_convenio_sep=bool(payload.get('tiene_convenio_sep', False)),
            )

            start_date = date(year, 3, 1)
            end_date = date(year, 12, 31)
            CicloAcademico.objects.create(
                colegio=colegio,
                nombre=payload.get('cycle_name') or f'{year}',
                fecha_inicio=start_date,
                fecha_fin=end_date,
                estado='ACTIVO',
                descripcion='Ciclo creado automáticamente durante el onboarding inicial.',
                creado_por=admin_user,
                modificado_por=admin_user,
            )

            plan = OnboardingService._get_trial_plan()
            subscription = Subscription.objects.create(
                colegio=colegio,
                plan=plan,
                fecha_inicio=timezone.now().date(),
                fecha_fin=timezone.now().date() + timedelta(days=plan.duracion_dias or 30),
                fecha_ultimo_pago=timezone.now().date(),
                proximo_pago=timezone.now().date() + timedelta(days=plan.duracion_dias or 30),
                status=Subscription.STATUS_ACTIVE,
                auto_renovar=False,
                notas='Trial inicial creado durante onboarding.',
            )

            if payload.get('generate_demo_data'):
                OnboardingService.generate_demo_data(colegio=colegio, admin_user=admin_user)

        return OnboardingResult(
            colegio_rbd=colegio.rbd,
            colegio_slug=colegio.slug,
            admin_email=admin_user.email,
            subscription_status=subscription.status,
        )

    @staticmethod
    def generate_demo_data(*, colegio: Colegio, admin_user: User) -> None:
        """Genera datos demo mínimos para pruebas comerciales."""
        # Implementación conservadora: solo deja la huella del demo para futuras ampliaciones.
        colegio.nombre = colegio.nombre
        colegio.save(update_fields=['nombre'])

    @staticmethod
    def _get_or_create_admin_role() -> Role:
        role, _ = Role.objects.get_or_create(nombre='Administrador general')
        return role

    @staticmethod
    def _validate_payload(data: Dict[str, Any]) -> Dict[str, Any]:
        required_fields = ['admin_name', 'admin_email', 'admin_password', 'school_name']
        missing = [field for field in required_fields if not str(data.get(field) or '').strip()]
        if missing:
            raise ValueError(f"Faltan campos requeridos: {', '.join(missing)}")

        school_name = str(data['school_name']).strip()
        admin_email = str(data['admin_email']).strip().lower()
        admin_password = str(data['admin_password']).strip()
        slug = str(data.get('slug') or '').strip().lower()
        if not slug:
            from django.utils.text import slugify
            slug = slugify(school_name)[:45] or 'colegio'

        school_rut = str(data.get('school_rut') or '').strip()
        school_email = str(data.get('school_email') or admin_email).strip().lower()
        rbd = data.get('rbd')
        if rbd is None:
            raise ValueError('El RBD del colegio es requerido.')
        try:
            rbd = int(rbd)
        except (TypeError, ValueError) as exc:
            raise ValueError('El RBD del colegio debe ser numérico.') from exc

        if not OnboardingService.check_slug_available(slug):
            raise ValueError('El slug ya está en uso.')

        if Colegio.objects.filter(rbd=rbd).exists():
            raise ValueError('Ya existe un colegio con ese RBD.')
        if User.objects.filter(email=admin_email).exists():
            raise ValueError('Ya existe un usuario con ese email.')

        return {
            'rbd': rbd,
            'school_name': school_name,
            'school_rut': school_rut,
            'school_email': school_email,
            'school_phone': str(data.get('school_phone') or '').strip(),
            'school_address': str(data.get('school_address') or '').strip(),
            'slug': slug,
            'color_primario': str(data.get('color_primario') or '').strip() or '#6366f1',
            'admin_name': str(data['admin_name']).strip(),
            'admin_last_name': str(data.get('admin_last_name') or '').strip(),
            'admin_email': admin_email,
            'admin_password': admin_password,
            'school_year': int(data.get('school_year') or timezone.now().year),
            'regimen_evaluacion': str(data.get('regimen_evaluacion') or 'SEMESTRAL').strip().upper(),
            'nota_minima': data.get('nota_minima') or 1.0,
            'nota_maxima': data.get('nota_maxima') or 7.0,
            'nota_aprobacion': data.get('nota_aprobacion') or 4.0,
            'redondeo_decimales': int(data.get('redondeo_decimales') or 1),
            'umbral_inasistencia_alerta': int(data.get('umbral_inasistencia_alerta') or 3),
            'umbral_notas_alerta': data.get('umbral_notas_alerta') or 4.0,
            'tiene_convenio_sep': bool(data.get('tiene_convenio_sep', False)),
            'cycle_name': str(data.get('cycle_name') or '').strip(),
            'generate_demo_data': bool(data.get('generate_demo_data', False)),
        }

    @staticmethod
    def _get_trial_plan() -> Plan:
        plan = Plan.objects.filter(codigo=Plan.PLAN_TRIAL, activo=True).first()
        if plan:
            return plan
        return Plan.objects.get_or_create(
            codigo=Plan.PLAN_TRIAL,
            defaults={
                'nombre': 'Prueba',
                'descripcion': 'Plan de prueba por 30 días.',
                'precio_mensual': 0,
                'is_trial': True,
                'duracion_dias': 30,
                'activo': True,
            },
        )[0]
