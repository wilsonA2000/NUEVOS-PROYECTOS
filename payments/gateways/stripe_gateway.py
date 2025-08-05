"""
Integración con Stripe para pagos.
"""

import stripe
from decimal import Decimal
from typing import Dict, Any, Optional
from .base import PaymentGatewayBase, PaymentResult


class StripeGateway(PaymentGatewayBase):
    """Implementación de pasarela de pago con Stripe."""
    
    def validate_config(self):
        """Validar configuración de Stripe."""
        required_fields = ['secret_key', 'publishable_key', 'webhook_secret']
        for field in required_fields:
            if field not in self.config:
                raise ValueError(f"Falta configuración requerida: {field}")
        
        # Configurar Stripe
        stripe.api_key = self.config['secret_key']
    
    def process_payment(
        self,
        amount: Decimal,
        currency: str,
        payment_method: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Procesar pago con Stripe."""
        try:
            # Crear intento de pago
            intent = stripe.PaymentIntent.create(
                amount=self.format_amount(amount, currency),
                currency=currency.lower(),
                payment_method=payment_method.get('stripe_payment_method_id'),
                customer=payment_method.get('stripe_customer_id'),
                confirm=True,
                metadata=metadata or {},
                description=metadata.get('description', 'Pago VeriHome')
            )
            
            self.log_transaction('payment_processed', {
                'intent_id': intent.id,
                'amount': str(amount),
                'currency': currency
            })
            
            return PaymentResult(
                success=intent.status == 'succeeded',
                transaction_id=intent.id,
                amount=amount,
                currency=currency,
                status=intent.status,
                raw_response=intent.to_dict()
            ).to_dict()
            
        except stripe.error.CardError as e:
            return self.handle_card_error(e)
        except stripe.error.StripeError as e:
            return self.handle_error(e, {
                'amount': str(amount),
                'currency': currency
            })
    
    def create_payment_method(
        self,
        user_id: str,
        payment_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Crear método de pago en Stripe."""
        try:
            # Crear o recuperar cliente
            customer = self._get_or_create_customer(user_id, payment_data)
            
            # Adjuntar método de pago al cliente
            if 'payment_method_id' in payment_data:
                payment_method = stripe.PaymentMethod.attach(
                    payment_data['payment_method_id'],
                    customer=customer.id
                )
            else:
                # Crear método de pago desde token
                payment_method = stripe.PaymentMethod.create(
                    type='card',
                    card={
                        'token': payment_data.get('token')
                    }
                )
                payment_method = stripe.PaymentMethod.attach(
                    payment_method.id,
                    customer=customer.id
                )
            
            # Establecer como método de pago por defecto si se indica
            if payment_data.get('set_as_default', False):
                stripe.Customer.modify(
                    customer.id,
                    invoice_settings={
                        'default_payment_method': payment_method.id
                    }
                )
            
            return {
                'success': True,
                'payment_method_id': payment_method.id,
                'customer_id': customer.id,
                'card': {
                    'brand': payment_method.card.brand,
                    'last4': payment_method.card.last4,
                    'exp_month': payment_method.card.exp_month,
                    'exp_year': payment_method.card.exp_year
                }
            }
            
        except stripe.error.StripeError as e:
            return self.handle_error(e, {'user_id': user_id})
    
    def refund_payment(
        self,
        transaction_id: str,
        amount: Optional[Decimal] = None,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """Crear reembolso en Stripe."""
        try:
            refund_data = {
                'payment_intent': transaction_id,
                'reason': self._map_refund_reason(reason)
            }
            
            if amount:
                refund_data['amount'] = self.format_amount(amount, 'MXN')
            
            refund = stripe.Refund.create(**refund_data)
            
            return PaymentResult(
                success=refund.status == 'succeeded',
                transaction_id=refund.id,
                amount=Decimal(str(refund.amount)) / 100,
                currency=refund.currency.upper(),
                status=refund.status,
                raw_response=refund.to_dict()
            ).to_dict()
            
        except stripe.error.StripeError as e:
            return self.handle_error(e, {
                'transaction_id': transaction_id,
                'amount': str(amount) if amount else 'full'
            })
    
    def get_transaction_status(self, transaction_id: str) -> Dict[str, Any]:
        """Obtener estado de transacción en Stripe."""
        try:
            # Intentar como PaymentIntent primero
            try:
                intent = stripe.PaymentIntent.retrieve(transaction_id)
                return {
                    'success': True,
                    'status': intent.status,
                    'amount': Decimal(str(intent.amount)) / 100,
                    'currency': intent.currency.upper(),
                    'created': intent.created,
                    'charges': [charge.to_dict() for charge in intent.charges.data]
                }
            except stripe.error.InvalidRequestError:
                # Intentar como Charge
                charge = stripe.Charge.retrieve(transaction_id)
                return {
                    'success': True,
                    'status': 'succeeded' if charge.paid else 'failed',
                    'amount': Decimal(str(charge.amount)) / 100,
                    'currency': charge.currency.upper(),
                    'created': charge.created,
                    'refunded': charge.refunded,
                    'refunds': [refund.to_dict() for refund in charge.refunds.data]
                }
                
        except stripe.error.StripeError as e:
            return self.handle_error(e, {'transaction_id': transaction_id})
    
    def handle_webhook(self, data: Dict[str, Any], headers: Dict[str, str]) -> Dict[str, Any]:
        """Procesar webhook de Stripe."""
        try:
            # Verificar firma del webhook
            sig_header = headers.get('stripe-signature')
            webhook_secret = self.config['webhook_secret']
            
            event = stripe.Webhook.construct_event(
                payload=data,
                sig_header=sig_header,
                secret=webhook_secret
            )
            
            # Procesar evento
            if event.type == 'payment_intent.succeeded':
                return self._handle_payment_succeeded(event.data.object)
            elif event.type == 'payment_intent.payment_failed':
                return self._handle_payment_failed(event.data.object)
            elif event.type == 'customer.subscription.created':
                return self._handle_subscription_created(event.data.object)
            else:
                return {
                    'success': True,
                    'message': f'Evento {event.type} recibido pero no procesado'
                }
                
        except stripe.error.SignatureVerificationError:
            return {
                'success': False,
                'error': 'Invalid signature'
            }
        except Exception as e:
            return self.handle_error(e, {'webhook_type': data.get('type')})
    
    def _get_or_create_customer(self, user_id: str, user_data: Dict[str, Any]):
        """Obtener o crear cliente en Stripe."""
        # Buscar cliente existente
        customers = stripe.Customer.list(
            email=user_data.get('email'),
            limit=1
        )
        
        if customers.data:
            return customers.data[0]
        
        # Crear nuevo cliente
        return stripe.Customer.create(
            email=user_data.get('email'),
            name=user_data.get('name'),
            phone=user_data.get('phone'),
            metadata={
                'user_id': user_id,
                'platform': 'verihome'
            }
        )
    
    def handle_card_error(self, error: stripe.error.CardError) -> Dict[str, Any]:
        """Manejar errores de tarjeta específicos."""
        error_messages = {
            'card_declined': 'La tarjeta fue rechazada',
            'insufficient_funds': 'Fondos insuficientes',
            'expired_card': 'La tarjeta ha expirado',
            'incorrect_cvc': 'El código de seguridad es incorrecto',
            'processing_error': 'Error al procesar el pago'
        }
        
        return {
            'success': False,
            'error': error_messages.get(error.code, 'Error al procesar la tarjeta'),
            'error_code': error.code,
            'decline_code': error.decline_code
        }
    
    def _map_refund_reason(self, reason: Optional[str]) -> str:
        """Mapear razón de reembolso a valores de Stripe."""
        reason_map = {
            'duplicate': 'duplicate',
            'fraudulent': 'fraudulent',
            'requested': 'requested_by_customer',
            'other': 'requested_by_customer'
        }
        return reason_map.get(reason, 'requested_by_customer')
    
    def _handle_payment_succeeded(self, payment_intent) -> Dict[str, Any]:
        """Procesar webhook de pago exitoso."""
        return {
            'success': True,
            'event': 'payment_succeeded',
            'payment_intent_id': payment_intent.id,
            'amount': payment_intent.amount,
            'currency': payment_intent.currency
        }
    
    def _handle_payment_failed(self, payment_intent) -> Dict[str, Any]:
        """Procesar webhook de pago fallido."""
        return {
            'success': True,
            'event': 'payment_failed',
            'payment_intent_id': payment_intent.id,
            'error': payment_intent.last_payment_error
        }
    
    def _handle_subscription_created(self, subscription) -> Dict[str, Any]:
        """Procesar webhook de suscripción creada."""
        return {
            'success': True,
            'event': 'subscription_created',
            'subscription_id': subscription.id,
            'customer_id': subscription.customer,
            'status': subscription.status
        }