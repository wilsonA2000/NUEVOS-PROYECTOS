#!/usr/bin/env python
"""
Script para probar la funcionalidad de la hoja de vida.
"""

import os
import sys
import django
from datetime import date

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import UserResume

User = get_user_model()

def test_resume_functionality():
    """Prueba la funcionalidad de la hoja de vida."""
    print("🧪 === PRUEBA DE FUNCIONALIDAD DE HOJA DE VIDA ===")
    
    # Buscar un usuario existente
    try:
        user = User.objects.first()
        if not user:
            print("❌ No se encontraron usuarios en la base de datos")
            return
        
        print(f"✅ Usuario encontrado: {user.get_full_name()} ({user.email})")
        
        # Crear o obtener la hoja de vida
        resume, created = UserResume.objects.get_or_create(user=user)
        if created:
            print("✅ Hoja de vida creada exitosamente")
        else:
            print("✅ Hoja de vida existente encontrada")
        
        # Llenar información de ejemplo
        resume.date_of_birth = date(1990, 5, 15)
        resume.nationality = 'Mexicana'
        resume.marital_status = 'Soltero'
        resume.dependents = 0
        resume.education_level = 'bachelor'
        resume.institution_name = 'Universidad Nacional Autónoma de México'
        resume.field_of_study = 'Ingeniería en Sistemas'
        resume.graduation_year = 2015
        resume.gpa = 8.5
        resume.current_employer = 'Tech Solutions S.A.'
        resume.current_position = 'Desarrollador Senior'
        resume.employment_type = 'full_time'
        resume.start_date = date(2020, 3, 1)
        resume.monthly_salary = 45000
        resume.supervisor_name = 'María González'
        resume.supervisor_phone = '+52 55 1234 5678'
        resume.supervisor_email = 'maria.gonzalez@techsolutions.com'
        resume.bank_name = 'Banco Azteca'
        resume.account_type = 'Cuenta de cheques'
        resume.account_number = '****1234'
        resume.credit_score = 750
        resume.monthly_expenses = 25000
        resume.emergency_contact_name = 'Juan Pérez'
        resume.emergency_contact_phone = '+52 55 9876 5432'
        resume.emergency_contact_relation = 'Hermano'
        resume.emergency_contact_address = 'Av. Reforma 123, CDMX'
        resume.reference1_name = 'Ana López'
        resume.reference1_phone = '+52 55 1111 2222'
        resume.reference1_email = 'ana.lopez@email.com'
        resume.reference1_relation = 'Ex compañera de trabajo'
        resume.reference2_name = 'Carlos Ruiz'
        resume.reference2_phone = '+52 55 3333 4444'
        resume.reference2_email = 'carlos.ruiz@email.com'
        resume.reference2_relation = 'Amigo'
        resume.eviction_history = False
        resume.criminal_record = False
        
        # Guardar cambios
        resume.save()
        print("✅ Información de ejemplo guardada")
        
        # Calcular estadísticas
        completion_percentage = resume.get_completion_percentage()
        verification_score = resume.calculate_verification_score()
        
        print(f"📊 Porcentaje de completitud: {completion_percentage}%")
        print(f"📊 Puntuación de verificación: {verification_score}%")
        
        # Verificar si está completa
        if completion_percentage >= 80:
            resume.is_complete = True
            resume.save()
            print("✅ Hoja de vida marcada como completa")
        
        # Mostrar información resumida
        print("\n📋 === RESUMEN DE LA HOJA DE VIDA ===")
        print(f"Usuario: {resume.user.get_full_name()}")
        print(f"Email: {resume.user.email}")
        print(f"Tipo de usuario: {resume.user.get_user_type_display()}")
        print(f"Fecha de nacimiento: {resume.date_of_birth}")
        print(f"Nacionalidad: {resume.nationality}")
        print(f"Nivel educativo: {resume.get_education_level_display()}")
        print(f"Empleador actual: {resume.current_employer}")
        print(f"Cargo: {resume.current_position}")
        print(f"Salario mensual: ${resume.monthly_salary:,.2f}")
        print(f"Contacto de emergencia: {resume.emergency_contact_name} ({resume.emergency_contact_relation})")
        print(f"Referencia 1: {resume.reference1_name} ({resume.reference1_relation})")
        print(f"Referencia 2: {resume.reference2_name} ({resume.reference2_relation})")
        print(f"Historial de desalojo: {'Sí' if resume.eviction_history else 'No'}")
        print(f"Antecedentes penales: {'Sí' if resume.criminal_record else 'No'}")
        print(f"Completada: {'Sí' if resume.is_complete else 'No'}")
        
        print("\n✅ Prueba completada exitosamente")
        
    except Exception as e:
        print(f"❌ Error durante la prueba: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_resume_functionality() 