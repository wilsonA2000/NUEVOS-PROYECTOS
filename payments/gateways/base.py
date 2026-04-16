"""
Base Payment Gateway class and shared utilities.
All payment gateways should inherit from BasePaymentGateway.
"""

from typing import Dict, Any, Optional
from decimal import Decimal
from dataclasses import dataclass
from abc import ABC, abstractmethod
import logging

logger = logging.getLogger(__name__)


@dataclass
class PaymentResult:
    """Standard result object for payment operations."""
    success: bool
    transaction_id: Optional[str] = None
    gateway_reference: Optional[str] = None
    amount: Optional[Decimal] = None
    currency: str = 'COP'
    status: str = 'pending'
    error_message: Optional[str] = None
    error_code: Optional[str] = None
    metadata: Dict[str, Any] = None
    raw_response: Optional[Dict[str, Any]] = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            'success': self.success,
            'transaction_id': self.transaction_id,
            'gateway_reference': self.gateway_reference,
            'amount': str(self.amount) if self.amount else None,
            'currency': self.currency,
            'status': self.status,
            'error_message': self.error_message,
            'error_code': self.error_code,
            'metadata': self.metadata,
            'raw_response': self.raw_response,
        }


class BasePaymentGateway(ABC):
    """Base class for all payment gateway integrations."""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize payment gateway with configuration.
        
        Args:
            config: Dictionary with gateway-specific configuration
        """
        self.config = config
        self.sandbox_mode = config.get('sandbox_mode', True)
        self.api_key = config.get('api_key')
        self.secret_key = config.get('secret_key')
        self.webhook_secret = config.get('webhook_secret')
        
        # Validate required configuration
        self.validate_config()
    
    @abstractmethod
    def validate_config(self):
        """Validate that required configuration is present."""
        pass
    
    @abstractmethod
    def create_payment(
        self,
        amount: Decimal,
        currency: str,
        customer_email: str,
        customer_name: str,
        description: str,
        reference: str,
        **kwargs
    ) -> PaymentResult:
        """
        Create a new payment.
        
        Args:
            amount: Payment amount
            currency: Currency code (e.g., 'COP')
            customer_email: Customer email
            customer_name: Customer name
            description: Payment description
            reference: Unique reference for this payment
            **kwargs: Additional gateway-specific parameters
        
        Returns:
            PaymentResult object
        """
        pass
    
    @abstractmethod
    def confirm_payment(self, transaction_id: str) -> PaymentResult:
        """
        Confirm a payment status.
        
        Args:
            transaction_id: Transaction ID to confirm
        
        Returns:
            PaymentResult object
        """
        pass
    
    @abstractmethod
    def refund_payment(
        self,
        transaction_id: str,
        amount: Optional[Decimal] = None,
        reason: str = ''
    ) -> PaymentResult:
        """
        Refund a payment.
        
        Args:
            transaction_id: Transaction ID to refund
            amount: Amount to refund (None = full refund)
            reason: Reason for refund
        
        Returns:
            PaymentResult object
        """
        pass
    
    @abstractmethod
    def handle_webhook(self, payload: Dict[str, Any], headers: Dict[str, str]) -> PaymentResult:
        """
        Handle webhook callback from payment gateway.
        
        Args:
            payload: Webhook payload
            headers: Request headers
        
        Returns:
            PaymentResult object
        """
        pass
    
    def get_payment_status(self, transaction_id: str) -> str:
        """
        Get current status of a payment.
        
        Args:
            transaction_id: Transaction ID
        
        Returns:
            Status string ('pending', 'completed', 'failed', etc.)
        """
        result = self.confirm_payment(transaction_id)
        return result.status
    
    def format_amount(self, amount: Decimal) -> int:
        """
        Format amount for gateway (most require integers in cents).
        
        Args:
            amount: Decimal amount
        
        Returns:
            Amount in cents as integer
        """
        return int(amount * 100)
    
    def handle_error(self, error: Exception, extra: Dict[str, Any] = None) -> 'PaymentResult':
        """Convert an unexpected exception into a failed PaymentResult."""
        self.log_error(str(error), extra)
        return PaymentResult(
            success=False,
            error_message=str(error),
            error_code='GATEWAY_ERROR',
        )

    def log_error(self, message: str, extra: Dict[str, Any] = None):
        """Log an error with contextual information."""
        logger.error(
            f"[{self.__class__.__name__}] {message}",
            extra=extra or {}
        )
    
    def log_info(self, message: str, extra: Dict[str, Any] = None):
        """Log an info message."""
        logger.info(
            f"[{self.__class__.__name__}] {message}",
            extra=extra or {}
        )
