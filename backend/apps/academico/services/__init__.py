# Academico services module
from .attendance_service import AttendanceService
from .asistencia_service import AsistenciaService
from .grades_service import GradesService
from .calificaciones_service import CalificacionesService
from .material_clase_service import MaterialClaseService
from .libro_clases_service import LibroClasesService
from .superintendencia_reports_service import SuperintendenciaReportsService

__all__ = [
	'AttendanceService',
	'AsistenciaService',
	'GradesService',
	'CalificacionesService',
	'MaterialClaseService',
	'LibroClasesService',
	'SuperintendenciaReportsService',
]
