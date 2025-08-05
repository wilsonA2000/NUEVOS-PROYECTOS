#!/usr/bin/env python3

import os
import django
import requests
import json

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from users.models import User, InterviewCode
from allauth.account.models import EmailAddress

def create_test_interview_code():
    """Crear un código de entrevista de prueba"""
    
    print('🎯 CREANDO CÓDIGO DE ENTREVISTA DE PRUEBA')
    print('=' * 50)
    
    # Limpiar códigos existentes para este email
    test_email = "candidato.test@verihome.com"
    existing_codes = InterviewCode.objects.filter(candidate_email=test_email)
    if existing_codes.exists():
        print(f'🧹 Eliminando {existing_codes.count()} códigos existentes para {test_email}')
        existing_codes.delete()
    
    # Obtener usuario admin
    admin_user = User.objects.filter(is_superuser=True).first()
    if not admin_user:
        admin_user = User.objects.create_superuser(
            email="admin@test.com",
            password="admin123"
        )
    
    # Crear nuevo código
    interview_code = InterviewCode.objects.create(
        candidate_email=test_email,
        candidate_name="Test Candidato",
        candidate_phone="+57 300 123 4567",
        approved_user_type="tenant",
        interview_notes="Código creado automáticamente para testing",
        status="active",
        is_approved=True,
        created_by=admin_user,
        approved_by=admin_user
    )
    
    print(f'✅ Código creado: {interview_code.interview_code}')
    print(f'📧 Email: {interview_code.candidate_email}')
    print(f'👤 Tipo: {interview_code.get_approved_user_type_display()}')
    print(f'📊 Estado: {interview_code.get_status_display()}')
    
    return interview_code

def test_registration_with_code(interview_code):
    """Probar el registro con código de entrevista"""
    
    print('\n🚀 PROBANDO REGISTRO CON CÓDIGO DE ENTREVISTA')
    print('=' * 55)
    
    BACKEND_URL = "http://localhost:8000/api/v1"
    
    # Datos de registro
    registration_data = {
        "email": interview_code.candidate_email,
        "password": "password123",
        "password2": "password123",
        "first_name": "Test",
        "last_name": "Candidato",
        "user_type": interview_code.approved_user_type,
        "interview_code": interview_code.interview_code
    }
    
    print(f'📝 Datos de registro:')
    print(f'   Email: {registration_data["email"]}')
    print(f'   Nombre: {registration_data["first_name"]} {registration_data["last_name"]}')
    print(f'   Tipo: {registration_data["user_type"]}')
    print(f'   Código: {registration_data["interview_code"]}')
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/users/auth/register/",
            json=registration_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f'\n📡 Status Code: {response.status_code}')
        result = response.json()
        print(f'📥 Response: {json.dumps(result, indent=2)}')
        
        if response.status_code == 201:
            print('\n✅ REGISTRO EXITOSO!')
            
            # Verificar que el usuario fue creado
            try:
                user = User.objects.get(email=registration_data["email"])
                print(f'👤 Usuario creado: ID {user.id}')
                print(f'📧 Email: {user.email}')
                print(f'✅ Verificado: {user.is_verified}')
                
                # Verificar EmailAddress
                try:
                    email_address = EmailAddress.objects.get(user=user)
                    print(f'📬 EmailAddress: {email_address.email}')
                    print(f'✅ Verificado: {email_address.verified}')
                except EmailAddress.DoesNotExist:
                    print('❌ EmailAddress no encontrado')
                
                # Verificar que el código fue marcado como usado
                interview_code.refresh_from_db()
                print(f'🎫 Código estado: {interview_code.get_status_display()}')
                
                return True
                
            except User.DoesNotExist:
                print('❌ Usuario no fue creado en la base de datos')
                return False
                
        else:
            print(f'\n❌ ERROR EN REGISTRO: {response.status_code}')
            return False
            
    except Exception as e:
        print(f'\n❌ Error en la petición: {e}')
        return False

def cleanup_test_data():
    """Limpiar datos de prueba"""
    
    print('\n🧹 LIMPIANDO DATOS DE PRUEBA')
    print('=' * 35)
    
    test_email = "candidato.test@verihome.com"
    
    # Eliminar usuario
    try:
        user = User.objects.get(email=test_email)
        user.delete()
        print(f'✅ Usuario {test_email} eliminado')
    except User.DoesNotExist:
        print(f'ℹ️ Usuario {test_email} no existe')
    
    # Eliminar códigos de entrevista
    codes = InterviewCode.objects.filter(candidate_email=test_email)
    if codes.exists():
        codes.delete()
        print(f'✅ Códigos de entrevista eliminados')
    else:
        print(f'ℹ️ No hay códigos para {test_email}')

def main():
    """Ejecutar prueba completa"""
    
    print('🔥 PRUEBA COMPLETA DE REGISTRO CON CÓDIGO DE ENTREVISTA')
    print('=' * 65)
    
    try:
        # Limpiar datos anteriores
        cleanup_test_data()
        
        # Crear código de entrevista
        interview_code = create_test_interview_code()
        
        # Probar registro
        success = test_registration_with_code(interview_code)
        
        if success:
            print('\n🎉 RESULTADO FINAL: ✅ ÉXITO')
            print('🔥 El sistema de registro con código de entrevista funciona perfectamente!')
            print('📧 Revisa tu email para confirmar que llegó el email de verificación')
        else:
            print('\n💥 RESULTADO FINAL: ❌ FALLÓ')
            print('❗ Hay problemas con el sistema de registro')
        
        # No limpiar datos si fue exitoso para poder revisar
        if not success:
            cleanup_test_data()
            
    except Exception as e:
        print(f'\n💥 ERROR GENERAL: {e}')
        cleanup_test_data()

if __name__ == '__main__':
    main()