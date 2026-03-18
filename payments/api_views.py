"""
Vistas de API REST para la aplicación de pagos de VeriHome.
OPTIMIZED with performance monitoring and intelligent caching.
"""

from rest_framework import viewsets, generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from django.contrib.auth import get_user_model
from django.db import models, transaction as db_transaction
from django.db.models import Q, Sum, Count
from django.utils import timezone
from django.conf import settings
from decimal import Decimal
import stripe
import json
# Import optimizations
from core.optimizations import (
    QueryOptimizationMixin, OptimizedPagination, PerformanceTrackingMixin,
    cache_expensive_operation, OptimizedTransactionSerializer
)
from .models import (
    Transaction, PaymentMethod, Invoice, EscrowAccount, 
    PaymentPlan, PaymentInstallment, RentPaymentSchedule, 
    RentPaymentReminder
)
from .gateways.stripe_gateway import StripeGateway
from .gateways.base import PaymentResult
from .serializers import (
    TransactionSerializer, CreateTransactionSerializer,
    PaymentMethodSerializer, InvoiceSerializer, CreateInvoiceSerializer,
    EscrowAccountSerializer, PaymentPlanSerializer, 
    PaymentInstallmentSerializer, PaymentStatsSerializer, BalanceSerializer,
    RentPaymentScheduleSerializer
)
from users.services import AdminActionLogger

User = get_user_model()

# Optimized ViewSets
class TransactionViewSet(QueryOptimizationMixin, PerformanceTrackingMixin, viewsets.ModelViewSet):
    """ViewSet para transacciones - OPTIMIZADO."""
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = OptimizedPagination
    
    def get_queryset(self):
        base_queryset = Transaction.objects.filter(
            Q(payer=self.request.user) | Q(payee=self.request.user)
        ).order_by('-created_at')
        return self.get_optimized_queryset(base_queryset)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateTransactionSerializer
        return TransactionSerializer

    def perform_create(self, serializer):
        transaction = serializer.save()
        request = self.request
        # Logging automático
        if hasattr(request, 'impersonation_session'):
            logger = AdminActionLogger(request.impersonation_session)
            logger.log_action(
                action_type='payment_create',
                description=f'Creación de pago {transaction.id}',
                target_object=transaction,
                new_data=serializer.data,
                notify_user=True
            )
        else:
            from users.models import UserActivityLog
            UserActivityLog.objects.create(
                user=request.user,
                activity_type='payment_create',
                description=f'Creación de pago {transaction.id}',
                metadata={'transaction_id': str(transaction.id)},
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
            )
    
    def perform_update(self, serializer):
        transaction = serializer.save()
        request = self.request
        # Logging automático
        if hasattr(request, 'impersonation_session'):
            logger = AdminActionLogger(request.impersonation_session)
            logger.log_action(
                action_type='payment_update',
                description=f'Actualización de pago {transaction.id}',
                target_object=transaction,
                new_data=serializer.data,
                notify_user=True
            )
        else:
            from users.models import UserActivityLog
            UserActivityLog.objects.create(
                user=request.user,
                activity_type='payment_update',
                description=f'Actualización de pago {transaction.id}',
                metadata={'transaction_id': str(transaction.id)},
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
            )
    
    def perform_destroy(self, instance):
        transaction_id = str(instance.id)
        instance.delete()
        
        # Logging automático
        request = self.request
        if hasattr(request, 'impersonation_session'):
            logger = AdminActionLogger(request.impersonation_session)
            logger.log_action(
                action_type='payment_delete',
                description=f'Eliminación de pago {transaction_id}',
                target_object=None,
                new_data={'deleted_transaction_id': transaction_id},
                notify_user=True
            )
        else:
            from users.models import UserActivityLog
            UserActivityLog.objects.create(
                user=request.user,
                activity_type='payment_delete',
                description=f'Eliminación de pago {transaction_id}',
                metadata={'deleted_transaction_id': transaction_id},
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
            )

class PaymentMethodViewSet(viewsets.ModelViewSet):
    """ViewSet para métodos de pago."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return PaymentMethod.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        return PaymentMethodSerializer
    
    def perform_create(self, serializer):
        payment_method = serializer.save(user=self.request.user)
        
        # Logging automático
        request = self.request
        if hasattr(request, 'impersonation_session'):
            logger = AdminActionLogger(request.impersonation_session)
            logger.log_action(
                action_type='payment_method_create',
                description=f'Agregar método de pago {payment_method.id}',
                target_object=payment_method,
                new_data=serializer.data,
                notify_user=True
            )
        else:
            from users.models import UserActivityLog
            UserActivityLog.objects.create(
                user=request.user,
                activity_type='payment_method_create',
                description=f'Agregar método de pago {payment_method.id}',
                metadata={'payment_method_id': str(payment_method.id)},
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
            )
    
    def perform_update(self, serializer):
        payment_method = serializer.save()
        
        # Logging automático
        request = self.request
        if hasattr(request, 'impersonation_session'):
            logger = AdminActionLogger(request.impersonation_session)
            logger.log_action(
                action_type='payment_method_update',
                description=f'Actualizar método de pago {payment_method.id}',
                target_object=payment_method,
                new_data=serializer.data,
                notify_user=True
            )
        else:
            from users.models import UserActivityLog
            UserActivityLog.objects.create(
                user=request.user,
                activity_type='payment_method_update',
                description=f'Actualizar método de pago {payment_method.id}',
                metadata={'payment_method_id': str(payment_method.id)},
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
            )
    
    def perform_destroy(self, instance):
        payment_method_id = str(instance.id)
        instance.delete()
        
        # Logging automático
        request = self.request
        if hasattr(request, 'impersonation_session'):
            logger = AdminActionLogger(request.impersonation_session)
            logger.log_action(
                action_type='payment_method_delete',
                description=f'Eliminar método de pago {payment_method_id}',
                target_object=None,
                new_data={'deleted_payment_method_id': payment_method_id},
                notify_user=True
            )
        else:
            from users.models import UserActivityLog
            UserActivityLog.objects.create(
                user=request.user,
                activity_type='payment_method_delete',
                description=f'Eliminar método de pago {payment_method_id}',
                metadata={'deleted_payment_method_id': payment_method_id},
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
            )

class InvoiceViewSet(viewsets.ModelViewSet):
    """ViewSet para facturas."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Invoice.objects.filter(
            issuer=self.request.user
        ) | Invoice.objects.filter(
            recipient=self.request.user
        )
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateInvoiceSerializer
        return InvoiceSerializer
    
    def perform_create(self, serializer):
        invoice = serializer.save(issuer=self.request.user)
        
        # Logging automático
        request = self.request
        if hasattr(request, 'impersonation_session'):
            logger = AdminActionLogger(request.impersonation_session)
            logger.log_action(
                action_type='invoice_create',
                description=f'Creación de factura {invoice.id}',
                target_object=invoice,
                new_data=serializer.data,
                notify_user=True
            )
        else:
            from users.models import UserActivityLog
            UserActivityLog.objects.create(
                user=request.user,
                activity_type='invoice_create',
                description=f'Creación de factura {invoice.id}',
                metadata={'invoice_id': str(invoice.id)},
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
            )
    
    def perform_update(self, serializer):
        invoice = serializer.save()
        
        # Logging automático
        request = self.request
        if hasattr(request, 'impersonation_session'):
            logger = AdminActionLogger(request.impersonation_session)
            logger.log_action(
                action_type='invoice_update',
                description=f'Actualización de factura {invoice.id}',
                target_object=invoice,
                new_data=serializer.data,
                notify_user=True
            )
        else:
            from users.models import UserActivityLog
            UserActivityLog.objects.create(
                user=request.user,
                activity_type='invoice_update',
                description=f'Actualización de factura {invoice.id}',
                metadata={'invoice_id': str(invoice.id)},
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
            )
    
    def perform_destroy(self, instance):
        invoice_id = str(instance.id)
        instance.delete()
        
        # Logging automático
        request = self.request
        if hasattr(request, 'impersonation_session'):
            logger = AdminActionLogger(request.impersonation_session)
            logger.log_action(
                action_type='invoice_delete',
                description=f'Eliminación de factura {invoice_id}',
                target_object=None,
                new_data={'deleted_invoice_id': invoice_id},
                notify_user=True
            )
        else:
            from users.models import UserActivityLog
            UserActivityLog.objects.create(
                user=request.user,
                activity_type='invoice_delete',
                description=f'Eliminación de factura {invoice_id}',
                metadata={'deleted_invoice_id': invoice_id},
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
            )

class PaymentViewSet(viewsets.ModelViewSet):
    """ViewSet mejorado para pagos con integración de pasarelas."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Transaction.objects.filter(
            Q(payer=self.request.user) | Q(payee=self.request.user)
        ).select_related('payer', 'payee', 'payment_method')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateTransactionSerializer
        return TransactionSerializer
    
    @action(detail=False, methods=['post'])
    def process_payment(self, request):
        """
        Procesar un pago usando la pasarela configurada.

        SECURITY: Validates that contract is signed before processing payment.
        """
        serializer = CreateTransactionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            # VALIDATION: Check if contract is provided and valid
            contract_id = request.data.get('contract')
            if contract_id:
                from contracts.models import LandlordControlledContract
                try:
                    contract = LandlordControlledContract.objects.get(id=contract_id)

                    # Validate contract is signed/active
                    if contract.workflow_status not in ['active', 'completed_biometric']:
                        return Response({
                            'error': 'Cannot process payment for unsigned contract',
                            'detail': f'Contract status is "{contract.workflow_status}". '
                                      'All parties must complete biometric authentication first.'
                        }, status=status.HTTP_400_BAD_REQUEST)

                    # Validate user is authorized (tenant, landlord, or guarantor)
                    if request.user not in [contract.tenant, contract.landlord, contract.guarantor]:
                        return Response({
                            'error': 'You are not authorized to make payments for this contract'
                        }, status=status.HTTP_403_FORBIDDEN)

                except LandlordControlledContract.DoesNotExist:
                    return Response({
                        'error': 'Contract not found'
                    }, status=status.HTTP_404_NOT_FOUND)

            with db_transaction.atomic():
                # Crear el pago
                payment = serializer.save(payer=request.user)
                
                # Procesar con la pasarela de pago
                gateway = StripeGateway({
                    'secret_key': settings.STRIPE_SECRET_KEY,
                    'publishable_key': settings.STRIPE_PUBLISHABLE_KEY,
                    'webhook_secret': settings.STRIPE_WEBHOOK_SECRET
                })
                
                # Datos del método de pago
                payment_method_data = {
                    'stripe_payment_method_id': payment.payment_method.token,
                    'stripe_customer_id': getattr(payment.payer, 'stripe_customer_id', None)
                }
                
                # Procesar el pago
                result = gateway.process_payment(
                    amount=payment.amount,
                    currency=payment.currency,
                    payment_method=payment_method_data,
                    metadata={
                        'payment_id': str(payment.id),
                        'description': payment.description
                    }
                )
                
                # Actualizar el pago con el resultado
                if result['success']:
                    payment.status = 'completed'
                    payment.transaction_id = result['transaction_id']
                    payment.processed_at = timezone.now()
                else:
                    payment.status = 'failed'
                    payment.failure_reason = result.get('error', 'Payment failed')
                
                payment.save()
                
                return Response(TransactionSerializer(payment).data, 
                              status=status.HTTP_201_CREATED if result['success'] else status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response(
                {'error': f'Error processing payment: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def refund(self, request, pk=None):
        """Reembolsar un pago."""
        payment = self.get_object()
        
        if payment.status != 'completed':
            return Response(
                {'error': 'Only completed payments can be refunded'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if payment.payee != request.user:
            return Response(
                {'error': 'Only the payee can initiate refunds'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            gateway = StripeGateway({
                'secret_key': settings.STRIPE_SECRET_KEY,
                'publishable_key': settings.STRIPE_PUBLISHABLE_KEY,
                'webhook_secret': settings.STRIPE_WEBHOOK_SECRET
            })
            
            amount = Decimal(request.data.get('amount', payment.amount))
            reason = request.data.get('reason', 'Requested by merchant')
            
            result = gateway.refund_payment(
                transaction_id=payment.transaction_id,
                amount=amount,
                reason=reason
            )
            
            if result['success']:
                payment.status = 'refunded'
                payment.refunded_amount = amount
                payment.refund_reason = reason
                payment.refunded_at = timezone.now()
                payment.save()
                
                return Response({'message': 'Payment refunded successfully'})
            else:
                return Response(
                    {'error': result.get('error', 'Refund failed')}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            return Response(
                {'error': f'Error processing refund: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class EscrowAccountViewSet(viewsets.ModelViewSet):
    """ViewSet para cuentas de depósito en garantía mejorado."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return EscrowAccount.objects.filter(
            Q(buyer=self.request.user) | Q(seller=self.request.user)
        ).select_related('buyer', 'seller', 'contract', 'property')
    
    def get_serializer_class(self):
        return EscrowAccountSerializer
    
    @action(detail=True, methods=['post'])
    def release_funds(self, request, pk=None):
        """Liberar fondos del escrow."""
        escrow = self.get_object()
        
        if escrow.seller != request.user:
            return Response(
                {'error': 'Only the beneficiary can release funds'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            transaction = escrow.release_funds(
                release_reason=request.data.get('reason', 'Conditions met')
            )
            return Response({
                'message': 'Funds released successfully',
                'transaction_id': transaction.id
            })
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def refund_escrow(self, request, pk=None):
        """Reembolsar fondos del escrow al depositante."""
        escrow = self.get_object()
        
        if escrow.buyer != request.user and escrow.seller != request.user:
            return Response(
                {'error': 'Access denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            transaction = escrow.refund(
                refund_reason=request.data.get('reason', 'Agreement cancelled')
            )
            return Response({
                'message': 'Escrow refunded successfully',
                'transaction_id': transaction.id
            })
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def initiate_dispute(self, request, pk=None):
        """Iniciar disputa sobre el escrow."""
        escrow = self.get_object()
        
        if escrow.buyer != request.user and escrow.seller != request.user:
            return Response(
                {'error': 'Access denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        reason = request.data.get('reason')
        if not reason:
            return Response(
                {'error': 'Dispute reason is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            escrow.initiate_dispute(reason)
            return Response({'message': 'Dispute initiated successfully'})
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def resolve_dispute(self, request, pk=None):
        """Resolver disputa del escrow (solo administradores)."""
        if not request.user.is_staff:
            return Response(
                {'error': 'Only administrators can resolve disputes'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        escrow = self.get_object()
        resolution = request.data.get('resolution')
        release_to_beneficiary = request.data.get('release_to_beneficiary', True)
        
        if not resolution:
            return Response(
                {'error': 'Resolution description is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            transaction = escrow.resolve_dispute(resolution, release_to_beneficiary)
            return Response({
                'message': 'Dispute resolved successfully',
                'transaction_id': transaction.id
            })
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class PaymentPlanViewSet(viewsets.ModelViewSet):
    """ViewSet mejorado para planes de pago."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return PaymentPlan.objects.filter(
            user=self.request.user
        ).select_related('user', 'contract')
    
    def get_serializer_class(self):
        return PaymentPlanSerializer
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Aprobar un plan de pago."""
        plan = self.get_object()
        
        if plan.user != request.user:
            return Response(
                {'error': 'Only the plan owner can approve payment plans'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Cambiar el estado a activo si no tiene método approve
            plan.status = 'active'
            plan.save()
            return Response({'message': 'Payment plan approved successfully'})
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def installments(self, request, pk=None):
        """Obtener cuotas del plan de pago."""
        plan = self.get_object()
        installments = plan.installments.all().order_by('installment_number')
        # Usar PaymentInstallment que es el modelo real
        from .serializers import PaymentInstallmentSerializer
        serializer = PaymentInstallmentSerializer(installments, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def pay_installment(self, request, pk=None):
        """Pagar una cuota específica."""
        plan = self.get_object()
        installment_number = request.data.get('installment_number')
        payment_method_id = request.data.get('payment_method_id')
        
        if not installment_number:
            return Response(
                {'error': 'installment_number is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            installment = plan.installments.get(
                installment_number=installment_number,
                status='pending'
            )
        except PaymentInstallment.DoesNotExist:
            return Response(
                {'error': 'Installment not found or already paid'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            # Crear transacción para el pago de la cuota
            transaction = Transaction.objects.create(
                transaction_type='installment_payment',
                direction='outbound',
                payer=plan.debtor,
                payee=plan.creditor,
                amount=installment.amount,
                currency=plan.currency,
                total_amount=installment.amount,
                status='completed',
                description=f'Payment for installment {installment_number} of plan {plan.plan_number}',
                contract=plan.contract,
                property=plan.property
            )
            
            # Marcar cuota como pagada
            installment.mark_as_paid(transaction)
            
            return Response({
                'message': 'Installment paid successfully',
                'transaction_id': transaction.id,
                'remaining_balance': plan.total_pending
            })
        except Exception as e:
            return Response(
                {'error': f'Error processing installment payment: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class PaymentPlanInstallmentViewSet(viewsets.ModelViewSet):
    """ViewSet para cuotas de planes de pago."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return PaymentInstallment.objects.filter(
            payment_plan__user=self.request.user
        ).select_related('payment_plan', 'transaction')
    
    def get_serializer_class(self):
        from .serializers import PaymentInstallmentSerializer
        return PaymentInstallmentSerializer
    
    @action(detail=True, methods=['post'])
    def apply_late_fee(self, request, pk=None):
        """Aplicar cargo por mora a una cuota vencida."""
        installment = self.get_object()
        
        if installment.payment_plan.user != request.user:
            return Response(
                {'error': 'Only the creditor can apply late fees'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            installment.apply_late_fee()
            return Response({
                'message': 'Late fee applied successfully',
                'new_amount': installment.amount,
                'late_fee': installment.late_fee_applied
            })
        except Exception as e:
            return Response(
                {'error': f'Error applying late fee: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# class EscrowMilestoneViewSet(viewsets.ModelViewSet):
#     """ViewSet para hitos de escrow."""
#     permission_classes = [permissions.IsAuthenticated]
#     
#     def get_queryset(self):
#         return EscrowMilestone.objects.filter(
#             Q(escrow_account__buyer=self.request.user) | 
#             Q(escrow_account__seller=self.request.user)
#         ).select_related('escrow_account')
#     
#     def get_serializer_class(self):
#         return EscrowMilestoneSerializer
#     
#     @action(detail=True, methods=['post'])
#     def complete(self, request, pk=None):
#         """Marcar hito como completado y liberar fondos."""
#         milestone = self.get_object()
#         
#         if milestone.escrow_account.seller != request.user:
#             return Response(
#                 {'error': 'Only the beneficiary can complete milestones'}, 
#                 status=status.HTTP_403_FORBIDDEN
#             )
#         
#         try:
#             transaction = milestone.complete_and_release()
#             return Response({
#                 'message': 'Milestone completed and funds released',
#                 'transaction_id': transaction.id
#             })
#         except ValueError as e:
#             return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

# Vistas de API personalizadas
class ProcessPaymentAPIView(APIView):
    """Vista para procesar un pago."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        # Obtener datos del pago
        payee_id = request.data.get('payee_id')
        amount = request.data.get('amount')
        payment_method_id = request.data.get('payment_method_id')
        transaction_type = request.data.get('transaction_type', 'service_payment')
        
        if not all([payee_id, amount, payment_method_id]):
            return Response(
                {"detail": "payee_id, amount y payment_method_id son requeridos"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            payee = User.objects.get(id=payee_id)
            payment_method = PaymentMethod.objects.get(
                id=payment_method_id,
                user=request.user
            )
            
            # Crear transacción
            transaction = Transaction.objects.create(
                payer=request.user,
                payee=payee,
                transaction_type=transaction_type,
                direction='outbound',
                amount=amount,
                payment_method=payment_method,
                description=request.data.get('description', 'Pago procesado'),
                status='processing'
            )
            
            # Aquí se integraría con la pasarela de pago real
            # Por ahora simulamos el procesamiento
            transaction.status = 'completed'
            transaction.processed_at = timezone.now()
            transaction.completed_at = timezone.now()
            transaction.save()
            
            # Logging automático
            if hasattr(request, 'impersonation_session'):
                logger = AdminActionLogger(request.impersonation_session)
                logger.log_action(
                    action_type='payment_create',
                    description=f'Procesamiento de pago {transaction.id}',
                    target_object=transaction,
                    new_data={'status': 'completed'},
                    notify_user=True
                )
            else:
                from users.models import UserActivityLog
                UserActivityLog.objects.create(
                    user=request.user,
                    activity_type='payment_create',
                    description=f'Procesamiento de pago {transaction.id}',
                    metadata={'transaction_id': str(transaction.id)},
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                )
            
            return Response(TransactionSerializer(transaction).data, status=status.HTTP_201_CREATED)
            
        except (User.DoesNotExist, PaymentMethod.DoesNotExist):
            return Response(
                {"detail": "Usuario o método de pago no encontrado"}, 
                status=status.HTTP_404_NOT_FOUND
            )

class QuickPayAPIView(APIView):
    """Vista para pago rápido."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        # Implementación similar a ProcessPayment pero simplificada
        return Response({"detail": "Función no implementada"}, status=status.HTTP_501_NOT_IMPLEMENTED)

class AddPaymentMethodAPIView(APIView):
    """Vista para agregar método de pago."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = PaymentMethodSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            payment_method = serializer.save()
            return Response(PaymentMethodSerializer(payment_method).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VerifyPaymentMethodAPIView(APIView):
    """Vista para verificar método de pago."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        try:
            payment_method = PaymentMethod.objects.get(
                id=pk,
                user=request.user
            )
            
            # Aquí se integraría con la pasarela de pago para verificación
            payment_method.is_verified = True
            payment_method.verified_at = timezone.now()
            payment_method.save()
            
            # Logging automático
            if hasattr(request, 'impersonation_session'):
                logger = AdminActionLogger(request.impersonation_session)
                logger.log_action(
                    action_type='payment_verify',
                    description=f'Verificación de método de pago {payment_method.id}',
                    target_object=payment_method,
                    new_data={'is_verified': True},
                    notify_user=True
                )
            else:
                from users.models import UserActivityLog
                UserActivityLog.objects.create(
                    user=request.user,
                    activity_type='payment_verify',
                    description=f'Verificación de método de pago {payment_method.id}',
                    metadata={'payment_method_id': str(payment_method.id)},
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                )
            
            return Response({"detail": "Método de pago verificado correctamente"})
            
        except PaymentMethod.DoesNotExist:
            return Response(
                {"detail": "Método de pago no encontrado"}, 
                status=status.HTTP_404_NOT_FOUND
            )

class SetDefaultPaymentMethodAPIView(APIView):
    """Vista para establecer método de pago predeterminado."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        try:
            payment_method = PaymentMethod.objects.get(
                id=pk,
                user=request.user
            )
            
            payment_method.is_default = True
            payment_method.save()
            
            return Response({"detail": "Método de pago establecido como predeterminado"})
            
        except PaymentMethod.DoesNotExist:
            return Response(
                {"detail": "Método de pago no encontrado"}, 
                status=status.HTTP_404_NOT_FOUND
            )

class FundEscrowAPIView(APIView):
    """Vista para fondear cuenta de depósito en garantía."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        try:
            escrow = EscrowAccount.objects.get(
                id=pk,
                buyer=request.user
            )
            
            if escrow.status != 'pending':
                return Response(
                    {"detail": "La cuenta de escrow no está en estado pendiente"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Aquí se procesaría el pago real
            escrow.status = 'funded'
            escrow.funded_at = timezone.now()
            escrow.save()
            
            return Response({"detail": "Escrow financiado correctamente"})
            
        except EscrowAccount.DoesNotExist:
            return Response(
                {"detail": "Cuenta de escrow no encontrada"}, 
                status=status.HTTP_404_NOT_FOUND
            )

class ReleaseEscrowAPIView(APIView):
    """Vista para liberar fondos de depósito en garantía."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        try:
            escrow = EscrowAccount.objects.get(
                id=pk,
                seller=request.user
            )
            
            if escrow.status != 'funded':
                return Response(
                    {"detail": "La cuenta de escrow no está financiada"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            escrow.status = 'released'
            escrow.released_at = timezone.now()
            escrow.save()
            
            return Response({"detail": "Escrow liberado correctamente"})
            
        except EscrowAccount.DoesNotExist:
            return Response(
                {"detail": "Cuenta de escrow no encontrada"}, 
                status=status.HTTP_404_NOT_FOUND
            )

class CreateInvoiceAPIView(APIView):
    """Vista para crear factura."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = CreateInvoiceSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            invoice = serializer.save()
            return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PayInvoiceAPIView(APIView):
    """Vista para pagar factura."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        try:
            invoice = Invoice.objects.get(
                id=pk,
                recipient=request.user
            )
            
            if invoice.status == 'paid':
                return Response(
                    {"detail": "La factura ya está pagada"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Aquí se procesaría el pago real
            invoice.status = 'paid'
            invoice.paid_date = timezone.now().date()
            invoice.save()
            
            return Response({"detail": "Factura pagada correctamente"})
            
        except Invoice.DoesNotExist:
            return Response(
                {"detail": "Factura no encontrada"}, 
                status=status.HTTP_404_NOT_FOUND
            )

class SendInvoiceAPIView(APIView):
    """Vista para enviar factura."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        try:
            invoice = Invoice.objects.get(
                id=pk,
                issuer=request.user
            )
            
            invoice.status = 'sent'
            invoice.sent_at = timezone.now()
            invoice.save()
            
            return Response({"detail": "Factura enviada correctamente"})
            
        except Invoice.DoesNotExist:
            return Response(
                {"detail": "Factura no encontrada"}, 
                status=status.HTTP_404_NOT_FOUND
            )

class BalanceAPIView(APIView):
    """Vista para obtener balance de usuario."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Calcular balance (implementación simplificada)
        # En un sistema real, esto vendría de una cuenta bancaria o wallet
        available_balance = 0.00
        pending_balance = 0.00
        total_balance = available_balance + pending_balance
        
        balance_data = {
            'available_balance': available_balance,
            'pending_balance': pending_balance,
            'total_balance': total_balance,
            'currency': 'MXN'
        }
        
        return Response(balance_data)

class PaymentDashboardStatsAPIView(APIView):
    """Vista para estadísticas del dashboard de pagos."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Obtener transacciones del usuario
        user_transactions = Transaction.objects.filter(
            payer=user
        ) | Transaction.objects.filter(
            payee=user
        )
        
        # Calcular estadísticas
        total_transactions = user_transactions.count()
        total_amount = user_transactions.aggregate(
            total=models.Sum('total_amount')
        )['total'] or 0
        
        pending_transactions = user_transactions.filter(status='pending').count()
        completed_transactions = user_transactions.filter(status='completed').count()
        failed_transactions = user_transactions.filter(status='failed').count()
        
        # Balance (implementación simplificada)
        balance = 0.00
        
        stats = {
            'total_transactions': total_transactions,
            'total_amount': total_amount,
            'pending_transactions': pending_transactions,
            'completed_transactions': completed_transactions,
            'failed_transactions': failed_transactions,
            'balance': balance
        }
        
        return Response(stats)

class TransactionReportAPIView(generics.ListAPIView):
    """Vista para reporte de transacciones."""
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Transaction.objects.filter(
            payer=self.request.user
        ) | Transaction.objects.filter(
            payee=self.request.user
        )

class PaymentWebhookView(APIView):
    """
    Vista mejorada para webhooks de pasarelas de pago (Stripe).

    SECURITY: ✅ Validates webhook signatures using stripe.Webhook.construct_event()
    This prevents replay attacks and unauthorized webhook submissions.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        """
        Procesar webhook de Stripe.

        Signature validation is performed by StripeGateway.handle_webhook()
        which uses stripe.Webhook.construct_event() to verify authenticity.
        """
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        
        try:
            gateway = StripeGateway({
                'secret_key': settings.STRIPE_SECRET_KEY,
                'publishable_key': settings.STRIPE_PUBLISHABLE_KEY,
                'webhook_secret': settings.STRIPE_WEBHOOK_SECRET
            })
            
            # Procesar webhook
            result = gateway.handle_webhook(
                data=payload.decode('utf-8'),
                headers={'stripe-signature': sig_header}
            )
            
            if result['success']:
                # Procesar eventos específicos
                if result.get('event') == 'payment_succeeded':
                    self._handle_payment_success(result)
                elif result.get('event') == 'payment_failed':
                    self._handle_payment_failure(result)
                
                return Response({'status': 'success'})
            else:
                return Response({'error': result.get('error')}, 
                              status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def _handle_payment_success(self, webhook_data):
        """Manejar webhook de pago exitoso."""
        payment_intent_id = webhook_data.get('payment_intent_id')
        
        try:
            # Buscar el pago en nuestra base de datos
            payment = Transaction.objects.get(gateway_transaction_id=payment_intent_id)
            payment.status = 'completed'
            payment.processed_at = timezone.now()
            payment.save()
        except Transaction.DoesNotExist:
            # Log error but don't fail the webhook
            pass
    
    def _handle_payment_failure(self, webhook_data):
        """Manejar webhook de pago fallido."""
        payment_intent_id = webhook_data.get('payment_intent_id')
        error = webhook_data.get('error', {})
        
        try:
            payment = Transaction.objects.get(gateway_transaction_id=payment_intent_id)
            payment.status = 'failed'
            payment.failure_reason = error.get('message', 'Payment failed')
            payment.save()
        except Transaction.DoesNotExist:
            pass

class PayPalWebhookAPIView(APIView):
    """
    Vista para webhook de PayPal.

    SECURITY: When implementing, MUST validate webhook signatures using PayPal's
    webhook verification API or verify signature manually:
    https://developer.paypal.com/api/rest/webhooks/rest/#link-verifysignature

    Steps for future implementation:
    1. Get webhook signature headers: PAYPAL-TRANSMISSION-ID, PAYPAL-TRANSMISSION-TIME,
       PAYPAL-TRANSMISSION-SIG, PAYPAL-CERT-URL, PAYPAL-AUTH-ALGO
    2. Call PayPal's verify-webhook-signature API
    3. Only process webhook if signature is valid
    4. Return 403 Forbidden if signature validation fails
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        """
        PayPal webhook handler - NOT IMPLEMENTED YET.

        Returns 501 to prevent unsigned webhook processing.
        This is safer than accepting webhooks without signature validation.
        """
        return Response({
            "detail": "PayPal webhook not implemented",
            "security_note": "Signature validation required before implementation"
        }, status=status.HTTP_501_NOT_IMPLEMENTED)


class RentPaymentScheduleViewSet(viewsets.ModelViewSet):
    """ViewSet para cronogramas de pago de renta."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # Los usuarios pueden ver cronogramas donde son arrendador o arrendatario
        return RentPaymentSchedule.objects.filter(
            Q(tenant=user) | Q(landlord=user)
        )
    
    def get_serializer_class(self):
        from .serializers import RentPaymentScheduleSerializer
        return RentPaymentScheduleSerializer
    
    def perform_create(self, serializer):
        # Asegurar que el usuario está autorizado para crear el cronograma
        contract = serializer.validated_data['contract']
        user = self.request.user
        
        # Verificar que el usuario es el arrendador del contrato
        if contract.landlord != user:
            raise permissions.PermissionDenied("Solo el arrendador puede crear cronogramas de pago")
        
        serializer.save(landlord=user)


class ProcessRentPaymentAPIView(APIView):
    """Vista para procesar pagos de renta."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Procesa un pago de renta manual o automático."""
        schedule_id = request.data.get('schedule_id')
        payment_method_id = request.data.get('payment_method_id')
        amount = request.data.get('amount')
        
        try:
            # Obtener el cronograma
            schedule = RentPaymentSchedule.objects.get(
                id=schedule_id,
                tenant=request.user,
                is_active=True
            )
            
            # Validar el método de pago
            payment_method = None
            if payment_method_id:
                payment_method = PaymentMethod.objects.get(
                    id=payment_method_id,
                    user=request.user,
                    is_active=True
                )
            
            # Calcular el monto total (incluyendo recargos por mora)
            base_amount = amount or schedule.rent_amount
            late_fee = schedule.calculate_late_fee()
            total_amount = base_amount + late_fee
            
            # Crear la transacción
            transaction = Transaction.objects.create(
                payer=request.user,
                payee=schedule.landlord,
                transaction_type='monthly_rent',
                amount=base_amount,
                total_amount=total_amount,
                currency='COP',
                description=f"Pago de renta - {schedule.contract.property.title}",
                payment_method=payment_method,
                contract=schedule.contract,
                property=schedule.contract.property,
                status='processing'
            )
            
            # Si hay recargo por mora, crear transacción adicional
            if late_fee > 0:
                Transaction.objects.create(
                    payer=request.user,
                    payee=schedule.landlord,
                    transaction_type='late_fee',
                    amount=late_fee,
                    total_amount=late_fee,
                    currency='COP',
                    description=f"Recargo por mora - {schedule.contract.property.title}",
                    payment_method=payment_method,
                    contract=schedule.contract,
                    property=schedule.contract.property,
                    status='processing',
                    parent_transaction=transaction
                )
            
            # Simular procesamiento del pago
            # En implementación real, aquí iría la integración con Stripe/PayPal
            import time
            time.sleep(1)  # Simular tiempo de procesamiento
            
            # Marcar como completado (en implementación real dependería de la respuesta del gateway)
            transaction.status = 'completed'
            transaction.processed_at = timezone.now()
            transaction.save()
            
            # Actualizar transacciones relacionadas
            Transaction.objects.filter(parent_transaction=transaction).update(
                status='completed',
                processed_at=timezone.now()
            )
            
            # Actualizar última fecha de pago
            schedule.last_payment_date = timezone.now().date()
            schedule.save()
            
            # Crear actividad de pago
            from users.utils import create_user_activity
            create_user_activity(
                user=request.user,
                action='rent_payment_processed',
                description=f'Pago de renta procesado por ${total_amount}',
                metadata={
                    'transaction_id': str(transaction.id),
                    'amount': float(total_amount),
                    'property': schedule.contract.property.title
                }
            )
            
            return Response({
                'message': 'Pago procesado exitosamente',
                'transaction_id': transaction.id,
                'amount_paid': total_amount,
                'late_fee': late_fee,
                'next_due_date': schedule.get_next_due_date()
            }, status=status.HTTP_200_OK)
            
        except RentPaymentSchedule.DoesNotExist:
            return Response(
                {'error': 'Cronograma de pago no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        except PaymentMethod.DoesNotExist:
            return Response(
                {'error': 'Método de pago no válido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Error procesando el pago: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TenantPaymentPortalAPIView(APIView):
    """Vista para el portal de pagos del arrendatario."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Obtiene el dashboard de pagos para el arrendatario."""
        user = request.user
        
        # Obtener cronogramas activos
        schedules = RentPaymentSchedule.objects.filter(
            tenant=user,
            is_active=True
        ).select_related('contract', 'contract__property', 'landlord')
        
        dashboard_data = []
        total_monthly_rent = 0
        overdue_amount = 0
        
        for schedule in schedules:
            next_due_date = schedule.get_next_due_date()
            is_overdue = schedule.is_payment_overdue()
            late_fee = schedule.calculate_late_fee()
            
            # Obtener último pago
            last_payment = Transaction.objects.filter(
                payer=user,
                contract=schedule.contract,
                transaction_type__in=['monthly_rent', 'rent_payment'],
                status='completed'
            ).order_by('-processed_at').first()
            
            # Obtener pagos pendientes
            pending_amount = schedule.rent_amount + late_fee
            
            if is_overdue:
                overdue_amount += pending_amount
            
            total_monthly_rent += schedule.rent_amount
            
            dashboard_data.append({
                'schedule_id': schedule.id,
                'property': {
                    'title': schedule.contract.property.title,
                    'address': schedule.contract.property.full_address
                },
                'landlord': {
                    'name': schedule.landlord.get_full_name(),
                    'email': schedule.landlord.email
                },
                'rent_amount': schedule.rent_amount,
                'due_date': schedule.due_date,
                'next_due_date': next_due_date,
                'is_overdue': is_overdue,
                'late_fee': late_fee,
                'total_due': pending_amount,
                'grace_period_days': schedule.grace_period_days,
                'auto_charge_enabled': schedule.auto_charge_enabled,
                'last_payment': {
                    'date': last_payment.processed_at.date() if last_payment else None,
                    'amount': last_payment.total_amount if last_payment else None
                } if last_payment else None
            })
        
        return Response({
            'schedules': dashboard_data,
            'summary': {
                'total_monthly_rent': total_monthly_rent,
                'overdue_amount': overdue_amount,
                'active_contracts': len(dashboard_data)
            }
        })


class LandlordFinancialDashboardAPIView(APIView):
    """Vista para el dashboard financiero del arrendador."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Obtiene el dashboard financiero para el arrendador."""
        user = request.user
        
        # Obtener cronogramas donde el usuario es arrendador
        schedules = RentPaymentSchedule.objects.filter(
            landlord=user,
            is_active=True
        ).select_related('tenant', 'contract', 'contract__property')
        
        # Calcular estadísticas financieras
        total_monthly_income = sum(schedule.rent_amount for schedule in schedules)
        
        # Obtener transacciones del último mes
        from datetime import date, timedelta
        last_month = date.today() - timedelta(days=30)
        
        recent_transactions = Transaction.objects.filter(
            payee=user,
            transaction_type__in=['monthly_rent', 'rent_payment', 'late_fee'],
            processed_at__gte=last_month,
            status='completed'
        )
        
        collected_this_month = sum(t.total_amount for t in recent_transactions)
        
        # Calcular pagos vencidos
        overdue_amount = 0
        overdue_tenants = []
        
        for schedule in schedules:
            if schedule.is_payment_overdue():
                pending_amount = schedule.rent_amount + schedule.calculate_late_fee()
                overdue_amount += pending_amount
                overdue_tenants.append({
                    'tenant_name': schedule.tenant.get_full_name(),
                    'property': schedule.contract.property.title,
                    'amount_due': pending_amount,
                    'days_overdue': (date.today() - schedule.get_next_due_date()).days
                })
        
        # Próximos pagos esperados
        upcoming_payments = []
        for schedule in schedules:
            if not schedule.is_payment_overdue():
                upcoming_payments.append({
                    'tenant_name': schedule.tenant.get_full_name(),
                    'property': schedule.contract.property.title,
                    'amount': schedule.rent_amount,
                    'due_date': schedule.get_next_due_date()
                })
        
        return Response({
            'financial_summary': {
                'total_monthly_income': total_monthly_income,
                'collected_this_month': collected_this_month,
                'overdue_amount': overdue_amount,
                'collection_rate': (collected_this_month / total_monthly_income * 100) if total_monthly_income > 0 else 0
            },
            'overdue_payments': {
                'total_amount': overdue_amount,
                'tenant_count': len(overdue_tenants),
                'details': overdue_tenants
            },
            'upcoming_payments': upcoming_payments,
            'active_properties': len(schedules)
        })


# ===== WOMPI / PSE PAYMENT GATEWAY INTEGRATION =====

class WompiInitiatePaymentAPIView(APIView):
    """
    Iniciar pago PSE con Wompi.

    Wompi es el procesador de pagos colombiano que soporta PSE, tarjetas, Nequi, etc.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """
        Iniciar transacción PSE/Wompi.

        Body params:
            - amount: Monto en COP
            - payment_method: 'PSE', 'CARD', 'NEQUI' (default: PSE)
            - description: Descripción del pago
            - bank_code: Código del banco (requerido para PSE)
            - document_type: Tipo de documento (CC, CE, etc.)
            - document_number: Número de documento
            - redirect_url: URL de retorno
        """
        try:
            from .gateways.wompi_gateway import WompiGateway

            # Extraer datos de la solicitud
            amount = Decimal(str(request.data.get('amount', 0)))
            payment_method = request.data.get('payment_method', 'PSE')
            description = request.data.get('description', 'Pago VeriHome')
            bank_code = request.data.get('bank_code')
            document_type = request.data.get('document_type', 'CC')
            document_number = request.data.get('document_number')
            redirect_url = request.data.get('redirect_url')

            # Validaciones
            if amount <= 0:
                return Response({
                    'error': 'Amount must be greater than 0'
                }, status=status.HTTP_400_BAD_REQUEST)

            if payment_method == 'PSE' and not bank_code:
                return Response({
                    'error': 'bank_code is required for PSE payments'
                }, status=status.HTTP_400_BAD_REQUEST)

            # SECURITY: Validate contract if provided
            contract_id = request.data.get('contract')
            if contract_id:
                from contracts.models import LandlordControlledContract
                try:
                    contract = LandlordControlledContract.objects.get(id=contract_id)

                    # Validate contract is signed/active
                    if contract.workflow_status not in ['active', 'completed_biometric']:
                        return Response({
                            'error': 'Cannot process payment for unsigned contract',
                            'detail': f'Contract status is "{contract.workflow_status}". '
                                      'All parties must complete biometric authentication first.'
                        }, status=status.HTTP_400_BAD_REQUEST)

                    # Validate user is authorized
                    if request.user not in [contract.tenant, contract.landlord, contract.guarantor]:
                        return Response({
                            'error': 'You are not authorized to make payments for this contract'
                        }, status=status.HTTP_403_FORBIDDEN)

                except LandlordControlledContract.DoesNotExist:
                    return Response({
                        'error': 'Contract not found'
                    }, status=status.HTTP_404_NOT_FOUND)

            # Inicializar gateway Wompi
            wompi_config = {
                'public_key': getattr(settings, 'WOMPI_PUBLIC_KEY', ''),
                'private_key': getattr(settings, 'WOMPI_PRIVATE_KEY', ''),
                'events_secret': getattr(settings, 'WOMPI_EVENTS_SECRET', ''),
                'sandbox_mode': getattr(settings, 'WOMPI_SANDBOX_MODE', True)
            }

            gateway = WompiGateway(wompi_config)

            # Generar referencia única
            import uuid
            reference = f"VH-{request.user.id}-{uuid.uuid4().hex[:8]}"

            # Crear pago
            result = gateway.create_payment(
                amount=amount,
                currency='COP',
                customer_email=request.user.email,
                customer_name=request.user.get_full_name() or request.user.email,
                description=description,
                reference=reference,
                payment_method=payment_method,
                customer_phone=request.data.get('phone', ''),
                return_url=redirect_url,
                bank_code=bank_code,
                document_type=document_type,
                document_number=document_number,
                user_type='0'  # 0 = Persona natural
            )

            if result.success:
                # Crear registro de transacción
                transaction = Transaction.objects.create(
                    payer=request.user,
                    amount=amount,
                    currency='COP',
                    payment_method=payment_method,
                    status=result.status,
                    gateway='wompi',
                    gateway_transaction_id=result.gateway_reference,
                    reference=reference,
                    description=description,
                    metadata=result.metadata
                )

                # Retornar datos de la transacción
                return Response({
                    'success': True,
                    'transaction_id': transaction.id,
                    'reference': reference,
                    'status': result.status,
                    'redirect_url': result.metadata.get('async_payment_url'),
                    'wompi_transaction_id': result.gateway_reference,
                    'metadata': result.metadata
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'success': False,
                    'error': result.error_message,
                    'error_code': result.error_code
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({
                'error': f'Error creating payment: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class WompiWebhookAPIView(APIView):
    """
    Webhook para recibir notificaciones de Wompi (Colombian payment processor).

    Wompi envía eventos cuando cambia el estado de una transacción.

    SECURITY: ✅ Validates webhook signatures using SHA256 + HMAC
    WompiGateway.handle_webhook() verifies X-Event-Checksum header to prevent
    replay attacks and unauthorized webhook submissions.
    Returns 403 Forbidden if signature validation fails.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        """
        Procesar webhook de Wompi.

        Signature validation is performed by WompiGateway._verify_webhook_signature()
        using timing-attack safe HMAC comparison.
        """
        try:
            from .gateways.wompi_gateway import WompiGateway

            # Inicializar gateway
            wompi_config = {
                'public_key': getattr(settings, 'WOMPI_PUBLIC_KEY', ''),
                'private_key': getattr(settings, 'WOMPI_PRIVATE_KEY', ''),
                'events_secret': getattr(settings, 'WOMPI_EVENTS_SECRET', ''),
                'sandbox_mode': getattr(settings, 'WOMPI_SANDBOX_MODE', True)
            }

            gateway = WompiGateway(wompi_config)

            # Procesar webhook
            payload = request.data
            headers = {
                'X-Event-Checksum': request.META.get('HTTP_X_EVENT_CHECKSUM', '')
            }

            result = gateway.handle_webhook(payload, headers)

            if not result.success and result.error_code == 'INVALID_SIGNATURE':
                return Response({
                    'error': 'Invalid signature'
                }, status=status.HTTP_403_FORBIDDEN)

            # Buscar transacción en nuestra DB
            try:
                transaction = Transaction.objects.get(
                    reference=result.transaction_id
                )

                # Actualizar estado
                transaction.status = result.status
                transaction.gateway_transaction_id = result.gateway_reference

                if result.status == 'completed':
                    transaction.processed_at = timezone.now()
                elif result.status == 'failed':
                    transaction.failure_reason = result.metadata.get('status_message', 'Payment failed')

                # Actualizar metadata
                transaction.metadata.update(result.metadata)
                transaction.save()

                # Log del evento
                import logging
                logger = logging.getLogger(__name__)
                logger.info(f"Wompi webhook processed: {result.transaction_id} - {result.status}")

                return Response({'status': 'success'}, status=status.HTTP_200_OK)

            except Transaction.DoesNotExist:
                # Transacción no encontrada, pero no fallar el webhook
                return Response({
                    'status': 'accepted',
                    'message': 'Transaction not found'
                }, status=status.HTTP_200_OK)

        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error processing Wompi webhook: {str(e)}")

            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PSEBanksListAPIView(APIView):
    """
    Obtener lista de bancos disponibles para PSE.

    Esta lista es necesaria para que el usuario seleccione su banco.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """Obtener lista de bancos PSE."""
        try:
            from .gateways.wompi_gateway import WompiGateway

            wompi_config = {
                'public_key': getattr(settings, 'WOMPI_PUBLIC_KEY', ''),
                'private_key': getattr(settings, 'WOMPI_PRIVATE_KEY', ''),
                'events_secret': getattr(settings, 'WOMPI_EVENTS_SECRET', ''),
                'sandbox_mode': getattr(settings, 'WOMPI_SANDBOX_MODE', True)
            }

            gateway = WompiGateway(wompi_config)
            banks = gateway.get_pse_banks()

            return Response({
                'banks': banks,
                'count': len(banks)
            })

        except Exception as e:
            return Response({
                'error': f'Error fetching banks: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class WompiPaymentStatusAPIView(APIView):
    """
    Consultar estado de un pago Wompi.

    Permite verificar el estado actual de una transacción.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, transaction_id):
        """
        Obtener estado de transacción.

        Args:
            transaction_id: ID de la transacción en nuestra DB
        """
        try:
            # Buscar transacción
            transaction = Transaction.objects.get(
                id=transaction_id,
                payer=request.user
            )

            from .gateways.wompi_gateway import WompiGateway

            wompi_config = {
                'public_key': getattr(settings, 'WOMPI_PUBLIC_KEY', ''),
                'private_key': getattr(settings, 'WOMPI_PRIVATE_KEY', ''),
                'events_secret': getattr(settings, 'WOMPI_EVENTS_SECRET', ''),
                'sandbox_mode': getattr(settings, 'WOMPI_SANDBOX_MODE', True)
            }

            gateway = WompiGateway(wompi_config)

            # Consultar estado en Wompi
            result = gateway.confirm_payment(transaction.gateway_transaction_id)

            # Actualizar estado en nuestra DB
            if result.success or result.status != transaction.status:
                transaction.status = result.status
                if result.status == 'completed':
                    transaction.processed_at = timezone.now()
                transaction.metadata.update(result.metadata)
                transaction.save()

            return Response({
                'transaction_id': transaction.id,
                'reference': transaction.reference,
                'status': transaction.status,
                'amount': str(transaction.amount),
                'currency': transaction.currency,
                'payment_method': transaction.payment_method,
                'created_at': transaction.created_at,
                'processed_at': transaction.processed_at,
                'metadata': transaction.metadata
            })

        except Transaction.DoesNotExist:
            return Response({
                'error': 'Transaction not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': f'Error checking payment status: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ===== PAYMENT RECEIPT =====

class PaymentReceiptAPIView(APIView):
    """
    Genera y devuelve un recibo de pago en formato PDF.

    GET /api/v1/payments/transactions/{id}/receipt/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        from django.http import HttpResponse

        try:
            transaction = Transaction.objects.select_related(
                'payer', 'payee', 'contract', 'property', 'payment_method'
            ).get(
                Q(payer=request.user) | Q(payee=request.user),
                pk=pk,
            )
        except Transaction.DoesNotExist:
            return Response(
                {'error': 'Transacción no encontrada.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            from .receipt_generator import generate_payment_receipt

            pdf_bytes = generate_payment_receipt(transaction)

            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            filename = f"recibo_{transaction.transaction_number}.pdf"
            response['Content-Disposition'] = f'inline; filename="{filename}"'
            return response

        except Exception as e:
            return Response(
                {'error': f'Error generando recibo: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ===== ADVANCED PAYMENT ANALYTICS IMPORTS =====

# Import the advanced payment statistics API views from payment_stats_api module
from .payment_stats_api import (
    PaymentStatsAPIView,
    SystemPaymentStatsAPIView,
    ExportPaymentStatsAPIView
)