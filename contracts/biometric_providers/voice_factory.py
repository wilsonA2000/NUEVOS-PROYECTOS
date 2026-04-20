"""Factory para seleccionar el VoiceProvider activo.

Mismo patrón que `factory.py` y `document_factory.py`. Por ahora solo
expone el proveedor demo; los proveedores reales (Google Speech-to-Text,
AWS Transcribe, Azure Speaker Recognition) son trabajo de la fase P0.3b
y se engancharán como drop-in cuando estén listos — la forma del
factory ya contempla el switch por setting.
"""

from __future__ import annotations

import logging
from functools import lru_cache

from django.conf import settings

from .voice_base import VoiceProvider
from .voice_demo import DemoVoiceProvider

logger = logging.getLogger(__name__)

_PROVIDER_DEMO = "demo"
# Cuando se integre un provider real añadir aquí su identificador
# (ej. "google_stt", "aws_transcribe", "azure_speech").
_VALID_PROVIDERS = {_PROVIDER_DEMO}


def _resolve_provider_name() -> str:
    name = (
        getattr(settings, "BIOMETRIC_VOICE_PROVIDER", _PROVIDER_DEMO) or _PROVIDER_DEMO
    )
    name = name.strip().lower()
    if name not in _VALID_PROVIDERS:
        logger.warning(
            "BIOMETRIC_VOICE_PROVIDER=%r aún no implementado, usando demo "
            "(ver P0.3b en NEXT_SESSION.md)",
            name,
        )
        return _PROVIDER_DEMO
    return name


@lru_cache(maxsize=1)
def get_voice_provider() -> VoiceProvider:
    name = _resolve_provider_name()
    # Hook para futuros providers: elif name == "google_stt": ...
    del name
    return DemoVoiceProvider()
