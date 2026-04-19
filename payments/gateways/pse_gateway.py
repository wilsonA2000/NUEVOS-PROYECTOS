"""
PSE (Pagos Seguros en Línea) Payment Gateway Integration.
Colombian payment gateway for bank transfers.
"""

import requests
import hashlib
import hmac
from decimal import Decimal
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import logging

from .base import BasePaymentGateway, PaymentResult

logger = logging.getLogger(__name__)


class PSEGateway(BasePaymentGateway):
    """
    PSE Payment Gateway implementation for Colombian bank transfers.
    
    PSE allows customers to pay directly from their Colombian bank account.
    """
    
    # PSE API endpoints
    SANDBOX_URL = 'https://sandbox.pse.com.co/api/v1'
    PRODUCTION_URL = 'https://api.pse.com.co/api/v1'
    
    # Transaction status mapping
    STATUS_MAP = {
        'PENDING': 'pending',
        'APPROVED': 'completed',
        'REJECTED': 'failed',
        'FAILED': 'failed',
        'EXPIRED': 'expired',
        'PROCESSING': 'processing'
    }
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize PSE Gateway.
        
        Required config:
            - api_key: PSE API key
            - secret_key: PSE secret key
            - merchant_id: PSE merchant ID
            - sandbox_mode: True for testing, False for production
        """
        super().__init__(config)
        self.merchant_id = config.get('merchant_id')
        self.base_url = self.SANDBOX_URL if self.sandbox_mode else self.PRODUCTION_URL
    
    def validate_config(self):
        """Validate required PSE configuration."""
        required = ['api_key', 'secret_key', 'merchant_id']
        for field in required:
            if not self.config.get(field):
                raise ValueError(f"PSE Gateway requires '{field}' in configuration")
    
    def create_payment(
        self,
        amount: Decimal,
        currency: str,
        customer_email: str,
        customer_name: str,
        description: str,
        reference: str,
        customer_id: str = None,
        customer_phone: str = None,
        return_url: str = None,
        **kwargs
    ) -> PaymentResult:
        """
        Create a PSE payment transaction.
        
        This initiates a PSE payment and returns a redirect URL for the customer
        to complete the payment on their bank's website.
        """
        try:
            # Validate currency
            if currency != 'COP':
                return PaymentResult(
                    success=False,
                    error_message='PSE only supports COP currency',
                    error_code='INVALID_CURRENCY'
                )
            
            # Prepare payment data
            payment_data = {
                'merchant_id': self.merchant_id,
                'reference': reference,
                'amount': int(amount),  # PSE expects amount in pesos (no decimals)
                'currency': currency,
                'description': description,
                'customer': {
                    'name': customer_name,
                    'email': customer_email,
                    'phone': customer_phone or '',
                    'document_type': kwargs.get('document_type', 'CC'),
                    'document_number': customer_id or ''
                },
                'return_url': return_url or self.config.get('default_return_url', ''),
                'expiration_time': self._get_expiration_time(),
                'timestamp': datetime.now().isoformat()
            }
            
            # Sign the request
            signature = self._generate_signature(payment_data)
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.api_key}',
                'X-Signature': signature
            }
            
            # Make API request
            self.log_info(f"Creating PSE payment for {reference}", {'amount': amount})
            
            response = requests.post(
                f'{self.base_url}/payments',
                json=payment_data,
                headers=headers,
                timeout=30
            )
            
            response.raise_for_status()
            result_data = response.json()
            
            # Process response
            if result_data.get('status') == 'success':
                return PaymentResult(
                    success=True,
                    transaction_id=reference,
                    gateway_reference=result_data.get('pse_transaction_id'),
                    amount=amount,
                    currency=currency,
                    status='pending',
                    metadata={
                        'redirect_url': result_data.get('redirect_url'),
                        'bank_list_url': result_data.get('bank_list_url'),
                        'expires_at': payment_data['expiration_time']
                    }
                )
            else:
                return PaymentResult(
                    success=False,
                    error_message=result_data.get('message', 'Payment creation failed'),
                    error_code=result_data.get('error_code')
                )
        
        except requests.RequestException as e:
            self.log_error(f"PSE API request failed: {str(e)}")
            return PaymentResult(
                success=False,
                error_message=f'PSE API error: {str(e)}',
                error_code='API_ERROR'
            )
        except Exception as e:
            self.log_error(f"Unexpected error creating PSE payment: {str(e)}")
            return PaymentResult(
                success=False,
                error_message=f'Unexpected error: {str(e)}',
                error_code='INTERNAL_ERROR'
            )
    
    def confirm_payment(self, transaction_id: str) -> PaymentResult:
        """
        Confirm PSE payment status.
        
        Queries PSE API to get the current status of a transaction.
        """
        try:
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(
                f'{self.base_url}/payments/{transaction_id}',
                headers=headers,
                timeout=30
            )
            
            response.raise_for_status()
            result_data = response.json()
            
            pse_status = result_data.get('status', 'PENDING')
            mapped_status = self.STATUS_MAP.get(pse_status, 'pending')
            
            return PaymentResult(
                success=mapped_status == 'completed',
                transaction_id=transaction_id,
                gateway_reference=result_data.get('pse_transaction_id'),
                amount=Decimal(str(result_data.get('amount', 0))),
                currency=result_data.get('currency', 'COP'),
                status=mapped_status,
                metadata={
                    'pse_status': pse_status,
                    'bank_name': result_data.get('bank_name'),
                    'transaction_date': result_data.get('transaction_date'),
                    'authorization_code': result_data.get('authorization_code')
                }
            )
        
        except requests.RequestException as e:
            self.log_error(f"PSE confirmation request failed: {str(e)}")
            return PaymentResult(
                success=False,
                transaction_id=transaction_id,
                error_message=f'PSE API error: {str(e)}',
                error_code='API_ERROR'
            )
        except Exception as e:
            self.log_error(f"Unexpected error confirming PSE payment: {str(e)}")
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
        Refund a PSE payment.
        
        Note: PSE refunds may take 3-5 business days to process.
        """
        try:
            refund_data = {
                'transaction_id': transaction_id,
                'reason': reason,
                'timestamp': datetime.now().isoformat()
            }
            
            if amount:
                refund_data['amount'] = int(amount)
            
            signature = self._generate_signature(refund_data)
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.api_key}',
                'X-Signature': signature
            }
            
            self.log_info(f"Initiating PSE refund for {transaction_id}")
            
            response = requests.post(
                f'{self.base_url}/refunds',
                json=refund_data,
                headers=headers,
                timeout=30
            )
            
            response.raise_for_status()
            result_data = response.json()
            
            if result_data.get('status') == 'success':
                return PaymentResult(
                    success=True,
                    transaction_id=transaction_id,
                    gateway_reference=result_data.get('refund_id'),
                    amount=amount,
                    status='refunded',
                    metadata={
                        'refund_status': result_data.get('refund_status'),
                        'estimated_completion': result_data.get('estimated_completion')
                    }
                )
            else:
                return PaymentResult(
                    success=False,
                    error_message=result_data.get('message', 'Refund failed'),
                    error_code=result_data.get('error_code')
                )
        
        except requests.RequestException as e:
            self.log_error(f"PSE refund request failed: {str(e)}")
            return PaymentResult(
                success=False,
                error_message=f'PSE API error: {str(e)}',
                error_code='API_ERROR'
            )
        except Exception as e:
            self.log_error(f"Unexpected error refunding PSE payment: {str(e)}")
            return PaymentResult(
                success=False,
                error_message=f'Unexpected error: {str(e)}',
                error_code='INTERNAL_ERROR'
            )
    
    def handle_webhook(self, payload: Dict[str, Any], headers: Dict[str, str]) -> PaymentResult:
        """
        Handle PSE webhook callback.
        
        PSE sends webhooks for payment status updates.
        """
        try:
            # Verify webhook signature
            signature = headers.get('X-PSE-Signature', '')
            if not self._verify_webhook_signature(payload, signature):
                self.log_error("Invalid PSE webhook signature")
                return PaymentResult(
                    success=False,
                    error_message='Invalid webhook signature',
                    error_code='INVALID_SIGNATURE'
                )
            
            # Extract payment data
            transaction_id = payload.get('reference')
            pse_status = payload.get('status')
            mapped_status = self.STATUS_MAP.get(pse_status, 'pending')
            
            self.log_info(f"PSE webhook received for {transaction_id}: {pse_status}")
            
            return PaymentResult(
                success=mapped_status == 'completed',
                transaction_id=transaction_id,
                gateway_reference=payload.get('pse_transaction_id'),
                amount=Decimal(str(payload.get('amount', 0))),
                currency=payload.get('currency', 'COP'),
                status=mapped_status,
                metadata={
                    'pse_status': pse_status,
                    'bank_name': payload.get('bank_name'),
                    'authorization_code': payload.get('authorization_code'),
                    'webhook_timestamp': payload.get('timestamp')
                }
            )
        
        except Exception as e:
            self.log_error(f"Error processing PSE webhook: {str(e)}")
            return PaymentResult(
                success=False,
                error_message=f'Webhook processing error: {str(e)}',
                error_code='WEBHOOK_ERROR'
            )
    
    def get_available_banks(self) -> Dict[str, Any]:
        """
        Get list of available banks for PSE payments.
        
        Returns:
            Dictionary with list of banks and their codes
        """
        try:
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(
                f'{self.base_url}/banks',
                headers=headers,
                timeout=30
            )
            
            response.raise_for_status()
            return response.json()
        
        except Exception as e:
            self.log_error(f"Error fetching PSE banks: {str(e)}")
            return {'banks': []}
    
    def _generate_signature(self, data: Dict[str, Any]) -> str:
        """Generate HMAC signature for PSE request."""
        # Create signature string from sorted keys
        signature_string = '&'.join(
            f"{k}={v}" for k, v in sorted(data.items())
            if v is not None and k != 'signature'
        )
        
        # Generate HMAC-SHA256 signature
        signature = hmac.new(
            self.secret_key.encode('utf-8'),
            signature_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        return signature
    
    def _verify_webhook_signature(self, payload: Dict[str, Any], signature: str) -> bool:
        """Verify webhook signature from PSE."""
        expected_signature = self._generate_signature(payload)
        return hmac.compare_digest(expected_signature, signature)
    
    def _get_expiration_time(self, hours: int = 24) -> str:
        """Get expiration timestamp for payment."""
        expiration = datetime.now() + timedelta(hours=hours)
        return expiration.isoformat()
