#!/usr/bin/env python
"""
Script manual para probar y crear un código si es necesario
"""
import os
import sys
import django

# Configurar Django
sys.path.append('/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from users.models import InterviewCode
from django.utils import timezone
from datetime import timedelta

def main():
    print("=== CÓDIGOS DE ENTREVISTA DISPONIBLES ===")
    
    # Mostrar códigos existentes
    codes = InterviewCode.objects.all()
    for code in codes:
        print(f"Código: {code.interview_code}")
        print(f"Estado: {code.status}")
        print(f"Aprobado: {code.is_approved}")
        print(f"Expira: {code.expires_at}")
        
        # Verificar si es válido
        is_valid, message = code.is_valid()
        print(f"¿Es válido?: {is_valid}")
        print(f"Mensaje: {message}")
        print("-" * 30)
    
    # Si no hay códigos válidos, crear uno
    valid_codes = [c for c in codes if c.is_valid()[0]]
    if not valid_codes:
        print("No hay códigos válidos. Creando uno nuevo...")
        
        new_code = InterviewCode.objects.create(
            interview_code="VH-TEST-001",
            candidate_name="Usuario de Prueba",
            candidate_email="test@verihome.com",
            status="active",
            is_approved=True,
            expires_at=timezone.now() + timedelta(days=30),
            approved_user_type="tenant"
        )
        
        print(f"✅ Código creado: {new_code.interview_code}")
        print("Puedes usar este código en el frontend.")
    else:
        valid_code = valid_codes[0]
        print(f"✅ Usar este código válido: {valid_code.interview_code}")

if __name__ == "__main__":
    main()