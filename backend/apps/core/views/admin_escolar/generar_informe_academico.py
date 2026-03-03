"""Core view: generar informe académico (Admin escolar)

Permite a administradores escolares generar informes académicos de estudiantes
en formato PDF o Excel con datos reales de calificaciones y asistencia.
"""

from __future__ import annotations

from datetime import datetime

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import Http404, JsonResponse
from django.shortcuts import redirect, render

from backend.apps.core.services.dashboard_service import DashboardService
from backend.apps.core.services.academic_report_query_service import AcademicReportQueryService
from backend.apps.academico.services.academic_reports_service import AcademicReportsService
from backend.common.utils.report_exporters import PDFReportExporter, ExcelReportExporter


@login_required(login_url="accounts:login")
def generar_informe_academico(request, estudiante_id: int):
    user_context = DashboardService.get_user_context(request.user, request.session)
    if user_context is None:
        messages.error(request, "Sesión inválida")
        return redirect("accounts:login")

    user_data = user_context.get('data', {})
    rol = user_data.get('rol')
    escuela_rbd = user_data.get('escuela_rbd')

    if rol not in ["admin", "admin_escolar"]:
        messages.error(request, "No tienes permiso para generar informes")
        return redirect("dashboard")

    if not escuela_rbd:
        messages.error(request, "No hay escuela asignada")
        return redirect("dashboard")

    try:
        estudiante = AcademicReportQueryService.get_student_with_profile(estudiante_id)
    except Exception:
        raise Http404("Estudiante no encontrado")

    # Asegura que el estudiante pertenezca a la escuela actual.
    if estudiante.rbd_colegio != escuela_rbd:
        raise Http404("Estudiante no encontrado")

    perfil = getattr(estudiante, "perfil_estudiante", None)
    if perfil is None:
        messages.error(request, "El estudiante no tiene perfil asociado")
        return redirect("dashboard")

    curso = perfil.curso_actual
    if curso is None:
        messages.error(request, "El estudiante no tiene curso asignado")
        return redirect("dashboard")

    # Periodos/años mínimos para el formulario existente.
    periodos = [
        ("1", "1° Semestre"),
        ("2", "2° Semestre"),
        ("anual", "Anual"),
    ]
    anio_actual = datetime.utcnow().year
    anios = [anio_actual, anio_actual - 1, anio_actual - 2]

    if request.method == "POST":
        # Obtener parámetros del formulario
        periodo = request.POST.get("periodo", "anual")
        anio = request.POST.get("anio", str(anio_actual))
        formato = request.POST.get("formato", "pdf")  # pdf o excel
        
        # Obtener colegio
        try:
            colegio = AcademicReportQueryService.get_school_by_rbd(escuela_rbd)
        except Exception:
            messages.error(request, "Colegio no encontrado")
            return redirect("generar_informe_academico", estudiante_id=estudiante_id)
        
        # Generar reporte académico usando el servicio
        try:
            reporte_data = AcademicReportsService.generate_student_academic_report(
                request.user,
                estudiante,
                periodo=periodo
            )
            
            # Generar archivo según formato solicitado
            if formato == "excel":
                return ExcelReportExporter.generate_student_academic_excel(reporte_data, colegio)
            else:  # PDF por defecto
                return PDFReportExporter.generate_student_academic_pdf(reporte_data, colegio)
                
        except Exception:
            import logging
            logger = logging.getLogger(__name__)
            logger.exception("Error al generar informe académico")
            messages.error(request, "No se pudo generar el informe. Intenta nuevamente.")
            return redirect("generar_informe_academico", estudiante_id=estudiante_id)

    context = {
        "estudiante": estudiante,
        "perfil": perfil,
        "curso": curso,
        "periodos": periodos,
        "anios": anios,
    }

    return render(request, "admin_escolar/generar_informe.html", context)
