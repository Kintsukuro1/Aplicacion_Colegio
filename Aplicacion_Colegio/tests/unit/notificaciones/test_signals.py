from unittest.mock import patch

import pytest

from backend.apps.accounts.models import Role, User
from backend.apps.notificaciones.models import Notificacion


pytestmark = pytest.mark.django_db


def _mk_user(email, role_name, school_id, rut):
    role, _ = Role.objects.get_or_create(nombre=role_name)
    return User.objects.create_user(
        email=email,
        password='Test#123456',
        nombre='Nombre',
        apellido_paterno='Apellido',
        rut=rut,
        role=role,
        rbd_colegio=school_id,
        is_active=True,
    )


@patch('backend.apps.notificaciones.signals.NotificationDispatchService.dispatch_channels')
def test_notificacion_post_save_dispatches_channels(mock_dispatch):
    user = _mk_user('notif-signal@test.cl', 'Profesor', 1301, '55555555-2')

    notification = Notificacion.objects.create(
        destinatario=user,
        tipo='sistema',
        titulo='Signal test',
        mensaje='Dispatch',
    )

    mock_dispatch.assert_called_once_with(notification)
