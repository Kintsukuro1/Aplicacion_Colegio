import os
import django
import sys

sys.path.append('c:\\proyectos\\Aplicacion_Colegio\\Aplicacion_Colegio')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.core.settings')
django.setup()

from backend.apps.accounts.models import User, Role
from backend.common.services.policy_service import PolicyService

print("Users with 'profesor' in email or role:")
users = User.objects.all()
for u in users:
    role_name = u.role.nombre if u.role else "None"
    if "profesor" in u.email.lower() or "profesor" in role_name.lower():
        caps = PolicyService.get_user_capabilities(u)
        print(f"- {u.email} | Role: {role_name} | Caps count: {len(caps)} | PORTAL_ESTUDIANTE: {'PORTAL_ESTUDIANTE' in caps} | CLASS_VIEW: {'CLASS_VIEW' in caps}")
