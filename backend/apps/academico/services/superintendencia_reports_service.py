"""Servicio para reporteria de compliance Superintendencia (Decreto 67)."""

from __future__ import annotations

import csv
import io
import json
from dataclasses import dataclass
from datetime import date
from typing import Any

from openpyxl import Workbook
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from backend.apps.academico.models import Asistencia, RegistroClase
from backend.apps.institucion.models import ConfiguracionAcademica
from backend.apps.matriculas.models import Matricula


@dataclass(frozen=True)
class ExportArtifact:
    content: bytes
    content_type: str
    filename: str


class SigeMinisterialAdapter:
    """Adapta el payload interno al contrato estable para carga SIGE."""

    ADAPTER_VERSION = '1.0.0'

    @staticmethod
    def build_payload(payload: dict[str, Any]) -> dict[str, Any]:
        return {
            'adapter': 'sige_ministerial_monthly',
            'adapter_version': SigeMinisterialAdapter.ADAPTER_VERSION,
            'source_contract_version': payload.get('contract_version', '1.0.0'),
            'month': payload['month'],
            'colegio_id': payload['colegio_id'],
            'attendance_summary': {
                'total_records': payload['asistencia']['total_registros'],
                'present': payload['asistencia']['presentes'],
                'absent': payload['asistencia']['ausentes'],
                'late': payload['asistencia']['tardanzas'],
                'excused': payload['asistencia']['justificadas'],
                'attendance_rate': payload['asistencia']['tasa_presentismo'],
            },
            'enrollment_summary': {
                'total': payload['matricula']['total'],
                'active': payload['matricula']['activas'],
                'suspended': payload['matricula']['suspendidas'],
                'withdrawn': payload['matricula']['retiradas'],
                'finalized': payload['matricula']['finalizadas'],
            },
            'classbook_summary': {
                'total_records': payload['libro_clases']['total_registros'],
                'signed': payload['libro_clases']['firmados'],
                'pending_sign': payload['libro_clases']['pendientes_firma'],
                'sign_rate': payload['libro_clases']['tasa_firma'],
            },
            'decreto67_summary': payload['decreto_67'],
        }


class SuperintendenciaReportsService:
    """Construye y exporta reporte mensual normativo por establecimiento."""

    @staticmethod
    def resolve_month(raw_month: str | None) -> tuple[int, int]:
        if raw_month in (None, ''):
            today = date.today()
            return today.year, today.month

        chunks = str(raw_month).split('-', 1)
        if len(chunks) != 2:
            raise ValueError('Formato de mes invalido. Use YYYY-MM.')

        try:
            year = int(chunks[0])
            month = int(chunks[1])
        except (TypeError, ValueError):
            raise ValueError('Formato de mes invalido. Use YYYY-MM.')

        if year < 2000 or year > 2100:
            raise ValueError('Anio fuera de rango permitido (2000-2100).')
        if month < 1 or month > 12:
            raise ValueError('Mes fuera de rango permitido (01-12).')

        return year, month

    @staticmethod
    def build_monthly_payload(*, school_id: int, year: int, month: int) -> dict[str, Any]:
        attendance_qs = Asistencia.objects.filter(
            colegio_id=school_id,
            fecha__year=year,
            fecha__month=month,
        )
        attendance_total = attendance_qs.count()
        attendance_present = attendance_qs.filter(estado='P').count()
        attendance_absent = attendance_qs.filter(estado='A').count()
        attendance_late = attendance_qs.filter(estado='T').count()
        attendance_excused = attendance_qs.filter(estado='J').count()

        attendance_rate = 0.0
        if attendance_total:
            attendance_rate = round((attendance_present * 100.0) / attendance_total, 2)

        enrollments_qs = Matricula.objects.filter(
            colegio_id=school_id,
            fecha_matricula__year=year,
            fecha_matricula__month=month,
        )

        registros_qs = RegistroClase.objects.filter(
            colegio_id=school_id,
            fecha__year=year,
            fecha__month=month,
        )
        total_registros = registros_qs.count()
        total_firmados = registros_qs.filter(firmado=True).count()
        tasa_firma = 0.0
        if total_registros:
            tasa_firma = round((total_firmados * 100.0) / total_registros, 2)

        config = ConfiguracionAcademica.objects.filter(colegio_id=school_id).first()

        return {
            'contract_version': '1.0.0',
            'report': 'superintendencia_decreto67_mensual',
            'month': f'{year:04d}-{month:02d}',
            'colegio_id': school_id,
            'asistencia': {
                'total_registros': attendance_total,
                'presentes': attendance_present,
                'ausentes': attendance_absent,
                'tardanzas': attendance_late,
                'justificadas': attendance_excused,
                'tasa_presentismo': attendance_rate,
            },
            'matricula': {
                'total': enrollments_qs.count(),
                'activas': enrollments_qs.filter(estado='ACTIVA').count(),
                'suspendidas': enrollments_qs.filter(estado='SUSPENDIDA').count(),
                'retiradas': enrollments_qs.filter(estado='RETIRADA').count(),
                'finalizadas': enrollments_qs.filter(estado='FINALIZADA').count(),
            },
            'libro_clases': {
                'total_registros': total_registros,
                'firmados': total_firmados,
                'pendientes_firma': total_registros - total_firmados,
                'tasa_firma': tasa_firma,
            },
            'decreto_67': {
                'configurado': bool(config),
                'nota_minima': float(config.nota_minima) if config else None,
                'nota_maxima': float(config.nota_maxima) if config else None,
                'nota_aprobacion': float(config.nota_aprobacion) if config else None,
                'periodo_evaluativo': config.periodo_evaluativo if config else None,
                'requiere_firma_docente': config.requiere_firma_docente if config else None,
            },
        }

    @staticmethod
    def export_payload(payload: dict[str, Any], export_format: str) -> ExportArtifact:
        month = payload['month']
        school_id = payload['colegio_id']

        if export_format == 'csv':
            return SuperintendenciaReportsService._export_csv(payload, month=month, school_id=school_id)
        if export_format == 'xlsx':
            return SuperintendenciaReportsService._export_xlsx(payload, month=month, school_id=school_id)
        if export_format == 'pdf':
            return SuperintendenciaReportsService._export_pdf(payload, month=month, school_id=school_id)
        if export_format == 'sige':
            return SuperintendenciaReportsService._export_sige(payload, month=month, school_id=school_id)

        raise ValueError('Formato invalido. Use csv, xlsx, pdf o sige.')

    @staticmethod
    def _export_csv(payload: dict[str, Any], *, month: str, school_id: int) -> ExportArtifact:
        asistencia = payload['asistencia']
        matricula = payload['matricula']
        libro = payload['libro_clases']
        decreto = payload['decreto_67']

        stream = io.StringIO()
        writer = csv.writer(stream)

        writer.writerow(['reporte', 'mes', 'colegio_id'])
        writer.writerow([payload['report'], month, school_id])
        writer.writerow([])

        writer.writerow(['asistencia_campo', 'valor'])
        for key in ['total_registros', 'presentes', 'ausentes', 'tardanzas', 'justificadas', 'tasa_presentismo']:
            writer.writerow([key, asistencia[key]])

        writer.writerow([])
        writer.writerow(['matricula_campo', 'valor'])
        for key in ['total', 'activas', 'suspendidas', 'retiradas', 'finalizadas']:
            writer.writerow([key, matricula[key]])

        writer.writerow([])
        writer.writerow(['libro_clases_campo', 'valor'])
        for key in ['total_registros', 'firmados', 'pendientes_firma', 'tasa_firma']:
            writer.writerow([key, libro[key]])

        writer.writerow([])
        writer.writerow(['decreto67_campo', 'valor'])
        for key in ['configurado', 'nota_minima', 'nota_maxima', 'nota_aprobacion', 'periodo_evaluativo', 'requiere_firma_docente']:
            writer.writerow([key, decreto[key]])

        return ExportArtifact(
            content=stream.getvalue().encode('utf-8'),
            content_type='text/csv; charset=utf-8',
            filename=f'reporte_superintendencia_{school_id}_{month}.csv',
        )

    @staticmethod
    def _export_xlsx(payload: dict[str, Any], *, month: str, school_id: int) -> ExportArtifact:
        workbook = Workbook()
        ws = workbook.active
        ws.title = 'superintendencia_decreto67'

        ws.append(['reporte', 'mes', 'colegio_id'])
        ws.append([payload['report'], month, school_id])
        ws.append([])

        ws.append(['asistencia_campo', 'valor'])
        for key, value in payload['asistencia'].items():
            ws.append([key, value])

        ws.append([])
        ws.append(['matricula_campo', 'valor'])
        for key, value in payload['matricula'].items():
            ws.append([key, value])

        ws.append([])
        ws.append(['libro_clases_campo', 'valor'])
        for key, value in payload['libro_clases'].items():
            ws.append([key, value])

        ws.append([])
        ws.append(['decreto67_campo', 'valor'])
        for key, value in payload['decreto_67'].items():
            ws.append([key, value])

        output = io.BytesIO()
        workbook.save(output)

        return ExportArtifact(
            content=output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            filename=f'reporte_superintendencia_{school_id}_{month}.xlsx',
        )

    @staticmethod
    def _export_pdf(payload: dict[str, Any], *, month: str, school_id: int) -> ExportArtifact:
        buffer = io.BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)

        y = 800
        pdf.setFont('Helvetica-Bold', 14)
        pdf.drawString(50, y, 'Reporte Superintendencia - Decreto 67')
        y -= 24

        pdf.setFont('Helvetica', 10)
        pdf.drawString(50, y, f"Mes: {month}")
        y -= 14
        pdf.drawString(50, y, f"Colegio ID: {school_id}")
        y -= 20

        sections = [
            ('Asistencia', payload['asistencia']),
            ('Matricula', payload['matricula']),
            ('Libro de Clases', payload['libro_clases']),
            ('Decreto 67', payload['decreto_67']),
        ]

        for title, data in sections:
            if y < 90:
                pdf.showPage()
                y = 800
            pdf.setFont('Helvetica-Bold', 11)
            pdf.drawString(50, y, title)
            y -= 16

            pdf.setFont('Helvetica', 10)
            for key, value in data.items():
                if y < 70:
                    pdf.showPage()
                    y = 800
                    pdf.setFont('Helvetica', 10)
                pdf.drawString(60, y, f"- {key}: {value}")
                y -= 13
            y -= 8

        pdf.showPage()
        pdf.save()

        return ExportArtifact(
            content=buffer.getvalue(),
            content_type='application/pdf',
            filename=f'reporte_superintendencia_{school_id}_{month}.pdf',
        )

    @staticmethod
    def _export_sige(payload: dict[str, Any], *, month: str, school_id: int) -> ExportArtifact:
        adapter_payload = SigeMinisterialAdapter.build_payload(payload)
        return ExportArtifact(
            content=json.dumps(adapter_payload, ensure_ascii=True, separators=(',', ':')).encode('utf-8'),
            content_type='application/json; charset=utf-8',
            filename=f'reporte_superintendencia_{school_id}_{month}_sige.json',
        )

    @staticmethod
    def to_json_bytes(payload: dict[str, Any]) -> bytes:
        return json.dumps(payload, ensure_ascii=True, separators=(',', ':')).encode('utf-8')
