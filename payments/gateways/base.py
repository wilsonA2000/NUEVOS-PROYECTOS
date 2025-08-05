"""
Clase base para integración con pasarelas de pago.
"""

from abc import ABC, abstractmethod
from decimal import Decimal
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class PaymentGatewayBase(ABC):
    """Clase base abstracta para pasarelas de pago."""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Inicializar pasarela con configuración.
        
        Args:
            config: Diccionario con configuración específica de la pasarela
        """
        self.config = config
        self.name = self.__class__.__name__
        self.validate_config()
    
    @abstractmethod
    def validate_config(self):
        """Validar que la configuración tenga todos los campos necesarios."""
        pass
    
    @abstractmethod
    def process_payment(
        self,
        amount: Decimal,
        currency: str,
        payment_method: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Procesar un pago.
        
        Args:
            amount: Monto a cobrar
            currency: Código de moneda (MXN, USD, etc.)
            payment_method: Información del método de pago
            metadata: Metadatos adicionales
            
        Returns:
            Dict con resultado de la transacción
        """
        pass
    
    @abstractmethod
    def create_payment_method(
        self,
        user_id: str,
        payment_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Crear/tokenizar un método de pago.
        
        Args:
            user_id: ID del usuario
            payment_data: Datos del método de pago
            
        Returns:
            Dict con información del método creado
        """
        pass
    
    @abstractmethod
    def refund_payment(
        self,
        transaction_id: str,
        amount: Optional[Decimal] = None,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Reembolsar un pago.
        
        Args:
            transaction_id: ID de la transacción original
            amount: Monto a reembolsar (None para reembolso total)
            reason: Razón del reembolso
            
        Returns:
            Dict con resultado del reembolso
        """
        pass
    
    @abstractmethod
    def get_transaction_status(self, transaction_id: str) -> Dict[str, Any]:
        """
        Obtener estado de una transacción.
        
        Args:
            transaction_id: ID de la transacción
            
        Returns:
            Dict con información de la transacción
        """
        pass
    
    def handle_webhook(self, data: Dict[str, Any], headers: Dict[str, str]) -> Dict[str, Any]:
        """
        Procesar webhook de la pasarela.
        
        Args:
            data: Datos del webhook
            headers: Headers de la petición
            
        Returns:
            Dict con resultado del procesamiento
        """
        return {
            'success': False,
            'message': 'Webhook handling not implemented'
        }
    
    def format_amount(self, amount: Decimal, currency: str) -> int:
        """
        Formatear monto según requerimientos de la pasarela.
        La mayoría usa centavos.
        """
        if currency in ['MXN', 'USD', 'EUR']:
            return int(amount * 100)
        return int(amount)
    
    def log_transaction(self, action: str, data: Dict[str, Any]):
        """Registrar actividad de transacción."""
        logger.info(f"[{self.name}] {action}: {data}")
    
    def handle_error(self, error: Exception, context: Dict[str, Any]) -> Dict[str, Any]:
        """Manejar errores de forma consistente."""
        logger.error(f"[{self.name}] Error: {str(error)}, Context: {context}")
        return {
            'success': False,
            'error': str(error),
            'error_code': getattr(error, 'code', 'unknown'),
            'context': context
        }


class PaymentResult:
    """Resultado estandarizado de operaciones de pago."""
    
    def __init__(
        self,
        success: bool,
        transaction_id: Optional[str] = None,
        amount: Optional[Decimal] = None,
        currency: Optional[str] = None,
        status: Optional[str] = None,
        message: Optional[str] = None,
        raw_response: Optional[Dict[str, Any]] = None,
        error_code: Optional[str] = None
    ):
        self.success = success
        self.transaction_id = transaction_id
        self.amount = amount
        self.currency = currency
        self.status = status
        self.message = message
        self.raw_response = raw_response or {}
        self.error_code = error_code
    
    def to_dict(self) -> Dict[str, Any]:
        """Convertir a diccionario."""
        return {
            'success': self.success,
            'transaction_id': self.transaction_id,
            'amount': str(self.amount) if self.amount else None,
            'currency': self.currency,
            'status': self.status,
            'message': self.message,
            'error_code': self.error_code,
            'raw_response': self.raw_response
        }
    
    @classmethod
    def from_gateway_response(cls, gateway_name: str, response: Dict[str, Any]) -> 'PaymentResult':
        """Crear resultado desde respuesta de pasarela específica."""
        # Implementar mapeo específico por pasarela
        if gateway_name == 'stripe':
            return cls._from_stripe_response(response)
        elif gateway_name == 'paypal':
            return cls._from_paypal_response(response)
        else:
            return cls(
                success=response.get('success', False),
                raw_response=response
            )
    
    @classmethod
    def _from_stripe_response(cls, response: Dict[str, Any]) -> 'PaymentResult':
        """Mapear respuesta de Stripe."""
        return cls(
            success=response.get('status') == 'succeeded',
            transaction_id=response.get('id'),
            amount=Decimal(str(response.get('amount', 0))) / 100,
            currency=response.get('currency', '').upper(),
            status=response.get('status'),
            raw_response=response
        )
    
    @classmethod
    def _from_paypal_response(cls, response: Dict[str, Any]) -> 'PaymentResult':
        """Mapear respuesta de PayPal."""
        return cls(
            success=response.get('state') == 'approved',
            transaction_id=response.get('id'),
            amount=Decimal(response.get('transactions', [{}])[0].get('amount', {}).get('total', 0)),
            currency=response.get('transactions', [{}])[0].get('amount', {}).get('currency', ''),
            status=response.get('state'),
            raw_response=response
        )