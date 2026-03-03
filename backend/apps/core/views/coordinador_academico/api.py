import json
import logging
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_http_methods

from backend.apps.academico.models import Planificacion
from backend.common.services.policy_service import PolicyService

logger = logging.getLogger(__name__)


def _get_rbd(request):
    return getattr(request.user, 'rbd_colegio', None)


@login_required
@require_http_methods(['POST'])
def actualizar_estado_planificacion(request, planificacion_id):
    """Actualiza el estado de una planificación (Aprobada/Rechazada)."""
    rbd = _get_rbd(request)
    if not rbd:
        return JsonResponse({'success': False, 'error': 'Sin colegio asignado'}, status=400)

    # Permiso para revisar/aprobar planificaciones (capability canónica)
    if not PolicyService.has_capability(request.user, 'PLANNING_APPROVE', school_id=rbd):
        return JsonResponse({'success': False, 'error': 'Sin permisos para revisar planificaciones'}, status=403)

    try:
        body = json.loads(request.body)
        nuevo_estado = body.get('estado', '').upper()
        observaciones = body.get('observaciones', '').strip()

        estados_validos = {'APROBADA', 'RECHAZADA'}
        if nuevo_estado not in estados_validos:
            return JsonResponse({'success': False, 'error': 'Estado inválido'}, status=400)

        planificacion = Planificacion.objects.get(id_planificacion=planificacion_id, colegio_id=rbd)

        planificacion.estado = nuevo_estado
        planificacion.observaciones_coordinador = observaciones
        planificacion.aprobado_por = request.user
        planificacion.fecha_aprobacion = timezone.now()
        planificacion.save(update_fields=['estado', 'observaciones_coordinador', 'aprobado_por', 'fecha_aprobacion'])

        return JsonResponse({
            'success': True,
            'message': f'Planificación {nuevo_estado} correctamente',
        })

    except Planificacion.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Planificación no encontrada'}, status=404)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'JSON inválido'}, status=400)
    except Exception:
        logger.exception('Error actualizando estado de planificación')
        return JsonResponse({'success': False, 'error': 'Error interno del servidor'}, status=500)
