#!/usr/bin/env python
"""
Test de integración que simula exactamente los datos del log del usuario.
Replica el FormData con multipart/form-data que envió el usuario.
"""

import os
import sys
import django
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
import json
import logging

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from properties.models import Property

User = get_user_model()

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class UserExactDataIntegrationTest(TestCase):
    """Test que replica exactamente los datos del log del usuario."""
    
    def setUp(self):
        """Configurar test con usuario landlord."""
        self.client = APIClient()
        
        # Crear usuario landlord exactamente como está en los datos de prueba
        self.landlord_user = User.objects.create_user(
            email='landlord@test.com',
            password='test123',
            first_name='Juan',
            last_name='Pérez',
            user_type='landlord'
        )
        
        # Crear perfil de landlord
        from users.models import LandlordProfile
        self.landlord_profile = LandlordProfile.objects.create(
            user=self.landlord_user,
            phone_number='+573001234567',
            bio='Propietario experimentado en el sector inmobiliario',
            verified=True,
            rating=4.5
        )
        
        # Autenticar usuario
        self.client.force_authenticate(user=self.landlord_user)
        
        # URL del endpoint
        self.create_property_url = reverse('properties:property-list')
        
        logger.info(f"✅ Setup completado - Usuario: {self.landlord_user.email}")
    
    def test_user_exact_formdata_submission(self):
        """
        Test que simula exactamente el FormData que envió el usuario.
        Datos extraídos del log del usuario.
        """
        logger.info("🧪 INICIANDO TEST CON DATOS EXACTOS DEL USUARIO")
        logger.info("=" * 60)
        
        # Datos exactos del log del usuario
        property_data = {
            'title': 'bucaramanga casa',
            'description': 'Casa amplia en Bucaramanga con excelentes acabados y ubicación estratégica',
            'property_type': 'house',
            'listing_type': 'rent',
            'address': 'Calle 45 #23-12',
            'city': 'Bucaramanga',
            'state': 'Santander',
            'country': 'Colombia',
            'postal_code': '680001',
            'latitude': '7.1193',
            'longitude': '-73.1227',
            'bedrooms': '3',
            'bathrooms': '2',
            'total_area': '120',
            'lot_area': '150',
            'year_built': '2015',
            'rent_price': '1500000',
            'sale_price': '',
            'security_deposit': '1500000',
            'utilities_included': 'agua,luz, telefono, internet',  # CSV como en el log
            'furnished': 'false',
            'pets_allowed': 'true',
            'smoking_allowed': 'false',
            'parking_spaces': '2',
            'floors': '2',
            'minimum_lease_term': '12',
            'property_features': 'Jardín,Terraza,Zona de lavandería',  # CSV como en el log
            'nearby_amenities': 'Supermercado,Colegio,Hospital',  # CSV como en el log
            'transportation': 'Bus,Metro,Taxi',  # CSV como en el log
            'available_from': '2025-01-01'
        }
        
        logger.info("📋 DATOS DE PRUEBA (exactos del log del usuario):")
        for key, value in property_data.items():
            logger.info(f"  {key}: {value}")
        
        # Realizar la petición POST
        logger.info("\n🚀 ENVIANDO PETICIÓN POST...")
        response = self.client.post(
            self.create_property_url,
            data=property_data,
            format='multipart'  # Simular multipart/form-data
        )
        
        logger.info(f"📡 Response Status: {response.status_code}")
        logger.info(f"📡 Response Data: {response.data}")
        
        # Verificaciones principales
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, 
                        f"Expected 201, got {response.status_code}. Data: {response.data}")
        
        # Verificar que se creó la propiedad
        self.assertTrue(Property.objects.filter(title='bucaramanga casa').exists())
        
        # Obtener la propiedad creada
        created_property = Property.objects.get(title='bucaramanga casa')
        
        logger.info("\n✅ VERIFICACIONES:")
        logger.info(f"  ✓ Status Code: {response.status_code} (esperado: 201)")
        logger.info(f"  ✓ Propiedad creada: {created_property.title}")
        logger.info(f"  ✓ Landlord asignado: {created_property.landlord.email}")
        
        # Verificar campos básicos
        self.assertEqual(created_property.title, 'bucaramanga casa')
        self.assertEqual(created_property.city, 'Bucaramanga')
        self.assertEqual(created_property.property_type, 'house')
        self.assertEqual(created_property.listing_type, 'rent')
        self.assertEqual(created_property.rent_price, 1500000)
        self.assertEqual(created_property.bedrooms, 3)
        self.assertEqual(created_property.bathrooms, 2)
        self.assertEqual(created_property.landlord, self.landlord_user)
        
        # Verificar conversión CSV a JSON - utilities_included
        expected_utilities = ['agua', 'luz', 'telefono', 'internet']
        self.assertEqual(created_property.utilities_included, expected_utilities)
        logger.info(f"  ✓ utilities_included convertido: {created_property.utilities_included}")
        
        # Verificar conversión CSV a JSON - property_features
        expected_features = ['Jardín', 'Terraza', 'Zona de lavandería']
        self.assertEqual(created_property.property_features, expected_features)
        logger.info(f"  ✓ property_features convertido: {created_property.property_features}")
        
        # Verificar conversión CSV a JSON - nearby_amenities
        expected_amenities = ['Supermercado', 'Colegio', 'Hospital']
        self.assertEqual(created_property.nearby_amenities, expected_amenities)
        logger.info(f"  ✓ nearby_amenities convertido: {created_property.nearby_amenities}")
        
        # Verificar conversión CSV a JSON - transportation
        expected_transport = ['Bus', 'Metro', 'Taxi']
        self.assertEqual(created_property.transportation, expected_transport)
        logger.info(f"  ✓ transportation convertido: {created_property.transportation}")
        
        # Verificar campos numéricos
        self.assertEqual(created_property.parking_spaces, 2)
        self.assertEqual(created_property.floors, 2)
        self.assertEqual(created_property.minimum_lease_term, 12)
        self.assertEqual(created_property.total_area, 120)
        self.assertEqual(created_property.lot_area, 150)
        self.assertEqual(created_property.year_built, 2015)
        
        # Verificar campos booleanos
        self.assertEqual(created_property.furnished, False)
        self.assertEqual(created_property.pets_allowed, True)
        self.assertEqual(created_property.smoking_allowed, False)
        
        # Verificar campos de ubicación
        self.assertEqual(float(created_property.latitude), 7.1193)
        self.assertEqual(float(created_property.longitude), -73.1227)
        self.assertEqual(created_property.postal_code, '680001')
        
        logger.info("\n🎉 TODOS LOS TESTS PASARON EXITOSAMENTE!")
        logger.info("=" * 60)
        
        return created_property
    
    def test_validation_errors_handling(self):
        """Test que verifica el manejo de errores de validación."""
        logger.info("🧪 TESTING VALIDATION ERRORS HANDLING")
        
        # Datos inválidos para probar validaciones
        invalid_data = {
            'title': '',  # Título vacío
            'property_type': 'invalid_type',
            'listing_type': 'rent',
            'rent_price': '0',  # Precio 0 para rental
            'bedrooms': '-1',  # Número negativo
            'parking_spaces': '-5',  # Número negativo
            'floors': '0',  # Cero no válido
            'minimum_lease_term': '0',  # Cero no válido
        }
        
        response = self.client.post(
            self.create_property_url,
            data=invalid_data,
            format='multipart'
        )
        
        logger.info(f"📡 Response Status: {response.status_code}")
        logger.info(f"📡 Response Data: {response.data}")
        
        # Debe devolver 400 Bad Request
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # No debe crear la propiedad
        self.assertFalse(Property.objects.filter(title='').exists())
        
        logger.info("✅ Validation errors handled correctly")
    
    def test_csv_to_json_conversion(self):
        """Test específico para la conversión CSV a JSON."""
        logger.info("🧪 TESTING CSV TO JSON CONVERSION")
        
        # Datos con diferentes formatos CSV
        test_cases = [
            {
                'utilities_included': 'agua, luz, gas',
                'expected': ['agua', 'luz', 'gas']
            },
            {
                'utilities_included': 'agua,luz,gas,internet',
                'expected': ['agua', 'luz', 'gas', 'internet']
            },
            {
                'utilities_included': 'agua, luz, , gas, ',
                'expected': ['agua', 'luz', 'gas']  # Espacios vacíos removidos
            }
        ]
        
        for i, test_case in enumerate(test_cases):
            logger.info(f"\n📋 Test Case {i+1}: {test_case['utilities_included']}")
            
            property_data = {
                'title': f'test_property_{i}',
                'description': 'Test property',
                'property_type': 'house',
                'listing_type': 'rent',
                'address': 'Test Address',
                'city': 'Test City',
                'state': 'Test State',
                'country': 'Colombia',
                'bedrooms': '2',
                'bathrooms': '1',
                'rent_price': '1000000',
                'utilities_included': test_case['utilities_included']
            }
            
            response = self.client.post(
                self.create_property_url,
                data=property_data,
                format='multipart'
            )
            
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            
            created_property = Property.objects.get(title=f'test_property_{i}')
            self.assertEqual(created_property.utilities_included, test_case['expected'])
            
            logger.info(f"  ✓ Converted: {created_property.utilities_included}")
        
        logger.info("✅ CSV to JSON conversion working correctly")


def run_integration_test():
    """Ejecutar el test de integración."""
    logger.info("🚀 INICIANDO TEST DE INTEGRACIÓN CON DATOS EXACTOS DEL USUARIO")
    logger.info("=" * 80)
    
    # Ejecutar el test
    import unittest
    
    # Crear suite de tests
    suite = unittest.TestLoader().loadTestsFromTestCase(UserExactDataIntegrationTest)
    
    # Ejecutar tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    if result.wasSuccessful():
        logger.info("\n🎉 TODOS LOS TESTS PASARON EXITOSAMENTE!")
        logger.info("✅ La creación de propiedades funciona correctamente con los datos del usuario")
        return True
    else:
        logger.error("\n❌ ALGUNOS TESTS FALLARON")
        for failure in result.failures:
            logger.error(f"❌ FAILURE: {failure[0]}")
            logger.error(f"   {failure[1]}")
        for error in result.errors:
            logger.error(f"❌ ERROR: {error[0]}")
            logger.error(f"   {error[1]}")
        return False


if __name__ == '__main__':
    success = run_integration_test()
    sys.exit(0 if success else 1)