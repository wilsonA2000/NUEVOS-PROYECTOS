# GUÍA DE TESTING MANUAL DETALLADA - VERIHOME
**Fecha**: 16 de noviembre de 2025
**Versión**: 1.0.0
**Credenciales de Testing Configuradas**: ✅

---

## CREDENCIALES DE TESTING

```
✅ ARRENDADOR:    admin@verihome.com / admin123
✅ ARRENDATARIO:  letefon100@gmail.com / adim123
✅ PRESTADOR:     serviceprovider@verihome.com / service123
```

**Estado del Sistema**:
- ✅ Backend Django: `http://localhost:8000` (corriendo)
- ✅ Frontend React: `http://localhost:5173` (debe estar corriendo)
- ✅ Base de datos: Sincronizada
- ✅ Usuarios de testing: Creados y verificados

---

## 🚀 INSTRUCCIONES PREVIAS

### 1. Verificar que el frontend esté corriendo:
```bash
cd frontend
npm run dev
# Debe abrir en http://localhost:5173
```

### 2. Tener navegador listo:
- Chrome/Edge/Firefox en modo incógnito (para sesión limpia)
- Consola de DevTools abierta (F12)
- Tab "Network" visible para monitorear requests

### 3. Preparar documentación:
- Notepad/Word abierto para documentar hallazgos
- Screenshots listos (Windows: Win+Shift+S)

---

## USER JOURNEY #1: LANDLORD - CREAR PROPIEDAD → CONTRATO → BIOMÉTRICA

**Objetivo**: Verificar flujo completo de arrendador desde creación de propiedad hasta autenticación biométrica.

**Tiempo estimado**: 15-20 minutos

### PASO 1: LOGIN COMO ARRENDADOR

1. ✅ Abrir `http://localhost:5173`
2. ✅ Click en "Iniciar Sesión"
3. ✅ Ingresar credenciales:
   - Email: `admin@verihome.com`
   - Password: `admin123`
4. ✅ Click "Iniciar Sesión"

**Validaciones**:
- ✅ Redirección a `/app/dashboard`
- ✅ Nombre de usuario visible: "Admin VeriHome"
- ✅ Rol mostrado: "Arrendador"
- ✅ Sin errores en consola

**Screenshot esperado**: Dashboard con widgets de arrendador

---

### PASO 2: CREAR NUEVA PROPIEDAD

1. ✅ Click en menú lateral "Propiedades"
2. ✅ Click botón "+ Nueva Propiedad"
3. ✅ Llenar formulario (Step 1: Información Básica):
   ```
   Título: Apartamento de Prueba Testing
   Descripción: Propiedad creada para testing manual del sistema
   Tipo: Apartamento
   Estado: Disponible
   ```

4. ✅ Click "Siguiente"

5. ✅ Llenar Step 2 (Ubicación):
   ```
   Dirección: Calle 100 #15-20
   Ciudad: Bogotá
   Departamento: Cundinamarca
   Código Postal: 110111
   ```
   - ✅ Verificar que mapa de Mapbox aparece
   - ✅ Verificar marcador en el mapa

6. ✅ Click "Siguiente"

7. ✅ Llenar Step 3 (Detalles):
   ```
   Área (m²): 80
   Habitaciones: 2
   Baños: 2
   Pisos: 1
   Año construcción: 2020
   Precio mensual: $1,500,000
   Depósito: $1,500,000
   ```

8. ✅ Click "Siguiente"

9. ✅ Step 4 (Imágenes):
   - ✅ Click "Seleccionar Imágenes" o arrastrar archivos
   - ✅ Subir 2-3 imágenes (JPG/PNG, < 5MB cada una)
   - ✅ Verificar:
     - Preview de imágenes aparece
     - Tamaño comprimido mostrado
     - Opción de reordenar visible
     - Seleccionar "Imagen Principal"

**Validaciones de Imágenes**:
- ✅ Drag & drop funciona
- ✅ Compresión automática a 1920x1080
- ✅ Progress bar visible
- ✅ Reordenamiento con drag funciona
- ✅ Main image tiene indicador visual

10. ✅ Click "Siguiente"

11. ✅ Step 5 (Amenidades):
    - ✅ Seleccionar 3-5 amenidades:
      - Parqueadero
      - Ascensor
      - Zona social
      - WiFi
      - Seguridad 24/7

12. ✅ Click "Guardar Propiedad"

**Validaciones**:
- ✅ Mensaje de éxito: "Propiedad creada exitosamente"
- ✅ Redirección a `/app/properties`
- ✅ Nueva propiedad visible en lista
- ✅ HTTP 201 en Network tab
- ✅ Sin errores en consola

**Screenshot esperado**: Lista de propiedades con nueva propiedad creada

---

### PASO 3: CREAR CONTRATO DESDE PROPIEDAD

1. ✅ En lista de propiedades, buscar "Apartamento de Prueba Testing"
2. ✅ Click en botón "⋮" (menú de acciones)
3. ✅ Click "Crear Contrato"
4. ✅ Verificar que se abre formulario de contrato con datos pre-llenados:
   - Propiedad ya seleccionada ✓
   - Dirección auto-completada ✓
   - Precio mensual ✓

**IMPORTANTE**: Si formulario NO tiene propiedad pre-seleccionada:
- ❌ BUG IDENTIFICADO: Propiedad no se pre-llena
- Solución temporal: Seleccionar propiedad manualmente del dropdown

5. ✅ Llenar Step 1 (Detalles de la Propiedad):
   - Verificar que datos estén correctos
   - Click "Siguiente"

6. ✅ Llenar Step 2 (Información del Arrendatario):
   ```
   Email: letefon100@gmail.com
   Nombre completo: Leidy Tenant
   Teléfono: +57 300 123 4567
   ```

7. ✅ Click "Siguiente"

8. ✅ Llenar Step 3 (Términos del Contrato):
   ```
   Duración (meses): 12
   Día de pago: 5
   Fecha inicio: [HOY + 7 días]
   ☐ Mascotas permitidas
   ☐ Fumar permitido
   ☑ Servicios incluidos
   ```

9. ✅ Click "Siguiente"

10. ✅ Step 4 (Garantías):
    - Seleccionar tipo: "Codeudor con Salario"
    - Llenar datos del codeudor:
      ```
      Nombre: Juan Codeudor
      Email: codeudor@test.com
      Teléfono: +57 300 999 8888
      Empresa: Empresa Test SAS
      Cargo: Gerente
      Ingresos mensuales: $4,000,000
      ```

11. ✅ Click "Siguiente"

12. ✅ Step 5 (Cláusulas Especiales):
    - ✅ Verificar que cláusulas legales aparecen (Colombian Law 820)
    - ✅ Agregar cláusula custom: "El arrendatario se compromete a mantener limpio el inmueble"

13. ✅ Click "Siguiente"

14. ✅ Step 6 (Revisión y Confirmación):
    - ✅ Verificar resumen completo del contrato
    - ✅ Click "Ver Borrador del Contrato"

**Validaciones**:
- ✅ Se abre nueva pestaña con PDF profesional
- ✅ PDF tiene diseño notarial con Diosa Temis
- ✅ Todos los datos visibles correctamente
- ✅ Cláusulas legales presentes
- ✅ Firmas en blanco (aún sin autenticar)

15. ✅ Cerrar pestaña de PDF
16. ✅ Click "Crear Contrato"

**Validaciones**:
- ✅ Mensaje: "Contrato creado exitosamente"
- ✅ Redirección a dashboard de contratos
- ✅ Nuevo contrato visible
- ✅ Estado: "pending_tenant_biometric" o "pending_tenant_review"

**Screenshot esperado**: Dashboard de contratos con nuevo contrato creado

---

### PASO 4: APROBAR CONTRATO COMO ARRENDADOR

**IMPORTANTE**: Primero el arrendatario debe aprobar. Vamos a simular esto haciendo login como arrendatario.

#### 4.1: Logout Arrendador

1. ✅ Click en avatar/menú de usuario (esquina superior derecha)
2. ✅ Click "Cerrar Sesión"

#### 4.2: Login como Arrendatario

1. ✅ Login con:
   - Email: `letefon100@gmail.com`
   - Password: `adim123`

2. ✅ Ir a "Contratos" en menú lateral
3. ✅ Buscar contrato creado (debe estar con estado "Pendiente de Revisión")
4. ✅ Click en el contrato
5. ✅ Click "Aprobar Contrato"
6. ✅ Confirmar aprobación

**Validaciones**:
- ✅ Estado cambia a "pending_landlord_review" o "pending_biometric"
- ✅ Mensaje de éxito visible

#### 4.3: Logout Arrendatario y Re-login Arrendador

1. ✅ Logout
2. ✅ Login como arrendador (`admin@verihome.com` / `admin123`)
3. ✅ Ir a "Contratos"
4. ✅ Buscar contrato - debe estar "Pendiente de Aprobación de Arrendador"
5. ✅ Click en contrato
6. ✅ Click "Aprobar Contrato"

**Validaciones**:
- ✅ Estado cambia a "pending_tenant_biometric"
- ✅ Flujo biométrico habilitado

---

### PASO 5: AUTENTICACIÓN BIOMÉTRICA (SECUENCIAL)

**Orden secuencial obligatorio**: Tenant → Guarantor (si aplica) → Landlord

#### 5.1: Tenant Completa Autenticación Biométrica

1. ✅ Logout y login como arrendatario
2. ✅ Ir a contrato aprobado
3. ✅ Click "Iniciar Autenticación Biométrica"

**Step 1: Face Capture**
1. ✅ Permitir acceso a cámara
2. ✅ Verificar:
   - Cámara visible (400px altura)
   - Badge "🟢 EN VIVO"
   - Borde verde alrededor
3. ✅ Capturar foto frontal
4. ✅ Capturar foto lateral
5. ✅ Verificar confidence score > 70%

**Validaciones**:
- ✅ Fotos se guardan como archivos
- ✅ Confidence score calculado
- ✅ Sin errores en consola

**Step 2: Document Verification**
1. ✅ Seleccionar tipo: "Cédula de Ciudadanía"
2. ✅ Subir foto de documento
3. ✅ Click "✨ Smart Fill" (extracción automática)
4. ✅ Verificar:
   - Número de documento se auto-llena
   - Nombre extraído
   - Fecha expedición

**Step 3: Combined Verification**
1. ✅ Capturar foto con documento en mano
2. ✅ Verificar validación cruzada documento + rostro

**Step 4: Voice Recording**
1. ✅ Leer frase del contrato mostrada
2. ✅ Click "Iniciar Grabación"
3. ✅ Grabar por 5-10 segundos
4. ✅ Click "Detener Grabación"
5. ✅ Verificar waveform visualization
6. ✅ Verificar transcripción simulada

**Step 5: Digital Signature**
1. ✅ Firmar en canvas con mouse/touch
2. ✅ Aceptar términos y condiciones
3. ✅ Click "Completar Autenticación"

**Validaciones Finales**:
- ✅ Mensaje: "¡Autenticación biométrica completada exitosamente!"
- ✅ Estado de contrato: "pending_landlord_biometric"
- ✅ Datos biométricos guardados en BD
- ✅ HTTP 200 en todas las llamadas

#### 5.2: Landlord Completa Autenticación Biométrica

1. ✅ Logout y login como arrendador
2. ✅ Ir a contrato
3. ✅ Verificar que ahora muestra "Tu turno de autenticación"
4. ✅ Repetir los 5 pasos biométricos (igual que tenant)

**Validaciones Finales**:
- ✅ Estado: "completed_biometric" o "active"
- ✅ Contrato "nació a la vida jurídica"
- ✅ PDF final con todas las firmas digitales

**Screenshot esperado**: Contrato con estado "Activo" y todas las firmas completadas

---

### RESUMEN DE VALIDACIONES USER JOURNEY #1

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| Login arrendador | ⬜ | |
| Crear propiedad | ⬜ | |
| Upload imágenes | ⬜ | |
| Drag & drop funciona | ⬜ | |
| Compresión automática | ⬜ | |
| Crear contrato | ⬜ | |
| Pre-fill propiedad | ⬜ | |
| Aprobar como tenant | ⬜ | |
| Aprobar como landlord | ⬜ | |
| Biométrica tenant | ⬜ | |
| Biométrica landlord | ⬜ | |
| Orden secuencial | ⬜ | |
| PDF final generado | ⬜ | |

---

## USER JOURNEY #2: TENANT - SOLICITUD DE MATCHING

**Objetivo**: Verificar flujo de arrendatario buscando propiedad y creando match request.

**Tiempo estimado**: 10-15 minutos

### PASO 1: LOGIN COMO ARRENDATARIO

1. ✅ Login con `letefon100@gmail.com` / `adim123`
2. ✅ Verificar dashboard de arrendatario

### PASO 2: BUSCAR PROPIEDADES

1. ✅ Ir a "Propiedades" en menú
2. ✅ Verificar:
   - Lista de propiedades disponibles visible
   - Filtros funcionan
   - Cards responsivas (mobile/desktop)

3. ✅ Buscar "Apartamento de Prueba Testing"
4. ✅ Click en propiedad para ver detalles

**Validaciones**:
- ✅ Imágenes cargadas correctamente
- ✅ Galería funcional
- ✅ Datos completos (precio, área, amenidades)
- ✅ Botón "Solicitar Visita" o "Aplicar" visible

### PASO 3: CREAR MATCH REQUEST

1. ✅ Click "Aplicar a esta Propiedad" o "Solicitar Matching"
2. ✅ Llenar formulario:
   ```
   Mensaje al arrendador: Estoy muy interesado en esta propiedad
   Ingresos mensuales: $2,500,000
   Tipo de empleo: Empleado tiempo completo
   Fecha mudanza preferida: [HOY + 30 días]
   Duración contrato: 12 meses
   Número de ocupantes: 2
   ☐ Tengo mascotas
   ☑ Tengo referencias de arrendamiento
   ☑ Tengo comprobante de ingresos
   ```

3. ✅ Click "Enviar Solicitud"

**Validaciones**:
- ✅ Mensaje: "Solicitud enviada exitosamente"
- ✅ Match request visible en "Mis Solicitudes"
- ✅ Estado: "pending" o "awaiting_landlord_review"
- ✅ Ingresos mensuales se muestran correctamente ($2,500,000)

**BUG A VERIFICAR**: Campo `monthly_income` debe guardarse correctamente (no como null)

### PASO 4: VER ESTADO DEL MATCH REQUEST

1. ✅ Ir a "Matching" o "Solicitudes" en menú
2. ✅ Verificar pestañas:
   - ✅ "ENVIADAS" (debe tener 1+ solicitud)
   - ✅ "EN PROCESO"
   - ✅ "COMPLETADAS"

**Validaciones de Pestañas**:
- ✅ Tabs navegables (click funciona)
- ✅ Contenido cambia correctamente
- ✅ Estados vacíos muestran mensajes informativos

### RESUMEN USER JOURNEY #2

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| Login tenant | ⬜ | |
| Buscar propiedades | ⬜ | |
| Ver detalles | ⬜ | |
| Crear match request | ⬜ | |
| Monthly income guardado | ⬜ | |
| Tabs funcionan | ⬜ | |
| Estados empty | ⬜ | |

---

## USER JOURNEY #3: MATCHING Y MENSAJERÍA

**Objetivo**: Verificar flujo completo de matching landlord-tenant y mensajería en tiempo real.

**Tiempo estimado**: 15 minutos

### PASO 1: ARRENDADOR RECIBE Y ACEPTA MATCH

1. ✅ Logout y login como arrendador
2. ✅ Ir a "Matching" o "Solicitudes"
3. ✅ Verificar pestaña "PENDIENTES"
4. ✅ Debe aparecer solicitud del tenant

**Validaciones**:
- ✅ Detalles de tenant visibles
- ✅ Ingresos: $2,500,000 ✓
- ✅ Tipo empleo: Empleado tiempo completo ✓
- ✅ Mensaje: visible

5. ✅ Click en solicitud para expandir detalles
6. ✅ Click "Programar Visita"

**Modal de Programar Visita**:
1. ✅ Seleccionar fecha: [HOY + 3 días]
2. ✅ Seleccionar hora: 10:00 AM
3. ✅ Notas: "Llevar documentos de identificación"
4. ✅ Click "Confirmar Visita"

**Validaciones**:
- ✅ Mensaje: "Visita programada exitosamente"
- ✅ Solicitud pasa a estado "visit_scheduled" (Etapa 1)
- ✅ Alert con fecha/hora visible

### PASO 2: EVALUAR VISITA

1. ✅ En la misma solicitud, click "Evaluar Visita"
2. ✅ Modal de evaluación se abre
3. ✅ Opción 1: Aprobar → Click "Aprobar"
4. ✅ Agregar notas: "Visita exitosa, candidato aprobado"

**Validaciones**:
- ✅ Solicitud avanza a Etapa 2 (Documentos)
- ✅ Estado: "documents_pending" o "pending_documents"

### PASO 3: REVISAR DOCUMENTOS

1. ✅ Click "Revisar Documentos"
2. ✅ Modal con lista de documentos del tenant
3. ✅ Verificar:
   - Lista de documentos subidos
   - Preview disponible
   - Opciones: Aprobar/Rechazar cada documento

4. ✅ Aprobar todos los documentos
5. ✅ Click "Finalizar Revisión"

**Validaciones**:
- ✅ Solicitud avanza a Etapa 3 (Contrato)
- ✅ Estado: "ready_for_contract"

### PASO 4: GENERAR CONTRATO DESDE MATCH

1. ✅ Click "⚡ Generar Contrato Automáticamente"
2. ✅ Verificar que contrato se crea con:
   - Propiedad correcta
   - Tenant correcto
   - Datos pre-llenados

**Validaciones**:
- ✅ Mensaje: "Contrato generado exitosamente"
- ✅ Número de contrato visible
- ✅ Estado: "pending_approval"
- ✅ Solicitud avanza a Etapa 4 (Biométrica)

### PASO 5: MENSAJERÍA EN TIEMPO REAL

1. ✅ Click "💬 Enviar Mensaje" al tenant
2. ✅ Se abre chat window
3. ✅ Escribir mensaje: "Hola, el contrato está listo para firmar"
4. ✅ Enter o click "Enviar"

**Validaciones WebSocket**:
- ✅ Mensaje aparece inmediatamente en chat
- ✅ Estado: "Enviado" → "Entregado"
- ✅ Timestamp correcto
- ✅ Sin errores en consola
- ✅ WebSocket connection visible en Network tab

### PASO 6: TENANT RECIBE MENSAJE

1. ✅ Abrir nueva ventana incógnita
2. ✅ Login como tenant
3. ✅ Ir a "Mensajes" o "Chat"
4. ✅ Verificar notificación de mensaje nuevo

**Validaciones**:
- ✅ Badge con contador de mensajes no leídos
- ✅ Mensaje del landlord visible
- ✅ Tiempo real: mensaje aparece sin refresh

5. ✅ Responder: "Perfecto, voy a firmar ahora"

**Validaciones**:
- ✅ Landlord recibe respuesta en tiempo real
- ✅ Typing indicator funciona (si está implementado)

### RESUMEN USER JOURNEY #3

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| Recibir match request | ⬜ | |
| Programar visita | ⬜ | |
| Evaluar visita | ⬜ | |
| Revisar documentos | ⬜ | |
| Generar contrato auto | ⬜ | |
| WebSocket conecta | ⬜ | |
| Mensajes en tiempo real | ⬜ | |
| Typing indicator | ⬜ | |
| Notificaciones push | ⬜ | |

---

## USER JOURNEY #4: SISTEMA DE PAGOS

**Objetivo**: Verificar integración con múltiples pasarelas de pago.

**Tiempo estimado**: 10 minutos

### PASO 1: ACCEDER A MÓDULO DE PAGOS

1. ✅ Login como arrendador
2. ✅ Ir a "Pagos" o "Payments" en menú
3. ✅ Verificar lista de transacciones (puede estar vacía)

### PASO 2: CREAR NUEVO PAGO

1. ✅ Click "+ Nuevo Pago"
2. ✅ Llenar formulario:
   ```
   Contrato: [Seleccionar contrato creado anteriormente]
   Monto: $50,000
   Fecha vencimiento: [HOY + 7 días]
   Descripción: Pago de prueba para testing
   ```

3. ✅ Activar switch "Procesamiento Real"

**Validaciones**:
- ✅ Tabs de pasarelas aparecen:
   - Tarjeta de Crédito (Stripe)
   - PayPal
   - Formulario Tradicional

### PASO 3: PROBAR STRIPE

1. ✅ Seleccionar tab "Tarjeta de Crédito"
2. ✅ Verificar:
   - Stripe Elements cargado
   - Formulario de tarjeta visible

**IMPORTANTE**: Solo testing en sandbox

3. ✅ Ingresar datos de prueba de Stripe:
   ```
   Número: 4242 4242 4242 4242
   Exp: 12/25
   CVC: 123
   ```

4. ✅ Click "Pagar"

**Validaciones**:
- ✅ Procesamiento sin errores
- ✅ Mensaje de confirmación
- ✅ Redirección a página de éxito
- ⚠️ Verificar que NO se haga cargo real

### PASO 4: PROBAR PAYPAL

1. ✅ Regresar a crear nuevo pago
2. ✅ Activar "Procesamiento Real"
3. ✅ Seleccionar tab "PayPal"
4. ✅ Verificar botón de PayPal aparece

**IMPORTANTE**: Solo testing en sandbox

5. ✅ Click botón PayPal
6. ✅ Login con cuenta sandbox de PayPal

**Validaciones**:
- ✅ Popup de PayPal se abre
- ✅ Login funcional
- ✅ Monto correcto mostrado
- ⚠️ NO completar pago real

### PASO 5: PSE (Colombian Bank Transfer)

1. ✅ Buscar opción PSE si está disponible
2. ✅ Verificar formulario PSE:
   - Selección de banco
   - Tipo de persona
   - Datos personales

**Validaciones**:
- ✅ Lista de bancos colombianos cargada
- ✅ Formulario completo
- ⚠️ Solo verificar interfaz, NO procesar pago real

### RESUMEN USER JOURNEY #4

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| Acceder a pagos | ⬜ | |
| Crear pago | ⬜ | |
| Stripe Elements carga | ⬜ | |
| Formulario Stripe OK | ⬜ | |
| PayPal button carga | ⬜ | |
| PSE disponible | ⬜ | |
| NO hay hardcoded keys | ⬜ | Verificar en código |

---

## USER JOURNEY #5: FILE UPLOADS COMPLETO

**Objetivo**: Verificar todos los sistemas de carga de archivos.

**Tiempo estimado**: 10 minutos

### PASO 1: UPLOAD DE IMÁGENES DE PROPIEDAD

1. ✅ Login como arrendador
2. ✅ Editar propiedad existente
3. ✅ Ir a sección de imágenes

**Probar Drag & Drop**:
1. ✅ Arrastrar 3 imágenes al área de drop
2. ✅ Validaciones:
   - Preview inmediato
   - Progress bars visibles
   - Compresión a 1920x1080 automática
   - Tamaño comprimido mostrado
   - Estadísticas de ahorro

**Probar Reordenamiento**:
1. ✅ Drag & drop para reordenar imágenes
2. ✅ Verificar orden se mantiene

**Probar Imagen Principal**:
1. ✅ Click "Marcar como Principal" en una imagen
2. ✅ Verificar indicador visual (estrella/badge)

**Validaciones**:
- ✅ Max 10 imágenes
- ✅ Max 5MB por imagen
- ✅ Solo JPG/PNG/WebP permitidos
- ✅ Errores de validación claros

### PASO 2: UPLOAD DE VIDEOS DE PROPIEDAD

1. ✅ En la misma propiedad, ir a sección de videos
2. ✅ Subir video de prueba (< 50MB, MP4/WebM)

**Validaciones**:
- ✅ Progress bar visible
- ✅ Max 50MB validado
- ✅ Solo MP4/WebM/QuickTime permitidos
- ✅ Preview del video después de upload

### PASO 3: UPLOAD DE DOCUMENTOS DE TENANT

1. ✅ Logout y login como tenant
2. ✅ Ir a "Mis Documentos" o sección de documentos
3. ✅ Subir documentos:
   - Cédula de ciudadanía
   - Comprobante de ingresos
   - Referencias de arrendamiento

**Validaciones**:
- ✅ Tipos de documento seleccionables
- ✅ Upload exitoso
- ✅ Preview disponible
- ✅ Estado: "Pendiente de revisión"

### PASO 4: UPLOAD DE AVATAR DE USUARIO

1. ✅ Ir a "Perfil" o "Configuración"
2. ✅ Click en avatar/foto de perfil
3. ✅ Subir nueva imagen de perfil

**Validaciones**:
- ✅ Upload funcional
- ✅ Crop/preview antes de guardar
- ✅ Avatar actualizado en toda la app

### RESUMEN USER JOURNEY #5

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| Drag & drop imágenes | ⬜ | |
| Compresión automática | ⬜ | |
| Reordenamiento | ⬜ | |
| Imagen principal | ⬜ | |
| Upload videos | ⬜ | |
| Upload documentos | ⬜ | |
| Upload avatar | ⬜ | |
| Validaciones de tamaño | ⬜ | |
| Validaciones de tipo | ⬜ | |

---

## TESTING DE PRESTADOR DE SERVICIOS

**Objetivo**: Verificar módulo de prestador de servicios.

**Credenciales**: `serviceprovider@verihome.com` / `service123`

### PASO 1: LOGIN COMO PRESTADOR

1. ✅ Login con credenciales de prestador
2. ✅ Verificar dashboard específico de prestador

**Validaciones**:
- ✅ Módulos visibles:
  - Solicitudes de servicio
  - Calendario
  - Mis servicios
  - Historial

### PASO 2: VER SOLICITUDES DE SERVICIO

1. ✅ Ir a "Solicitudes" o "Service Requests"
2. ✅ Verificar lista de solicitudes (puede estar vacía)

**Si hay solicitudes**:
- ✅ Aceptar solicitud
- ✅ Marcar como completada
- ✅ Agregar notas

### RESUMEN PRESTADOR

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| Login prestador | ⬜ | |
| Dashboard visible | ⬜ | |
| Ver solicitudes | ⬜ | |
| Aceptar solicitud | ⬜ | |
| Completar servicio | ⬜ | |

---

## CHECKLIST FINAL DE VALIDACIONES

### Funcionalidades Críticas

| Categoría | Funcionalidad | Estado | Prioridad |
|-----------|---------------|--------|-----------|
| **Autenticación** | Login/Logout funciona | ⬜ | P0 |
| | JWT tokens se guardan | ⬜ | P0 |
| | Refresh token funciona | ⬜ | P1 |
| **Propiedades** | CRUD completo | ⬜ | P0 |
| | Upload imágenes | ⬜ | P0 |
| | Drag & drop | ⬜ | P1 |
| | Compresión automática | ⬜ | P1 |
| | Mapbox integration | ⬜ | P2 |
| **Contratos** | Crear contrato | ⬜ | P0 |
| | Aprobar como tenant | ⬜ | P0 |
| | Aprobar como landlord | ⬜ | P0 |
| | Flujo biométrico completo | ⬜ | P0 |
| | Orden secuencial (T→G→L) | ⬜ | P0 |
| | PDF generado | ⬜ | P0 |
| **Matching** | Crear match request | ⬜ | P0 |
| | Monthly income guardado | ⬜ | P0 |
| | Tabs funcionan | ⬜ | P1 |
| | Workflow completo | ⬜ | P0 |
| **Mensajería** | WebSocket conecta | ⬜ | P0 |
| | Mensajes en tiempo real | ⬜ | P0 |
| | Notificaciones push | ⬜ | P1 |
| **Pagos** | Stripe integration | ⬜ | P1 |
| | PayPal integration | ⬜ | P1 |
| | PSE integration | ⬜ | P2 |
| **File Uploads** | Todos los uploads | ⬜ | P0 |
| | Validaciones de tamaño | ⬜ | P0 |
| | Validaciones de tipo | ⬜ | P0 |

---

## BUGS Y PROBLEMAS IDENTIFICADOS

### Durante Testing Manual

Documenta aquí cualquier bug encontrado:

```
1. [Prioridad] [Componente] Descripción del bug
   Pasos para reproducir:
   1. ...
   2. ...
   Resultado esperado: ...
   Resultado actual: ...
   Screenshot: [adjuntar]

2. ...
```

---

## REPORTE FINAL

Al completar los 5 user journeys, llena este resumen:

### Estadísticas
- **Total funcionalidades probadas**: _____
- **✅ Funcionando correctamente**: _____
- **⚠️ Funcionando con issues menores**: _____
- **❌ No funcionando**: _____
- **🔍 Pendiente de implementar**: _____

### Bugs Críticos (Bloqueantes)
```
1. ...
2. ...
```

### Bugs Altos
```
1. ...
2. ...
```

### Mejoras Sugeridas
```
1. ...
2. ...
```

---

**Fin de la Guía de Testing Manual**

Guarda este documento con tus resultados y compártelo para revisión.
