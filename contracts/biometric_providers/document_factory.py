"""Factory para seleccionar el DocumentProvider activo.

Mismo patrón que `factory.py` (facial): `lru_cache`, resolver por
setting, try-import con fallback transparente a demo.
"""

from __future__ import annotations

import logging
from functools import lru_cache

from django.conf import settings

from .document_base import DocumentProvider
from .document_demo import DemoDocumentProvider

logger = logging.getLogger(__name__)

_PROVIDER_DEMO = "demo"
_PROVIDER_AWS_TEXTRACT = "aws_textract"
_VALID_PROVIDERS = {_PROVIDER_DEMO, _PROVIDER_AWS_TEXTRACT}


def _resolve_provider_name() -> str:
    name = getattr(settings, "BIOMETRIC_DOCUMENT_PROVIDER", _PROVIDER_DEMO) or _PROVIDER_DEMO
    name = name.strip().lower()
    if name not in _VALID_PROVIDERS:
        logger.warning(
            "BIOMETRIC_DOCUMENT_PROVIDER=%r no reconocido, usando demo", name
        )
        return _PROVIDER_DEMO
    return name


def _build_aws_textract_provider() -> DocumentProvider:
    try:
        from .aws_textract import AWSTextractProvider
    except ImportError as exc:
        logger.warning(
            "AWSTextractProvider no disponible: %s — fallback demo", exc
        )
        return DemoDocumentProvider()

    try:
        return AWSTextractProvider()
    except Exception as exc:
        logger.warning(
            "AWSTextractProvider no pudo inicializarse (%s) — fallback demo",
            exc,
        )
        return DemoDocumentProvider()


@lru_cache(maxsize=1)
def get_document_provider() -> DocumentProvider:
    """Devuelve la instancia del DocumentProvider activo (memoizada)."""
    name = _resolve_provider_name()
    if name == _PROVIDER_AWS_TEXTRACT:
        return _build_aws_textract_provider()
    return DemoDocumentProvider()
