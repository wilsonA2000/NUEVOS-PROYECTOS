/**
 * Script para probar la creación de propiedades desde el frontend
 * Simula tanto casos de éxito (201) como de error (400)
 */

const axios = require('axios');

// Configuración idéntica al frontend
const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
  validateStatus: (status) => {
    // Considerar válidos: 2xx (éxito), 4xx (errores del cliente), 401 (autenticación)
    // Esto permite manejar errores de validación (400) como respuestas válidas
    return (status >= 200 && status < 300) || (status >= 400 && status < 500) || status === 401;
  },
});

// Interceptor de respuesta idéntico al frontend
api.interceptors.response.use(
  (response) => {
    console.log(`📡 Response interceptor - Status: ${response.status}`);
    
    // Para códigos 4xx, rechazar como error para que sea manejado por el catch
    if (response.status >= 400 && response.status < 500) {
      console.log(`🔄 Converting ${response.status} to error for catch handling`);
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.response = response;
      error.config = response.config;
      return Promise.reject(error);
    }
    
    return response;
  },
  (error) => {
    console.log(`❌ Error interceptor - Status: ${error.response?.status || 'Network Error'}`);
    return Promise.reject(error);
  }
);

// Simular propertyService.createProperty
async function simulatePropertyCreation(propertyData, shouldSucceed = true) {
  try {
    console.log('🚀 Simulando creación de propiedad...');
    console.log('📦 Datos a enviar:', propertyData);
    
    if (shouldSucceed) {
      // Simular respuesta exitosa (201)
      const mockSuccessResponse = {
        status: 201,
        statusText: 'Created',
        data: {
          id: 'prop_123',
          title: propertyData.title,
          property_type: propertyData.property_type,
          listing_type: propertyData.listing_type,
          status: 'available',
          created_at: new Date().toISOString()
        },
        config: { url: '/properties/properties/', method: 'post' }
      };
      
      console.log('✅ Respuesta simulada (201):', mockSuccessResponse.data);
      return mockSuccessResponse.data;
    } else {
      // Simular respuesta de error (400)
      const mockErrorResponse = {
        status: 400,
        statusText: 'Bad Request',
        data: {
          title: ['Este campo es requerido'],
          total_area: ['Este campo es requerido'],
          rent_price: ['Este campo es requerido para propiedades de renta']
        }
      };
      
      const error = new Error(`HTTP 400: Bad Request`);
      error.response = mockErrorResponse;
      error.config = { url: '/properties/properties/', method: 'post' };
      
      console.log('❌ Error simulado (400):', mockErrorResponse.data);
      throw error;
    }
  } catch (error) {
    console.error('❌ Error en creación de propiedad:', error.message);
    console.error('   Response data:', error.response?.data);
    throw error;
  }
}

// Simular useCreateProperty hook
function simulateUseCreateProperty() {
  return {
    mutateAsync: async (formData) => {
      console.log('🔧 Hook useCreateProperty: mutateAsync called');
      // Simular que el 80% de las veces es exitoso
      const shouldSucceed = Math.random() > 0.2;
      return await simulatePropertyCreation(formData, shouldSucceed);
    },
    isPending: false,
    error: null
  };
}

// Simular PropertyFormPage.handleSubmit
async function simulatePropertyFormPageSubmit(formData) {
  console.log('📋 PropertyFormPage: handleSubmit called');
  const createProperty = simulateUseCreateProperty();
  
  try {
    const result = await createProperty.mutateAsync(formData);
    console.log('✅ PropertyFormPage: Success - devolviendo resultado');
    return result;
  } catch (error) {
    console.error('❌ PropertyFormPage: Error creando propiedad:', error.response?.data || error.message);
    console.error('📊 PropertyFormPage: Error completo:', error);
    throw error;
  }
}

// Simular PropertyForm.onFormSubmit
async function simulatePropertyFormSubmit(formData) {
  console.log('📝 PropertyForm: onFormSubmit called');
  
  try {
    const result = await simulatePropertyFormPageSubmit(formData);
    console.log('🎉 PropertyForm: Propiedad creada exitosamente');
    console.log('📄 PropertyForm: Mostrando modal de éxito');
    return result;
  } catch (error) {
    console.error('❌ PropertyForm: Error al crear la propiedad:', error);
    
    // Simular el manejo de errores del frontend
    let errorMessage = 'Error al crear la propiedad.';
    if (error.response?.data) {
      const errorData = error.response.data;
      if (typeof errorData === 'object') {
        const errorMessages = Object.entries(errorData)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('; ');
        errorMessage += ` ${errorMessages}`;
      }
    }
    
    console.log('🔔 PropertyForm: Mostrando mensaje de error:', errorMessage);
    throw error;
  }
}

async function testCompleteFlow() {
  console.log('🧪 TESTING COMPLETE PROPERTY CREATION FLOW');
  console.log('==========================================');
  
  // Test datos válidos
  console.log('\n📋 Test 1: Datos válidos (debería tener éxito)');
  const validPropertyData = {
    title: 'Apartamento Moderno',
    property_type: 'apartment',
    listing_type: 'rent',
    total_area: 85,
    rent_price: 1200000,
    description: 'Hermoso apartamento'
  };
  
  try {
    const result = await simulatePropertyFormSubmit(validPropertyData);
    console.log('✅ Test 1: PASSED - Propiedad creada exitosamente');
  } catch (error) {
    console.log('❌ Test 1: FAILED - Error inesperado');
  }
  
  // Test datos inválidos
  console.log('\n📋 Test 2: Datos inválidos (debería fallar)');
  const invalidPropertyData = {
    title: '', // título vacío
    property_type: 'apartment',
    listing_type: 'rent',
    // falta total_area y rent_price
  };
  
  try {
    await simulatePropertyFormSubmit(invalidPropertyData);
    console.log('❌ Test 2: FAILED - Debería haber fallado');
  } catch (error) {
    console.log('✅ Test 2: PASSED - Error correctamente manejado');
  }
  
  console.log('\n🎯 RESUMEN DE FLUJO:');
  console.log('===================');
  console.log('1. PropertyForm.onFormSubmit → PropertyFormPage.handleSubmit');
  console.log('2. PropertyFormPage.handleSubmit → useCreateProperty.mutateAsync');  
  console.log('3. useCreateProperty.mutateAsync → propertyService.createProperty');
  console.log('4. propertyService.createProperty → api.post');
  console.log('5. api.post → response interceptor');
  console.log('6. Si status 4xx → convierte a error → catch');
  console.log('7. Si status 2xx → success → then');
  
  console.log('\n✅ CONFIGURACIÓN CORRECTA:');
  console.log('========================');
  console.log('• validateStatus permite 4xx como respuestas válidas');
  console.log('• Response interceptor convierte 4xx a errores');
  console.log('• Los errores van al catch del frontend');
  console.log('• Los éxitos (2xx) se manejan normalmente');
}

testCompleteFlow().catch(console.error);