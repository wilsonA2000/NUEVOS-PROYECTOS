# Configuración de Email para VeriHome

## Configuración del Correo Gmail

Para que VeriHome pueda enviar emails automáticamente, necesitas configurar el correo `verihomeadmi@gmail.com` con una contraseña de aplicación.

### Pasos para configurar Gmail:

1. **Habilitar la verificación en dos pasos:**
   - Ve a tu cuenta de Google
   - Navega a "Seguridad"
   - Habilita "Verificación en 2 pasos"

2. **Crear una contraseña de aplicación:**
   - Ve a "Seguridad" en tu cuenta de Google
   - Busca "Contraseñas de aplicación"
   - Selecciona "Otra" y nombra la aplicación como "VeriHome"
   - Google te generará una contraseña de 16 caracteres

3. **Configurar las variables de entorno:**
   Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```env
# Configuración de Email
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
EMAIL_HOST_USER=verihomeadmi@gmail.com
EMAIL_HOST_PASSWORD=tu_contraseña_de_aplicacion_aqui
DEFAULT_FROM_EMAIL=VeriHome <verihomeadmi@gmail.com>
SERVER_EMAIL=VeriHome <verihomeadmi@gmail.com>
```

### Tipos de emails que se enviarán:

1. **Confirmación de cuenta:** Cuando un usuario se registra
2. **Notificaciones de propiedades:** Creación, actualización, eliminación
3. **Notificaciones de contratos:** Firmas, vencimientos, renovaciones
4. **Notificaciones de pagos:** Confirmaciones, recordatorios
5. **Notificaciones de mensajes:** Nuevos mensajes entre usuarios
6. **Notificaciones del sistema:** Cambios importantes en la cuenta

### Prueba de configuración:

Para probar que el email está configurado correctamente, puedes ejecutar:

```bash
python manage.py shell
```

Y luego:

```python
from django.core.mail import send_mail
send_mail(
    'Prueba de VeriHome',
    'Este es un email de prueba para verificar la configuración.',
    'VeriHome <verihomeadmi@gmail.com>',
    ['tu_email@ejemplo.com'],
    fail_silently=False,
)
```

### Solución de problemas:

- **Error de autenticación:** Asegúrate de usar la contraseña de aplicación, no tu contraseña normal
- **Error de conexión:** Verifica que el puerto 587 esté abierto
- **Emails no llegan:** Revisa la carpeta de spam del destinatario

### Seguridad:

- Nunca compartas la contraseña de aplicación
- Usa siempre HTTPS en producción
- Considera usar servicios como SendGrid o Amazon SES para producción 