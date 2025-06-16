# Sistema de Calificaciones VeriHome

Este módulo implementa un sistema completo de calificaciones y reseñas para la plataforma VeriHome, permitiendo a los usuarios calificar a otros usuarios con los que han tenido una relación contractual.

## Características Principales

- **Calificaciones de 1-10 estrellas**: Sistema de calificación con escala de 1 a 10 estrellas.
- **Calificaciones por categorías**: Permite calificar aspectos específicos como comunicación, confiabilidad, puntualidad, etc.
- **Restricción por relación contractual**: Solo se permite calificar a usuarios con los que se ha tenido una relación contractual.
- **Respuestas a calificaciones**: Los usuarios calificados pueden responder a las calificaciones recibidas.
- **Reportes de calificaciones inapropiadas**: Sistema para reportar calificaciones que violen las políticas.
- **Perfiles de calificación**: Cada usuario tiene un perfil que muestra estadísticas de sus calificaciones.
- **Badges de reconocimiento**: Sistema de badges basado en las calificaciones recibidas.

## Modelos

- **Rating**: Calificación principal con puntuación general, título y comentarios.
- **RatingCategory**: Calificaciones específicas por categoría (comunicación, confiabilidad, etc.).
- **RatingResponse**: Respuestas a las calificaciones.
- **RatingReport**: Reportes de calificaciones inapropiadas.
- **UserRatingProfile**: Perfil de calificaciones con estadísticas agregadas.
- **RatingInvitation**: Invitaciones para calificar después de completar un contrato.

## Flujo de Calificación

1. Un usuario completa un contrato con otro usuario.
2. El sistema permite que ambos usuarios se califiquen mutuamente.
3. El usuario calificado puede responder a la calificación.
4. Las estadísticas de calificación se actualizan automáticamente.
5. Se generan badges basados en las calificaciones recibidas.

## API REST

El módulo incluye una API REST completa para:

- Listar y crear calificaciones
- Ver detalles de calificaciones
- Responder a calificaciones
- Reportar calificaciones inapropiadas
- Obtener perfiles de calificación de usuarios

## Integración con Otros Módulos

- **Contratos**: Las calificaciones están vinculadas a contratos específicos.
- **Propiedades**: Las calificaciones pueden estar asociadas a propiedades.
- **Usuarios**: Las calificaciones se realizan entre usuarios con diferentes roles.

## Uso

### Calificar a un Usuario

Para calificar a un usuario, debe existir un contrato entre ambos usuarios:

1. Navegar al perfil del usuario a calificar
2. Hacer clic en "Calificar"
3. Seleccionar el contrato relacionado
4. Completar el formulario de calificación con puntuación general y por categorías
5. Enviar la calificación

### Ver Calificaciones Recibidas

1. Acceder al panel de calificaciones
2. Ver la pestaña "Calificaciones Recibidas"

### Responder a una Calificación

1. Acceder al detalle de la calificación
2. Hacer clic en "Responder"
3. Escribir la respuesta
4. Enviar la respuesta

## Consideraciones de Seguridad

- Solo se permite calificar a usuarios con los que se ha tenido una relación contractual
- Las calificaciones pueden ser anónimas si el usuario lo desea
- Las calificaciones pueden ser privadas o públicas
- El sistema de moderación permite revisar calificaciones reportadas

## Personalización

El sistema de calificaciones puede personalizarse a través de la configuración en `settings.py`:

```python
VERIHOME_SETTINGS = {
    'RATING_SCALE': (1, 10),  # Escala de calificación
    # Otras configuraciones...
}
```