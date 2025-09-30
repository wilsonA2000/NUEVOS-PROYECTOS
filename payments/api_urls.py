"""
URLs de la API REST para la aplicación de pagos de VeriHome.
"""

app_name = 'payments_api'

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import api_views

# Router para ViewSets
router = DefaultRouter()
router.register(r'transactions', api_views.TransactionViewSet, basename='transaction')
router.register(r'payments', api_views.PaymentViewSet, basename='payment')
router.register(r'payment-methods', api_views.PaymentMethodViewSet, basename='payment-method')
router.register(r'invoices', api_views.InvoiceViewSet, basename='invoice')
router.register(r'escrow-accounts', api_views.EscrowAccountViewSet, basename='escrow-account')
router.register(r'payment-plans', api_views.PaymentPlanViewSet, basename='payment-plan')
router.register(r'installments', api_views.PaymentPlanInstallmentViewSet, basename='payment-installment')
# router.register(r'escrow-milestones', api_views.EscrowMilestoneViewSet, basename='escrow-milestone')  # Disabled - model not available
router.register(r'rent-schedules', api_views.RentPaymentScheduleViewSet, basename='rent-schedule')

urlpatterns = [
    # Incluir rutas del router
    path('', include(router.urls)),
    
    # Procesamiento de pagos
    path('process/', api_views.ProcessPaymentAPIView.as_view(), name='api_process_payment'),
    path('quick-pay/', api_views.QuickPayAPIView.as_view(), name='api_quick_pay'),
    
    # Métodos de pago
    path('payment-methods/add/', api_views.AddPaymentMethodAPIView.as_view(), name='api_add_payment_method'),
    path('payment-methods/<int:pk>/verify/', api_views.VerifyPaymentMethodAPIView.as_view(), name='api_verify_payment_method'),
    path('payment-methods/<int:pk>/set-default/', api_views.SetDefaultPaymentMethodAPIView.as_view(), name='api_set_default_payment_method'),
    
    # Escrow
    path('escrow/<uuid:pk>/fund/', api_views.FundEscrowAPIView.as_view(), name='api_fund_escrow'),
    path('escrow/<uuid:pk>/release/', api_views.ReleaseEscrowAPIView.as_view(), name='api_release_escrow'),
    
    # Facturas
    path('invoices/create/', api_views.CreateInvoiceAPIView.as_view(), name='api_create_invoice'),
    path('invoices/<uuid:pk>/pay/', api_views.PayInvoiceAPIView.as_view(), name='api_pay_invoice'),
    path('invoices/<uuid:pk>/send/', api_views.SendInvoiceAPIView.as_view(), name='api_send_invoice'),
    
    # Estadísticas y reportes
    path('stats/balance/', api_views.BalanceAPIView.as_view(), name='api_balance'),
    path('stats/dashboard/', api_views.PaymentDashboardStatsAPIView.as_view(), name='api_payment_dashboard_stats'),
    path('reports/transactions/', api_views.TransactionReportAPIView.as_view(), name='api_transaction_report'),
    
    # Advanced Payment Analytics
    path('stats/', api_views.PaymentStatsAPIView.as_view(), name='api_payment_stats'),
    path('stats/system/', api_views.SystemPaymentStatsAPIView.as_view(), name='api_system_payment_stats'),
    path('stats/export/', api_views.ExportPaymentStatsAPIView.as_view(), name='api_export_payment_stats'),
    
    # Rent payments
    path('rent/process/', api_views.ProcessRentPaymentAPIView.as_view(), name='api_process_rent_payment'),
    path('tenant/portal/', api_views.TenantPaymentPortalAPIView.as_view(), name='api_tenant_portal'),
    path('landlord/dashboard/', api_views.LandlordFinancialDashboardAPIView.as_view(), name='api_landlord_dashboard'),
    
    # Webhooks
    path('webhooks/stripe/', api_views.PaymentWebhookView.as_view(), name='api_stripe_webhook'),
    path('webhooks/paypal/', api_views.PayPalWebhookAPIView.as_view(), name='api_paypal_webhook'),
]
