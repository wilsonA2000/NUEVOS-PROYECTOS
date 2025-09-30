# Scripts de Testing - Perfil de Usuario

## Descripción
Scripts para probar la funcionalidad de edición de perfil de usuario y subida de avatar.

## Scripts Disponibles

### test_profile_quick.py
Prueba la actualización completa del perfil de usuario.

**Funcionalidad:**
- Login con usuario existente
- Obtención del perfil actual
- Actualización de múltiples campos del perfil
- Verificación de que los cambios se guardaron correctamente

**Campos probados:**
- first_name
- last_name
- phone_number
- whatsapp
- city
- state
- country

**Uso:**
```bash
python3 testing_scripts/test_profile_quick.py
```

### test_avatar_upload.py
Prueba la subida de avatar de usuario.

**Funcionalidad:**
- Login con usuario existente
- Creación de imagen de prueba (100x100 píxeles)
- Subida de avatar vía API
- Verificación de URL del avatar subido

**Uso:**
```bash
python3 testing_scripts/test_avatar_upload.py
```

## Resultados de Pruebas

### ✅ PRUEBAS EXITOSAS (Ejecutadas el 06/07/2025)

**Actualización de Perfil:**
- ✅ Login funcional
- ✅ Obtención de perfil actual
- ✅ Actualización de 7 campos diferentes
- ✅ Verificación de persistencia de cambios

**Subida de Avatar:**
- ✅ Login funcional
- ✅ Creación de imagen de prueba
- ✅ Subida exitosa de avatar
- ✅ Generación de URL de avatar

## Configuración Requerida

**Usuario de Prueba:**
- Email: admin@verihome.com
- Password: admin123

**Servidor Backend:**
- URL: http://localhost:8000/api/v1
- Estado: Debe estar ejecutándose

## Soluciones Implementadas

### Problema Original
Los cambios en el perfil no se guardaban a pesar de mostrar mensaje de éxito.

### Causa
El `UserProfileSerializer` solo incluía 4 campos (`first_name`, `last_name`, `email`, `phone_number`) pero el frontend enviaba muchos más campos.

### Solución
1. **Actualizado UserProfileSerializer** para incluir todos los campos del modelo User
2. **Agregado campo avatar** al modelo User con ImageField
3. **Implementado upload de avatar** con validación de tipos de archivo
4. **Configuración de archivos multimedia** ya estaba presente en settings.py

### Archivos Modificados
- `users/models/user.py` - Agregado campo avatar
- `users/serializers.py` - Expandido UserProfileSerializer
- `frontend/src/pages/Profile.tsx` - Implementado upload de avatar
- `users/migrations/0006_user_avatar.py` - Migración para campo avatar

## Comandos de Verificación

```bash
# Verificar que el servidor esté corriendo
curl http://localhost:8000/api/v1/users/auth/login/

# Ejecutar todas las pruebas
python3 testing_scripts/test_profile_quick.py
python3 testing_scripts/test_avatar_upload.py

# Verificar archivos subidos
ls media/avatars/
```