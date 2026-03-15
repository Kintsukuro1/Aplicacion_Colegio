"""Vistas de Gestión de Datos (Importar/Insertar).

Migrado de forma mínima desde `sistema_antiguo/core/views.py::importar_datos`.
"""

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render

from backend.apps.core.services.import_csv_service import ImportacionCSVService
from backend.common.services.policy_service import PolicyService


@login_required(login_url="accounts:login")
def importar_datos(request):
    """Página principal de gestión de datos (admin escolar)."""

    can_configure_school = PolicyService.has_capability(request.user, 'SYSTEM_CONFIGURE')
    is_system_admin = PolicyService.has_capability(request.user, 'SYSTEM_ADMIN')

    if not can_configure_school or is_system_admin:
        messages.error(request, "No tienes permisos para acceder a esta sección")
        return redirect("dashboard")

    colegio = getattr(request.user, "colegio", None)
    if colegio is None:
        messages.error(request, "No se pudo determinar el colegio del usuario")
        return redirect("dashboard")

    dashboard_data = ImportacionCSVService.get_importar_datos_dashboard(colegio.rbd)

    context = {
        "colegio": colegio,
        "estudiantes": dashboard_data["estudiantes"],
        "profesores": dashboard_data["profesores"],
        "apoderados": dashboard_data["apoderados"],
        "total_estudiantes": dashboard_data["total_estudiantes"],
        "total_profesores": dashboard_data["total_profesores"],
        "total_apoderados": dashboard_data["total_apoderados"],
        "pagina_actual": "importar_datos",
    }

    return render(request, "admin_escolar/importar_datos.html", context)
