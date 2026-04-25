"""Factory para seleccionar el DocumentProvider activo.

Hoy sólo expone `demo` (scores simulados). Truora Identity (fase TR-3)
cubrirá OCR de cédula CO + cruce Registraduría dentro del mismo proceso
que el liveness facial.
"""

from __future__ import annotations

import logging
from functools import lru_cache

from django.conf import settings

from .document_base import DocumentProvider
from .document_demo import DemoDocumentProvider

logger = logging.getLogger(__name__)

_PROVIDER_DEMO = "demo"
_VALID_PROVIDERS = {_PROVIDER_DEMO}


def _resolve_provider_name() -> str:
    name = (
        getattr(settings, "BIOMETRIC_DOCUMENT_PROVIDER", _PROVIDER_DEMO)
        or _PROVIDER_DEMO
    )
    name = name.strip().lower()
    if name not in _VALID_PROVIDERS:
        logger.warning(
            "BIOMETRIC_DOCUMENT_PROVIDER=%r no reconocido, usando demo", name
        )
        return _PROVIDER_DEMO
    return name


@lru_cache(maxsize=1)
def get_document_provider() -> DocumentProvider:
    """Devuelve la instancia del DocumentProvider activo (memoizada)."""
    _resolve_provider_name()
    return DemoDocumentProvider()
