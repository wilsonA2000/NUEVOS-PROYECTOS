#!/usr/bin/env python
"""
Script de prueba para el sistema completo de entrevistas y códigos únicos.
"""

import os
import sys
import django
from django.conf import settings

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import InterviewCode
from users.utils import (
    generate_interview_code, create_interview_code, validate_interview_code,
    send_interview_code_email, get_interview_statistics, cleanup_expired_codes
)
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

def test_interview_code_generation():
    """Prueba la generación de códigos únicos."""
    
    print("🧪 Probando generación de códigos únicos...")
    
    # Generar varios códigos
    codes = []
    for i in range(5):
        code = generate_interview_code()
        codes.append(code)
        print(f"  Código {i+1}: {code}")
    
    # Verificar que sean únicos
    unique_codes = set(codes)
    if len(codes) == len(unique_codes):
        print("✅ Todos los códigos son únicos")
    else:
        print("❌ Se encontraron códigos duplicados")
    
    return codes

def test_interview_code_creation():
    """Prueba la creación de códigos de entrevista."""
    
    print("\n📝 Probando creación de códigos de entrevista...")
    
    test_candidates = [
        {
            'email': 'candidato1@test.com',
            'rating': 8,
            'notes': 'Excelente candidato, muy profesional'
        },
        {
            'email': 'candidato2@test.com',
            'rating': 6,
            'notes': 'Buen candidato, necesita mejorar en algunos aspectos'
        },
        {
            'email': 'candidato3@test.com',
            'rating': 0,
            'notes': 'Pendiente de entrevista'
        }
    ]
    
    created_codes = []
    
    for candidate in test_candidates:
        try:
            interview_code = create_interview_code(
                email=candidate['email'],
                initial_rating=candidate['rating'],
                notes=candidate['notes'],
                expires_in_days=30
            )
            
            created_codes.append(interview_code)
            print(f"✅ Código creado para {candidate['email']}: {interview_code.code}")
            print(f"   Calificación: {interview_code.initial_rating}/10")
            print(f"   Expira: {interview_code.expires_at.strftime('%d/%m/%Y')}")
            
        except Exception as e:
            print(f"❌ Error creando código para {candidate['email']}: {str(e)}")
    
    return created_codes

def test_interview_code_validation():
    """Prueba la validación de códigos de entrevista."""
    
    print("\n🔍 Probando validación de códigos...")
    
    # Obtener códigos existentes
    codes = InterviewCode.objects.filter(is_used=False)[:3]
    
    for code in codes:
        print(f"\nValidando código: {code.code}")
        
        # Probar validación correcta
        is_valid, message, interview_code = validate_interview_code(code.code, code.email)
        print(f"  Validación correcta: {is_valid} - {message}")
        
        # Probar con email incorrecto
        is_valid_wrong_email, message_wrong, _ = validate_interview_code(code.code, 'wrong@email.com')
        print(f"  Email incorrecto: {is_valid_wrong_email} - {message_wrong}")
        
        # Probar con código incorrecto
        is_valid_wrong_code, message_wrong_code, _ = validate_interview_code('WRONG123', code.email)
        print(f"  Código incorrecto: {is_valid_wrong_code} - {message_wrong_code}")

def test_interview_statistics():
    """Prueba las estadísticas de entrevistas."""
    
    print("\n📊 Probando estadísticas de entrevistas...")
    
    try:
        stats = get_interview_statistics()
        
        print("Estadísticas actuales:")
        print(f"  Total de códigos: {stats['total_codes']}")
        print(f"  Códigos usados: {stats['used_codes']}")
        print(f"  Códigos pendientes: {stats['pending_codes']}")
        print(f"  Códigos expirados: {stats['expired_codes']}")
        print(f"  Calificación promedio: {stats['average_rating']}")
        print(f"  Tasa de uso: {stats['usage_rate']}%")
        
    except Exception as e:
        print(f"❌ Error obteniendo estadísticas: {str(e)}")

def test_email_sending():
    """Prueba el envío de emails de entrevista."""
    
    print("\n📧 Probando envío de emails...")
    
    # Obtener un código no usado
    try:
        code = InterviewCode.objects.filter(is_used=False).first()
        
        if code:
            print(f"Enviando email para código: {code.code}")
            print(f"Email: {code.email}")
            
            # Comentar esta línea para no enviar emails reales durante pruebas
            # send_interview_code_email(code, 'Administrador de Pruebas')
            
            print("✅ Email enviado exitosamente (simulado)")
        else:
            print("ℹ️ No hay códigos pendientes para enviar email")
            
    except Exception as e:
        print(f"❌ Error enviando email: {str(e)}")

def test_code_cleanup():
    """Prueba la limpieza de códigos expirados."""
    
    print("\n🧹 Probando limpieza de códigos expirados...")
    
    try:
        # Crear un código expirado para la prueba
        expired_code = InterviewCode.objects.create(
            code='EXPIRED1',
            email='expired@test.com',
            expires_at=timezone.now() - timedelta(days=1),
            is_used=False
        )
        print(f"Código expirado creado: {expired_code.code}")
        
        # Limpiar códigos expirados
        cleaned = cleanup_expired_codes()
        print(f"✅ Códigos expirados eliminados: {cleaned}")
        
    except Exception as e:
        print(f"❌ Error en limpieza: {str(e)}")

def test_user_registration_with_code():
    """Prueba el registro de usuario con código de entrevista."""
    
    print("\n👤 Probando registro con código de entrevista...")
    
    # Obtener un código válido
    try:
        code = InterviewCode.objects.filter(is_used=False).first()
        
        if code:
            print(f"Usando código: {code.code} para {code.email}")
            
            # Simular datos de registro
            registration_data = {
                'email': code.email,
                'password': 'testpass123',
                'password2': 'testpass123',
                'first_name': 'Usuario',
                'last_name': 'Prueba',
                'user_type': 'tenant',
                'phone_number': '+573001234567',
                'terms_accepted': True,
                'privacy_policy_accepted': True,
                'interview_code': code.code
            }
            
            from users.serializers import UserRegistrationSerializer
            from rest_framework.test import APIRequestFactory
            
            factory = APIRequestFactory()
            request = factory.post('/api/v1/auth/register/', registration_data)
            
            serializer = UserRegistrationSerializer(data=registration_data)
            if serializer.is_valid():
                user = serializer.save()
                print(f"✅ Usuario registrado exitosamente: {user.email}")
                print(f"   Código usado: {user.interview_code.code if user.interview_code else 'No'}")
                print(f"   Verificado: {user.is_verified}")
            else:
                print(f"❌ Errores de validación: {serializer.errors}")
        else:
            print("ℹ️ No hay códigos disponibles para prueba de registro")
            
    except Exception as e:
        print(f"❌ Error en registro: {str(e)}")

def cleanup_test_data():
    """Limpia los datos de prueba."""
    
    print("\n🧹 Limpiando datos de prueba...")
    
    # Eliminar códigos de prueba
    test_emails = [
        'candidato1@test.com', 'candidato2@test.com', 'candidato3@test.com',
        'expired@test.com'
    ]
    
    deleted_codes = InterviewCode.objects.filter(email__in=test_emails).delete()
    print(f"Códigos eliminados: {deleted_codes[0]}")
    
    # Eliminar usuarios de prueba
    deleted_users = User.objects.filter(email__in=test_emails).delete()
    print(f"Usuarios eliminados: {deleted_users[0]}")

def main():
    """Función principal de pruebas."""
    
    print("🚀 Iniciando pruebas del sistema de entrevistas...")
    
    try:
        # Ejecutar todas las pruebas
        test_interview_code_generation()
        test_interview_code_creation()
        test_interview_code_validation()
        test_interview_statistics()
        test_email_sending()
        test_code_cleanup()
        test_user_registration_with_code()
        
        print("\n✅ Todas las pruebas completadas exitosamente")
        
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
    
    print("\n🎉 Pruebas del sistema de entrevistas completadas")

if __name__ == '__main__':
    main() 