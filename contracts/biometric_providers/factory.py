"""Factory para seleccionar el proveedor facial activo."""

from __future__ import annotations

import logging
from functools import lru_cache

from django.conf import settings

from .base import FacialProvider
from .demo import DemoFacialProvider

logger = logging.getLogger(__name__)

_PROVIDER_DEMO = "demo"
_PROVIDER_AWS = "aws_rekognition"
_VALID_PROVIDERS = {_PROVIDER_DEMO, _PROVIDER_AWS}


def _resolve_provider_name() -> str:
    name = (
        getattr(settings, "BIOMETRIC_FACIAL_PROVIDER", _PROVIDER_DEMO) or _PROVIDER_DEMO
    )
    name = name.strip().lower()
    if name not in _VALID_PROVIDERS:
        logger.warning("BIOMETRIC_FACIAL_PROVIDER=%r no reconocido, usando demo", name)
        return _PROVIDER_DEMO
    return name


def _build_aws_provider() -> FacialProvider:
    """Intenta construir el proveedor AWS; si falla, cae a demo.

    El import se hace local para que instalar boto3/moto no sea
    requisito duro cuando el proveedor activo es demo.
    """
    try:
        from .aws_rekognition import AWSRekognitionProvider
    except ImportError as exc:
        logger.warning("AWSRekognitionProvider no disponible: %s — fallback demo", exc)
        return DemoFacialProvider()

    try:
        return AWSRekognitionProvider()
    except Exception as exc:
        logger.warning(
            "AWSRekognitionProvider no pudo inicializarse (%s) — fallback demo",
            exc,
        )
        return DemoFacialProvider()


@lru_cache(maxsize=1)
def get_facial_provider() -> FacialProvider:
    """Devuelve la instancia del proveedor activo (memoizada).

    Para invalidar la cache (tests, cambio de setting runtime) llamar
    `get_facial_provider.cache_clear()`.
    """
    name = _resolve_provider_name()
    if name == _PROVIDER_AWS:
        return _build_aws_provider()
    return DemoFacialProvider()
