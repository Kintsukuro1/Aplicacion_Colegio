"""
Modelos de dominio para los nuevos roles del sistema.

- AnotacionConvivencia e JustificativoInasistencia → Inspector Convivencia
- EntrevistaOrientacion y DerivacionExterna → Psicólogo Orientador
- TicketSoporte → Soporte Técnico Escolar
- RecursoDigital y PrestamoRecurso → Bibliotecario Digital
"""

from django.db import models
from django.utils import timezone

from backend.apps.accounts.models import User
from backend.apps.cursos.models import Asignatura
from backend.apps.institucion.models import Colegio, CicloAcademico, NivelEducativo
from backend.common.tenancy import TenantManager


# ---------------------------------------------------------------------------
# Inspector Convivencia
# ---------------------------------------------------------------------------

class AnotacionConvivencia(models.Model):
    """Anotaciones positivas, negativas o neutras registradas por el inspector."""

    TIPOS = [
        ('POSITIVA', 'Positiva'),
        ('NEGATIVA', 'Negativa'),
        ('NEUTRA', 'Neutra'),
    ]

    CATEGORIAS = [
        ('COMPORTAMIENTO', 'Comportamiento'),
        ('PUNTUALIDAD', 'Puntualidad'),
        ('UNIFORME', 'Uniforme'),
        ('CONVIVENCIA', 'Convivencia'),
        ('OTRO', 'Otro'),
    ]

    GRAVEDADES = [
        (1, 'Leve'),
        (2, 'Moderada'),
        (3, 'Grave'),
    ]

    id_anotacion = models.AutoField(primary_key=True)
    estudiante = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='anotaciones_convivencia',
        limit_choices_to={'role__nombre': 'Alumno'},
    )
    colegio = models.ForeignKey(Colegio, on_delete=models.CASCADE, related_name='anotaciones_convivencia')
    tipo = models.CharField(max_length=10, choices=TIPOS)
    categoria = models.CharField(max_length=20, choices=CATEGORIAS, default='OTRO')
    descripcion = models.TextField()
    gravedad = models.IntegerField(choices=GRAVEDADES, default=1)
    registrado_por = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name='anotaciones_registradas',
    )
    fecha = models.DateTimeField(default=timezone.now)
    notificado_apoderado = models.BooleanField(default=False)
    fecha_notificacion = models.DateTimeField(null=True, blank=True)

    # Metadata
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    objects = TenantManager(school_field='colegio_id')

    class Meta:
        db_table = 'anotacion_convivencia'
        verbose_name = 'Anotación de Convivencia'
        verbose_name_plural = 'Anotaciones de Convivencia'
        ordering = ['-fecha']
        indexes = [
            models.Index(fields=['estudiante', '-fecha']),
            models.Index(fields=['colegio', '-fecha']),
            models.Index(fields=['tipo']),
        ]

    def __str__(self):
        return f"{self.get_tipo_display()} - {self.estudiante.get_full_name()} - {self.fecha.strftime('%d/%m/%Y')}"


class JustificativoInasistencia(models.Model):
    """Justificativos de inasistencia presentados por apoderados y revisados por el inspector."""

    TIPOS = [
        ('MEDICO', 'Médico'),
        ('FAMILIAR', 'Familiar'),
        ('OTRO', 'Otro'),
    ]

    ESTADOS = [
        ('PENDIENTE', 'Pendiente'),
        ('APROBADO', 'Aprobado'),
        ('RECHAZADO', 'Rechazado'),
    ]

    id_justificativo = models.AutoField(primary_key=True)
    estudiante = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='justificativos_inasistencia',
        limit_choices_to={'role__nombre': 'Alumno'},
    )
    colegio = models.ForeignKey(Colegio, on_delete=models.CASCADE, related_name='justificativos_inasistencia')
    fecha_ausencia = models.DateField()
    fecha_fin_ausencia = models.DateField(
        null=True, blank=True,
        help_text='Dejar vacío si la ausencia fue de un solo día',
    )
    motivo = models.TextField()
    tipo = models.CharField(max_length=10, choices=TIPOS, default='OTRO')
    documento_adjunto = models.FileField(upload_to='justificativos/%Y/%m/', null=True, blank=True)
    estado = models.CharField(max_length=10, choices=ESTADOS, default='PENDIENTE')
    presentado_por = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name='justificativos_presentados',
        help_text='Apoderado o encargado que presenta el justificativo',
    )
    revisado_por = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='justificativos_revisados',
    )
    fecha_revision = models.DateTimeField(null=True, blank=True)
    observaciones_revision = models.TextField(blank=True, default='')

    # Metadata
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    objects = TenantManager(school_field='colegio_id')

    class Meta:
        db_table = 'justificativo_inasistencia'
        verbose_name = 'Justificativo de Inasistencia'
        verbose_name_plural = 'Justificativos de Inasistencia'
        ordering = ['-fecha_ausencia']
        indexes = [
            models.Index(fields=['estudiante', '-fecha_ausencia']),
            models.Index(fields=['estado']),
        ]

    def __str__(self):
        return f"{self.estudiante.get_full_name()} - {self.fecha_ausencia} ({self.get_estado_display()})"


# ---------------------------------------------------------------------------
# Psicólogo Orientador
# ---------------------------------------------------------------------------

class EntrevistaOrientacion(models.Model):
    """Entrevistas de orientación psicológica — datos confidenciales."""

    MOTIVOS = [
        ('ACADEMICO', 'Académico'),
        ('SOCIOEMOCIONAL', 'Socioemocional'),
        ('CONDUCTUAL', 'Conductual'),
        ('FAMILIAR', 'Familiar'),
        ('DERIVACION', 'Derivación'),
    ]

    id_entrevista = models.AutoField(primary_key=True)
    estudiante = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='entrevistas_orientacion',
        limit_choices_to={'role__nombre': 'Alumno'},
    )
    colegio = models.ForeignKey(Colegio, on_delete=models.CASCADE, related_name='entrevistas_orientacion')
    psicologo = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name='entrevistas_realizadas',
    )
    fecha = models.DateTimeField()
    motivo = models.CharField(max_length=20, choices=MOTIVOS)
    observaciones = models.TextField(help_text='Notas confidenciales de la entrevista')
    acuerdos = models.TextField(blank=True, default='')
    recomendaciones_profesor = models.TextField(
        blank=True, default='',
        help_text='Recomendaciones visibles para el profesor jefe (no confidenciales)',
    )
    seguimiento_requerido = models.BooleanField(default=False)
    fecha_siguiente_sesion = models.DateField(null=True, blank=True)
    confidencial = models.BooleanField(default=True)

    # Metadata
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    objects = TenantManager(school_field='colegio_id')

    class Meta:
        db_table = 'entrevista_orientacion'
        verbose_name = 'Entrevista de Orientación'
        verbose_name_plural = 'Entrevistas de Orientación'
        ordering = ['-fecha']
        indexes = [
            models.Index(fields=['estudiante', '-fecha']),
            models.Index(fields=['psicologo', '-fecha']),
        ]

    def __str__(self):
        return f"Entrevista {self.estudiante.get_full_name()} - {self.fecha.strftime('%d/%m/%Y')}"


class DerivacionExterna(models.Model):
    """Derivaciones a profesionales externos."""

    ESTADOS = [
        ('PENDIENTE', 'Pendiente'),
        ('EN_PROCESO', 'En proceso'),
        ('COMPLETADA', 'Completada'),
        ('CANCELADA', 'Cancelada'),
    ]

    id_derivacion = models.AutoField(primary_key=True)
    estudiante = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='derivaciones_externas',
        limit_choices_to={'role__nombre': 'Alumno'},
    )
    colegio = models.ForeignKey(Colegio, on_delete=models.CASCADE, related_name='derivaciones_externas')
    derivado_por = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name='derivaciones_realizadas',
    )
    profesional_destino = models.CharField(max_length=200)
    especialidad = models.CharField(max_length=100)
    motivo = models.TextField()
    estado = models.CharField(max_length=12, choices=ESTADOS, default='PENDIENTE')
    fecha_derivacion = models.DateField()
    fecha_retorno = models.DateField(null=True, blank=True)
    informe_retorno = models.TextField(blank=True, default='')

    # Metadata
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    objects = TenantManager(school_field='colegio_id')

    class Meta:
        db_table = 'derivacion_externa'
        verbose_name = 'Derivación Externa'
        verbose_name_plural = 'Derivaciones Externas'
        ordering = ['-fecha_derivacion']
        indexes = [
            models.Index(fields=['estudiante', '-fecha_derivacion']),
            models.Index(fields=['estado']),
        ]

    def __str__(self):
        return f"{self.estudiante.get_full_name()} → {self.profesional_destino} ({self.get_estado_display()})"


# ---------------------------------------------------------------------------
# Soporte Técnico Escolar
# ---------------------------------------------------------------------------

class TicketSoporte(models.Model):
    """Tickets de soporte técnico reportados por usuarios del colegio."""

    CATEGORIAS = [
        ('ACCESO', 'Problemas de acceso'),
        ('PLATAFORMA', 'Error en plataforma'),
        ('CONTRASEÑA', 'Reset de contraseña'),
        ('OTRO', 'Otro'),
    ]

    PRIORIDADES = [
        ('BAJA', 'Baja'),
        ('MEDIA', 'Media'),
        ('ALTA', 'Alta'),
        ('URGENTE', 'Urgente'),
    ]

    ESTADOS = [
        ('ABIERTO', 'Abierto'),
        ('EN_PROGRESO', 'En progreso'),
        ('RESUELTO', 'Resuelto'),
        ('CERRADO', 'Cerrado'),
    ]

    id_ticket = models.AutoField(primary_key=True)
    colegio = models.ForeignKey(Colegio, on_delete=models.CASCADE, related_name='tickets_soporte')
    reportado_por = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='tickets_reportados',
    )
    asignado_a = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='tickets_asignados',
    )
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField()
    categoria = models.CharField(max_length=12, choices=CATEGORIAS, default='OTRO')
    prioridad = models.CharField(max_length=8, choices=PRIORIDADES, default='MEDIA')
    estado = models.CharField(max_length=12, choices=ESTADOS, default='ABIERTO')
    resolucion = models.TextField(blank=True, default='')
    fecha_resolucion = models.DateTimeField(null=True, blank=True)

    # Metadata
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    objects = TenantManager(school_field='colegio_id')

    class Meta:
        db_table = 'ticket_soporte'
        verbose_name = 'Ticket de Soporte'
        verbose_name_plural = 'Tickets de Soporte'
        ordering = ['-fecha_creacion']
        indexes = [
            models.Index(fields=['estado', '-fecha_creacion']),
            models.Index(fields=['prioridad']),
            models.Index(fields=['asignado_a', 'estado']),
        ]

    def __str__(self):
        return f"#{self.id_ticket} {self.titulo} ({self.get_estado_display()})"


# ---------------------------------------------------------------------------
# Bibliotecario Digital
# ---------------------------------------------------------------------------

class RecursoDigital(models.Model):
    """Recursos educativos digitales gestionados por el bibliotecario."""

    TIPOS = [
        ('LIBRO', 'Libro'),
        ('VIDEO', 'Video'),
        ('DOCUMENTO', 'Documento'),
        ('ENLACE', 'Enlace'),
        ('SOFTWARE', 'Software'),
        ('MATERIAL_CRA', 'Material CRA/Didáctico'),
    ]

    id_recurso = models.AutoField(primary_key=True)
    colegio = models.ForeignKey(Colegio, on_delete=models.CASCADE, related_name='recursos_digitales')
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, default='')
    tipo = models.CharField(max_length=12, choices=TIPOS, default='DOCUMENTO')
    asignatura = models.ForeignKey(
        Asignatura, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='recursos_digitales',
    )
    nivel = models.ForeignKey(
        NivelEducativo, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='recursos_digitales',
    )
    archivo = models.FileField(upload_to='recursos_digitales/%Y/%m/', null=True, blank=True)
    url_externa = models.URLField(blank=True, default='')
    publicado = models.BooleanField(default=False)
    es_plan_lector = models.BooleanField(default=False, help_text="Indica si el recurso pertenece al Plan Lector obligatorio")
    publicado_por = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name='recursos_publicados',
    )
    descargas = models.IntegerField(default=0)

    # Metadata
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    objects = TenantManager(school_field='colegio_id')

    class Meta:
        db_table = 'recurso_digital'
        verbose_name = 'Recurso Digital'
        verbose_name_plural = 'Recursos Digitales'
        ordering = ['-fecha_creacion']
        indexes = [
            models.Index(fields=['colegio', 'tipo']),
            models.Index(fields=['publicado']),
        ]

    def __str__(self):
        return f"{self.titulo} ({self.get_tipo_display()})"


class PrestamoRecurso(models.Model):
    """Préstamos de recursos (libros físicos o licencias digitales)."""

    ESTADOS = [
        ('ACTIVO', 'Activo'),
        ('DEVUELTO', 'Devuelto'),
        ('VENCIDO', 'Vencido'),
    ]

    id_prestamo = models.AutoField(primary_key=True)
    recurso = models.ForeignKey(RecursoDigital, on_delete=models.CASCADE, related_name='prestamos')
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='prestamos_recursos')
    colegio = models.ForeignKey(Colegio, on_delete=models.CASCADE, related_name='prestamos_recursos')
    fecha_prestamo = models.DateField(auto_now_add=True)
    fecha_devolucion_esperada = models.DateField()
    fecha_devolucion_real = models.DateField(null=True, blank=True)
    estado = models.CharField(max_length=10, choices=ESTADOS, default='ACTIVO')

    # Metadata
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    objects = TenantManager(school_field='colegio_id')

    class Meta:
        db_table = 'prestamo_recurso'
        verbose_name = 'Préstamo de Recurso'
        verbose_name_plural = 'Préstamos de Recursos'
        ordering = ['-fecha_prestamo']
        indexes = [
            models.Index(fields=['usuario', 'estado']),
            models.Index(fields=['recurso', 'estado']),
        ]

    def __str__(self):
        return f"{self.usuario.get_full_name()} - {self.recurso.titulo} ({self.get_estado_display()})"

    @property
    def esta_vencido(self):
        """Verifica si el préstamo está vencido."""
        if self.estado == 'ACTIVO' and self.fecha_devolucion_esperada:
            from datetime import date
            return date.today() > self.fecha_devolucion_esperada
        return False
