"""DashboardAuthService unit tests aligned to current contracts."""

from unittest.mock import Mock, patch

import pytest

from backend.apps.core.services.dashboard_auth_service import DashboardAuthService


pytestmark = pytest.mark.django_db


class TestDashboardAuthService:
    @patch('backend.apps.core.services.dashboard_auth_service.IntegrityService.validate_school_integrity_or_raise', return_value=None)
    @patch('backend.apps.core.services.dashboard_auth_service.normalizar_rol', return_value='estudiante')
    def test_get_user_context_valid_student(self, _mock_normalizar, _mock_integrity):
        user = Mock()
        user.id = 1
        user.role = Mock(nombre='Alumno')
        user.get_full_name.return_value = 'Juan Pérez'
        user.rbd_colegio = 12345
        user.colegio = Mock(nombre='Escuela Test')
        user.email = 'juan@test.cl'

        result = DashboardAuthService.get_user_context(user, {})

        assert result is not None
        assert result['success'] is True
        assert result['data']['rol'] == 'estudiante'
        assert result['data']['id_usuario'] == 1
        assert result['data']['escuela_rbd'] == 12345

    @patch('backend.apps.core.services.dashboard_auth_service.normalizar_rol', return_value='estudiante')
    def test_get_user_context_no_school_assigned(self, _mock_normalizar):
        user = Mock()
        user.role = Mock(nombre='Alumno')
        user.rbd_colegio = None

        result = DashboardAuthService.get_user_context(user, {})

        assert result is None

    @patch('backend.apps.core.services.dashboard_auth_service.normalizar_rol', return_value='admin')
    def test_get_user_context_admin_without_session_rbd(self, _mock_normalizar):
        user = Mock()
        user.role = Mock(nombre='Administrador general')
        user.rbd_colegio = None
        user.colegio = None

        result = DashboardAuthService.get_user_context(user, {})

        assert result is None

    @patch('backend.apps.core.services.dashboard_auth_service.PolicyService.has_capability', return_value=True)
    def test_validate_page_access_capability_first_allows_new_role_inicio(self, mock_has_capability):
        user = Mock(is_authenticated=True, is_active=True)

        is_valid, template = DashboardAuthService.validate_page_access(
            'coordinador',
            'inicio',
            user=user,
            school_id=12345,
        )

        assert is_valid is True
        assert template == 'compartido/inicio_modulos.html'
        mock_has_capability.assert_called()

    @patch('backend.apps.core.services.dashboard_auth_service.PolicyService.has_capability', return_value=False)
    def test_validate_page_access_capability_first_denies_without_capability(self, mock_has_capability):
        user = Mock(is_authenticated=True, is_active=True)

        is_valid, template = DashboardAuthService.validate_page_access(
            'profesor',
            'reportes',
            user=user,
            school_id=12345,
        )

        assert is_valid is False
        assert template == 'compartido/acceso_denegado.html'
        mock_has_capability.assert_called()

    @patch('backend.apps.core.services.dashboard_auth_service.PolicyService.has_capability')
    def test_get_navigation_access_filters_pages_by_capability(self, mock_has_capability):
        def _has_capability(_user, capability, school_id=None):
            return capability in {'DASHBOARD_VIEW_SELF', 'CLASS_VIEW'}

        mock_has_capability.side_effect = _has_capability
        user = Mock(is_authenticated=True, is_active=True)

        result = DashboardAuthService.get_navigation_access('estudiante', user=user, school_id=12345)

        assert 'inicio' in result['paginas_habilitadas']
        assert 'mis_clases' in result['paginas_habilitadas']
        assert 'mis_notas' not in result['paginas_habilitadas']

    @patch('backend.apps.core.services.dashboard_auth_service.PolicyService.has_capability', return_value=True)
    def test_get_navigation_access_fallback_no_user_uses_role_pages(self, _mock_has_capability):
        result = DashboardAuthService.get_navigation_access('profesor', user=None, school_id=12345)

        assert 'inicio' in result['paginas_habilitadas']
        assert 'mis_clases' in result['paginas_habilitadas']
