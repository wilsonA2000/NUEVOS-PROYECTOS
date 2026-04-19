#!/usr/bin/env python3
"""
Diagnóstico del problema de autenticación 401 en VeriHome
"""
import os
import sys
import django
import json
from datetime import datetime, timedelta

# Configurar Django
sys.path.append('/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.contrib.auth import get_user_model
from properties.models import Property
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone

User = get_user_model()

def diagnose_auth_system():
    """Diagnosticar el sistema de autenticación"""
    
    print("=" * 70)
    print("🔍 DIAGNÓSTICO DEL SISTEMA DE AUTENTICACIÓN - VERIHOME")
    print("=" * 70)
    
    # 1. Verificar usuarios en el sistema
    print("\n📊 ESTADO DE USUARIOS:")
    total_users = User.objects.count()
    active_users = User.objects.filter(is_active=True).count()
    verified_users = User.objects.filter(is_verified=True).count()
    landlord_users = User.objects.filter(user_type='landlord', is_active=True).count()
    
    print(f"   Total usuarios: {total_users}")
    print(f"   Usuarios activos: {active_users}")
    print(f"   Usuarios verificados: {verified_users}")
    print(f"   Arrendadores activos: {landlord_users}")
    
    # 2. Mostrar usuarios recientes para testing
    print("\n👥 USUARIOS DISPONIBLES PARA TESTING:")
    recent_users = User.objects.filter(is_active=True).order_by('-date_joined')[:5]
    
    for i, user in enumerate(recent_users, 1):
        status_icons = []
        if user.is_verified:
            status_icons.append("✅")
        else:
            status_icons.append("❌")
        if user.user_type == 'landlord':
            status_icons.append("🏠")
        elif user.user_type == 'tenant':
            status_icons.append("🏘️")
        else:
            status_icons.append("⚙️")
        
        status_str = "".join(status_icons)
        print(f"   {i}. {user.email} {status_str}")
        print(f"      Tipo: {user.user_type}, Verificado: {user.is_verified}")
    
    # 3. Verificar propiedades
    print("\n🏠 ESTADO DE PROPIEDADES:")
    total_properties = Property.objects.count()
    available_properties = Property.objects.filter(is_active=True).count()
    
    print(f"   Total propiedades: {total_properties}")
    print(f"   Propiedades disponibles: {available_properties}")
    
    # 4. Generar token de prueba para el primer usuario activo
    print("\n🔐 GENERAR TOKEN DE PRUEBA:")
    
    test_user = User.objects.filter(is_active=True, is_verified=True).first()
    if test_user:
        refresh = RefreshToken.for_user(test_user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        
        print(f"   Usuario de prueba: {test_user.email}")
        print(f"   Tipo de usuario: {test_user.user_type}")
        print("   🎫 Token de acceso:")
        print(f"      {access_token[:50]}...")
        
        # Instrucciones para prueba manual
        print("\n📝 INSTRUCCIONES PARA PRUEBA MANUAL:")
        print("   1. Copia este token de acceso:")
        print(f"      {access_token}")
        print("\n   2. En tu navegador, abre DevTools (F12)")
        print("   3. Ve a Console y ejecuta:")
        print(f"      localStorage.setItem('token', '{access_token}');")
        print(f"      localStorage.setItem('refresh', '{refresh_token}');")
        print("   4. Recarga la página")
        
        # Verificar validez del token
        from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
        try:
            # Verificar si el token está en la blacklist
            is_valid = True
            print("\n✅ Token generado exitosamente y es válido")
        except Exception as e:
            print(f"\n❌ Error verificando token: {e}")
    else:
        print("   ❌ No hay usuarios activos y verificados para generar token")
        
        # Sugerir crear un usuario de prueba
        print("\n🆕 CREAR USUARIO DE PRUEBA:")
        print("   Ejecuta el siguiente comando en otra terminal:")
        print("   python manage.py shell")
        print("   Y luego:")
        print("""
from django.contrib.auth import get_user_model
User = get_user_model()

# Crear usuario de prueba
user = User.objects.create_user(
    email='test@verihome.local',
    password='testpass123',
    first_name='Usuario',
    last_name='Prueba',
    user_type='landlord',
    is_verified=True
)
print(f'Usuario creado: {user.email}')
        """)
    
    # 5. Verificar configuración del backend
    print("\n⚙️ CONFIGURACIÓN DEL BACKEND:")
    from django.conf import settings
    
    print(f"   DEBUG: {settings.DEBUG}")
    print(f"   SECRET_KEY configurado: {'✅' if settings.SECRET_KEY else '❌'}")
    
    # Verificar CORS si está instalado
    try:
        cors_allowed = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
        cors_allow_all = getattr(settings, 'CORS_ALLOW_ALL_ORIGINS', False)
        print(f"   CORS Allow All: {cors_allow_all}")
        if cors_allowed:
            print(f"   CORS Allowed Origins: {len(cors_allowed)} configurados")
    except:
        print("   CORS: No configurado")
    
    # 6. URLs de testing
    print("\n🌐 URLs PARA TESTING:")
    print("   Backend API: http://localhost:8000/api/v1/")
    print("   Propiedades: http://localhost:8000/api/v1/properties/")
    print("   Usuarios: http://localhost:8000/api/v1/users/")
    print("   Auth: http://localhost:8000/api/v1/users/auth/")
    
    print("\n✨ DIAGNÓSTICO COMPLETADO")
    print("=" * 70)

if __name__ == "__main__":
    diagnose_auth_system()