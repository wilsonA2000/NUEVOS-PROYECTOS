#!/usr/bin/env python3
"""
Script para buscar y arreglar todos los problemas de query_params
"""

import os
import re

def fix_query_params_in_file(file_path):
    """Fix query_params issues in a specific file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Patrón para encontrar request.query_params
        pattern = r'request\.query_params'
        replacement = r'getattr(request, "query_params", request.GET)'
        
        content = re.sub(pattern, replacement, content)
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Fixed: {file_path}")
            return True
        else:
            return False
            
    except Exception as e:
        print(f"❌ Error fixing {file_path}: {e}")
        return False

def find_and_fix_query_params():
    """Find and fix all query_params issues."""
    fixed_files = []
    
    # Directories to search
    search_dirs = [
        'dashboard',
        'properties', 
        'payments',
        'contracts',
        'ratings',
        'messaging',
        'users',
        'core'
    ]
    
    for dir_name in search_dirs:
        if os.path.exists(dir_name):
            for root, dirs, files in os.walk(dir_name):
                for file in files:
                    if file.endswith('.py'):
                        file_path = os.path.join(root, file)
                        # Check if file contains query_params
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                content = f.read()
                                if 'query_params' in content and 'request.query_params' in content:
                                    if fix_query_params_in_file(file_path):
                                        fixed_files.append(file_path)
                        except:
                            continue
    
    return fixed_files

def main():
    print("🔍 Searching for query_params issues...")
    fixed_files = find_and_fix_query_params()
    
    if fixed_files:
        print(f"\n✅ Fixed {len(fixed_files)} files:")
        for file in fixed_files:
            print(f"  - {file}")
    else:
        print("\n✅ No files needed fixing")
    
    print("\n🚀 Query params fix complete!")

if __name__ == '__main__':
    main()