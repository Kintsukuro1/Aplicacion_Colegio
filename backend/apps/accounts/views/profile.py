"""
Profile Views - Vistas ligeras para gestión de perfiles

Estas vistas son orquestadores que delegan la lógica de negocio al ProfileService.
Solo manejan HTTP, validaciones de entrada, y respuestas al usuario.

Migrando desde: sistema_antiguo/core/views.py (líneas 905-1128)
"""

from django.shortcuts import redirect
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django_ratelimit.decorators import ratelimit
from django.contrib.auth import update_session_auth_hash
from axes.helpers import get_client_ip_address

from backend.apps.accounts.services.profile_service import ProfileService
from backend.apps.accounts.models import User


@login_required()
def actualizar_perfil_estudiante(request):
    """
    Vista para actualizar el perfil de un estudiante
    
    Orquestador ligero que:
    - Extrae datos del POST
    - Llama al ProfileService
    - Maneja mensajes y redirecciones
    """
    if request.method == 'POST':
        # Extraer datos
        email = request.POST.get('email', '').strip()
        telefono = request.POST.get('telefono', '').strip()
        direccion = request.POST.get('direccion', '').strip()
        
        # Llamar al servicio
        success, message = ProfileService.update_student_profile(
            user=request.user,
            email=email,
            telefono=telefono,
            direccion=direccion,
            User=User
        )
        
        # Manejar respuesta
        if success:
            messages.success(request, message)
        else:
            messages.error(request, message)
    
    return redirect('dashboard' + '?pagina=perfil')


@login_required()
def actualizar_perfil_profesor(request):
    """
    Vista para actualizar el perfil de un profesor o administrador
    
    Orquestador ligero que:
    - Extrae datos del POST
    - Llama al ProfileService
    - Maneja mensajes y redirecciones
    """
    if request.method == 'POST':
        # Extraer datos
        email = request.POST.get('email', '').strip()
        telefono = request.POST.get('telefono', '').strip()
        direccion = request.POST.get('direccion', '').strip()
        
        # Llamar al servicio
        success, message = ProfileService.update_staff_profile(
            user=request.user,
            email=email,
            telefono=telefono,
            direccion=direccion,
            User=User
        )
        
        # Manejar respuesta
        if success:
            messages.success(request, message)
        else:
            messages.error(request, message)
    
    return redirect('dashboard' + '?pagina=perfil')


@login_required()
@ratelimit(key='user', rate='5/h', method='POST', block=True)
def cambiar_password_estudiante(request):
    """
    Vista para cambiar la contraseña de un estudiante
    
    Protecciones:
    - Rate limiting: 5 intentos por hora por usuario
    - Validación de contraseña actual
    - Logging de seguridad
    
    Orquestador ligero que:
    - Extrae datos del POST
    - Obtiene IP del cliente
    - Llama al ProfileService
    - Actualiza sesión si es exitoso
    - Maneja mensajes y redirecciones
    """
    if request.method == 'POST':
        # Extraer datos
        password_actual = request.POST.get('password_actual')
        password_nueva = request.POST.get('password_nueva')
        password_confirmar = request.POST.get('password_confirmar')
        client_ip = get_client_ip_address(request)
        
        # Llamar al servicio
        success, message = ProfileService.change_student_password(
            user=request.user,
            password_actual=password_actual,
            password_nueva=password_nueva,
            password_confirmar=password_confirmar,
            client_ip=client_ip
        )
        
        # Manejar respuesta
        if success:
            # Actualizar la sesión para que no se cierre después del cambio
            update_session_auth_hash(request, request.user)
            messages.success(request, message)
        else:
            messages.error(request, message)
    
    return redirect('dashboard' + '?pagina=perfil')


@login_required()
@ratelimit(key='user', rate='5/h', method='POST', block=True)
def cambiar_password_profesor(request):
    """
    Vista para cambiar la contraseña de un profesor o administrador
    
    Protecciones:
    - Rate limiting: 5 intentos por hora por usuario
    - Validación de contraseña actual
    - Logging de seguridad
    
    Orquestador ligero que:
    - Extrae datos del POST
    - Obtiene IP del cliente
    - Llama al ProfileService
    - Actualiza sesión si es exitoso
    - Maneja mensajes y redirecciones
    """
    if request.method == 'POST':
        # Extraer datos
        password_actual = request.POST.get('password_actual')
        password_nueva = request.POST.get('password_nueva')
        password_confirmar = request.POST.get('password_confirmar')
        client_ip = get_client_ip_address(request)
        
        # Llamar al servicio
        success, message = ProfileService.change_staff_password(
            user=request.user,
            password_actual=password_actual,
            password_nueva=password_nueva,
            password_confirmar=password_confirmar,
            client_ip=client_ip
        )
        
        # Manejar respuesta
        if success:
            # Actualizar la sesión para que no se cierre después del cambio
            update_session_auth_hash(request, request.user)
            messages.success(request, message)
        else:
            messages.error(request, message)
    
    return redirect('dashboard' + '?pagina=perfil')

