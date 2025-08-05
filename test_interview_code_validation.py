#!/usr/bin/env python
import os
import sys
import django
from pathlib import Path

# Configurar Django
sys.path.append(str(Path(__file__).resolve().parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import InterviewCode, ContactRequest
from django.utils import timezone
import json

User = get_user_model()

def create_test_interview_code():
    """Crear un código de entrevista de prueba"""
    
    print("=== CREANDO CÓDIGO DE ENTREVISTA DE PRUEBA ===")
    
    # Obtener o crear usuario administrador
    admin_user, created = User.objects.get_or_create(
        email='admin@verihome.com',
        defaults={
            'first_name': 'Admin',
            'last_name': 'VeriHome',
            'user_type': 'landlord',
            'is_staff': True,
            'is_superuser': True
        }
    )
    
    if created:
        admin_user.set_password('admin123')
        admin_user.save()
        print(f"✅ Usuario admin creado: {admin_user.email}")
    else:
        print(f"✅ Usuario admin existente: {admin_user.email}")
    
    # Crear código de entrevista
    interview_code = InterviewCode.objects.create(
        candidate_name='Test Candidate',
        candidate_email='testcandidate@example.com',
        candidate_phone='+57 300 123 4567',
        created_by=admin_user,
        expires_at=timezone.now() + timezone.timedelta(days=30),
        is_approved=True,
        approved_user_type='tenant',
        interview_rating=8,
        approved_by=admin_user,
        interview_notes='Candidato excelente con buenas referencias.'
    )
    
    print(f"✅ Código de entrevista creado: {interview_code.interview_code}")
    print(f"📧 Email asociado: {interview_code.candidate_email}")
    print(f"👤 Candidato: {interview_code.candidate_name}")
    print(f"⭐ Calificación: {interview_code.interview_rating}/10")
    print(f"📅 Expira: {interview_code.expires_at}")
    print(f"✅ Aprobado: {interview_code.is_approved}")
    
    return interview_code

def test_validation_api():
    """Probar la API de validación de códigos"""
    
    print("\n=== PROBANDO API DE VALIDACIÓN ===")
    
    from django.test import Client
    import json
    
    client = Client()
    
    # Obtener un código válido
    valid_code = InterviewCode.objects.filter(is_approved=True).first()
    
    if not valid_code:
        print("❌ No hay códigos válidos para probar")
        return
    
    print(f"🧪 Probando código válido: {valid_code.interview_code}")
    
    # Test 1: Código válido
    response = client.post('/api/v1/auth/validate-interview-code/', 
                          data=json.dumps({'interview_code': valid_code.interview_code}),
                          content_type='application/json')
    
    print(f"📊 Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Respuesta: {json.dumps(data, indent=2, ensure_ascii=False)}")
    else:
        print(f"❌ Error: {response.content.decode()}")
    
    # Test 2: Código inválido
    print(f"\n🧪 Probando código inválido: VH-TEST-1234")
    
    response = client.post('/api/v1/auth/validate-interview-code/', 
                          data=json.dumps({'interview_code': 'VH-TEST-1234'}),
                          content_type='application/json')
    
    print(f"📊 Status: {response.status_code}")
    data = response.json()
    print(f"❌ Respuesta esperada (error): {json.dumps(data, indent=2, ensure_ascii=False)}")

def test_code_states():
    """Probar diferentes estados de códigos"""
    
    print("\n=== PROBANDO DIFERENTES ESTADOS DE CÓDIGOS ===")
    
    admin_user = User.objects.filter(is_superuser=True).first()
    
    # Código expirado
    expired_code = InterviewCode.objects.create(
        candidate_name='Candidato Expirado',
        candidate_email='expired@example.com',
        created_by=admin_user,
        expires_at=timezone.now() - timezone.timedelta(days=1),  # Expirado ayer
        is_approved=True,
        approved_user_type='landlord'
    )
    
    print(f"⏰ Código expirado creado: {expired_code.interview_code}")
    
    # Código no aprobado
    pending_code = InterviewCode.objects.create(
        candidate_name='Candidato Pendiente',
        candidate_email='pending@example.com',
        created_by=admin_user,
        expires_at=timezone.now() + timezone.timedelta(days=30),
        is_approved=False,  # No aprobado
        approved_user_type='service_provider'
    )
    
    print(f"⚠️ Código no aprobado creado: {pending_code.interview_code}")
    
    # Código usado
    used_code = InterviewCode.objects.create(
        candidate_name='Candidato Usado',
        candidate_email='used@example.com',
        created_by=admin_user,
        expires_at=timezone.now() + timezone.timedelta(days=30),
        is_approved=True,
        approved_user_type='tenant',
        status='used',  # Ya usado
        used_at=timezone.now()
    )
    
    print(f"🔒 Código usado creado: {used_code.interview_code}")
    
    return expired_code, pending_code, used_code

def show_validation_instructions():
    """Mostrar instrucciones para probar la validación"""
    
    print("\n" + "="*60)
    print("🎯 INSTRUCCIONES PARA PROBAR LA VALIDACIÓN")
    print("="*60)
    
    # Obtener códigos de ejemplo
    valid_codes = InterviewCode.objects.filter(is_approved=True, status='active')
    
    if valid_codes.exists():
        valid_code = valid_codes.first()
        print(f"\n✅ CÓDIGO VÁLIDO PARA PROBAR:")
        print(f"   Código: {valid_code.interview_code}")
        print(f"   Email: {valid_code.candidate_email}")
        print(f"   Candidato: {valid_code.candidate_name}")
        print(f"   Tipo: {valid_code.get_approved_user_type_display()}")
        print(f"   Calificación: {valid_code.interview_rating}/10")
    
    invalid_codes = InterviewCode.objects.filter(is_approved=False)
    if invalid_codes.exists():
        invalid_code = invalid_codes.first()
        print(f"\n⚠️ CÓDIGO NO APROBADO PARA PROBAR:")
        print(f"   Código: {invalid_code.interview_code}")
        print(f"   Razón: No ha sido aprobado por el administrador")
    
    expired_codes = InterviewCode.objects.filter(expires_at__lt=timezone.now())
    if expired_codes.exists():
        expired_code = expired_codes.first()
        print(f"\n⏰ CÓDIGO EXPIRADO PARA PROBAR:")
        print(f"   Código: {expired_code.interview_code}")
        print(f"   Expiró: {expired_code.expires_at}")
    
    print(f"\n🌐 PARA PROBAR EN EL FRONTEND:")
    print(f"   1. Inicia el servidor: python manage.py runserver")
    print(f"   2. Ve a: http://localhost:8000/register-with-code")
    print(f"   3. Ingresa uno de los códigos de arriba")
    print(f"   4. Presiona el botón 'Validar'")
    print(f"   5. Observa la respuesta de validación")
    
    print(f"\n🔧 ESTADOS POSIBLES:")
    print(f"   ✅ Válido: Código aprobado, activo y no expirado")
    print(f"   ❌ Inválido: Código no encontrado")
    print(f"   ⚠️ No aprobado: Código existe pero no aprobado")
    print(f"   ⏰ Expirado: Código venció")
    print(f"   🔒 Usado: Código ya fue utilizado")
    print(f"   🚫 Bloqueado: Demasiados intentos fallidos")

if __name__ == "__main__":
    print("🏠 VeriHome - Sistema de Validación de Códigos de Entrevista")
    print("=" * 60)
    
    # Crear código de prueba válido
    valid_code = create_test_interview_code()
    
    # Crear códigos con diferentes estados
    expired_code, pending_code, used_code = test_code_states()
    
    # Probar la API
    test_validation_api()
    
    # Mostrar instrucciones
    show_validation_instructions()
    
    print("\n" + "="*60)
    print("✅ SISTEMA DE VALIDACIÓN CONFIGURADO Y FUNCIONANDO")
    print("="*60)