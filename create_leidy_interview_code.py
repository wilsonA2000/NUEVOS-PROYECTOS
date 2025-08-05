#!/usr/bin/env python3

import os
import django
import random
import string
from datetime import datetime, timedelta

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from users.models import InterviewCode, User

def generate_code():
    """Generar código único con formato VH-XXXX-YYYY"""
    while True:
        part1 = ''.join(random.choices(string.ascii_uppercase, k=4))
        part2 = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
        code = f"VH-{part1}-{part2}"
        
        # Verificar que no exista
        if not InterviewCode.objects.filter(interview_code=code).exists():
            return code

def create_leidy_code():
    """Crear código de entrevista para Leidy Fonseca"""
    
    # Datos del candidato arrendador
    candidate_data = {
        'candidate_name': 'Leidy Fonseca',
        'candidate_email': 'letefon100@gmail.com',
        'approved_user_type': 'landlord',
        'interview_rating': random.randint(7, 10),  # Rating aleatorio entre 7-10
        'is_approved': True,
        'status': 'active',
        'expires_at': datetime.now() + timedelta(days=30),
        'max_attempts': 3,
        'current_attempts': 0,
        'created_by': User.objects.filter(is_superuser=True).first()
    }
    
    # Generar código único
    code = generate_code()
    candidate_data['interview_code'] = code
    
    # Crear el código
    interview_code = InterviewCode.objects.create(**candidate_data)
    
    return interview_code

if __name__ == '__main__':
    print('🔑 CREANDO CÓDIGO DE ENTREVISTA PARA LEIDY FONSECA')
    print('=' * 55)
    
    try:
        code_obj = create_leidy_code()
        
        print(f"✅ Código creado exitosamente:")
        print(f"👤 Nombre: {code_obj.candidate_name}")
        print(f"📧 Email: {code_obj.candidate_email}")
        print(f"🔑 Código: {code_obj.interview_code}")
        print(f"👥 Tipo: {code_obj.get_approved_user_type_display()}")
        print(f"⭐ Rating: {code_obj.interview_rating}/10")
        print(f"📅 Expira: {code_obj.expires_at.strftime('%d/%m/%Y')}")
        print(f"✅ Estado: {code_obj.status}")
        
        print(f"\n🧪 CÓDIGO LISTO PARA USAR:")
        print(f"Código: {code_obj.interview_code}")
        print(f"Email: {code_obj.candidate_email}")
        
    except Exception as e:
        print(f"❌ Error creando código: {e}")