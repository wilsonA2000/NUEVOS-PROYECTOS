# Checklist de Pruebas - Módulo de Propiedades

## 1. AUTENTICACIÓN Y AUTORIZACIÓN

### 1.1 Acceso sin autenticación
- [ ] Intentar acceder a listado de propiedades sin login → Debe redirigir a login
- [ ] Intentar acceder a detalle de propiedad sin login → Debe redirigir a login
- [ ] Intentar crear propiedad sin login → Debe redirigir a login
- [ ] Intentar editar propiedad sin login → Debe redirigir a login

### 1.2 Acceso con autenticación
- [ ] Usuario arrendador puede acceder a todas las funcionalidades de propiedades
- [ ] Usuario arrendatario puede acceder solo a funcionalidades de visualización
- [ ] Usuario service_provider tiene acceso limitado

## 2. ROL ARRENDADOR (LANDLORD)

### 2.1 Gestión de Propiedades
- [ ] **Crear nueva propiedad**
  - [ ] Formulario de creación funciona correctamente
  - [ ] Validación de campos obligatorios
  - [ ] Subida de imágenes funciona
  - [ ] Subida de videos funciona
  - [ ] Asignación de amenidades funciona
  - [ ] Propiedad se crea con estado "available"
  - [ ] Propiedad aparece en "Mis Propiedades"

- [ ] **Editar propiedad existente**
  - [ ] Solo puede editar sus propias propiedades
  - [ ] Formulario de edición carga datos correctos
  - [ ] Cambios se guardan correctamente
  - [ ] No puede editar propiedades de otros arrendadores

- [ ] **Eliminar propiedad**
  - [ ] Solo puede eliminar sus propias propiedades
  - [ ] Confirmación antes de eliminar
  - [ ] Propiedad se elimina correctamente

- [ ] **Activar/Desactivar propiedad**
  - [ ] Puede activar propiedades desactivadas
  - [ ] Puede desactivar propiedades activas
  - [ ] Cambio de estado se refleja inmediatamente

### 2.2 Gestión de Imágenes
- [ ] **Subir imágenes**
  - [ ] Múltiples formatos (JPG, PNG, WebP)
  - [ ] Validación de tamaño de archivo
  - [ ] Validación de dimensiones
  - [ ] Imágenes se guardan correctamente

- [ ] **Gestionar imágenes**
  - [ ] Marcar imagen como principal
  - [ ] Eliminar imágenes
  - [ ] Reordenar imágenes
  - [ ] Vista previa de imágenes

### 2.3 Gestión de Videos
- [ ] **Subir videos**
  - [ ] Formatos soportados (MP4, WebM)
  - [ ] Validación de tamaño
  - [ ] Validación de duración
  - [ ] Videos se guardan correctamente

- [ ] **Gestionar videos**
  - [ ] Eliminar videos
  - [ ] Vista previa de videos
  - [ ] Configurar video principal

### 2.4 Gestión de Amenidades
- [ ] **Asignar amenidades**
  - [ ] Lista de amenidades disponibles
  - [ ] Selección múltiple funciona
  - [ ] Amenidades se guardan correctamente

- [ ] **Editar amenidades**
  - [ ] Modificar amenidades existentes
  - [ ] Cambios se reflejan inmediatamente

### 2.5 Consultas Recibidas
- [ ] **Ver consultas**
  - [ ] Lista de consultas de sus propiedades
  - [ ] Filtros por estado (nueva, contactado, etc.)
  - [ ] Búsqueda en consultas

- [ ] **Responder consultas**
  - [ ] Formulario de respuesta
  - [ ] Respuesta se envía correctamente
  - [ ] Estado de consulta cambia a "respondido"

- [ ] **Gestionar consultas**
  - [ ] Marcar como contactado
  - [ ] Programar visita
  - [ ] Cerrar consulta

### 2.6 Estadísticas y Analytics
- [ ] **Vistas de propiedades**
  - [ ] Contador de vistas funciona
  - [ ] Historial de vistas
  - [ ] Gráficos de tendencias

- [ ] **Favoritos**
  - [ ] Contador de favoritos
  - [ ] Lista de usuarios que marcaron como favorito

- [ ] **Reportes**
  - [ ] Propiedades más vistas
  - [ ] Propiedades más favoritas
  - [ ] Consultas por propiedad

## 3. ROL ARRENDATARIO (TENANT)

### 3.1 Visualización de Propiedades
- [ ] **Listado de propiedades**
  - [ ] Ver todas las propiedades disponibles
  - [ ] Filtros funcionan correctamente
  - [ ] Búsqueda funciona
  - [ ] Paginación funciona
  - [ ] Ordenamiento funciona

- [ ] **Detalle de propiedad**
  - [ ] Información completa se muestra
  - [ ] Galería de imágenes funciona
  - [ ] Videos se reproducen
  - [ ] Amenidades se muestran
  - [ ] Información de contacto del arrendador

### 3.2 Búsqueda y Filtros
- [ ] **Filtros básicos**
  - [ ] Por tipo de propiedad
  - [ ] Por rango de precio
  - [ ] Por ubicación (ciudad, estado)
  - [ ] Por número de habitaciones
  - [ ] Por amenidades

- [ ] **Filtros avanzados**
  - [ ] Por fecha de disponibilidad
  - [ ] Por características específicas
  - [ ] Por transporte cercano
  - [ ] Por servicios incluidos

- [ ] **Búsqueda por texto**
  - [ ] Búsqueda en título
  - [ ] Búsqueda en descripción
  - [ ] Búsqueda en dirección

### 3.3 Interacciones
- [ ] **Marcar como favorito**
  - [ ] Agregar a favoritos
  - [ ] Quitar de favoritos
  - [ ] Lista de favoritos
  - [ ] Contador de favoritos

- [ ] **Consultar propiedad**
  - [ ] Formulario de consulta
  - [ ] Validación de campos
  - [ ] Consulta se envía correctamente
  - [ ] Confirmación de envío

- [ ] **Compartir propiedad**
  - [ ] Enlaces de compartir
  - [ ] Redes sociales
  - [ ] Correo electrónico

### 3.4 Comparación
- [ ] **Comparar propiedades**
  - [ ] Agregar a comparación
  - [ ] Quitar de comparación
  - [ ] Vista de comparación
  - [ ] Límite de propiedades a comparar

### 3.5 Búsquedas Guardadas
- [ ] **Guardar búsqueda**
  - [ ] Guardar criterios de búsqueda
  - [ ] Nombrar búsqueda
  - [ ] Lista de búsquedas guardadas

- [ ] **Gestionar búsquedas**
  - [ ] Ejecutar búsqueda guardada
  - [ ] Eliminar búsqueda guardada
  - [ ] Editar búsqueda guardada

### 3.6 Alertas
- [ ] **Crear alertas**
  - [ ] Configurar criterios de alerta
  - [ ] Frecuencia de notificaciones
  - [ ] Método de notificación

- [ ] **Gestionar alertas**
  - [ ] Lista de alertas activas
  - [ ] Editar alertas
  - [ ] Eliminar alertas

## 4. FUNCIONALIDADES COMUNES

### 4.1 Propiedades Destacadas
- [ ] **Vista de destacadas**
  - [ ] Propiedades destacadas se muestran
  - [ ] Rotación de destacadas
  - [ ] Enlaces funcionan correctamente

### 4.2 Propiedades en Tendencia
- [ ] **Vista de tendencias**
  - [ ] Propiedades más populares
  - [ ] Basado en vistas y favoritos
  - [ ] Actualización automática

### 4.3 Mapa de Propiedades
- [ ] **Vista de mapa**
  - [ ] Propiedades se muestran en mapa
  - [ ] Marcadores funcionan
  - [ ] Información en popup
  - [ ] Filtros en mapa

### 4.4 Tour Virtual
- [ ] **Tour virtual**
  - [ ] Imágenes 360°
  - [ ] Navegación funciona
  - [ ] Carga correctamente

## 5. VALIDACIONES Y ERRORES

### 5.1 Validaciones de Formularios
- [ ] **Campos obligatorios**
  - [ ] Título de propiedad
  - [ ] Descripción
  - [ ] Tipo de propiedad
  - [ ] Dirección
  - [ ] Precio

- [ ] **Validaciones de datos**
  - [ ] Precios positivos
  - [ ] Fechas válidas
  - [ ] Números de habitaciones válidos
  - [ ] Códigos postales válidos

### 5.2 Manejo de Errores
- [ ] **Errores de servidor**
  - [ ] Página 404 para propiedades inexistentes
  - [ ] Página 403 para acceso no autorizado
  - [ ] Mensajes de error claros

- [ ] **Errores de validación**
  - [ ] Mensajes específicos por campo
  - [ ] Formularios mantienen datos
  - [ ] Indicadores visuales de error

## 6. RENDIMIENTO Y UX

### 6.1 Rendimiento
- [ ] **Carga de páginas**
  - [ ] Listado carga en < 3 segundos
  - [ ] Detalle carga en < 2 segundos
  - [ ] Imágenes se optimizan

- [ ] **Paginación**
  - [ ] Carga incremental funciona
  - [ ] No hay duplicados
  - [ ] Contador total correcto

### 6.2 Experiencia de Usuario
- [ ] **Responsive design**
  - [ ] Funciona en móvil
  - [ ] Funciona en tablet
  - [ ] Funciona en desktop

- [ ] **Accesibilidad**
  - [ ] Navegación por teclado
  - [ ] Lectores de pantalla
  - [ ] Contraste de colores

## 7. INTEGRACIÓN CON OTROS MÓDULOS

### 7.1 Contratos
- [ ] **Propiedades con contratos**
  - [ ] Estado se actualiza automáticamente
  - [ ] No se pueden editar propiedades con contratos activos
  - [ ] Historial de contratos visible

### 7.2 Mensajería
- [ ] **Contacto con arrendador**
  - [ ] Envío de mensajes desde consultas
  - [ ] Notificaciones de respuestas
  - [ ] Historial de conversaciones

### 7.3 Pagos
- [ ] **Propiedades con pagos**
  - [ ] Estado de pagos visible
  - [ ] Historial de transacciones
  - [ ] Facturas disponibles

## 8. SEGURIDAD

### 8.1 Autorización
- [ ] **Acceso a datos**
  - [ ] Solo arrendadores ven sus propiedades completas
  - [ ] Arrendatarios solo ven propiedades públicas
  - [ ] No hay acceso a datos privados

### 8.2 Validación de Entrada
- [ ] **Sanitización**
  - [ ] XSS prevenido
  - [ ] SQL injection prevenido
  - [ ] CSRF protegido

### 8.3 Archivos
- [ ] **Subida de archivos**
  - [ ] Tipos de archivo validados
  - [ ] Tamaños limitados
  - [ ] Virus scanning (si aplica)

## 9. LOGGING Y AUDITORÍA

### 9.1 Actividad de Usuario
- [ ] **Logs de actividad**
  - [ ] Creación de propiedades
  - [ ] Edición de propiedades
  - [ ] Consultas realizadas
  - [ ] Favoritos agregados

### 9.2 Auditoría
- [ ] **Cambios de estado**
  - [ ] Activación/desactivación
  - [ ] Cambios de precio
  - [ ] Modificaciones de datos

## 10. TESTING AUTOMATIZADO

### 10.1 Tests Unitarios
- [ ] **Modelos**
  - [ ] Creación de propiedades
  - [ ] Validaciones de modelo
  - [ ] Métodos personalizados

- [ ] **Serializers**
  - [ ] Serialización correcta
  - [ ] Deserialización correcta
  - [ ] Validaciones de serializer

### 10.2 Tests de Integración
- [ ] **APIs**
  - [ ] Endpoints funcionan
  - [ ] Permisos correctos
  - [ ] Respuestas correctas

- [ ] **Vistas**
  - [ ] Templates se renderizan
  - [ ] Contexto correcto
  - [ ] Redirecciones funcionan

### 10.3 Tests End-to-End
- [ ] **Flujos completos**
  - [ ] Crear propiedad como arrendador
  - [ ] Consultar propiedad como arrendatario
  - [ ] Gestionar favoritos
  - [ ] Búsqueda y filtros

---

## NOTAS DE IMPLEMENTACIÓN

- **Prioridad Alta**: Funcionalidades core (CRUD, permisos, validaciones)
- **Prioridad Media**: UX, rendimiento, integraciones
- **Prioridad Baja**: Analytics, alertas, comparación

- **Roles de prueba**:
  - Arrendador: `landlord@test.com`
  - Arrendatario: `tenant@test.com`
  - Service Provider: `provider@test.com`
  - Admin: `admin@test.com` 