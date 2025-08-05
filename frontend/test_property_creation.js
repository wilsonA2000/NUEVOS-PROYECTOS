// Test de creación de propiedad para VeriHome
// Ejecutar este script en la consola del navegador (F12)

console.log('🚀 Iniciando test de creación de propiedad...');

// Datos de prueba
const testProperty = {
  title: 'Apartamento de Prueba',
  description: 'Este es un apartamento de prueba para verificar la funcionalidad',
  price: 1500000,
  bedrooms: 2,
  bathrooms: 1,
  area: 65,
  property_type: 'apartment',
  status: 'available',
  address: 'Calle 123 #45-67',
  city: 'Bogotá',
  state: 'Cundinamarca',
  country: 'Colombia',
  latitude: 4.7110,
  longitude: -74.0721,
  amenities: ['parking', 'elevator'],
  images: []
};

// Función para obtener el token de autenticación
function getAuthToken() {
  return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

// Función para hacer login
async function loginUser() {
  const loginData = {
    email: 'test@example.com',
    password: 'testpass123'
  };

  try {
    const response = await fetch('http://localhost:8000/api/auth/login/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('authToken', data.access);
      console.log('✅ Login exitoso');
      return data.access;
    } else {
      console.error('❌ Error en login:', response.status);
      return null;
    }
  } catch (error) {
    console.error('❌ Error de conexión:', error);
    return null;
  }
}

// Función para crear propiedad
async function createProperty(token) {
  try {
    const response = await fetch('http://localhost:8000/api/properties/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testProperty)
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Propiedad creada exitosamente:', data);
      return data;
    } else {
      const errorData = await response.json();
      console.error('❌ Error al crear propiedad:', response.status, errorData);
      return null;
    }
  } catch (error) {
    console.error('❌ Error de conexión:', error);
    return null;
  }
}

// Función para obtener propiedades
async function getProperties(token) {
  try {
    const response = await fetch('http://localhost:8000/api/properties/', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('📋 Propiedades disponibles:', data.results || data);
      return data.results || data;
    } else {
      console.error('❌ Error al obtener propiedades:', response.status);
      return [];
    }
  } catch (error) {
    console.error('❌ Error de conexión:', error);
    return [];
  }
}

// Función principal del test
async function runTest() {
  console.log('🔍 Verificando token de autenticación...');
  
  let token = getAuthToken();
  
  if (!token) {
    console.log('🔑 No hay token, intentando login...');
    token = await loginUser();
  }
  
  if (!token) {
    console.error('❌ No se pudo obtener token de autenticación');
    return;
  }
  
  console.log('✅ Token obtenido, procediendo con el test...');
  
  // Obtener propiedades antes de crear
  console.log('📋 Obteniendo propiedades existentes...');
  const propertiesBefore = await getProperties(token);
  
  // Crear nueva propiedad
  console.log('🏠 Creando nueva propiedad...');
  const newProperty = await createProperty(token);
  
  if (newProperty) {
    // Obtener propiedades después de crear
    console.log('📋 Obteniendo propiedades después de crear...');
    const propertiesAfter = await getProperties(token);
    
    // Verificar que la propiedad se agregó
    const propertyExists = propertiesAfter.some(p => p.id === newProperty.id);
    
    if (propertyExists) {
      console.log('✅ Test exitoso: La propiedad se creó y aparece en el listado');
    } else {
      console.log('⚠️ La propiedad se creó pero no aparece en el listado inmediatamente');
    }
  } else {
    console.error('❌ Test falló: No se pudo crear la propiedad');
  }
}

// Ejecutar el test
runTest(); 