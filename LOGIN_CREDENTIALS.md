# Credenciales de Login para VeriHome

## Usuarios de Prueba

### Usuario 1 - Arrendador
- **Email:** wilsonderecho10@gmail.com
- **Contraseña:** TestPassword123!
- **Tipo:** Landlord (Arrendador)
- **Estado:** Email verificado ✓

### Usuario 2 - Arrendatario
- **Email:** letefon100@gmail.com
- **Contraseña:** TestPassword123!
- **Tipo:** Tenant (Arrendatario)
- **Estado:** Email verificado ✓

## Solución de Problemas

### Si no puedes iniciar sesión:

1. **Verifica las credenciales:**
   - Email y contraseña son sensibles a mayúsculas/minúsculas
   - La contraseña es: TestPassword123! (con el signo de exclamación)

2. **Limpia el caché del navegador:**
   - Abre las herramientas de desarrollador (F12)
   - Ve a la consola
   - Ejecuta: `localStorage.clear()`
   - Recarga la página

3. **Verifica que el servidor esté corriendo:**
   - Backend: `python manage.py runserver` (puerto 8000)
   - Frontend: `npm run dev` (puerto 5173)

## Email de Confirmación

Si necesitas el link de confirmación para el usuario letefon100@gmail.com:
```
http://localhost:3000/confirm-email/9ck6vvwexvsmbps7w6flc89iyyd0xsb6ltetsqvbw8amghssapirjdb29z8wtgjw
```

## Registro de Nuevos Usuarios

El registro está funcionando correctamente. Los nuevos usuarios:
1. Se registran en `/register`
2. Reciben un email de confirmación
3. Deben hacer clic en el enlace del email
4. Después pueden iniciar sesión

## Notas Importantes

- Ambos usuarios tienen sus emails verificados y pueden iniciar sesión
- Las contraseñas han sido reseteadas a TestPassword123!
- Si tienes problemas, revisa la consola del navegador para más detalles