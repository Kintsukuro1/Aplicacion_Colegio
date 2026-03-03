from decimal import Decimal
from unittest.mock import Mock, patch

from backend.apps.core.services.financial_documents_service import FinancialDocumentsService


@patch('backend.apps.core.services.financial_documents_service.AuditoriaEvento')
@patch('backend.apps.core.services.financial_documents_service.Beca')
def test_create_beca_creates_record_and_audit(mock_beca, mock_auditoria):
    user = Mock()
    estudiante = Mock(rut='11-1')
    estudiante.get_full_name.return_value = 'Alumno Uno'
    matricula = Mock(estudiante=estudiante)
    beca = Mock(porcentaje_descuento=Decimal('25.5'))
    beca.get_tipo_display.return_value = 'Mérito'
    mock_beca.objects.create.return_value = beca

    result = FinancialDocumentsService.create_beca(
        user=user,
        matricula=matricula,
        data={
            'tipo_beca': 'MERITO',
            'porcentaje_descuento': '25.5',
            'motivo_solicitud': 'Rendimiento',
            'observaciones': 'ok',
            'aplica_matricula': True,
            'aplica_mensualidad': True,
            'aplica_otros_aranceles': False,
            'estado': 'APROBADA',
        },
        fecha_inicio='2026-03-01',
        fecha_fin='2026-12-31',
        ip_address='127.0.0.1',
        user_agent='pytest',
    )

    assert result is beca
    assert mock_beca.objects.create.call_args.kwargs['porcentaje_descuento'] == Decimal('25.5')
    mock_auditoria.objects.create.assert_called_once()


@patch('backend.apps.core.services.financial_documents_service.AuditoriaEvento')
@patch('backend.apps.core.services.financial_documents_service.Boleta')
def test_create_boleta_creates_record_and_audit(mock_boleta, mock_auditoria):
    user = Mock()
    estudiante = Mock(rut='22-2')
    estudiante.get_full_name.return_value = 'Alumno Dos'
    cuota = Mock()
    boleta = Mock(monto_total=Decimal('120000'), numero_boleta='B-100')
    mock_boleta.objects.create.return_value = boleta

    result = FinancialDocumentsService.create_boleta(
        user=user,
        estudiante=estudiante,
        cuota=cuota,
        numero_boleta='B-100',
        monto_total='120000',
        fecha_emision='2026-04-01',
        estado='emitida',
        detalle='Detalle',
        ip_address='127.0.0.1',
        user_agent='pytest',
    )

    assert result is boleta
    assert mock_boleta.objects.create.call_args.kwargs['monto_total'] == Decimal('120000')
    mock_auditoria.objects.create.assert_called_once()
