"""Factory para seleccionar el proveedor facial activo.

Proveedores disponibles:
- `demo`: scores simulados (default en dev/CI).
- `local`: sistema propio con OpenCV + dlib/face_recognition (2.7).
  Se importa de forma perezosa: si las libs nativas no están
  instaladas, se loggea el error y se cae a demo en vez de romper
  el arranque de Django.
"""

from __future__ import annotations

import logging
from functools import lru_cache

from django.conf import settings

from .base import FacialProvider
from .demo import DemoFacialProvider

logger = logging.getLogger(__name__)

_PROVIDER_DEMO = "demo"
_PROVIDER_LOCAL = "local"
_VALID_PROVIDERS = {_PROVIDER_DEMO, _PROVIDER_LOCAL}


def _resolve_provider_name() -> str:
    name = (
        getattr(settings, "BIOMETRIC_FACIAL_PROVIDER", _PROVIDER_DEMO) or _PROVIDER_DEMO
    )
    name = name.strip().lower()
    if name not in _VALID_PROVIDERS:
        logger.warning("BIOMETRIC_FACIAL_PROVIDER=%r no reconocido, usando demo", name)
        return _PROVIDER_DEMO
    return name


@lru_cache(maxsize=1)
def get_facial_provider() -> FacialProvider:
    """Devuelve la instancia del proveedor activo (memoizada).

    Para invalidar la cache (tests, cambio de setting runtime) llamar
    `get_facial_provider.cache_clear()`.
    """
    name = _resolve_provider_name()
    if name == _PROVIDER_LOCAL:
        try:
            from .local import LocalFacialProvider

            return LocalFacialProvider()
        except ImportError as exc:
            logger.error(
                "BIOMETRIC_FACIAL_PROVIDER=local pero faltan dependencias "
                "(opencv/face_recognition): %s — usando demo",
                exc,
            )
    return DemoFacialProvider()
