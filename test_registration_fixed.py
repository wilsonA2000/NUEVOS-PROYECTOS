#!/usr/bin/env python
"""
Script de prueba para verificar el registro de usuarios con el serializador corregido.
"""

import os
import sys
import django
from django.conf import settings

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import InterviewCode, LandlordProfile, TenantProfile, ServiceProviderProfile, UserSettings
from users.serializers import UserRegistrationSerializer
from rest_framework.test import APIRequestFactory
from rest_framework import status

User = get_user_model()

def test_user_registration():
    """Prueba el registro de usuarios con diferentes tipos."""
    
    print("🧪 Probando registro de usuarios...")
    
    # Crear códigos de entrevista de prueba
    test_codes = [
        {'code': 'TEST001', 'email': 'landlord@test.com'},
        {'code': 'TEST002', 'email': 'tenant@test.com'},
        {'code': 'TEST003', 'email': 'provider@test.com'},
    ]
    
    for code_data in test_codes:
        InterviewCode.objects.get_or_create(
            code=code_data['code'],
            email=code_data['email'],
            defaults={'is_used': False}
        )
    
    # Datos de prueba para diferentes tipos de usuario
    test_users = [
        {
            'email': 'landlord@test.com',
            'password': 'testpass123',
            'password2': 'testpass123',
            'first_name': 'Juan',
            'last_name': 'Arrendador',
            'user_type': 'landlord',
            'phone_number': '+573001234567',
            'terms_accepted': True,
            'privacy_policy_accepted': True,
            'interview_code': 'TEST001',
            'company_name': 'Inmobiliaria Test',
            'property_types': ['apartment', 'house'],
            'total_properties': 5,
            'years_experience': 3
        },
        {
            'email': 'tenant@test.com',
            'password': 'testpass123',
            'password2': 'testpass123',
            'first_name': 'María',
            'last_name': 'Arrendataria',
            'user_type': 'tenant',
            'phone_number': '+573007654321',
            'terms_accepted': True,
            'privacy_policy_accepted': True,
            'interview_code': 'TEST002',
            'current_address': 'Calle 123 #45-67',
            'credit_score': 750,
            'budget_range': '1000000-2000000',
            'move_in_date': '2024-07-01',
            'lease_duration': '12 meses'
        },
        {
            'email': 'provider@test.com',
            'password': 'testpass123',
            'password2': 'testpass123',
            'first_name': 'Carlos',
            'last_name': 'Servicios',
            'user_type': 'service_provider',
            'phone_number': '+573009876543',
            'terms_accepted': True,
            'privacy_policy_accepted': True,
            'interview_code': 'TEST003',
            'service_category': 'maintenance',
            'specialties': ['plumbing', 'electrical'],
            'business_name': 'Servicios Test',
            'hourly_rate': 50000,
            'service_areas': ['Bogotá', 'Medellín'],
            'years_experience': 5
        }
    ]
    
    factory = APIRequestFactory()
    
    for i, user_data in enumerate(test_users):
        print(f"\n📝 Probando registro {i+1}: {user_data['email']}")
        
        try:
            # Crear request simulando la API
            request = factory.post('/api/v1/auth/register/', user_data)
            
            # Validar datos
            serializer = UserRegistrationSerializer(data=user_data)
            if serializer.is_valid():
                print(f"✅ Validación exitosa para {user_data['email']}")
                
                # Crear usuario
                user = serializer.save()
                print(f"✅ Usuario creado: {user.email} (ID: {user.id})")
                print(f"   Tipo: {user.get_user_type_display()}")
                print(f"   Verificado: {user.is_verified}")
                
                # Verificar que se creó el perfil específico
                profile = user.get_profile()
                if profile:
                    print(f"✅ Perfil creado: {type(profile).__name__}")
                else:
                    print(f"❌ No se creó perfil específico")
                
                # Verificar configuración de usuario
                try:
                    settings = user.settings
                    print(f"✅ Configuración de usuario creada")
                except UserSettings.DoesNotExist:
                    print(f"❌ No se creó configuración de usuario")
                
            else:
                print(f"❌ Errores de validación para {user_data['email']}:")
                for field, errors in serializer.errors.items():
                    print(f"   {field}: {errors}")
                    
        except Exception as e:
            print(f"❌ Error durante el registro de {user_data['email']}: {str(e)}")
            import traceback
            traceback.print_exc()

def test_existing_users():
    """Verificar usuarios existentes en la base de datos."""
    
    print("\n📊 Verificando usuarios existentes...")
    
    total_users = User.objects.count()
    print(f"Total de usuarios: {total_users}")
    
    if total_users > 0:
        print("\nUsuarios existentes:")
        for user in User.objects.all()[:10]:  # Mostrar solo los primeros 10
            profile = user.get_profile()
            profile_type = type(profile).__name__ if profile else "Sin perfil"
            print(f"  - {user.email} ({user.get_user_type_display()}) - {profile_type}")
    
    # Verificar códigos de entrevista
    total_codes = InterviewCode.objects.count()
    print(f"\nTotal de códigos de entrevista: {total_codes}")
    
    if total_codes > 0:
        print("Códigos de entrevista:")
        for code in InterviewCode.objects.all()[:5]:
            print(f"  - {code.code} ({code.email}) - Usado: {code.is_used}")

def cleanup_test_data():
    """Limpiar datos de prueba."""
    
    print("\n🧹 Limpiando datos de prueba...")
    
    # Eliminar usuarios de prueba
    test_emails = ['landlord@test.com', 'tenant@test.com', 'provider@test.com']
    deleted_users = User.objects.filter(email__in=test_emails).delete()
    print(f"Usuarios eliminados: {deleted_users[0]}")
    
    # Eliminar códigos de prueba
    test_codes = ['TEST001', 'TEST002', 'TEST003']
    deleted_codes = InterviewCode.objects.filter(code__in=test_codes).delete()
    print(f"Códigos eliminados: {deleted_codes[0]}")

if __name__ == '__main__':
    print("🚀 Iniciando pruebas de registro de usuarios...")
    
    try:
        # Verificar estado actual
        test_existing_users()
        
        # Ejecutar pruebas de registro
        test_user_registration()
        
        # Verificar resultados
        test_existing_users()
        
        # Preguntar si limpiar datos de prueba
        response = input("\n¿Deseas limpiar los datos de prueba? (s/n): ")
        if response.lower() in ['s', 'si', 'sí', 'y', 'yes']:
            cleanup_test_data()
            print("✅ Datos de prueba limpiados")
        else:
            print("ℹ️ Datos de prueba conservados para inspección")
            
    except Exception as e:
        print(f"❌ Error durante las pruebas: {str(e)}")
        import traceback
        traceback.print_exc()
    
    print("\n✅ Pruebas completadas") 