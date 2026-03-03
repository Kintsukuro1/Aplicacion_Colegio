"""
Modelos Fase 3 (Domain Redesign).

Este módulo es la ubicación canónica de los modelos que históricamente
estuvieron en ``models_mejorados.py``.
"""

from django.db import models
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from decimal import Decimal
from backend.apps.institucion.models import Colegio, CicloAcademico  # noqa: F401
from backend.apps.accounts.models import User

# Importar modelos de nuevos roles para que Django los descubra
from backend.apps.core.models_nuevos_roles import (  # noqa: F401
    AnotacionConvivencia, JustificativoInasistencia,
    EntrevistaOrientacion, DerivacionExterna,
    TicketSoporte, RecursoDigital, PrestamoRecurso,
)


class CambioEstado(models.Model):
    ciclo_academico = models.ForeignKey(
        CicloAcademico,
        on_delete=models.CASCADE,
        related_name='cambios_estado'
    )

    estado_anterior = models.CharField(max_length=20, choices=CicloAcademico.ESTADOS)
    estado_nuevo = models.CharField(max_length=20, choices=CicloAcademico.ESTADOS)

    cambiado_por = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='cambios_estado_realizados'
    )

    fecha_cambio = models.DateTimeField(auto_now_add=True)
    razon = models.TextField(blank=True)

    class Meta:
        db_table = 'cambio_estado_ciclo'
        verbose_name = 'Cambio de Estado'
        verbose_name_plural = 'Cambios de Estado'
        ordering = ['-fecha_cambio']

    def __str__(self):
        return f"{self.ciclo_academico.nombre}: {self.estado_anterior} → {self.estado_nuevo}"


class EstadoMatricula(models.Model):
    ESTADOS_CHOICES = [
        ('PREMATRICULA', 'Pre-matrícula'),
        ('MATRICULADO', 'Matriculado'),
        ('ACTIVO', 'Activo'),
        ('INACTIVO_TEMPORAL', 'Inactivo Temporal'),
        ('SUSPENDIDO', 'Suspendido'),
        ('RETIRADO', 'Retirado'),
        ('GRADUADO', 'Graduado'),
        ('CERRADO', 'Cerrado'),
    ]

    nombre = models.CharField(max_length=50, unique=True, choices=ESTADOS_CHOICES)
    descripcion = models.TextField()
    es_activo = models.BooleanField(default=True, help_text="Si el estudiante puede acceder al sistema")
    permite_cambios = models.BooleanField(default=True, help_text="Si se permiten modificaciones en este estado")
    requiere_documentacion = models.BooleanField(default=False, help_text="Si requiere documentación especial")
    transiciones_posibles = models.ManyToManyField(
        'self',
        blank=True,
        symmetrical=False,
        help_text="Estados a los que se puede transitar desde este"
    )
    activo = models.BooleanField(default=True)
    orden = models.IntegerField(default=0)

    class Meta:
        db_table = 'estado_matricula'
        verbose_name = 'Estado de Matrícula'
        verbose_name_plural = 'Estados de Matrícula'
        ordering = ['orden']

    def __str__(self):
        return f"{self.nombre} - {self.descripcion[:50]}"


class MatriculaMejorada(models.Model):
    estudiante = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='matriculas_mejoradas'
    )

    colegio = models.ForeignKey(
        Colegio,
        on_delete=models.CASCADE,
        related_name='matriculas_mejoradas'
    )

    ciclo_academico = models.ForeignKey(
        CicloAcademico,
        on_delete=models.CASCADE,
        related_name='matriculas_mejoradas_ciclo'
    )

    curso = models.ForeignKey(
        'cursos.Curso',
        on_delete=models.PROTECT,
        related_name='matriculas_mejoradas'
    )

    estado = models.ForeignKey(
        EstadoMatricula,
        on_delete=models.PROTECT,
        related_name='matriculas'
    )

    fecha_inicio = models.DateField()
    fecha_fin = models.DateField(null=True, blank=True)

    valor_matricula = models.DecimalField(
        max_digits=10,
        decimal_places=0,
        default=0,
        validators=[MinValueValidator(Decimal('0'))]
    )

    creado_por = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='matriculas_creadas'
    )
    modificado_por = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='matriculas_modificadas'
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)

    observaciones = models.TextField(blank=True)
    numero_matricula = models.CharField(
        max_length=20,
        unique=True,
        help_text="Número único de matrícula"
    )

    class Meta:
        db_table = 'matricula_mejorada'
        verbose_name = 'Matrícula Mejorada'
        verbose_name_plural = 'Matrículas Mejoradas'
        unique_together = ('estudiante', 'ciclo_academico')
        ordering = ['-fecha_creacion']
        constraints = [
            models.CheckConstraint(
                condition=models.Q(fecha_inicio__lte=models.F('fecha_fin')) | models.Q(fecha_fin__isnull=True),
                name='matricula_fechas_validas'
            ),
        ]

    def __str__(self):
        return f"{self.estudiante.get_full_name()} - {self.ciclo_academico.nombre}"

    def clean(self):
        super().clean()

        if self.fecha_inicio < self.ciclo_academico.fecha_inicio:
            raise ValidationError('La fecha de inicio debe ser posterior al inicio del ciclo académico')

        if self.fecha_fin and self.fecha_fin > self.ciclo_academico.fecha_fin:
            raise ValidationError('La fecha fin no puede ser posterior al fin del ciclo académico')

        if self.estado.es_activo:
            matriculas_activas = MatriculaMejorada.objects.filter(
                estudiante=self.estudiante,
                ciclo_academico=self.ciclo_academico,
                estado__es_activo=True
            ).exclude(pk=self.pk)

            if matriculas_activas.exists():
                raise ValidationError('El estudiante ya tiene una matrícula activa en este ciclo académico')

    def puede_cambiar_estado(self, nuevo_estado):
        return self.estado.transiciones_posibles.filter(pk=nuevo_estado.pk).exists()

    def cambiar_estado(self, nuevo_estado, usuario, razon=""):
        if not self.puede_cambiar_estado(nuevo_estado):
            raise ValidationError(
                f'No se puede cambiar del estado {self.estado.nombre} al estado {nuevo_estado.nombre}'
            )

        CambioEstadoMatricula.objects.create(
            matricula=self,
            estado_anterior=self.estado,
            estado_nuevo=nuevo_estado,
            cambiado_por=usuario,
            razon=razon or "Cambio manual de estado"
        )

        self.estado = nuevo_estado
        self.modificado_por = usuario
        self.save()


class CambioEstadoMatricula(models.Model):
    matricula = models.ForeignKey(
        MatriculaMejorada,
        on_delete=models.CASCADE,
        related_name='cambios_estado'
    )

    estado_anterior = models.ForeignKey(
        EstadoMatricula,
        on_delete=models.PROTECT,
        related_name='cambios_desde'
    )
    estado_nuevo = models.ForeignKey(
        EstadoMatricula,
        on_delete=models.PROTECT,
        related_name='cambios_hacia'
    )

    cambiado_por = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='cambios_estado_matricula'
    )

    fecha_cambio = models.DateTimeField(auto_now_add=True)
    razon = models.TextField(blank=True)

    class Meta:
        db_table = 'cambio_estado_matricula'
        verbose_name = 'Cambio de Estado de Matrícula'
        verbose_name_plural = 'Cambios de Estado de Matrícula'
        ordering = ['-fecha_cambio']

    def __str__(self):
        return f"{self.matricula}: {self.estado_anterior.nombre} → {self.estado_nuevo.nombre}"
