from __future__ import annotations

from backend.apps.academico.models import Asistencia, Calificacion
from backend.apps.api.resources_serializers import (
    StudentAttendanceSerializer,
    StudentEnrollmentSerializer,
    StudentGradeSerializer,
    StudentSelfSerializer,
)
from backend.apps.cursos.models import ClaseEstudiante
from backend.common.services.policy_service import PolicyService


class StudentPortalApiService:
    """Logica de dominio para endpoints de autoservicio de estudiante."""

    @staticmethod
    def has_capability(*, user, capability: str) -> bool:
        return PolicyService.has_capability(
            user,
            capability,
            school_id=getattr(user, 'rbd_colegio', None),
        )

    @staticmethod
    def is_global_admin(user) -> bool:
        return PolicyService.has_capability(user, 'SYSTEM_ADMIN')

    @classmethod
    def serialize_profile(cls, *, user) -> dict:
        return StudentSelfSerializer(user).data

    @classmethod
    def serialize_my_classes(cls, *, user) -> list:
        queryset = ClaseEstudiante.objects.select_related(
            'clase__curso',
            'clase__asignatura',
            'clase__profesor',
        ).filter(estudiante_id=user.id, activo=True)

        if not cls.is_global_admin(user):
            queryset = queryset.filter(clase__colegio_id=user.rbd_colegio)

        return StudentEnrollmentSerializer(queryset.order_by('-fecha_matricula'), many=True).data

    @classmethod
    def serialize_my_grades(cls, *, user, clase_id=None, evaluacion_id=None) -> list:
        queryset = Calificacion.objects.select_related(
            'evaluacion',
            'evaluacion__clase',
            'evaluacion__clase__curso',
            'evaluacion__clase__asignatura',
        ).filter(estudiante_id=user.id)

        if not cls.is_global_admin(user):
            queryset = queryset.filter(colegio_id=user.rbd_colegio)

        if clase_id:
            queryset = queryset.filter(evaluacion__clase_id=clase_id)

        if evaluacion_id:
            queryset = queryset.filter(evaluacion_id=evaluacion_id)

        return StudentGradeSerializer(queryset.order_by('-fecha_creacion', '-id_calificacion'), many=True).data

    @classmethod
    def serialize_my_attendance(cls, *, user, clase_id=None, fecha_desde=None, fecha_hasta=None) -> list:
        queryset = Asistencia.objects.select_related(
            'clase__curso',
            'clase__asignatura',
        ).filter(estudiante_id=user.id)

        if not cls.is_global_admin(user):
            queryset = queryset.filter(colegio_id=user.rbd_colegio)

        if clase_id:
            queryset = queryset.filter(clase_id=clase_id)

        if fecha_desde:
            queryset = queryset.filter(fecha__gte=fecha_desde)

        if fecha_hasta:
            queryset = queryset.filter(fecha__lte=fecha_hasta)

        return StudentAttendanceSerializer(queryset.order_by('-fecha', '-id_asistencia'), many=True).data
