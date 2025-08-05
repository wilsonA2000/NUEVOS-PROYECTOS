#!/usr/bin/env python
"""
Verify Redis and Channels-Redis Installation
"""

import sys
import os

# Add project to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def main():
    print("VERIFYING REDIS AND CHANNELS-REDIS INSTALLATION")
    print("=" * 50)
    
    # Check Redis package
    try:
        import redis
        print(f"[OK] Redis package installed - Version: {redis.__version__}")
        
        # Try to create a Redis client
        try:
            client = redis.Redis(host='localhost', port=6379, decode_responses=True)
            client.ping()
            print("[OK] Redis server is running and accessible")
        except (redis.ConnectionError, redis.TimeoutError) as e:
            print("[INFO] Redis server not running (expected in development)")
            print(f"       Error: {type(e).__name__}")
    except ImportError:
        print("[ERROR] Redis package NOT installed")
        return False
    
    # Check Channels-Redis package
    try:
        import channels_redis
        print(f"[OK] Channels-Redis package installed")
        
        # Check if it can be imported in Django context
        try:
            from channels_redis.core import RedisChannelLayer
            print("[OK] RedisChannelLayer can be imported")
        except ImportError as e:
            print(f"[ERROR] Cannot import RedisChannelLayer: {e}")
    except ImportError:
        print("[ERROR] Channels-Redis package NOT installed")
        return False
    
    # Check Django Channels
    try:
        import channels
        print(f"[OK] Django Channels installed - Version: {channels.__version__}")
    except ImportError:
        print("[ERROR] Django Channels NOT installed")
        return False
    
    # Check Django configuration
    print("\nDJANGO CONFIGURATION:")
    print("-" * 30)
    
    try:
        import django
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
        django.setup()
        
        from django.conf import settings
        
        # Check ASGI application
        if hasattr(settings, 'ASGI_APPLICATION'):
            print(f"[OK] ASGI_APPLICATION: {settings.ASGI_APPLICATION}")
        else:
            print("[ERROR] ASGI_APPLICATION not configured")
        
        # Check Channel Layers
        if hasattr(settings, 'CHANNEL_LAYERS'):
            backend = settings.CHANNEL_LAYERS['default']['BACKEND']
            print(f"[OK] CHANNEL_LAYERS configured")
            print(f"     Backend: {backend}")
            
            if 'InMemoryChannelLayer' in backend:
                print("     [INFO] Using InMemoryChannelLayer (development mode)")
            elif 'RedisChannelLayer' in backend:
                print("     [INFO] Using RedisChannelLayer (production ready)")
        else:
            print("[ERROR] CHANNEL_LAYERS not configured")
            
    except Exception as e:
        print(f"[ERROR] Failed to check Django configuration: {e}")
        return False
    
    print("\n" + "=" * 50)
    print("SUMMARY: All required packages are installed!")
    print("Redis server is not required for development (InMemoryChannelLayer is used)")
    print("To start Redis for production: docker run -p 6379:6379 redis:alpine")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)