// Test rápido para VeriHome - Copiar y pegar en la consola del navegador

(async () => {
  console.log('🚀 Test rápido de VeriHome');
  
  // Verificar si hay token
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  
  if (!token) {
    console.log('❌ No hay token de autenticación. Por favor inicia sesión primero.');
    return;
  }
  
  console.log('✅ Token encontrado');
  
  // Test 1: Obtener propiedades
  try {
    const response = await fetch('http://localhost:8000/api/properties/', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('📋 Propiedades encontradas:', data.results?.length || data.length || 0);
    } else {
      console.log('❌ Error al obtener propiedades:', response.status);
    }
  } catch (error) {
    console.log('❌ Error de conexión:', error.message);
  }
  
  // Test 2: Crear propiedad de prueba
  const testProperty = {
    title: 'Test Property ' + Date.now(),
    description: 'Propiedad de prueba',
    price: 1000000,
    bedrooms: 1,
    bathrooms: 1,
    area: 50,
    property_type: 'apartment',
    status: 'available',
    address: 'Calle Test 123',
    city: 'Bogotá',
    state: 'Cundinamarca',
    country: 'Colombia',
    latitude: 4.7110,
    longitude: -74.0721
  };
  
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
      console.log('✅ Propiedad creada:', data.id);
      
      // Verificar que aparece en el listado
      const listResponse = await fetch('http://localhost:8000/api/properties/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (listResponse.ok) {
        const listData = await listResponse.json();
        const found = listData.results?.some(p => p.id === data.id) || listData.some(p => p.id === data.id);
        console.log(found ? '✅ Propiedad aparece en el listado' : '⚠️ Propiedad no aparece en el listado');
      }
    } else {
      const errorData = await response.json();
      console.log('❌ Error al crear propiedad:', errorData);
    }
  } catch (error) {
    console.log('❌ Error de conexión:', error.message);
  }
})(); 