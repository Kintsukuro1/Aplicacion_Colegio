"""
Vista para gestión de tareas del profesor
"""
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from backend.apps.cursos.models import Clase
from backend.apps.academico.models import Tarea
from backend.apps.core.services.orm_access_service import ORMAccessService
from backend.common.services.policy_service import PolicyService
from datetime import datetime


def _resolve_sidebar_and_role(user):
    if PolicyService.has_capability(user, 'SYSTEM_ADMIN'):
        return 'sidebars/sidebar_admin.html', 'admin_general'
    if PolicyService.has_capability(user, 'SYSTEM_CONFIGURE'):
        return 'sidebars/sidebar_admin_escuela.html', 'admin_escolar'
    if PolicyService.has_capability(user, 'CLASS_VIEW') and (
        PolicyService.has_capability(user, 'CLASS_EDIT')
        or PolicyService.has_capability(user, 'CLASS_TAKE_ATTENDANCE')
    ):
        return 'sidebars/sidebar_profesor.html', 'profesor'
    return 'sidebars/sidebar_profesor.html', 'profesor'


@login_required
def gestionar_tareas_profesor(request, clase_id):
    """Vista para que el profesor gestione tareas de una clase."""
    try:
        clase = ORMAccessService.get(Clase, id_curso=clase_id)
    except Exception:
        messages.error(request, 'No se encontró la clase solicitada.')
        return redirect('dashboard')
    
    # Verificar que es profesor de esta clase
    if request.user.id != clase.profesor_id:
        messages.error(request, 'No tienes permiso para gestionar tareas de esta clase.')
        return redirect('dashboard')
    
    # Obtener tareas de la clase
    tareas = ORMAccessService.filter(Tarea, clase=clase).order_by('-fecha_creacion')
    
    sidebar_template, rol_nombre = _resolve_sidebar_and_role(request.user)
    
    context = {
        'clase': clase,
        'tareas': tareas,
        'sidebar_template': sidebar_template,
        'content_template': '',
        'rol': rol_nombre,
        'nombre_usuario': request.user.get_full_name(),
        'id_usuario': request.user.id,
        'escuela_rbd': request.user.rbd_colegio,
        'escuela_nombre': request.user.colegio.nombre if hasattr(request.user, 'colegio') and request.user.colegio else 'Sistema',
        'year': datetime.now().year,
        'pagina_actual': 'mis_clases',
    }
    
    return render(request, 'academico/profesor/gestionar_tareas.html', context)


@login_required
def ver_entregas_tarea(request, tarea_id):
    """Vista para ver las entregas de una tarea."""
    try:
        tarea = ORMAccessService.get(Tarea, id_tarea=tarea_id)
    except Exception:
        messages.error(request, 'No se encontró la tarea solicitada.')
        return redirect('dashboard')
    clase = tarea.clase
    
    # Verificar que es profesor de esta clase
    if request.user.id != clase.profesor_id:
        messages.error(request, 'No tienes permiso para ver las entregas de esta tarea.')
        return redirect('dashboard')
    
    # Obtener entregas
    from backend.apps.academico.models import EntregaTarea
    entregas = ORMAccessService.filter(EntregaTarea, tarea=tarea).select_related('estudiante').order_by('-fecha_entrega')
    
    sidebar_template, rol_nombre = _resolve_sidebar_and_role(request.user)
    
    context = {
        'clase': clase,
        'tarea': tarea,
        'entregas': entregas,
        'sidebar_template': sidebar_template,
        'content_template': '',
        'rol': rol_nombre,
        'nombre_usuario': request.user.get_full_name(),
        'id_usuario': request.user.id,
        'escuela_rbd': request.user.rbd_colegio,
        'escuela_nombre': request.user.colegio.nombre if hasattr(request.user, 'colegio') and request.user.colegio else 'Sistema',
        'year': datetime.now().year,
        'pagina_actual': 'mis_clases',
    }
    
    return render(request, 'profesor/entregas_tarea.html', context)
