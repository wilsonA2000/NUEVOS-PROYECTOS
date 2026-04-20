"""BIO-002: flag de `modo demo` para el servicio biométrico.

El pipeline biométrico devuelve scores simulados (ver `_process_face_image`,
`_analyze_face_coherence`, etc. en `biometric_service.py`). Mientras no exista
integración con un proveedor ML real, los endpoints deben comunicar al cliente
que la verificación es demostrativa para evitar una falsa sensación de
seguridad (y para cumplir con el deber de información de Ley 1581/2012).
"""

from __future__ import annotations

import os

from django.conf import settings


def is_demo_biometric_mode() -> bool:
    """Retorna True cuando los scores biométricos son simulados.

    Desde P0.1 la fuente de verdad es el `FacialProvider` activo: si el
    factory devuelve `DemoFacialProvider` (explícito o por fallback al
    faltar credenciales AWS), el servicio biométrico está en demo. Las
    vars `DEMO_BIOMETRICS` y `DEBUG=True` siguen funcionando como override
    manual (para entornos donde se quiere forzar el disclosure).
    """
    env = os.environ.get("DEMO_BIOMETRICS")
    if env is not None:
        return env.strip().lower() in ("1", "true", "yes", "on")

    try:
        from contracts.biometric_providers import get_facial_provider

        if get_facial_provider().is_demo():
            return True
    except Exception:
        # Si el paquete falla por cualquier razón, tratamos como demo
        # para no ocultar el disclosure al usuario final.
        return True

    return bool(getattr(settings, "DEBUG", False))


DEMO_DISCLOSURE_TEXT = (
    "Modo demostración: la verificación biométrica está simulada. "
    "En producción se integra con un proveedor ML real (AWS Rekognition / Metamap). "
    "Los resultados mostrados no constituyen prueba legal hasta que la integración "
    "esté activa y se obtenga el consentimiento bajo Ley 1581/2012."
)
