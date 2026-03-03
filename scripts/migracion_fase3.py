"""
Script de migración para Fase 3 - Domain Redesign
Migra datos existentes a los nuevos modelos con conceptos temporales
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from backend.apps.institucion.models import Colegio, CicloAcademico
from backend.apps.matriculas.models import Matricula
from backend.apps.accounts.models import User
from backend.apps.matriculas.models import EstadoMatricula, MatriculaMejorada, CambioEstadoMatricula


class Command(BaseCommand):
    help = 'Migra datos existentes a los nuevos modelos de dominio'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Ejecuta la migración sin guardar cambios',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        dry_run = options['dry_run']

        self.stdout.write(
            self.style.WARNING('🚀 Iniciando migración de dominio - Fase 3')
        )

        if dry_run:
            self.stdout.write(
                self.style.WARNING('🔍 MODO DRY-RUN: No se guardarán cambios')
            )

        # Paso 1: Crear ciclos académicos
        self.crear_ciclos_academicos(dry_run)

        # Paso 2: Crear estados de matrícula
        self.crear_estados_matricula(dry_run)

        # Paso 3: Migrar matrículas existentes
        self.migrar_matriculas(dry_run)

        self.stdout.write(
            self.style.SUCCESS('✅ Migración completada exitosamente')
        )

    def crear_ciclos_academicos(self, dry_run):
        """Crea ciclos académicos basados en los años escolares existentes"""
        self.stdout.write('📅 Creando ciclos académicos...')

        # Obtener años únicos de matrículas existentes
        anios = Matricula.objects.values_list('anio_escolar', flat=True).distinct()

        admin_user = User.objects.filter(is_superuser=True).first()
        if not admin_user:
            raise ValueError("No se encontró usuario administrador")

        ciclos_creados = 0
        for anio in anios:
            nombre_ciclo = f"{anio}-{anio+1}"

            # Verificar si ya existe
            if CicloAcademico.objects.filter(nombre=nombre_ciclo).exists():
                self.stdout.write(f'  ⏭️  Ciclo {nombre_ciclo} ya existe, saltando...')
                continue

            # Crear ciclo académico
            ciclo = CicloAcademico(
                colegio=Colegio.objects.first(),  # Asumir un colegio por ahora
                nombre=nombre_ciclo,
                fecha_inicio=f"{anio}-03-01",  # Inicio típico marzo
                fecha_fin=f"{anio+1}-12-31",  # Fin diciembre
                estado='CERRADO',  # Los ciclos históricos están cerrados
                periodos_config={
                    "periodos": [
                        {
                            "nombre": "Primer Semestre",
                            "inicio": f"{anio}-03-01",
                            "fin": f"{anio}-07-31"
                        },
                        {
                            "nombre": "Segundo Semestre",
                            "inicio": f"{anio}-08-01",
                            "fin": f"{anio}-12-20"
                        }
                    ]
                },
                creado_por=admin_user,
                modificado_por=admin_user
            )

            if not dry_run:
                ciclo.save()
                ciclos_creados += 1
                self.stdout.write(f'  ✅ Creado ciclo: {nombre_ciclo}')
            else:
                ciclos_creados += 1
                self.stdout.write(f'  🔍 [DRY-RUN] Se crearía ciclo: {nombre_ciclo}')

        self.stdout.write(
            self.style.SUCCESS(f'📊 Ciclos académicos procesados: {ciclos_creados}')
        )

    def crear_estados_matricula(self, dry_run):
        """Crea los estados de matrícula con sus transiciones"""
        self.stdout.write('🏷️  Creando estados de matrícula...')

        estados_data = [
            {
                'nombre': 'ACTIVO',
                'descripcion': 'Estudiante activo en el ciclo académico',
                'es_activo': True,
                'permite_cambios': True,
                'requiere_documentacion': False,
                'orden': 1
            },
            {
                'nombre': 'SUSPENDIDO',
                'descripcion': 'Estudiante suspendido temporalmente',
                'es_activo': False,
                'permite_cambios': True,
                'requiere_documentacion': True,
                'orden': 2
            },
            {
                'nombre': 'RETIRADO',
                'descripcion': 'Estudiante retirado del establecimiento',
                'es_activo': False,
                'permite_cambios': False,
                'requiere_documentacion': True,
                'orden': 3
            },
            {
                'nombre': 'FINALIZADO',
                'descripcion': 'Matrícula finalizada (graduado o terminó ciclo)',
                'es_activo': False,
                'permite_cambios': False,
                'requiere_documentacion': False,
                'orden': 4
            }
        ]

        estados_creados = []
        for estado_data in estados_data:
            estado, created = EstadoMatricula.objects.get_or_create(
                nombre=estado_data['nombre'],
                defaults=estado_data
            )

            if created:
                estados_creados.append(estado.nombre)
                if not dry_run:
                    self.stdout.write(f'  ✅ Creado estado: {estado.nombre}')
                else:
                    self.stdout.write(f'  🔍 [DRY-RUN] Se crearía estado: {estado.nombre}')

        # Configurar transiciones
        self.configurar_transiciones_estados(dry_run)

        self.stdout.write(
            self.style.SUCCESS(f'📊 Estados creados: {len(estados_creados)}')
        )

    def configurar_transiciones_estados(self, dry_run):
        """Configura las transiciones válidas entre estados"""
        transiciones = {
            'ACTIVO': ['SUSPENDIDO', 'RETIRADO', 'FINALIZADO'],
            'SUSPENDIDO': ['ACTIVO', 'RETIRADO'],
            'RETIRADO': [],  # Estado final
            'FINALIZADO': []  # Estado final
        }

        for estado_origen, estados_destino in transiciones.items():
            try:
                estado_orig = EstadoMatricula.objects.get(nombre=estado_origen)
                for estado_dest in estados_destino:
                    estado_dest_obj = EstadoMatricula.objects.get(nombre=estado_dest)
                    if not dry_run:
                        estado_orig.transiciones_posibles.add(estado_dest_obj)
                        self.stdout.write(f'  🔗 Agregada transición: {estado_origen} → {estado_dest}')
                    else:
                        self.stdout.write(f'  🔍 [DRY-RUN] Se agregaría transición: {estado_origen} → {estado_dest}')
            except EstadoMatricula.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'  ❌ Estado no encontrado: {estado_origen}')
                )

    def migrar_matriculas(self, dry_run):
        """Migra las matrículas existentes al nuevo modelo"""
        self.stdout.write('📚 Migrando matrículas existentes...')

        matriculas = Matricula.objects.all()
        admin_user = User.objects.filter(is_superuser=True).first()

        matriculas_migradas = 0
        errores = 0

        for matricula_antigua in matriculas:
            try:
                # Encontrar ciclo académico correspondiente
                ciclo = CicloAcademico.objects.filter(
                    nombre=f"{matricula_antigua.anio_escolar}-{matricula_antigua.anio_escolar+1}"
                ).first()

                if not ciclo:
                    self.stdout.write(
                        self.style.ERROR(f'  ❌ No se encontró ciclo para matrícula {matricula_antigua}')
                    )
                    errores += 1
                    continue

                # Mapear estado antiguo a nuevo
                estado_mapping = {
                    'ACTIVA': 'ACTIVO',
                    'SUSPENDIDA': 'SUSPENDIDO',
                    'RETIRADA': 'RETIRADO',
                    'FINALIZADA': 'FINALIZADO'
                }

                estado_nombre = estado_mapping.get(matricula_antigua.estado, 'ACTIVO')
                estado = EstadoMatricula.objects.get(nombre=estado_nombre)

                # Crear matrícula mejorada
                matricula_nueva = MatriculaMejorada(
                    estudiante=matricula_antigua.estudiante,
                    colegio=matricula_antigua.colegio,
                    ciclo_academico=ciclo,
                    curso=matricula_antigua.curso,
                    estado=estado,
                    fecha_inicio=matricula_antigua.fecha_inicio or ciclo.fecha_inicio,
                    fecha_fin=matricula_antigua.fecha_termino,
                    valor_matricula=matricula_antigua.valor_matricula,
                    creado_por=admin_user,
                    modificado_por=admin_user,
                    observaciones=matricula_antigua.observaciones or "",
                    numero_matricula=f"MIG_{matricula_antigua.pk}"
                )

                if not dry_run:
                    matricula_nueva.save()

                    # Crear registro de cambio de estado inicial
                    CambioEstadoMatricula.objects.create(
                        matricula=matricula_nueva,
                        estado_anterior=estado,  # Mismo estado inicial
                        estado_nuevo=estado,
                        cambiado_por=admin_user,
                        razon="Migración desde modelo anterior"
                    )

                    self.stdout.write(f'  ✅ Migrada matrícula: {matricula_nueva}')
                else:
                    self.stdout.write(f'  🔍 [DRY-RUN] Se migraría matrícula: {matricula_antigua}')

                matriculas_migradas += 1

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'  ❌ Error migrando matrícula {matricula_antigua}: {str(e)}')
                )
                errores += 1

        self.stdout.write(
            self.style.SUCCESS(f'📊 Matrículas migradas: {matriculas_migradas}')
        )
        if errores > 0:
            self.stdout.write(
                self.style.ERROR(f'📊 Errores: {errores}')
            )