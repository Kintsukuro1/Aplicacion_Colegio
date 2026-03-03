"""
API endpoints para Soporte Técnico Escolar.
- Crear tickets de soporte
- Actualizar estado / resolver tickets
"""
import json
import logging

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_http_methods

from backend.apps.core.models_nuevos_roles import TicketSoporte
from backend.common.services.policy_service import PolicyService

logger = logging.getLogger(__name__)


def _get_rbd(request):
    return getattr(request.user, 'rbd_colegio', None)


@login_required
@require_http_methods(['POST'])
def crear_ticket(request):
    """Crea un nuevo ticket de soporte."""
    rbd = _get_rbd(request)
    if not rbd:
        return JsonResponse({'success': False, 'error': 'Sin colegio asignado'}, status=400)

    if not PolicyService.has_capability(request.user, 'SUPPORT_CREATE_TICKET', school_id=rbd):
        return JsonResponse({'success': False, 'error': 'Sin permisos para crear tickets'}, status=403)

    try:
        body = json.loads(request.body)
        titulo = (body.get('titulo') or '').strip()
        descripcion = (body.get('descripcion') or '').strip()
        categoria = body.get('categoria', 'OTRO')
        prioridad = body.get('prioridad', 'MEDIA')

        if not titulo:
            return JsonResponse({'success': False, 'error': 'El título es obligatorio'}, status=400)
        if not descripcion:
            return JsonResponse({'success': False, 'error': 'La descripción es obligatoria'}, status=400)

        categorias_validas = {'ACCESO', 'PLATAFORMA', 'CONTRASEÑA', 'OTRO'}
        prioridades_validas = {'BAJA', 'MEDIA', 'ALTA', 'URGENTE'}

        if categoria not in categorias_validas:
            categoria = 'OTRO'
        if prioridad not in prioridades_validas:
            prioridad = 'MEDIA'

        ticket = TicketSoporte.objects.create(
            colegio_id=rbd,
            reportado_por=request.user,
            asignado_a=request.user,
            titulo=titulo,
            descripcion=descripcion,
            categoria=categoria,
            prioridad=prioridad,
            estado='ABIERTO',
        )

        return JsonResponse({
            'success': True,
            'message': 'Ticket creado correctamente',
            'id': ticket.id_ticket,
        })

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'JSON inválido'}, status=400)
    except Exception:
        logger.exception('Error creando ticket')
        return JsonResponse({'success': False, 'error': 'Error interno del servidor'}, status=500)


@login_required
@require_http_methods(['POST'])
def reset_password(request, user_id):
    """Restablecer la contraseña de un usuario."""
    from backend.apps.accounts.models import User
    
    rbd = _get_rbd(request)
    if not rbd:
        return JsonResponse({'success': False, 'error': 'Sin colegio asignado'}, status=400)

    # Assuming SUPPORT_RESOLVE_TICKET or similar capability to reset passwords, could map to USER_EDIT or MANAGE_USERS too.
    if not PolicyService.has_capability(request.user, 'SUPPORT_RESOLVE_TICKET', school_id=rbd):
        return JsonResponse({'success': False, 'error': 'Sin permisos para gestionar usuarios'}, status=403)

    try:
        body = json.loads(request.body)
        new_password = (body.get('new_password') or '').strip()
        
        if not new_password:
            return JsonResponse({'success': False, 'error': 'La nueva contraseña es obligatoria'}, status=400)
        if len(new_password) < 12:
            return JsonResponse({'success': False, 'error': 'La nueva contraseña debe tener al menos 12 caracteres'}, status=400)

        target_user = User.objects.get(id=user_id, rbd_colegio=rbd)
        
        target_user.set_password(new_password)
        target_user.save()

        return JsonResponse({
            'success': True,
            'message': 'Contraseña restablecida correctamente',
        })

    except User.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Usuario no encontrado'}, status=404)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'JSON inválido'}, status=400)
    except Exception:
        logger.exception('Error restableciendo contraseña')
        return JsonResponse({'success': False, 'error': 'Error interno'}, status=500)


@login_required
@require_http_methods(['POST'])
def actualizar_ticket(request, ticket_id):
    """Actualiza el estado o resolucion de un ticket."""
    rbd = _get_rbd(request)
    if not rbd:
        return JsonResponse({'success': False, 'error': 'Sin colegio asignado'}, status=400)

    if not PolicyService.has_capability(request.user, 'SUPPORT_RESOLVE_TICKET', school_id=rbd):
        return JsonResponse({'success': False, 'error': 'Sin permisos para gestionar tickets'}, status=403)

    try:
        body = json.loads(request.body)
        nuevo_estado = body.get('estado', '').upper()
        estados_validos = {'ABIERTO', 'EN_PROGRESO', 'RESUELTO', 'CERRADO'}

        if nuevo_estado not in estados_validos:
            return JsonResponse({'success': False, 'error': 'Estado inválido'}, status=400)

        try:
            ticket = TicketSoporte.objects.get(id_ticket=ticket_id, colegio_id=rbd)
        except TicketSoporte.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Ticket no encontrado'}, status=404)

        ticket.estado = nuevo_estado
        fields = ['estado']

        resolucion = body.get('resolucion', '')
        if resolucion:
            ticket.resolucion = resolucion
            fields.append('resolucion')

        if nuevo_estado in ('RESUELTO', 'CERRADO'):
            ticket.fecha_resolucion = timezone.now()
            fields.append('fecha_resolucion')
            if not ticket.asignado_a:
                ticket.asignado_a = request.user
                fields.append('asignado_a')

        ticket.save(update_fields=fields)

        return JsonResponse({
            'success': True,
            'message': f'Ticket actualizado a "{ticket.get_estado_display()}"',
        })

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'JSON inválido'}, status=400)
    except Exception:
        logger.exception('Error actualizando ticket')
        return JsonResponse({'success': False, 'error': 'Error interno del servidor'}, status=500)
