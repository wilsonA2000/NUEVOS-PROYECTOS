"""
Helpers para generar identificadores seriados estables.

`count()+1` es frágil: cuando se borran registros (seeds, cleanups, soft-
deletes), el próximo conteo coincide con un número que ya existe en la
base y rompe la unicidad. La estrategia correcta es leer el máximo
sufijo numérico libre y sumarle 1.
"""

import re


def next_serial(model_class, year, prefix, field_name, padding=5):
    """
    Devuelve el próximo identificador serial libre con formato
    `{prefix}-{year}-{N zero-padded}`.

    Implementación: extrae el máximo sufijo numérico de los registros
    que ya tienen ese prefijo+año y le suma 1. Tolera huecos por
    borrados.

    Args:
        model_class: clase del modelo Django.
        year: año (int).
        prefix: prefijo string (ej "SPT", "VIS", "ACT", "VH").
        field_name: nombre del campo serial (ej "ticket_number").
        padding: cantidad de dígitos para zero-padding (default 5).

    Returns:
        str con el identificador completo, ej "SPT-2026-00043".
    """
    qs = model_class.objects.filter(
        **{f"{field_name}__startswith": f"{prefix}-{year}-"}
    ).values_list(field_name, flat=True)
    pattern = re.compile(rf"^{re.escape(prefix)}-{year}-(\d+)$")
    max_num = 0
    for val in qs:
        match = pattern.match(val or "")
        if match:
            n = int(match.group(1))
            if n > max_num:
                max_num = n
    return f"{prefix}-{year}-{(max_num + 1):0{padding}d}"


def next_global_serial(model_class, prefix, field_name, padding=4):
    """
    Variante sin año (ej `AGT-0001`). Mismo principio pero sin filtro
    de año.
    """
    qs = model_class.objects.filter(
        **{f"{field_name}__startswith": f"{prefix}-"}
    ).values_list(field_name, flat=True)
    pattern = re.compile(rf"^{re.escape(prefix)}-(\d+)$")
    max_num = 0
    for val in qs:
        match = pattern.match(val or "")
        if match:
            n = int(match.group(1))
            if n > max_num:
                max_num = n
    return f"{prefix}-{(max_num + 1):0{padding}d}"
