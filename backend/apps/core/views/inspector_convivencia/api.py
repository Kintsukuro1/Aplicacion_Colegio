"""
API endpoints para Inspector de Convivencia.
- Crear/listar anotaciones de convivencia
- Aprobar/rechazar justificativos de inasistencia
"""
import json
import logging

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_http_methods

from backend.apps.accounts.models import User
from backend.apps.core.models_nuevos_roles import AnotacionConvivencia, JustificativoInasistencia
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
            colegio_id=rbd,
            role__nombre__in=['Alumno', 'Estudiante'],
            is_active=True,
        ).values('id', 'nombre', 'apellido_paterno', 'apellido_materno', 'rut').order_by('apellido_paterno', 'nombre')

        data = [
            {
                'id': e['id'],
                'nombre': (
                    f"{e['nombre']} {e['apellido_paterno']} {e.get('apellido_materno') or ''}"
                ).strip(),
                'rut': e['rut'] or '',
            }
            for e in estudiantes
        ]
        return JsonResponse({'success': True, 'estudiantes': data})
    except Exception:
        logger.exception('Error listando estudiantes')
        return JsonResponse({'success': False, 'error': 'Error interno del servidor'}, status=500)


@login_required
@require_http_methods(['POST'])
def crear_anotacion(request):
    """Crea una nueva anotación de convivencia."""
    rbd = _get_rbd(request)
    if not rbd:
        return JsonResponse({'success': False, 'error': 'Sin colegio asignado'}, status=400)

    if not PolicyService.has_capability(request.user, 'DISCIPLINE_CREATE', school_id=rbd):
        return JsonResponse({'success': False, 'error': 'Sin permisos para crear anotaciones'}, status=403)

    try:
        body = json.loads(request.body)
        estudiante_id = body.get('estudiante_id')
        tipo = body.get('tipo', 'NEUTRA')
        categoria = body.get('categoria', 'OTRO')
        descripcion = (body.get('descripcion') or '').strip()
        gravedad = int(body.get('gravedad', 1))

        if not estudiante_id:
            return JsonResponse({'success': False, 'error': 'Debe seleccionar un estudiante'}, status=400)
        if not descripcion:
            return JsonResponse({'success': False, 'error': 'La descripción es obligatoria'}, status=400)

        try:
            estudiante = User.objects.get(id=estudiante_id, colegio_id=rbd)
        except User.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Estudiante no encontrado'}, status=404)

        anotacion = AnotacionConvivencia.objects.create(
            estudiante=estudiante,
            colegio_id=rbd,
            tipo=tipo,
            categoria=categoria,
            descripcion=descripcion,
            gravedad=gravedad,
            registrado_por=request.user,
        )

        return JsonResponse({
            'success': True,
            'message': 'Anotación registrada correctamente',
            'id': anotacion.id_anotacion,
        })

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'JSON inválido'}, status=400)
    except Exception:
        logger.exception('Error creando anotación')
        return JsonResponse({'success': False, 'error': 'Error interno del servidor'}, status=500)


@login_required
@require_http_methods(['POST'])
def actualizar_justificativo(request, justificativo_id):
    """Aprueba o rechaza un justificativo de inasistencia."""
    rbd = _get_rbd(request)
    if not rbd:
        return JsonResponse({'success': False, 'error': 'Sin colegio asignado'}, status=400)

    if not PolicyService.has_capability(request.user, 'JUSTIFICATION_APPROVE', school_id=rbd):
        return JsonResponse({'success': False, 'error': 'Sin permisos para aprobar justificativos'}, status=403)

    try:
        body = json.loads(request.body)
        nuevo_estado = body.get('estado', '').upper()

        if nuevo_estado not in ('APROBADO', 'RECHAZADO'):
            return JsonResponse({'success': False, 'error': 'Estado inválido'}, status=400)

        try:
            justificativo = JustificativoInasistencia.objects.get(id_justificativo=justificativo_id, colegio_id=rbd)
        except JustificativoInasistencia.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Justificativo no encontrado'}, status=404)

        if justificativo.estado != 'PENDIENTE':
            return JsonResponse(
                {'success': False, 'error': 'Solo se pueden revisar justificativos pendientes'},
                status=400,
            )

        justificativo.estado = nuevo_estado
        justificativo.revisado_por = request.user
        justificativo.fecha_revision = timezone.now()
        justificativo.observaciones_revision = body.get('observaciones', '')
        justificativo.save(update_fields=['estado', 'revisado_por', 'fecha_revision', 'observaciones_revision'])

        return JsonResponse({
            'success': True,
            'message': f'Justificativo {nuevo_estado.lower()} correctamente',
        })

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'JSON inválido'}, status=400)
    except Exception:
        logger.exception('Error actualizando justificativo')
        return JsonResponse({'success': False, 'error': 'Error interno del servidor'}, status=500)


@login_required
@require_http_methods(['POST'])
def registrar_atraso(request):
    """Registra un atraso ('T' - Tardanza) para un estudiante en una clase específica."""
    rbd = _get_rbd(request)
    if not rbd:
        return JsonResponse({'success': False, 'error': 'Sin colegio asignado'}, status=400)

    if not PolicyService.has_capability(request.user, 'DISCIPLINE_CREATE', school_id=rbd):
        return JsonResponse({'success': False, 'error': 'Sin permisos para registro de atrasos'}, status=403)

    try:
        body = json.loads(request.body)
        estudiante_id = body.get('estudiante_id')
        clase_id = body.get('clase_id')
        fecha = body.get('fecha')
        observaciones = body.get('observaciones', '').strip()

        if not estudiante_id or not clase_id or not fecha:
            return JsonResponse({'success': False, 'error': 'Debe seleccionar estudiante, clase y fecha'}, status=400)

        try:
            estudiante = User.objects.get(id=estudiante_id, colegio_id=rbd)
            # Avoid direct imports at the top to prevent circular imports if not needed, or just import here
            from backend.apps.cursos.models import Clase
            clase = Clase.objects.get(id=clase_id, curso__colegio_id=rbd)
        except (User.DoesNotExist, Clase.DoesNotExist):
            return JsonResponse({'success': False, 'error': 'Estudiante o clase no encontrado'}, status=404)

        from backend.apps.academico.models import Asistencia
        # Create or update existing attendance record to T (Tardanza)
        asistencia, created = Asistencia.objects.update_or_create(
            colegio_id=rbd,
            clase=clase,
            estudiante=estudiante,
            fecha=fecha,
            defaults={
                'estado': 'T',
                'tipo_asistencia': 'Presencial',
                'observaciones': observaciones
            }
        )

        return JsonResponse({
            'success': True,
            'message': 'Atraso registrado correctamente',
            'id': asistencia.id_asistencia,
        })

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'JSON inválido'}, status=400)
    except Exception:
        logger.exception('Error registrando atraso')
        return JsonResponse({'success': False, 'error': 'Error interno del servidor'}, status=500)
