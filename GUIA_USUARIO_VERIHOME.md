# Guia de Usuario - VeriHome

**Plataforma inmobiliaria enterprise con autenticacion biometrica**
**Version**: 1.0 | **Fecha**: Marzo 2026

---

## Tabla de Contenidos

1. [Acceso a la Plataforma](#1-acceso-a-la-plataforma)
2. [Registro de Usuarios](#2-registro-de-usuarios)
3. [Panel de Control (Dashboard)](#3-panel-de-control)
4. [Gestion de Propiedades (Arrendador)](#4-gestion-de-propiedades)
5. [Busqueda de Propiedades (Inquilino)](#5-busqueda-de-propiedades)
6. [Sistema de Matching](#6-sistema-de-matching)
7. [Flujo Contractual Completo](#7-flujo-contractual-completo)
8. [Autenticacion Biometrica](#8-autenticacion-biometrica)
9. [Renovacion de Contratos](#9-renovacion-de-contratos)
10. [Sistema de Pagos](#10-sistema-de-pagos)
11. [Mensajeria en Tiempo Real](#11-mensajeria-en-tiempo-real)
12. [Solicitudes de Mantenimiento](#12-solicitudes-de-mantenimiento)
13. [Calificaciones y Reputacion](#13-calificaciones-y-reputacion)
14. [Servicios Profesionales](#14-servicios-profesionales)
15. [Panel de Administracion](#15-panel-de-administracion)
16. [Configuracion y Perfil](#16-configuracion-y-perfil)

---

## 1. Acceso a la Plataforma

### URLs de Acceso

| Servicio | URL |
|----------|-----|
| Frontend (App) | http://localhost:5173 |
| Backend API | http://localhost:8000/api/v1/ |
| Documentacion API (Swagger) | http://localhost:8000/api/v1/docs/ |
| Admin Django | http://localhost:8000/admin/ |

### Usuarios de Prueba

| Email | Contrasena | Rol | Descripcion |
|-------|-----------|-----|-------------|
| `admin@verihome.com` | `admin123` | Arrendador + Admin | Administrador principal |
| `admin1@verihome.com` | `admin123` | Arrendador + Admin | Administrador secundario |
| `superadmin@verihome.com` | `admin123` | Arrendador + Admin | Super administrador |
| `letefon100@gmail.com` | `admin123` | Inquilino | Inquilino de prueba |
| `diegofernandof08@gmail.com` | `admin123` | Inquilino | Inquilino de prueba |
| `guarantor@test.com` | `admin123` | Inquilino/Codeudor | Garante de prueba |
| `serviceprovider@verihome.com` | `admin123` | Proveedor de Servicios | Proveedor de prueba |

### Iniciar Sesion

1. Abrir http://localhost:5173
2. Hacer clic en **"Comenzar"** o **"Iniciar Sesion"**
3. Ingresar email y contrasena
4. El sistema redirige automaticamente al **Dashboard** segun el rol del usuario

---

## 2. Registro de Usuarios

### Registro por Codigo de Entrevista

VeriHome utiliza un sistema de registro controlado mediante codigos de entrevista.

1. El administrador genera un **codigo de entrevista** desde el panel admin
2. El nuevo usuario accede a `/register`
3. Ingresa el **codigo de entrevista** proporcionado
4. El sistema valida el codigo y muestra el formulario de registro con datos pre-llenados:
   - Nombre completo
   - Email
   - Tipo de usuario (arrendador/inquilino)
   - Telefono
   - WhatsApp
   - Fecha de nacimiento
5. El usuario completa los datos, acepta **Terminos y Condiciones** y **Politica de Privacidad**
6. Hace clic en **"Registrarse"**
7. Recibe un email de verificacion
8. Confirma el email haciendo clic en el enlace
9. Ya puede iniciar sesion

### Invitacion Directa de Inquilino

Un arrendador puede invitar directamente a un inquilino:

1. Arrendador envia invitacion desde el flujo contractual
2. Inquilino recibe email con enlace: `/tenant/invitation/{token}`
3. La pagina muestra los detalles del contrato
4. El inquilino acepta y completa su registro
5. Inicia el flujo biometrico directamente

---

## 3. Panel de Control

### Dashboard del Arrendador

Al iniciar sesion como arrendador, el dashboard muestra:

- **Propiedades**: Total, ocupadas, disponibles, en mantenimiento + tendencia
- **Finanzas**: Ingresos mensuales, gastos, pagos pendientes, ganancia + tendencia
- **Contratos**: Activos, por vencer, pendientes, total + tendencia
- **Calificaciones**: Promedio, total, distribucion por estrellas
- **Actividad Reciente**: Ultimos pagos recibidos y contratos actualizados

### Dashboard del Inquilino

- **Propiedades**: Vistas, favoritas, disponibles en plataforma + tendencia
- **Finanzas**: Pagos mensuales, pendientes, total pagado + tendencia
- **Contratos**: Activos, completados, total + tendencia
- **Servicios**: Solicitados, completados, pendientes + tendencia
- **Calificaciones**: Dadas, propiedades calificadas, promedio dado

### Dashboard del Proveedor de Servicios

- **Servicios**: Solicitados, completados, pendientes, cancelados + tendencia
- **Finanzas**: Ingresos mensuales, pagos pendientes, promedio por servicio + tendencia
- **Calificaciones**: Promedio, total, distribucion
- **Clientes**: Total, nuevos, recurrentes, satisfaccion + tendencia

---

## 4. Gestion de Propiedades

### Crear una Propiedad (Arrendador)

**Ruta**: Menu lateral > **Propiedades** > boton **"Crear Nueva Propiedad"**

**Paso 1 - Informacion Basica:**
- Titulo de la propiedad
- Tipo (apartamento, casa, oficina, local comercial)
- Tipo de listado (arriendo, venta)
- Direccion completa con selector de ubicacion en mapa (Mapbox)
- Ciudad, departamento, pais, codigo postal

**Paso 2 - Caracteristicas:**
- Numero de habitaciones
- Numero de banos
- Area total (m2)
- Precio de arriendo mensual
- Deposito de garantia
- Estrato
- Amenidades (parqueadero, WiFi, cocina integral, etc.)
- Descripcion detallada

**Paso 3 - Imagenes y Videos:**
- Arrastrar y soltar imagenes (max 10, max 5MB cada una)
- Formatos: JPEG, PNG, WebP
- Compresion automatica (max 1920x1080)
- Seleccionar imagen principal
- Reordenar arrastrando
- Videos: subir archivo (max 50MB) o enlace de YouTube

**Paso 4 - Publicar:**
- Revisar toda la informacion
- Clic en **"GUARDAR PROPIEDAD"**
- La propiedad aparece en el listado publico

### Ver Propiedades

**Ruta**: Menu lateral > **Propiedades**

- **Vista escritorio**: Tabla con columnas (titulo, tipo, direccion, habitaciones, estado, acciones)
- **Vista movil**: Tarjetas con foto, titulo, direccion y detalles basicos
- **Filtros**: Por precio, ubicacion, habitaciones, amenidades
- **Acciones**: Ver detalle, Editar, Eliminar

---

## 5. Busqueda de Propiedades

### Explorar Propiedades (Inquilino)

**Ruta**: Menu lateral > **Propiedades**

1. Ver listado de propiedades disponibles
2. Usar filtros para refinar busqueda
3. Hacer clic en una propiedad para ver el detalle completo:
   - Galeria de imagenes
   - Descripcion completa
   - Amenidades
   - Ubicacion en mapa
   - Informacion del arrendador
   - Precio y condiciones
4. Boton **"Agregar a Favoritos"** (corazon)
5. Boton **"Aplicar"** para enviar solicitud de match

---

## 6. Sistema de Matching

### Enviar Solicitud (Inquilino)

**Ruta**: Detalle de propiedad > boton **"Aplicar"**

**Paso 1 - Informacion Personal:**
- Telefono
- Numero de ocupantes
- Fecha deseada de mudanza
- Duracion deseada del arriendo (meses)

**Paso 2 - Situacion Financiera:**
- Ingresos mensuales (el sistema calcula automaticamente la relacion ingreso/renta):
  - Verde (3x o mas): Excelente capacidad de pago
  - Amarillo (2.5-3x): Buena capacidad
  - Rojo (menos de 2.5x): Capacidad limitada
- Tipo de empleo (empleado, independiente, freelancer, estudiante, retirado)
- Checkboxes: referencias de arriendo, prueba de ingresos, autorizacion de credito

**Paso 3 - Preferencias:**
- Tiene mascotas: Si/No (si es si: tipo, raza, tamano, vacunas)
- Fumador: Si/No
- Nivel de prioridad: Bajo, Medio, Alto, Urgente

**Paso 4 - Mensaje al Arrendador:**
- Carta de presentacion (10-1000 caracteres)
- Explicar por que le interesa la propiedad

Clic en **"Enviar Solicitud"** > Confirmacion de envio

### Gestionar Solicitudes (Arrendador)

**Ruta**: Menu lateral > **Contratos** > **Candidatos Aprobados**

El arrendador ve 4 pestanas:

| Pestana | Descripcion |
|---------|-------------|
| **PENDIENTES** | Nuevas solicitudes por revisar |
| **ACEPTADAS** | Solicitudes aprobadas, en proceso |
| **RECHAZADAS** | Solicitudes que el arrendador rechazo |
| **CANCELADAS** | Solicitudes que el inquilino cancelo |

**Acciones sobre solicitudes pendientes:**
- **Ver Detalles**: Informacion completa del candidato
- **Aceptar**: Mueve al inquilino al flujo contractual
- **Rechazar**: Rechaza con mensaje opcional

### Ver Estado de Solicitudes (Inquilino)

**Ruta**: Menu lateral > **Contratos** > **Mis Procesos**

El inquilino ve 3 pestanas:

| Pestana | Descripcion |
|---------|-------------|
| **ENVIADAS** | Solicitudes enviadas pendientes |
| **EN PROCESO** | Solicitudes siendo revisadas |
| **COMPLETADAS** | Solicitudes aceptadas o rechazadas |

---

## 7. Flujo Contractual Completo

Una vez que el arrendador acepta una solicitud de match, comienza el flujo contractual de 5 etapas:

### Etapa 1: Programacion de Visita

**Arrendador:**
1. Hace clic en **"Programar Visita"**
2. Selecciona fecha, hora y agrega notas
3. El inquilino recibe notificacion

**Despues de la visita:**
1. Arrendador hace clic en **"Evaluar Visita"**
2. Aprueba o rechaza al inquilino basado en la visita
3. Si aprueba: avanza a Etapa 2

### Etapa 2: Revision de Documentos

**Inquilino:**
1. Recibe notificacion: "Accion Requerida: Subir Documentos"
2. Hace clic en **"GESTIONAR DOCUMENTOS"**
3. Sube documentos requeridos:
   - Cedula de ciudadania
   - Comprobante de ingresos
   - Referencias personales/laborales
   - Certificado laboral

**Arrendador:**
1. Revisa cada documento en el modal de revision
2. Puede aprobar, rechazar o solicitar correccion de cada documento
3. Hace clic en **"Aprobar Todo"** > Avanza a Etapa 3

### Etapa 3: Creacion del Contrato

**Arrendador:**
1. El sistema le muestra el boton **"Crear Contrato"**
2. Se abre el formulario `LandlordContractForm` con 8 pasos:

| Paso | Contenido |
|------|-----------|
| 1. Informacion del Arrendador | Nombre, cedula, telefono, email, direccion, ciudad |
| 2. Informacion del Arrendatario | Datos del inquilino (pre-llenados del match) |
| 3. Detalles de la Propiedad | Direccion, area, tipo, amoblado (pre-llenado si viene de propiedad) |
| 4. Condiciones Economicas | Canon mensual, deposito, duracion, dia de pago, servicios incluidos, politica de huespedes, incremento de arriendo (IPC/fijo/negociable) |
| 5. Terminos del Contrato | Responsabilidades de mantenimiento, servicios publicos, seguros |
| 6. Garantias del Contrato | Sin garantia / Codeudor por salario / Codeudor por finca raiz. Si aplica: datos completos del codeudor |
| 7. Clausulas Especiales | Clausulas generadas automaticamente segun Ley 820 de 2003 |
| 8. Revision y Creacion | Resumen completo + boton "Ver Borrador del Contrato" |

3. Clic en **"Ver Borrador del Contrato"** > Se abre PDF profesional con:
   - Diseno notarial con marca de agua de la Diosa Temis
   - Clausulas legales colombianas (Ley 820 de 2003)
   - Branding VeriHome
   - Todos los datos de las partes

4. Clic en **"Crear Contrato"** > El contrato se crea en estado BORRADOR

**Inquilino:**
1. Recibe notificacion: "Contrato Listo para Revision"
2. En su dashboard de contratos ve:
   - Boton **"Ver Contrato PDF"** - revisar el documento
   - Boton **"APROBAR Y CONTINUAR"** - acepta los terminos
   - Boton **"SOLICITAR MODIFICACION"** - pide cambios
   - Boton **"RECHAZAR CONTRATO"** - rechaza completamente

3. Si solicita modificacion:
   - Especifica: cual clausula, cambio solicitado, razon
   - El arrendador recibe la solicitud y puede aceptar/rechazar

4. Si ambas partes aprueban > Avanza a Etapa 4

### Etapa 4: Autenticacion Biometrica

(Ver seccion 8 para el detalle completo)

**Orden secuencial obligatorio:**
1. Inquilino completa autenticacion biometrica
2. Codeudor completa autenticacion biometrica (si aplica)
3. Arrendador completa autenticacion biometrica

### Etapa 5: Entrega de Llaves y Ejecucion

**Arrendador:**
1. Hace clic en **"Confirmar Entrega de Llaves"**
2. Confirma la entrega fisica de llaves
3. Hace clic en **"Iniciar Ejecucion del Contrato"**
4. El contrato pasa a estado **ACTIVO**
5. El contrato ha "nacido a la vida juridica"

---

## 8. Autenticacion Biometrica

### Descripcion General

VeriHome implementa un sistema revolucionario de autenticacion biometrica de 5 pasos, cumpliendo con la Ley 820 de 2003 de Colombia. Este proceso es obligatorio para que el contrato tenga validez legal.

**Ruta**: `/app/contracts/{id}/authenticate`

### Orden Secuencial (No se puede saltar)

```
1. Inquilino → Completa 5 pasos biometricos
2. Codeudor → Completa 5 pasos biometricos (si aplica)
3. Arrendador → Completa 5 pasos biometricos
```

El arrendador ve el mensaje "Esperando que el arrendatario complete su autenticacion" hasta que el inquilino termine. No puede iniciar antes.

### Los 5 Pasos Biometricos

#### Paso 1: Captura Facial

1. Se abre la camara del dispositivo (feed en vivo con indicador "EN VIVO")
2. Instrucciones: "Mira directamente a la camara"
3. Se toma foto frontal
4. Se toma foto lateral (opcional)
5. El sistema analiza calidad de imagen y confianza
6. Exito: "Foto frontal capturada"

#### Paso 2: Verificacion de Documento

1. Seleccionar tipo de documento:
   - Cedula de Ciudadania (CC)
   - Cedula de Extranjeria (CE)
   - Pasaporte
   - Licencia de Conduccion
   - RUT
2. Ingresar numero de documento
3. Boton **"Smart Fill"**: extrae automaticamente el numero de la foto del documento
4. Tomar foto del documento
5. El sistema realiza OCR simulado y valida el formato
6. Exito: "Documento verificado"

#### Paso 3: Verificacion Combinada

1. Se muestra la foto del documento junto a la foto facial
2. El sistema compara ambas imagenes
3. Calcula porcentaje de coincidencia
4. Exito: "Verificacion combinada completada"

#### Paso 4: Grabacion de Voz

1. Se muestra la frase del contrato: "Acepto todos los terminos de este contrato"
2. El usuario hace clic en **"Grabar"**
3. Se graba la voz con visualizacion de forma de onda
4. Opcion de reproducir la grabacion
5. El sistema analiza calidad del audio
6. Exito: "Frase grabada exitosamente"

#### Paso 5: Firma Digital

1. Se muestra un lienzo (canvas) para firmar
2. El usuario firma con el dedo (movil) o raton (escritorio)
3. El sistema calcula la calidad de la firma
4. Debe aceptar checkbox de **"Terminos y Condiciones"**
5. Exito: "Firmado digitalmente"

### Resultado

- **Puntuacion de confianza global**: Debe ser >= 70% para aprobar
- Si aprueba: "Autenticacion completada exitosamente"
- Se registra: dispositivo, IP, timestamp, todas las capturas

---

## 9. Renovacion de Contratos

### Renovar un Contrato (Arrendador)

**Ruta**: Menu lateral > **Contratos** > **Renovacion** o desde un contrato activo

**Paso 1 - Seleccionar Contrato:**
- Se muestran contratos activos y por vencer
- Cada tarjeta muestra: propiedad, inquilino, renta actual, fecha de vencimiento
- Los contratos proximos a vencer tienen chip de alerta (rojo si <= 15 dias, naranja si <= 30 dias)

**Paso 2 - Revisar Terminos Actuales:**
- Informacion de la propiedad
- Condiciones economicas actuales (renta, deposito)
- Vigencia actual (inicio, fin, duracion)
- Alerta si el contrato vence pronto

**Paso 3 - Configurar Nuevos Terminos:**
- **Ajuste por IPC** (Ley 820 de 2003, Art. 20):
  - Slider para seleccionar tasa IPC (0% - 15%)
  - El incremento NO puede exceder el IPC del ano anterior
  - Calculo automatico de nueva renta
  - Muestra: renta actual vs nueva renta + diferencia mensual
  - Opcion de consulta automatica al DANE (API datos.gov.co)
- **Duracion**: Selector de 6, 12, 18, 24 o 36 meses
- **Nuevas fechas**: Calculadas automaticamente (nuevo inicio = dia siguiente al vencimiento)
- **Ajuste manual de renta**: Campo para modificar manualmente
- **Terminos adicionales**: Campo de texto libre

**Paso 4 - Confirmar Renovacion:**
- Resumen completo: propiedad, inquilino, renta anterior/nueva, incremento %, diferencia anual
- Nuevas fechas de vigencia
- Alerta legal: "Se generara un borrador conforme a la Ley 820 de 2003"
- Boton **"Confirmar Renovacion"**
- Ambas partes seran notificadas para aprobar los nuevos terminos

---

## 10. Sistema de Pagos

### Metodos de Pago Disponibles

| Metodo | Descripcion |
|--------|-------------|
| **Stripe** | Tarjetas de credito/debito internacionales |
| **Wompi/PSE** | Transferencia bancaria colombiana (PSE) |
| **Nequi** | Billetera digital colombiana |
| **PayPal** | Pagos internacionales |

### Realizar un Pago (Inquilino)

**Ruta**: Menu lateral > **Pagos** > **Nuevo Pago**

1. Seleccionar contrato asociado
2. Verificar monto a pagar
3. Seleccionar metodo de pago:

**Opcion A - Tarjeta (Stripe):**
- Ingresar numero de tarjeta, vencimiento, CVC
- Nombre del titular
- Clic en **"Pagar con Tarjeta"**

**Opcion B - PSE (Transferencia Bancaria):**
- Seleccionar banco de la lista desplegable
- El sistema muestra email y nombre del pagador
- Clic en **"INICIAR PSE"**
- Redirige al portal del banco
- Completar autenticacion en el banco
- Regresa a VeriHome con confirmacion

**Opcion C - PayPal:**
- Clic en **"Pagar con PayPal"**
- Redirige a PayPal para autorizar

4. Confirmacion de pago con numero de transaccion

### Ver Historial de Pagos

**Ruta**: Menu lateral > **Pagos**

- Lista de todas las transacciones
- Filtros por: estado, fecha, monto
- Detalle de cada transaccion
- Opcion de descargar recibo PDF

### Recibos PDF

- Se generan automaticamente por cada pago completado
- Diseno profesional con branding VeriHome
- Incluye: datos de las partes, monto, fecha, numero de transaccion

### Recordatorios Automaticos

El sistema envia automaticamente:
- **Recordatorio previo**: Dias antes del vencimiento
- **Recordatorio dia de pago**: El dia exacto
- **Alerta de mora (3 dias)**: 3 dias despues del vencimiento
- **Alerta de mora (7 dias)**: 7 dias despues del vencimiento
- **Escalacion (15+ dias)**: Notificacion urgente al arrendador

---

## 11. Mensajeria en Tiempo Real

### Acceder a Mensajes

**Ruta**: Menu lateral > **Mensajes**

### Pestanas Disponibles

| Pestana | Funcion |
|---------|---------|
| **Bandeja de Entrada** | Mensajes recibidos con indicador de no leidos |
| **Enviados** | Mensajes enviados |
| **Conversaciones** | Chat en tiempo real (WebSocket) |
| **Carpetas** | Organizar mensajes en carpetas personalizadas |
| **Plantillas** | Mensajes pre-escritos para respuestas rapidas |

### Chat en Tiempo Real

1. Hacer clic en una conversacion
2. Se abre la ventana de chat con:
   - Mensajes anteriores (los suyos a la derecha en azul, los del otro a la izquierda en gris)
   - Indicador de estado en linea (punto verde/gris)
   - Indicador "esta escribiendo..." cuando la otra persona escribe
   - Indicadores de lectura (pendiente, enviado, leido)
3. Escribir mensaje en el campo inferior
4. Opciones: Emoji, Adjuntar archivo, Enviar
5. Los mensajes se entregan instantaneamente via WebSocket

### Nuevo Mensaje

1. Clic en **"Nuevo Mensaje"**
2. Seleccionar destinatario
3. Escribir asunto y mensaje
4. Clic en **"Enviar"**

---

## 12. Solicitudes de Mantenimiento

### Crear Solicitud (Inquilino)

**Ruta**: Menu lateral > **Mantenimiento** > boton **"Nueva Solicitud"**

**Formulario:**

1. **Seleccionar propiedad** (dropdown)

2. **Tipo de mantenimiento** (5 opciones con iconos):
   - Emergencia (rojo) - problemas urgentes
   - Rutina (azul) - mantenimiento regular
   - Preventivo (verde) - prevencion de problemas
   - Reparacion (naranja) - reparacion de danos
   - Mejora (morado) - mejoras o actualizaciones

3. **Prioridad**: Urgente, Alta, Media, Baja

4. **Area afectada** (seleccion multiple, 20 opciones):
   - Bano, Cocina, Sala, Habitacion principal, Habitacion secundaria
   - Comedor, Balcon, Terraza, Garaje, Jardin
   - Area comun, Fachada, Techo, Pisos, Paredes
   - Sistema electrico, Sistema hidraulico, Ventanas, Puertas, Otro

5. **Titulo y descripcion** del problema

6. **Fotos/archivos** - arrastrar y soltar (max 10 archivos)

7. **Instrucciones de acceso** para el tecnico

8. **Presencia del inquilino requerida**: Si/No

9. **Duracion estimada** (horas)

10. Clic en **"CREAR SOLICITUD"**

### Dashboard de Mantenimiento

Muestra 4 tarjetas de estadisticas:
- Total de solicitudes
- Pendientes
- En progreso
- Completadas

Debajo: lista de solicitudes con filtro por pestanas (Todas, Pendientes, En Progreso, Completadas)

Cada solicitud muestra:
- Tipo con icono y color
- Titulo y descripcion
- Estado con stepper visual (pendiente → en progreso → completado)
- Opcion de cancelar (con confirmacion)

---

## 13. Calificaciones y Reputacion

### Calificar (Todos los Roles)

**Ruta**: Menu lateral > **Calificaciones** > **Nueva Calificacion**

- Seleccionar a quien calificar (inquilino, arrendador, propiedad, servicio)
- Puntuacion de 1 a 5 estrellas
- Categorias especificas:
  - **Propiedades**: estado, ubicacion, relacion precio-calidad
  - **Arrendadores**: comunicacion, mantenimiento, confiabilidad
  - **Inquilinos**: puntualidad de pago, cuidado de propiedad, convivencia
  - **Proveedores**: calidad del trabajo, puntualidad, profesionalismo
- Comentario escrito (opcional)

### Ver Calificaciones Recibidas

- Promedio general con estrellas
- Distribucion por categoria
- Historial de comentarios
- Score de reputacion (0-1000 puntos)

---

## 14. Servicios Profesionales

### Explorar Servicios

**Ruta**: Menu lateral > **Servicios**

- Catalogo de servicios disponibles por categoria:
  - Limpieza, Mantenimiento, Plomeria, Electricidad
  - Pintura, Jardineria, Seguridad, Mudanza
  - Reparacion, Instalacion

### Solicitar un Servicio

1. Seleccionar servicio del catalogo
2. Llenar formulario de solicitud:
   - Descripcion de lo necesitado
   - Fecha preferida
   - Presupuesto estimado
3. El proveedor recibe la solicitud
4. Puede aceptar, rechazar o contactar al cliente

### Gestionar Solicitudes (Proveedor de Servicios)

**Ruta**: Menu lateral > **Servicios** > **Solicitudes de Servicio**

- Ver solicitudes pendientes con estadisticas rapidas
- Acciones por solicitud:
  - **Aceptar**: Mueve a "En Progreso"
  - **Rechazar**: Rechaza la solicitud
  - **Marcar como Completado**: Finaliza el servicio

---

## 15. Panel de Administracion

### Acceso

**Ruta**: Menu del perfil (esquina superior derecha) > **Admin Legal**

Solo disponible para usuarios con rol de **Staff** o **Superusuario**.

### Secciones del Panel Admin

| Seccion | Ruta | Funcion |
|---------|------|---------|
| **Dashboard** | `/app/admin/` | Vista general con KPIs, contratos pendientes, alertas |
| **Contratos** | `/app/admin/contracts` | Lista de todos los contratos para revision |
| **Revision de Contrato** | `/app/admin/contracts/{id}` | Revision detallada, aprobar/rechazar |
| **Auditoria** | `/app/admin/audit` | Logs de actividad y auditoria |
| **Seguridad** | `/app/admin/security` | Analisis de seguridad, deteccion de fraude |
| **Logs del Sistema** | `/app/admin/logs` | Visor de logs del sistema |
| **Configuracion** | `/app/admin/settings` | Configuracion de la plataforma |
| **Mantenimiento** | `/app/admin/maintenance` | Herramientas de mantenimiento del sistema |

### Configuracion del Sistema

**Ruta**: `/app/admin/settings`

| Seccion | Opciones |
|---------|----------|
| **Retencion de Datos** | Dias de retencion de logs (30-365), limpieza automatica |
| **Alertas de Seguridad** | Umbral de riesgo (0-100), dias para contrato urgente |
| **Notificaciones** | Notificaciones por email (on/off), push en navegador (on/off) |
| **Umbrales Biometricos** | Confianza minima facial (%), documento (%), voz (%), global (%) |
| **Clausulas por Defecto** | Duracion default (meses), requerir codeudor, auto-generar clausulas Ley 820 |

### Mantenimiento del Sistema

**Ruta**: `/app/admin/maintenance`

| Operacion | Descripcion |
|-----------|-------------|
| **Health Check** | Verificar estado de BD, Redis, almacenamiento, Celery |
| **Limpiar Logs** | Eliminar logs mayores a 30 dias |
| **Limpiar Cache** | Vaciar todas las entradas de cache |
| **Limpiar Sesiones** | Eliminar sesiones expiradas/inactivas |
| **Optimizar BD** | VACUUM ANALYZE (PostgreSQL) o PRAGMA integrity_check (SQLite) |

---

## 16. Configuracion y Perfil

### Editar Perfil

**Ruta**: Menu del perfil > **Perfil**

- Foto de perfil
- Nombre completo
- Email (no editable)
- Telefono
- Direccion
- Ciudad
- Tipo de documento y numero

### Hoja de Vida (Inquilinos y Proveedores)

**Ruta**: Menu del perfil > **Hoja de Vida**

- Informacion laboral
- Experiencia
- Referencias
- Documentos adjuntos

### Configuracion de Cuenta

**Ruta**: Menu del perfil > **Configuracion**

- Cambiar contrasena
- Preferencias de notificacion
- Idioma (Espanol / Ingles)
- Tema de la aplicacion

---

## Apendice: Navegacion por Rol

### Menu Lateral (Todos los Usuarios)

```
Panel de Control
Propiedades
Contratos
Pagos
Mensajes
Calificaciones
Servicios
Solicitudes
```

### Opciones Adicionales por Rol

| Funcion | Arrendador | Inquilino | Proveedor | Admin |
|---------|:----------:|:---------:|:---------:|:-----:|
| Crear Propiedad | Si | No | No | Si |
| Crear Contrato | Si | No | No | Si |
| Candidatos Aprobados | Si | No | No | Si |
| Mis Procesos | No | Si | No | No |
| Renovar Contrato | Si | No | No | Si |
| Solicitar Mantenimiento | No | Si | No | No |
| Gestionar Servicios | No | No | Si | Si |
| Panel Admin | No | No | No | Si |

---

## Apendice: Atajos de Teclado y Navegacion

### Navegacion Rapida

- **Escritorio**: Menu lateral permanente (240px)
- **Tablet**: Menu lateral colapsable
- **Movil**: Menu deslizable + barra de navegacion inferior (4 items principales)

### Idiomas Disponibles

- Espanol (predeterminado)
- Ingles

Cambiar idioma en: **Configuracion** > **Idioma**

---

*Documento generado el 19 de marzo de 2026*
*VeriHome v1.0 - Plataforma Inmobiliaria Enterprise con Autenticacion Biometrica*
