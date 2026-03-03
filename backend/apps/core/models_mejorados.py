"""
Compatibilidad Fase 3.

Este módulo se mantiene por compatibilidad retroactiva.
La fuente canónica de estos modelos ahora es `backend.apps.core.models`.
"""

from backend.apps.core.models import (  # noqa: F401
    CambioEstado,
    CambioEstadoMatricula,
    CicloAcademico,
    EstadoMatricula,
    MatriculaMejorada,
)

__all__ = [
    'CicloAcademico',
    'CambioEstado',
    'EstadoMatricula',
    'MatriculaMejorada',
    'CambioEstadoMatricula',
]
