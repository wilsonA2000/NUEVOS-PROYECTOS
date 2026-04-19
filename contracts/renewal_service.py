"""
Servicio de renovación de contratos para VeriHome.

Gestiona alertas de vencimiento, cálculo de incrementos legales (IPC),
y creación de borradores de renovación. Compatible con ambos modelos
de contrato: Contract y LandlordControlledContract.

Referencia legal: Artículo 20, Ley 820 de 2003.
"""

import logging
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, Optional, TYPE_CHECKING

from django.db.models import QuerySet
from django.utils import timezone

from core.notification_service import NotificationService

if TYPE_CHECKING:
    from contracts.landlord_contract_models import LandlordControlledContract
    from contracts.models import Contract

logger = logging.getLogger(__name__)

# Umbrales de alerta en días antes del vencimiento
ALERT_THRESHOLDS = [60, 30, 15]


class RenewalAlertService:
    """
    Servicio para gestión de renovaciones y alertas de vencimiento.

    Responsabilidades:
    - Detectar contratos próximos a vencer
    - Enviar notificaciones a arrendador y arrendatario
    - Calcular incrementos de canon según IPC (Art. 20 Ley 820)
    - Crear borradores de renovación basados en contratos existentes
    """

    # ------------------------------------------------------------------
    # Consultas de contratos próximos a vencer
    # ------------------------------------------------------------------

    @staticmethod
    def _get_expiring_contracts(days: int) -> Dict[str, QuerySet]:
        """
        Retorna contratos que vencen exactamente en *days* días.

        Returns:
            Dict con claves 'legacy' y 'landlord' conteniendo QuerySets.
        """
        from contracts.models import Contract
        from contracts.landlord_contract_models import LandlordControlledContract

        target_date = (timezone.now() + timedelta(days=days)).date()

        legacy = Contract.objects.filter(
            end_date=target_date,
            status__in=['active', 'published'],
        ).select_related('primary_party', 'secondary_party', 'property')

        landlord = LandlordControlledContract.objects.filter(
            end_date=target_date,
            current_state='ACTIVE',
        ).select_related('landlord', 'tenant', 'property')

        return {'legacy': legacy, 'landlord': landlord}

    @classmethod
    def check_expiring_contracts(cls) -> Dict[int, Dict[str, int]]:
        """
        Encuentra contratos que vencen en 60, 30 y 15 días.

        Returns:
            Dict mapping días -> {'legacy': count, 'landlord': count}
        """
        results: Dict[int, Dict[str, int]] = {}
        for days in ALERT_THRESHOLDS:
            qs = cls._get_expiring_contracts(days)
            counts = {
                'legacy': qs['legacy'].count(),
                'landlord': qs['landlord'].count(),
            }
            results[days] = counts
            if counts['legacy'] or counts['landlord']:
                logger.info(
                    "Contratos venciendo en %d días: legacy=%d, landlord=%d",
                    days, counts['legacy'], counts['landlord'],
                )
        return results

    # ------------------------------------------------------------------
    # Envío de alertas
    # ------------------------------------------------------------------

    @classmethod
    def send_renewal_alerts(cls) -> int:
        """
        Envía notificaciones a arrendadores y arrendatarios sobre
        contratos próximos a vencer.

        Returns:
            Cantidad total de notificaciones enviadas.
        """
        total_sent = 0

        for days in ALERT_THRESHOLDS:
            qs = cls._get_expiring_contracts(days)
            priority = cls._priority_for_days(days)

            # --- Legacy contracts ---
            for contract in qs['legacy']:
                cls._notify_user(
                    user=contract.primary_party,
                    contract_ref=contract,
                    days=days,
                    role='arrendador',
                    priority=priority,
                )
                cls._notify_user(
                    user=contract.secondary_party,
                    contract_ref=contract,
                    days=days,
                    role='arrendatario',
                    priority=priority,
                )
                total_sent += 2

            # --- Landlord-controlled contracts ---
            for contract in qs['landlord']:
                cls._notify_user(
                    user=contract.landlord,
                    contract_ref=contract,
                    days=days,
                    role='arrendador',
                    priority=priority,
                )
                if contract.tenant:
                    cls._notify_user(
                        user=contract.tenant,
                        contract_ref=contract,
                        days=days,
                        role='arrendatario',
                        priority=priority,
                    )
                    total_sent += 2
                else:
                    total_sent += 1

        logger.info("Total de alertas de renovación enviadas: %d", total_sent)
        return total_sent

    @staticmethod
    def _priority_for_days(days: int) -> str:
        if days <= 15:
            return 'urgent'
        if days <= 30:
            return 'high'
        return 'normal'

    @staticmethod
    def _notify_user(user, contract_ref, days: int, role: str, priority: str) -> None:
        title = f"Contrato próximo a vencer ({days} días)"
        message = (
            f"Estimado {role}, su contrato \"{getattr(contract_ref, 'title', '')}\" "
            f"vence en {days} días. Le recomendamos gestionar la renovación "
            f"o terminación del contrato oportunamente."
        )
        try:
            NotificationService.create_notification(
                user=user,
                notification_type='contract',
                title=title,
                message=message,
                priority=priority,
                action_url=f'/contracts/{contract_ref.pk}/',
                action_label='Ver contrato',
                related_object=contract_ref,
                send_email=(days <= 30),
                send_push=True,
            )
        except Exception:
            logger.exception(
                "Error enviando alerta de renovación a usuario %s para contrato %s",
                user.pk, contract_ref.pk,
            )

    # ------------------------------------------------------------------
    # Cálculo de incremento IPC (Art. 20 Ley 820 de 2003)
    # ------------------------------------------------------------------

    @staticmethod
    def calculate_ipc_adjustment(
        current_rent: Decimal,
        ipc_rate: Optional[Decimal] = None,
        *,
        use_dane: bool = False,
        year: Optional[int] = None,
    ) -> Dict[str, Decimal]:
        """
        Calcula el nuevo canon aplicando el incremento máximo legal por IPC.

        Art. 20, Ley 820 de 2003: el incremento del canon no puede exceder
        el 100% del IPC del año calendario inmediatamente anterior.

        Args:
            current_rent: Canon mensual actual.
            ipc_rate: Tasa IPC como porcentaje (ej. 5.62 para 5.62 %).
                Si se omite y ``use_dane=True``, se obtiene automáticamente
                de la API del DANE.
            use_dane: Si es ``True`` y no se proporciona ``ipc_rate``,
                consulta la tasa IPC oficial del DANE (con cache de 24 h
                y fallback a tasa por defecto).
            year: Año específico para consultar el IPC del DANE.
                Solo se usa cuando ``use_dane=True`` y ``ipc_rate`` es ``None``.

        Returns:
            Dict con 'current_rent', 'ipc_rate', 'ipc_source',
            'max_increment', 'new_rent'.

        Raises:
            ValueError: Si el canon o el IPC son negativos, o si no se
                proporciona ``ipc_rate`` y ``use_dane`` es ``False``.
        """
        from contracts.dane_ipc_service import DaneIPCService

        current_rent = Decimal(str(current_rent))
        ipc_source = 'manual'

        if ipc_rate is not None:
            ipc_rate = Decimal(str(ipc_rate))
        elif use_dane:
            if year is not None:
                ipc_rate = DaneIPCService.get_ipc_rate_for_year(year)
            else:
                ipc_rate = DaneIPCService.get_current_ipc_rate()
            ipc_source = 'dane'
            logger.info("IPC obtenido del DANE: %s%%", ipc_rate)
        else:
            raise ValueError(
                "Debe proporcionar ipc_rate o activar use_dane=True."
            )

        if current_rent < 0:
            raise ValueError("El canon actual no puede ser negativo.")
        if ipc_rate < 0:
            raise ValueError("La tasa IPC no puede ser negativa.")

        max_increment = (
            current_rent * ipc_rate / Decimal('100')
        ).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        new_rent = current_rent + max_increment

        return {
            'current_rent': current_rent,
            'ipc_rate': ipc_rate,
            'ipc_source': ipc_source,
            'max_increment': max_increment,
            'new_rent': new_rent,
        }

    # ------------------------------------------------------------------
    # Creación de borrador de renovación
    # ------------------------------------------------------------------

    @classmethod
    def create_renewal_draft(
        cls,
        contract_id: str,
        new_terms: Optional[Dict[str, Any]] = None,
    ) -> 'LandlordControlledContract':
        """
        Crea un borrador de contrato de renovación basado en uno existente.

        Intenta ubicar el contrato en LandlordControlledContract primero;
        si no existe, busca en Contract (legacy).

        Args:
            contract_id: UUID del contrato original.
            new_terms: Dict opcional con campos a sobrescribir, por ejemplo
                       {'monthly_rent': 2500000, 'duration_months': 12}.

        Returns:
            Nueva instancia de LandlordControlledContract en estado DRAFT.

        Raises:
            ValueError: Si el contrato original no se encuentra o no es
                        elegible para renovación.
        """
        from contracts.landlord_contract_models import LandlordControlledContract

        new_terms = new_terms or {}
        source = cls._find_source_contract(contract_id)

        if source is None:
            raise ValueError(f"No se encontró contrato con ID {contract_id}.")

        if isinstance(source, LandlordControlledContract):
            return cls._renew_landlord_contract(source, new_terms)
        return cls._renew_legacy_contract(source, new_terms)

    @staticmethod
    def _find_source_contract(contract_id: str):
        from contracts.landlord_contract_models import LandlordControlledContract
        from contracts.models import Contract

        try:
            return LandlordControlledContract.objects.get(pk=contract_id)
        except LandlordControlledContract.DoesNotExist:
            pass
        try:
            return Contract.objects.get(pk=contract_id)
        except Contract.DoesNotExist:
            return None

    @staticmethod
    def _calculate_new_dates(source, duration_months: Optional[int] = None):
        """Calcula fechas para el contrato renovado."""
        from dateutil.relativedelta import relativedelta

        if source.end_date:
            new_start = source.end_date + timedelta(days=1)
        else:
            new_start = timezone.now().date()

        if duration_months:
            new_end = new_start + relativedelta(months=duration_months)
        elif source.start_date and source.end_date:
            original_delta = source.end_date - source.start_date
            new_end = new_start + original_delta
        else:
            new_end = new_start + relativedelta(months=12)

        return new_start, new_end

    @classmethod
    def _renew_landlord_contract(
        cls,
        source: 'LandlordControlledContract',
        new_terms: Dict[str, Any],
    ) -> 'LandlordControlledContract':
        from contracts.landlord_contract_models import LandlordControlledContract

        new_start, new_end = cls._calculate_new_dates(
            source, new_terms.get('duration_months')
        )

        economic = dict(source.economic_terms)
        if 'monthly_rent' in new_terms:
            economic['monthly_rent'] = str(new_terms['monthly_rent'])

        renewal = LandlordControlledContract(
            landlord=source.landlord,
            tenant=source.tenant,
            property=source.property,
            contract_type=source.contract_type,
            title=f"Renovación: {source.title}",
            description=f"Renovación del contrato {source.pk}",
            current_state='DRAFT',
            landlord_data=source.landlord_data,
            property_data=source.property_data,
            economic_terms=economic,
            contract_terms=source.contract_terms,
            special_clauses=source.special_clauses,
            tenant_data=source.tenant_data,
            start_date=new_start,
            end_date=new_end,
        )
        renewal.save()
        logger.info(
            "Borrador de renovación creado: %s (origen: %s)", renewal.pk, source.pk
        )
        return renewal

    @classmethod
    def _renew_legacy_contract(
        cls,
        source: 'Contract',
        new_terms: Dict[str, Any],
    ) -> 'LandlordControlledContract':
        from contracts.landlord_contract_models import LandlordControlledContract

        new_start, new_end = cls._calculate_new_dates(
            source, new_terms.get('duration_months')
        )

        monthly_rent = new_terms.get('monthly_rent', source.monthly_rent)

        renewal = LandlordControlledContract(
            landlord=source.primary_party,
            tenant=source.secondary_party,
            property=source.property,
            contract_type=source.contract_type,
            title=f"Renovación: {source.title}",
            description=f"Renovación del contrato legacy {source.pk}",
            current_state='DRAFT',
            economic_terms={'monthly_rent': str(monthly_rent) if monthly_rent else ''},
            start_date=new_start,
            end_date=new_end,
        )
        renewal.save()
        logger.info(
            "Borrador de renovación (legacy) creado: %s (origen: %s)",
            renewal.pk, source.pk,
        )
        return renewal

    # ------------------------------------------------------------------
    # Método de conveniencia para Celery task
    # ------------------------------------------------------------------

    @classmethod
    def check_and_alert_expiring_contracts(cls) -> Dict[str, Any]:
        """
        Punto de entrada para la tarea diaria de Celery.
        Ejecuta la verificación y envía alertas.

        Returns:
            Resumen con contratos encontrados y alertas enviadas.
        """
        logger.info("Iniciando verificación diaria de vencimiento de contratos")
        expiring = cls.check_expiring_contracts()
        alerts_sent = cls.send_renewal_alerts()
        summary = {
            'expiring_contracts': expiring,
            'alerts_sent': alerts_sent,
            'timestamp': timezone.now().isoformat(),
        }
        logger.info("Verificación completada: %s", summary)
        return summary
