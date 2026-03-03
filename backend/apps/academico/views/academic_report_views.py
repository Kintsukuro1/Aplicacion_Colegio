"""
Vistas orchestradoras para reportes académicos.
Delegación a AcademicReportService para generación y exportación.
"""
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponse
from datetime import date

from backend.apps.academico.services.academic_reports_service import AcademicReportsService
from backend.apps.core.views import load_dashboard_context
from backend.common.utils.report_exporters import PDFReportExporter, ExcelReportExporter


@login_required
def reportes(request):
    """Vista pasarela para reportes académicos."""
    colegio = getattr(request.user, "colegio", None)
    if colegio is None:
        return JsonResponse({'error': 'No se pudo determinar el colegio del usuario'}, status=400)
    
    # Obtener clases disponibles
    clases = AcademicReportsService.get_available_classes_for_reports(request.user, colegio)
    
    # Filtros
    tipo_reporte = request.GET.get('tipo', 'asistencia')
    filtro_clase_id = request.GET.get('clase_id', '')
    fecha_inicio_str = request.GET.get('fecha_inicio', '')
    fecha_fin_str = request.GET.get('fecha_fin', '')
    
    # Parsear fechas usando servicio
    fecha_inicio, fecha_fin = AcademicReportsService.parse_report_filters(fecha_inicio_str, fecha_fin_str)
    
    # Obtener clase seleccionada
    clase_seleccionada = AcademicReportsService.get_selected_class_for_report(request.user, colegio, filtro_clase_id)
    
    # Generar reporte según tipo
    reporte_data = AcademicReportsService.generate_report_data(
        request.user, clase_seleccionada, tipo_reporte, fecha_inicio, fecha_fin
    )
    
    context = {
        **load_dashboard_context(request),
        'clases': clases,
        'clase_seleccionada': clase_seleccionada,
        'tipo_reporte': tipo_reporte,
        'filtro_clase_id': filtro_clase_id,
        'fecha_inicio': fecha_inicio.strftime('%Y-%m-%d'),
        'fecha_fin': fecha_fin.strftime('%Y-%m-%d'),
        'reporte_data': reporte_data,
    }
    
    if request.GET.get('json'):
        return JsonResponse(context, safe=False)
    
    return render(request, 'profesor/reportes.html', context)


@login_required
def exportar_reporte_pdf(request):
    """Vista pasarela para exportar reporte a PDF."""
    colegio = getattr(request.user, "colegio", None)
    if colegio is None:
        return JsonResponse({'error': 'No se pudo determinar el colegio del usuario'}, status=400)
    
    # Obtener parámetros
    tipo_reporte = request.GET.get('tipo', 'asistencia')
    filtro_clase_id = request.GET.get('clase_id', '')
    fecha_inicio_str = request.GET.get('fecha_inicio', '')
    fecha_fin_str = request.GET.get('fecha_fin', '')
    
    # Preparar datos usando servicio
    result = AcademicReportsService.prepare_export_data(
        request.user, colegio, tipo_reporte, filtro_clase_id, fecha_inicio_str, fecha_fin_str
    )
    
    # Si es HttpResponse, es un error
    if hasattr(result, 'status_code'):
        return result
    
    clase_seleccionada, fecha_inicio, fecha_fin, reporte_data = result
    
    # Generar PDF profesional con reportlab
    try:
        return PDFReportExporter.generate_student_academic_pdf(reporte_data, colegio)
    except Exception as e:
        # Fallback a JSON en caso de error
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error al generar PDF: {e}", exc_info=True)
        return JsonResponse({'error': 'Error al generar PDF', 'details': str(e)}, status=500)


@login_required
def exportar_reporte_excel(request):
    """Vista pasarela para exportar reporte a Excel."""
    colegio = getattr(request.user, "colegio", None)
    if colegio is None:
        return JsonResponse({'error': 'No se pudo determinar el colegio del usuario'}, status=400)
    
    # Obtener parámetros
    tipo_reporte = request.GET.get('tipo', 'asistencia')
    filtro_clase_id = request.GET.get('clase_id', '')
    fecha_inicio_str = request.GET.get('fecha_inicio', '')
    fecha_fin_str = request.GET.get('fecha_fin', '')
    
    # Preparar datos usando servicio
    result = AcademicReportsService.prepare_export_data(
        request.user, colegio, tipo_reporte, filtro_clase_id, fecha_inicio_str, fecha_fin_str
    )
    
    # Si es HttpResponse, es un error
    if hasattr(result, 'status_code'):
        return result
    
    clase_seleccionada, fecha_inicio, fecha_fin, reporte_data = result
    
    # Generar Excel profesional con openpyxl
    try:
        return ExcelReportExporter.generate_student_academic_excel(reporte_data, colegio)
    except Exception as e:
        # Fallback a JSON en caso de error
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error al generar Excel: {e}", exc_info=True)
        return JsonResponse({'error': 'Error al generar Excel', 'details': str(e)}, status=500)
