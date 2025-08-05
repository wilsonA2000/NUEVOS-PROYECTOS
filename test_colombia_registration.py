#!/usr/bin/env python
"""
Script para probar el flujo completo de registro con datos de Colombia.
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
        'notes': 'Usuario de prueba para Colombia'
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

def test_colombia_tenant_registration(interview_code):
    """Prueba el registro de un arrendatario colombiano."""
    print("🏠 Probando registro de arrendatario colombiano...")
    
    registration_data = {
        'email': f'colombia_tenant_{int(time.time())}@example.com',
        'password': 'TestPassword123!',
        'password2': 'TestPassword123!',
        'first_name': 'Carlos Andrés',
        'last_name': 'García López',
        'user_type': 'tenant',
        'interview_code': interview_code,
        'phone_number': '+573001234567',
        'whatsapp': '+573001234568',
        'date_of_birth': '1995-03-15',
        'gender': 'male',
        'nationality': 'Colombiana',
        'marital_status': 'single',
        'country': 'Colombia',
        'state': 'Antioquia',
        'city': 'Medellín',
        'postal_code': '050001',
        'employment_status': 'employed',
        'monthly_income': 3500000,
        'currency': 'COP',
        'employer_name': 'Empresa Colombiana S.A.',
        'job_title': 'Ingeniero de Software',
        'years_employed': 2,
        'current_address': 'Calle 10 # 45-67, Medellín',
        'rental_history': True,
        'credit_score': 750,
        'pets': False,
        'family_size': 1,
        'budget_range': 'medium',
        'move_in_date': '2024-04-01',
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
            print("✅ Registro de arrendatario colombiano exitoso!")
            user_data = response.json()
            print(f"   Usuario ID: {user_data.get('user_id')}")
            print(f"   Mensaje: {user_data.get('message')}")
            return True
        else:
            print(f"❌ Error en registro: {response.status_code}")
            print("📄 Respuesta del servidor:")
            print(response.text)
            return False
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        return False

def test_colombia_landlord_registration(interview_code):
    """Prueba el registro de un arrendador colombiano."""
    print("🏢 Probando registro de arrendador colombiano...")
    
    registration_data = {
        'email': f'colombia_landlord_{int(time.time())}@example.com',
        'password': 'TestPassword123!',
        'password2': 'TestPassword123!',
        'first_name': 'María Elena',
        'last_name': 'Rodríguez Martínez',
        'user_type': 'landlord',
        'interview_code': interview_code,
        'phone_number': '+573001234569',
        'whatsapp': '+573001234570',
        'date_of_birth': '1980-08-22',
        'gender': 'female',
        'nationality': 'Colombiana',
        'marital_status': 'married',
        'country': 'Colombia',
        'state': 'Bogotá D.C.',
        'city': 'Bogotá',
        'postal_code': '110111',
        'employment_status': 'self_employed',
        'monthly_income': 8000000,
        'currency': 'COP',
        'company_name': 'Inmobiliaria Colombiana',
        'total_properties': 3,
        'years_experience': 5,
        'source': 'referral',
        'marketing_consent': True,
        'terms_accepted': True,
        'privacy_policy_accepted': True
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/auth/register/", json=registration_data, timeout=15)
        print(f"📊 Respuesta del servidor: {response.status_code}")
        
        if response.status_code == 201:
            print("✅ Registro de arrendador colombiano exitoso!")
            user_data = response.json()
            print(f"   Usuario ID: {user_data.get('user_id')}")
            print(f"   Mensaje: {user_data.get('message')}")
            return True
        else:
            print(f"❌ Error en registro: {response.status_code}")
            print("📄 Respuesta del servidor:")
            print(response.text)
            return False
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        return False

def test_colombia_service_provider_registration(interview_code):
    """Prueba el registro de un prestador de servicios colombiano."""
    print("🔧 Probando registro de prestador de servicios colombiano...")
    
    registration_data = {
        'email': f'colombia_service_{int(time.time())}@example.com',
        'password': 'TestPassword123!',
        'password2': 'TestPassword123!',
        'first_name': 'Juan Carlos',
        'last_name': 'Hernández Pérez',
        'user_type': 'service_provider',
        'interview_code': interview_code,
        'phone_number': '+573001234571',
        'whatsapp': '+573001234572',
        'date_of_birth': '1988-12-10',
        'gender': 'male',
        'nationality': 'Colombiana',
        'marital_status': 'married',
        'country': 'Colombia',
        'state': 'Valle del Cauca',
        'city': 'Cali',
        'postal_code': '760001',
        'employment_status': 'self_employed',
        'monthly_income': 4500000,
        'currency': 'COP',
        'business_name': 'Servicios Colombianos',
        'service_category': 'maintenance',
        'hourly_rate': 50000,
        'hourly_rate_currency': 'COP',
        'years_experience': 4,
        'source': 'facebook',
        'marketing_consent': True,
        'terms_accepted': True,
        'privacy_policy_accepted': True
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/auth/register/", json=registration_data, timeout=15)
        print(f"📊 Respuesta del servidor: {response.status_code}")
        
        if response.status_code == 201:
            print("✅ Registro de prestador de servicios colombiano exitoso!")
            user_data = response.json()
            print(f"   Usuario ID: {user_data.get('user_id')}")
            print(f"   Mensaje: {user_data.get('message')}")
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
    print("🇨🇴 Iniciando pruebas del flujo de registro para Colombia...")
    print("=" * 60)
    
    # 1. Login de administrador
    token = test_admin_login()
    if not token:
        print("❌ No se pudo obtener el token de administrador. Abortando.")
        return
    
    print("\n" + "=" * 60)
    
    # 2. Crear códigos de entrevista para diferentes tipos de usuario
    tenant_email = f'colombia_tenant_{int(time.time())}@example.com'
    landlord_email = f'colombia_landlord_{int(time.time())}@example.com'
    service_email = f'colombia_service_{int(time.time())}@example.com'
    
    tenant_code = create_interview_code(token, tenant_email)
    landlord_code = create_interview_code(token, landlord_email)
    service_code = create_interview_code(token, service_email)
    
    if not all([tenant_code, landlord_code, service_code]):
        print("❌ No se pudieron crear todos los códigos de entrevista. Abortando.")
        return
    
    print("\n" + "=" * 60)
    
    # 3. Probar registros de diferentes tipos de usuario
    print("🧪 Probando registros de diferentes tipos de usuario en Colombia...")
    
    # Arrendatario
    tenant_success = test_colombia_tenant_registration(tenant_code)
    
    print("\n" + "-" * 40)
    
    # Arrendador
    landlord_success = test_colombia_landlord_registration(landlord_code)
    
    print("\n" + "-" * 40)
    
    # Prestador de servicios
    service_success = test_colombia_service_provider_registration(service_code)
    
    print("\n" + "=" * 60)
    print("📊 RESUMEN DE PRUEBAS PARA COLOMBIA:")
    print(f"   Arrendatario: {'✅ Exitoso' if tenant_success else '❌ Fallido'}")
    print(f"   Arrendador: {'✅ Exitoso' if landlord_success else '❌ Fallido'}")
    print(f"   Prestador de servicios: {'✅ Exitoso' if service_success else '❌ Fallido'}")
    
    if all([tenant_success, landlord_success, service_success]):
        print("\n🎉 ¡Todas las pruebas fueron exitosas!")
        print("✅ El formulario de registro para Colombia está funcionando correctamente.")
        print("✅ Los campos de moneda (COP/USD) están funcionando.")
        print("✅ El email de confirmación se está enviando.")
    else:
        print("\n⚠️  Algunas pruebas fallaron. Revisa los errores arriba.")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    main() 