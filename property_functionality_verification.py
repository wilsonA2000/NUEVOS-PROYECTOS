#!/usr/bin/env python3
"""
Script para verificar el estado actual de las funcionalidades de propiedades
Verifica datos reales en la base de datos y funcionalidades del frontend
"""

import os
import sys
import json
import requests
from datetime import datetime
from pathlib import Path

# Configurar el path de Django
sys.path.insert(0, '/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')

import django
django.setup()

from django.contrib.auth import get_user_model
from properties.models import Property, Amenity, PropertyAmenity, PropertyImage
from users.models import Profile

User = get_user_model()

def print_header(title):
    print(f"\n{'='*80}")
    print(f"🔍 {title}")
    print(f"{'='*80}")

def print_section(title):
    print(f"\n{'▶'*3} {title}")
    print("-" * 60)

def verify_database_data():
    """Verifica los datos reales en la base de datos"""
    print_header("VERIFICACIÓN DE DATOS EN BASE DE DATOS")
    
    # Usuarios
    print_section("USUARIOS")
    users = User.objects.all()
    print(f"Total usuarios: {users.count()}")
    for user in users:
        profile = getattr(user, 'profile', None)
        user_type = profile.user_type if profile else 'N/A'
        print(f"  • {user.email} - Tipo: {user_type} - Activo: {user.is_active}")
    
    # Propiedades
    print_section("PROPIEDADES")
    properties = Property.objects.all()
    print(f"Total propiedades: {properties.count()}")
    
    if properties.exists():
        for prop in properties:
            print(f"\n🏠 PROPIEDAD ID: {prop.id}")
            print(f"   Título: {prop.title}")
            print(f"   Dirección: {prop.address}")
            print(f"   Tipo: {prop.property_type}")
            print(f"   Estado: {prop.status}")
            print(f"   Precio renta: ${prop.rent_price:,.0f}" if prop.rent_price else "   Sin precio de renta")
            print(f"   Precio venta: ${prop.sale_price:,.0f}" if prop.sale_price else "   Sin precio de venta")
            print(f"   Habitaciones: {prop.bedrooms}")
            print(f"   Baños: {prop.bathrooms}")
            print(f"   Área: {prop.total_area} m²")
            print(f"   Propietario: {prop.landlord.email if prop.landlord else 'N/A'}")
            print(f"   Creado: {prop.created_at.strftime('%Y-%m-%d %H:%M')}")
            
            # Imágenes
            images = PropertyImage.objects.filter(property=prop)
            print(f"   Imágenes: {images.count()}")
            for img in images:
                print(f"     - {img.image_url or img.image}")
            
            # Amenidades
            amenities = PropertyAmenity.objects.filter(property=prop, available=True)
            print(f"   Amenidades: {amenities.count()}")
            for amenity in amenities:
                print(f"     - {amenity.amenity.name}")
    else:
        print("❌ No se encontraron propiedades en la base de datos")
    
    # Amenidades disponibles
    print_section("AMENIDADES DISPONIBLES")
    amenities = Amenity.objects.all()
    print(f"Total amenidades: {amenities.count()}")
    for amenity in amenities:
        print(f"  • {amenity.name} - {amenity.icon}")

def verify_api_endpoints():
    """Verifica que los endpoints de API estén funcionando"""
    print_header("VERIFICACIÓN DE ENDPOINTS API")
    
    base_url = "http://localhost:8000"
    
    # Crear usuario de test y obtener token
    print_section("AUTENTICACIÓN")
    try:
        # Intentar login con usuario existente
        login_data = {
            "email": "landlord@test.com",
            "password": "test123"
        }
        
        login_response = requests.post(f"{base_url}/api/v1/users/auth/login/", 
                                     data=login_data, timeout=10)
        
        if login_response.status_code == 200:
            token = login_response.json().get('access')
            print(f"✅ Login exitoso - Token obtenido")
            headers = {"Authorization": f"Bearer {token}"}
        else:
            print(f"❌ Login fallido: {login_response.status_code}")
            print(f"   Response: {login_response.text}")
            headers = {}
    except Exception as e:
        print(f"❌ Error en login: {str(e)}")
        headers = {}
    
    # Endpoints a verificar
    endpoints = [
        ("GET", "/api/v1/properties/properties/", "Listar propiedades"),
        ("GET", "/api/v1/properties/amenities/", "Listar amenidades"),
        ("GET", "/api/v1/properties/filters/", "Filtros de propiedades"),
        ("GET", "/api/v1/properties/stats/", "Estadísticas de propiedades"),
    ]
    
    print_section("ENDPOINTS DE PROPIEDADES")
    for method, endpoint, description in endpoints:
        try:
            if method == "GET":
                response = requests.get(f"{base_url}{endpoint}", 
                                      headers=headers, timeout=10)
            
            print(f"  {method} {endpoint}")
            print(f"    📋 {description}")
            print(f"    📊 Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    print(f"    📦 Datos: {len(data)} elementos")
                elif isinstance(data, dict):
                    if 'results' in data:
                        print(f"    📦 Datos: {len(data['results'])} elementos")
                    else:
                        print(f"    📦 Datos: {len(data)} campos")
                print(f"    ✅ OK")
            else:
                print(f"    ❌ Error: {response.text[:100]}...")
                
        except Exception as e:
            print(f"    ❌ Excepción: {str(e)}")

def verify_frontend_components():
    """Verifica los componentes del frontend"""
    print_header("VERIFICACIÓN DE COMPONENTES FRONTEND")
    
    # Rutas de archivos críticos
    frontend_files = [
        ("PropertyList (Page)", "/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS/frontend/src/pages/properties/PropertyList.tsx"),
        ("PropertyList (Component)", "/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS/frontend/src/components/properties/PropertyList.tsx"),
        ("PropertyDetail", "/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS/frontend/src/components/properties/PropertyDetail.tsx"),
        ("useProperties Hook", "/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS/frontend/src/hooks/useProperties.ts"),
        ("PropertyService", "/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS/frontend/src/services/propertyService.ts"),
    ]
    
    print_section("ARCHIVOS CRÍTICOS")
    for name, filepath in frontend_files:
        if os.path.exists(filepath):
            print(f"✅ {name}: {filepath}")
            # Verificar funcionalidades clave
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
                # Buscar funcionalidades específicas
                if "PropertyList" in name:
                    has_delete = "deleteProperty" in content or "Delete" in content
                    has_edit = "EditIcon" in content or "handleEdit" in content
                    has_navigation = "navigate" in content or "onClick" in content
                    print(f"    🔄 Funcionalidad eliminar: {'✅' if has_delete else '❌'}")
                    print(f"    ✏️ Funcionalidad editar: {'✅' if has_edit else '❌'}")
                    print(f"    🔗 Navegación: {'✅' if has_navigation else '❌'}")
                
                elif "PropertyDetail" in name:
                    has_edit_button = "EditIcon" in content and "Editar" in content
                    has_delete_button = "DeleteIcon" in content and "Eliminar" in content
                    has_navigation = "navigate" in content
                    print(f"    ✏️ Botón editar: {'✅' if has_edit_button else '❌'}")
                    print(f"    🗑️ Botón eliminar: {'✅' if has_delete_button else '❌'}")
                    print(f"    🔗 Navegación: {'✅' if has_navigation else '❌'}")
        else:
            print(f"❌ {name}: {filepath} (No encontrado)")

def analyze_reported_issues():
    """Analiza los problemas reportados específicamente"""
    print_header("ANÁLISIS DE PROBLEMAS REPORTADOS")
    
    issues = [
        "No se puede eliminar propiedades",
        "No se puede hacer click para ver detalles", 
        "Los datos no se ven en miniatura",
        "Faltan botones de editar"
    ]
    
    print_section("PROBLEMAS REPORTADOS")
    for issue in issues:
        print(f"❓ {issue}")
    
    print_section("ANÁLISIS DE COMPONENTES")
    
    # Verificar PropertyList de páginas (más usado)
    page_list_path = "/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS/frontend/src/pages/properties/PropertyList.tsx"
    if os.path.exists(page_list_path):
        with open(page_list_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        print("🔍 PropertyList (Page) - Análisis:")
        
        # Problema 1: No se puede eliminar
        if "deleteProperty" in content and "DeleteIcon" in content:
            print("  ✅ Botón eliminar presente")
            if "handleDeleteProperty" in content:
                print("  ✅ Handler de eliminación presente")
            else:
                print("  ❌ Handler de eliminación ausente")
        else:
            print("  ❌ Funcionalidad eliminar ausente")
        
        # Problema 2: No se puede hacer click para ver detalles
        if "navigate" in content and "onClick" in content:
            print("  ✅ Navegación presente")
            # Buscar específicamente navegación a detalle
            if "/properties/" in content and "navigate" in content:
                print("  ✅ Navegación a detalle presente")
            else:
                print("  ❌ Navegación a detalle ausente")
        else:
            print("  ❌ Navegación ausente")
        
        # Problema 3: Datos no se ven en miniatura
        if "CardContent" in content and "property.title" in content:
            print("  ✅ Datos en cards presentes")
        else:
            print("  ❌ Datos en cards ausentes")
        
        # Problema 4: Faltan botones de editar
        if "EditIcon" in content and "handleEdit" in content:
            print("  ✅ Botón editar presente")
        else:
            print("  ❌ Botón editar ausente")
    
    # Verificar PropertyDetail
    detail_path = "/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS/frontend/src/components/properties/PropertyDetail.tsx"
    if os.path.exists(detail_path):
        with open(detail_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        print("\n🔍 PropertyDetail - Análisis:")
        
        if "EditIcon" in content and "Editar Propiedad" in content:
            print("  ✅ Botón editar presente")
        else:
            print("  ❌ Botón editar ausente")
        
        if "DeleteIcon" in content and "Eliminar" in content:
            print("  ✅ Botón eliminar presente")
        else:
            print("  ❌ Botón eliminar ausente")

def create_test_data_if_needed():
    """Crea datos de prueba si no existen"""
    print_header("CREACIÓN DE DATOS DE PRUEBA")
    
    if Property.objects.count() == 0:
        print("❌ No hay propiedades. Creando datos de prueba...")
        
        # Crear usuario landlord si no existe
        landlord_email = "landlord@test.com"
        landlord = User.objects.filter(email=landlord_email).first()
        
        if not landlord:
            print("Creando usuario landlord...")
            landlord = User.objects.create_user(
                email=landlord_email,
                password="test123",
                is_active=True
            )
            Profile.objects.create(
                user=landlord,
                user_type='landlord',
                first_name='Test',
                last_name='Landlord'
            )
        
        # Crear propiedades de prueba
        properties_data = [
            {
                "title": "Apartamento Moderno en El Poblado",
                "address": "Calle 10 #20-30, El Poblado, Medellín",
                "property_type": "apartment",
                "bedrooms": 3,
                "bathrooms": 2,
                "total_area": 120,
                "rent_price": 2500000,
                "security_deposit": 2500000,
                "status": "available",
                "description": "Hermoso apartamento moderno con excelente ubicación",
                "furnished": True,
                "pets_allowed": False,
                "parking_spaces": 1,
            },
            {
                "title": "Casa Familiar en Rionegro",
                "address": "Carrera 50 #25-15, Rionegro, Antioquia",
                "property_type": "house",
                "bedrooms": 4,
                "bathrooms": 3,
                "total_area": 200,
                "rent_price": 3000000,
                "security_deposit": 3000000,
                "status": "available",
                "description": "Casa familiar con jardín y zona verde",
                "furnished": False,
                "pets_allowed": True,
                "parking_spaces": 2,
            },
            {
                "title": "Estudio Ejecutivo en Laureles",
                "address": "Calle 33 #70-20, Laureles, Medellín",
                "property_type": "studio",
                "bedrooms": 1,
                "bathrooms": 1,
                "total_area": 45,
                "rent_price": 1200000,
                "security_deposit": 1200000,
                "status": "available",
                "description": "Estudio moderno perfecto para profesionales",
                "furnished": True,
                "pets_allowed": False,
                "parking_spaces": 1,
            }
        ]
        
        created_properties = []
        for prop_data in properties_data:
            prop = Property.objects.create(
                landlord=landlord,
                **prop_data
            )
            created_properties.append(prop)
            print(f"✅ Propiedad creada: {prop.title}")
        
        print(f"✅ {len(created_properties)} propiedades creadas exitosamente")
        
        return created_properties
    else:
        print(f"✅ Ya existen {Property.objects.count()} propiedades")
        return list(Property.objects.all())

def main():
    """Función principal"""
    print_header("VERIFICACIÓN COMPLETA DE FUNCIONALIDADES DE PROPIEDADES")
    print(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # 1. Verificar datos en base de datos
        verify_database_data()
        
        # 2. Crear datos de prueba si es necesario
        create_test_data_if_needed()
        
        # 3. Verificar endpoints API
        verify_api_endpoints()
        
        # 4. Verificar componentes frontend
        verify_frontend_components()
        
        # 5. Analizar problemas reportados
        analyze_reported_issues()
        
        print_header("RESUMEN Y RECOMENDACIONES")
        print("✅ Verificación completa finalizada")
        print("\n🎯 PRÓXIMOS PASOS:")
        print("1. Revisar los resultados de cada sección")
        print("2. Verificar que el servidor Django esté corriendo")
        print("3. Verificar que el frontend React esté corriendo")
        print("4. Probar manualmente las funcionalidades reportadas")
        print("5. Revisar logs del navegador para errores JavaScript")
        
    except Exception as e:
        print(f"\n❌ Error durante la verificación: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()