"""
API endpoints para Psicólogo Orientador.
- Crear entrevistas de orientación
- Crear / actualizar derivaciones externas
"""
import json
import logging
from datetime import date

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from backend.apps.accounts.models import User
from backend.apps.core.models_nuevos_roles import DerivacionExterna, EntrevistaOrientacion
from backend.common.services.policy_service import PolicyService

logger = logging.getLogger(__name__)


def _get_rbd(request):
    return getattr(request.user, 'rbd_colegio', None)


@login_required
@require_http_methods(['GET'])
def listar_estudiantes(request):
    """Retorna lista de estudiantes del colegio para selectores."""
    rbd = _get_rbd(request)
    if not rbd:
        return JsonResponse({'success': False, 'error': 'Sin colegio asignado'}, status=400)

    if not PolicyService.has_capability(request.user, 'STUDENT_VIEW', school_id=rbd):
        return JsonResponse({'success': False, 'error': 'Sin permisos'}, status=403)

    try:
        estudiantes = User.objects.filter(
            rbd_colegio=rbd,
            role__nombre__in=['Alumno', 'Estudiante'],
            is_active=True,
        ).values(
            'id',
            'nombre',
            'apellido_paterno',
            'apellido_materno',
        ).order_by('apellido_paterno', 'nombre')

        data = [
            {
                'id': e['id'],
                'nombre': (
                    f"{e['nombre']} {e['apellido_paterno']} {e.get('apellido_materno') or ''}"
                ).strip(),
            }
            for e in estudiantes
        ]
        return JsonResponse({'success': True, 'estudiantes': data})
    except Exception:
        logger.exception('Error listando estudiantes')
        return JsonResponse({'success': False, 'error': 'Error interno del servidor'}, status=500)


@login_required
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
            estudiante = User.objects.get(id=estudiante_id, colegio_id=rbd)
        except User.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Estudiante no encontrado'}, status=404)

        entrevista = EntrevistaOrientacion.objects.create(
            estudiante=estudiante,
            colegio_id=rbd,
            psicologo=request.user,
            fecha=fecha,
            motivo=motivo,
            observaciones=observaciones,
            acuerdos=acuerdos,
            seguimiento_requerido=seguimiento,
            fecha_siguiente_sesion=fecha_siguiente,
            confidencial=True,
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


@login_required
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
            estudiante = User.objects.get(id=estudiante_id, colegio_id=rbd)
        except User.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Estudiante no encontrado'}, status=404)

        derivacion = DerivacionExterna.objects.create(
            estudiante=estudiante,
            colegio_id=rbd,
            derivado_por=request.user,
            profesional_destino=profesional,
            especialidad=especialidad,
            motivo=motivo,
            fecha_derivacion=fecha_derivacion,
            estado='PENDIENTE',
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


@login_required
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

        try:
            derivacion = DerivacionExterna.objects.get(id_derivacion=derivacion_id, colegio_id=rbd)
        except DerivacionExterna.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Derivación no encontrada'}, status=404)

        derivacion.estado = nuevo_estado
        informe = body.get('informe_retorno', '')
        if informe:
            derivacion.informe_retorno = informe
        if nuevo_estado == 'COMPLETADA' and body.get('fecha_retorno'):
            derivacion.fecha_retorno = body['fecha_retorno']
        derivacion.save()

        return JsonResponse({
            'success': True,
            'message': 'Derivación actualizada correctamente',
        })

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'JSON inválido'}, status=400)
    except Exception:
        logger.exception('Error actualizando derivación')
        return JsonResponse({'success': False, 'error': 'Error interno del servidor'}, status=500)


@login_required
@require_http_methods(['POST'])
def toggle_pie_status(request, estudiante_id):
    """Activar/Desactivar estado PIE del estudiante."""
    from backend.apps.accounts.models import PerfilEstudiante

    rbd = _get_rbd(request)
    if not rbd:
        return JsonResponse({'success': False, 'error': 'Sin colegio asignado'}, status=400)

    # Assuming COUNSELING_VIEW o SPECIAL_ED_MANAGE cap, re-using COUNSELING_CREATE for simplicity or adding a general check
    if not PolicyService.has_capability(request.user, 'COUNSELING_CREATE', school_id=rbd):
        return JsonResponse({'success': False, 'error': 'Sin permisos'}, status=403)

    try:
        estudiante = User.objects.get(id=estudiante_id, colegio_id=rbd, role__nombre__in=['Alumno', 'Estudiante'])
        perfil, created = PerfilEstudiante.objects.get_or_create(user=estudiante)
        
        body = json.loads(request.body)
        requiere_pie = bool(body.get('requiere_pie', False))
        
        perfil.requiere_pie = requiere_pie
        perfil.save()

        return JsonResponse({
            'success': True,
            'message': 'Estado PIE actualizado correctamente',
            'requiere_pie': perfil.requiere_pie
        })

    except User.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Estudiante no encontrado'}, status=404)
    except Exception:
        logger.exception('Error actualizando PIE')
        return JsonResponse({'success': False, 'error': 'Error interno'}, status=500)
