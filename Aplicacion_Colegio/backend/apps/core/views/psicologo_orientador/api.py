"""
API endpoints para Psicólogo Orientador.
- Crear entrevistas de orientación
- Crear / actualizar derivaciones externas
"""
import json
import logging
from datetime import date

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from backend.apps.core.services.psicologo_orientador_api_service import PsicologoOrientadorApiService
from backend.apps.core.views.school_context import resolve_request_rbd
from backend.common.services.policy_service import PolicyService
from backend.common.utils.view_auth import jwt_or_session_auth_required

logger = logging.getLogger(__name__)


def _get_rbd(request):
    return resolve_request_rbd(request)


@jwt_or_session_auth_required
@require_http_methods(['GET'])
def listar_estudiantes(request):
    """Retorna lista de estudiantes del colegio para selectores."""
    rbd = _get_rbd(request)
    if not rbd:
        return JsonResponse({'success': False, 'error': 'Sin colegio asignado'}, status=400)

    if not PolicyService.has_capability(request.user, 'STUDENT_VIEW', school_id=rbd):
        return JsonResponse({'success': False, 'error': 'Sin permisos'}, status=403)

    try:
        data = PsicologoOrientadorApiService.list_estudiantes(rbd)
        return JsonResponse({'success': True, 'estudiantes': data})
    except Exception:
        logger.exception('Error listando estudiantes')
        return JsonResponse({'success': False, 'error': 'Error interno del servidor'}, status=500)


@jwt_or_session_auth_required
@require_http_methods(['POST'])
def crear_entrevista(request):
    """Crea una nueva entrevista de orientación."""
    rbd = _get_rbd(request)
    if not rbd:
        return JsonResponse({'success': False, 'error': 'Sin colegio asignado'}, status=400)

    if not PolicyService.has_capability(request.user, 'COUNSELING_CREATE', school_id=rbd):
        return JsonResponse({'success': False, 'error': 'Sin permisos para registrar entrevistas'}, status=403)

    try:
        body = json.loads(request.body)
        estudiante_id = body.get('estudiante_id')
        fecha = body.get('fecha')
        motivo = body.get('motivo', 'ACADEMICO')
        observaciones = (body.get('observaciones') or '').strip()
        acuerdos = (body.get('acuerdos') or '').strip()
        seguimiento = bool(body.get('seguimiento_requerido', False))
        fecha_siguiente = body.get('fecha_siguiente_sesion') or None

        if not estudiante_id:
            return JsonResponse({'success': False, 'error': 'Debe seleccionar un estudiante'}, status=400)
        if not fecha:
            return JsonResponse({'success': False, 'error': 'La fecha es obligatoria'}, status=400)
        if not observaciones:
            return JsonResponse({'success': False, 'error': 'Las observaciones son obligatorias'}, status=400)

        try:
            estudiante = PsicologoOrientadorApiService.get_estudiante_or_none(int(estudiante_id), rbd)
        except (ValueError, TypeError):
            estudiante = None
        if not estudiante:
            return JsonResponse({'success': False, 'error': 'Estudiante no encontrado'}, status=404)

        entrevista = PsicologoOrientadorApiService.crear_entrevista(
            estudiante=estudiante,
            rbd=rbd,
            psicologo=request.user,
            fecha=fecha,
            motivo=motivo,
            observaciones=observaciones,
            acuerdos=acuerdos,
            seguimiento=seguimiento,
            fecha_siguiente=fecha_siguiente,
        )

        return JsonResponse({
            'success': True,
            'message': 'Entrevista registrada correctamente',
            'id': entrevista.id_entrevista,
        })

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'JSON inválido'}, status=400)
    except Exception:
        logger.exception('Error creando entrevista')
        return JsonResponse({'success': False, 'error': 'Error interno del servidor'}, status=500)


@jwt_or_session_auth_required
@require_http_methods(['POST'])
def crear_derivacion(request):
    """Crea una nueva derivación externa."""
    rbd = _get_rbd(request)
    if not rbd:
        return JsonResponse({'success': False, 'error': 'Sin colegio asignado'}, status=400)

    if not PolicyService.has_capability(request.user, 'REFERRAL_CREATE', school_id=rbd):
        return JsonResponse({'success': False, 'error': 'Sin permisos para crear derivaciones'}, status=403)

    try:
        body = json.loads(request.body)
        estudiante_id = body.get('estudiante_id')
        profesional = (body.get('profesional_destino') or '').strip()
        especialidad = (body.get('especialidad') or '').strip()
        motivo = (body.get('motivo') or '').strip()
        fecha_derivacion = body.get('fecha_derivacion') or str(date.today())

        if not estudiante_id:
            return JsonResponse({'success': False, 'error': 'Debe seleccionar un estudiante'}, status=400)
        if not profesional:
            return JsonResponse({'success': False, 'error': 'El profesional de destino es obligatorio'}, status=400)
        if not especialidad:
            return JsonResponse({'success': False, 'error': 'La especialidad es obligatoria'}, status=400)
        if not motivo:
            return JsonResponse({'success': False, 'error': 'El motivo es obligatorio'}, status=400)

        try:
            estudiante = PsicologoOrientadorApiService.get_estudiante_or_none(int(estudiante_id), rbd)
        except (ValueError, TypeError):
            estudiante = None
        if not estudiante:
            return JsonResponse({'success': False, 'error': 'Estudiante no encontrado'}, status=404)

        derivacion = PsicologoOrientadorApiService.crear_derivacion(
            estudiante=estudiante,
            rbd=rbd,
            derivado_por=request.user,
            profesional=profesional,
            especialidad=especialidad,
            motivo=motivo,
            fecha_derivacion=fecha_derivacion,
        )

        return JsonResponse({
            'success': True,
            'message': 'Derivación registrada correctamente',
            'id': derivacion.id_derivacion,
        })

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'JSON inválido'}, status=400)
    except Exception:
        logger.exception('Error creando derivación')
        return JsonResponse({'success': False, 'error': 'Error interno del servidor'}, status=500)


@jwt_or_session_auth_required
@require_http_methods(['POST'])
def actualizar_derivacion(request, derivacion_id):
    """Actualiza el estado de una derivación."""
    rbd = _get_rbd(request)
    if not rbd:
        return JsonResponse({'success': False, 'error': 'Sin colegio asignado'}, status=400)

    if not PolicyService.has_capability(request.user, 'REFERRAL_EDIT', school_id=rbd):
        return JsonResponse({'success': False, 'error': 'Sin permisos para editar derivaciones'}, status=403)

    try:
        body = json.loads(request.body)
        nuevo_estado = body.get('estado', '').upper()
        estados_validos = {'PENDIENTE', 'EN_PROCESO', 'COMPLETADA', 'CANCELADA'}

        if nuevo_estado not in estados_validos:
            return JsonResponse({'success': False, 'error': 'Estado inválido'}, status=400)

        derivacion = PsicologoOrientadorApiService.get_derivacion_or_none(derivacion_id, rbd)
        if not derivacion:
            return JsonResponse({'success': False, 'error': 'Derivación no encontrada'}, status=404)

        PsicologoOrientadorApiService.actualizar_derivacion(
            derivacion,
            nuevo_estado=nuevo_estado,
            informe=body.get('informe_retorno', ''),
            fecha_retorno=body.get('fecha_retorno'),
        )

        return JsonResponse({
            'success': True,
            'message': 'Derivación actualizada correctamente',
        })

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'JSON inválido'}, status=400)
    except Exception:
        logger.exception('Error actualizando derivación')
        return JsonResponse({'success': False, 'error': 'Error interno del servidor'}, status=500)


@jwt_or_session_auth_required
@require_http_methods(['POST'])
def toggle_pie_status(request, estudiante_id):
    """Activar/Desactivar estado PIE del estudiante."""
    rbd = _get_rbd(request)
    if not rbd:
        return JsonResponse({'success': False, 'error': 'Sin colegio asignado'}, status=400)

    if not PolicyService.has_capability(request.user, 'COUNSELING_CREATE', school_id=rbd):
        return JsonResponse({'success': False, 'error': 'Sin permisos'}, status=403)

    try:
        estudiante = PsicologoOrientadorApiService.get_estudiante_or_none(
            int(estudiante_id), rbd, require_student_role=True
        )
        if not estudiante:
            return JsonResponse({'success': False, 'error': 'Estudiante no encontrado'}, status=404)

        body = json.loads(request.body)
        requiere_pie = bool(body.get('requiere_pie', False))

        perfil = PsicologoOrientadorApiService.toggle_pie_status(estudiante, requiere_pie=requiere_pie)

        return JsonResponse({
            'success': True,
            'message': 'Estado PIE actualizado correctamente',
            'requiere_pie': perfil.requiere_pie,
        })

    except Exception:
        logger.exception('Error actualizando PIE')
        return JsonResponse({'success': False, 'error': 'Error interno'}, status=500)
