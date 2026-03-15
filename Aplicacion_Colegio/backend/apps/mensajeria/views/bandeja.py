# mensajeria/views/bandeja.py
"""Vista de bandeja de mensajes."""

from __future__ import annotations

from datetime import datetime

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseBadRequest
from django.shortcuts import redirect, render

from backend.apps.mensajeria.services import MensajeriaService
from backend.common.utils.dashboard_helpers import build_dashboard_context
from backend.common.utils.auth_helpers import normalizar_rol
from backend.apps.core.services.dashboard_service import DashboardService


@login_required()
def bandeja_mensajes(request):
    """Bandeja principal.

    Soporta atajo por query params:
    - `clase_id` y `destinatario_id` -> crea/abre conversación y redirige.
    """

    # Atajo desde detalle de clase: abrir conversación directo.
    clase_id = request.GET.get('clase_id')
    destinatario_id = request.GET.get('destinatario_id')
    if clase_id and destinatario_id:
        try:
            clase_id_int = int(clase_id)
            destinatario_id_int = int(destinatario_id)
        except ValueError:
            return HttpResponseBadRequest('Parámetros inválidos')

        try:
            clase = MensajeriaService.get_class_for_messages(clase_id_int)
        except Exception:
            return HttpResponseBadRequest('Clase inválida')
        if not MensajeriaService.user_has_access_to_class(request.user, clase):
            messages.error(request, 'No tienes acceso a esa clase')
            return redirect('dashboard')

        try:
            destinatario = MensajeriaService.get_user_for_messages(destinatario_id_int)
        except Exception:
            return HttpResponseBadRequest('Destinatario inválido')

        # Validar destinatario usando el service
        is_valid, error_msg = MensajeriaService.validate_destinatario_for_class(clase, destinatario)
        if not is_valid:
            messages.error(request, error_msg)
            return redirect('dashboard')

        conv = MensajeriaService.get_or_create_conversacion(clase, request.user, destinatario)
        return redirect('mensajeria:ver_conversacion', id_conversacion=conv.id_conversacion)

    context, redirect_response = build_dashboard_context(
        request,
        pagina_actual='mensajes',
        content_template='estudiante/mensajeria.html',
    )
    if redirect_response:
        return redirect_response

    context.update(
        {
            'conversaciones': MensajeriaService.get_conversaciones_data(request.user),
            'conversacion_actual': None,
            'mensajes': [],
        }
    )
    return render(request, 'dashboard.html', context)
