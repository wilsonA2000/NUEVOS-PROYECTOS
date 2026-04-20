"""Seed idempotente de los 3 planes de suscripción documentados (Básico/Profesional/Enterprise)."""

from django.core.management.base import BaseCommand
from services.models import SubscriptionPlan


PLANS = [
    {
        "slug": "basico",
        "name": "Básico",
        "description": "Plan de entrada para prestadores nuevos. Presencia en la plataforma y solicitudes limitadas.",
        "price": 50000,
        "billing_cycle": "monthly",
        "max_active_services": 3,
        "max_monthly_requests": 20,
        "featured_listing": False,
        "priority_in_search": False,
        "verified_badge": False,
        "access_to_analytics": False,
        "direct_messaging": True,
        "payment_gateway_access": False,
        "is_recommended": False,
        "sort_order": 1,
    },
    {
        "slug": "profesional",
        "name": "Profesional",
        "description": "Plan más vendido. Más solicitudes, badge verificado y analíticas básicas.",
        "price": 100000,
        "billing_cycle": "monthly",
        "max_active_services": 10,
        "max_monthly_requests": 100,
        "featured_listing": True,
        "priority_in_search": True,
        "verified_badge": True,
        "access_to_analytics": True,
        "direct_messaging": True,
        "payment_gateway_access": False,
        "is_recommended": True,
        "sort_order": 2,
    },
    {
        "slug": "enterprise",
        "name": "Enterprise",
        "description": "Plan sin límites para empresas de servicio. Incluye pasarela de pagos propia.",
        "price": 150000,
        "billing_cycle": "monthly",
        "max_active_services": 999,
        "max_monthly_requests": 999,
        "featured_listing": True,
        "priority_in_search": True,
        "verified_badge": True,
        "access_to_analytics": True,
        "direct_messaging": True,
        "payment_gateway_access": True,
        "is_recommended": False,
        "sort_order": 3,
    },
]


class Command(BaseCommand):
    help = "Seed idempotente de los 3 planes de suscripción (Básico/Profesional/Enterprise)."

    def handle(self, *args, **options):
        for data in PLANS:
            plan, created = SubscriptionPlan.objects.update_or_create(
                slug=data["slug"],
                defaults={**data, "is_active": True},
            )
            self.stdout.write(
                f"{'created' if created else 'updated'}: {plan.name} · ${plan.price:,.0f}/{plan.billing_cycle}"
            )
        self.stdout.write(
            self.style.SUCCESS(f"{SubscriptionPlan.objects.count()} planes en BD")
        )
