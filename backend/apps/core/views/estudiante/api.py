from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required
from backend.apps.academico.models import EntregaTarea, Tarea
from backend.common.services.policy_service import PolicyService
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

@login_required
@require_POST
def entregar_tarea(request):
    """
    Subir una entrega de tarea para el estudiante activo.
    """
    try:
        # Check permissions
        is_estudiante = PolicyService.evaluate('ESTUDIANTE_REQUIRED', request.user)
        if not is_estudiante:
            return JsonResponse({'success': False, 'error': 'No tienes permisos de estudiante'}, status=403)

        tarea_id = request.POST.get('tarea_id')
        comentario = request.POST.get('comentario', '')
        archivo = request.FILES.get('archivo')

        if not tarea_id or not archivo:
            return JsonResponse({'success': False, 'error': 'Faltan datos obligatorios'}, status=400)

        tarea = Tarea.objects.filter(id_tarea=tarea_id, activa=True).first()
        if not tarea:
            return JsonResponse({'success': False, 'error': 'Tarea no encontrada'}, status=404)

        # Check if already delivered
        entrega_existente = EntregaTarea.objects.filter(tarea=tarea, estudiante=request.user).first()
        if entrega_existente:
            entrega_existente.archivo = archivo
            entrega_existente.comentarios_estudiante = comentario
            entrega_existente.fecha_entrega = timezone.now()
            # If it was returned or pending review, reset state
            if entrega_existente.estado in ['pendiente', 'devuelta']:
                entrega_existente.estado = 'pendiente'
            entrega_existente.save()
        else:
            # Create new delivery
            EntregaTarea.objects.create(
                tarea=tarea,
                estudiante=request.user,
                archivo=archivo,
                comentarios_estudiante=comentario,
                estado='pendiente'
            )

        return JsonResponse({'success': True, 'mensaje': 'Tarea entregada exitosamente'})

    except Exception as e:
        logger.error(f"Error al entregar tarea: {str(e)}")
        return JsonResponse({'success': False, 'error': 'Ocurrió un error al procesar la entrega'}, status=500)
