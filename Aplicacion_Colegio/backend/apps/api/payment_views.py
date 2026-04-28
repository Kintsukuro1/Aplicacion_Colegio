from __future__ import annotations

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from backend.apps.institucion.models import Colegio
from backend.apps.subscriptions.models import Plan
from backend.apps.subscriptions.services.payment_service import PaymentService


@api_view(['GET'])
@permission_classes([AllowAny])
def plans_list(request):
    plans = []
    for plan in PaymentService.list_active_plans():
        plans.append(
            {
                'codigo': plan.codigo,
                'nombre': plan.nombre,
                'descripcion': plan.descripcion,
                'precio_mensual': str(plan.precio_mensual),
                'destacado': plan.destacado,
                'is_trial': plan.is_trial,
                'is_unlimited': plan.is_unlimited,
                'limites': {
                    'estudiantes': plan.get_limite_display('max_estudiantes'),
                    'profesores': plan.get_limite_display('max_profesores'),
                    'cursos': plan.get_limite_display('max_cursos'),
                    'mensajes_mes': plan.get_limite_display('max_mensajes_mes'),
                    'evaluaciones_mes': plan.get_limite_display('max_evaluaciones_mes'),
                    'almacenamiento_mb': plan.get_limite_display('max_almacenamiento_mb'),
                },
                'features': {
                    'attendance': plan.has_attendance,
                    'grades': plan.has_grades,
                    'messaging': plan.has_messaging,
                    'reports': plan.has_reports,
                    'advanced_reports': plan.has_advanced_reports,
                    'attachments': plan.has_file_attachments,
                    'api_access': plan.has_api_access,
                    'priority_support': plan.has_priority_support,
                    'branding': plan.has_custom_branding,
                },
            }
        )
    return Response({'plans': plans}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_checkout(request):
    plan_codigo = str(request.data.get('plan_codigo') or '').strip()
    colegio_rbd = request.data.get('colegio_rbd') or getattr(request.user, 'rbd_colegio', None)
    if not plan_codigo:
        return Response({'detail': 'plan_codigo es requerido.'}, status=status.HTTP_400_BAD_REQUEST)
    if colegio_rbd is None:
        return Response({'detail': 'No se pudo resolver el colegio.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        colegio = Colegio.objects.get(rbd=colegio_rbd)
        plan = Plan.objects.get(codigo=plan_codigo, activo=True)
        result = PaymentService.create_checkout(colegio=colegio, plan=plan, user=request.user)
    except Colegio.DoesNotExist:
        return Response({'detail': 'Colegio no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
    except Plan.DoesNotExist:
        return Response({'detail': 'Plan no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
    except ValueError as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_409_CONFLICT)

    return Response(
        {
            'payment_id': result.payment_id,
            'external_id': result.external_id,
            'provider': result.provider,
            'status': result.status,
            'checkout_url': result.checkout_url,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_history(request):
    colegio_rbd = request.query_params.get('colegio_rbd') or getattr(request.user, 'rbd_colegio', None)
    if colegio_rbd is None:
        return Response({'detail': 'No se pudo resolver el colegio.'}, status=status.HTTP_400_BAD_REQUEST)

    payments = PaymentService.history_for_school(school_id=colegio_rbd)
    history = []
    for payment in payments:
        history.append(
            {
                'id': payment.id,
                'external_id': payment.external_id,
                'plan': payment.subscription.plan.nombre if payment.subscription and payment.subscription.plan else '',
                'monto': str(payment.monto),
                'moneda': payment.moneda,
                'status': payment.status,
                'gateway': payment.gateway,
                'fecha_pago': payment.fecha_pago.isoformat() if payment.fecha_pago else None,
                'fecha_creacion': payment.fecha_creacion.isoformat() if payment.fecha_creacion else None,
            }
        )

    return Response({'payments': history}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upgrade_subscription(request):
    """Upgrade a un plan superior.
    
    POST /api/v1/subscriptions/upgrade/
    {
        "plan_codigo": "premium",
        "colegio_rbd": 123  # opcional, usa rbd_colegio del usuario si no se proporciona
    }
    """
    plan_codigo = str(request.data.get('plan_codigo') or '').strip()
    colegio_rbd = request.data.get('colegio_rbd') or getattr(request.user, 'rbd_colegio', None)
    
    if not plan_codigo:
        return Response({'detail': 'plan_codigo es requerido.'}, status=status.HTTP_400_BAD_REQUEST)
    if colegio_rbd is None:
        return Response({'detail': 'No se pudo resolver el colegio.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        colegio = Colegio.objects.get(rbd=colegio_rbd)
        plan = Plan.objects.get(codigo=plan_codigo, activo=True)
        subscription = colegio.subscription
        subscription.upgrade_to(plan)
    except Colegio.DoesNotExist:
        return Response({'detail': 'Colegio no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
    except Plan.DoesNotExist:
        return Response({'detail': 'Plan no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_409_CONFLICT)

    return Response(
        {
            'detail': f'Suscripción actualizada a {plan.nombre}.',
            'plan_nombre': plan.nombre,
            'plan_codigo': plan.codigo,
            'fecha_inicio': subscription.fecha_inicio.isoformat(),
            'fecha_fin': subscription.fecha_fin.isoformat() if subscription.fecha_fin else None,
        },
        status=status.HTTP_200_OK,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_subscription(request):
    """Cancelar la suscripción actual.
    
    POST /api/v1/subscriptions/cancel/
    """
    colegio_rbd = request.data.get('colegio_rbd') or getattr(request.user, 'rbd_colegio', None)
    if colegio_rbd is None:
        return Response({'detail': 'No se pudo resolver el colegio.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        colegio = Colegio.objects.get(rbd=colegio_rbd)
        subscription = colegio.subscription
        if subscription.cancelar():
            return Response(
                {
                    'detail': 'Suscripción cancelada.',
                    'plan_nombre': subscription.plan.nombre,
                    'status': subscription.get_status_display(),
                },
                status=status.HTTP_200_OK,
            )
        else:
            return Response(
                {'detail': 'No se puede cancelar un plan ilimitado.'},
                status=status.HTTP_409_CONFLICT,
            )
    except Colegio.DoesNotExist:
        return Response({'detail': 'Colegio no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_409_CONFLICT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def renew_subscription(request):
    """Renovar la suscripción actual por X días.
    
    POST /api/v1/subscriptions/renew/
    {
        "dias": 30
    }
    """
    colegio_rbd = request.data.get('colegio_rbd') or getattr(request.user, 'rbd_colegio', None)
    dias = request.data.get('dias', 30)
    
    if colegio_rbd is None:
        return Response({'detail': 'No se pudo resolver el colegio.'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        colegio = Colegio.objects.get(rbd=colegio_rbd)
        subscription = colegio.subscription
        subscription.renovar(dias=dias)
        
        return Response(
            {
                'detail': f'Suscripción renovada por {dias} días.',
                'plan_nombre': subscription.plan.nombre,
                'fecha_fin': subscription.fecha_fin.isoformat() if subscription.fecha_fin else None,
                'status': subscription.get_status_display(),
            },
            status=status.HTTP_200_OK,
        )
    except Colegio.DoesNotExist:
        return Response({'detail': 'Colegio no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_409_CONFLICT)


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def payment_webhook(request):
    expected_token = getattr(settings, 'PAYMENT_WEBHOOK_TOKEN', '')
    if expected_token:
        provided_token = request.headers.get('X-Webhook-Token') or request.query_params.get('token')
        if provided_token != expected_token:
            return Response({'detail': 'Firma de webhook invalida.'}, status=status.HTTP_403_FORBIDDEN)

    payload = request.data if isinstance(request.data, dict) else {}
    try:
        payment = PaymentService.process_webhook(payload)
    except ValueError as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(
        {
            'detail': 'Webhook procesado.',
            'payment_id': payment.id if payment else None,
            'status': payment.status if payment else None,
        },
        status=status.HTTP_200_OK,
    )
