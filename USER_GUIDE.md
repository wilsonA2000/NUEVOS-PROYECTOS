# Guía de Usuario - VeriHome

## 🚀 Estado Actual del Sistema

### ✅ Funcionalidades Completadas

1. **Sistema de Autenticación**
   - Login funcional con JWT
   - Registro de usuarios con confirmación por email
   - Verificación de email funcionando
   - Contraseñas reseteadas para pruebas

2. **Perfiles de Usuario**
   - Creación automática de perfiles según tipo de usuario
   - Serializers completos para toda la información
   - Endpoint `/api/v1/users/auth/me/` devuelve perfil completo

3. **Email de Confirmación**
   - Envío automático al registrarse
   - Página de confirmación en React
   - Verificación exitosa permite login

## 📝 Cómo Usar la Aplicación

### 1. Iniciar Sesión

**Credenciales de Prueba:**

**Usuario Arrendador:**
- Email: `wilsonderecho10@gmail.com`
- Contraseña: `TestPassword123!`

**Usuario Arrendatario:**
- Email: `letefon100@gmail.com`
- Contraseña: `TestPassword123!`

### 2. Registro de Nuevo Usuario

1. Ir a `/register`
2. Completar el formulario con:
   - Nombre y apellido
   - Email válido
   - Contraseña (mínimo 8 caracteres)
   - Tipo de usuario (Arrendador/Arrendatario/Proveedor)
   - Teléfono

3. Después del registro:
   - Recibirás un email de confirmación
   - Haz clic en el enlace del email
   - Serás redirigido a la página de confirmación
   - Luego podrás iniciar sesión

### 3. Ver Perfil Completo

Después de iniciar sesión, el endpoint `/api/v1/users/auth/me/` devuelve:

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "first_name": "Nombre",
  "last_name": "Apellido",
  "user_type": "landlord|tenant|service_provider",
  "landlord_profile": {...},  // Solo si es arrendador
  "tenant_profile": {...},     // Solo si es arrendatario
  "service_provider_profile": {...}, // Solo si es proveedor
  "user_settings": {...},
  "user_resume": {...}
}
```

## 🔧 Solución de Problemas

### Error de Conexión al Iniciar Sesión

1. **Verificar credenciales:**
   - Email exacto (sensible a mayúsculas)
   - Contraseña: `TestPassword123!`

2. **Limpiar caché:**
   ```javascript
   localStorage.clear()
   ```

3. **Verificar servidores:**
   - Backend: `http://localhost:8000`
   - Frontend: `http://localhost:5173`

### Email de Confirmación No Llega

1. Revisar carpeta de spam
2. Verificar configuración SMTP en settings.py
3. Usar el comando manual:
   ```bash
   python manage.py resend_confirmation tu_email@gmail.com
   ```

## 📊 Próximas Funcionalidades

### Dashboard (En desarrollo)
- Estadísticas generales
- Métricas por usuario
- Actividad reciente
- Reportes personalizables

### Sistema de Pagos
- Múltiples métodos de pago
- Escrow para seguridad
- Facturación automática
- Integración con Stripe/PayPal

### Sistema de Contratos
- Contratos digitales
- Firma digital con webcam
- Flujos automatizados
- Permisos por rol

### Sistema de Mensajería
- Chat en tiempo real
- Organización tipo Gmail
- Estados de lectura
- Búsqueda avanzada

## 🛠️ Comandos Útiles

### Backend
```bash
# Activar entorno virtual
source venv/Scripts/activate  # Windows
source venv/bin/activate      # Linux/Mac

# Iniciar servidor
python manage.py runserver

# Crear superusuario
python manage.py createsuperuser

# Verificar email manualmente
python manage.py verify_emails.py

# Crear perfiles faltantes
python manage.py create_user_profiles.py
```

### Frontend
```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Build para producción
npm run build
```

## 📚 Estructura de la Base de Datos

### Modelos Principales

1. **User**: Usuario base con autenticación
2. **LandlordProfile**: Perfil de arrendador
3. **TenantProfile**: Perfil de arrendatario
4. **ServiceProviderProfile**: Perfil de proveedor
5. **UserSettings**: Configuración de usuario
6. **UserResume**: Hoja de vida
7. **Property**: Propiedades (en desarrollo)
8. **Contract**: Contratos (en desarrollo)
9. **Payment**: Pagos (en desarrollo)
10. **Rating**: Calificaciones (en desarrollo)

## 🔐 Seguridad

- Autenticación JWT con tokens de acceso y refresco
- Verificación de email obligatoria
- Contraseñas hasheadas con Django
- CORS configurado para desarrollo
- Permisos por tipo de usuario

## 📞 Soporte

Si encuentras problemas:
1. Revisa los logs del servidor
2. Verifica la consola del navegador
3. Consulta esta guía
4. Reporta issues en el repositorio