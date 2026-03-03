from types import SimpleNamespace
from unittest.mock import Mock, patch

import pytest

from backend.apps.core.services.dashboard_apoderado_service import DashboardApoderadoService


pytestmark = pytest.mark.django_db


class TestDashboardApoderadoService:
    def test_validate_required_params(self):
        with pytest.raises(ValueError, match='user'):
            DashboardApoderadoService.validate('get_apoderado_context', {'pagina_solicitada': 'inicio'})

        with pytest.raises(ValueError, match='pagina_solicitada'):
            DashboardApoderadoService.validate('get_apoderado_context', {'user': Mock()})

    def test_validate_unsupported_operation(self):
        with pytest.raises(ValueError, match='Operación no soportada'):
            DashboardApoderadoService.validate('x', {})

    def test_execute_routes_operation(self):
        with patch.object(DashboardApoderadoService, 'validate'), patch.object(
            DashboardApoderadoService, '_execute', return_value={'ok': True}
        ) as mock_exec:
            result = DashboardApoderadoService.execute('get_apoderado_context', {'user': Mock(), 'pagina_solicitada': 'inicio'})

        assert result == {'ok': True}
        mock_exec.assert_called_once()

    def test_get_apoderado_context_wrapper(self):
        with patch.object(DashboardApoderadoService, 'execute', return_value={'z': 1}) as mock_exec:
            result = DashboardApoderadoService.get_apoderado_context(Mock(), 'inicio', '10')

        assert result == {'z': 1}
        mock_exec.assert_called_once()

    def test_execute_get_apoderado_context_inicio(self):
        user = Mock(id=10, rbd_colegio=444)
        cursor = Mock()
        cursor.fetchall.return_value = [(1, 'Ana', 'Pérez', 'López', 'ana@test.cl')]

        user_model = Mock(side_effect=lambda **kwargs: SimpleNamespace(**kwargs))
        with patch('backend.apps.core.services.dashboard_apoderado_service.IntegrityService.validate_school_integrity_or_raise') as mock_integrity, patch(
            'django.db.connection.cursor', return_value=cursor
        ), patch('backend.apps.accounts.models.User', user_model):
            result = DashboardApoderadoService._execute_get_apoderado_context(
                {'user': user, 'pagina_solicitada': 'inicio'}
            )

        assert result['apoderado'] is user
        assert result['total_pupilos'] == 1
        assert len(result['estudiantes']) == 1
        mock_integrity.assert_called_once_with(school_id=444, action='DASHBOARD_APODERADO_CONTEXT')

    def test_execute_get_apoderado_context_notas_delegates(self):
        user = Mock(id=10, rbd_colegio=None)
        cursor = Mock()
        cursor.fetchall.return_value = []

        with patch('django.db.connection.cursor', return_value=cursor), patch(
            'backend.apps.accounts.models.User', Mock(side_effect=lambda **kwargs: SimpleNamespace(**kwargs))
        ), patch.object(
            DashboardApoderadoService,
            '_get_apoderado_notas_context',
            return_value={'notas_ok': True},
        ) as mock_notas:
            result = DashboardApoderadoService._execute_get_apoderado_context(
                {'user': user, 'pagina_solicitada': 'notas', 'estudiante_id_param': '1'}
            )

        assert result['notas_ok'] is True
        mock_notas.assert_called_once()

    def test_execute_get_apoderado_context_handles_exception(self):
        user = Mock(id=10, rbd_colegio=None)
        with patch('django.db.connection.cursor', side_effect=Exception('db')):
            result = DashboardApoderadoService._execute_get_apoderado_context(
                {'user': user, 'pagina_solicitada': 'inicio'}
            )

        assert result == {}

    def test_get_apoderado_notas_context_with_data(self):
        estudiante = Mock(id=1)
        estudiante.perfil_estudiante.curso_actual = '2A'

        clase = Mock()
        clase.id_clase = 10
        clase.asignatura = Mock()
        clase.asignatura.nombre = 'Matemática'

        eval_1 = Mock(nombre='Prueba 1', fecha_evaluacion='2026-01-01', ponderacion=50, clase_id=10)
        eval_2 = Mock(nombre='Prueba 2', fecha_evaluacion='2026-01-15', ponderacion=50, clase_id=10)
        c1 = Mock(evaluacion=eval_1, nota=5.0)
        c2 = Mock(evaluacion=eval_2, nota=6.0)
        califs_qs = Mock()
        califs_qs.select_related.return_value = califs_qs
        califs_qs.order_by.return_value = califs_qs
        califs_qs.__iter__ = Mock(return_value=iter([c1, c2]))

        clases_qs = Mock()
        clases_qs.select_related.return_value = [clase]

        with patch('backend.apps.cursos.models.Clase.objects.filter', return_value=clases_qs), patch(
            'backend.apps.academico.models.Calificacion.objects.filter', return_value=califs_qs
        ):
            result = DashboardApoderadoService._get_apoderado_notas_context(
                Mock(),
                [estudiante],
                '1',
            )

        assert result['estudiante_seleccionado'] is estudiante
        assert result['promedio_general'] == 5.5
        assert len(result['notas_por_asignatura']) == 1

    def test_get_apoderado_asistencia_context_without_records(self):
        estudiante = Mock(id=1)
        estudiante.perfil_estudiante.curso_actual = '2A'
        registros_qs = Mock()
        registros_qs.select_related.return_value = registros_qs
        registros_qs.order_by.return_value = registros_qs
        registros_qs.aggregate.return_value = {
            'total': 0,
            'presentes': 0,
            'ausentes': 0,
            'atrasos': 0,
            'justificadas': 0,
        }
        registros_qs.__iter__ = Mock(return_value=iter([]))

        clases_qs = Mock()
        clases_qs.select_related.return_value = []

        with patch('backend.apps.academico.models.Asistencia.objects.filter', return_value=registros_qs), patch(
            'backend.apps.cursos.models.Clase.objects.filter', return_value=clases_qs
        ):
            result = DashboardApoderadoService._get_apoderado_asistencia_context(Mock(), [estudiante], '1')

        assert result['estadisticas']['sin_datos'] is True
        assert result['estadisticas']['total'] == 0
