import traceback
import sys
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from backend.apps.core.services.dashboard_nuevos_roles_service import DashboardPsicologoService
from backend.apps.accounts.models import User

try:
    psicologo = User.objects.filter(role__nombre__iexact='Psicólogo orientador').first()
    ctx = DashboardPsicologoService._get_ficha_estudiante_context(psicologo, psicologo.rbd_colegio, {})
    
    # force query evaluation
    list(ctx['estudiantes'])
    print("ALL OK")
    
except Exception as e:
    with open('err.txt', 'w', encoding='utf-8') as f:
        traceback.print_exc(file=f)
    print("ERROR SAVED TO err.txt")
