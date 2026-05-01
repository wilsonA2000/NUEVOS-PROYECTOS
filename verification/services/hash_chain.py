"""
Hash chain para actas VeriHome ID (FieldVisitAct).

Implementa una cadena estilo blockchain ligero (Merkle simple):
cada acta sellada referencia el `final_hash` de la inmediatamente
anterior. Mutar cualquier acta posterior obliga a recomputar todos
los `final_hash` siguientes, por lo que la integridad probatoria
del bloque se preserva mientras `verify_chain()` retorne sin errores.
"""

from __future__ import annotations

import hashlib
import json
from typing import Any


GENESIS_PREV_HASH = "0" * 64


def canonical_json(data: Any) -> bytes:
    """Serializa `data` a JSON determinístico (keys ordenadas, sin espacios)."""
    return json.dumps(
        data,
        sort_keys=True,
        separators=(",", ":"),
        default=str,
        ensure_ascii=False,
    ).encode("utf-8")


def sha256_hex(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def compute_payload_hash(payload: dict, pdf_sha256: str) -> str:
    """SHA-256 del JSON canónico del payload concatenado con el sha256 del PDF."""
    body = canonical_json(payload) + b"|" + pdf_sha256.encode("ascii")
    return sha256_hex(body)


def compute_final_hash(
    *,
    prev_hash: str,
    payload_hash: str,
    lawyer_signed_at_iso: str,
    lawyer_user_id: int | str,
    lawyer_tp_number: str,
) -> str:
    """SHA-256(prev_hash || payload_hash || ts || user_id || T.P.)."""
    body = "|".join(
        [
            prev_hash,
            payload_hash,
            lawyer_signed_at_iso,
            str(lawyer_user_id),
            lawyer_tp_number,
        ]
    ).encode("utf-8")
    return sha256_hex(body)


def get_last_sealed_act():
    """Última acta sellada (mayor block_number). Lazy import para evitar ciclo."""
    from verification.models import FieldVisitAct

    return (
        FieldVisitAct.objects.filter(status="sealed")
        .exclude(block_number__isnull=True)
        .order_by("-block_number")
        .first()
    )


def next_block_number() -> int:
    last = get_last_sealed_act()
    return (last.block_number + 1) if last else 1


def seal_act(act, *, lawyer_signed_at) -> None:
    """
    Cierra el bloque del acta: calcula payload_hash, prev_hash, final_hash y
    block_number. No persiste — el caller hace `act.save()`.
    """
    last = get_last_sealed_act()
    prev_hash = last.final_hash if last else GENESIS_PREV_HASH
    payload_hash = compute_payload_hash(act.payload, act.pdf_sha256)
    final_hash = compute_final_hash(
        prev_hash=prev_hash,
        payload_hash=payload_hash,
        lawyer_signed_at_iso=lawyer_signed_at.isoformat(),
        lawyer_user_id=act.lawyer_user_id,
        lawyer_tp_number=act.lawyer_tp_number,
    )
    act.prev_act = last
    act.prev_hash = prev_hash
    act.payload_hash = payload_hash
    act.final_hash = final_hash
    act.block_number = next_block_number()
    act.status = "sealed"


def verify_chain() -> dict:
    """
    Recorre todas las actas selladas en orden de bloque y verifica que cada
    `final_hash` sea consistente con su payload, su `prev_hash` declarado y
    los datos de firma del abogado. Retorna `{ok, total, errors[]}`.
    """
    from verification.models import FieldVisitAct

    errors: list[dict] = []
    expected_prev = GENESIS_PREV_HASH
    expected_block = 1
    qs = FieldVisitAct.objects.filter(status="sealed").order_by("block_number")

    for act in qs:
        if act.block_number != expected_block:
            errors.append(
                {
                    "act_id": str(act.id),
                    "act_number": act.act_number,
                    "code": "block_number_mismatch",
                    "expected": expected_block,
                    "actual": act.block_number,
                }
            )
        if act.prev_hash != expected_prev:
            errors.append(
                {
                    "act_id": str(act.id),
                    "act_number": act.act_number,
                    "code": "prev_hash_mismatch",
                    "expected": expected_prev,
                    "actual": act.prev_hash,
                }
            )

        recomputed_payload_hash = compute_payload_hash(act.payload, act.pdf_sha256)
        if recomputed_payload_hash != act.payload_hash:
            errors.append(
                {
                    "act_id": str(act.id),
                    "act_number": act.act_number,
                    "code": "payload_tampered",
                }
            )

        recomputed_final = compute_final_hash(
            prev_hash=act.prev_hash,
            payload_hash=act.payload_hash,
            lawyer_signed_at_iso=act.lawyer_signed_at.isoformat()
            if act.lawyer_signed_at
            else "",
            lawyer_user_id=act.lawyer_user_id,
            lawyer_tp_number=act.lawyer_tp_number,
        )
        if recomputed_final != act.final_hash:
            errors.append(
                {
                    "act_id": str(act.id),
                    "act_number": act.act_number,
                    "code": "final_hash_mismatch",
                }
            )

        expected_prev = act.final_hash
        expected_block += 1

    return {
        "ok": not errors,
        "total": qs.count(),
        "errors": errors,
    }
