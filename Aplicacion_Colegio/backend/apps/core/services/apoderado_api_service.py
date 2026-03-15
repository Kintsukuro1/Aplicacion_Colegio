"""
Service para operaciones de Apoderado vía API.
Centraliza el acceso ORM para justificativos e inasistencias.
"""
from __future__ import annotations

import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class ApoderadoApiService:
    """Encapsula las operaciones ORM del apoderado para mantener las vistas libres de acceso directo."""

    # ------------------------------------------------------------------
    # Utilidades internas
    # ------------------------------------------------------------------

    @staticmethod
    def get_estudiante_ids_for_apoderado(user) -> list[int]:
        """Retorna IDs de estudiantes vinculados al apoderado activo."""
        from backend.apps.accounts.models import RelacionApoderadoEstudiante

        perfil_apoderado = getattr(user, 'perfil_apoderado', None)
        if not perfil_apoderado:
            return []

        return list(
            RelacionApoderadoEstudiante.objects.filter(
                apoderado_id=perfil_apoderado.id,
                activa=True,
            ).values_list('estudiante_id', flat=True)
        )

    @staticmethod
    def get_estudiante_or_none(estudiante_id: int, rbd: int):
        """Retorna usuario estudiante si pertenece al colegio; None si no existe."""
        from backend.apps.accounts.models import User

        try:
            return User.objects.get(id=estudiante_id, rbd_colegio=rbd)
        except User.DoesNotExist:
            return None

    # ------------------------------------------------------------------
    # Justificativos
    # ------------------------------------------------------------------

    @staticmethod
    def list_justificativos(user, rbd: int) -> list[dict]:
        """Lista justificativos del apoderado para el colegio dado."""
        from backend.apps.core.models import JustificativoInasistencia

        qs = (
            JustificativoInasistencia.objects.filter(
                presentado_por=user,
                colegio_id=rbd,
            )
            .select_related('estudiante')
            .order_by('-fecha_creacion')
        )

        result = []
        for j in qs:
            result.append({
                'id': j.id_justificativo,
                'estudiante': j.estudiante.get_full_name(),
                'fecha_ausencia': j.fecha_ausencia.strftime('%d/%m/%Y'),
                'fecha_fin': j.fecha_fin_ausencia.strftime('%d/%m/%Y') if j.fecha_fin_ausencia else None,
                'tipo': j.get_tipo_display(),
                'motivo': j.motivo,
                'estado': j.estado,
                'estado_display': j.get_estado_display(),
                'tiene_adjunto': bool(j.documento_adjunto),
                'observaciones_revision': j.observaciones_revision or '',
                'fecha_creacion': j.fecha_creacion.strftime('%d/%m/%Y %H:%M'),
            })
        return result

    @staticmethod
    def crear_justificativo(
        *,
        user,
        rbd: int,
        estudiante,
        fecha_ausencia: str,
        fecha_fin_ausencia,
        motivo: str,
        tipo: str,
        documento=None,
    ):
        """Crea un JustificativoInasistencia y retorna la instancia."""
        from backend.apps.core.models import JustificativoInasistencia

        return JustificativoInasistencia.objects.create(
            estudiante=estudiante,
            colegio_id=rbd,
            fecha_ausencia=fecha_ausencia,
            fecha_fin_ausencia=fecha_fin_ausencia,
            motivo=motivo,
            tipo=tipo,
            documento_adjunto=documento,
            presentado_por=user,
        )

    # ------------------------------------------------------------------
    # Firma digital
    # ------------------------------------------------------------------

    @staticmethod
    def list_firmas_apoderado(apoderado) -> tuple[list, list]:
        """Retorna (pendientes, firmados) para el apoderado."""
        from backend.apps.accounts.models import FirmaDigitalApoderado

        firmas_qs = (
            FirmaDigitalApoderado.objects.filter(apoderado=apoderado)
            .select_related('estudiante')
            .order_by('-timestamp_firma')
        )

        firmados = []
        for firma in firmas_qs:
            firmados.append({
                'id': firma.id,
                'tipo': firma.get_tipo_documento_display(),
                'titulo': firma.titulo_documento,
                'estudiante': firma.estudiante.get_full_name() if firma.estudiante else '',
                'fecha_firma': firma.timestamp_firma.strftime('%d/%m/%Y %H:%M'),
                'valida': firma.firma_valida,
            })

        # TODO: Implement pending document detection
        return [], firmados

    @staticmethod
    def firmar_documento(*, apoderado, tipo_documento: str, titulo: str, contenido: str,
                         ip_address: str, user_agent: str, estudiante=None):
        """Crea una FirmaDigitalApoderado y retorna la instancia."""
        from backend.apps.accounts.models import FirmaDigitalApoderado

        return FirmaDigitalApoderado.crear_firma(
            apoderado=apoderado,
            tipo_documento=tipo_documento,
            titulo=titulo,
            contenido=contenido,
            ip_address=ip_address,
            user_agent=user_agent,
            estudiante=estudiante,
        )
