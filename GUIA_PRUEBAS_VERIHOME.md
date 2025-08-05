# Guía de Pruebas - VeriHome

## 🚀 Inicio Rápido

### 1. Servidores
- **Backend**: http://localhost:8000/
- **Frontend**: http://localhost:5173/
- **Admin**: http://localhost:8000/admin/

### 2. Credenciales
- **Admin**: admin@verihome.com / admin123
- **Landlord**: landlord@example.com / testpass123
- **Tenant**: tenant@example.com / testpass123

## ✅ Funcionalidades a Probar

### 1. **Autenticación y Registro**
- [ ] Login con credenciales
- [ ] Registro nuevo usuario (Landlord/Tenant)
- [ ] Logout
- [ ] Recuperar contraseña

### 2. **Propiedades (Landlords)**
- [ ] Crear nueva propiedad
- [ ] Subir imágenes
- [ ] Editar propiedad
- [ ] Ver listado de propiedades
- [ ] Eliminar propiedad

### 3. **Búsqueda (Tenants)**
- [ ] Buscar propiedades por ubicación
- [ ] Filtrar por precio/tipo/amenidades
- [ ] Ver detalles de propiedad
- [ ] Agregar a favoritos
- [ ] Contactar al landlord

### 4. **Contratos Digitales**
- [ ] Crear nuevo contrato
- [ ] Firma digital (SignaturePad)
- [ ] Verificación biométrica
- [ ] Descargar PDF del contrato
- [ ] Ver historial de contratos

### 5. **Mensajería**
- [ ] Enviar mensaje
- [ ] Responder conversación
- [ ] Marcar como leído
- [ ] Buscar mensajes
- [ ] Notificaciones en tiempo real (WebSocket)

### 6. **Pagos**
- [ ] Crear solicitud de pago
- [ ] Pagar renta (Stripe/PayPal)
- [ ] Ver historial de pagos
- [ ] Descargar recibos
- [ ] Estado de pagos pendientes

### 7. **Calificaciones**
- [ ] Calificar propiedad (1-10 estrellas)
- [ ] Calificar landlord/tenant
- [ ] Ver calificaciones recibidas
- [ ] Promedio de calificaciones

### 8. **Dashboard**
- [ ] Widgets de estadísticas
- [ ] Gráficos (Chart.js)
- [ ] Actividad reciente
- [ ] Próximos pagos
- [ ] Propiedades populares

### 9. **Mapas**
- [ ] Ver propiedades en mapa (Mapbox)
- [ ] Buscar por dirección
- [ ] Vista de calle
- [ ] Filtrar por zona

### 10. **Notificaciones**
- [ ] Notificaciones push
- [ ] Centro de notificaciones
- [ ] Marcar como leídas
- [ ] Configurar preferencias

## 🔧 Características Técnicas

### WebSockets (Real-time)
- Mensajes en tiempo real
- Notificaciones instantáneas
- Estado de usuarios online
- Actualizaciones de contratos

### Seguridad
- JWT Authentication
- Verificación de email
- KYC badges
- Permisos por rol

### Exportación
- Exportar propiedades (Excel/PDF)
- Descargar contratos
- Reportes de pagos
- Facturas

## 📝 Notas de Testing

1. **Responsive**: Probar en móvil y desktop
2. **Performance**: Verificar tiempos de carga
3. **Errores**: Validar mensajes de error
4. **WebSockets**: Verificar conexión en Network tab

## 🐛 Problemas Conocidos

1. Redis no configurado (usando InMemoryChannelLayer)
2. Email SMTP requiere configuración
3. Stripe/PayPal en modo sandbox

## 🎯 Flujo de Prueba Recomendado

1. Registrar nuevo usuario
2. Completar perfil
3. Crear propiedad (si es landlord)
4. Buscar propiedades (si es tenant)
5. Contactar y negociar
6. Crear contrato digital
7. Firmar electrónicamente
8. Realizar pago
9. Calificar experiencia
10. Revisar dashboard