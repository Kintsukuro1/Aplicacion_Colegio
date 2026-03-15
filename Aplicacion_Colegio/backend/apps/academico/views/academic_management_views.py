"""
Vistas pasarela para gestión académica.
Delegación completa a servicios especializados.
"""
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.contrib import messages
from django.urls import reverse
from datetime import date, datetime

from backend.apps.academico.services.attendance_service import AttendanceService
from backend.apps.academico.services.grades_service import GradesService
from backend.apps.core.views import load_dashboard_context


@login_required
def gestionar_asistencia_profesor(request):
    """Vista pasarela para gestión de asistencia."""
    colegio = getattr(request.user, "colegio", None)
    if colegio is None:
        messages.error(request, "No se pudo determinar el colegio del usuario.")
        return redirect("dashboard")
    
    # Procesar POST - delegar a servicio
    if request.method == 'POST':
        result = AttendanceService.process_attendance_action(request.user, colegio, request.POST)
        if result['success']:
            messages.success(request, result['message'])
        else:
            messages.error(request, result['message'])
        return redirect(f"{reverse('dashboard')}?pagina=asistencia")
    
    # GET - obtener datos del servicio
    classes_data = AttendanceService.get_teacher_classes_data(request.user)
    
    # Aplicar filtros
    filtro_clase_id = request.GET.get('clase_id', '')
    filtro_fecha = request.GET.get('fecha', '')
    
    # Selección automática si no hay filtro
    clases = classes_data['clases']
    if not filtro_clase_id and clases.exists():
        filtro_clase_id = str(clases.first().id)
    if not filtro_fecha:
        filtro_fecha = date.today().strftime('%Y-%m-%d')
    
    # Obtener datos de clase seleccionada
    estudiantes_con_asistencia = []
    stats_clase = {}
    
    if filtro_clase_id:
        try:
            clase = clases.get(id=filtro_clase_id)
            fecha_obj = datetime.strptime(filtro_fecha, '%Y-%m-%d').date()
            
            estudiantes_con_asistencia = AttendanceService.get_students_with_attendance(
                request.user, colegio, clase, fecha_obj
            )
            
            stats_clase = AttendanceService.calculate_class_attendance_stats(
                request.user, clase, days=30
            )
        except Exception as e:
            messages.error(request, f'Error al cargar datos: {str(e)}')
    
    context = {
        **load_dashboard_context(request),
        'clases': clases,
        'total_clases': classes_data['total_clases'],
        'clase_seleccionada': clase if 'clase' in locals() else None,
        'estudiantes_con_asistencia': estudiantes_con_asistencia,
        'filtro_clase_id': filtro_clase_id,
        'filtro_fecha': filtro_fecha,
        'stats_clase': stats_clase,
        'fecha_hoy': date.today().strftime('%Y-%m-%d'),
    }
    
    if request.GET.get('json'):
        return JsonResponse(context, safe=False)
    
    return render(request, 'profesor/gestionar_asistencia.html', context)


@login_required
def gestionar_evaluaciones_calificaciones(request):
    """Vista pasarela para gestión de evaluaciones y calificaciones."""
    colegio = getattr(request.user, "colegio", None)
    if colegio is None:
        messages.error(request, "No se pudo determinar el colegio del usuario.")
        return redirect("dashboard")
    
    # Procesar POST - delegar a servicio
    if request.method == 'POST':
        accion = request.POST.get('accion')
        
        if accion in ['crear_evaluacion', 'editar_evaluacion', 'eliminar_evaluacion']:
            result = GradesService.process_evaluation_action(request.user, colegio, request.POST)
        elif accion == 'registrar_calificaciones':
            result = GradesService.process_grades_registration(request.user, colegio, request.POST)
        else:
            result = {'success': False, 'message': 'Acción no válida'}
            
        if result['success']:
            messages.success(request, result['message'])
        else:
            messages.error(request, result['message'])
        
        return redirect(f"{reverse('dashboard')}?pagina=notas")
    
    # GET - obtener datos del servicio
    clases = GradesService.get_teacher_classes_for_grades(request.user, colegio)
    total_clases = clases.count()
    
    # Filtros
    filtro_clase_id = request.GET.get('clase_id', '')
    modo = request.GET.get('modo', 'evaluaciones')
    
    # Datos por defecto
    clase_seleccionada = None
    evaluaciones = []
    evaluacion_seleccionada = None
    estudiantes_con_notas = []
    stats = {'total_evaluaciones': 0, 'total_calificaciones': 0, 'promedio_general': 0}
    
    if filtro_clase_id:
        try:
            clase_seleccionada = clases.get(id=filtro_clase_id)
            evaluaciones = GradesService.get_evaluations_for_class(clase_seleccionada)
            
            # Si está en modo calificar
            if modo == 'calificar':
                evaluacion_id = request.GET.get('evaluacion_id')
                if evaluacion_id:
                    evaluacion_seleccionada = GradesService.get_evaluation_by_id(
                        colegio, int(evaluacion_id)
                    )
                    if evaluacion_seleccionada:
                        estudiantes_con_notas = GradesService.get_students_with_grades(
                            colegio, evaluacion_seleccionada
                        )
            
            # Calcular estadísticas
            stats = GradesService.calculate_class_grades_stats(clase_seleccionada)
        
        except Exception as e:
            messages.error(request, f'Error al cargar datos: {str(e)}')
    
    context = {
        **load_dashboard_context(request),
        'clases': clases,
        'total_clases': total_clases,
        'clase_seleccionada': clase_seleccionada,
        'evaluaciones': evaluaciones,
        'total_evaluaciones': stats['total_evaluaciones'],
        'total_calificaciones': stats['total_calificaciones'],
        'promedio_general': stats['promedio_general'],
        'filtro_clase_id': filtro_clase_id,
        'modo': modo,
        'evaluacion_seleccionada': evaluacion_seleccionada,
        'estudiantes_con_notas': estudiantes_con_notas,
        'fecha_hoy': date.today().strftime('%Y-%m-%d'),
    }
    
    if request.GET.get('json'):
        return JsonResponse(context, safe=False)
    
    return render(request, 'profesor/gestionar_evaluaciones_calificaciones.html', context)


@login_required
def libro_clases(request):
    """Vista pasarela para libro de clases."""
    colegio = getattr(request.user, "colegio", None)
    if colegio is None:
        messages.error(request, "No se pudo determinar el colegio del usuario.")
        return redirect("dashboard")
    
    # Obtener clases disponibles
    clases = GradesService.get_teacher_classes_for_gradebook(request.user, colegio)
    total_clases = clases.count()
    
    # Filtros
    filtro_clase_id = request.GET.get('clase_id', '')
    clase_seleccionada = None
    gradebook_data = None
    
    if filtro_clase_id:
        try:
            from backend.apps.cursos.models import Clase
            clase_id = int(filtro_clase_id)
            clase_seleccionada = clases.filter(id=clase_id).first()
            
            if clase_seleccionada:
                gradebook_data = GradesService.build_gradebook_matrix(
                    colegio, clase_seleccionada
                )
        
        except (ValueError, TypeError) as e:
            messages.error(request, f'Error al cargar libro de clases: {str(e)}')
    
    context = {
        **load_dashboard_context(request),
        'clases': clases,
        'total_clases': total_clases,
        'clase_seleccionada': clase_seleccionada,
        'filtro_clase_id': filtro_clase_id,
    }
    
    if gradebook_data:
        context.update({
            'evaluaciones': gradebook_data['evaluaciones'],
            'matriz_calificaciones': gradebook_data['matriz_calificaciones'],
            'promedios_evaluaciones': gradebook_data['promedios_evaluaciones'],
            'total_evaluaciones': gradebook_data['total_evaluaciones'],
            'total_estudiantes': gradebook_data['total_estudiantes'],
            'promedio_general': gradebook_data['promedio_general'],
        })
    
    if request.GET.get('json'):
        return JsonResponse(context, safe=False)
    
    return render(request, 'profesor/libro_clases.html', context)
