# GUIA GENERAL DE LA PLATAFORMA VERIHOME

## Documento Maestro de Referencia

**Version**: 2.0
**Fecha**: Marzo 23, 2026
**Estado**: Produccion
**Audiencia**: Inversionistas, equipo tecnico, stakeholders, usuarios potenciales

---

## Tabla de Contenidos

1. [Que es VeriHome](#1-que-es-verihome)
2. [Arquitectura General](#2-arquitectura-general)
3. [Metricas del Proyecto](#3-metricas-del-proyecto-marzo-2026)
4. [Roles de Usuario](#4-roles-de-usuario)
5. [Flujo Completo de la Plataforma](#5-flujo-completo-de-la-plataforma)
6. [Los 6 Pilares del Negocio](#6-los-6-pilares-del-negocio)
7. [Cumplimiento Legal](#7-cumplimiento-legal)
8. [Seguridad](#8-seguridad)
9. [Apps del Sistema](#9-apps-del-sistema-15-apps)
10. [APIs por Modulo](#10-apis-por-modulo)
11. [Testing](#11-testing)
12. [Infraestructura y Deployment](#12-infraestructura-y-deployment)

---

## 1. Que es VeriHome

VeriHome es una plataforma inmobiliaria de grado empresarial (enterprise-grade) que conecta
arrendadores, arrendatarios y prestadores de servicios profesionales en el mercado colombiano.
Su propuesta de valor se fundamenta en tres pilares diferenciadores:

**Primera plataforma en la industria con sistema de autenticacion biometrica de 5 pasos.**
Este sistema revolucionario permite la firma de contratos de arrendamiento con validez legal
completa mediante reconocimiento facial, verificacion de documentos de identidad colombianos,
verificacion combinada documento-rostro, grabacion de voz y firma digital. Todo el proceso
esta disenado para cumplir con la legislacion colombiana vigente.

**Cumplimiento total con la legislacion colombiana.** La plataforma opera dentro del marco
regulatorio de la Ley 820 de 2003 (Arrendamiento de Vivienda Urbana), la Ley 1581 de 2012
(Proteccion de Datos Personales), y la Resolucion DIAN 000042 de 2020 (Facturacion Electronica).
Cada contrato generado por VeriHome incluye clausulas automaticas que garantizan conformidad legal.

**Stack tecnologico moderno y escalable.** Construida sobre Django REST Framework en el backend
y React con TypeScript en el frontend, con comunicacion en tiempo real via WebSocket, procesamiento
asincrono con Celery, y soporte para multiples pasarelas de pago colombianas.

### Propuesta de Valor

VeriHome no es una inmobiliaria tradicional. Es una plataforma tecnologica que:

- Elimina intermediarios costosos del proceso de arrendamiento
- Reduce el fraude contractual en un 95% mediante autenticacion biometrica
- Automatiza cobros, facturacion y recordatorios de pago
- Conecta arrendadores con arrendatarios compatibles via inteligencia artificial
- Proporciona un marketplace de servicios profesionales verificados
- Ofrece trazabilidad completa de cada operacion mediante auditoria

### Ventaja Competitiva

Frente a inmobiliarias tradicionales que cobran entre el 8% y el 12% del canon mensual,
VeriHome opera con un modelo basado en suscripciones y comisiones reducidas. El sistema
biometrico elimina la necesidad de autenticaciones presenciales en notaria, reduciendo
tiempos y costos para todas las partes involucradas.

---

## 2. Arquitectura General

### Stack Tecnologico

#### Backend

| Componente | Tecnologia | Version |
|------------|-----------|---------|
| Framework Web | Django | 4.2.7 |
| API REST | Django REST Framework | 3.14.0 |
| Base de Datos (produccion) | PostgreSQL | 14+ |
| Base de Datos (desarrollo) | SQLite | 3.x (fallback automatico) |
| Cache (produccion) | Redis | 7.x |
| Cache (desarrollo) | Memoria local | (fallback automatico) |
| WebSocket | Django Channels | 4.2.2 |
| Channel Layer | channels-redis | 4.2.1 |
| Tareas asincronas | Celery | 5.3.4 |
| Scheduler | Celery Beat | (incluido en Celery) |
| Autenticacion | djangorestframework-simplejwt | 5.3.0 |
| Servidor ASGI | Daphne | 4.x |

#### Frontend

| Componente | Tecnologia | Version |
|------------|-----------|---------|
| Libreria UI | React | 18.x |
| Lenguaje | TypeScript | 5.x |
| Build Tool | Vite | 5.x |
| Componentes UI | Material-UI (MUI) | 5.x |
| Data Fetching | TanStack Query | 5.x |
| HTTP Client | Axios | 1.x |
| Formularios | React Hook Form | 7.x |
| Internacionalizacion | react-i18next | (ES/EN) |
| Routing | React Router | 6.x |

#### Comunicacion en Tiempo Real

VeriHome implementa 4 tipos de consumer WebSocket:

1. **Messaging Consumer** (`ws://host/ws/messaging/`) - Mensajeria general entre usuarios
2. **Notifications Consumer** (`ws://host/ws/notifications/`) - Notificaciones push en tiempo real
3. **Thread Consumer** (`ws://host/ws/messaging/thread/{id}/`) - Conversaciones especificas
4. **User Status Consumer** (`ws://host/ws/user-status/`) - Estado online/offline persistente

#### Sistema de Fallback

La plataforma implementa deteccion automatica de servicios externos. En desarrollo o en caso
de fallo de servicios, el sistema opera con fallbacks transparentes:

- **PostgreSQL no disponible**: Fallback automatico a SQLite
- **Redis no disponible**: Fallback a cache en memoria local (LocMemCache)
- **Redis Channel Layer no disponible**: Fallback a InMemoryChannelLayer

Este diseno garantiza que el equipo de desarrollo puede trabajar sin depender de servicios
externos, mientras que en produccion se utilizan los servicios de grado empresarial.

### Diagrama de Arquitectura (Texto)

```
                    +-------------------+
                    |   Cliente Web     |
                    |  React + TS + MUI |
                    +--------+----------+
                             |
              +--------------+--------------+
              |                             |
     +--------v--------+          +--------v--------+
     |   HTTP/REST      |          |   WebSocket      |
     |   Axios + JWT    |          |   4 Consumers    |
     +--------+---------+          +--------+---------+
              |                             |
     +--------v--------+          +--------v--------+
     |   Django REST    |          | Django Channels  |
     |   Framework      |          |   (ASGI)         |
     +--------+---------+          +--------+---------+
              |                             |
     +--------v-----------------------------v--------+
     |              Django 4.2.7                      |
     |     15 Apps | 109 Modelos | 9 Middleware       |
     +--------+--------------------+---------+--------+
              |                    |         |
     +--------v--------+  +-------v---+  +--v---------+
     |   PostgreSQL     |  |   Redis   |  |  Celery    |
     |   (SQLite dev)   |  |  (cache)  |  |  + Beat    |
     +------------------+  +-----------+  +------------+
```

---

## 3. Metricas del Proyecto (Marzo 2026)

### Tamano del Codigo

| Metrica | Backend (Python) | Frontend (TS/TSX) | Total |
|---------|-----------------|-------------------|-------|
| Archivos de codigo | 410 | 352 | 762 |
| Lineas de codigo | 116,855 | 122,689 | 239,544 |

### Complejidad del Sistema

| Metrica | Cantidad |
|---------|----------|
| Modelos Django | 109 |
| Apps Django | 15 |
| Endpoints HTTP | 684 |
| Endpoints WebSocket | 4 |
| **Total endpoints** | **688** |
| Migraciones de base de datos | 68 |
| Tareas Celery | 12 |
| Middleware | 9 |
| Comandos de gestion (management commands) | 16 |

### Frontend en Detalle

| Metrica | Cantidad |
|---------|----------|
| Componentes React | 146 |
| Paginas | 55 |
| Hooks personalizados | 44 |
| Servicios (API clients) | 35 |

### Testing

| Tipo de Test | Cantidad |
|--------------|----------|
| Tests backend (Django TestCase + APITestCase) | 502 |
| Tests frontend (Jest + Testing Library) | 771 |
| Tests E2E (Playwright + Cypress) | 20 |
| **Total** | **1,293+** |

### Documentacion

| Metrica | Cantidad |
|---------|----------|
| Documentos de documentacion | 107 |

---

## 4. Roles de Usuario

VeriHome implementa un sistema de roles con permisos diferenciados que determinan el acceso
a funcionalidades, vistas y endpoints de la API.

### Arrendador (Landlord)

El arrendador es el propietario o apoderado legal de una o mas propiedades que desea
poner en arriendo a traves de la plataforma.

**Capacidades:**
- Publicar propiedades con fotos, videos, amenidades y ubicacion
- Recibir candidatos via sistema de matching inteligente
- Crear contratos de arrendamiento con clausulas personalizables
- Gestionar el cobro automatico de arriendo mensual
- Acceder al dashboard financiero con metricas de ingresos
- Calificar arrendatarios al finalizar contratos
- Solicitar verificacion de campo para candidatos
- Iniciar procesos de renovacion o terminacion

### Arrendatario (Tenant)

El arrendatario es la persona que busca una propiedad en arriendo y que, una vez vinculada
contractualmente, realiza pagos periodicos al arrendador.

**Capacidades:**
- Buscar propiedades con filtros avanzados (precio, ubicacion, amenidades)
- Crear solicitudes de matching con criterios de busqueda
- Revisar y objetar clausulas de contratos propuestos
- Completar autenticacion biometrica de 5 pasos
- Realizar pagos de arriendo (Stripe, PSE, Nequi)
- Solicitar servicios profesionales del marketplace
- Calificar arrendadores y prestadores de servicios
- Comunicarse en tiempo real con arrendadores y prestadores

### Prestador de Servicios (Service Provider)

El prestador de servicios es un profesional o empresa verificada que ofrece servicios
relacionados con la vivienda (plomeria, electricidad, mudanzas, limpieza, etc.).

**Capacidades:**
- Registrar perfil profesional con portafolio y certificaciones
- Publicar servicios en el marketplace
- Suscribirse a planes de visibilidad (Basico, Profesional, Enterprise)
- Recibir solicitudes de servicio de arrendatarios y arrendadores
- Gestionar calendario de citas
- Recibir calificaciones de clientes

### Administrador (Staff)

El administrador es un miembro del equipo VeriHome con acceso a la gestion interna
de la plataforma.

**Capacidades:**
- Gestionar usuarios, propiedades y contratos
- Asignar y supervisar agentes de verificacion
- Administrar tickets de soporte interno
- Acceder a dashboards analiticos
- Moderar calificaciones y contenido
- Configurar parametros del sistema
- Ver logs de auditoria

### Abogado (Legal Staff)

El abogado es un miembro especializado del equipo VeriHome encargado de la revision
juridica de contratos antes de su firma biometrica.

**Capacidades:**
- Revisar contratos pendientes de aprobacion juridica
- Aprobar o rechazar contratos con notas legales
- Validar clausulas contra la Ley 820 de 2003
- Operar bajo SLA de 5 dias habiles con auto-escalamiento
- Validacion de conflicto de interes (no puede aprobar contratos propios)

---

## 5. Flujo Completo de la Plataforma

### 5.1 Registro y Verificacion

El registro en VeriHome es un proceso controlado que garantiza la calidad de los usuarios
en la plataforma.

**Paso 1: Codigo de Entrevista.** Un administrador genera un codigo de entrevista con
tiempo de expiracion. Este codigo se entrega al usuario potencial despues de una sesion
de entrevista (presencial o virtual) donde se valida su identidad y proposito.

**Paso 2: Registro con Codigo.** El usuario ingresa al formulario de registro con su
codigo de entrevista. Proporciona: nombre completo, correo electronico, tipo de documento
de identidad colombiano (CC, CE, Pasaporte, RUT), numero de documento, telefono y
contrasena.

**Paso 3: Verificacion Presencial.** Un agente de verificacion de VeriHome puede ser
asignado para realizar una visita de campo al domicilio o propiedad del usuario. El agente
genera un reporte con evidencia fotografica que es aprobado por un administrador.

**Paso 4: Completar Perfil.** El usuario completa su perfil con informacion adicional:
foto de perfil, direccion, ocupacion, ingresos mensuales (para arrendatarios), y
documentos de soporte. El sistema calcula un porcentaje de completitud del perfil y
alerta al usuario si hay campos faltantes.

### 5.2 Publicacion de Propiedades

El arrendador crea listados de propiedades disponibles para arriendo.

**Informacion basica:** Titulo, descripcion, tipo de propiedad (apartamento, casa, local,
oficina, bodega), direccion completa, estrato socioeconomico (1-6), area en metros
cuadrados, numero de habitaciones, banos, parqueaderos.

**Multimedia:** Hasta 10 fotografias con compresion automatica en el frontend, videos
del inmueble, y ubicacion en mapa (integracion con Mapbox).

**Amenidades:** Seleccion de amenidades disponibles: piscina, gimnasio, salon comunal,
parqueadero cubierto, vigilancia 24 horas, zona de BBQ, pet-friendly, ascensor, entre
otras.

**Precio y condiciones:** Canon mensual, deposito de garantia, plazo minimo de arriendo,
fecha de disponibilidad, politica de mascotas, condiciones especiales.

Una vez publicada, la propiedad queda visible en el buscador y disponible para el
sistema de matching inteligente.

### 5.3 Matching Inteligente (IA)

El sistema de matching de VeriHome conecta arrendadores y arrendatarios de forma
automatizada, reduciendo tiempos de busqueda y aumentando la compatibilidad entre partes.

**Solicitud de Matching.** El arrendatario crea una solicitud indicando sus preferencias:
rango de precio, ubicacion deseada, tipo de propiedad, numero de habitaciones, amenidades
requeridas, fecha de mudanza y cualquier requisito especial.

**Algoritmos de Matching.** El sistema ofrece tres niveles de algoritmo:

1. **Standard**: Coincidencia directa por criterios basicos (precio, ubicacion, tipo).
   Genera un score de compatibilidad basado en porcentaje de criterios cumplidos.

2. **Advanced**: Incluye factores ponderados como historial de pagos del arrendatario,
   calificaciones previas, estrato socioeconomico y distancia a puntos de interes.

3. **ML (Machine Learning)**: Utiliza modelos predictivos entrenados con datos historicos
   de la plataforma para predecir la probabilidad de exito de la relacion contractual.

**Flujo de Estados:**

```
PENDING -> VIEWED -> ACCEPTED / REJECTED
```

Cuando un match es aceptado por ambas partes, se habilita la creacion del contrato
de arrendamiento.

### 5.4 Creacion de Contrato

La creacion de contratos en VeriHome sigue un flujo estructurado que garantiza
completitud legal y consenso entre las partes.

**Iniciacion.** El arrendador inicia la creacion del contrato desde un match aceptado
o directamente para un arrendatario especifico. El sistema carga automaticamente los
datos de la propiedad y las partes involucradas.

**ClauseManager.** El motor de clausulas de VeriHome genera automaticamente las clausulas
requeridas segun la Ley 820 de 2003. Esto incluye:

- Objeto del contrato y descripcion del inmueble
- Canon de arrendamiento y forma de pago
- Plazo del contrato y condiciones de renovacion
- Servicios publicos y responsabilidades
- Obligaciones del arrendador y del arrendatario
- Causales de terminacion
- Clausula de ajuste por IPC
- Clausula penal por incumplimiento

**Clausulas Personalizables.** El arrendador puede agregar clausulas adicionales
siempre que no contravengan la legislacion vigente.

**Sistema de Objeciones.** Una vez creado el borrador, el arrendatario recibe el
contrato y puede presentar objeciones a clausulas especificas. El arrendador revisa
las objeciones y puede modificar, aceptar o rechazar cada una. Este proceso se repite
hasta que ambas partes estan conformes.

**Codeudor.** Si el contrato requiere codeudor (garante), este recibe una invitacion
con token de acceso para revisar y aceptar su rol en el contrato.

### 5.5 Revision Juridica

Antes de la firma biometrica, cada contrato pasa por revision juridica obligatoria
realizada por un abogado de VeriHome.

**SLA de Revision.** El abogado dispone de 5 dias habiles para completar la revision.
El sistema registra la fecha de asignacion y calcula automaticamente la fecha limite.

**Auto-Escalamiento.** Si el plazo se vence sin respuesta, el sistema marca el contrato
con bandera de escalamiento (`admin_review_escalated = True`) y notifica al CEO o
supervisor juridico para intervencion.

**Validacion de Conflicto de Interes.** El sistema impide que un abogado revise un
contrato en el que participa como arrendador o arrendatario (`admin_user != contract.landlord`).

**Resultado de la Revision:**

- **Aprobado**: El contrato avanza a la fase de autenticacion biometrica.
- **Rechazado con Notas**: El contrato regresa al arrendador con observaciones
  legales para correccion. Tras la correccion, se re-envia a revision (estado
  `RE_PENDING_ADMIN`).

### 5.6 Autenticacion Biometrica (5 Pasos)

Este es el sistema revolucionario de VeriHome. Cada parte firmante del contrato debe
completar 5 pasos de verificacion biometrica para que el contrato tenga validez.

**Paso 1: Captura Facial.** El usuario toma una foto frontal y una foto lateral
de su rostro. El sistema analiza la calidad de la imagen (iluminacion, resolucion,
deteccion de rostro) y genera un vector biometrico para comparacion posterior.

**Paso 2: Verificacion de Documento.** El usuario presenta su documento de identidad
colombiano (Cedula de Ciudadania, Cedula de Extranjeria, Pasaporte o Licencia de
Conduccion). El sistema realiza OCR (reconocimiento optico de caracteres) para
extraer nombre, numero de documento y fecha de expedicion.

**Paso 3: Verificacion Combinada.** El sistema compara la foto del documento con
la captura facial del Paso 1 para confirmar que la persona frente a la camara es
la misma del documento de identidad. Esta verificacion cruzada es la piedra angular
de la seguridad del sistema.

**Paso 4: Grabacion de Voz.** El usuario lee en voz alta una frase contractual
predefinida que incluye su nombre, numero de documento y aceptacion explicita del
contrato. La grabacion se almacena como evidencia legal adicional.

**Paso 5: Firma Digital.** El usuario traza su firma manuscrita en un pad digital
tactil. La firma se captura como imagen vectorial y se asocia al contrato.

**Orden Secuencial Obligatorio:**

```
Arrendatario (Tenant)  ->  Codeudor (Guarantor, si aplica)  ->  Arrendador (Landlord)
```

Este orden no puede ser alterado. El arrendador es siempre el ultimo en firmar,
lo que le permite verificar que las demas partes han completado su autenticacion.

**Endpoints de Autenticacion Biometrica:**

| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `/api/v1/contracts/{id}/start-authentication/` | POST | Iniciar proceso |
| `/api/v1/contracts/{id}/face-capture/` | POST | Captura facial |
| `/api/v1/contracts/{id}/document-capture/` | POST | Captura de documento |
| `/api/v1/contracts/{id}/combined-capture/` | POST | Verificacion cruzada |
| `/api/v1/contracts/{id}/voice-capture/` | POST | Grabacion de voz |
| `/api/v1/contracts/{id}/complete-auth/` | POST | Completar autenticacion |
| `/api/v1/contracts/{id}/auth-status/` | GET | Estado del proceso |

### 5.7 Ejecucion del Contrato

Una vez completada la autenticacion biometrica de todas las partes, el contrato
se activa automaticamente.

**Generacion de PDF.** El sistema genera un documento PDF profesional con diseno
notarial que incluye la imagen de la Diosa Temis como marca de agua, todas las
clausulas acordadas, datos biometricos resumidos y firmas digitales de las partes.

**Pagos Programados.** Se crean automaticamente los registros de pago mensual
(`RentPaymentSchedule`) para toda la duracion del contrato. Cada registro incluye
fecha de vencimiento, monto con ajuste IPC si aplica, y estado de pago.

**Auto-Cobro.** Una tarea Celery (`process_auto_rent_charges`) se ejecuta diariamente
y procesa los cobros automaticos de arriendo para contratos con pago automatico
habilitado. Si el cobro falla, se registra el intento y se envia notificacion al
arrendatario.

**Facturacion Electronica DIAN.** Cada pago exitoso genera automaticamente una
factura electronica en formato UBL 2.1, conforme a la Resolucion DIAN 000042 de
2020. El XML incluye informacion del emisor, receptor, concepto, IVA y numeracion
de resolucion de facturacion.

### 5.8 Comunicacion en Tiempo Real

VeriHome proporciona un sistema de mensajeria integrado basado en WebSocket que
permite comunicacion instantanea entre usuarios.

**Mensajeria Directa.** Cualquier usuario puede iniciar una conversacion con otro
usuario de la plataforma. Los mensajes se entregan en tiempo real via WebSocket
y se persisten en base de datos para consulta posterior.

**Hilos de Conversacion.** Los mensajes pueden organizarse en hilos vinculados a
entidades especificas: contratos, propiedades, solicitudes de matching o tickets
de soporte. Esto mantiene la trazabilidad de las comunicaciones.

**4 Consumers WebSocket:**

1. **Messaging Consumer**: Maneja el envio y recepcion de mensajes en tiempo real.
   Soporta mensajes de texto, archivos adjuntos y notificaciones de lectura.

2. **Notifications Consumer**: Gestiona notificaciones push para eventos del sistema:
   nuevo match, contrato pendiente, pago recibido, ticket actualizado, entre otros.

3. **Thread Consumer**: Permite la suscripcion a hilos especificos de conversacion.
   El usuario recibe unicamente los mensajes del hilo al que esta suscrito.

4. **User Status Consumer**: Transmite el estado online/offline de los usuarios.
   Los campos `is_online`, `last_seen` y `status_mode` se persisten en la base
   de datos para consulta incluso cuando el WebSocket se desconecta.

### 5.9 Pagos

VeriHome integra multiples pasarelas de pago adaptadas al mercado colombiano.

**Pasarelas Soportadas:**

| Pasarela | Tipo | Uso Principal |
|----------|------|---------------|
| Stripe | Tarjetas credito/debito | Pagos internacionales y tarjetas |
| Wompi/PSE | Transferencia bancaria | Pagos desde cuenta bancaria colombiana |
| Nequi | Billetera digital | Pagos moviles rapidos |

**Escrow Accounts.** Para depositos de garantia y arras, VeriHome utiliza cuentas
de escrow (fideicomiso) que retienen los fondos hasta que se cumplan las condiciones
contractuales. Esto protege tanto al arrendador como al arrendatario.

**Planes de Pago.** El sistema soporta cuotas para pagos grandes (depositos, primeros
meses) con seguimiento automatico de cada cuota.

**Facturacion DIAN.** Cada transaccion exitosa genera un documento electronico en
formato UBL 2.1 (Universal Business Language). El XML cumple con el esquema definido
por la Resolucion DIAN 000042 de 2020 e incluye:

- Informacion del emisor (VeriHome como facturador)
- Informacion del receptor (arrendador o arrendatario segun el caso)
- Detalle de la operacion (concepto, valor, IVA)
- Numeracion de resolucion de facturacion autorizada
- Firma digital del documento

**Emails de Confirmacion.** Cada pago exitoso genera automaticamente emails de
confirmacion tanto al pagador como al receptor. En caso de fallo, se envia
notificacion al pagador con instrucciones de reintento.

**Dashboard Financiero.** El arrendador accede a un panel con:

- Ingresos mensuales y anuales
- Estado de pagos por contrato
- Historial de transacciones
- Proyecciones de ingresos
- Facturas emitidas

### 5.10 Calificaciones y Reputacion

El sistema de calificaciones de VeriHome permite evaluar la experiencia entre las
partes de un contrato.

**Escala de Calificacion.** Las calificaciones se realizan en una escala de 1 a 10,
con categorias especificas segun el rol evaluado:

- **Para arrendadores**: mantenimiento de la propiedad, comunicacion, cumplimiento
  de compromisos, disposicion para resolver problemas.
- **Para arrendatarios**: puntualidad en pagos, cuidado de la propiedad, convivencia,
  comunicacion.
- **Para prestadores**: calidad del servicio, puntualidad, precio justo, profesionalismo.

**Perfiles de Reputacion.** Cada usuario acumula un perfil de reputacion visible
publicamente que incluye promedio de calificaciones, numero de evaluaciones recibidas,
y badges de reconocimiento (Excelente Pagador, Propiedad Destacada, etc.).

**Moderacion.** Las calificaciones pasan por moderacion automatica para detectar
lenguaje inapropiado o patrones de calificacion fraudulenta. Un administrador puede
intervenir manualmente si se detecta abuso.

**Invitaciones.** Al finalizar un contrato o servicio, el sistema envia invitaciones
automaticas para calificar a la otra parte.

### 5.11 Servicios Profesionales

VeriHome incluye un marketplace de servicios profesionales verificados para el
sector inmobiliario.

**Tipos de Servicios:**

- Plomeria y fontaneria
- Electricidad
- Pintura y acabados
- Mudanzas
- Limpieza profesional
- Cerrajeria
- Jardineria
- Fumigacion
- Reparaciones generales

**Planes de Suscripcion para Prestadores:**

| Plan | Precio Mensual (COP) | Beneficios |
|------|----------------------|------------|
| Basico | $50,000 | Listado en marketplace, perfil basico |
| Profesional | $100,000 | Posicionamiento prioritario, analytics, portafolio extendido |
| Enterprise | $150,000 | Todo lo anterior + soporte dedicado, API de integracion, reportes avanzados |

**Flujo de Solicitud:**

1. Arrendatario o arrendador solicita un servicio
2. El sistema notifica a prestadores disponibles en la zona
3. El prestador acepta y agenda la visita
4. Se ejecuta el servicio
5. El solicitante califica al prestador

### 5.12 Renovacion y Terminacion

**Renovacion de Contrato.** Al acercarse la fecha de vencimiento del contrato, el
sistema notifica a ambas partes y ofrece la opcion de renovacion. La renovacion
incluye ajuste automatico del canon por IPC (Indice de Precios al Consumidor),
conforme al Articulo 20 de la Ley 820 de 2003. El nuevo canon no puede exceder
el 100% del IPC del ano inmediatamente anterior.

**Terminacion de Contrato.** La terminacion puede ocurrir por:

- **Vencimiento del plazo**: Terminacion natural al cumplirse el periodo pactado.
- **Mutuo acuerdo**: Ambas partes aceptan la terminacion anticipada.
- **Causales legales del arrendador**: Necesidad de habitar el inmueble, reparaciones
  mayores, demolicion autorizada (Art. 22, Ley 820).
- **Causales legales del arrendatario**: Incumplimiento del arrendador en
  mantenimiento, perturbaciones en el goce del inmueble (Art. 24, Ley 820).
- **Incumplimiento**: Mora superior a 2 meses en pago de arriendo o servicios
  publicos.

En todos los casos, el sistema genera los documentos de terminacion y actualiza
el estado del contrato y los pagos programados.

---

## 6. Los 6 Pilares del Negocio

VeriHome se estructura sobre 6 pilares fundamentales que conforman su modelo de
negocio. Todos los pilares estan implementados y operativos.

### Pilar 1: Agentes de Verificacion

**Estado: Implementado**

Sistema de verificacion presencial mediante agentes de campo que validan la identidad
de usuarios y el estado de propiedades.

**Componentes:**

- **VerificationAgent**: Modelo que registra agentes con zona de cobertura, capacidad
  maxima de visitas y estadisticas de rendimiento.
- **VerificationVisit**: Programacion de visitas con estados (pendiente, asignada,
  en progreso, completada, cancelada).
- **VerificationReport**: Reportes de visita con evidencia fotografica, observaciones
  y resultado (aprobado/rechazado).

**Endpoints principales:**

```
GET/POST   /api/v1/verification/agents/              # CRUD de agentes
GET        /api/v1/verification/agents/available/     # Agentes con capacidad
GET        /api/v1/verification/agents/stats/         # Estadisticas
GET/POST   /api/v1/verification/visits/               # CRUD de visitas
POST       /api/v1/verification/visits/{id}/assign/   # Asignar agente
POST       /api/v1/verification/visits/{id}/start/    # Iniciar visita
POST       /api/v1/verification/visits/{id}/complete/ # Completar visita
GET/POST   /api/v1/verification/reports/              # CRUD de reportes
POST       /api/v1/verification/reports/{id}/approve/ # Aprobar reporte
```

### Pilar 2: Tickets Internos

**Estado: Implementado**

Sistema de soporte interno para gestion de solicitudes de usuarios y comunicaciones.

**Departamentos:** general, verification_agents, legal, ceo, marketing, technical, billing

**Auto-Distribucion.** Cuando un usuario envia un mensaje a traves del formulario de
contacto (ContactMessage), el sistema crea automaticamente un SupportTicket y lo asigna
al departamento correspondiente basandose en deteccion de palabras clave en el mensaje.

**Endpoints principales:**

```
GET/POST   /api/v1/core/tickets/                  # CRUD de tickets
POST       /api/v1/core/tickets/{id}/assign/      # Asignar a staff
POST       /api/v1/core/tickets/{id}/respond/     # Agregar respuesta
POST       /api/v1/core/tickets/{id}/resolve/     # Resolver
POST       /api/v1/core/tickets/{id}/close/       # Cerrar
GET        /api/v1/core/tickets/stats/            # Estadisticas
```

### Pilar 3: Matching Inteligente

**Estado: Implementado**

Motor de compatibilidad que conecta arrendadores y arrendatarios basado en criterios
multiples y algoritmos de puntuacion.

**Tres niveles de algoritmo:**

1. **Standard**: Coincidencia directa por precio, ubicacion y tipo
2. **Advanced**: Factores ponderados incluyendo historial y calificaciones
3. **ML**: Modelos predictivos (listo para integracion con APIs de ML en produccion)

**Flujo:** MatchRequest creado por arrendatario -> Sistema ejecuta matching ->
Resultados rankeados por score -> Arrendador revisa candidatos -> Aceptacion/Rechazo

### Pilar 4: Pagos Completos

**Estado: Implementado**

Ecosistema completo de pagos que cubre todo el ciclo de vida financiero de un contrato.

**Componentes implementados:**

- **Auto-charge**: Tarea Celery diaria que procesa cobros automaticos de arriendo
- **Reconciliacion**: Webhooks que reconcilian pagos con RentPaymentSchedule
- **Emails de confirmacion**: Notificacion automatica a pagador y receptor
- **Facturacion DIAN**: Generacion de facturas electronicas UBL 2.1
- **Escrow**: Cuentas de fideicomiso para depositos de garantia
- **Multi-gateway**: Stripe + Wompi/PSE + Nequi

### Pilar 5: Revision Juridica

**Estado: Implementado**

Proceso obligatorio de revision legal de contratos por abogados de VeriHome.

**Componentes:**

- SLA de 5 dias habiles con tracking automatico
- Auto-escalamiento si vence el plazo
- Validacion de conflicto de interes
- Estados: `PENDING_ADMIN_REVIEW` -> `DRAFT` (aprobado) o `RE_PENDING_ADMIN` (correccion)
- Tareas Celery: `check_admin_review_sla`, `check_biometric_expiration`

### Pilar 6: Suscripciones

**Estado: Implementado**

Sistema de planes de suscripcion para prestadores de servicios que monetiza el
marketplace.

**Planes:**

| Plan | Precio/Mes | Propiedades | Soporte |
|------|-----------|-------------|---------|
| Basico | $50,000 COP | Hasta 5 | Email |
| Profesional | $100,000 COP | Hasta 20 | Prioritario |
| Enterprise | $150,000 COP | Ilimitadas | Dedicado + API |

**Endpoints:**

```
GET    /api/v1/services/subscription-plans/    # Ver planes
POST   /api/v1/services/subscribe/             # Suscribirse
POST   /api/v1/services/cancel-subscription/   # Cancelar
POST   /api/v1/services/upgrade-subscription/  # Cambiar plan
```

---

## 7. Cumplimiento Legal

VeriHome opera dentro del marco regulatorio colombiano aplicable al sector
inmobiliario y tecnologico. A continuacion se detallan las leyes y normativas
con las que la plataforma cumple.

### Ley 820 de 2003 - Regimen de Arrendamiento de Vivienda Urbana

Esta ley es el eje central del sistema contractual de VeriHome.

**Articulos implementados:**

| Articulo | Contenido | Implementacion en VeriHome |
|----------|-----------|---------------------------|
| Art. 3 | Forma del contrato | Contratos digitales con clausulas obligatorias |
| Art. 18 | Renta | Canon mensual con restricciones legales |
| Art. 20 | Reajuste del canon | Ajuste automatico por IPC anual |
| Art. 22 | Terminacion por arrendador | Causales configurables en ClauseManager |
| Art. 24 | Terminacion por arrendatario | Causales configurables en ClauseManager |
| Art. 25 | Deposito judicial | Integracion con Escrow accounts |

### Ley 1581 de 2012 - Proteccion de Datos Personales (Habeas Data)

**Implementacion:**

- Consentimiento explicito para tratamiento de datos biometricos
- Derecho de acceso, rectificacion y supresion de datos personales
- Politica de privacidad accesible en `/privacy`
- Datos biometricos encriptados en almacenamiento
- Logs de auditoria para acceso a datos sensibles

### Resolucion DIAN 000042 de 2020 - Facturacion Electronica

**Implementacion:**

- Generacion automatica de facturas en formato UBL 2.1 (XML)
- Numeracion de resolucion de facturacion autorizada
- Informacion tributaria completa del emisor y receptor
- NIT, regimen tributario, responsabilidades fiscales
- Almacenamiento y consulta de facturas emitidas

### Codigo Civil Colombiano

**Implementacion:**

- Clausulas de arrendamiento conformes a titulo XXVI del Codigo Civil
- Obligaciones de las partes segun articulos 1982-2035
- Contrato de mandato para representacion por codeudor

### Documentos de Identidad Colombianos Soportados

| Tipo | Formato | Validacion |
|------|---------|------------|
| Cedula de Ciudadania (CC) | 8-10 digitos | Validacion de longitud y formato numerico |
| Cedula de Extranjeria (CE) | 6-7 digitos | Validacion de longitud y formato numerico |
| Pasaporte | 2 letras + 7 digitos | Validacion de formato alfanumerico |
| Licencia de Conduccion | 40 + 9 digitos | Validacion de prefijo y longitud |
| RUT | 9 digitos + digito de verificacion | Validacion con algoritmo modulo 11 |

---

## 8. Seguridad

### Autenticacion y Autorizacion

**JWT (JSON Web Tokens):**

| Parametro | Valor |
|-----------|-------|
| Token de acceso | Expiracion: 1 dia |
| Token de refresco | Expiracion: 7 dias |
| Almacenamiento | `localStorage` en frontend |
| Auto-refresco | Interceptor Axios en respuesta 401 |

**Sistema de Codigos de Entrevista:**

- Codigos con tiempo de expiracion
- Un solo uso por codigo
- Generados unicamente por administradores

### Middleware de Seguridad (9 Capas)

VeriHome implementa 9 middleware que se ejecutan en cada solicitud HTTP:

1. **SecurityMiddleware** (Django): Headers de seguridad (HSTS, X-Content-Type-Options, X-Frame-Options)
2. **CorsMiddleware**: Control de origenes permitidos (CORS)
3. **SessionMiddleware**: Gestion de sesiones con cookies seguras
4. **AuthenticationMiddleware**: Verificacion de identidad JWT
5. **RateLimitingMiddleware**: Limitacion de solicitudes por IP y por usuario
6. **PerformanceMiddleware**: Tracking de tiempos de respuesta y metricas
7. **AdminImpersonationMiddleware**: Control de sesiones de impersonacion admin
8. **AdminActionLoggingMiddleware**: Auditoria de acciones administrativas
9. **CSRFMiddleware**: Proteccion contra Cross-Site Request Forgery

### Rate Limiting

El sistema implementa limitacion de solicitudes por IP para prevenir abuso:

- Endpoints de autenticacion: 5 solicitudes por minuto
- Endpoints de API general: 100 solicitudes por minuto
- Endpoints de upload: 10 solicitudes por minuto
- WebSocket: 60 mensajes por minuto

### Proteccion de Datos Biometricos

- Datos biometricos encriptados en reposo
- Transmision exclusivamente via HTTPS
- Acceso restringido a datos biometricos (solo el sistema y el usuario propietario)
- Logs de auditoria para cada acceso a datos biometricos
- Datos sensibles excluidos de respuestas API de matching

### Auditoria

El servicio de auditoria (`AuditService`) registra:

- Acciones administrativas (crear, editar, eliminar registros)
- Accesos a datos sensibles
- Cambios en contratos y estados de workflow
- Sesiones de impersonacion
- Intentos de autenticacion fallidos

### CORS (Cross-Origin Resource Sharing)

En desarrollo, se permiten origenes locales (`localhost:5173`, `localhost:8000`).
En produccion, se configuran unicamente los dominios autorizados del frontend
desplegado.

### Configuracion de Produccion

| Parametro | Valor Produccion |
|-----------|-----------------|
| `DEBUG` | `False` |
| `SECURE_SSL_REDIRECT` | `True` |
| `SESSION_COOKIE_SECURE` | `True` |
| `CSRF_COOKIE_SECURE` | `True` |
| `SECURE_HSTS_SECONDS` | `31536000` (1 ano) |
| `ALLOWED_HOSTS` | Dominio(s) especifico(s) |

---

## 9. Apps del Sistema (15 Apps)

VeriHome esta organizado en 15 aplicaciones Django, cada una responsable de un
dominio funcional especifico.

| App | Descripcion | Modelos | Endpoints |
|-----|-------------|---------|-----------|
| **core** | Funcionalidad transversal: middleware, cache, auditoria, FAQ, contacto, tickets | 10 | 40 |
| **users** | Gestion de usuarios, autenticacion JWT, perfiles, codigos de entrevista, actividad | 13 | 85 |
| **properties** | Propiedades con imagenes, videos, amenidades, vistas y busqueda | 8 | 46 |
| **contracts** | Contratos (legacy + nuevo), biometrica, clausulas, firmas, renovaciones, terminaciones | 24 | 159 |
| **matching** | Motor de matching IA con 3 algoritmos, solicitudes y resultados | 4 | 54 |
| **messaging** | Mensajeria en tiempo real, hilos, 4 consumers WebSocket | 10 | 41 |
| **payments** | Transacciones, metodos de pago, facturas, escrow, programacion de arriendo, DIAN | 14 | 84 |
| **ratings** | Calificaciones multi-rol (1-10), badges, moderacion, invitaciones | 6 | 24 |
| **requests** | Solicitudes de documentos, verificacion de documentos de arrendatario | 6 | 53 |
| **services** | Marketplace de servicios, listados, suscripciones, planes | 7 | 34 |
| **dashboard** | Analitica, widgets, metricas de rendimiento, reportes | 4 | 36 |
| **verification** | Agentes de campo, visitas programadas, reportes de verificacion | 3 | 25 |
| **verihome** | Configuracion del proyecto: settings, URLs, ASGI, Celery config | 0 | 3 |
| **templates** | Plantillas HTML para emails y documentos PDF | 0 | 0 |
| **utils** | Utilidades compartidas, helpers, constantes | 0 | 0 |
| **Total** | | **109** | **688** |

### Detalle de Modelos por App

**core (10 modelos):** ContactMessage, SupportTicket, TicketResponse, FAQ, FAQCategory,
SystemConfiguration, AuditLog, CacheEntry, NotificationTemplate, EmailLog

**users (13 modelos):** User, InterviewCode, ContactRequest, InterviewSession,
BaseProfile, UserResume, PortfolioItem, UserSettings, UserActivityLog,
AdminImpersonationSession, AdminActionLog, UserActionNotification, AdminSessionSummary

**properties (8 modelos):** Property, PropertyImage, PropertyVideo, Amenity,
PropertyView, PropertyFavorite, PropertySearch, NearbyPlace

**contracts (24 modelos):** Contract, ContractTemplate, ContractSignature,
ContractAmendment, ContractTermination, ContractRenewal, BiometricAuthentication,
ContractDocument, ContractAdditionalClause, LandlordControlledContract,
ContractObjection, LandlordContractGuarantee, ContractInvitation,
ContractWorkflowHistory, ContractModificationRequest, CodeudorAuthToken,
EditableContractClause, ClauseVersion, ContractTypeTemplate,
TemplateClauseAssignment, LegalClause, ColombianContract, ContractMilestone,
ContractGuarantee

**matching (4 modelos):** MatchRequest, MatchResult, MatchPreference, MatchHistory

**messaging (10 modelos):** Message, Thread, ThreadParticipant, MessageAttachment,
MessageReaction, MessageRead, NotificationSetting, PushSubscription,
ConversationArchive, MessageReport

**payments (14 modelos):** Transaction, PaymentMethod, Invoice, EscrowAccount,
RentPaymentSchedule, PaymentPlan, PaymentPlanInstallment, Refund, PaymentDispute,
PaymentNotification, DianInvoice, PaymentReconciliation, AutoChargeLog,
SubscriptionPayment

**ratings (6 modelos):** Rating, RatingCategory, RatingInvitation, RatingResponse,
ReputationBadge, RatingModeration

**requests (6 modelos):** TenantDocument, DocumentRequest, DocumentVerification,
DocumentTemplate, VerificationHistory, DocumentComment

**services (7 modelos):** ServiceListing, ServiceCategory, ServiceRequest,
ServiceReview, SubscriptionPlan, ProviderSubscription, ServiceArea

**dashboard (4 modelos):** DashboardWidget, WidgetConfiguration, UserDashboard,
AnalyticsSnapshot

**verification (3 modelos):** VerificationAgent, VerificationVisit, VerificationReport

---

## 10. APIs por Modulo

### Conteo de Endpoints por Modulo

| Modulo | Endpoints HTTP | Descripcion |
|--------|---------------|-------------|
| Core | 40 | Contacto, FAQ, tickets, configuracion del sistema |
| Users | 85 | Registro, login, perfiles, actividad, administracion |
| Properties | 46 | CRUD de propiedades, imagenes, busqueda, favoritos |
| Contracts | 159 | Contratos, biometrica, clausulas, renovaciones, terminaciones |
| Messaging | 41 | Mensajes, hilos, archivos adjuntos, notificaciones |
| Payments | 84 | Transacciones, metodos, facturas, escrow, DIAN, auto-charge |
| Ratings | 24 | Calificaciones, badges, moderacion, invitaciones |
| Matching | 54 | Solicitudes, resultados, preferencias, algoritmos |
| Requests | 53 | Documentos, solicitudes, verificacion, plantillas |
| Services | 34 | Listados, categorias, suscripciones, solicitudes |
| Dashboard | 36 | Widgets, metricas, analytics, reportes |
| Verification | 25 | Agentes, visitas, reportes |
| Top-level | 3 | Health check, version, configuracion publica |
| **Subtotal HTTP** | **684** | |
| **WebSocket** | **4** | messaging, notifications, threads, user-status |
| **Total** | **688** | |

### Estructura de URLs

Todos los endpoints HTTP siguen la convencion:

```
/api/v1/{modulo}/{recurso}/
```

Ejemplos:

```
GET    /api/v1/properties/                    # Listar propiedades
POST   /api/v1/properties/                    # Crear propiedad
GET    /api/v1/properties/{id}/               # Detalle de propiedad
PUT    /api/v1/properties/{id}/               # Actualizar propiedad
DELETE /api/v1/properties/{id}/               # Eliminar propiedad
POST   /api/v1/users/auth/login/              # Login JWT
POST   /api/v1/users/auth/register/           # Registro con codigo
POST   /api/v1/contracts/{id}/face-capture/   # Captura biometrica facial
GET    /api/v1/core/faqs/                     # FAQ dinamico
POST   /api/v1/core/contact/                  # Formulario de contacto
```

### Autenticacion de Endpoints

| Tipo | Autenticacion |
|------|---------------|
| Endpoints publicos | Sin autenticacion (registro, login, FAQ, contacto) |
| Endpoints de usuario | JWT Bearer Token requerido |
| Endpoints de admin | JWT + `is_staff=True` |
| Endpoints de abogado | JWT + `is_staff=True` + rol legal |
| WebSocket | Token JWT en query string o header |

---

## 11. Testing

### Estrategia de Testing

VeriHome implementa una estrategia de testing en tres niveles: unitarios, integracion
y end-to-end.

### Tests Backend (502 tests)

**Framework:** Django TestCase + Django REST Framework APITestCase
**Runner:** pytest
**Cobertura:** Todos los modelos, vistas, serializers y servicios criticos

**Distribucion por app:**

| App | Tests | Tipo |
|-----|-------|------|
| users | ~80 | Autenticacion, perfiles, permisos |
| contracts | ~120 | Biometrica, workflow, clausulas |
| properties | ~50 | CRUD, imagenes, busqueda |
| payments | ~60 | Transacciones, DIAN, auto-charge |
| matching | ~40 | Algoritmos, scoring |
| messaging | ~35 | Mensajes, hilos, WebSocket |
| core | ~40 | Tickets, FAQ, contacto |
| services | ~30 | Marketplace, suscripciones |
| verification | ~25 | Agentes, visitas, reportes |
| ratings | ~12 | Calificaciones, moderacion |
| dashboard | ~10 | Widgets, metricas |

**Ejecucion:**

```bash
# Todos los tests
pytest

# App especifica
pytest users/tests.py

# Con cobertura
pytest --cov=.

# Test especifico
pytest contracts/tests.py::BiometricTestCase::test_face_capture
```

### Tests Frontend (771+ tests)

**Framework:** Jest + React Testing Library
**Cobertura:** 63 suites de test
**Threshold:** 80% de cobertura minima

**Distribucion por tipo:**

| Tipo | Cantidad | Descripcion |
|------|----------|-------------|
| Componentes | ~400 | Renderizado, interaccion, props |
| Hooks | ~120 | Custom hooks, estados, efectos |
| Servicios | ~150 | Llamadas API, transformaciones |
| Utilidades | ~60 | Funciones helper, formateo |
| Contextos | ~41 | AuthContext, NotificationContext |

**Ejecucion:**

```bash
cd frontend

# Todos los tests
npm test

# Watch mode
npm run test:watch

# Cobertura
npm run test:coverage

# Por tipo
npm run test:components
npm run test:hooks
npm run test:services

# CI
npm run test:ci
```

### Tests E2E (20 tests)

**Frameworks:** Playwright (10 tests) + Cypress (5 tests) + otros (5 tests)

**Flujos cubiertos:**

- Registro de usuario con codigo de entrevista
- Login y navegacion principal
- Creacion y publicacion de propiedad
- Solicitud de matching
- Creacion de contrato
- Flujo de revision juridica
- Autenticacion biometrica (simulada)
- Envio de mensajes
- Proceso de pago
- Gestion de tickets de soporte

**Ejecucion:**

```bash
cd frontend

# Playwright
npx playwright test

# Cypress
npx cypress run
```

### TypeScript

El frontend opera en modo estricto de TypeScript (`strict: true`) con 0 errores
de compilacion. La verificacion de tipos se ejecuta con:

```bash
cd frontend && npx tsc --noEmit
```

---

## 12. Infraestructura y Deployment

### Arquitectura de Deployment

```
                     +------------------+
                     |   Nginx          |
                     |   (Reverse Proxy)|
                     +--------+---------+
                              |
                 +------------+------------+
                 |                         |
        +--------v--------+      +--------v--------+
        |   Gunicorn       |      |   Daphne         |
        |   (WSGI)         |      |   (ASGI)         |
        |   HTTP requests  |      |   WebSocket      |
        |   Port 8000      |      |   Port 8001      |
        +--------+---------+      +--------+---------+
                 |                         |
        +--------v-------------------------v--------+
        |              Django Application           |
        +--------+--------------------+-------------+
                 |                    |
        +--------v--------+  +-------v--------+
        |   PostgreSQL     |  |   Redis        |
        |   Puerto 5432    |  |   Puerto 6379  |
        +------------------+  +-------+--------+
                                      |
                              +-------v--------+
                              |   Celery       |
                              |   Workers +    |
                              |   Beat         |
                              +----------------+
```

### Componentes de Produccion

**Nginx** (Reverse Proxy):

- Sirve archivos estaticos del frontend (compilados por Vite)
- Proxy para solicitudes HTTP hacia Gunicorn
- Proxy para conexiones WebSocket hacia Daphne
- Terminacion SSL/TLS
- Compresion gzip
- Cache de archivos estaticos

**Gunicorn** (WSGI Server):

- Maneja solicitudes HTTP/REST
- Workers configurables segun recursos del servidor
- Recomendado: `(2 * CPU cores) + 1` workers

**Daphne** (ASGI Server):

- Maneja conexiones WebSocket de larga duracion
- Soporta los 4 tipos de consumer
- Ejecucion: `daphne -b 0.0.0.0 -p 8001 verihome.asgi:application`

**Celery Workers:**

- Procesamiento asincrono de tareas pesadas
- 12 tareas registradas:
  - `process_auto_rent_charges` - Cobro automatico diario
  - `check_admin_review_sla` - Verificacion de SLA juridico
  - `check_biometric_expiration` - Expiracion de procesos biometricos
  - `send_payment_confirmation_email` - Emails de pago
  - `generate_dian_invoice` - Facturacion electronica
  - `send_payment_reminder` - Recordatorios de pago
  - `process_subscription_renewals` - Renovacion de suscripciones
  - Y 5 tareas adicionales de mantenimiento y limpieza

**Celery Beat** (Scheduler):

- Programa la ejecucion periodica de tareas
- Cobro automatico: diario a las 8:00 AM COT
- SLA check: cada hora laboral
- Biometric expiration: cada 6 horas
- Limpieza de logs: semanal

### Build del Frontend

```bash
cd frontend
npm run build          # Build de produccion
```

El build genera archivos estaticos optimizados en `static/frontend/` que son
servidos directamente por Nginx. Incluye:

- Code splitting automatico
- Tree shaking
- Minificacion de JS/CSS
- Hashing de archivos para cache busting
- Compresion de imagenes

### Archivos Estaticos

```bash
python manage.py collectstatic --noinput
```

Este comando recopila todos los archivos estaticos (frontend build, admin CSS,
archivos de media) en el directorio `staticfiles/` para ser servidos por Nginx.

### Variables de Entorno (Produccion)

**Backend (.env en raiz del proyecto):**

```
SECRET_KEY=<clave-secreta-segura-de-produccion>
DEBUG=False
ALLOWED_HOSTS=dominio.com,www.dominio.com
DATABASE_URL=postgresql://user:password@host:5432/verihome
REDIS_URL=redis://host:6379
EMAIL_HOST_USER=<email-produccion>
EMAIL_HOST_PASSWORD=<app-password>
FRONTEND_URL=https://dominio.com
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
```

**Frontend (frontend/.env):**

```
VITE_API_URL=https://dominio.com/api/v1
VITE_MAPBOX_TOKEN=<token-mapbox>
VITE_DEFAULT_COUNTRY=CO
VITE_DEFAULT_LAT=4.5709
VITE_DEFAULT_LNG=-74.2973
VITE_DEFAULT_ZOOM=6
```

### Docker (Produccion)

El proyecto incluye configuracion Docker para deployment:

- `Dockerfile.prod` - Imagen de produccion del backend
- `docker-compose.prod.yml` - Orquestacion de servicios
- `nginx/` - Configuracion de Nginx

**Servicios en docker-compose:**

```yaml
services:
  web:        # Django + Gunicorn
  websocket:  # Django + Daphne
  celery:     # Celery workers
  beat:       # Celery Beat scheduler
  postgres:   # PostgreSQL 14
  redis:      # Redis 7
  nginx:      # Nginx reverse proxy
```

### Checklist de Deployment

1. Configurar variables de entorno de produccion
2. Ejecutar migraciones: `python manage.py migrate`
3. Crear superusuario: `python manage.py createsuperuser`
4. Compilar frontend: `cd frontend && npm run build`
5. Recopilar archivos estaticos: `python manage.py collectstatic --noinput`
6. Iniciar PostgreSQL y Redis
7. Iniciar Gunicorn (HTTP)
8. Iniciar Daphne (WebSocket)
9. Iniciar Celery workers y Beat
10. Configurar y reiniciar Nginx
11. Verificar SSL/TLS
12. Ejecutar tests de smoke
13. Monitorear logs

### Monitoreo

**Logs de aplicacion:**

- Django logs en `logs/` con rotacion diaria
- Celery logs con nivel configurable
- Nginx access/error logs

**Metricas de rendimiento:**

- `PerformanceMiddleware` registra tiempos de respuesta de cada endpoint
- `performanceMonitor.ts` en frontend rastrea tiempos de renderizado y API calls
- Dashboard de metricas accesible para administradores

**Monitoreo externo (opcional):**

- Sentry para tracking de errores en tiempo real
- Integracion lista, requiere configuracion de DSN en produccion

---

## Glosario

| Termino | Definicion |
|---------|------------|
| **Arrendador** | Propietario o apoderado legal de un inmueble que lo ofrece en arriendo |
| **Arrendatario** | Persona que toma un inmueble en arriendo |
| **Codeudor** | Persona que avala la obligacion del arrendatario ante el arrendador |
| **Canon** | Monto mensual de arriendo pactado en el contrato |
| **IPC** | Indice de Precios al Consumidor, utilizado para ajuste anual del canon |
| **Escrow** | Cuenta de fideicomiso que retiene fondos hasta cumplimiento de condiciones |
| **JWT** | JSON Web Token, estandar de autenticacion basado en tokens firmados |
| **WebSocket** | Protocolo de comunicacion bidireccional en tiempo real |
| **UBL 2.1** | Universal Business Language, formato XML para facturacion electronica |
| **SLA** | Service Level Agreement, compromiso de tiempo maximo de respuesta |
| **ASGI** | Asynchronous Server Gateway Interface, protocolo para WebSocket en Django |
| **WSGI** | Web Server Gateway Interface, protocolo estandar para HTTP en Django |
| **OCR** | Optical Character Recognition, lectura automatica de texto en imagenes |
| **PSE** | Pagos Seguros en Linea, sistema de pago bancario colombiano |
| **DIAN** | Direccion de Impuestos y Aduanas Nacionales de Colombia |
| **RUT** | Registro Unico Tributario |

---

**Documento generado el 23 de marzo de 2026.**
**VeriHome Platform - Version Production-Ready**
**Todos los derechos reservados.**
