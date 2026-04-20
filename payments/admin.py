from django.contrib import admin

from .models import LegalInterestRate, PaymentOrder


@admin.register(LegalInterestRate)
class LegalInterestRateAdmin(admin.ModelAdmin):
    list_display = (
        "year",
        "month",
        "monthly_rate_pct",
        "max_usury_rate_pct",
        "is_active",
        "source",
    )
    list_filter = ("is_active", "year")
    search_fields = ("source", "notes")
    ordering = ("-year", "-month")
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        ("Período", {"fields": ("year", "month", "is_active")}),
        ("Tasas", {"fields": ("monthly_rate", "max_usury_rate")}),
        ("Origen", {"fields": ("source", "notes")}),
        ("Auditoría", {"fields": ("created_at", "updated_at")}),
    )

    def monthly_rate_pct(self, obj):
        return f"{obj.monthly_rate * 100:.4f}%"

    monthly_rate_pct.short_description = "Tasa mensual"

    def max_usury_rate_pct(self, obj):
        return f"{obj.max_usury_rate * 100:.4f}%"

    max_usury_rate_pct.short_description = "Tope usura"


@admin.register(PaymentOrder)
class PaymentOrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_number",
        "order_type",
        "status",
        "payer",
        "payee",
        "amount",
        "interest_amount",
        "paid_amount",
        "date_due",
    )
    list_filter = ("order_type", "status", "date_due")
    search_fields = ("order_number", "payer__email", "payee__email", "description")
    readonly_fields = (
        "id",
        "order_number",
        "created_at",
        "updated_at",
        "paid_at",
        "audit_log",
        "total_amount_display",
        "balance_display",
    )
    date_hierarchy = "date_due"
    fieldsets = (
        ("Identificación", {"fields": ("id", "order_number", "order_type", "status")}),
        ("Partes", {"fields": ("payer", "payee", "created_by")}),
        (
            "Montos",
            {
                "fields": (
                    "amount",
                    "interest_amount",
                    "paid_amount",
                    "total_amount_display",
                    "balance_display",
                )
            },
        ),
        (
            "Fechas",
            {"fields": ("date_due", "date_grace_end", "date_max_overdue", "paid_at")},
        ),
        (
            "Origen",
            {"fields": ("rent_schedule", "installment", "invoice", "transaction")},
        ),
        ("Detalles", {"fields": ("description", "audit_log")}),
        ("Auditoría", {"fields": ("created_at", "updated_at")}),
    )

    def total_amount_display(self, obj):
        return obj.total_amount

    total_amount_display.short_description = "Total (principal + intereses)"

    def balance_display(self, obj):
        return obj.balance

    balance_display.short_description = "Saldo pendiente"
