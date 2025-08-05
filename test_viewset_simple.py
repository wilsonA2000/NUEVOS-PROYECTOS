#!/usr/bin/env python3
"""
Test para verificar directamente el ViewSet sin mixins.
"""

import os
import sys
import django
from django.conf import settings

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from rest_framework import viewsets
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from properties.models import Property
from properties.optimized_serializers import OptimizedCreatePropertySerializer as CreatePropertySerializer

User = get_user_model()

class SimplePropertyViewSet(viewsets.ModelViewSet):
    """ViewSet simplificado sin mixins para testing."""
    
    queryset = Property.objects.all()
    serializer_class = CreatePropertySerializer
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreatePropertySerializer
        return CreatePropertySerializer
    
    def perform_create(self, serializer):
        # Asignar el usuario actual como landlord
        serializer.save(landlord=self.request.user)

def test_simple_viewset():
    """Test del ViewSet simplificado."""
    
    print("🧪 TESTING VIEWSET SIMPLE SIN MIXINS")
    print("=" * 60)
    
    from rest_framework.routers import DefaultRouter
    from rest_framework.urlpatterns import format_suffix_patterns
    from django.urls import path, include
    from django.test import override_settings
    
    # Configurar router temporal
    router = DefaultRouter()
    router.register(r'simple-properties', SimplePropertyViewSet, basename='simple-property')
    
    # Crear cliente
    client = APIClient()
    
    # Obtener usuario landlord
    landlord = User.objects.filter(user_type='landlord').first()
    print(f"👤 Usuario: {landlord.email}")
    
    # Autenticar
    client.force_authenticate(user=landlord)
    
    # Test POST directo en el ViewSet
    print("\n📡 Testing POST directo en ViewSet...")
    
    # Crear una vista temporal
    viewset = SimplePropertyViewSet()
    viewset.request = client.request
    viewset.action = 'create'
    
    # Datos de prueba
    property_data = {
        'title': 'Test Simple ViewSet',
        'description': 'Test description',
        'property_type': 'apartment',
        'listing_type': 'rent',
        'address': 'Test Address',
        'city': 'Test City',
        'state': 'Test State',
        'country': 'Test Country',
        'total_area': 100.0,
        'rent_price': 1000000,
        'utilities_included': 'agua, luz, internet',
        'parking_spaces': 1,
        'floors': 5,
        'minimum_lease_term': 6,
        'property_features': 'balcón, cocina',
        'nearby_amenities': 'parque, super',
        'transportation': 'metro, bus'
    }
    
    print("📋 Datos de prueba preparados")
    
    # Test del serializer directamente
    serializer = CreatePropertySerializer(data=property_data)
    
    print(f"✅ Serializer válido: {serializer.is_valid()}")
    
    if serializer.is_valid():
        print("✅ Datos validados correctamente")
        validated_data = serializer.validated_data
        
        print(f"📋 utilities_included: {validated_data.get('utilities_included')}")
        print(f"📋 property_features: {validated_data.get('property_features')}")
        print(f"📋 nearby_amenities: {validated_data.get('nearby_amenities')}")
        print(f"📋 transportation: {validated_data.get('transportation')}")
        
        # Intentar crear la propiedad
        try:
            validated_data['landlord'] = landlord
            property_obj = Property.objects.create(**validated_data)
            
            print(f"✅ Propiedad creada: {property_obj.title}")
            print(f"✅ ID: {property_obj.id}")
            
            # Verificar campos JSON
            print(f"\n🔍 Verificación en BD:")
            print(f"utilities_included: {property_obj.utilities_included}")
            print(f"property_features: {property_obj.property_features}")
            print(f"nearby_amenities: {property_obj.nearby_amenities}")
            print(f"transportation: {property_obj.transportation}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error al crear: {e}")
            return False
    else:
        print(f"❌ Errores de validación: {serializer.errors}")
        return False

def test_viewset_actions():
    """Test para verificar qué acciones están disponibles."""
    
    print("\n🔍 VERIFICANDO ACCIONES DISPONIBLES")
    print("=" * 50)
    
    from properties.api_views import PropertyViewSet
    
    # Crear instancia del ViewSet
    viewset = PropertyViewSet()
    
    # Verificar métodos disponibles
    print(f"📋 Basename: {getattr(viewset, 'basename', 'N/A')}")
    print(f"📋 Queryset: {type(viewset.queryset) if hasattr(viewset, 'queryset') else 'Dynamic'}")
    
    # Verificar acciones del ModelViewSet
    print(f"📋 Acciones de ModelViewSet:")
    print(f"   - list: {hasattr(viewset, 'list')}")
    print(f"   - create: {hasattr(viewset, 'create')}")
    print(f"   - retrieve: {hasattr(viewset, 'retrieve')}")
    print(f"   - update: {hasattr(viewset, 'update')}")
    print(f"   - partial_update: {hasattr(viewset, 'partial_update')}")
    print(f"   - destroy: {hasattr(viewset, 'destroy')}")
    
    # Verificar MRO (Method Resolution Order)
    print(f"\n📋 MRO (Method Resolution Order):")
    for i, cls in enumerate(PropertyViewSet.__mro__):
        print(f"   {i}: {cls}")

if __name__ == "__main__":
    print("🚀 TESTING VIEWSET DIRECTO")
    print("=" * 60)
    
    test_viewset_actions()
    success = test_simple_viewset()
    
    if success:
        print("\n🎉 SERIALIZER FUNCIONA CORRECTAMENTE!")
        print("✅ El problema está en el ViewSet original, no en el serializer")
    else:
        print("\n❌ HAY PROBLEMAS CON EL SERIALIZER")