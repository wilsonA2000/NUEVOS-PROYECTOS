#!/usr/bin/env python3
"""
Script para crear códigos de entrevista automáticamente
"""

import os
import django
from pathlib import Path

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from users.models import InterviewCode

def create_interview_code(email, initial_rating=5, notes=""):
    """Crear un código de entrevista para un email específico."""
    try:
        # Verificar si ya existe un código para este email
        existing_code = InterviewCode.objects.filter(email=email).first()
        if existing_code:
            print(f"⚠️ Ya existe un código para {email}: {existing_code.code}")
            return existing_code
        
        # Crear nuevo código
        interview_code = InterviewCode.objects.create(
            email=email,
            initial_rating=initial_rating,
            notes=notes
        )
        
        print(f"✅ Código creado para {email}: {interview_code.code}")
        return interview_code
        
    except Exception as e:
        print(f"❌ Error creando código para {email}: {e}")
        return None

def list_interview_codes():
    """Listar todos los códigos de entrevista existentes."""
    print("\n📋 Códigos de entrevista existentes:")
    print("-" * 60)
    
    codes = InterviewCode.objects.all().order_by('-created_at')
    
    if not codes:
        print("No hay códigos de entrevista creados.")
        return
    
    for code in codes:
        status = "✅ Usado" if code.is_used else "⏳ Disponible"
        print(f"📧 {code.email}")
        print(f"🔑 Código: {code.code}")
        print(f"⭐ Calificación inicial: {code.initial_rating}")
        print(f"📝 Notas: {code.notes}")
        print(f"📅 Creado: {code.created_at.strftime('%Y-%m-%d %H:%M')}")
        print(f"🔄 Estado: {status}")
        print("-" * 60)

def main():
    """Función principal."""
    print("🔑 Gestor de Códigos de Entrevista - VeriHome")
    print("=" * 50)
    
    while True:
        print("\n📋 Opciones:")
        print("1. Crear código de entrevista")
        print("2. Listar códigos existentes")
        print("3. Crear múltiples códigos de prueba")
        print("4. Salir")
        
        choice = input("\nSelecciona una opción (1-4): ").strip()
        
        if choice == "1":
            email = input("📧 Ingresa el email: ").strip()
            if not email:
                print("❌ Email requerido")
                continue
                
            rating_input = input("⭐ Calificación inicial (1-10, default 5): ").strip()
            rating = int(rating_input) if rating_input.isdigit() and 1 <= int(rating_input) <= 10 else 5
            
            notes = input("📝 Notas (opcional): ").strip()
            
            create_interview_code(email, rating, notes)
            
        elif choice == "2":
            list_interview_codes()
            
        elif choice == "3":
            print("\n🧪 Creando códigos de prueba...")
            
            test_emails = [
                "test_landlord@example.com",
                "test_tenant@example.com", 
                "test_service@example.com",
                "demo_user@example.com",
                "admin_test@example.com"
            ]
            
            for email in test_emails:
                create_interview_code(email, 5, "Código de prueba")
            
            print("✅ Códigos de prueba creados")
            
        elif choice == "4":
            print("👋 ¡Hasta luego!")
            break
            
        else:
            print("❌ Opción inválida")

if __name__ == '__main__':
    main() 