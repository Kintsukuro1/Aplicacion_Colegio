from __future__ import annotations

from datetime import date, timedelta

from django.conf import settings
from django.core.cache import cache
from django.db.models import Q
from rest_framework.exceptions import PermissionDenied, ValidationError

from backend.apps.accounts.models import User
from backend.apps.academico.models import Asistencia, Calificacion, Evaluacion
from backend.apps.api.contracts import (
    DASHBOARD_ALLOWED_SCOPES,
    DASHBOARD_CONTRACT_VERSION,
    DASHBOARD_SCOPE_AUTO,
)
from backend.apps.cursos.models import Clase, ClaseEstudiante, Curso
from backend.common.services.policy_service import PolicyService
from backend.common.services.tenant_cache_service import TenantCacheService


class DashboardApiService:
    """Construye payloads de dashboard para la capa API."""

    @staticmethod
    def _is_global_admin(user) -> bool:
        return PolicyService.has_capability(user, 'SYSTEM_ADMIN')

    @staticmethod
    def _has_capability(user, capability: str) -> bool:
        return PolicyService.has_capability(
            user,
            capability,
            school_id=getattr(user, 'rbd_colegio', None),
        )

    @classmethod
    def _is_teacher_user(cls, user) -> bool:
        role_name = getattr(getattr(user, 'role', None), 'nombre', '') or ''
        return role_name.strip().lower() == 'profesor'

    @classmethod
    def _require_dashboard_capability(cls, user) -> bool:
        required = {
            'DASHBOARD_VIEW_SELF',
            'DASHBOARD_VIEW_SCHOOL',
            'DASHBOARD_VIEW_ANALYTICS',
        }
        return any(cls._has_capability(user, cap) for cap in required)

    @classmethod
    def _dashboard_scopes_for_user(cls, user):
        if cls._is_global_admin(user):
            return {'self', 'school', 'analytics', 'global'}

        scopes = set()
        if cls._has_capability(user, 'DASHBOARD_VIEW_SELF'):
            scopes.add('self')
        if cls._has_capability(user, 'DASHBOARD_VIEW_SCHOOL'):
            scopes.add('school')
        if cls._has_capability(user, 'DASHBOARD_VIEW_ANALYTICS'):
            scopes.add('analytics')
        return scopes

    @classmethod
    def _resolve_dashboard_scope(cls, *, requested_scope: str, allowed_scopes):
        requested = (requested_scope or DASHBOARD_SCOPE_AUTO).strip().lower()
        if requested == DASHBOARD_SCOPE_AUTO:
            for candidate in ('analytics', 'school', 'self'):
                if candidate in allowed_scopes:
                    return candidate
            return None
        if requested not in DASHBOARD_ALLOWED_SCOPES:
            raise ValidationError({'scope': 'Valor invalido. Use self, school, analytics o auto.'})
        if requested not in allowed_scopes:
            return None
        return requested

    @classmethod
    def _base_dashboard_context(cls, user, *, scope, school_id):
        role_name = getattr(getattr(user, 'role', None), 'nombre', None)
        return {
            'contract_version': DASHBOARD_CONTRACT_VERSION,
            'scope': scope,
            'generated_at': date.today().isoformat(),
            'context': {
                'user_id': user.id,
                'role': role_name,
                'colegio_id': school_id,
                'is_global_admin': cls._is_global_admin(user),
            },
        }

    @classmethod
    def _build_self_section(cls, user, *, today):
        payload = {
            'today': today.isoformat(),
        }
        if cls._is_teacher_user(user):
            payload.update(
                {
                    'my_classes': Clase.objects.filter(profesor_id=user.id, activo=True).count(),
                    'my_attendance_today': Asistencia.objects.filter(clase__profesor_id=user.id, fecha=today).count(),
                    'my_evaluations': Evaluacion.objects.filter(clase__profesor_id=user.id, activa=True).count(),
                }
            )
            return payload

        is_student = bool(
            getattr(getattr(user, 'role', None), 'nombre', '').strip().lower() in {'estudiante', 'alumno'}
        )
        if is_student:
            payload.update(
                {
                    'my_classes': ClaseEstudiante.objects.filter(estudiante_id=user.id, activo=True).count(),
                    'my_grades': Calificacion.objects.filter(estudiante_id=user.id).count(),
                    'my_attendance_today': Asistencia.objects.filter(estudiante_id=user.id, fecha=today).count(),
                }
            )
            return payload

        payload.update(
            {
                'my_classes': 0,
                'my_attendance_today': 0,
                'my_evaluations': 0,
            }
        )
        return payload

    @staticmethod
    def _build_school_section(*, today, school_id=None):
        student_qs = User.objects.filter(Q(role__nombre__iexact='Estudiante') | Q(role__nombre__iexact='Alumno'))
        teacher_qs = User.objects.filter(role__nombre__iexact='Profesor')
        course_qs = Curso.objects.filter(activo=True)
        class_qs = Clase.objects.filter(activo=True)
        attendance_qs = Asistencia.objects
        eval_qs = Evaluacion.objects.filter(activa=True)

        if school_id is not None:
            student_qs = student_qs.filter(rbd_colegio=school_id)
            teacher_qs = teacher_qs.filter(rbd_colegio=school_id)
            course_qs = course_qs.filter(colegio_id=school_id)
            class_qs = class_qs.filter(colegio_id=school_id)
            attendance_qs = attendance_qs.filter(colegio_id=school_id)
            eval_qs = eval_qs.filter(colegio_id=school_id)

        return {
            'today': today.isoformat(),
            'colegio_id': school_id,
            'students': student_qs.count(),
            'teachers': teacher_qs.count(),
            'courses_active': course_qs.count(),
            'classes_active': class_qs.count(),
            'attendance_today': attendance_qs.filter(fecha=today).count(),
            'evaluations_upcoming': eval_qs.filter(fecha_evaluacion__gte=today).count(),
        }

    @staticmethod
    def _build_analytics_section(*, today, school_id=None):
        attendance_qs = Asistencia.objects
        eval_qs = Evaluacion.objects.filter(activa=True)
        grades_qs = Calificacion.objects
        if school_id is not None:
            attendance_qs = attendance_qs.filter(colegio_id=school_id)
            eval_qs = eval_qs.filter(colegio_id=school_id)
            grades_qs = grades_qs.filter(colegio_id=school_id)

        attendance_today_total = attendance_qs.filter(fecha=today).count()
        attendance_today_present = attendance_qs.filter(fecha=today, estado='P').count()
        attendance_rate = 0.0
        if attendance_today_total:
            attendance_rate = round((attendance_today_present * 100.0) / attendance_today_total, 2)

        next_7_days = today + timedelta(days=7)
        return {
            'today': today.isoformat(),
            'colegio_id': school_id,
            'attendance_today_total': attendance_today_total,
            'attendance_today_present': attendance_today_present,
            'attendance_rate_today': attendance_rate,
            'evaluations_next_7_days': eval_qs.filter(
                fecha_evaluacion__gte=today,
                fecha_evaluacion__lte=next_7_days,
            ).count(),
            'grades_below_4': grades_qs.filter(nota__lt=4.0).count(),
        }

    @classmethod
    def build_dashboard_payload(cls, *, user, query_params):
        if not cls._require_dashboard_capability(user) and not cls._is_global_admin(user):
            raise PermissionDenied('No tiene permisos para ver dashboard.')

        today = date.today()
        allowed_scopes = cls._dashboard_scopes_for_user(user)
        scope = cls._resolve_dashboard_scope(
            requested_scope=query_params.get('scope'),
            allowed_scopes=allowed_scopes,
        )
        if scope is None:
            raise PermissionDenied('No tiene permisos para el scope solicitado.')

        school_id = query_params.get('colegio_id') or getattr(user, 'rbd_colegio', None)

        if school_id is not None:
            try:
                school_id = int(school_id)
            except (TypeError, ValueError):
                raise ValidationError({'colegio_id': 'Debe ser un entero valido.'})

        if not cls._is_global_admin(user) and school_id is None:
            raise ValidationError({'colegio_id': 'Usuario sin colegio asignado.'})

        if scope == 'global' and not cls._is_global_admin(user):
            raise PermissionDenied('Scope global no permitido.')

        if scope != 'global' and school_id is None and scope in {'school', 'analytics'} and not cls._is_global_admin(user):
            raise ValidationError({'colegio_id': 'Scope school/analytics requiere colegio_id.'})

        effective_school_id = None if scope == 'global' else school_id

        cache_key = TenantCacheService.build_key(
            'dashboard_summary',
            tenant_id=effective_school_id,
            scope=scope,
            user_id=user.id if scope == 'self' else None,
        )
        cached_payload = cache.get(cache_key)
        if cached_payload:
            return cached_payload

        payload = cls._base_dashboard_context(user, scope=scope, school_id=effective_school_id)
        payload['available_scopes'] = sorted(allowed_scopes)

        sections = {
            'self': None,
            'school': None,
            'analytics': None,
        }

        if scope == 'self':
            sections['self'] = cls._build_self_section(user, today=today)
        elif scope == 'school':
            sections['school'] = cls._build_school_section(today=today, school_id=effective_school_id)
        elif scope == 'analytics':
            sections['analytics'] = cls._build_analytics_section(today=today, school_id=effective_school_id)
        elif scope == 'global':
            sections['school'] = cls._build_school_section(today=today, school_id=None)
            sections['analytics'] = cls._build_analytics_section(today=today, school_id=None)

        payload['sections'] = sections
        cache.set(cache_key, payload, timeout=getattr(settings, 'CACHE_TIMEOUT_SHORT', 60))
        return payload
