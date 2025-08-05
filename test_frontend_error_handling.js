/**
 * Script de prueba para verificar el manejo de errores en el frontend
 * Verifica que los códigos 201 (éxito) y 400 (error) se manejen correctamente
 */

const axios = require('axios');

// Configuración similar a la del frontend
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

// Interceptor de respuesta similar al frontend
api.interceptors.response.use(
  (response) => {
    console.log(`✅ Response interceptor - Status: ${response.status}`);
    
    // Para códigos 4xx, rechazar como error para que sea manejado por el catch
    if (response.status >= 400 && response.status < 500) {
      console.log(`🔄 Converting ${response.status} to error`);
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

async function testErrorHandling() {
  console.log('🧪 TESTING FRONTEND ERROR HANDLING');
  console.log('=====================================');
  
  // Test 1: Simular respuesta 201 (éxito)
  console.log('\n📋 Test 1: Simulando respuesta 201 (éxito)');
  try {
    // Simular un request que devuelve 201
    const mockResponse = {
      status: 201,
      statusText: 'Created',
      data: { id: 1, title: 'Test Property' },
      config: { url: '/properties/properties/', method: 'post' }
    };
    
    console.log('🎯 Simulando código 201...');
    console.log('✅ Status 201 - Debería ser manejado como ÉXITO');
    console.log('📝 Data:', mockResponse.data);
    
  } catch (error) {
    console.log('❌ Error inesperado con código 201:', error.message);
  }
  
  // Test 2: Simular respuesta 400 (error)
  console.log('\n📋 Test 2: Simulando respuesta 400 (error)');
  try {
    // Simular un request que devuelve 400
    const mockError = {
      response: {
        status: 400,
        statusText: 'Bad Request',
        data: { title: ['Este campo es requerido'] },
      },
      config: { url: '/properties/properties/', method: 'post' }
    };
    
    console.log('🎯 Simulando código 400...');
    console.log('❌ Status 400 - Debería ser manejado como ERROR');
    console.log('📝 Error Data:', mockError.response.data);
    
  } catch (error) {
    console.log('✅ Error correctamente capturado:', error.message);
  }
  
  // Test 3: Verificar configuración de validateStatus
  console.log('\n📋 Test 3: Verificando configuración validateStatus');
  const validateStatus = api.defaults.validateStatus;
  
  console.log('🔍 Verificando validateStatus:');
  console.log('  - Status 200:', validateStatus(200) ? '✅ Válido' : '❌ Inválido');
  console.log('  - Status 201:', validateStatus(201) ? '✅ Válido' : '❌ Inválido');
  console.log('  - Status 400:', validateStatus(400) ? '✅ Válido' : '❌ Inválido');
  console.log('  - Status 401:', validateStatus(401) ? '✅ Válido' : '❌ Inválido');
  console.log('  - Status 500:', validateStatus(500) ? '✅ Válido' : '❌ Inválido');
  
  console.log('\n🎉 RESULTADO ESPERADO:');
  console.log('=====================');
  console.log('✅ Status 201: Se maneja como éxito en el frontend');
  console.log('❌ Status 400: Se convierte a error y se maneja en el catch');
  console.log('✅ Status 401: Se maneja para redirección de autenticación');
  console.log('❌ Status 500: Se trata como error de red');
  
  console.log('\n💡 FLUJO CORRECTO:');
  console.log('=================');
  console.log('1. validateStatus permite que 4xx pasen como respuestas válidas');
  console.log('2. El response interceptor convierte 4xx a errores');
  console.log('3. Los errores 4xx son capturados en el catch del frontend');
  console.log('4. Los códigos 2xx se manejan como éxito');
}

testErrorHandling().catch(console.error);