"""Crea códigos de entrevista para el registro controlado.

`scripts/init_verihome.sh` y el seed de producción (Fase 3.2 del plan)
invocan este comando. Por defecto crea códigos para landlord y tenant
en partes iguales, válidos 30 días, de un solo uso.
"""

from __future__ import annotations

from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from users.models import InterviewCode, User

_VALID_TYPES = [choice[0] for choice in User.USER_TYPES]


class Command(BaseCommand):
    help = "Crea códigos de entrevista para registro controlado"

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=10,
            help="Cantidad total de códigos a crear (default: 10)",
        )
        parser.add_argument(
            "--user-type",
            choices=_VALID_TYPES,
            help=(
                "Crear todos los códigos para este tipo de usuario. "
                "Sin esta opción se reparten entre landlord y tenant."
            ),
        )
        parser.add_argument(
            "--days",
            type=int,
            default=30,
            help="Días de validez de cada código (default: 30)",
        )
        parser.add_argument(
            "--email",
            default="",
            help="Email pre-autorizado para usar los códigos (opcional)",
        )

    def handle(self, *args, **options):
        count = options["count"]
        if count < 1:
            raise CommandError("--count debe ser >= 1")

        if options["user_type"]:
            user_types = [options["user_type"]] * count
        else:
            base = ["landlord", "tenant"]
            user_types = [base[i % len(base)] for i in range(count)]

        valid_until = timezone.now() + timedelta(days=options["days"])
        created = [
            InterviewCode.objects.create(
                user_type=user_type,
                email=options["email"],
                valid_until=valid_until,
                notes="Creado por create_interview_codes",
            )
            for user_type in user_types
        ]

        self.stdout.write(
            self.style.SUCCESS(
                f"{len(created)} códigos creados (válidos {options['days']} días):"
            )
        )
        for code in created:
            self.stdout.write(f"  {code.code}  →  {code.user_type}")
