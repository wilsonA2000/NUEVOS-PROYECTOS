#!/usr/bin/env python3
"""
Script para crear códigos de entrevista de prueba en VeriHome.
"""

import os
import sys
import django
from datetime import datetime, timedelta
from django.utils import timezone

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import InterviewCode

User = get_user_model()

def create_test_interview_codes():
    """Crear códigos de entrevista de prueba."""
    
    # Obtener o crear usuario admin
    try:
        admin_user = User.objects.filter(is_superuser=True).first()
        if not admin_user:
            print("❌ No se encontró usuario administrador. Creando uno...")
            admin_user = User.objects.create_superuser(
                email='admin@verihome.com',
                password='admin123',
                first_name='Admin',
                last_name='VeriHome',
                user_type='landlord'
            )
            print(f"✅ Usuario administrador creado: {admin_user.email}")
        else:
            print(f"✅ Usuario administrador encontrado: {admin_user.email}")
    except Exception as e:
        print(f"❌ Error creando/encontrando admin: {e}")
        return
    
    # Crear códigos de entrevista de prueba
    test_codes = [
        {
            'candidate_name': 'Juan Carlos Pérez',
            'candidate_email': 'juan.perez@email.com',
            'candidate_phone': '+57 300 123 4567',
            'approved_user_type': 'tenant',
            'interview_rating': 8,
            'interview_notes': 'Candidato excelente, muy responsable.',
        },
        {
            'candidate_name': 'María González',
            'candidate_email': 'maria.gonzalez@email.com', 
            'candidate_phone': '+57 301 234 5678',
            'approved_user_type': 'landlord',
            'interview_rating': 9,
            'interview_notes': 'Propietaria con experiencia, muy confiable.',
        },
        {
            'candidate_name': 'Carlos Rodríguez',
            'candidate_email': 'carlos.rodriguez@email.com',
            'candidate_phone': '+57 302 345 6789',
            'approved_user_type': 'service_provider',
            'interview_rating': 7,
            'interview_notes': 'Proveedor de servicios de plomería.',
        }
    ]
    
    created_codes = []
    
    for code_data in test_codes:
        try:
            # Verificar si ya existe un código para este email
            existing_code = InterviewCode.objects.filter(
                candidate_email=code_data['candidate_email']
            ).first()
            
            if existing_code:
                print(f"⚠️  Ya existe código para {code_data['candidate_email']}: {existing_code.interview_code}")
                created_codes.append(existing_code)
                continue
            
            # Crear nuevo código
            interview_code = InterviewCode.objects.create(
                candidate_name=code_data['candidate_name'],
                candidate_email=code_data['candidate_email'],
                candidate_phone=code_data['candidate_phone'],
                created_by=admin_user,
                expires_at=timezone.now() + timedelta(days=30),
                is_approved=True,  # Pre-aprobado para testing
                approved_user_type=code_data['approved_user_type'],
                interview_rating=code_data['interview_rating'],
                interview_notes=code_data['interview_notes'],
                approved_by=admin_user,
                status='active'
            )
            
            created_codes.append(interview_code)
            print(f"✅ Código creado: {interview_code.interview_code} para {code_data['candidate_name']} ({code_data['candidate_email']})")
            
        except Exception as e:
            print(f"❌ Error creando código para {code_data['candidate_name']}: {e}")
    
    # Mostrar resumen
    print(f"\n🎉 RESUMEN DE CÓDIGOS DE ENTREVISTA:")
    print("=" * 60)
    
    for code in created_codes:
        print(f"👤 {code.candidate_name}")
        print(f"   📧 Email: {code.candidate_email}")
        print(f"   🔑 Código: {code.interview_code}")
        print(f"   👥 Tipo: {code.get_approved_user_type_display()}")
        print(f"   ⭐ Rating: {code.interview_rating}/10")
        print(f"   📅 Expira: {code.expires_at.strftime('%Y-%m-%d %H:%M')}")
        print(f"   ✅ Estado: {code.get_status_display()}")
        print(f"   🌐 URL de prueba: http://localhost:5173/register")
        print("-" * 60)
    
    return created_codes

def test_interview_code_validation(code):
    """Probar validación de código de entrevista."""
    print(f"\n🧪 PROBANDO VALIDACIÓN DE CÓDIGO: {code}")
    
    try:
        interview_code = InterviewCode.objects.get(interview_code=code)
        is_valid, message = interview_code.is_valid()
        
        print(f"   ✅ Código encontrado: {interview_code.candidate_name}")
        print(f"   📧 Email: {interview_code.candidate_email}")
        print(f"   🔍 Validación: {'✅ VÁLIDO' if is_valid else '❌ INVÁLIDO'}")
        print(f"   💬 Mensaje: {message}")
        
        if is_valid:
            print(f"   👥 Tipo aprobado: {interview_code.get_approved_user_type_display()}")
            print(f"   ⭐ Rating: {interview_code.interview_rating}/10")
        
        return is_valid
        
    except InterviewCode.DoesNotExist:
        print(f"   ❌ Código no encontrado")
        return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

if __name__ == '__main__':
    print("🚀 INICIANDO CREACIÓN DE CÓDIGOS DE ENTREVISTA DE PRUEBA")
    print("=" * 60)
    
    # Crear códigos
    codes = create_test_interview_codes()
    
    if codes:
        print(f"\n🧪 PROBANDO VALIDACIÓN DE CÓDIGOS...")
        for code in codes:
            test_interview_code_validation(code.interview_code)
    
    print(f"\n✅ PROCESO COMPLETADO")
    print(f"🌐 Puedes probar el registro en: http://localhost:5173/register")
    print(f"⚙️  Panel de admin: http://localhost:8000/admin/")