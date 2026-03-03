"""
API endpoints para Apoderado.
- Crear/listar justificativos de inasistencia
- Listar/firmar documentos pendientes
"""
import json
import logging

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from backend.apps.core.models_nuevos_roles import JustificativoInasistencia
from backend.apps.accounts.models import FirmaDigitalApoderado
from backend.common.services.policy_service import PolicyService

logger = logging.getLogger(__name__)


def _get_rbd(request):
    return getattr(request.user, 'rbd_colegio', None)


def _get_estudiantes_apoderado(user):
    """Retorna IDs de estudiantes vinculados al apoderado."""
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


@login_required
@require_http_methods(['GET'])
def listar_justificativos(request):
    """Lista los justificativos presentados por el apoderado."""
    rbd = _get_rbd(request)
    if not rbd:
        return JsonResponse({'success': False, 'error': 'Sin colegio asignado'}, status=400)

    try:
        est_ids = _get_estudiantes_apoderado(request.user)
        justificativos = JustificativoInasistencia.objects.filter(
            presentado_por=request.user,
            colegio_id=rbd,
        ).select_related('estudiante').order_by('-fecha_creacion')

        data = []
        for j in justificativos:
            data.append({
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

        return JsonResponse({'success': True, 'justificativos': data})
    except Exception:
        logger.exception('Error listando justificativos')
        return JsonResponse({'success': False, 'error': 'Error interno del servidor'}, status=500)


@login_required
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

        # Validaciones
        if not estudiante_id:
            return JsonResponse({'success': False, 'error': 'Debe seleccionar un estudiante'}, status=400)
        if not motivo:
            return JsonResponse({'success': False, 'error': 'El motivo es obligatorio'}, status=400)
        if not fecha_ausencia:
            return JsonResponse({'success': False, 'error': 'La fecha de ausencia es obligatoria'}, status=400)

        # Verificar que el estudiante pertenece al apoderado
        est_ids = _get_estudiantes_apoderado(request.user)
        if int(estudiante_id) not in est_ids:
            return JsonResponse({'success': False, 'error': 'Estudiante no autorizado'}, status=403)

        from backend.apps.accounts.models import User
        try:
            estudiante = User.objects.get(id=estudiante_id, colegio_id=rbd)
        except User.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Estudiante no encontrado'}, status=404)

        justificativo = JustificativoInasistencia.objects.create(
            estudiante=estudiante,
            colegio_id=rbd,
            fecha_ausencia=fecha_ausencia,
            fecha_fin_ausencia=fecha_fin_ausencia,
            motivo=motivo,
            tipo=tipo,
            documento_adjunto=documento,
            presentado_por=request.user,
        )

        return JsonResponse({
            'success': True,
            'message': 'Justificativo enviado correctamente',
            'id': justificativo.id_justificativo,
        })

    except Exception:
        logger.exception('Error creando justificativo')
        return JsonResponse({'success': False, 'error': 'Error interno del servidor'}, status=500)


@login_required
@require_http_methods(['GET'])
def listar_documentos_firma(request):
    """Lista documentos pendientes y firmados del apoderado."""
    rbd = _get_rbd(request)
    if not rbd:
        return JsonResponse({'success': False, 'error': 'Sin colegio asignado'}, status=400)

    try:
        # Buscar perfil apoderado
        if not hasattr(request.user, 'perfil_apoderado'):
            return JsonResponse({'success': True, 'pendientes': [], 'firmados': []})

        apoderado = request.user.perfil_apoderado

        firmas = FirmaDigitalApoderado.objects.filter(
            apoderado=apoderado,
        ).select_related('estudiante').order_by('-timestamp_firma')

        firmados = []
        for firma in firmas:
            firmados.append({
                'id': firma.id,
                'tipo': firma.get_tipo_documento_display(),
                'titulo': firma.titulo_documento,
                'estudiante': firma.estudiante.get_full_name() if firma.estudiante else '',
                'fecha_firma': firma.timestamp_firma.strftime('%d/%m/%Y %H:%M'),
                'valida': firma.firma_valida,
            })

        return JsonResponse({
            'success': True,
            'pendientes': [],  # TODO: Implement pending document detection
            'firmados': firmados,
        })
    except Exception:
        logger.exception('Error listando documentos de firma')
        return JsonResponse({'success': False, 'error': 'Error interno del servidor'}, status=500)


@login_required
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
            from backend.apps.accounts.models import User
            est_ids = _get_estudiantes_apoderado(request.user)
            if int(estudiante_id) not in est_ids:
                return JsonResponse({'success': False, 'error': 'Estudiante no autorizado'}, status=403)
            estudiante = User.objects.get(id=estudiante_id)

        firma = FirmaDigitalApoderado.crear_firma(
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
