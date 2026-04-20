"""
Bold Payment Gateway Integration.
Plataforma de pagos colombiana — https://bold.co

Soporta: PSE · Nequi · Daviplata · Bancolombia QR · Tarjetas (Visa/MC/Amex/Diners) · Efecty

El modelo de Bold usa *payment links*: el backend crea un link y redirige al
checkout de Bold donde el usuario elige su método de pago. El webhook notifica
el resultado posterior.

Docs: https://developers.bold.co/docs
"""

import hashlib
import hmac
import json
import logging
import requests
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional

from .base import BasePaymentGateway, PaymentResult

logger = logging.getLogger(__name__)


class BoldGateway(BasePaymentGateway):
    """
    Pasarela Bold para pagos colombianos.

    Config requerida:
        - api_key: clave secreta Bold (test_* en sandbox, prod_* en producción)
        - integrity_secret: secreto de integridad para firmar y verificar webhooks
        - sandbox_mode: True para pruebas
    """

    # Bold usa pesos COP directamente (no centavos)
    BASE_URL = "https://integrations.bold.co"

    STATUS_MAP = {
        "APPROVED": "completed",
        "PENDING": "pending",
        "DECLINED": "failed",
        "VOIDED": "voided",
        "ERROR": "failed",
        "EXPIRED": "expired",
    }

    def __init__(self, config: Dict[str, Any]):
        """
        Inicializar Bold Gateway.

        Config keys:
            api_key (str): API key de Bold (test_... o prod_...)
            integrity_secret (str): secreto de integridad para firmas
            sandbox_mode (bool): True = keys test_*; False = keys prod_*
        """
        super().__init__(config)
        self.integrity_secret = config.get("integrity_secret", "")

    def validate_config(self):
        """Validar que api_key esté presente."""
        if not self.config.get("api_key"):
            raise ValueError("BoldGateway requiere 'api_key' en la configuración")

    # ------------------------------------------------------------------
    # ABC interface
    # ------------------------------------------------------------------

    def create_payment(
        self,
        amount: Decimal,
        currency: str,
        customer_email: str,
        customer_name: str,
        description: str,
        reference: str,
        **kwargs,
    ) -> PaymentResult:
        """
        Crea un payment link en Bold y retorna la URL de checkout.

        El usuario es redirigido al checkout de Bold donde elige PSE, Nequi,
        Daviplata, Bancolombia QR, tarjeta u otro método disponible.

        kwargs opcionales:
            expiration_hours (int): horas de validez del link (default 24)
            redirect_url (str): URL de retorno tras el pago
        """
        if currency != "COP":
            return PaymentResult(
                success=False,
                error_message="Bold solo soporta COP",
                error_code="INVALID_CURRENCY",
            )

        expiration_hours = kwargs.get("expiration_hours", 24)
        expires_at = (
            datetime.now(tz=timezone.utc) + timedelta(hours=expiration_hours)
        ).strftime("%Y-%m-%dT%H:%M:%S-05:00")  # UTC-5 Colombia

        payload: Dict[str, Any] = {
            "amount_type": "CLOSE",  # monto fijo
            "amount": int(amount),  # Bold espera entero en pesos COP
            "currency": "COP",
            "description": description[:255],
            "reference": reference,
            "expiration_date": expires_at,
        }

        redirect_url = kwargs.get("redirect_url")
        if redirect_url:
            payload["redirect_url"] = redirect_url

        headers = self._auth_headers()

        try:
            self.log_info(
                f"Creando Bold payment link para {reference}",
                {
                    "amount": str(amount),
                },
            )

            response = requests.post(
                f"{self.BASE_URL}/online/link/v1",
                json=payload,
                headers=headers,
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()

            link_payload = data.get("payload", {})
            payment_link = link_payload.get("payment_link", "")
            link_id = link_payload.get("payment_link_id", "")

            return PaymentResult(
                success=True,
                transaction_id=reference,
                gateway_reference=link_id,
                amount=amount,
                currency="COP",
                status="pending",
                metadata={
                    "checkout_url": payment_link,
                    "payment_link_id": link_id,
                    "expires_at": expires_at,
                },
                raw_response=data,
            )

        except requests.HTTPError as e:
            error_data = self._safe_json(e.response)
            error_msg = (
                error_data.get("errors", [{}])[0].get("message", str(e))
                if isinstance(error_data.get("errors"), list)
                else str(e)
            )
            self.log_error(f"Bold API error: {error_msg}", {"reference": reference})
            return PaymentResult(
                success=False,
                error_message=error_msg,
                error_code="BOLD_API_ERROR",
            )
        except requests.RequestException as e:
            self.log_error(f"Bold network error: {e}")
            return PaymentResult(
                success=False,
                error_message=f"Error de red: {e}",
                error_code="NETWORK_ERROR",
            )

    def confirm_payment(self, transaction_id: str) -> PaymentResult:
        """
        Consulta el estado de un payment link por su link_id o referencia.

        transaction_id debe ser el payment_link_id retornado por create_payment
        (ej: 'LNK_XXXX') o la referencia interna.
        """
        headers = self._auth_headers()
        try:
            response = requests.get(
                f"{self.BASE_URL}/online/link/v1/{transaction_id}",
                headers=headers,
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()
            link_data = data.get("payload", {})

            bold_status = link_data.get("status", "PENDING")
            mapped_status = self.STATUS_MAP.get(bold_status, "pending")
            amount = Decimal(str(link_data.get("amount", 0)))

            return PaymentResult(
                success=mapped_status == "completed",
                transaction_id=link_data.get("reference", transaction_id),
                gateway_reference=transaction_id,
                amount=amount,
                currency="COP",
                status=mapped_status,
                metadata={
                    "bold_status": bold_status,
                    "payment_method": link_data.get("payment_method"),
                    "finalized_at": link_data.get("finalized_at"),
                },
                raw_response=data,
            )

        except requests.HTTPError as e:
            error_data = self._safe_json(e.response)
            return PaymentResult(
                success=False,
                transaction_id=transaction_id,
                error_message=str(error_data) or str(e),
                error_code="CONFIRMATION_ERROR",
            )
        except Exception as e:
            return self.handle_error(e, {"transaction_id": transaction_id})

    def refund_payment(
        self,
        transaction_id: str,
        amount: Optional[Decimal] = None,
        reason: str = "",
    ) -> PaymentResult:
        """
        Bold no expone endpoint de reembolso vía API pública — se gestionan
        desde el dashboard o contactando soporte. Este método retorna un error
        informativo hasta que Bold habilite el endpoint.
        """
        self.log_error(
            "Reembolso Bold no disponible vía API — gestionar en dashboard.bold.co",
            {"transaction_id": transaction_id},
        )
        return PaymentResult(
            success=False,
            transaction_id=transaction_id,
            error_message=(
                "Los reembolsos Bold se gestionan manualmente desde "
                "dashboard.bold.co o contactando a soporte Bold."
            ),
            error_code="REFUND_NOT_SUPPORTED",
        )

    def handle_webhook(
        self, payload: Dict[str, Any], headers: Dict[str, str]
    ) -> PaymentResult:
        """
        Procesa el webhook enviado por Bold tras actualizar una transacción.

        Bold firma el payload con HMAC-SHA256 usando el integrity_secret.
        Header: 'x-bold-signature'
        """
        signature = headers.get("x-bold-signature", headers.get("X-Bold-Signature", ""))
        if self.integrity_secret and not self._verify_signature(payload, signature):
            self.log_error("Firma inválida en webhook Bold")
            return PaymentResult(
                success=False,
                error_message="Firma de webhook inválida",
                error_code="INVALID_SIGNATURE",
            )

        event_type = payload.get("type", "")
        data = payload.get("data", {})

        transaction_id = data.get("reference", "")
        bold_status = data.get("status", "PENDING")
        mapped_status = self.STATUS_MAP.get(bold_status, "pending")
        amount = Decimal(str(data.get("amount", 0)))

        self.log_info(
            f"Bold webhook recibido: {event_type} ref={transaction_id} status={bold_status}"
        )

        return PaymentResult(
            success=mapped_status == "completed",
            transaction_id=transaction_id,
            gateway_reference=data.get("order_id", ""),
            amount=amount,
            currency=data.get("currency", "COP"),
            status=mapped_status,
            metadata={
                "event_type": event_type,
                "bold_status": bold_status,
                "payment_method": data.get("payment_method"),
                "order_id": data.get("order_id"),
            },
            raw_response=payload,
        )

    # ------------------------------------------------------------------
    # Helpers públicos
    # ------------------------------------------------------------------

    def get_payment_methods(self) -> List[str]:
        """
        Retorna los métodos de pago soportados por Bold.
        Bold no tiene endpoint de consulta; la lista es fija según plan.
        """
        return ["PSE", "NEQUI", "DAVIPLATA", "BANCOLOMBIA_QR", "CARD", "EFECTY"]

    # ------------------------------------------------------------------
    # Helpers privados
    # ------------------------------------------------------------------

    def _auth_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f'x-api-key {self.config["api_key"]}',
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def _verify_signature(self, payload: Dict[str, Any], signature: str) -> bool:
        """
        Verifica HMAC-SHA256 del webhook de Bold.
        Bold firma: sha256(payload_string + integrity_secret)
        """
        if not signature:
            return False
        try:
            payload_string = json.dumps(payload, separators=(",", ":"), sort_keys=True)
            expected = hashlib.sha256(
                f"{payload_string}{self.integrity_secret}".encode("utf-8")
            ).hexdigest()
            return hmac.compare_digest(expected, signature)
        except Exception as e:
            self.log_error(f"Error verificando firma Bold: {e}")
            return False

    @staticmethod
    def _safe_json(response) -> Dict[str, Any]:
        """Parsea JSON de respuesta sin lanzar excepción."""
        try:
            return response.json()
        except Exception:
            return {}
