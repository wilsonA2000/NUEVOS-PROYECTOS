#!/usr/bin/env python3
"""
Script para depurar errores 500 en los endpoints reportados.
"""

import os
import sys
import django
from django.conf import settings

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

import traceback
import json
from django.test import RequestFactory
from django.contrib.auth import get_user_model
from dashboard.views import DashboardStatsView
from properties.api_views import PropertyViewSet

User = get_user_model()

def test_dashboard_stats():
    """Test del endpoint de estadísticas del dashboard."""
    print("🔍 Testing Dashboard Stats Endpoint...")
    
    try:
        # Crear usuario de prueba
        user = User.objects.filter(email='admin@verihome.com').first()
        if not user:
            print("❌ No se encontró usuario admin")
            return False
            
        # Crear request factory
        factory = RequestFactory()
        request = factory.get('/api/v1/dashboard/stats?period=month')
        request.user = user
        
        # Crear vista y probar
        view = DashboardStatsView()
        view.request = request
        
        response = view.get(request)
        print(f"✅ Dashboard Stats: Status {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Error: {response.data}")
            return False
            
        return True
        
    except Exception as e:
        print(f"❌ Dashboard Stats Error: {e}")
        print(traceback.format_exc())
        return False

def test_properties_endpoint():
    """Test del endpoint de propiedades."""
    print("🔍 Testing Properties Endpoint...")
    
    try:
        # Crear usuario de prueba
        user = User.objects.filter(email='admin@verihome.com').first()
        if not user:
            print("❌ No se encontró usuario admin")
            return False
            
        # Crear request factory
        factory = RequestFactory()
        request = factory.get('/api/v1/properties/properties/')
        request.user = user
        
        # Crear viewset y probar
        viewset = PropertyViewSet()
        viewset.request = request
        viewset.format_kwarg = None
        viewset.action = 'list'  # Set action for serializer selection
        
        response = viewset.list(request)
        print(f"✅ Properties: Status {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Error: {response.data}")
            return False
            
        return True
        
    except Exception as e:
        print(f"❌ Properties Error: {e}")
        print(traceback.format_exc())
        return False

def check_models():
    """Verificar que los modelos estén correctos."""
    print("🔍 Checking Models...")
    
    try:
        from properties.models import Property
        from payments.models import Transaction
        from contracts.models import Contract
        
        print(f"✅ Property model: {Property.objects.count()} records")
        print(f"✅ Transaction model: {Transaction.objects.count()} records") 
        print(f"✅ Contract model: {Contract.objects.count()} records")
        
        # Verificar campos de Property
        property_fields = [field.name for field in Property._meta.fields]
        print(f"Property fields: {property_fields}")
        
        if 'landlord' not in property_fields:
            print("❌ Missing 'landlord' field in Property model")
            return False
            
        return True
        
    except Exception as e:
        print(f"❌ Models Error: {e}")
        print(traceback.format_exc())
        return False

def main():
    """Función principal."""
    print("🚀 Starting 500 Error Debug Script")
    print("=" * 50)
    
    success = True
    
    # Verificar modelos
    if not check_models():
        success = False
    
    print("-" * 30)
    
    # Test dashboard stats
    if not test_dashboard_stats():
        success = False
    
    print("-" * 30)
    
    # Test properties
    if not test_properties_endpoint():
        success = False
    
    print("=" * 50)
    
    if success:
        print("✅ All tests passed!")
    else:
        print("❌ Some tests failed!")
    
    return success

if __name__ == '__main__':
    main()