"""Proveedores de análisis biométrico facial para VeriHome.

El servicio `BiometricAuthenticationService` delega el análisis real
(detección de rostro, quality, comparación facial) a una implementación
de `FacialProvider`. Esto permite intercambiar entre un
`DemoFacialProvider` (scores fijos, usado por defecto en dev y CI) y
proveedores reales (Truora Identity, futuros) sin tocar el servicio.
"""

from __future__ import annotations

from .base import FaceAnalysis, FacialProvider
from .demo import DemoFacialProvider
from .document_base import DocumentAnalysis, DocumentProvider
from .document_demo import DemoDocumentProvider
from .document_factory import get_document_provider
from .factory import get_facial_provider
from .voice_base import VoiceAnalysis, VoiceProvider
from .voice_demo import DemoVoiceProvider
from .voice_factory import get_voice_provider

__all__ = [
    "FaceAnalysis",
    "FacialProvider",
    "DemoFacialProvider",
    "get_facial_provider",
    "DocumentAnalysis",
    "DocumentProvider",
    "DemoDocumentProvider",
    "get_document_provider",
    "VoiceAnalysis",
    "VoiceProvider",
    "DemoVoiceProvider",
    "get_voice_provider",
]
