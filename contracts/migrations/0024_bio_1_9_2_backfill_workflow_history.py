"""Fase 1.9.2 — Backfill workflow_history JSONField → ContractWorkflowHistory.

Migración de datos: por cada LandlordControlledContract con entradas en el
JSONField legacy `workflow_history`, crea filas en ContractWorkflowHistory
que no existan aún. Dedupe por (contract_id, timestamp, action_type).

No borra el JSONField (rollback-safe); eso queda para una migración posterior
cuando esté confirmado que nada lo lee.
"""
from __future__ import annotations

from datetime import datetime, timedelta

from django.db import migrations
from django.utils import timezone

# Whitelist de action_type válidos en ContractWorkflowHistory (ACTION_TYPES)
_VALID_ACTION_TYPES = {
    'CREATE', 'UPDATE', 'STATE_CHANGE',
    'INVITATION_SENT', 'INVITATION_RESENT', 'INVITATION_ACCEPTED',
    'INVITE_TENANT', 'ACCEPT_INVITATION',
    'SUBMIT_OBJECTION', 'RESPOND_OBJECTION',
    'APPROVE', 'SIGN', 'PUBLISH', 'CANCEL', 'TERMINATE',
    'ADD_GUARANTEE', 'MODIFY_GUARANTEE', 'VERIFY_GUARANTEE',
    'SYSTEM_ACTION',
}

# Mapeo informal de action/event_type legacy → ACTION_TYPE canónico
_LEGACY_ACTION_MAP = {
    'TENANT_RETURN': 'STATE_CHANGE',
    'LANDLORD_START_CORRECTION': 'STATE_CHANGE',
    'RESUBMIT_FOR_ADMIN_REVIEW': 'STATE_CHANGE',
    'RESUBMIT_FOR_REVIEW': 'STATE_CHANGE',
    'SPECIFIC_CONCERNS_ADDED': 'UPDATE',
    'DETAILED_CHANGES_ADDED': 'UPDATE',
    'admin_approval': 'APPROVE',
    'tenant_return': 'STATE_CHANGE',
    'state_change': 'STATE_CHANGE',
}


def _parse_timestamp(raw: str) -> datetime | None:
    if not raw:
        return None
    # Quitar la 'Z' que a veces aparece en ISO del frontend antiguo.
    raw = raw.replace('Z', '+00:00')
    try:
        return datetime.fromisoformat(raw)
    except ValueError:
        return None


def _resolve_action_type(entry: dict) -> str:
    """Mapea action/event_type legacy → ACTION_TYPE válido."""
    raw = entry.get('action') or entry.get('event_type') or ''
    if raw in _VALID_ACTION_TYPES:
        return raw
    mapped = _LEGACY_ACTION_MAP.get(raw)
    if mapped:
        return mapped
    # Heurísticas por prefijo
    up = raw.upper()
    if up in _VALID_ACTION_TYPES:
        return up
    return 'SYSTEM_ACTION'


def _backfill(apps, schema_editor):
    LandlordControlledContract = apps.get_model(
        'contracts', 'LandlordControlledContract'
    )
    ContractWorkflowHistory = apps.get_model(
        'contracts', 'ContractWorkflowHistory'
    )
    User = apps.get_model('users', 'User')

    qs = LandlordControlledContract.objects.exclude(
        workflow_history__isnull=True
    ).exclude(workflow_history=[])

    created = 0
    skipped = 0
    for contract in qs.iterator():
        entries = contract.workflow_history or []
        if not isinstance(entries, list):
            continue

        for entry in entries:
            if not isinstance(entry, dict):
                continue

            ts = _parse_timestamp(entry.get('timestamp', ''))
            if ts is None:
                ts = contract.created_at or timezone.now()

            action_type = _resolve_action_type(entry)

            # Dedupe: ¿ya existe una fila muy cercana (<=1s) con el mismo
            # contrato y action_type? El signal de 1.9.1 pudo haberla creado.
            window_start = ts - timedelta(seconds=1)
            window_end = ts + timedelta(seconds=1)
            exists = ContractWorkflowHistory.objects.filter(
                contract=contract,
                action_type=action_type,
                timestamp__gte=window_start,
                timestamp__lte=window_end,
            ).exists()
            if exists:
                skipped += 1
                continue

            # Resolver usuario. El JSONField guardaba user_id como str.
            performed_by = None
            raw_user_id = entry.get('user_id')
            if raw_user_id:
                try:
                    performed_by = User.objects.filter(id=raw_user_id).first()
                except (ValueError, TypeError):
                    performed_by = None

            description = (
                entry.get('description')
                or entry.get('action')
                or entry.get('event_type')
                or 'Evento legacy migrado desde workflow_history'
            )[:500]

            user_role = 'system'
            if performed_by is not None:
                user_role = getattr(performed_by, 'user_type', 'system') or 'system'

            row = ContractWorkflowHistory.objects.create(
                contract=contract,
                action_type=action_type,
                action_description=description,
                performed_by=performed_by,
                user_role=user_role,
                old_state=(entry.get('old_state') or '')[:30],
                new_state=(entry.get('new_state') or '')[:30],
                changes_made=entry.get('details') or entry.get('metadata') or {},
                metadata={
                    'legacy_action': entry.get('action'),
                    'legacy_event_type': entry.get('event_type'),
                    'legacy_user_name': entry.get('user_name'),
                    'legacy_user_email': entry.get('user_email'),
                    'migrated_from': 'workflow_history_jsonfield',
                },
            )
            # `timestamp` es auto_now_add; lo forzamos al original con update().
            ContractWorkflowHistory.objects.filter(pk=row.pk).update(timestamp=ts)
            created += 1

    print(
        f'\n[1.9.2 backfill] ContractWorkflowHistory: {created} filas creadas, '
        f'{skipped} duplicados evitados.'
    )


def _noop_reverse(apps, schema_editor):
    """Reverso: no-op. El JSONField no se tocó, así que rollback queda intacto."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('contracts', '0023_bio_1_9_1_signal_nullable_performed_by'),
    ]

    operations = [
        migrations.RunPython(_backfill, reverse_code=_noop_reverse),
    ]
