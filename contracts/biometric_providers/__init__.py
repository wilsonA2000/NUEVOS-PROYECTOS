"""Proveedores de análisis biométrico facial para VeriHome.

El servicio `BiometricAuthenticationService` delega el análisis real
(detección de rostro, quality, liveness heurístico, comparación facial)
a una implementación de `FacialProvider`. Esto permite intercambiar
entre un `DemoFacialProvider` (scores fijos, usado por defecto en dev
y CI) y proveedores reales (AWS Rekognition, futuros Azure/Google) sin
tocar el servicio.
"""

from __future__ import annotations

from .base import FaceAnalysis, FacialProvider
from .demo import DemoFacialProvider
from .factory import get_facial_provider

__all__ = [
    "FaceAnalysis",
    "FacialProvider",
    "DemoFacialProvider",
    "get_facial_provider",
]
