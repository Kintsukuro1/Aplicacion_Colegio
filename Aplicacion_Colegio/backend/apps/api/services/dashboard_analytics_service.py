"""
Dashboard Analytics Service
============================

Servicio de métricas ejecutivas avanzadas para el dashboard.
Provee datos para gráficos (tendencias, distribuciones) y alertas.
"""
from __future__ import annotations

from datetime import date, timedelta
from collections import defaultdict

from django.db.models import Avg, Count, Q
from django.conf import settings
from django.core.cache import cache

from backend.apps.accounts.models import User
from backend.apps.academico.models import Asistencia, Calificacion, Evaluacion
from backend.apps.cursos.models import Clase, ClaseEstudiante, Curso
from backend.apps.subscriptions.utils import (
    get_subscription_status_message,
    get_usage_warnings,
)
from backend.common.services.tenant_cache_service import TenantCacheService


class DashboardAnalyticsService:
    """Genera métricas ejecutivas con datos para gráficos y alertas."""

    @classmethod
    def get_executive_payload(cls, *, user, school_id, scope='auto'):
        """
        Punto de entrada principal. Retorna payload ejecutivo con:
        - kpis: métricas numéricas clave
        - charts: datos para gráficos frontend
        - alerts: alertas activas
        - subscription_alert: estado de suscripción
        - usage_warnings: advertencias de límites
        """
        cache_key = TenantCacheService.build_key(
            'dashboard_executive',
            tenant_id=school_id,
            scope=scope,
            user_id=user.id if scope == 'self' else None,
        )
        cached = cache.get(cache_key)
        if cached:
            return cached

        today = date.today()
        payload = {
            'scope': scope,
            'generated_at': today.isoformat(),
        }

        if scope in ('school', 'analytics', 'auto', 'global'):
            payload['charts'] = cls._build_charts(school_id=school_id, today=today)
            payload['alerts'] = cls._build_alerts(school_id=school_id, today=today)
        else:
            payload['charts'] = {}
            payload['alerts'] = []

        # Subscription info
        payload.update(cls._build_subscription_info(school_id=school_id))

        cache_timeout = getattr(settings, 'CACHE_TIMEOUT_SHORT', 60) * 2
        cache.set(cache_key, payload, timeout=cache_timeout)
        return payload

    @classmethod
    def _build_charts(cls, *, school_id, today):
        """Construye datos para los gráficos del dashboard."""
        charts = {}

        # 1. Tendencia de asistencia últimos 30 días
        charts['attendance_trend_30d'] = cls._attendance_trend(
            school_id=school_id,
            today=today,
            days=30,
        )

        # 2. Distribución de notas
        charts['grade_distribution'] = cls._grade_distribution(
            school_id=school_id,
        )

        # 3. Asistencia por curso (top 10)
        charts['attendance_by_course'] = cls._attendance_by_course(
            school_id=school_id,
            today=today,
        )

        return charts

    @classmethod
    def _attendance_trend(cls, *, school_id, today, days=30):
        """
        Calcula tasa de asistencia diaria para los últimos N días.
        Retorna lista de {date, present, absent, total, rate}.
        """
        start_date = today - timedelta(days=days - 1)
        base_qs = Asistencia.objects.all()
        if school_id is not None:
            base_qs = base_qs.filter(colegio_id=school_id)

        # Agrupar por fecha
        daily = (
            base_qs
            .filter(fecha__gte=start_date, fecha__lte=today)
            .values('fecha')
            .annotate(
                total=Count('id'),
                present=Count('id', filter=Q(estado='P')),
            )
            .order_by('fecha')
        )

        # Crear mapa de fecha → datos
        daily_map = {
            row['fecha']: {
                'total': row['total'],
                'present': row['present'],
            }
            for row in daily
        }

        result = []
        for i in range(days):
            d = start_date + timedelta(days=i)
            info = daily_map.get(d, {'total': 0, 'present': 0})
            total = info['total']
            present = info['present']
            rate = round((present / total) * 100, 1) if total > 0 else 0
            result.append({
                'date': d.isoformat(),
                'present': present,
                'absent': total - present,
                'total': total,
                'rate': rate,
            })

        return result

    @classmethod
    def _grade_distribution(cls, *, school_id):
        """
        Distribución de notas por rango (1-2, 2-3, ..., 6-7).
        Retorna lista de {range, count, color}.
        """
        base_qs = Calificacion.objects.all()
        if school_id is not None:
            base_qs = base_qs.filter(colegio_id=school_id)

        # Obtener escala del colegio
        nota_aprobacion = 4.0
        try:
            from backend.apps.institucion.models import Colegio
            from backend.common.utils.grade_scale import get_escala
            colegio = Colegio.objects.get(rbd=school_id)
            escala = get_escala(colegio)
            nota_aprobacion = float(escala['nota_aprobacion'])
        except Exception:
            pass

        ranges = [
            ('1.0-2.0', 1.0, 2.0),
            ('2.0-3.0', 2.0, 3.0),
            ('3.0-4.0', 3.0, 4.0),
            ('4.0-5.0', 4.0, 5.0),
            ('5.0-6.0', 5.0, 6.0),
            ('6.0-7.0', 6.0, 7.01),
        ]

        colors = ['#f43f5e', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#6366f1']

        result = []
        for i, (label, low, high) in enumerate(ranges):
            count = base_qs.filter(nota__gte=low, nota__lt=high).count()
            result.append({
                'range': label,
                'label': label,
                'count': count,
                'color': colors[i],
                'below_approval': high <= nota_aprobacion,
            })

        return result

    @classmethod
    def _attendance_by_course(cls, *, school_id, today, limit=10):
        """
        Tasa de asistencia promedio por curso en el mes actual.
        Retorna lista de {course, rate, total, present}.
        """
        primer_dia_mes = today.replace(day=1)
        base_qs = Asistencia.objects.filter(
            fecha__gte=primer_dia_mes,
            fecha__lte=today,
        )
        if school_id is not None:
            base_qs = base_qs.filter(colegio_id=school_id)

        # Obtener asistencia por clase → curso
        by_clase = (
            base_qs
            .values('clase_id', 'clase__curso__nombre')
            .annotate(
                total=Count('id'),
                present=Count('id', filter=Q(estado='P')),
            )
            .order_by('-total')[:limit * 2]  # Get extra to merge by curso
        )

        # Agrupar por nombre de curso
        curso_data = defaultdict(lambda: {'total': 0, 'present': 0})
        for row in by_clase:
            curso_nombre = row['clase__curso__nombre'] or 'Sin Curso'
            curso_data[curso_nombre]['total'] += row['total']
            curso_data[curso_nombre]['present'] += row['present']

        result = []
        for curso, info in sorted(curso_data.items(), key=lambda x: -x[1]['total']):
            rate = round((info['present'] / info['total']) * 100, 1) if info['total'] > 0 else 0
            result.append({
                'course': curso,
                'rate': rate,
                'total': info['total'],
                'present': info['present'],
            })
            if len(result) >= limit:
                break

        return result

    @classmethod
    def _build_alerts(cls, *, school_id, today):
        """Genera alertas basadas en métricas actuales."""
        alerts = []

        if school_id is None:
            return alerts

        # Asistencia baja hoy
        att_today = Asistencia.objects.filter(
            colegio_id=school_id, fecha=today
        )
        total = att_today.count()
        if total > 0:
            present = att_today.filter(estado='P').count()
            rate = round((present / total) * 100, 1)
            if rate < 70:
                alerts.append({
                    'type': 'danger',
                    'icon': '📉',
                    'message': f'Asistencia crítica hoy: {rate}% ({present}/{total} presentes).',
                })
            elif rate < 85:
                alerts.append({
                    'type': 'warning',
                    'icon': '⚠️',
                    'message': f'Asistencia moderada hoy: {rate}% ({present}/{total} presentes).',
                })

        # Evaluaciones próximas
        next_3 = today + timedelta(days=3)
        eval_count = Evaluacion.objects.filter(
            colegio_id=school_id,
            activa=True,
            fecha_evaluacion__gte=today,
            fecha_evaluacion__lte=next_3,
        ).count()
        if eval_count > 0:
            alerts.append({
                'type': 'info',
                'icon': '📝',
                'message': f'{eval_count} evaluación(es) programada(s) en los próximos 3 días.',
            })

        # Notas bajo aprobación
        nota_aprobacion = 4.0
        try:
            from backend.apps.institucion.models import Colegio
            from backend.common.utils.grade_scale import get_escala
            colegio = Colegio.objects.get(rbd=school_id)
            escala = get_escala(colegio)
            nota_aprobacion = float(escala['nota_aprobacion'])
        except Exception:
            pass

        below_count = Calificacion.objects.filter(
            colegio_id=school_id,
            nota__lt=nota_aprobacion,
        ).values('estudiante_id').distinct().count()

        if below_count > 10:
            alerts.append({
                'type': 'warning',
                'icon': '📊',
                'message': f'{below_count} estudiantes con notas bajo {nota_aprobacion}.',
            })

        return alerts

    @classmethod
    def _build_subscription_info(cls, *, school_id):
        """Obtiene información de suscripción y advertencias de uso."""
        result = {
            'subscription_alert': None,
            'usage_warnings': [],
        }

        if school_id is None:
            return result

        try:
            from backend.apps.subscriptions.models import Subscription
            sub = Subscription.objects.select_related('plan').get(
                colegio__rbd=school_id
            )
            result['subscription_alert'] = get_subscription_status_message(sub)
            result['usage_warnings'] = get_usage_warnings(sub)
        except Exception:
            pass

        return result
