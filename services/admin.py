"""
Configuración del panel de administración para Servicios Adicionales.
"""

from django.contrib import admin
from django.db import models
from django.forms import Textarea
from .models import (
    ServiceCategory,
    Service,
    ServiceImage,
    ServiceRequest,
    SubscriptionPlan,
    ServiceSubscription,
    SubscriptionBillingHistory,
    ServiceOrder,
    ServicePayment,
    ServiceOrderHistory,
)


@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "order",
        "services_count",
        "is_featured",
        "is_active",
        "created_at",
    ]
    list_editable = ["order", "is_featured", "is_active"]
    list_filter = ["is_active", "is_featured", "created_at"]
    search_fields = ["name", "description"]
    prepopulated_fields = {"slug": ("name",)}

    fieldsets = (
        ("Información Básica", {"fields": ("name", "slug", "description")}),
        (
            "Apariencia",
            {"fields": ("icon_name", "color", "order"), "classes": ("collapse",)},
        ),
        ("Estado", {"fields": ("is_active", "is_featured")}),
    )

    def services_count(self, obj):
        return obj.services.filter(is_active=True).count()

    services_count.short_description = "Servicios Activos"


class ServiceImageInline(admin.TabularInline):
    model = ServiceImage
    extra = 1
    fields = ["image", "alt_text", "is_main", "order"]


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "category",
        "pricing_type",
        "price_display",
        "popularity_score",
        "views_count",
        "requests_count",
        "is_featured",
        "is_most_requested",
        "is_active",
    ]
    list_editable = [
        "popularity_score",
        "is_featured",
        "is_most_requested",
        "is_active",
    ]
    list_filter = [
        "category",
        "pricing_type",
        "difficulty",
        "is_active",
        "is_featured",
        "is_most_requested",
        "created_at",
    ]
    search_fields = ["name", "short_description", "full_description"]
    prepopulated_fields = {"slug": ("name",)}
    inlines = [ServiceImageInline]

    fieldsets = (
        (
            "Información Básica",
            {
                "fields": (
                    "category",
                    "name",
                    "slug",
                    "short_description",
                    "full_description",
                )
            },
        ),
        (
            "Precios",
            {
                "fields": (
                    "pricing_type",
                    "base_price",
                    "price_range_min",
                    "price_range_max",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Características",
            {
                "fields": ("difficulty", "estimated_duration", "requirements"),
                "classes": ("collapse",),
            },
        ),
        (
            "Información del Proveedor",
            {
                "fields": ("provider_info", "contact_email", "contact_phone"),
                "classes": ("collapse",),
            },
        ),
        (
            "Métricas y Estado",
            {
                "fields": (
                    "popularity_score",
                    "views_count",
                    "requests_count",
                    "is_active",
                    "is_featured",
                    "is_most_requested",
                )
            },
        ),
    )

    readonly_fields = ["views_count", "requests_count"]

    formfield_overrides = {
        models.TextField: {"widget": Textarea(attrs={"rows": 4, "cols": 80})},
    }

    def price_display(self, obj):
        return obj.get_price_display()

    price_display.short_description = "Precio"

    actions = ["mark_as_featured", "mark_as_not_featured", "mark_as_most_requested"]

    def mark_as_featured(self, request, queryset):
        updated = queryset.update(is_featured=True)
        self.message_user(request, f"{updated} servicios marcados como destacados.")

    mark_as_featured.short_description = "Marcar como destacado"

    def mark_as_not_featured(self, request, queryset):
        updated = queryset.update(is_featured=False)
        self.message_user(request, f"{updated} servicios desmarcados como destacados.")

    mark_as_not_featured.short_description = "Desmarcar como destacado"

    def mark_as_most_requested(self, request, queryset):
        updated = queryset.update(is_most_requested=True)
        self.message_user(
            request, f"{updated} servicios marcados como más solicitados."
        )

    mark_as_most_requested.short_description = "Marcar como más solicitado"


@admin.register(ServiceImage)
class ServiceImageAdmin(admin.ModelAdmin):
    list_display = ["service", "alt_text", "is_main", "order"]
    list_filter = ["is_main", "service__category"]
    search_fields = ["service__name", "alt_text"]


@admin.register(ServiceRequest)
class ServiceRequestAdmin(admin.ModelAdmin):
    list_display = [
        "service",
        "requester",
        "requester_name",
        "property",
        "status",
        "preferred_date",
        "created_at",
    ]
    list_filter = ["status", "service__category", "created_at", "preferred_date"]
    search_fields = [
        "requester_name",
        "requester_email",
        "requester__email",
        "service__name",
        "message",
    ]
    readonly_fields = ["created_at", "updated_at"]
    autocomplete_fields = ["requester", "property", "contract"]

    fieldsets = (
        ("Información del Servicio", {"fields": ("service", "status")}),
        (
            "Relaciones (trazabilidad 1.9.3)",
            {
                "fields": ("requester", "property", "contract"),
                "description": "FKs opcionales. Las solicitudes anónimas no tienen requester.",
            },
        ),
        (
            "Datos del Solicitante (contacto)",
            {"fields": ("requester_name", "requester_email", "requester_phone")},
        ),
        (
            "Detalles de la Solicitud",
            {"fields": ("message", "preferred_date", "budget_range")},
        ),
        (
            "Administración",
            {
                "fields": ("admin_notes", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    actions = ["mark_as_contacted", "mark_as_in_progress", "mark_as_completed"]

    def mark_as_contacted(self, request, queryset):
        updated = queryset.update(status="contacted")
        self.message_user(request, f"{updated} solicitudes marcadas como contactadas.")

    mark_as_contacted.short_description = "Marcar como contactado"

    def mark_as_in_progress(self, request, queryset):
        updated = queryset.update(status="in_progress")
        self.message_user(request, f"{updated} solicitudes marcadas como en progreso.")

    mark_as_in_progress.short_description = "Marcar como en progreso"

    def mark_as_completed(self, request, queryset):
        updated = queryset.update(status="completed")
        self.message_user(request, f"{updated} solicitudes marcadas como completadas.")

    mark_as_completed.short_description = "Marcar como completado"


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "billing_cycle",
        "price",
        "discount_percentage",
        "max_active_services",
        "featured_listing",
        "is_active",
        "is_recommended",
        "sort_order",
    )
    list_editable = ("price", "is_active", "is_recommended", "sort_order")
    list_filter = ("billing_cycle", "is_active", "is_recommended")
    prepopulated_fields = {"slug": ("name",)}
    fieldsets = (
        ("Plan", {"fields": ("name", "slug", "description", "billing_cycle")}),
        ("Precios", {"fields": ("price", "discount_percentage")}),
        (
            "Funcionalidades",
            {
                "fields": (
                    "max_active_services",
                    "max_monthly_requests",
                    "featured_listing",
                    "priority_in_search",
                    "verified_badge",
                    "access_to_analytics",
                    "direct_messaging",
                    "payment_gateway_access",
                )
            },
        ),
        ("Estado", {"fields": ("is_active", "is_recommended", "sort_order")}),
    )


class BillingHistoryInline(admin.TabularInline):
    model = SubscriptionBillingHistory
    extra = 0
    readonly_fields = (
        "billing_date",
        "amount",
        "status",
        "transaction_ref",
        "created_at",
    )
    fields = (
        "billing_date",
        "amount",
        "status",
        "payment_method",
        "transaction_ref",
        "notes",
    )


@admin.register(ServiceSubscription)
class ServiceSubscriptionAdmin(admin.ModelAdmin):
    list_display = (
        "service_provider",
        "plan",
        "status",
        "start_date",
        "end_date",
        "next_billing_date",
        "auto_renew",
        "services_published",
    )
    list_filter = ("status", "plan", "auto_renew")
    search_fields = (
        "service_provider__email",
        "service_provider__first_name",
        "service_provider__last_name",
    )
    raw_id_fields = ("service_provider",)
    readonly_fields = (
        "id",
        "services_published",
        "requests_this_month",
        "created_at",
        "updated_at",
    )
    inlines = [BillingHistoryInline]
    fieldsets = (
        ("Suscripción", {"fields": ("id", "service_provider", "plan", "status")}),
        (
            "Fechas",
            {
                "fields": (
                    "start_date",
                    "end_date",
                    "trial_end_date",
                    "next_billing_date",
                    "cancelled_at",
                )
            },
        ),
        ("Configuración", {"fields": ("auto_renew",)}),
        ("Uso", {"fields": ("services_published", "requests_this_month")}),
        (
            "Notas",
            {
                "fields": ("cancellation_reason", "admin_notes"),
                "classes": ("collapse",),
            },
        ),
        ("Sistema", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )


class ServicePaymentInline(admin.TabularInline):
    model = ServicePayment
    extra = 0
    readonly_fields = ("id", "amount_paid", "gateway", "transaction", "paid_at")


@admin.register(ServiceOrder)
class ServiceOrderAdmin(admin.ModelAdmin):
    list_display = (
        "id_short",
        "title",
        "provider",
        "client",
        "amount",
        "status",
        "due_date",
        "created_at",
    )
    list_filter = ("status", "created_at")
    search_fields = ("title", "description", "provider__email", "client__email")
    readonly_fields = (
        "id",
        "created_at",
        "updated_at",
        "sent_at",
        "accepted_at",
        "paid_at",
        "cancelled_at",
        "payment_order",
    )
    inlines = [ServicePaymentInline]
    fieldsets = (
        ("Identificación", {"fields": ("id", "status")}),
        ("Partes", {"fields": ("provider", "client", "service")}),
        ("Detalles", {"fields": ("title", "description", "amount", "due_date")}),
        ("Pago", {"fields": ("payment_order",)}),
        ("Notas", {"fields": ("notes",)}),
        (
            "Auditoría",
            {
                "fields": (
                    "sent_at",
                    "accepted_at",
                    "paid_at",
                    "cancelled_at",
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )

    def id_short(self, obj):
        return str(obj.id)[:8]

    id_short.short_description = "ID"


@admin.register(ServicePayment)
class ServicePaymentAdmin(admin.ModelAdmin):
    list_display = ("order", "amount_paid", "gateway", "paid_at")
    list_filter = ("gateway", "paid_at")
    search_fields = ("order__title", "notes")
    readonly_fields = ("id", "paid_at", "transaction")


@admin.register(ServiceOrderHistory)
class ServiceOrderHistoryAdmin(admin.ModelAdmin):
    """Historial automático de transiciones de ServiceOrder (Fase 1.9.5)."""

    list_display = (
        "order",
        "action_type",
        "old_status",
        "new_status",
        "performed_by",
        "timestamp",
    )
    list_filter = ("action_type", "user_role", "timestamp")
    search_fields = ("order__title", "action_description", "performed_by__email")
    readonly_fields = (
        "id",
        "order",
        "action_type",
        "action_description",
        "performed_by",
        "user_role",
        "old_status",
        "new_status",
        "metadata",
        "timestamp",
    )
    date_hierarchy = "timestamp"
