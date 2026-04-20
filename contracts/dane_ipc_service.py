"""
Servicio de consulta del IPC oficial publicado por el DANE (Colombia).

Consume la API abierta de datos.gov.co para obtener la variación anual
del Índice de Precios al Consumidor, utilizado como tope legal para el
incremento de cánones de arrendamiento (Art. 20, Ley 820 de 2003).

Endpoint DANE (IPC mensual):
    https://www.datos.gov.co/resource/rnig-2r4y.json

Estrategia de resiliencia:
    1. Consulta la API del DANE.
    2. Cachea el resultado 24 horas (Django cache framework).
    3. Si la API no responde, usa una tasa por defecto configurable.
"""

import logging
from decimal import Decimal, InvalidOperation
from typing import Optional

import requests
from django.core.cache import cache

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuración
# ---------------------------------------------------------------------------

DANE_IPC_API_URL = "https://www.datos.gov.co/resource/rnig-2r4y.json"

# Tiempo de vida del cache en segundos (24 horas)
CACHE_TTL = 60 * 60 * 24

# Clave base para cache
CACHE_KEY_CURRENT = "dane_ipc_current_rate"
CACHE_KEY_YEAR_PREFIX = "dane_ipc_year_"

# Tasa IPC de respaldo cuando la API no está disponible.
# Corresponde a la variación anual IPC 2025 reportada por el DANE.
DEFAULT_IPC_RATE = Decimal("5.20")

# Timeout para peticiones HTTP (segundos)
REQUEST_TIMEOUT = 10


# ---------------------------------------------------------------------------
# Servicio principal
# ---------------------------------------------------------------------------


class DaneIPCService:
    """
    Cliente para la API abierta del DANE que expone el IPC mensual.

    Métodos principales:
        get_current_ipc_rate()        -> Decimal  (variación anual más reciente)
        get_ipc_rate_for_year(year)   -> Decimal  (variación anual de diciembre del año dado)
    """

    # ------------------------------------------------------------------
    # API pública
    # ------------------------------------------------------------------

    @classmethod
    def get_current_ipc_rate(cls) -> Decimal:
        """
        Retorna la tasa IPC anual más reciente publicada por el DANE.

        El valor se cachea durante 24 horas. Si la API falla o no
        devuelve datos válidos, retorna ``DEFAULT_IPC_RATE``.

        Returns:
            Decimal con la variación porcentual anual (ej. ``Decimal('5.20')``
            para un 5.20 %).
        """
        cached = cache.get(CACHE_KEY_CURRENT)
        if cached is not None:
            logger.debug("IPC actual obtenido de cache: %s", cached)
            return Decimal(str(cached))

        rate = cls._fetch_latest_ipc_rate()
        if rate is not None:
            cache.set(CACHE_KEY_CURRENT, str(rate), CACHE_TTL)
            return rate

        logger.warning(
            "No se pudo obtener el IPC del DANE. " "Usando tasa por defecto: %s%%",
            DEFAULT_IPC_RATE,
        )
        return DEFAULT_IPC_RATE

    @classmethod
    def get_ipc_rate_for_year(cls, year: int) -> Decimal:
        """
        Retorna la variación anual del IPC correspondiente a diciembre
        del *year* indicado.

        El valor se cachea con clave ``dane_ipc_year_{year}`` durante
        24 horas.

        Args:
            year: Año calendario (ej. 2025).

        Returns:
            Decimal con la variación porcentual anual.

        Raises:
            ValueError: Si *year* es menor a 2000 o mayor al año actual + 1.
        """
        if year < 2000:
            raise ValueError(f"Año fuera de rango: {year}")

        cache_key = f"{CACHE_KEY_YEAR_PREFIX}{year}"
        cached = cache.get(cache_key)
        if cached is not None:
            logger.debug("IPC año %d obtenido de cache: %s", year, cached)
            return Decimal(str(cached))

        rate = cls._fetch_ipc_rate_for_year(year)
        if rate is not None:
            cache.set(cache_key, str(rate), CACHE_TTL)
            return rate

        logger.warning(
            "No se pudo obtener el IPC del DANE para el año %d. "
            "Usando tasa por defecto: %s%%",
            year,
            DEFAULT_IPC_RATE,
        )
        return DEFAULT_IPC_RATE

    # ------------------------------------------------------------------
    # Métodos internos de consulta a la API
    # ------------------------------------------------------------------

    @classmethod
    def _fetch_latest_ipc_rate(cls) -> Optional[Decimal]:
        """
        Consulta la API del DANE y retorna la variación anual del
        registro más reciente disponible.
        """
        params = {
            "$order": "A_o DESC, Mes DESC",
            "$limit": 1,
            "$where": "Variaci_n_anual IS NOT NULL",
        }
        data = cls._call_api(params)
        if not data:
            return None
        return cls._extract_annual_variation(data[0])

    @classmethod
    def _fetch_ipc_rate_for_year(cls, year: int) -> Optional[Decimal]:
        """
        Consulta la API del DANE filtrando por diciembre del año dado.

        Si no encuentra diciembre, toma el mes más reciente de ese año.
        """
        # Intento 1: diciembre del año solicitado
        params_dec = {
            "$where": f"A_o='{year}' AND Mes='12' AND Variaci_n_anual IS NOT NULL",
            "$limit": 1,
        }
        data = cls._call_api(params_dec)
        if data:
            rate = cls._extract_annual_variation(data[0])
            if rate is not None:
                return rate

        # Intento 2: último mes disponible del año
        params_year = {
            "$where": f"A_o='{year}' AND Variaci_n_anual IS NOT NULL",
            "$order": "Mes DESC",
            "$limit": 1,
        }
        data = cls._call_api(params_year)
        if data:
            return cls._extract_annual_variation(data[0])

        return None

    @classmethod
    def _call_api(cls, params: dict) -> Optional[list]:
        """
        Realiza la petición HTTP GET a la API del DANE.

        Returns:
            Lista de registros JSON o ``None`` si hubo error.
        """
        try:
            response = requests.get(
                DANE_IPC_API_URL,
                params=params,
                timeout=REQUEST_TIMEOUT,
                headers={"Accept": "application/json"},
            )
            response.raise_for_status()
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                return data
            logger.info("La API del DANE retornó una lista vacía. Params: %s", params)
            return None
        except requests.exceptions.Timeout:
            logger.error(
                "Timeout al consultar la API del DANE (timeout=%ds).",
                REQUEST_TIMEOUT,
            )
        except requests.exceptions.ConnectionError:
            logger.error("Error de conexión al consultar la API del DANE.")
        except requests.exceptions.HTTPError as exc:
            logger.error(
                "Error HTTP %s al consultar la API del DANE.",
                exc.response.status_code if exc.response else "desconocido",
            )
        except (ValueError, KeyError) as exc:
            logger.error("Error procesando respuesta del DANE: %s", exc)
        return None

    @staticmethod
    def _extract_annual_variation(record: dict) -> Optional[Decimal]:
        """
        Extrae el campo de variación anual de un registro de la API.

        El campo esperado es ``Variaci_n_anual`` (variación porcentual
        anual del IPC). Según la estructura del dataset DANE, el valor
        viene como string numérico.

        Returns:
            Decimal o ``None`` si el campo no existe o no es parseable.
        """
        # El nombre del campo puede variar ligeramente según el dataset
        raw = record.get("Variaci_n_anual") or record.get("variaci_n_anual")
        if raw is None:
            logger.warning(
                "Campo 'Variaci_n_anual' no encontrado en registro DANE: %s",
                list(record.keys()),
            )
            return None
        try:
            return Decimal(str(raw)).quantize(Decimal("0.01"))
        except (InvalidOperation, TypeError) as exc:
            logger.error("No se pudo convertir '%s' a Decimal: %s", raw, exc)
            return None
