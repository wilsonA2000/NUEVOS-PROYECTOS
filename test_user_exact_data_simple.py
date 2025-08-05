"""
Script simple para probar la creación de propiedades con datos exactos del usuario.
Usa Django management command para evitar problemas de configuración.
"""

import requests
import json
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_user_exact_data():
    """Test con datos exactos del log del usuario."""
    
    # URL del endpoint
    base_url = "http://localhost:8000"
    login_url = f"{base_url}/api/v1/users/auth/login/"
    create_property_url = f"{base_url}/api/v1/properties/properties/"
    
    logger.info("🧪 INICIANDO TEST CON DATOS EXACTOS DEL USUARIO")
    logger.info("=" * 60)
    
    # 1. Autenticarse como landlord
    login_data = {
        'email': 'landlord@test.com',
        'password': 'test123'
    }
    
    logger.info("🔐 Autenticando usuario landlord@test.com...")
    login_response = requests.post(login_url, data=login_data)
    
    if login_response.status_code != 200:
        logger.error(f"❌ Error en login: {login_response.status_code}")
        logger.error(f"   Response: {login_response.text}")
        return False
    
    # Obtener token
    token_data = login_response.json()
    access_token = token_data.get('access')
    
    if not access_token:
        logger.error("❌ No se pudo obtener el token de acceso")
        return False
    
    logger.info("✅ Login exitoso, token obtenido")
    
    # 2. Preparar headers con token
    headers = {
        'Authorization': f'Bearer {access_token}',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    # 3. Datos exactos del log del usuario
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
    
    # 4. Enviar petición POST con multipart/form-data
    logger.info("\n🚀 ENVIANDO PETICIÓN POST...")
    
    # Usar files parameter para simular multipart/form-data
    files = {key: (None, value) for key, value in property_data.items()}
    
    response = requests.post(
        create_property_url,
        files=files,
        headers=headers
    )
    
    logger.info(f"📡 Response Status: {response.status_code}")
    logger.info(f"📡 Response Headers: {dict(response.headers)}")
    
    # 5. Verificar respuesta
    if response.status_code == 201:
        logger.info("✅ SUCCESS: Propiedad creada exitosamente!")
        
        response_data = response.json()
        logger.info(f"📋 Propiedad creada:")
        logger.info(f"  ID: {response_data.get('id')}")
        logger.info(f"  Título: {response_data.get('title')}")
        logger.info(f"  Ciudad: {response_data.get('city')}")
        logger.info(f"  Tipo: {response_data.get('property_type')}")
        logger.info(f"  Precio: {response_data.get('rent_price')}")
        
        # Verificar campos CSV convertidos a JSON
        utilities = response_data.get('utilities_included')
        features = response_data.get('property_features')
        amenities = response_data.get('nearby_amenities')
        transport = response_data.get('transportation')
        
        logger.info(f"\n🔄 CONVERSIÓN CSV A JSON:")
        logger.info(f"  utilities_included: {utilities}")
        logger.info(f"  property_features: {features}")
        logger.info(f"  nearby_amenities: {amenities}")
        logger.info(f"  transportation: {transport}")
        
        # Verificar que son listas
        if isinstance(utilities, list) and isinstance(features, list) and isinstance(amenities, list) and isinstance(transport, list):
            logger.info("✅ Conversión CSV a JSON exitosa!")
            
            # Verificar contenido específico
            expected_utilities = ['agua', 'luz', 'telefono', 'internet']
            expected_features = ['Jardín', 'Terraza', 'Zona de lavandería']
            expected_amenities = ['Supermercado', 'Colegio', 'Hospital']
            expected_transport = ['Bus', 'Metro', 'Taxi']
            
            if (utilities == expected_utilities and 
                features == expected_features and 
                amenities == expected_amenities and 
                transport == expected_transport):
                logger.info("✅ Contenido de las listas es correcto!")
                return True
            else:
                logger.error("❌ Error: El contenido de las listas no coincide")
                logger.error(f"   utilities esperados: {expected_utilities}, recibidos: {utilities}")
                logger.error(f"   features esperados: {expected_features}, recibidos: {features}")
                logger.error(f"   amenities esperados: {expected_amenities}, recibidos: {amenities}")
                logger.error(f"   transport esperado: {expected_transport}, recibidos: {transport}")
                return False
        else:
            logger.error("❌ Error: Los campos CSV no se convirtieron a listas")
            logger.error(f"   utilities type: {type(utilities)}, value: {utilities}")
            logger.error(f"   features type: {type(features)}, value: {features}")
            logger.error(f"   amenities type: {type(amenities)}, value: {amenities}")
            logger.error(f"   transport type: {type(transport)}, value: {transport}")
            return False
            
    else:
        logger.error(f"❌ ERROR: {response.status_code}")
        logger.error(f"   Response: {response.text}")
        
        # Intentar parsear errores
        try:
            error_data = response.json()
            logger.error(f"   Error details: {json.dumps(error_data, indent=2)}")
        except:
            pass
        
        return False

def test_alternative_method():
    """Test alternativo usando requests con JSON."""
    
    base_url = "http://localhost:8000"
    login_url = f"{base_url}/api/v1/users/auth/login/"
    create_property_url = f"{base_url}/api/v1/properties/properties/"
    
    logger.info("\n🧪 TESTING MÉTODO ALTERNATIVO (JSON)")
    logger.info("=" * 60)
    
    # 1. Login
    login_data = {
        'email': 'landlord@test.com',
        'password': 'test123'
    }
    
    login_response = requests.post(login_url, data=login_data)
    
    if login_response.status_code != 200:
        logger.error(f"❌ Error en login: {login_response.status_code}")
        return False
    
    access_token = login_response.json().get('access')
    
    # 2. Preparar datos como JSON
    property_data = {
        'title': 'bucaramanga casa test 2',
        'description': 'Casa amplia en Bucaramanga con excelentes acabados y ubicación estratégica',
        'property_type': 'house',
        'listing_type': 'rent',
        'address': 'Calle 45 #23-12',
        'city': 'Bucaramanga',
        'state': 'Santander',
        'country': 'Colombia',
        'postal_code': '680001',
        'latitude': 7.1193,
        'longitude': -73.1227,
        'bedrooms': 3,
        'bathrooms': 2,
        'total_area': 120,
        'lot_area': 150,
        'year_built': 2015,
        'rent_price': 1500000,
        'security_deposit': 1500000,
        'utilities_included': 'agua, luz, telefono, internet',  # Como CSV
        'furnished': False,
        'pets_allowed': True,
        'smoking_allowed': False,
        'parking_spaces': 2,
        'floors': 2,
        'minimum_lease_term': 12,
        'property_features': 'Jardín, Terraza, Zona de lavandería',  # Como CSV
        'nearby_amenities': 'Supermercado, Colegio, Hospital',  # Como CSV
        'transportation': 'Bus, Metro, Taxi',  # Como CSV
        'available_from': '2025-01-01'
    }
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    response = requests.post(
        create_property_url,
        json=property_data,
        headers=headers
    )
    
    logger.info(f"📡 Response Status: {response.status_code}")
    
    if response.status_code == 201:
        logger.info("✅ SUCCESS: Método alternativo funcionó!")
        response_data = response.json()
        logger.info(f"  Propiedad creada: {response_data.get('title')}")
        return True
    else:
        logger.error(f"❌ ERROR: {response.status_code}")
        logger.error(f"   Response: {response.text}")
        return False

if __name__ == '__main__':
    logger.info("🚀 INICIANDO TESTS DE INTEGRACIÓN")
    logger.info("=" * 80)
    
    # Test 1: Datos exactos del usuario (multipart/form-data)
    success1 = test_user_exact_data()
    
    # Test 2: Método alternativo (JSON)
    success2 = test_alternative_method()
    
    logger.info("\n📊 RESUMEN DE RESULTADOS:")
    logger.info(f"  Test 1 (Datos exactos usuario): {'✅ PASSED' if success1 else '❌ FAILED'}")
    logger.info(f"  Test 2 (Método alternativo): {'✅ PASSED' if success2 else '❌ FAILED'}")
    
    if success1 and success2:
        logger.info("\n🎉 TODOS LOS TESTS PASARON EXITOSAMENTE!")
        logger.info("✅ La creación de propiedades funciona correctamente")
    else:
        logger.error("\n❌ ALGUNOS TESTS FALLARON")
        logger.error("🔧 Revisar logs para más detalles")