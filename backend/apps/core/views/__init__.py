# Core views module

from backend.apps.core.services.dashboard_service import DashboardService

def load_dashboard_context(request):
    """
    Carga el contexto básico del dashboard para el usuario.
    
    Returns:
        dict: Contexto básico del usuario
    """
    user_context = DashboardService.get_user_context(request.user, request.session)
    if user_context is None:
        # Retornar contexto vacío si no hay contexto válido
        return {}
    
    return user_context