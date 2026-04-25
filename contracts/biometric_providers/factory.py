"""Factory para seleccionar el proveedor facial activo.

Hoy sólo expone `demo` (scores simulados). El provider Truora Identity
se integrará en fase TR-3 — cubrirá face + document + liveness en un
único flujo, así que no se mantienen wrappers AWS-específicos aquí.
"""

from __future__ import annotations

import logging
from functools import lru_cache

from django.conf import settings

from .base import FacialProvider
from .demo import DemoFacialProvider

logger = logging.getLogger(__name__)

_PROVIDER_DEMO = "demo"
_VALID_PROVIDERS = {_PROVIDER_DEMO}


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
    _resolve_provider_name()
    return DemoFacialProvider()
