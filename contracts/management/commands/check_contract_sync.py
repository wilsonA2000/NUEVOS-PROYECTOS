"""Verifica la sincronización por UUID entre Contract y LandlordControlledContract.

VeriHome mantiene dos modelos coexistentes (ver
`docs/CONTRACT_ARCHITECTURE.md`) que comparten el mismo UUID por
convención. Este comando detecta desincronizaciones (LCCs sin Contract
legacy o Contract legacy sin LCC) y, opcionalmente, corrige creando la
contraparte faltante con datos mínimos.

Uso:

    python manage.py check_contract_sync           # sólo reporta
    python manage.py check_contract_sync --fix     # crea LCCs faltantes
    python manage.py check_contract_sync --json    # salida JSON para CI
"""

from __future__ import annotations

import json

from django.core.management.base import BaseCommand

from contracts.landlord_contract_models import LandlordControlledContract
from contracts.models import Contract


class Command(BaseCommand):
    help = "Detecta desincronizaciones Contract ↔ LandlordControlledContract."

    def add_arguments(self, parser):
        parser.add_argument(
            "--fix",
            action="store_true",
            help="Modo corrección: NO implementado todavía (requiere decidir "
            "qué datos inferir). Sólo reporta por ahora.",
        )
        parser.add_argument(
            "--json",
            action="store_true",
            help="Salida JSON (útil en CI).",
        )

    def handle(self, *args, **options):
        lcc_ids = set(
            str(pk)
            for pk in LandlordControlledContract.objects.values_list("id", flat=True)
        )
        contract_ids = set(
            str(pk) for pk in Contract.objects.values_list("id", flat=True)
        )

        lcc_without_contract = sorted(lcc_ids - contract_ids)
        contract_without_lcc = sorted(contract_ids - lcc_ids)
        in_sync = sorted(lcc_ids & contract_ids)

        report = {
            "lcc_total": len(lcc_ids),
            "contract_total": len(contract_ids),
            "in_sync_count": len(in_sync),
            "lcc_without_contract": lcc_without_contract,
            "contract_without_lcc": contract_without_lcc,
        }

        if options.get("json"):
            self.stdout.write(json.dumps(report, indent=2))
            return

        style = self.style
        self.stdout.write("")
        self.stdout.write(style.MIGRATE_HEADING("═══ Contract ↔ LCC sync report ═══"))
        self.stdout.write(f'  LCC totales:       {report["lcc_total"]}')
        self.stdout.write(f'  Contract totales:  {report["contract_total"]}')
        self.stdout.write(f'  En sincronía:      {report["in_sync_count"]}')
        self.stdout.write("")

        if not lcc_without_contract and not contract_without_lcc:
            self.stdout.write(style.SUCCESS("✓ Todo sincronizado (0 incongruencias)."))
            return

        if lcc_without_contract:
            self.stdout.write(
                style.WARNING(f"⚠ {len(lcc_without_contract)} LCC sin Contract legacy:")
            )
            for pk in lcc_without_contract[:20]:
                self.stdout.write(f"   · {pk}")
            if len(lcc_without_contract) > 20:
                self.stdout.write(f"   … (y {len(lcc_without_contract) - 20} más)")

        if contract_without_lcc:
            self.stdout.write(
                style.WARNING(f"⚠ {len(contract_without_lcc)} Contract sin LCC:")
            )
            for pk in contract_without_lcc[:20]:
                self.stdout.write(f"   · {pk}")
            if len(contract_without_lcc) > 20:
                self.stdout.write(f"   … (y {len(contract_without_lcc) - 20} más)")

        if options.get("fix"):
            self.stdout.write("")
            self.stdout.write(
                style.NOTICE(
                    "Modo --fix: todavía no implementado. Los datos mínimos "
                    "requeridos (monthly_rent, start_date) no se pueden inferir "
                    "de forma segura desde LCC sin revisión humana. Usa "
                    "`contracts.services.matching_integration._ensure_contract_exists` "
                    "desde un shell para casos puntuales."
                )
            )
