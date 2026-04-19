"""
Wompi Payment Gateway Integration.
Official Colombian payment processor supporting PSE, credit cards, Nequi, and more.
API Documentation: https://docs.wompi.co
"""

import requests
import hashlib
from decimal import Decimal
from typing import Dict, Any, Optional, List
import logging

from .base import BasePaymentGateway, PaymentResult

logger = logging.getLogger(__name__)


class WompiGateway(BasePaymentGateway):
    """
    Wompi Payment Gateway implementation for Colombian payments.

    Supports:
    - PSE (Bank transfers)
    - Credit/Debit cards
    - Nequi
    - Bancolombia transfer
    """

    # Wompi API endpoints
    SANDBOX_URL = 'https://sandbox.wompi.co/v1'
    PRODUCTION_URL = 'https://production.wompi.co/v1'

    # Transaction status mapping
    STATUS_MAP = {
        'PENDING': 'pending',
        'APPROVED': 'completed',
        'DECLINED': 'failed',
        'VOIDED': 'voided',
        'ERROR': 'failed'
    }

    # Payment method types
    PAYMENT_METHODS = {
        'PSE': 'PSE',
        'CARD': 'CARD',
        'NEQUI': 'NEQUI',
        'BANCOLOMBIA_TRANSFER': 'BANCOLOMBIA_TRANSFER'
    }

    def __init__(self, config: Dict[str, Any]):
        """
        Initialize Wompi Gateway.

        Required config:
            - public_key: Wompi public key (pub_test_* or pub_prod_*)
            - private_key: Wompi private key (prv_test_* or prv_prod_*)
            - events_secret: Webhook events secret
            - sandbox_mode: True for testing, False for production
        """
        super().__init__(config)
        self.public_key = config.get('public_key')
        self.private_key = config.get('private_key')
        self.events_secret = config.get('events_secret')
        self.base_url = self.SANDBOX_URL if self.sandbox_mode else self.PRODUCTION_URL

    def validate_config(self):
        """Validate required Wompi configuration.

        BUG-PAY-GW-04 fix: usar self.config.get() en vez de self.public_key
        porque __init__ llama a super().__init__() (que invoca validate_config)
        ANTES de asignar self.public_key.
        """
        required = ['public_key', 'private_key']
        for field in required:
            if not self.config.get(field):
                raise ValueError(f"Wompi Gateway requires '{field}' in configuration")

        # Validate key prefixes (warning only, no raise)
        public_key = self.config.get('public_key', '')
        if self.sandbox_mode:
            if not public_key.startswith('pub_test_'):
                logger.warning("Public key should start with 'pub_test_' in sandbox mode")
        else:
            if not public_key.startswith('pub_prod_'):
                logger.warning("Public key should start with 'pub_prod_' in production mode")

    def create_payment(
        self,
        amount: Decimal,
        currency: str,
        customer_email: str,
        customer_name: str,
        description: str,
        reference: str,
        payment_method: str = 'PSE',
        customer_phone: str = None,
        return_url: str = None,
        **kwargs
    ) -> PaymentResult:
        """
        Create a Wompi payment transaction.

        Args:
            payment_method: Payment method type (PSE, CARD, NEQUI, etc.)
            kwargs: Additional parameters:
                - redirect_url: URL to redirect after payment
                - payment_source_id: For tokenized payments
                - installments: Number of installments for card payments
        """
        try:
            # Validate currency
            if currency != 'COP':
                return PaymentResult(
                    success=False,
                    error_message='Wompi only supports COP currency',
                    error_code='INVALID_CURRENCY'
                )

            # Convert amount to cents (Wompi expects amount in cents)
            amount_in_cents = int(amount * 100)

            # Prepare transaction data
            transaction_data = {
                'amount_in_cents': amount_in_cents,
                'currency': currency,
                'customer_email': customer_email,
                'payment_method': {
                    'type': payment_method,
                },
                'reference': reference,
                'redirect_url': return_url or kwargs.get('redirect_url', ''),
                'customer_data': {
                    'full_name': customer_name,
                    'phone_number': customer_phone or kwargs.get('phone', ''),
                }
            }

            # Add payment method specific data
            if payment_method == 'PSE':
                transaction_data['payment_method'].update({
                    'user_type': kwargs.get('user_type', '0'),  # 0 = Natural person
                    'user_legal_id_type': kwargs.get('document_type', 'CC'),
                    'user_legal_id': kwargs.get('document_number', ''),
                    'financial_institution_code': kwargs.get('bank_code', ''),
                    'payment_description': description
                })
            elif payment_method == 'CARD':
                if kwargs.get('payment_source_id'):
                    transaction_data['payment_method']['payment_source_id'] = kwargs['payment_source_id']
                if kwargs.get('installments'):
                    transaction_data['payment_method']['installments'] = kwargs['installments']

            # Generate integrity signature
            integrity = self._generate_integrity_signature(reference, amount_in_cents, currency)

            # Prepare headers
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.private_key}',
                'Accept': 'application/json'
            }

            self.log_info(f"Creating Wompi {payment_method} payment for {reference}", {
                'amount': amount,
                'method': payment_method
            })

            # Make API request
            response = requests.post(
                f'{self.base_url}/transactions',
                json=transaction_data,
                headers=headers,
                timeout=30
            )

            response.raise_for_status()
            result_data = response.json()

            # Extract transaction data
            transaction = result_data.get('data', {})
            status = transaction.get('status', 'PENDING')
            mapped_status = self.STATUS_MAP.get(status, 'pending')

            # Build metadata
            metadata = {
                'wompi_transaction_id': transaction.get('id'),
                'payment_method': payment_method,
                'integrity': integrity,
                'created_at': transaction.get('created_at'),
                'status_message': transaction.get('status_message'),
            }

            # Add payment method specific metadata
            if payment_method == 'PSE':
                metadata.update({
                    'async_payment_url': transaction.get('payment_method', {}).get('extra', {}).get('async_payment_url'),
                    'external_identifier': transaction.get('payment_method', {}).get('extra', {}).get('external_identifier')
                })

            return PaymentResult(
                success=True,
                transaction_id=reference,
                gateway_reference=transaction.get('id'),
                amount=amount,
                currency=currency,
                status=mapped_status,
                metadata=metadata
            )

        except requests.HTTPError as e:
            error_data = {}
            try:
                error_data = e.response.json()
            except Exception:
                pass

            error_message = error_data.get('error', {}).get('reason', str(e))
            error_code = error_data.get('error', {}).get('type', 'HTTP_ERROR')

            self.log_error(f"Wompi API request failed: {error_message}", {'error': error_data})

            return PaymentResult(
                success=False,
                error_message=error_message,
                error_code=error_code
            )

        except requests.RequestException as e:
            self.log_error(f"Wompi network error: {str(e)}")
            return PaymentResult(
                success=False,
                error_message=f'Network error: {str(e)}',
                error_code='NETWORK_ERROR'
            )

        except Exception as e:
            self.log_error(f"Unexpected error creating Wompi payment: {str(e)}")
            return PaymentResult(
                success=False,
                error_message=f'Unexpected error: {str(e)}',
                error_code='INTERNAL_ERROR'
            )

    def confirm_payment(self, transaction_id: str) -> PaymentResult:
        """
        Confirm Wompi payment status.

        Queries Wompi API to get the current status of a transaction.
        """
        try:
            headers = {
                'Authorization': f'Bearer {self.private_key}',
                'Accept': 'application/json'
            }

            response = requests.get(
                f'{self.base_url}/transactions/{transaction_id}',
                headers=headers,
                timeout=30
            )

            response.raise_for_status()
            result_data = response.json()

            transaction = result_data.get('data', {})
            status = transaction.get('status', 'PENDING')
            mapped_status = self.STATUS_MAP.get(status, 'pending')

            # Extract amount (comes in cents)
            amount_cents = transaction.get('amount_in_cents', 0)
            amount = Decimal(str(amount_cents)) / 100

            return PaymentResult(
                success=mapped_status == 'completed',
                transaction_id=transaction.get('reference'),
                gateway_reference=transaction.get('id'),
                amount=amount,
                currency=transaction.get('currency', 'COP'),
                status=mapped_status,
                metadata={
                    'wompi_status': status,
                    'status_message': transaction.get('status_message'),
                    'payment_method_type': transaction.get('payment_method_type'),
                    'finalized_at': transaction.get('finalized_at'),
                    'shipping_address': transaction.get('shipping_address'),
                }
            )

        except requests.HTTPError as e:
            error_data = {}
            try:
                error_data = e.response.json()
            except Exception:
                pass

            self.log_error(f"Wompi confirmation request failed: {str(e)}", {'error': error_data})

            return PaymentResult(
                success=False,
                transaction_id=transaction_id,
                error_message=error_data.get('error', {}).get('reason', str(e)),
                error_code='CONFIRMATION_ERROR'
            )

        except Exception as e:
            self.log_error(f"Unexpected error confirming Wompi payment: {str(e)}")
            return PaymentResult(
                success=False,
                transaction_id=transaction_id,
                error_message=f'Unexpected error: {str(e)}',
                error_code='INTERNAL_ERROR'
            )

    def refund_payment(
        self,
        transaction_id: str,
        amount: Optional[Decimal] = None,
        reason: str = ''
    ) -> PaymentResult:
        """
        Refund a Wompi payment (void).

        Note: Wompi only supports voiding transactions, not partial refunds.
        """
        try:
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.private_key}',
                'Accept': 'application/json'
            }

            self.log_info(f"Voiding Wompi transaction {transaction_id}")

            response = requests.post(
                f'{self.base_url}/transactions/{transaction_id}/void',
                headers=headers,
                timeout=30
            )

            response.raise_for_status()
            result_data = response.json()

            transaction = result_data.get('data', {})

            return PaymentResult(
                success=True,
                transaction_id=transaction.get('reference'),
                gateway_reference=transaction.get('id'),
                amount=amount,
                status='voided',
                metadata={
                    'voided_at': transaction.get('finalized_at'),
                    'status': transaction.get('status')
                }
            )

        except requests.HTTPError as e:
            error_data = {}
            try:
                error_data = e.response.json()
            except Exception:
                pass

            self.log_error(f"Wompi void request failed: {str(e)}", {'error': error_data})

            return PaymentResult(
                success=False,
                error_message=error_data.get('error', {}).get('reason', str(e)),
                error_code='VOID_ERROR'
            )

        except Exception as e:
            self.log_error(f"Unexpected error voiding Wompi payment: {str(e)}")
            return PaymentResult(
                success=False,
                error_message=f'Unexpected error: {str(e)}',
                error_code='INTERNAL_ERROR'
            )

    def handle_webhook(self, payload: Dict[str, Any], headers: Dict[str, str]) -> PaymentResult:
        """
        Handle Wompi webhook event.

        Wompi sends webhooks for transaction status updates.
        """
        try:
            # Verify webhook signature
            signature = headers.get('X-Event-Checksum', '')
            if not self._verify_webhook_signature(payload, signature):
                self.log_error("Invalid Wompi webhook signature")
                return PaymentResult(
                    success=False,
                    error_message='Invalid webhook signature',
                    error_code='INVALID_SIGNATURE'
                )

            # Extract event data
            event_type = payload.get('event')
            data = payload.get('data', {})
            transaction = data.get('transaction', {})

            transaction_id = transaction.get('reference')
            status = transaction.get('status', 'PENDING')
            mapped_status = self.STATUS_MAP.get(status, 'pending')

            # Extract amount
            amount_cents = transaction.get('amount_in_cents', 0)
            amount = Decimal(str(amount_cents)) / 100

            self.log_info(f"Wompi webhook received: {event_type} for {transaction_id} - {status}")

            return PaymentResult(
                success=mapped_status == 'completed',
                transaction_id=transaction_id,
                gateway_reference=transaction.get('id'),
                amount=amount,
                currency=transaction.get('currency', 'COP'),
                status=mapped_status,
                metadata={
                    'event_type': event_type,
                    'wompi_status': status,
                    'status_message': transaction.get('status_message'),
                    'payment_method_type': transaction.get('payment_method_type'),
                    'finalized_at': transaction.get('finalized_at'),
                    'sent_at': payload.get('sent_at'),
                    'timestamp': payload.get('timestamp')
                }
            )

        except Exception as e:
            self.log_error(f"Error processing Wompi webhook: {str(e)}")
            return PaymentResult(
                success=False,
                error_message=f'Webhook processing error: {str(e)}',
                error_code='WEBHOOK_ERROR'
            )

    def get_payment_methods(self, acceptance_token: str) -> Dict[str, Any]:
        """
        Get available payment methods and merchant information.

        Args:
            acceptance_token: Merchant acceptance token

        Returns:
            Dictionary with payment methods and merchant data
        """
        try:
            headers = {
                'Accept': 'application/json'
            }

            response = requests.get(
                f'{self.base_url}/merchants/{self.public_key}',
                headers=headers,
                timeout=30
            )

            response.raise_for_status()
            return response.json()

        except Exception as e:
            self.log_error(f"Error fetching payment methods: {str(e)}")
            return {'data': {}}

    def get_pse_banks(self) -> List[Dict[str, Any]]:
        """
        Get list of available PSE banks.

        Returns:
            List of dictionaries with bank information
        """
        try:
            headers = {
                'Accept': 'application/json',
                'Authorization': f'Bearer {self.public_key}'
            }

            response = requests.get(
                f'{self.base_url}/pse/financial_institutions',
                headers=headers,
                timeout=30
            )

            response.raise_for_status()
            result = response.json()

            return result.get('data', [])

        except Exception as e:
            self.log_error(f"Error fetching PSE banks: {str(e)}")
            return []

    def create_payment_source(
        self,
        token: str,
        customer_email: str,
        acceptance_token: str
    ) -> Dict[str, Any]:
        """
        Create a payment source (tokenize card) for future payments.

        Args:
            token: Card token from Wompi.js
            customer_email: Customer email
            acceptance_token: Acceptance token

        Returns:
            Payment source data
        """
        try:
            data = {
                'type': 'CARD',
                'token': token,
                'customer_email': customer_email,
                'acceptance_token': acceptance_token
            }

            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.private_key}',
                'Accept': 'application/json'
            }

            response = requests.post(
                f'{self.base_url}/payment_sources',
                json=data,
                headers=headers,
                timeout=30
            )

            response.raise_for_status()
            return response.json()

        except Exception as e:
            self.log_error(f"Error creating payment source: {str(e)}")
            return {}

    def _generate_integrity_signature(
        self,
        reference: str,
        amount_in_cents: int,
        currency: str
    ) -> str:
        """
        Generate integrity signature for transaction.

        Format: reference + amount_in_cents + currency + integrity_secret
        """
        integrity_string = f"{reference}{amount_in_cents}{currency}{self.events_secret}"

        signature = hashlib.sha256(integrity_string.encode('utf-8')).hexdigest()

        return signature

    def _verify_webhook_signature(self, payload: Dict[str, Any], signature: str) -> bool:
        """
        Verify webhook signature from Wompi.

        Wompi sends checksum as: sha256(payload_string + events_secret)
        """
        if not self.events_secret:
            self.log_error("Events secret not configured for webhook verification")
            return False

        try:
            # Convert payload to JSON string (maintaining key order)
            import json
            payload_string = json.dumps(payload, separators=(',', ':'), sort_keys=True)

            # Calculate expected checksum
            checksum_string = f"{payload_string}{self.events_secret}"
            expected_signature = hashlib.sha256(checksum_string.encode('utf-8')).hexdigest()

            # Compare signatures
            import hmac
            return hmac.compare_digest(expected_signature, signature)

        except Exception as e:
            self.log_error(f"Error verifying webhook signature: {str(e)}")
            return False
