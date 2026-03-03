"""
Servicio de gestión de usuarios.

Contrato Fase 2:
- create_user
- change_role
"""

from typing import Any, Dict, Optional

from django.db import transaction

from backend.apps.accounts.models import Role, User
from backend.apps.core.services.integrity_service import IntegrityService
from backend.common.services.policy_service import PolicyService
from backend.common.exceptions import PrerequisiteException
from backend.common.utils.auth_helpers import normalizar_rol


class UserService:
    """Servicio para operaciones críticas de usuarios."""

    ROLES_WITH_SCHOOL_REQUIRED = {
        'admin_escolar',
        'profesor',
        'estudiante',
        'apoderado',
        'asesor_financiero',
    }

    @staticmethod
    def validations(data: Dict[str, Any], *, user_id: Optional[int] = None) -> None:
        required = ['email', 'nombre', 'apellido_paterno', 'role_name']
        for key in required:
            if not data.get(key):
                raise ValueError(f'Parámetro requerido: {key}')

        email = str(data['email']).strip().lower()
        query = User.objects.filter(email__iexact=email)
        if user_id is not None:
            query = query.exclude(id=user_id)
        if query.exists():
            raise PrerequisiteException(
                error_type='DUPLICATE_RECORD',
                context={'field': 'email', 'value': email, 'message': 'El email ya está registrado.'}
            )

        rut = str(data.get('rut') or '').strip()
        if rut:
            rut_query = User.objects.filter(rut=rut)
            if user_id is not None:
                rut_query = rut_query.exclude(id=user_id)
            if rut_query.exists():
                raise PrerequisiteException(
                    error_type='DUPLICATE_RECORD',
                    context={'field': 'rut', 'value': rut, 'message': 'El RUT ya está registrado.'}
                )

        UserService._validate_school_requirement(data['role_name'], data.get('rbd_colegio'))

    @staticmethod
    def create(actor, data: Dict[str, Any]) -> User:
        UserService.validations(data)
        return UserService.create_user(
            actor=actor,
            email=data['email'],
            role_name=data['role_name'],
            nombre=data['nombre'],
            apellido_paterno=data['apellido_paterno'],
            password=data.get('password'),
            rbd_colegio=data.get('rbd_colegio'),
            apellido_materno=data.get('apellido_materno'),
            rut=data.get('rut'),
            is_active=bool(data.get('is_active', True)),
        )

    @staticmethod
    def update(actor, user_id: int, data: Dict[str, Any]) -> User:
        target_user = User.objects.get(id=user_id)
        payload = {
            'email': data.get('email', target_user.email),
            'nombre': data.get('nombre', target_user.nombre),
            'apellido_paterno': data.get('apellido_paterno', target_user.apellido_paterno),
            'role_name': data.get('role_name', target_user.role.nombre if target_user.role else ''),
            'apellido_materno': data.get('apellido_materno', target_user.apellido_materno),
            'rut': data.get('rut', target_user.rut),
            'rbd_colegio': data.get('rbd_colegio', target_user.rbd_colegio),
            'is_active': data.get('is_active', target_user.is_active),
        }
        UserService.validations(payload, user_id=user_id)

        school_rbd = payload.get('rbd_colegio')
        if school_rbd is not None:
            IntegrityService.validate_usuario_update(school_rbd)

        role_name = payload['role_name']
        role, _ = Role.objects.get_or_create(nombre=role_name)
        target_user.email = str(payload['email']).strip().lower()
        target_user.nombre = str(payload['nombre']).strip()
        target_user.apellido_paterno = str(payload['apellido_paterno']).strip()
        target_user.apellido_materno = (str(payload.get('apellido_materno') or '').strip() or None)
        target_user.rut = (str(payload.get('rut') or '').strip() or None)
        target_user.rbd_colegio = payload.get('rbd_colegio')
        target_user.is_active = bool(payload.get('is_active', True))
        target_user.role = role
        target_user.save()
        return target_user

    @staticmethod
    def delete(actor, user_id: int) -> None:
        target_user = User.objects.get(id=user_id)
        if target_user.rbd_colegio is not None:
            IntegrityService.validate_usuario_deletion(target_user.rbd_colegio)
        target_user.is_active = False
        target_user.save(update_fields=['is_active'])

    @staticmethod
    def get(user_id: int) -> User:
        return User.objects.select_related('role').get(id=user_id)

    @staticmethod
    def execute(operation: str, params: Dict[str, Any]) -> Any:
        UserService.validate(operation, params)
        return UserService._execute(operation, params)

    @staticmethod
    def validate(operation: str, params: Dict[str, Any]) -> None:
        if operation == 'create_user':
            required = ['email', 'nombre', 'apellido_paterno', 'role_name']
            for key in required:
                if not params.get(key):
                    raise ValueError(f'Parámetro requerido: {key}')
            return

        if operation == 'change_role':
            if params.get('target_user_id') is None:
                raise ValueError('Parámetro requerido: target_user_id')
            if not params.get('new_role_name'):
                raise ValueError('Parámetro requerido: new_role_name')
            return

        raise ValueError(f'Operación no soportada: {operation}')

    @staticmethod
    def _execute(operation: str, params: Dict[str, Any]) -> Any:
        if operation == 'create_user':
            return UserService._execute_create_user(params)
        if operation == 'change_role':
            return UserService._execute_change_role(params)
        raise ValueError(f'Operación no soportada: {operation}')

    @staticmethod
    def _normalize_role(role_name: str) -> str:
        return normalizar_rol(role_name or '')

    @staticmethod
    def _validate_role_profile_consistency(user: User, target_role_name: str) -> None:
        target_role_normalized = UserService._normalize_role(target_role_name)

        if hasattr(user, 'perfil_estudiante') and target_role_normalized != 'estudiante':
            raise PrerequisiteException(
                error_type='INVALID_STATE',
                context={
                    'user_id': user.id,
                    'target_role': target_role_name,
                    'message': 'No se puede cambiar rol: el usuario tiene perfil de estudiante activo.',
                }
            )

        if hasattr(user, 'perfil_profesor') and target_role_normalized != 'profesor':
            raise PrerequisiteException(
                error_type='INVALID_STATE',
                context={
                    'user_id': user.id,
                    'target_role': target_role_name,
                    'message': 'No se puede cambiar rol: el usuario tiene perfil de profesor activo.',
                }
            )

    @staticmethod
    def _validate_school_requirement(role_name: str, school_rbd: Optional[int]) -> None:
        normalized_role = UserService._normalize_role(role_name)
        if normalized_role in UserService.ROLES_WITH_SCHOOL_REQUIRED and school_rbd is None:
            raise PrerequisiteException(
                error_type='MISSING_REQUIRED_FIELD',
                context={
                    'field': 'rbd_colegio',
                    'role': role_name,
                    'message': 'El rol requiere colegio asociado.',
                }
            )

    @staticmethod
    def create_user(
        actor,
        email: str,
        role_name: str,
        nombre: str,
        apellido_paterno: str,
        password: Optional[str] = None,
        rbd_colegio: Optional[int] = None,
        apellido_materno: Optional[str] = None,
        rut: Optional[str] = None,
        is_active: bool = True,
    ) -> User:
        return UserService.execute('create_user', {
            'actor': actor,
            'email': email,
            'role_name': role_name,
            'nombre': nombre,
            'apellido_paterno': apellido_paterno,
            'password': password,
            'rbd_colegio': rbd_colegio,
            'apellido_materno': apellido_materno,
            'rut': rut,
            'is_active': is_active,
        })

    @staticmethod
    def _execute_create_user(params: Dict[str, Any]) -> User:
        email = str(params['email']).strip().lower()
        role_name = str(params['role_name']).strip()
        school_rbd = params.get('rbd_colegio')
        rut = str(params.get('rut') or '').strip() or None

        UserService._validate_school_requirement(role_name, school_rbd)

        if school_rbd is not None:
            IntegrityService.validate_usuario_creation(school_rbd)

        if User.objects.filter(email__iexact=email).exists():
            raise PrerequisiteException(
                error_type='DUPLICATE_RECORD',
                context={'field': 'email', 'value': email, 'message': 'El email ya está registrado.'}
            )

        if rut and User.objects.filter(rut=rut).exists():
            raise PrerequisiteException(
                error_type='DUPLICATE_RECORD',
                context={'field': 'rut', 'value': rut, 'message': 'El RUT ya está registrado.'}
            )

        role, _ = Role.objects.get_or_create(nombre=role_name)

        with transaction.atomic():
            user = User.objects.create_user(
                email=email,
                password=params.get('password'),
                nombre=str(params['nombre']).strip(),
                apellido_paterno=str(params['apellido_paterno']).strip(),
                apellido_materno=(str(params.get('apellido_materno') or '').strip() or None),
                rut=rut,
                rbd_colegio=school_rbd,
                role=role,
                is_active=bool(params.get('is_active', True)),
            )

        return user

    @staticmethod
    def change_role(actor, target_user_id: int, new_role_name: str) -> User:
        return UserService.execute('change_role', {
            'actor': actor,
            'target_user_id': target_user_id,
            'new_role_name': new_role_name,
        })

    @staticmethod
    def _execute_change_role(params: Dict[str, Any]) -> User:
        actor = params.get('actor')
        target_user_id = params['target_user_id']
        new_role_name = str(params['new_role_name']).strip()

        target_user = User.objects.select_related('role').get(id=target_user_id)
        has_global_scope = PolicyService.has_capability(actor, 'SYSTEM_ADMIN') is True if actor else False

        if not has_global_scope:
            if actor is None or actor.rbd_colegio != target_user.rbd_colegio:
                raise PrerequisiteException(
                    error_type='FORBIDDEN',
                    context={'message': 'No puede cambiar el rol de un usuario de otro colegio.'}
                )

        UserService._validate_role_profile_consistency(target_user, new_role_name)

        if target_user.rbd_colegio is not None:
            IntegrityService.validate_usuario_update(target_user.rbd_colegio)

        role, _ = Role.objects.get_or_create(nombre=new_role_name)
        target_user.role = role
        target_user.save(update_fields=['role'])
        return target_user
