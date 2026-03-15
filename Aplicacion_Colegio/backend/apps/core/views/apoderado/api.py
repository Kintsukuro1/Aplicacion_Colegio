"""
API endpoints para Apoderado.
- Crear/listar justificativos de inasistencia
- Listar/firmar documentos pendientes
"""
import json
import logging

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from backend.apps.core.services.apoderado_api_service import ApoderadoApiService
from backend.apps.core.views.school_context import resolve_request_rbd
from backend.common.services.policy_service import PolicyService
from backend.common.utils.view_auth import jwt_or_session_auth_required

logger = logging.getLogger(__name__)


def _get_rbd(request):
    return resolve_request_rbd(request)


@jwt_or_session_auth_required
@require_http_methods(['GET'])
def listar_justificativos(request):
    """Lista los justificativos presentados por el apoderado."""
    rbd = _get_rbd(request)
    if not rbd:
        return JsonResponse({'success': False, 'error': 'Sin colegio asignado'}, status=400)

    try:
        data = ApoderadoApiService.list_justificativos(request.user, rbd)
        return JsonResponse({'success': True, 'justificativos': data})
    except Exception:
        logger.exception('Error listando justificativos')
        return JsonResponse({'success': False, 'error': 'Error interno del servidor'}, status=500)


@jwt_or_session_auth_required
@require_http_methods(['POST'])
def crear_justificativo(request):
    """Crea un nuevo justificativo de inasistencia."""
    rbd = _get_rbd(request)
    if not rbd:
        return JsonResponse({'success': False, 'error': 'Sin colegio asignado'}, status=400)

    try:
        estudiante_id = request.POST.get('estudiante_id')
        tipo = request.POST.get('tipo', 'OTRO')
        motivo = (request.POST.get('motivo') or '').strip()
        fecha_ausencia = request.POST.get('fecha_ausencia')
        fecha_fin_ausencia = request.POST.get('fecha_fin_ausencia') or None
        documento = request.FILES.get('documento')

        if not estudiante_id:
            return JsonResponse({'success': False, 'error': 'Debe seleccionar un estudiante'}, status=400)
        if not motivo:
            return JsonResponse({'success': False, 'error': 'El motivo es obligatorio'}, status=400)
        if not fecha_ausencia:
            return JsonResponse({'success': False, 'error': 'La fecha de ausencia es obligatoria'}, status=400)

        est_ids = ApoderadoApiService.get_estudiante_ids_for_apoderado(request.user)
        if int(estudiante_id) not in est_ids:
            return JsonResponse({'success': False, 'error': 'Estudiante no autorizado'}, status=403)

        estudiante = ApoderadoApiService.get_estudiante_or_none(int(estudiante_id), rbd)
        if not estudiante:
            return JsonResponse({'success': False, 'error': 'Estudiante no encontrado'}, status=404)

        justificativo = ApoderadoApiService.crear_justificativo(
            user=request.user,
            rbd=rbd,
            estudiante=estudiante,
            fecha_ausencia=fecha_ausencia,
            fecha_fin_ausencia=fecha_fin_ausencia,
            motivo=motivo,
            tipo=tipo,
            documento=documento,
        )

        return JsonResponse({
            'success': True,
            'message': 'Justificativo enviado correctamente',
            'id': justificativo.id_justificativo,
        })

    except Exception:
        logger.exception('Error creando justificativo')
        return JsonResponse({'success': False, 'error': 'Error interno del servidor'}, status=500)


@jwt_or_session_auth_required
@require_http_methods(['GET'])
def listar_documentos_firma(request):
    """Lista documentos pendientes y firmados del apoderado."""
    rbd = _get_rbd(request)
    if not rbd:
        return JsonResponse({'success': False, 'error': 'Sin colegio asignado'}, status=400)

    try:
        if not hasattr(request.user, 'perfil_apoderado'):
            return JsonResponse({'success': True, 'pendientes': [], 'firmados': []})

        apoderado = request.user.perfil_apoderado
        pendientes, firmados = ApoderadoApiService.list_firmas_apoderado(apoderado)

        return JsonResponse({
            'success': True,
            'pendientes': pendientes,
            'firmados': firmados,
        })
    except Exception:
        logger.exception('Error listando documentos de firma')
        return JsonResponse({'success': False, 'error': 'Error interno del servidor'}, status=500)


@jwt_or_session_auth_required
@require_http_methods(['POST'])
def firmar_documento(request):
    """Firma digitalmente un documento."""
    rbd = _get_rbd(request)
    if not rbd:
        return JsonResponse({'success': False, 'error': 'Sin colegio asignado'}, status=400)

    try:
        body = json.loads(request.body)
        tipo_documento = body.get('tipo_documento')
        titulo = body.get('titulo', '')
        contenido = body.get('contenido', '')
        estudiante_id = body.get('estudiante_id')

        if not tipo_documento or not titulo:
            return JsonResponse({'success': False, 'error': 'Datos incompletos'}, status=400)

        if not hasattr(request.user, 'perfil_apoderado'):
            return JsonResponse({'success': False, 'error': 'Perfil de apoderado no encontrado'}, status=400)

        apoderado = request.user.perfil_apoderado
        ip_address = request.META.get('REMOTE_ADDR', '0.0.0.0')
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        estudiante = None
        if estudiante_id:
            est_ids = ApoderadoApiService.get_estudiante_ids_for_apoderado(request.user)
            if int(estudiante_id) not in est_ids:
                return JsonResponse({'success': False, 'error': 'Estudiante no autorizado'}, status=403)
            estudiante = ApoderadoApiService.get_estudiante_or_none(int(estudiante_id), rbd)

        firma = ApoderadoApiService.firmar_documento(
            apoderado=apoderado,
            tipo_documento=tipo_documento,
            titulo=titulo,
            contenido=contenido,
            ip_address=ip_address,
            user_agent=user_agent,
            estudiante=estudiante,
        )

        return JsonResponse({
            'success': True,
            'message': 'Documento firmado correctamente',
            'firma_id': firma.id,
        })

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'JSON inválido'}, status=400)
    except Exception:
        logger.exception('Error firmando documento')
        return JsonResponse({'success': False, 'error': 'Error interno del servidor'}, status=500)
