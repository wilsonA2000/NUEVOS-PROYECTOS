"""
Script para verificar si los componentes eliminados estaban siendo usados
"""

import os
import re
from pathlib import Path

# Componentes que eliminé
DELETED_FILES = [
    'MatchedCandidatesView_OLD_BACKUP.tsx',
    'LoadingSpinner.tsx',  # en root /components
    'Layout.tsx',          # en root /components
    'NotificationCenter.tsx',  # en root /components
    'WebSocketStatus.tsx'  # en /components/common
]

def scan_imports():
    """Buscar imports de los archivos eliminados"""
    base_path = Path("/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS/frontend/src")

    problems = []

    for tsx_file in base_path.rglob("*.tsx"):
        if "__tests__" in str(tsx_file) or "node_modules" in str(tsx_file):
            continue

        try:
            content = tsx_file.read_text(encoding='utf-8')

            # Buscar imports problemáticos
            if "from '../components/LoadingSpinner'" in content or "from './LoadingSpinner'" in content:
                problems.append({
                    'file': str(tsx_file.relative_to(base_path)),
                    'issue': 'Importa LoadingSpinner desde components/ (eliminado)',
                    'line': find_line(content, "LoadingSpinner")
                })

            if "from './Layout'" in content or "from '../Layout'" in content:
                problems.append({
                    'file': str(tsx_file.relative_to(base_path)),
                    'issue': 'Importa Layout desde components/ (eliminado)',
                    'line': find_line(content, "Layout")
                })

            if "from './NotificationCenter'" in content or "from '../NotificationCenter'" in content:
                if "notifications/NotificationCenter" not in content:
                    problems.append({
                        'file': str(tsx_file.relative_to(base_path)),
                        'issue': 'Importa NotificationCenter desde components/ (eliminado)',
                        'line': find_line(content, "NotificationCenter")
                    })

            if "from './WebSocketStatus'" in content:
                if "OptimizedWebSocketStatus" not in content:
                    problems.append({
                        'file': str(tsx_file.relative_to(base_path)),
                        'issue': 'Importa WebSocketStatus (eliminado)',
                        'line': find_line(content, "WebSocketStatus")
                    })

            if "MatchedCandidatesView_OLD_BACKUP" in content:
                problems.append({
                    'file': str(tsx_file.relative_to(base_path)),
                    'issue': 'Referencia a MatchedCandidatesView_OLD_BACKUP',
                    'line': find_line(content, "OLD_BACKUP")
                })

        except Exception as e:
            print(f"Error leyendo {tsx_file}: {e}")

    return problems

def find_line(content, search_term):
    """Encontrar número de línea"""
    lines = content.split('\n')
    for i, line in enumerate(lines, 1):
        if search_term in line:
            return i
    return 0

def main():
    print("="*80)
    print("🔍 VERIFICACIÓN DE IMPORTS DE ARCHIVOS ELIMINADOS")
    print("="*80)
    print()

    print("Archivos eliminados:")
    for f in DELETED_FILES:
        print(f"  ❌ {f}")
    print()

    print("Escaneando proyecto para buscar referencias...")
    print()

    problems = scan_imports()

    if not problems:
        print("✅ ¡EXCELENTE! No se encontraron imports problemáticos")
        print()
        print("Todos los componentes eliminados NO estaban siendo usados,")
        print("o sus imports ya fueron actualizados correctamente.")
        print()
        print("📊 Estado: SEGURO PARA CONTINUAR")
    else:
        print(f"⚠️  ADVERTENCIA: Se encontraron {len(problems)} referencias problemáticas:")
        print()
        for problem in problems:
            print(f"  🔴 {problem['file']}:{problem['line']}")
            print(f"     {problem['issue']}")
            print()
        print("❌ ACCIÓN REQUERIDA: Actualizar estos imports antes de continuar")

if __name__ == '__main__':
    main()
