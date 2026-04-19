#!/usr/bin/env python3
"""
Test Profile Selective Update
=============================

Script para probar que el sistema de actualización selectiva de perfil funciona correctamente,
enviando solo los campos modificados y manejando correctamente campos opcionales.

Author: Claude Code
Date: 07/07/2025
Version: 1.0
"""

import os
import sys
import django

# Configurar Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.serializers import UserProfileSerializer

User = get_user_model()

def test_selective_update():
    """Test de actualización selectiva - solo campos modificados."""
    print("🧪 TESTING SELECTIVE PROFILE UPDATE")
    print("=" * 50)
    
    try:
        # 1. Obtener usuario de prueba
        test_user = User.objects.filter(email='admin@verihome.com').first()
        if not test_user:
            print("❌ Usuario admin no encontrado")
            return False
        
        print(f"✅ Usuario encontrado: {test_user.email}")
        print(f"   - Nombre actual: {test_user.first_name} {test_user.last_name}")
        print(f"   - Ciudad actual: {test_user.city}")
        print(f"   - Teléfono actual: {test_user.phone_number}")
        print(f"   - Dirección actual: '{test_user.current_address}'")
        print(f"   - Empleador actual: '{test_user.employer_name}'")
        
        # 2. Test 1: Actualizar solo campos básicos (no strings opcionales)
        print("\n📝 Test 1: Actualizar solo campos básicos")
        update_data_1 = {
            'first_name': 'Wilson Modificado',
            'city': 'Bogotá',
            'family_size': 5
        }
        
        serializer = UserProfileSerializer(
            instance=test_user, 
            data=update_data_1, 
            partial=True
        )
        
        if not serializer.is_valid():
            print(f"❌ Test 1 - Errores de validación: {serializer.errors}")
            return False
        
        updated_user = serializer.save()
        print("✅ Test 1 exitoso")
        print(f"   - Nombre actualizado: {updated_user.first_name}")
        print(f"   - Ciudad actualizada: {updated_user.city}")
        print(f"   - Familia actualizada: {updated_user.family_size}")
        
        # 3. Test 2: Actualizar solo strings opcionales con strings vacíos
        print("\n📝 Test 2: Actualizar strings opcionales con valores vacíos")
        update_data_2 = {
            'current_address': '',
            'employer_name': '',
            'job_title': ''
        }
        
        serializer = UserProfileSerializer(
            instance=updated_user, 
            data=update_data_2, 
            partial=True
        )
        
        if not serializer.is_valid():
            print(f"❌ Test 2 - Errores de validación: {serializer.errors}")
            return False
        
        updated_user = serializer.save()
        print("✅ Test 2 exitoso - Campos opcionales aceptan strings vacíos")
        print(f"   - Dirección: '{updated_user.current_address}'")
        print(f"   - Empleador: '{updated_user.employer_name}'")
        print(f"   - Cargo: '{updated_user.job_title}'")
        
        # 4. Test 3: Actualizar strings opcionales con valores
        print("\n📝 Test 3: Actualizar strings opcionales con valores")
        update_data_3 = {
            'current_address': 'Calle 123 #45-67, Zona Rosa',
            'employer_name': 'TechCorp S.A.S.',
            'job_title': 'Senior Developer'
        }
        
        serializer = UserProfileSerializer(
            instance=updated_user, 
            data=update_data_3, 
            partial=True
        )
        
        if not serializer.is_valid():
            print(f"❌ Test 3 - Errores de validación: {serializer.errors}")
            return False
        
        updated_user = serializer.save()
        print("✅ Test 3 exitoso - Strings opcionales con valores")
        print(f"   - Dirección: '{updated_user.current_address}'")
        print(f"   - Empleador: '{updated_user.employer_name}'")
        print(f"   - Cargo: '{updated_user.job_title}'")
        
        # 5. Test 4: Fechas opcionales
        print("\n📝 Test 4: Actualizar fechas opcionales")
        update_data_4 = {
            'date_of_birth': '1989-01-23',
            'move_in_date': None  # Este debe ser manejado como null
        }
        
        serializer = UserProfileSerializer(
            instance=updated_user, 
            data=update_data_4, 
            partial=True
        )
        
        if not serializer.is_valid():
            print(f"❌ Test 4 - Errores de validación: {serializer.errors}")
            return False
        
        updated_user = serializer.save()
        print("✅ Test 4 exitoso - Fechas opcionales")
        print(f"   - Fecha nacimiento: {updated_user.date_of_birth}")
        print(f"   - Fecha ingreso: {updated_user.move_in_date}")
        
        print("\n🎉 TODOS LOS TESTS DE ACTUALIZACIÓN SELECTIVA PASARON")
        return True
        
    except Exception as e:
        print(f"❌ Error durante el test: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_completion_percentage():
    """Test del cálculo de porcentaje de completitud."""
    print("\n📊 TESTING COMPLETION PERCENTAGE CALCULATION")
    print("=" * 50)
    
    # Simular datos de formulario con diferentes niveles de completitud
    test_cases = [
        {
            'name': 'Perfil vacío',
            'data': {
                'first_name': '', 'last_name': '', 'phone_number': '',
                'date_of_birth': '', 'gender': '', 'nationality': '',
                'marital_status': '', 'country': '', 'state': '', 'city': '',
                'current_address': '', 'employment_status': '', 'monthly_income': 0
            },
            'user_type': 'tenant',
            'expected_low': True
        },
        {
            'name': 'Perfil parcial',
            'data': {
                'first_name': 'Juan', 'last_name': 'Pérez', 'phone_number': '+573001234567',
                'date_of_birth': '1990-01-01', 'gender': 'male', 'nationality': 'Colombiana',
                'marital_status': '', 'country': 'Colombia', 'state': '', 'city': '',
                'current_address': '', 'employment_status': '', 'monthly_income': 0
            },
            'user_type': 'tenant',
            'expected_low': False
        },
        {
            'name': 'Perfil completo tenant',
            'data': {
                'first_name': 'Juan', 'last_name': 'Pérez', 'phone_number': '+573001234567',
                'date_of_birth': '1990-01-01', 'gender': 'male', 'nationality': 'Colombiana',
                'marital_status': 'single', 'country': 'Colombia', 'state': 'Antioquia', 'city': 'Medellín',
                'current_address': 'Calle 123', 'employment_status': 'employed', 'monthly_income': 3000000,
                'budget_range': 'medium', 'family_size': 2
            },
            'user_type': 'tenant',
            'expected_low': False
        }
    ]
    
    # Simular función de cálculo (copiada del frontend)
    def calculate_completion_percentage(data, user_type):
        required_fields = [
            'first_name', 'last_name', 'phone_number', 'date_of_birth', 'gender',
            'nationality', 'marital_status', 'country', 'state', 'city', 
            'current_address', 'employment_status', 'monthly_income'
        ]
        
        role_specific_fields = {
            'landlord': ['total_properties', 'years_experience'],
            'tenant': ['budget_range', 'family_size'],
            'service_provider': ['service_category', 'hourly_rate', 'business_name']
        }
        
        all_required_fields = required_fields + role_specific_fields.get(user_type, [])
        
        completed_fields = [field for field in all_required_fields 
                          if data.get(field) not in [None, '', 0]]
        
        return round((len(completed_fields) / len(all_required_fields)) * 100)
    
    all_passed = True
    for test_case in test_cases:
        percentage = calculate_completion_percentage(test_case['data'], test_case['user_type'])
        print(f"📋 {test_case['name']}: {percentage}%")
        
        if test_case['expected_low'] and percentage > 30:
            print(f"   ⚠️  Esperaba porcentaje bajo pero obtuvo {percentage}%")
            all_passed = False
        elif not test_case['expected_low'] and percentage < 30:
            print(f"   ⚠️  Esperaba porcentaje mayor pero obtuvo {percentage}%")
            all_passed = False
        else:
            print("   ✅ Porcentaje correcto")
    
    return all_passed

def main():
    """Función principal."""
    print("🚀 VeriHome Profile Selective Update Test Suite")
    print("===============================================")
    
    tests = [
        ("Selective Update", test_selective_update),
        ("Completion Percentage", test_completion_percentage),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n🧪 Ejecutando: {test_name}")
        result = test_func()
        results.append((test_name, result))
        print(f"📊 Resultado: {'✅ PASS' if result else '❌ FAIL'}")
    
    # Resumen final
    print("\n📋 RESUMEN DE TESTS")
    print("=" * 40)
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {test_name}: {status}")
    
    print(f"\n🎯 Total: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 TODOS LOS TESTS PASARON - Selective update is working correctly!")
    else:
        print("⚠️  ALGUNOS TESTS FALLARON - Review the implementation")
    
    return passed == total

if __name__ == "__main__":
    main()