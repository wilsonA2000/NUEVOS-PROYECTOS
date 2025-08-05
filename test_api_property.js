// Test Directo de API - Creación de Propiedad
// Usuario: wilsonderecho10@gmail.com

const API_URL = 'http://localhost:8000/api/v1';

// Función para hacer login y obtener token
async function loginAndGetToken() {
  try {
    console.log('🔐 Iniciando login...');
    
    const loginResponse = await fetch(`${API_URL}/auth/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'wilsonderecho10@gmail.com',
        password: 'admin123'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login falló: ${loginResponse.status}`);
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login exitoso');
    console.log('🔑 Token obtenido:', loginData.access ? 'SÍ' : 'NO');
    
    return loginData.access;
  } catch (error) {
    console.error('❌ Error en login:', error);
    return null;
  }
}

// Función para crear propiedad
async function createProperty(token) {
  try {
    console.log('🏠 Iniciando creación de propiedad...');
    
    const propertyData = {
      title: 'Apartamento de Prueba en Bogotá',
      description: 'Apartamento moderno para testing de la aplicación VeriHome',
      property_type: 'apartment',
      listing_type: 'rent',
      status: 'available',
      address: 'Calle 72 # 10-45',
      city: 'Bogotá',
      state: 'Cundinamarca',
      country: 'Colombia',
      postal_code: '110221',
      latitude: 4.6682,
      longitude: -74.0539,
      bedrooms: 2,
      bathrooms: 2,
      half_bathrooms: 1,
      total_area: 85,
      built_area: 75,
      parking_spaces: 1,
      floors: 8,
      floor_number: 5,
      year_built: 2020,
      rent_price: 2500000,
      security_deposit: 2500000,
      maintenance_fee: 150000,
      minimum_lease_term: 12,
      pets_allowed: true,
      smoking_allowed: false,
      furnished: true,
      utilities_included: ['agua', 'gas'],
      property_features: ['balcón', 'vista ciudad', 'ascensor'],
      nearby_amenities: ['centro comercial', 'transporte público', 'parque'],
      transportation: ['TransMilenio', 'SITP']
    };
    
    console.log('📋 Datos de la propiedad:', propertyData);
    
    const createResponse = await fetch(`${API_URL}/properties/properties/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(propertyData)
    });
    
    console.log('📡 Respuesta del servidor:', createResponse.status, createResponse.statusText);
    
    if (!createResponse.ok) {
      const errorData = await createResponse.text();
      console.error('❌ Error en creación:', errorData);
      throw new Error(`Creación falló: ${createResponse.status} - ${errorData}`);
    }
    
    const createdProperty = await createResponse.json();
    console.log('✅ Propiedad creada exitosamente');
    console.log('🆔 ID:', createdProperty.id);
    console.log('📝 Título:', createdProperty.title);
    
    return createdProperty;
  } catch (error) {
    console.error('❌ Error creando propiedad:', error);
    return null;
  }
}

// Función para obtener propiedades
async function getProperties(token) {
  try {
    console.log('📋 Obteniendo lista de propiedades...');
    
    const response = await fetch(`${API_URL}/properties/properties/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error obteniendo propiedades: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Propiedades obtenidas');
    console.log('📊 Total de propiedades:', data.results?.length || data.length || 0);
    
    return data.results || data;
  } catch (error) {
    console.error('❌ Error obteniendo propiedades:', error);
    return [];
  }
}

// Función principal de test
async function runFullTest() {
  console.log('🧪 === INICIANDO TEST COMPLETO DE API ===\n');
  
  // Paso 1: Login
  const token = await loginAndGetToken();
  if (!token) {
    console.log('❌ No se pudo obtener token, abortando test');
    return;
  }
  
  console.log('\n📋 PASO 2: Obteniendo propiedades actuales...');
  const propertiesBefore = await getProperties(token);
  console.log(`📊 Propiedades antes de crear: ${propertiesBefore.length}`);
  
  console.log('\n🏠 PASO 3: Creando nueva propiedad...');
  const newProperty = await createProperty(token);
  if (!newProperty) {
    console.log('❌ No se pudo crear la propiedad, abortando test');
    return;
  }
  
  console.log('\n📋 PASO 4: Verificando que la propiedad aparece en la lista...');
  const propertiesAfter = await getProperties(token);
  console.log(`📊 Propiedades después de crear: ${propertiesAfter.length}`);
  
  // Verificar si la nueva propiedad está en la lista
  const propertyFound = propertiesAfter.find(p => p.id === newProperty.id);
  if (propertyFound) {
    console.log('✅ La nueva propiedad aparece en la lista');
    console.log('📝 Título encontrado:', propertyFound.title);
  } else {
    console.log('❌ La nueva propiedad NO aparece en la lista');
    console.log('🔍 Buscando por ID:', newProperty.id);
    console.log('📋 IDs en la lista:', propertiesAfter.map(p => p.id));
  }
  
  console.log('\n🎉 === TEST COMPLETADO ===');
  console.log('✅ Login: Exitoso');
  console.log('✅ Creación: Exitoso');
  console.log('✅ Verificación: ' + (propertyFound ? 'Exitoso' : 'Falló'));
  
  return {
    token,
    newProperty,
    propertiesBefore,
    propertiesAfter,
    success: !!propertyFound
  };
}

// Exportar funciones para uso en consola
window.runFullTest = runFullTest;
window.loginAndGetToken = loginAndGetToken;
window.createProperty = createProperty;
window.getProperties = getProperties;

console.log('💡 Para ejecutar el test completo:');
console.log('1. Abre las herramientas de desarrollo (F12)');
console.log('2. Ve a la pestaña Console');
console.log('3. Ejecuta: runFullTest()');
console.log('4. O ejecuta funciones individuales:');
console.log('   - loginAndGetToken()');
console.log('   - createProperty(token)');
console.log('   - getProperties(token)'); 