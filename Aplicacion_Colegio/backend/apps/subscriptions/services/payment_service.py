"""Servicio de pagos para suscripciones."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, Iterable, Optional

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from backend.apps.institucion.models import Colegio
from backend.apps.subscriptions.models import Payment, Plan, Subscription


@dataclass(frozen=True)
class CheckoutResult:
    payment_id: int
    external_id: str
    checkout_url: str
    provider: str
    status: str


class PaymentService:
    """Operaciones de dominio para pagos y checkout."""

    DEFAULT_PROVIDER = 'mercadopago'

    @staticmethod
    def list_active_plans() -> Iterable[Plan]:
        return Plan.objects.filter(activo=True).order_by('orden_visualizacion', 'precio_mensual')

    @staticmethod
    def create_checkout(*, colegio: Colegio, plan: Plan, user=None) -> CheckoutResult:
        subscription = Subscription.objects.select_related('plan', 'colegio').get(colegio=colegio)
        if subscription.is_active() and subscription.plan_id == plan.id:
            raise ValueError('El colegio ya tiene este plan activo.')

        external_id = uuid.uuid4().hex
        payment = Payment.objects.create(
            subscription=subscription,
            external_id=external_id,
            monto=PaymentService._plan_amount(plan),
            moneda='CLP',
            status=Payment.STATUS_PENDING,
            gateway=PaymentService.DEFAULT_PROVIDER,
            metadata_json={
                'plan_codigo': plan.codigo,
                'plan_nombre': plan.nombre,
                'colegio_rbd': colegio.rbd,
                'requested_by': getattr(user, 'id', None),
            },
        )

        checkout_url = PaymentService._build_checkout_url(payment=payment, plan=plan, colegio=colegio)
        return CheckoutResult(
            payment_id=payment.id,
            external_id=payment.external_id,
            checkout_url=checkout_url,
            provider=payment.gateway,
            status=payment.status,
        )

    @staticmethod
    def process_webhook(payload: Dict[str, Any]) -> Optional[Payment]:
        external_id = (
            payload.get('external_reference')
            or payload.get('external_id')
            or payload.get('id')
            or payload.get('data', {}).get('id')
        )
        if external_id is None:
            raise ValueError('Webhook sin external_id/external_reference.')

        payment = Payment.objects.select_related('subscription__plan', 'subscription__colegio').filter(
            external_id=str(external_id)
        ).first()
        if payment is None:
            raise ValueError('Pago no encontrado.')

        status = PaymentService._normalize_status(payload)
        if status == Payment.STATUS_APPROVED:
            PaymentService._apply_approved_payment(payment=payment, payload=payload)
        elif status == Payment.STATUS_REJECTED:
            payment.mark_rejected()
        else:
            payment.metadata_json = {**payment.metadata_json, 'webhook_payload': payload}
            payment.save(update_fields=['metadata_json', 'fecha_actualizacion'])

        return payment

    @staticmethod
    def history_for_school(*, school_id: int):
        return Payment.objects.select_related('subscription__plan', 'subscription__colegio').filter(
            subscription__colegio_id=school_id
        ).order_by('-fecha_creacion')

    @staticmethod
    def _apply_approved_payment(*, payment: Payment, payload: Dict[str, Any]) -> None:
        subscription = payment.subscription
        plan = subscription.plan
        paid_at = PaymentService._parse_paid_at(payload) or timezone.now()

        with transaction.atomic():
            payment.metadata_json = {**payment.metadata_json, 'webhook_payload': payload}
            payment.mark_approved(paid_at=paid_at)

            if plan.is_unlimited:
                subscription.plan = plan
                subscription.fecha_inicio = paid_at.date()
                subscription.fecha_fin = None
                subscription.fecha_ultimo_pago = paid_at.date()
                subscription.proximo_pago = None
                subscription.status = Subscription.STATUS_ACTIVE
                subscription.save(
                    update_fields=['plan', 'fecha_inicio', 'fecha_fin', 'fecha_ultimo_pago', 'proximo_pago', 'status', 'fecha_modificacion']
                )
                return

            dias = plan.duracion_dias or 30
            subscription.plan = plan
            subscription.fecha_inicio = paid_at.date()
            subscription.fecha_fin = paid_at.date() + timedelta(days=dias)
            subscription.fecha_ultimo_pago = paid_at.date()
            subscription.proximo_pago = subscription.fecha_fin
            subscription.status = Subscription.STATUS_ACTIVE
            subscription.save(
                update_fields=['plan', 'fecha_inicio', 'fecha_fin', 'fecha_ultimo_pago', 'proximo_pago', 'status', 'fecha_modificacion']
            )

    @staticmethod
    def _normalize_status(payload: Dict[str, Any]) -> str:
        raw_status = (
            payload.get('status')
            or payload.get('payment_status')
            or payload.get('collection_status')
            or payload.get('data', {}).get('status')
            or ''
        )
        normalized = str(raw_status).strip().lower()
        if normalized in {'approved', 'paid', 'paid_out'}:
            return Payment.STATUS_APPROVED
        if normalized in {'rejected', 'cancelled', 'canceled', 'failed'}:
            return Payment.STATUS_REJECTED
        return Payment.STATUS_PENDING

    @staticmethod
    def _parse_paid_at(payload: Dict[str, Any]):
        paid_at = payload.get('date_approved') or payload.get('paid_at') or payload.get('date_created')
        if not paid_at:
            return None
        try:
            return datetime.fromisoformat(str(paid_at).replace('Z', '+00:00'))
        except Exception:
            return None

    @staticmethod
    def _plan_amount(plan: Plan) -> Decimal:
        return Decimal(plan.precio_mensual or 0)

    @staticmethod
    def _build_checkout_url(*, payment: Payment, plan: Plan, colegio: Colegio) -> str:
        frontend_url = getattr(settings, 'FRONTEND_BASE_URL', '').rstrip('/')
        if frontend_url:
            return (
                f"{frontend_url}/pagos/historial?external_id={payment.external_id}"
                f"&plan={plan.codigo}&colegio={colegio.rbd}"
            )
        return f"/pagos/historial?external_id={payment.external_id}&plan={plan.codigo}&colegio={colegio.rbd}"