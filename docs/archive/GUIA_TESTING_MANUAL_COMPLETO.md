# 🧪 GUÍA DE TESTING MANUAL COMPLETO - VERIHOME
## Testing de TODAS las Funcionalidades Frontend

**Fecha:** 17 de Noviembre, 2025
**Versión:** Post-Auditoría
**Objetivo:** Probar TODOS los botones y funcionalidades

---

## 🚀 PREREQUISITOS ANTES DE EMPEZAR

### ✅ Verificar que todo esté corriendo:

**Terminal 1 - Backend:**
```bash
cd "/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS"
source venv_ubuntu/bin/activate
python3 manage.py runserver
```

**Terminal 2 - Frontend:**
```bash
cd "/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS/frontend"
npm run dev
```

**Abrir navegador:**
```
http://localhost:5173
```

---

## 📋 CHECKLIST DE TESTING COMPLETO

### ✅ Marcar cada funcionalidad probada:
- [ ] Módulo 1: Landing Page y Navegación
- [ ] Módulo 2: Autenticación y Usuarios
- [ ] Módulo 3: Dashboard
- [ ] Módulo 4: Propiedades
- [ ] Módulo 5: Contratos Biométricos ⭐
- [ ] Módulo 6: Matching y Solicitudes
- [ ] Módulo 7: Mensajería
- [ ] Módulo 8: Pagos
- [ ] Módulo 9: Ratings
- [ ] Módulo 10: Perfil y Configuración

---

## 1️⃣ MÓDULO 1: LANDING PAGE Y NAVEGACIÓN

### Ubicación: `http://localhost:5173/`

#### **Botones y Links a Probar:**

1. **Navbar (Barra Superior):**
   - [ ] Logo VeriHome (click → debe volver a home)
   - [ ] Botón "Inicio"
   - [ ] Botón "Propiedades"
   - [ ] Botón "Servicios"
   - [ ] Botón "Nosotros"
   - [ ] Botón "Contacto"
   - [ ] Botón "Iniciar Sesión"
   - [ ] Botón "Registrarse"

2. **Hero Section (Sección Principal):**
   - [ ] Botón "Buscar Propiedades"
   - [ ] Botón "Publicar Propiedad"
   - [ ] Campo de búsqueda rápida
   - [ ] Filtros de ubicación

3. **Sección de Features:**
   - [ ] Cards de características (hover effects)
   - [ ] Botones "Leer más"

4. **Footer:**
   - [ ] Links de redes sociales
   - [ ] Links legales (Términos, Privacidad)
   - [ ] Links de contacto
   - [ ] Newsletter subscribe (si existe)

**Resultado Esperado:**
- ✅ Todas las navegaciones funcionan
- ✅ Los links llevan a las páginas correctas
- ✅ No hay errores 404

---

## 2️⃣ MÓDULO 2: AUTENTICACIÓN Y USUARIOS

### 🔐 LOGIN

#### Ubicación: `http://localhost:5173/login`

**Botones a Probar:**

1. **Formulario de Login:**
   - [ ] Campo "Email" (validación)
   - [ ] Campo "Password" (toggle show/hide)
   - [ ] Checkbox "Recordarme"
   - [ ] Botón "Iniciar Sesión"
   - [ ] Link "¿Olvidaste tu contraseña?"
   - [ ] Link "Registrarse"

2. **Casos de Prueba:**
   ```
   TEST 1: Login Exitoso
   - Email: admin@verihome.com (o tu usuario)
   - Password: (tu password)
   - Click "Iniciar Sesión"
   - Resultado: Redirección a Dashboard

   TEST 2: Credenciales Incorrectas
   - Email: wrong@test.com
   - Password: wrongpass
   - Resultado: Mensaje de error

   TEST 3: Campos Vacíos
   - Dejar ambos campos vacíos
   - Click "Iniciar Sesión"
   - Resultado: Mensajes de validación
   ```

---

### 📝 REGISTRO

#### Ubicación: `http://localhost:5173/register`

**Botones a Probar:**

1. **Selección de Tipo de Usuario:**
   - [ ] Card "Arrendador"
   - [ ] Card "Arrendatario"
   - [ ] Card "Proveedor de Servicios"

2. **Formulario de Registro (Arrendador):**
   - [ ] Campo "Nombre completo"
   - [ ] Campo "Email"
   - [ ] Campo "Teléfono"
   - [ ] Campo "Código de entrevista"
   - [ ] Campo "Password"
   - [ ] Campo "Confirmar Password"
   - [ ] Checkbox "Acepto términos y condiciones"
   - [ ] Botón "Registrarse"
   - [ ] Link "Ver Términos"
   - [ ] Link "Ver Política de Privacidad"

3. **Casos de Prueba:**
   ```
   TEST 1: Registro Completo
   - Llenar todos los campos correctamente
   - Usar código de entrevista válido
   - Aceptar términos
   - Click "Registrarse"
   - Resultado: Cuenta creada, redirección a confirmación

   TEST 2: Email Duplicado
   - Usar email existente
   - Resultado: Mensaje "Email ya registrado"

   TEST 3: Passwords No Coinciden
   - Password: "test123"
   - Confirmar: "test456"
   - Resultado: Error de validación
   ```

---

### 🔑 RECUPERAR CONTRASEÑA

#### Ubicación: `http://localhost:5173/forgot-password`

**Botones a Probar:**
- [ ] Campo "Email"
- [ ] Botón "Enviar enlace de recuperación"
- [ ] Link "Volver al login"

**Caso de Prueba:**
```
TEST: Recuperación de Contraseña
- Email: tu-email@test.com
- Click "Enviar enlace"
- Resultado: Mensaje de confirmación
```

---

## 3️⃣ MÓDULO 3: DASHBOARD

### 📊 DASHBOARD PRINCIPAL

#### Ubicación: `http://localhost:5173/dashboard`

**Para Arrendador:**

1. **Tarjetas de Estadísticas:**
   - [ ] Card "Total Propiedades"
   - [ ] Card "Propiedades Arrendadas"
   - [ ] Card "Ingresos Mensuales"
   - [ ] Card "Solicitudes Pendientes"
   - [ ] Hover en cada card (tooltip/info)

2. **Gráficos:**
   - [ ] Gráfico de Ingresos (si existe)
   - [ ] Gráfico de Ocupación
   - [ ] Controles de zoom/período

3. **Actividad Reciente:**
   - [ ] Lista de actividades
   - [ ] Botón "Ver más"
   - [ ] Links a detalles

4. **Acciones Rápidas:**
   - [ ] Botón "+ Nueva Propiedad"
   - [ ] Botón "Ver Solicitudes"
   - [ ] Botón "Ver Contratos"
   - [ ] Botón "Mensajes"

**Para Arrendatario:**

1. **Tarjetas Personalizadas:**
   - [ ] Card "Búsquedas Guardadas"
   - [ ] Card "Solicitudes Enviadas"
   - [ ] Card "Contratos Activos"
   - [ ] Card "Mensajes Sin Leer"

2. **Recomendaciones:**
   - [ ] Lista de propiedades recomendadas
   - [ ] Botón "Ver detalles" en cada propiedad
   - [ ] Botón "Me interesa"

---

## 4️⃣ MÓDULO 4: PROPIEDADES

### 🏠 LISTAR PROPIEDADES

#### Ubicación: `http://localhost:5173/properties`

**Controles de Vista:**
- [ ] Toggle "Vista de Tarjetas"
- [ ] Toggle "Vista de Lista"
- [ ] Toggle "Vista de Mapa"

**Filtros (Panel Izquierdo):**
1. **Búsqueda:**
   - [ ] Campo de búsqueda por texto
   - [ ] Botón "Buscar"
   - [ ] Botón "Limpiar filtros"

2. **Ubicación:**
   - [ ] Select "Departamento"
   - [ ] Select "Ciudad"
   - [ ] Select "Barrio"

3. **Tipo de Propiedad:**
   - [ ] Checkbox "Apartamento"
   - [ ] Checkbox "Casa"
   - [ ] Checkbox "Habitación"
   - [ ] Checkbox "Local Comercial"
   - [ ] Checkbox "Oficina"

4. **Rango de Precio:**
   - [ ] Slider de rango mínimo
   - [ ] Slider de rango máximo
   - [ ] Input numérico mínimo
   - [ ] Input numérico máximo

5. **Características:**
   - [ ] Select "Habitaciones" (1, 2, 3, 4+)
   - [ ] Select "Baños" (1, 2, 3+)
   - [ ] Checkbox "Parqueadero"
   - [ ] Checkbox "Amoblado"
   - [ ] Checkbox "Mascotas permitidas"

6. **Amenidades:**
   - [ ] Checkbox "Piscina"
   - [ ] Checkbox "Gimnasio"
   - [ ] Checkbox "Zona BBQ"
   - [ ] Checkbox "Portería 24h"
   - [ ] Checkbox "Ascensor"

**Ordenamiento:**
- [ ] Select "Más Recientes"
- [ ] Select "Precio: Menor a Mayor"
- [ ] Select "Precio: Mayor a Menor"
- [ ] Select "Mayor Área"

**Cards de Propiedades:**
- [ ] Imagen principal (carousel si hay múltiples)
- [ ] Botón "❤️ Favorito"
- [ ] Botón "Ver Detalles"
- [ ] Botón "Contactar"
- [ ] Botón "Solicitar Visita"
- [ ] Badge de estado ("Disponible", "Arrendado")

**Paginación:**
- [ ] Botón "Anterior"
- [ ] Números de página (1, 2, 3...)
- [ ] Botón "Siguiente"
- [ ] Select "Resultados por página" (10, 25, 50)

---

### ➕ CREAR PROPIEDAD

#### Ubicación: `http://localhost:5173/properties/new`

**Paso 1: Información Básica**
- [ ] Campo "Título de la propiedad"
- [ ] Select "Tipo de propiedad"
- [ ] Select "Tipo de operación" (Arriendo/Venta)
- [ ] TextArea "Descripción"
- [ ] Campo "Precio"
- [ ] Select "Moneda" (COP/USD)

**Paso 2: Ubicación**
- [ ] Campo "Dirección completa"
- [ ] Select "Departamento"
- [ ] Select "Ciudad"
- [ ] Campo "Barrio"
- [ ] Campo "Código Postal"
- [ ] Mapa interactivo (marcar ubicación)
- [ ] Botón "Detectar mi ubicación"

**Paso 3: Detalles**
- [ ] Input "Área total (m²)"
- [ ] Input "Área construida (m²)"
- [ ] Select "Habitaciones"
- [ ] Select "Baños"
- [ ] Select "Parqueaderos"
- [ ] Select "Estrato"
- [ ] Input "Año de construcción"
- [ ] Select "Piso" (si aplica)

**Paso 4: Amenidades**
- [ ] Checkbox "Amoblado"
- [ ] Checkbox "Mascotas permitidas"
- [ ] Checkbox "Piscina"
- [ ] Checkbox "Gimnasio"
- [ ] Checkbox "Zona BBQ"
- [ ] Checkbox "Portería"
- [ ] Checkbox "Ascensor"
- [ ] Checkbox "Aire acondicionado"
- [ ] Checkbox "Calefacción"
- [ ] TextArea "Otras amenidades"

**Paso 5: Multimedia**
- [ ] Botón "Subir Imágenes" (drag & drop)
  - Probar: arrastrar 1 imagen
  - Probar: arrastrar múltiples imágenes
  - Probar: click para seleccionar
  - Probar: preview de imágenes
  - Probar: botón "X" eliminar imagen
  - Probar: reordenar imágenes (drag & drop)
  - Probar: marcar imagen principal

- [ ] Botón "Subir Video"
  - Probar: subir video local
  - Campo "URL de YouTube"
  - Probar: preview de video

**Paso 6: Servicios Incluidos**
- [ ] Checkbox "Agua"
- [ ] Checkbox "Luz"
- [ ] Checkbox "Gas"
- [ ] Checkbox "Internet"
- [ ] Checkbox "Administración"
- [ ] Input "Valor administración"

**Botones de Navegación:**
- [ ] Botón "Anterior" (entre pasos)
- [ ] Botón "Siguiente" (entre pasos)
- [ ] Botón "Guardar como Borrador"
- [ ] Botón "Vista Previa"
- [ ] Botón "Publicar Propiedad"
- [ ] Botón "Cancelar"

**Casos de Prueba:**
```
TEST 1: Crear Propiedad Completa
- Llenar todos los campos
- Subir 3 imágenes
- Subir 1 video
- Click "Publicar"
- Resultado: Propiedad creada, redirección a detalle

TEST 2: Guardar Borrador
- Llenar solo información básica
- Click "Guardar como Borrador"
- Resultado: Borrador guardado

TEST 3: Validación de Campos Requeridos
- Dejar campos obligatorios vacíos
- Click "Siguiente"
- Resultado: Mensajes de validación
```

---

### ✏️ EDITAR PROPIEDAD

#### Ubicación: `http://localhost:5173/properties/:id/edit`

**Todos los campos de Crear Propiedad +:**
- [ ] Botón "Actualizar Propiedad"
- [ ] Botón "Eliminar Propiedad"
- [ ] Toggle "Marcar como No Disponible"
- [ ] Botón "Ver Historial de Cambios"

**Caso de Prueba:**
```
TEST: Editar Propiedad
1. Ir a lista de propiedades
2. Click "Editar" en una propiedad
3. Cambiar precio
4. Agregar nueva imagen
5. Click "Actualizar"
6. Verificar cambios en detalle
```

---

### 👁️ VER DETALLE DE PROPIEDAD

#### Ubicación: `http://localhost:5173/properties/:id`

**Galería de Imágenes:**
- [ ] Imagen principal (grande)
- [ ] Thumbnails (miniaturas)
- [ ] Botón "◀ Anterior"
- [ ] Botón "Siguiente ▶"
- [ ] Botón "🔍 Zoom/Fullscreen"
- [ ] Botón "❤️ Favorito"
- [ ] Botón "🔗 Compartir"

**Video (si existe):**
- [ ] Player de video
- [ ] Controles de reproducción
- [ ] Botón fullscreen

**Información Principal:**
- [ ] Título
- [ ] Precio destacado
- [ ] Dirección con icono
- [ ] Badge de estado

**Características:**
- [ ] Iconos + valores (habitaciones, baños, área, etc.)

**Descripción:**
- [ ] Texto completo
- [ ] Botón "Leer más/menos" (si es largo)

**Mapa:**
- [ ] Mapa interactivo con marcador
- [ ] Zoom in/out
- [ ] Botón "Ver en Google Maps"

**Amenidades:**
- [ ] Lista con checkmarks ✓

**Botones de Acción:**
- [ ] Botón "📞 Contactar Arrendador"
- [ ] Botón "📅 Agendar Visita"
- [ ] Botón "💬 Enviar Mensaje"
- [ ] Botón "📋 Solicitar Información"
- [ ] Botón "🏠 Solicitar Arriendo" (si usuario es tenant)

**Sección de Arrendador:**
- [ ] Foto de perfil
- [ ] Nombre
- [ ] Rating/Estrellas
- [ ] Botón "Ver Perfil"
- [ ] Botón "Enviar Mensaje"

**Propiedades Similares:**
- [ ] Carousel de propiedades relacionadas
- [ ] Botón "◀" scroll izquierda
- [ ] Botón "▶" scroll derecha

---

### 🗑️ ELIMINAR PROPIEDAD

**Modal de Confirmación:**
- [ ] Mensaje de advertencia
- [ ] Botón "Cancelar"
- [ ] Botón "Sí, Eliminar"

**Caso de Prueba:**
```
TEST: Eliminar Propiedad
1. Crear una propiedad de prueba
2. Ir a editar
3. Click "Eliminar"
4. Confirmar en modal
5. Verificar que desaparece de la lista
```

---

## 5️⃣ MÓDULO 5: CONTRATOS BIOMÉTRICOS ⭐⭐⭐

### 🌟 **FEATURE ESTRELLA DE VERIHOME**

---

### 📋 DASHBOARD DE CONTRATOS (ARRENDADOR)

#### Ubicación: `http://localhost:5173/contracts/landlord`

**Tabs/Pestañas:**
- [ ] Tab "Borradores"
- [ ] Tab "Pendientes Firma"
- [ ] Tab "Activos"
- [ ] Tab "Finalizados"
- [ ] Tab "Rechazados"

**Filtros:**
- [ ] Select "Todos los estados"
- [ ] Select "Por propiedad"
- [ ] Campo de búsqueda

**Tabla de Contratos:**
- [ ] Columna "ID Contrato"
- [ ] Columna "Propiedad"
- [ ] Columna "Arrendatario"
- [ ] Columna "Estado"
- [ ] Columna "Fecha Creación"
- [ ] Columna "Acciones"

**Botones por Fila:**
- [ ] Botón "👁️ Ver"
- [ ] Botón "✏️ Editar" (si borrador)
- [ ] Botón "📝 Firmar" (si pendiente)
- [ ] Botón "📄 Descargar PDF"
- [ ] Botón "🗑️ Eliminar" (si borrador)

**Botón Principal:**
- [ ] Botón "+ Nuevo Contrato"

---

### ➕ CREAR CONTRATO (ARRENDADOR)

#### Ubicación: `http://localhost:5173/contracts/landlord/new`

**Paso 1: Selección de Propiedad**
- [ ] Select "Elegir Propiedad"
- [ ] Lista de propiedades disponibles
- [ ] Botón "Siguiente"

**Paso 2: Información del Arrendatario**
- [ ] Radio "Arrendatario Registrado"
  - [ ] Select "Buscar arrendatario"
  - [ ] Autocompletar por email/nombre

- [ ] Radio "Invitar Nuevo Arrendatario"
  - [ ] Campo "Email del arrendatario"
  - [ ] Campo "Nombre completo"
  - [ ] Campo "Teléfono"
  - [ ] Botón "Enviar Invitación"

**Paso 3: Detalles del Contrato**
- [ ] DatePicker "Fecha de Inicio"
- [ ] Select "Duración" (6, 12, 24 meses / Indefinido)
- [ ] DatePicker "Fecha de Fin" (auto-calculado)
- [ ] Input "Canon de Arriendo"
- [ ] Input "Depósito" (sugerido: 1 mes)
- [ ] Select "Día de Pago" (1-31)
- [ ] Select "Incremento Anual" (%, IPC, Fijo)

**Paso 4: Cláusulas Legales**
- [ ] Checkbox "Incluir cláusula de mascotas"
- [ ] Checkbox "Incluir cláusula de mejoras"
- [ ] Checkbox "Incluir cláusula de subarriendo"
- [ ] TextArea "Cláusulas adicionales personalizadas"
- [ ] Botón "Agregar Cláusula Estándar"
  - [ ] Modal con cláusulas pre-definidas
  - [ ] Selección múltiple
  - [ ] Botón "Agregar Seleccionadas"

**Paso 5: Garantías**
- [ ] Radio "Con Codeudor"
  - [ ] Campo "Email codeudor"
  - [ ] Campo "Nombre codeudor"
  - [ ] Campo "Relación con arrendatario"

- [ ] Radio "Fianza/Depósito"
  - [ ] Input "Monto fianza"

- [ ] Radio "Seguro de Arrendamiento"
  - [ ] Select "Compañía de seguros"
  - [ ] Input "Número de póliza"

**Paso 6: Vista Previa del Contrato**
- [ ] PDF preview embebido
- [ ] Botón "Zoom +"
- [ ] Botón "
