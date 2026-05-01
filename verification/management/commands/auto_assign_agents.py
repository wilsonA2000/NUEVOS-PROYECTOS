"""
Asigna automáticamente agentes de verificación a `FieldVisitRequest`
con onboarding digital completo (`status='digital_completed'`,
`digital_verdict in ('aprobado','observado')`) que aún no tienen
`scheduled_visit`.

Estrategia: round-robin por capacidad disponible esta semana
(`VerificationAgent.has_capacity`), priorizando agentes con menos
visitas asignadas.

Uso:

    python manage.py auto_assign_agents
    python manage.py auto_assign_agents --dry-run
    python manage.py auto_assign_agents --max=20  # tope por corrida
"""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from verification.models import (
    FieldVisitRequest,
    VerificationAgent,
    VerificationVisit,
)


class Command(BaseCommand):
    help = "Asigna automáticamente agentes a solicitudes VeriHome ID pendientes."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Reporta qué se haría sin persistir cambios.",
        )
        parser.add_argument(
            "--max",
            type=int,
            default=50,
            help="Máximo de solicitudes a procesar en esta corrida.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        max_per_run = options["max"]

        pending = (
            FieldVisitRequest.objects.filter(
                status="digital_completed",
                scheduled_visit__isnull=True,
                digital_verdict__in=("aprobado", "observado"),
            )
            .select_related("user")
            .order_by("created_at")[:max_per_run]
        )

        total = pending.count()
        if total == 0:
            self.stdout.write(self.style.SUCCESS("No hay solicitudes pendientes."))
            return

        self.stdout.write(
            self.style.NOTICE(f"Procesando {total} solicitud(es) pendiente(s).")
        )

        assigned = 0
        skipped_no_capacity = 0
        for request_obj in pending:
            agent = self._pick_agent()
            if agent is None:
                skipped_no_capacity += 1
                self.stdout.write(
                    self.style.WARNING(
                        f"  ⚠ sin capacidad para {request_obj.user.email} "
                        "(no hay agentes disponibles)"
                    )
                )
                continue

            visit_label = (
                f"{request_obj.user.email} → agente {agent.agent_code} "
                f"({agent.user.get_full_name() or agent.user.email})"
            )
            if dry_run:
                self.stdout.write(f"  [dry-run] {visit_label}")
                assigned += 1
                continue

            with transaction.atomic():
                visit = VerificationVisit.objects.create(
                    visit_type="tenant"
                    if request_obj.user.user_type == "tenant"
                    else "landlord",
                    agent=agent,
                    target_user=request_obj.user,
                    visit_address="Por confirmar con el verificado",
                    visit_city="Bucaramanga",
                    scheduled_date=timezone.now().date(),
                    status="scheduled",
                )
                request_obj.scheduled_visit = visit
                request_obj.status = "visit_scheduled"
                request_obj.save(
                    update_fields=["scheduled_visit", "status", "updated_at"]
                )
            self.stdout.write(self.style.SUCCESS(f"  ✓ {visit_label}"))
            assigned += 1

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"Resumen: {assigned} asignada(s), {skipped_no_capacity} sin capacidad."
            )
        )

    @staticmethod
    def _pick_agent() -> VerificationAgent | None:
        """Agente disponible con menos visitas esta semana."""
        candidates = list(
            VerificationAgent.objects.filter(is_available=True).select_related("user")
        )
        with_capacity = [a for a in candidates if a.has_capacity]
        if not with_capacity:
            return None
        with_capacity.sort(key=lambda a: a.current_week_visits)
        return with_capacity[0]
