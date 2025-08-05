#!/usr/bin/env python
"""
Script para probar el flujo completo de registro con todos los campos expandidos.
"""

import requests
import json
import time
from datetime import datetime

# Configuración
API_BASE_URL = 'http://localhost:8000/api/v1'
ADMIN_EMAIL = 'letefon100@gmail.com'
ADMIN_PASSWORD = 'admin123456'

def test_admin_login():
    """Prueba el login del administrador para crear códigos de entrevista."""
    print("🔐 Probando login de administrador...")
    
    login_data = {
        'email': ADMIN_EMAIL,
        'password': ADMIN_PASSWORD
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/auth/login/", json=login_data, timeout=10)
        if response.status_code == 200:
            print("✅ Login de administrador exitoso")
            return response.json().get('access')
        else:
            print(f"❌ Error en login de administrador: {response.status_code}")
            print(response.text)
            return None
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        return None

def create_interview_code(token, email):
    """Crea un código de entrevista para el usuario."""
    print(f"📝 Creando código de entrevista para {email}...")
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    code_data = {
        'email': email,
        'initial_rating': 8,
        'notes': 'Usuario de prueba para formulario expandido'
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/interview-codes/", json=code_data, headers=headers, timeout=10)
        if response.status_code == 201:
            code = response.json().get('code')
            print(f"✅ Código de entrevista creado: {code}")
            return code
        else:
            print(f"❌ Error creando código: {response.status_code}")
            print(response.text)
            return None
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        return None

def test_complete_registration(interview_code):
    """Prueba el registro completo con todos los campos."""
    print("📋 Probando registro completo...")
    
    # Datos completos de registro
    registration_data = {
        'email': f'test_user_{int(time.time())}@example.com',
        'password': 'TestPassword123!',
        'password2': 'TestPassword123!',
        'first_name': 'Juan Carlos',
        'last_name': 'García López',
        'user_type': 'tenant',
        'interview_code': interview_code,
        'phone_number': '+525512345678',
        'whatsapp': '+525512345679',
        'date_of_birth': '1990-05-15',
        'gender': 'male',
        'nationality': 'Mexicana',
        'marital_status': 'single',
        'country': 'México',
        'state': 'Ciudad de México',
        'city': 'Ciudad de México',
        'postal_code': '01000',
        'employment_status': 'employed',
        'monthly_income': 25000.00,
        'employer_name': 'Empresa de Prueba S.A.',
        'job_title': 'Desarrollador de Software',
        'years_employed': 3,
        'current_address': 'Av. Reforma 123, Col. Centro',
        'rental_history': True,
        'credit_score': 750,
        'pets': False,
        'family_size': 2,
        'budget_range': 'medium',
        'move_in_date': '2024-03-01',
        'lease_duration': 'long_term',
        'source': 'google',
        'marketing_consent': True,
        'terms_accepted': True,
        'privacy_policy_accepted': True
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/auth/register/", json=registration_data, timeout=15)
        print(f"📊 Respuesta del servidor: {response.status_code}")
        
        if response.status_code == 201:
            print("✅ Registro exitoso!")
            user_data = response.json()
            print(f"   Usuario ID: {user_data.get('id')}")
            print(f"   Email: {user_data.get('email')}")
            print(f"   Tipo: {user_data.get('user_type')}")
            return True
        else:
            print(f"❌ Error en registro: {response.status_code}")
            print("📄 Respuesta del servidor:")
            print(response.text)
            return False
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        return False

def test_landlord_registration(interview_code):
    """Prueba el registro de un arrendador."""
    print("🏠 Probando registro de arrendador...")
    
    registration_data = {
        'email': f'landlord_{int(time.time())}@example.com',
        'password': 'TestPassword123!',
        'password2': 'TestPassword123!',
        'first_name': 'María Elena',
        'last_name': 'Rodríguez Martínez',
        'user_type': 'landlord',
        'interview_code': interview_code,
        'phone_number': '+525512345680',
        'whatsapp': '+525512345681',
        'date_of_birth': '1975-08-22',
        'gender': 'female',
        'nationality': 'Mexicana',
        'marital_status': 'married',
        'country': 'México',
        'state': 'Jalisco',
        'city': 'Guadalajara',
        'postal_code': '44100',
        'employment_status': 'self_employed',
        'monthly_income': 80000.00,
        'company_name': 'Inmobiliaria Rodríguez',
        'total_properties': 5,
        'years_experience': 8,
        'source': 'referral',
        'marketing_consent': True,
        'terms_accepted': True,
        'privacy_policy_accepted': True
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/auth/register/", json=registration_data, timeout=15)
        print(f"📊 Respuesta del servidor: {response.status_code}")
        
        if response.status_code == 201:
            print("✅ Registro de arrendador exitoso!")
            user_data = response.json()
            print(f"   Usuario ID: {user_data.get('id')}")
            print(f"   Email: {user_data.get('email')}")
            print(f"   Tipo: {user_data.get('user_type')}")
            return True
        else:
            print(f"❌ Error en registro: {response.status_code}")
            print("📄 Respuesta del servidor:")
            print(response.text)
            return False
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        return False

def test_service_provider_registration(interview_code):
    """Prueba el registro de un prestador de servicios."""
    print("🔧 Probando registro de prestador de servicios...")
    
    registration_data = {
        'email': f'service_{int(time.time())}@example.com',
        'password': 'TestPassword123!',
        'password2': 'TestPassword123!',
        'first_name': 'Carlos Alberto',
        'last_name': 'Hernández Pérez',
        'user_type': 'service_provider',
        'interview_code': interview_code,
        'phone_number': '+525512345682',
        'whatsapp': '+525512345683',
        'date_of_birth': '1985-12-10',
        'gender': 'male',
        'nationality': 'Mexicana',
        'marital_status': 'married',
        'country': 'México',
        'state': 'Nuevo León',
        'city': 'Monterrey',
        'postal_code': '64000',
        'employment_status': 'self_employed',
        'monthly_income': 45000.00,
        'business_name': 'Servicios Hernández',
        'service_category': 'maintenance',
        'hourly_rate': 350.00,
        'years_experience': 6,
        'source': 'facebook',
        'marketing_consent': True,
        'terms_accepted': True,
        'privacy_policy_accepted': True
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/auth/register/", json=registration_data, timeout=15)
        print(f"📊 Respuesta del servidor: {response.status_code}")
        
        if response.status_code == 201:
            print("✅ Registro de prestador de servicios exitoso!")
            user_data = response.json()
            print(f"   Usuario ID: {user_data.get('id')}")
            print(f"   Email: {user_data.get('email')}")
            print(f"   Tipo: {user_data.get('user_type')}")
            return True
        else:
            print(f"❌ Error en registro: {response.status_code}")
            print("📄 Respuesta del servidor:")
            print(response.text)
            return False
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        return False

def main():
    """Función principal para ejecutar todas las pruebas."""
    print("🚀 Iniciando pruebas del flujo completo de registro...")
    print("=" * 60)
    
    # 1. Login de administrador
    token = test_admin_login()
    if not token:
        print("❌ No se pudo obtener el token de administrador. Abortando.")
        return
    
    print("\n" + "=" * 60)
    
    # 2. Crear códigos de entrevista para diferentes tipos de usuario
    tenant_email = f'tenant_{int(time.time())}@example.com'
    landlord_email = f'landlord_{int(time.time())}@example.com'
    service_email = f'service_{int(time.time())}@example.com'
    
    tenant_code = create_interview_code(token, tenant_email)
    landlord_code = create_interview_code(token, landlord_email)
    service_code = create_interview_code(token, service_email)
    
    if not all([tenant_code, landlord_code, service_code]):
        print("❌ No se pudieron crear todos los códigos de entrevista. Abortando.")
        return
    
    print("\n" + "=" * 60)
    
    # 3. Probar registros de diferentes tipos de usuario
    print("🧪 Probando registros de diferentes tipos de usuario...")
    
    # Arrendatario
    tenant_success = test_complete_registration(tenant_code)
    
    print("\n" + "-" * 40)
    
    # Arrendador
    landlord_success = test_landlord_registration(landlord_code)
    
    print("\n" + "-" * 40)
    
    # Prestador de servicios
    service_success = test_service_provider_registration(service_code)
    
    print("\n" + "=" * 60)
    print("📊 RESUMEN DE PRUEBAS:")
    print(f"   Arrendatario: {'✅ Exitoso' if tenant_success else '❌ Fallido'}")
    print(f"   Arrendador: {'✅ Exitoso' if landlord_success else '❌ Fallido'}")
    print(f"   Prestador de servicios: {'✅ Exitoso' if service_success else '❌ Fallido'}")
    
    if all([tenant_success, landlord_success, service_success]):
        print("\n🎉 ¡Todas las pruebas fueron exitosas!")
        print("✅ El formulario de registro expandido está funcionando correctamente.")
    else:
        print("\n⚠️  Algunas pruebas fallaron. Revisa los errores arriba.")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    main() 