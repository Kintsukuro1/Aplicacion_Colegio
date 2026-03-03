"""
API endpoints para Bibliotecario Digital.
- Crear / publicar recursos digitales
- Gestionar préstamos de recursos (crear, registrar devolución)
"""
import json
import logging
from datetime import date, timedelta

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from backend.apps.accounts.models import User
from backend.apps.core.models_nuevos_roles import PrestamoRecurso, RecursoDigital
from backend.common.services.policy_service import PolicyService

logger = logging.getLogger(__name__)


def _get_rbd(request):
    return getattr(request.user, 'rbd_colegio', None)


@login_required
@require_http_methods(['GET'])
def listar_recursos(request):
    """Lista recursos del colegio para selectores de préstamo."""
    rbd = _get_rbd(request)
    if not rbd:
        return JsonResponse({'success': False, 'error': 'Sin colegio asignado'}, status=400)

    if not PolicyService.has_capability(request.user, 'LIBRARY_VIEW', school_id=rbd):
        return JsonResponse({'success': False, 'error': 'Sin permisos'}, status=403)

    try:
        recursos = RecursoDigital.objects.filter(
            colegio_id=rbd,
            publicado=True,
        ).values('id_recurso', 'titulo', 'tipo').order_by('titulo')

        data = [
            {'id': r['id_recurso'], 'titulo': r['titulo'], 'tipo': r['tipo']}
            for r in recursos
        ]
        return JsonResponse({'success': True, 'recursos': data})
    except Exception:
        logger.exception('Error listando recursos')
        return JsonResponse({'success': False, 'error': 'Error interno del servidor'}, status=500)


@login_required
@require_http_methods(['GET'])
def listar_usuarios(request):
    """Lista usuarios del colegio para préstamos."""
    rbd = _get_rbd(request)
    if not rbd:
        return JsonResponse({'success': False, 'error': 'Sin colegio asignado'}, status=400)

    if not PolicyService.has_capability(request.user, 'LIBRARY_MANAGE_LOANS', school_id=rbd):
        return JsonResponse({'success': False, 'error': 'Sin permisos'}, status=403)

    try:
        usuarios = User.objects.filter(
            colegio_id=rbd,
            is_active=True,
        ).values('id', 'nombre', 'apellido_paterno', 'apellido_materno').order_by('apellido_paterno', 'nombre')

        data = [
            {
                'id': u['id'],
                'nombre': (
                    f"{u['nombre']} {u['apellido_paterno']} {u.get('apellido_materno') or ''}"
                ).strip(),
            }
            for u in usuarios
        ]
        return JsonResponse({'success': True, 'usuarios': data})
    except Exception:
        logger.exception('Error listando usuarios')
        return JsonResponse({'success': False, 'error': 'Error interno del servidor'}, status=500)


@login_required
@require_http_methods(['POST'])
def crear_recurso(request):
    """Crea un nuevo recurso digital en el catálogo."""
    rbd = _get_rbd(request)
    if not rbd:
        return JsonResponse({'success': False, 'error': 'Sin colegio asignado'}, status=400)

    if not PolicyService.has_capability(request.user, 'LIBRARY_CREATE', school_id=rbd):
        return JsonResponse({'success': False, 'error': 'Sin permisos para crear recursos'}, status=403)

    try:
        body = json.loads(request.body)
        titulo = (body.get('titulo') or '').strip()
        descripcion = (body.get('descripcion') or '').strip()
        tipo = body.get('tipo', 'DOCUMENTO')
        url_externa = (body.get('url_externa') or '').strip()
        publicado = bool(body.get('publicado', False))
        es_plan_lector = bool(body.get('es_plan_lector', False))

        if not titulo:
            return JsonResponse({'success': False, 'error': 'El título es obligatorio'}, status=400)

        tipos_validos = {'LIBRO', 'VIDEO', 'DOCUMENTO', 'ENLACE', 'SOFTWARE', 'MATERIAL_CRA'}
        if tipo not in tipos_validos:
            tipo = 'DOCUMENTO'

        recurso = RecursoDigital.objects.create(
            colegio_id=rbd,
            titulo=titulo,
            descripcion=descripcion,
            tipo=tipo,
            url_externa=url_externa,
            publicado=publicado,
            es_plan_lector=es_plan_lector,
            publicado_por=request.user,
        )

        return JsonResponse({
            'success': True,
            'message': 'Recurso creado correctamente',
            'id': recurso.id_recurso,
        })

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'JSON inválido'}, status=400)
    except Exception:
        logger.exception('Error creando recurso')
        return JsonResponse({'success': False, 'error': 'Error interno del servidor'}, status=500)


@login_required
@require_http_methods(['POST'])
def toggle_publicar_recurso(request, recurso_id):
    """Activa/desactiva la publicación de un recurso."""
    rbd = _get_rbd(request)
    if not rbd:
        return JsonResponse({'success': False, 'error': 'Sin colegio asignado'}, status=400)

    if not PolicyService.has_capability(request.user, 'LIBRARY_EDIT', school_id=rbd):
        return JsonResponse({'success': False, 'error': 'Sin permisos para editar recursos'}, status=403)

    try:
        recurso = RecursoDigital.objects.get(id_recurso=recurso_id, colegio_id=rbd)
    except RecursoDigital.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Recurso no encontrado'}, status=404)

    recurso.publicado = not recurso.publicado
    recurso.save(update_fields=['publicado'])

    estado = 'publicado' if recurso.publicado else 'despublicado'
    return JsonResponse({
        'success': True,
        'message': f'Recurso {estado} correctamente',
        'publicado': recurso.publicado,
    })


@login_required
@require_http_methods(['POST'])
def crear_prestamo(request):
    """Registra un nuevo préstamo de recurso."""
    rbd = _get_rbd(request)
    if not rbd:
        return JsonResponse({'success': False, 'error': 'Sin colegio asignado'}, status=400)

    if not PolicyService.has_capability(request.user, 'LIBRARY_MANAGE_LOANS', school_id=rbd):
        return JsonResponse({'success': False, 'error': 'Sin permisos para gestionar préstamos'}, status=403)

    try:
        body = json.loads(request.body)
        recurso_id = body.get('recurso_id')
        usuario_id = body.get('usuario_id')
        dias = int(body.get('dias_prestamo', 14))
        fecha_devolucion = body.get('fecha_devolucion_esperada') or str(date.today() + timedelta(days=dias))

        if not recurso_id:
            return JsonResponse({'success': False, 'error': 'Debe seleccionar un recurso'}, status=400)
        if not usuario_id:
            return JsonResponse({'success': False, 'error': 'Debe seleccionar un usuario'}, status=400)

        try:
            recurso = RecursoDigital.objects.get(id_recurso=recurso_id, colegio_id=rbd)
        except RecursoDigital.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Recurso no encontrado'}, status=404)

        try:
            usuario = User.objects.get(id=usuario_id, colegio_id=rbd)
        except User.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Usuario no encontrado'}, status=404)

        prestamo = PrestamoRecurso.objects.create(
            recurso=recurso,
            usuario=usuario,
            colegio_id=rbd,
            fecha_devolucion_esperada=fecha_devolucion,
            estado='ACTIVO',
        )

        return JsonResponse({
            'success': True,
            'message': 'Préstamo registrado correctamente',
            'id': prestamo.id_prestamo,
        })

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'JSON inválido'}, status=400)
    except Exception:
        logger.exception('Error creando préstamo')
        return JsonResponse({'success': False, 'error': 'Error interno del servidor'}, status=500)


@login_required
@require_http_methods(['POST'])
def registrar_devolucion(request, prestamo_id):
    """Registra la devolución de un recurso prestado."""
    rbd = _get_rbd(request)
    if not rbd:
        return JsonResponse({'success': False, 'error': 'Sin colegio asignado'}, status=400)

    if not PolicyService.has_capability(request.user, 'LIBRARY_MANAGE_LOANS', school_id=rbd):
        return JsonResponse({'success': False, 'error': 'Sin permisos para gestionar préstamos'}, status=403)

    try:
        prestamo = PrestamoRecurso.objects.get(id_prestamo=prestamo_id, colegio_id=rbd)
    except PrestamoRecurso.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Préstamo no encontrado'}, status=404)

    if prestamo.estado == 'DEVUELTO':
        return JsonResponse({'success': False, 'error': 'Este préstamo ya fue devuelto'}, status=400)

    prestamo.estado = 'DEVUELTO'
    prestamo.fecha_devolucion_real = date.today()
    prestamo.save(update_fields=['estado', 'fecha_devolucion_real'])

    return JsonResponse({
        'success': True,
        'message': 'Devolución registrada correctamente',
    })
