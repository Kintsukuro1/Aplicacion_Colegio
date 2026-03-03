from __future__ import annotations

from typing import Optional, Set
import logging

from django.core.exceptions import PermissionDenied

from backend.common.capabilities import DEFAULT_CAPABILITIES_BY_ROLE
from backend.common.utils.auth_helpers import normalizar_rol

logger = logging.getLogger(__name__)


class PolicyService:
    """Fuente única de autorización basada en capabilities."""

    @staticmethod
    def has_capability(user, capability: str, school_id: Optional[int] = None) -> bool:
        if not user or not getattr(user, 'is_authenticated', False):
            return False
        if not getattr(user, 'is_active', False):
            return False
        if not capability:
            return False

        role = getattr(user, 'role', None)
        role_name = getattr(role, 'nombre', None)
        role_normalized = normalizar_rol(role_name)
        if not role_normalized:
            return False

        if school_id is not None and not PolicyService._has_tenant_access(user, role_normalized, school_id):
            return False

        user_capabilities = PolicyService.get_user_capabilities(user)
        return capability in user_capabilities

    @staticmethod
    def require_capability(user, capability: str, school_id: Optional[int] = None) -> None:
        if not PolicyService.has_capability(user, capability, school_id=school_id):
            email = getattr(user, 'email', 'anonymous')
            logger.warning('Permission denied for %s on capability %s', email, capability)
            raise PermissionDenied(f'No tiene permisos para {capability}')

    @staticmethod
    def get_user_capabilities(user) -> Set[str]:
        if not user or not getattr(user, 'is_authenticated', False):
            return set()

        role = getattr(user, 'role', None)
        role_name = getattr(role, 'nombre', None)
        role_normalized = normalizar_rol(role_name)
        if not role_normalized:
            return set()

        db_capabilities = PolicyService._get_db_capabilities_for_user(user)
        if db_capabilities is not None:
            return db_capabilities

        return set(DEFAULT_CAPABILITIES_BY_ROLE.get(role_normalized, set()))

    @staticmethod
    def _get_db_capabilities_for_user(user) -> Optional[Set[str]]:
        role = getattr(user, 'role', None)
        role_id = getattr(role, 'id', None)
        if not role_id:
            return None

        try:
            from backend.apps.accounts.models import RoleCapability

            rows = RoleCapability.objects.filter(
                role_id=role_id,
                is_granted=True,
                capability__is_active=True,
            ).values_list('capability__code', flat=True)
            db_capabilities = set(rows)
            if not db_capabilities:
                return None
            return db_capabilities
        except Exception as exc:
            logger.debug('Falling back to static capability mapping: %s', exc)
            return None

    @staticmethod
    def _has_tenant_access(user, role_normalized: str, school_id: int) -> bool:
        if role_normalized == 'admin_general':
            return True

        user_school = getattr(user, 'rbd_colegio', None)
        if user_school is None:
            return False

        try:
            return int(user_school) == int(school_id)
        except (TypeError, ValueError):
            return False
