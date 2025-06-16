"""
URLs para la aplicación de pagos de VeriHome.
Incluye gestión de pagos, métodos de pago, facturas y escrow.
"""

from django.urls import path
from . import views

app_name = 'payments'

urlpatterns = [
    # Dashboard de pagos
    path('', views.PaymentDashboardView.as_view(), name='dashboard'),
    
    # Historial de transacciones
    path('transacciones/', views.TransactionListView.as_view(), name='transactions'),
    path('transaccion/<uuid:pk>/', views.TransactionDetailView.as_view(), name='transaction_detail'),
    path('transaccion/<uuid:pk>/recibo/', views.TransactionReceiptView.as_view(), name='transaction_receipt'),
    path('transaccion/<uuid:pk>/reembolsar/', views.RefundTransactionView.as_view(), name='refund_transaction'),
    path('transaccion/<uuid:pk>/disputar/', views.DisputeTransactionView.as_view(), name='dispute_transaction'),
    
    # Métodos de pago
    path('metodos-pago/', views.PaymentMethodListView.as_view(), name='payment_methods'),
    path('metodos-pago/agregar/', views.AddPaymentMethodView.as_view(), name='add_payment_method'),
    path('metodos-pago/<int:pk>/editar/', views.EditPaymentMethodView.as_view(), name='edit_payment_method'),
    path('metodos-pago/<int:pk>/eliminar/', views.DeletePaymentMethodView.as_view(), name='delete_payment_method'),
    path('metodos-pago/<int:pk>/verificar/', views.VerifyPaymentMethodView.as_view(), name='verify_payment_method'),
    path('metodos-pago/<int:pk>/predeterminado/', views.SetDefaultPaymentMethodView.as_view(), name='set_default_payment_method'),
    
    # Procesamiento de pagos
    path('pagar/', views.ProcessPaymentView.as_view(), name='process_payment'),
    path('pagar/renta/<uuid:contract_pk>/', views.PayRentView.as_view(), name='pay_rent'),
    path('pagar/deposito/<uuid:contract_pk>/', views.PayDepositView.as_view(), name='pay_deposit'),
    path('pagar/servicio/<uuid:service_pk>/', views.PayServiceView.as_view(), name='pay_service'),
    path('pagar/comision/<uuid:transaction_pk>/', views.PayCommissionView.as_view(), name='pay_commission'),
    
    # Escrow (depósitos en garantía)
    path('escrow/', views.EscrowListView.as_view(), name='escrow_list'),
    path('escrow/<uuid:pk>/', views.EscrowDetailView.as_view(), name='escrow_detail'),
    path('escrow/crear/', views.CreateEscrowView.as_view(), name='create_escrow'),
    path('escrow/<uuid:pk>/financiar/', views.FundEscrowView.as_view(), name='fund_escrow'),
    path('escrow/<uuid:pk>/liberar/', views.ReleaseEscrowView.as_view(), name='release_escrow'),
    path('escrow/<uuid:pk>/disputar/', views.DisputeEscrowView.as_view(), name='dispute_escrow'),
    path('escrow/<uuid:pk>/reembolsar/', views.RefundEscrowView.as_view(), name='refund_escrow'),
    
    # Facturas
    path('facturas/', views.InvoiceListView.as_view(), name='invoices'),
    path('factura/<uuid:pk>/', views.InvoiceDetailView.as_view(), name='invoice_detail'),
    path('factura/crear/', views.CreateInvoiceView.as_view(), name='create_invoice'),
    path('factura/<uuid:pk>/editar/', views.EditInvoiceView.as_view(), name='edit_invoice'),
    path('factura/<uuid:pk>/enviar/', views.SendInvoiceView.as_view(), name='send_invoice'),
    path('factura/<uuid:pk>/pagar/', views.PayInvoiceView.as_view(), name='pay_invoice'),
    path('factura/<uuid:pk>/cancelar/', views.CancelInvoiceView.as_view(), name='cancel_invoice'),
    path('factura/<uuid:pk>/pdf/', views.InvoicePDFView.as_view(), name='invoice_pdf'),
    
    # Facturas recibidas
    path('facturas-recibidas/', views.ReceivedInvoicesView.as_view(), name='received_invoices'),
    path('facturas-enviadas/', views.SentInvoicesView.as_view(), name='sent_invoices'),
    path('facturas-vencidas/', views.OverdueInvoicesView.as_view(), name='overdue_invoices'),
    
    # Planes de pago
    path('planes-pago/', views.PaymentPlanListView.as_view(), name='payment_plans'),
    path('plan-pago/<int:pk>/', views.PaymentPlanDetailView.as_view(), name='payment_plan_detail'),
    path('plan-pago/crear/', views.CreatePaymentPlanView.as_view(), name='create_payment_plan'),
    path('plan-pago/<int:pk>/editar/', views.EditPaymentPlanView.as_view(), name='edit_payment_plan'),
    path('plan-pago/<int:pk>/cancelar/', views.CancelPaymentPlanView.as_view(), name='cancel_payment_plan'),
    path('plan-pago/<int:pk>/pausar/', views.PausePaymentPlanView.as_view(), name='pause_payment_plan'),
    path('plan-pago/<int:pk>/reanudar/', views.ResumePaymentPlanView.as_view(), name='resume_payment_plan'),
    
    # Cuotas de planes de pago
    path('cuota/<int:pk>/', views.InstallmentDetailView.as_view(), name='installment_detail'),
    path('cuota/<int:pk>/pagar/', views.PayInstallmentView.as_view(), name='pay_installment'),
    path('cuota/<int:pk>/exonerar/', views.WaiveInstallmentView.as_view(), name='waive_installment'),
    
    # Reportes financieros
    path('reportes/', views.FinancialReportsView.as_view(), name='reports'),
    path('reportes/ingresos/', views.IncomeReportView.as_view(), name='income_report'),
    path('reportes/gastos/', views.ExpenseReportView.as_view(), name='expense_report'),
    path('reportes/comisiones/', views.CommissionReportView.as_view(), name='commission_report'),
    path('reportes/impuestos/', views.TaxReportView.as_view(), name='tax_report'),
    
    # Estados de cuenta
    path('estado-cuenta/', views.AccountStatementView.as_view(), name='account_statement'),
    path('estado-cuenta/pdf/', views.AccountStatementPDFView.as_view(), name='account_statement_pdf'),
    path('estado-cuenta/<int:year>/<int:month>/', views.MonthlyStatementView.as_view(), name='monthly_statement'),
    
    # Configuración de pagos
    path('configuracion/', views.PaymentSettingsView.as_view(), name='settings'),
    path('configuracion/notificaciones/', views.PaymentNotificationSettingsView.as_view(), name='notification_settings'),
    path('configuracion/recordatorios/', views.PaymentReminderSettingsView.as_view(), name='reminder_settings'),
    
    # Webhooks para pasarelas de pago
    path('webhook/stripe/', views.StripeWebhookView.as_view(), name='stripe_webhook'),
    path('webhook/paypal/', views.PayPalWebhookView.as_view(), name='paypal_webhook'),
    
    # Búsqueda y filtros
    path('buscar/', views.SearchPaymentsView.as_view(), name='search'),
    path('filtros/', views.PaymentFiltersView.as_view(), name='filters'),
    
    # Exportar datos
    path('exportar/transacciones/', views.ExportTransactionsView.as_view(), name='export_transactions'),
    path('exportar/facturas/', views.ExportInvoicesView.as_view(), name='export_invoices'),
    
    # API para AJAX
    path('api/balance/', views.BalanceAPIView.as_view(), name='api_balance'),
    path('api/pending-payments/', views.PendingPaymentsAPIView.as_view(), name='api_pending_payments'),
    path('api/quick-pay/', views.QuickPayAPIView.as_view(), name='api_quick_pay'),
]
