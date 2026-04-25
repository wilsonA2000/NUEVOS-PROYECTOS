"""Parser best-effort de texto OCR para documentos de identidad CO.

Se usa como capa secundaria cuando un proveedor OCR devuelve líneas
crudas de texto sin parsear los campos (tipo doc, número, nombres,
fechas) en formato estructurado. Función pura, testeable sin
dependencias externas.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date
from typing import Iterable


@dataclass
class ParsedColombianID:
    document_number: str | None = None
    full_name: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    date_of_birth: date | None = None
    expiry_date: date | None = None
    detected_type: str = ""


_EXPLICIT_TYPE_KEYWORDS = (
    ("pasaporte", ("PASAPORTE", "PASSPORT")),
    ("tarjeta_identidad", ("TARJETA DE IDENTIDAD",)),
    ("cedula_extranjeria", ("CEDULA DE EXTRANJERIA", "CÉDULA DE EXTRANJERÍA")),
    ("cedula_ciudadania", ("CEDULA DE CIUDADANIA", "CÉDULA DE CIUDADANÍA")),
)
_FALLBACK_CEDULA_KEYWORDS = ("REPUBLICA DE COLOMBIA", "REPÚBLICA DE COLOMBIA")

_CEDULA_NUMBER_RE = re.compile(r"\b[1-9]\d{5,9}\b")
_CE_NUMBER_RE = re.compile(r"\bCE[\s\-]*?(\d{6,7})\b", re.IGNORECASE)
_DATE_RE = re.compile(
    r"\b(0?[1-9]|[12]\d|3[01])[\/\-\s](0?[1-9]|1[0-2])[\/\-\s]((?:19|20)\d{2})\b"
)
_DATE_SPANISH_MONTH_RE = re.compile(
    r"\b(0?[1-9]|[12]\d|3[01])[\s\-\/]+"
    r"(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)[A-Z]*"
    r"[\s\-\/]+((?:19|20)\d{2})\b",
    re.IGNORECASE,
)

_SPANISH_MONTHS = {
    "ENE": 1,
    "FEB": 2,
    "MAR": 3,
    "ABR": 4,
    "MAY": 5,
    "JUN": 6,
    "JUL": 7,
    "AGO": 8,
    "SEP": 9,
    "OCT": 10,
    "NOV": 11,
    "DIC": 12,
}

_BIRTH_HINTS = ("NACIMIENTO", "NACIDO", "DATE OF BIRTH", "BIRTH")
_EXPIRY_HINTS = ("VENCIMIENTO", "VIGENCIA", "EXPIRATION", "EXPIRY", "VALIDEZ")
_DOC_NUMBER_HINTS = ("NUMERO", "NÚMERO", "NUIP", "DOCUMENT NUMBER", "No.")

_STOPWORDS_NAME = {
    "REPUBLICA",
    "REPÚBLICA",
    "COLOMBIA",
    "CEDULA",
    "CÉDULA",
    "CIUDADANIA",
    "CIUDADANÍA",
    "EXTRANJERIA",
    "EXTRANJERÍA",
    "TARJETA",
    "IDENTIDAD",
    "PASAPORTE",
    "NACIONAL",
    "REGISTRADURIA",
    "REGISTRADURÍA",
    "ESTADO",
    "CIVIL",
    "NUMERO",
    "NÚMERO",
    "NUIP",
    "APELLIDOS",
    "NOMBRES",
    "SEXO",
    "ESTATURA",
    "FIRMA",
    "HUELLA",
    "INDICE",
    "ÍNDICE",
    "DERECHO",
    "FECHA",
    "NACIMIENTO",
    "EXPEDICION",
    "EXPEDICIÓN",
    "VIGENCIA",
    "VENCIMIENTO",
    "LUGAR",
    "RH",
}


def _detect_type(lines: Iterable[str]) -> str:
    joined = " ".join(line.upper() for line in lines)
    for type_name, keywords in _EXPLICIT_TYPE_KEYWORDS:
        for kw in keywords:
            if kw in joined:
                return type_name
    for fallback in _FALLBACK_CEDULA_KEYWORDS:
        if fallback in joined:
            return "cedula_ciudadania"
    return ""


def _parse_date(match_groups: tuple) -> date | None:
    try:
        day = int(match_groups[0])
        second = match_groups[1]
        year = int(match_groups[2])
        if len(str(year)) == 2:
            year = 2000 + year
        if isinstance(second, str) and not second.isdigit():
            month = _SPANISH_MONTHS.get(second[:3].upper())
            if not month:
                return None
        else:
            month = int(second)
        return date(year, month, day)
    except (ValueError, TypeError):
        return None


def _extract_dates(text: str) -> list[tuple[date, int]]:
    """Retorna lista de (fecha, posición en el texto)."""
    results: list[tuple[date, int]] = []
    for match in _DATE_RE.finditer(text):
        parsed = _parse_date(match.groups())
        if parsed:
            results.append((parsed, match.start()))
    for match in _DATE_SPANISH_MONTH_RE.finditer(text):
        parsed = _parse_date(match.groups())
        if parsed:
            results.append((parsed, match.start()))
    return results


def _extract_document_number(text: str, doc_type: str) -> str | None:
    if doc_type == "cedula_extranjeria":
        ce_match = _CE_NUMBER_RE.search(text)
        if ce_match:
            return f"CE{ce_match.group(1)}"
    candidates = _CEDULA_NUMBER_RE.findall(text)
    if not candidates:
        return None
    candidates_sorted = sorted(candidates, key=len, reverse=True)
    return candidates_sorted[0]


def _extract_names(lines: list[str]) -> tuple[str | None, str | None, str | None]:
    """Devuelve (full_name, first_name, last_name)."""
    candidates = []
    for raw in lines:
        line = raw.strip()
        if not line or any(ch.isdigit() for ch in line):
            continue
        if line.upper() != line:
            continue
        tokens = [t for t in line.split() if t not in _STOPWORDS_NAME]
        if len(tokens) < 2:
            continue
        if all(len(t) <= 2 for t in tokens):
            continue
        candidates.append(" ".join(tokens))

    if not candidates:
        return None, None, None

    candidates.sort(key=len, reverse=True)
    full_name = candidates[0]
    parts = full_name.split()
    if len(parts) == 2:
        first_name, last_name = parts[0], parts[1]
    elif len(parts) >= 3:
        mid = len(parts) // 2
        first_name = " ".join(parts[:mid])
        last_name = " ".join(parts[mid:])
    else:
        first_name = last_name = None
    return full_name, first_name, last_name


def _assign_dates(
    text: str, dates: list[tuple[date, int]]
) -> tuple[date | None, date | None]:
    """Intenta asociar fechas con su contexto (nacimiento vs vencimiento)."""
    if not dates:
        return None, None

    upper = text.upper()
    birth: date | None = None
    expiry: date | None = None

    for fecha, pos in dates:
        window_start = max(0, pos - 40)
        context = upper[window_start:pos]
        if any(hint in context for hint in _BIRTH_HINTS):
            birth = birth or fecha
            continue
        if any(hint in context for hint in _EXPIRY_HINTS):
            expiry = expiry or fecha
            continue

    if not birth or not expiry:
        ordered = sorted(dates, key=lambda t: t[0])
        if not birth:
            birth = ordered[0][0]
        if not expiry and len(ordered) > 1:
            expiry = ordered[-1][0]
    return birth, expiry


def parse_colombian_id(text_lines: list[str]) -> ParsedColombianID:
    """Entrada principal del parser.

    Recibe la lista de líneas de texto extraídas por OCR. Best-effort:
    los campos que no puedan extraerse quedan en `None`.
    """
    lines = [ln for ln in text_lines if ln and ln.strip()]
    text = "\n".join(lines)
    doc_type = _detect_type(lines)

    document_number = _extract_document_number(text, doc_type)
    full_name, first_name, last_name = _extract_names(lines)
    birth, expiry = _assign_dates(text, _extract_dates(text))

    return ParsedColombianID(
        document_number=document_number,
        full_name=full_name,
        first_name=first_name,
        last_name=last_name,
        date_of_birth=birth,
        expiry_date=expiry,
        detected_type=doc_type,
    )
