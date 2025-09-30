#!/usr/bin/env python3
"""
Clear Cache - Clean all cache to refresh data
"""

import os
import sys
import django
from pathlib import Path

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.core.cache import cache

def clear_cache():
    """Clear all cache."""
    
    print("🧪 CLEARING ALL CACHE")
    print("=" * 30)
    
    try:
        # Clear all cache
        cache.clear()
        print("✅ Cache cleared successfully")
        
        # Verify cache is empty
        test_key = 'test_key'
        cache.set(test_key, 'test_value', 10)
        if cache.get(test_key) == 'test_value':
            print("✅ Cache is working correctly")
            cache.delete(test_key)
        else:
            print("❌ Cache may not be working")
            
    except Exception as e:
        print(f"❌ Error clearing cache: {e}")

if __name__ == '__main__':
    clear_cache()