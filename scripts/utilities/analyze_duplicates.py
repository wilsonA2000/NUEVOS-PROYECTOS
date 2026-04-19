"""
Script para analizar y detectar componentes duplicados en el proyecto.
"""

import re
from pathlib import Path
from collections import defaultdict

def find_components():
    """Buscar todos los componentes .tsx"""
    base_path = Path("/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS/frontend/src/components")
    components = []

    for file_path in base_path.rglob("*.tsx"):
        if "__tests__" not in str(file_path) and "node_modules" not in str(file_path):
            rel_path = file_path.relative_to(base_path)
            size = file_path.stat().st_size
            components.append({
                'name': file_path.name,
                'path': str(rel_path),
                'full_path': str(file_path),
                'size': size,
                'lines': count_lines(file_path)
            })

    return components

def count_lines(file_path):
    """Contar líneas de código"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return len(f.readlines())
    except:
        return 0

def find_duplicates(components):
    """Identificar componentes con nombres similares"""
    groups = defaultdict(list)

    for comp in components:
        # Agrupar por nombre base (sin Enhanced, Simple, etc.)
        base_name = re.sub(r'(Enhanced|Simple|Professional|Old|Backup|Optimized|Real.*?)', '', comp['name'])
        base_name = re.sub(r'(_OLD|_BACKUP)', '', base_name)
        groups[base_name].append(comp)

    # Filtrar grupos con más de un componente
    duplicates = {k: v for k, v in groups.items() if len(v) > 1}

    return duplicates

def main():
    print("="*80)
    print("🔍 ANÁLISIS DE COMPONENTES DUPLICADOS - VERIHOME")
    print("="*80)
    print()

    components = find_components()
    print(f"📊 Total componentes encontrados: {len(components)}")
    print()

    duplicates = find_duplicates(components)
    print(f"🔴 Grupos con duplicados potenciales: {len(duplicates)}")
    print()

    if not duplicates:
        print("✅ No se encontraron componentes duplicados")
        return

    # Ordenar por cantidad de duplicados
    sorted_groups = sorted(duplicates.items(), key=lambda x: len(x[1]), reverse=True)

    priority_high = []
    priority_medium = []
    priority_low = []

    for base_name, comps in sorted_groups:
        total_lines = sum(c['lines'] for c in comps)

        # Prioridad basada en cantidad y tamaño
        if len(comps) >= 3 or total_lines > 500:
            priority_high.append((base_name, comps, total_lines))
        elif len(comps) == 2 and total_lines > 200:
            priority_medium.append((base_name, comps, total_lines))
        else:
            priority_low.append((base_name, comps, total_lines))

    # Imprimir resultados
    print("="*80)
    print("🔥 PRIORIDAD ALTA - Consolidación urgente")
    print("="*80)
    for base_name, comps, total_lines in priority_high:
        print(f"\n📦 {base_name} ({len(comps)} versiones, {total_lines} líneas totales)")
        for comp in sorted(comps, key=lambda x: x['lines'], reverse=True):
            print(f"   • {comp['path']:60s} {comp['lines']:4d} líneas")

    print("\n" + "="*80)
    print("🟡 PRIORIDAD MEDIA - Consolidación recomendada")
    print("="*80)
    for base_name, comps, total_lines in priority_medium:
        print(f"\n📦 {base_name} ({len(comps)} versiones, {total_lines} líneas totales)")
        for comp in sorted(comps, key=lambda x: x['lines'], reverse=True):
            print(f"   • {comp['path']:60s} {comp['lines']:4d} líneas")

    print("\n" + "="*80)
    print("🟢 PRIORIDAD BAJA - Revisar si es necesario")
    print("="*80)
    for base_name, comps, total_lines in priority_low:
        print(f"\n📦 {base_name} ({len(comps)} versiones, {total_lines} líneas totales)")
        for comp in sorted(comps, key=lambda x: x['lines'], reverse=True):
            print(f"   • {comp['path']:60s} {comp['lines']:4d} líneas")

    # Estadísticas
    print("\n" + "="*80)
    print("📊 ESTADÍSTICAS DE CONSOLIDACIÓN")
    print("="*80)
    print(f"\n🔥 Prioridad Alta: {len(priority_high)} grupos ({sum(len(g[1]) for g in priority_high)} componentes)")
    print(f"🟡 Prioridad Media: {len(priority_medium)} grupos ({sum(len(g[1]) for g in priority_medium)} componentes)")
    print(f"🟢 Prioridad Baja: {len(priority_low)} grupos ({sum(len(g[1]) for g in priority_low)} componentes)")

    total_duplicate_lines = sum(
        total_lines for _, _, total_lines in priority_high + priority_medium + priority_low
    )
    print(f"\n📏 Total líneas duplicadas: {total_duplicate_lines:,}")
    print(f"💾 Potencial ahorro estimado: ~{total_duplicate_lines // 2:,} líneas")

    # Recomendaciones
    print("\n" + "="*80)
    print("💡 RECOMENDACIONES")
    print("="*80)
    print("\n1. Comenzar con prioridad ALTA (componentes críticos)")
    print("2. Para cada grupo:")
    print("   a. Identificar el componente más completo")
    print("   b. Migrar funcionalidades únicas de los otros")
    print("   c. Actualizar todos los imports")
    print("   d. Eliminar componentes obsoletos")
    print("3. Verificar que no se rompa funcionalidad")
    print("4. Ejecutar tests después de cada consolidación")

if __name__ == '__main__':
    main()
