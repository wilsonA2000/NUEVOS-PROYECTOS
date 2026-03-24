# Guia del Usuario Legal (Abogado) - VeriHome

**Version:** 1.0
**Fecha:** 23 de marzo de 2026
**Destinatario:** Personal juridico de VeriHome (rol staff con permisos de administracion)
**Clasificacion:** Documento interno - Uso exclusivo del equipo legal

---

## Tabla de Contenidos

1. [Introduccion](#1-introduccion)
2. [Flujo de Revision Juridica](#2-flujo-de-revision-juridica)
3. [Endpoints de Revision](#3-endpoints-de-revision)
4. [Clausulas y Cumplimiento Legal](#4-clausulas-y-cumplimiento-legal)
5. [Sistema de Objeciones](#5-sistema-de-objeciones)
6. [Documentos Verificables](#6-documentos-verificables)
7. [Autenticacion Biometrica](#7-autenticacion-biometrica)
8. [Generacion de PDF Contractual](#8-generacion-de-pdf-contractual)
9. [Renovacion de Contratos](#9-renovacion-de-contratos)
10. [Terminacion de Contratos](#10-terminacion-de-contratos)
11. [Facturacion Electronica DIAN](#11-facturacion-electronica-dian)
12. [Disputas y Mediacion](#12-disputas-y-mediacion)
13. [Soporte y Contacto](#13-soporte-y-contacto)

---

## 1. Introduccion

### 1.1 Rol del Abogado en VeriHome

El abogado de VeriHome cumple una funcion critica dentro de la plataforma: es el profesional
del derecho encargado de revisar, validar y aprobar todos los contratos de arrendamiento antes
de que estos adquieran vida juridica. Ningun contrato en VeriHome puede avanzar al proceso de
firma biometrica sin haber sido previamente revisado y aprobado por un miembro del equipo legal.

El abogado opera dentro de la plataforma con un usuario de tipo `staff` (is_staff=True), lo que
le otorga acceso al panel de administracion y a los endpoints exclusivos de revision juridica.

### 1.2 Responsabilidades Principales

Las responsabilidades del abogado dentro de VeriHome son:

- Revisar la totalidad de los contratos creados por los arrendadores antes de su envio al arrendatario.
- Verificar que cada contrato cumpla con la legislacion colombiana vigente.
- Validar que las clausulas obligatorias esten presentes y correctamente redactadas.
- Verificar que el canon de arrendamiento no exceda los limites legales.
- Confirmar que los datos de las partes sean coherentes y los documentos de identidad validos.
- Aprobar contratos que cumplan todos los requisitos legales.
- Rechazar contratos que presenten deficiencias, proporcionando notas detalladas de correccion.
- Mediar en disputas entre arrendadores y arrendatarios cuando se requiera intervencion juridica.
- Responder a los tickets asignados al departamento legal dentro del sistema de soporte interno.

### 1.3 Marco Legal Aplicable

Todo contrato gestionado a traves de VeriHome debe cumplir con el siguiente marco normativo colombiano:

**Ley 820 de 2003 - Regimen de Arrendamiento de Vivienda Urbana:**
- Articulo 3: Definicion de contrato de arrendamiento de vivienda urbana.
- Articulo 4: Formalidades del contrato. Puede ser verbal o escrito; VeriHome utiliza exclusivamente
  contratos escritos con firma biometrica.
- Articulo 5: Contenido minimo del contrato escrito (nombre de las partes, identificacion del inmueble,
  precio, forma de pago, termino del contrato).
- Articulo 8: Obligaciones del arrendador (entregar el inmueble en buen estado, mantener en estado
  de servir, librar al arrendatario de perturbaciones).
- Articulo 9: Obligaciones del arrendatario (pagar el canon, cuidar el inmueble, restituir al terminar).
- Articulo 18: Regulacion del precio del arrendamiento. El canon mensual no podra exceder el uno por
  ciento (1%) del valor comercial del inmueble, o de la parte que se de en arriendo. El arrendador
  debera dejar constancia de dicho valor en el contrato.
- Articulo 20: Reajuste del canon de arrendamiento. Cada doce (12) meses de ejecucion del contrato,
  el arrendador podra incrementar el canon hasta en una proporcion que no sea superior al cien por
  ciento (100%) del incremento del Indice de Precios al Consumidor (IPC) del ano calendario
  inmediatamente anterior.
- Articulos 22, 23 y 24: Causales de terminacion del contrato por parte del arrendador, por parte
  del arrendatario y por mutuo acuerdo, respectivamente.
- Articulo 25: Derecho de retracto y preaviso.
- Articulo 37: Pago por consignacion ante autoridad competente.

**Ley 1581 de 2012 - Proteccion de Datos Personales:**
- Articulo 4: Principios para el tratamiento de datos personales (legalidad, finalidad, libertad,
  veracidad, transparencia, acceso, circulacion restringida, seguridad, confidencialidad).
- Articulo 5: Datos sensibles. Los datos biometricos recopilados en el proceso de firma se
  consideran datos sensibles y requieren autorizacion expresa del titular.
- Articulo 8: Derechos de los titulares (conocer, actualizar, rectificar, solicitar prueba de
  autorizacion, revocar, acceder gratuitamente).
- Articulo 12: Autorizacion del titular para el tratamiento de datos personales.
- Decreto 1377 de 2013: Reglamentario parcial de la Ley 1581.

**Codigo Civil Colombiano:**
- Articulos 1973 a 2044: Regulacion general del contrato de arrendamiento.
- Articulo 1973: Definicion de arrendamiento.
- Articulo 1974: Cosas susceptibles de arrendamiento.
- Articulo 1975: Precio del arrendamiento.
- Articulo 1982: Obligacion de entregar la cosa arrendada.
- Articulo 1996: Terminacion del arrendamiento.
- Articulo 1602: Los contratos son ley para las partes (principio de autonomia de la voluntad).

**Codigo de Comercio:**
- Articulos 518 a 524: Arrendamiento de locales comerciales. Derecho de renovacion del contrato
  del arrendatario de local comercial que haya ocupado el inmueble por dos (2) anos o mas.

**Ley 675 de 2001 - Regimen de Propiedad Horizontal:**
- Articulos relevantes cuando el inmueble se encuentra en propiedad horizontal.
- Obligacion del arrendatario de cumplir el reglamento de propiedad horizontal.

---

## 2. Flujo de Revision Juridica

### 2.1 Diagrama del Flujo

El flujo de revision juridica es el primer punto de control de calidad en el ciclo de vida
de un contrato en VeriHome. A continuacion se describe paso a paso:

```
Arrendador crea contrato
        |
        v
PENDING_ADMIN_REVIEW  <--- Estado inicial de todos los contratos
        |
        +--- Abogado recibe notificacion por email
        |
        +--- SLA: 5 dias habiles para revision
        |
        +--- Validacion de conflicto de interes
        |
        v
   [Decision del abogado]
       /           \
      /             \
Aprobado          Rechazado (con notas de correccion)
    |                   |
    v                   v
  DRAFT            CANCELLED (devuelto al arrendador)
    |                   |
    |              Arrendador corrige
    |                   |
    |                   v
    |            LANDLORD_CORRECTING
    |                   |
    |                   v
    |            RE_PENDING_ADMIN (nueva revision)
    |                   |
    |                   v
    |             [Decision del abogado]
    |                 /         \
    |            Aprobado     Rechazado (nuevo ciclo)
    |               |
    +<--------------+
    |
    v
Contrato continua al flujo de firma
```

### 2.2 Estado PENDING_ADMIN_REVIEW

Cuando un arrendador crea un contrato en VeriHome, el sistema automaticamente lo coloca en
estado `PENDING_ADMIN_REVIEW`. En este momento:

1. **Notificacion automatica**: El sistema envia un correo electronico al administrador
   (abogado designado) informando que hay un nuevo contrato pendiente de revision. El email
   incluye el numero de contrato, nombre del arrendador, direccion de la propiedad y canon
   mensual.

2. **Calculo del SLA**: El sistema calcula automaticamente la fecha limite de revision,
   que corresponde a 5 dias habiles a partir de la creacion del contrato. Los fines de
   semana (sabados y domingos) no se cuentan como dias habiles. Esta fecha se almacena
   en el campo `admin_review_deadline`.

3. **Asignacion en cola**: El contrato aparece en la lista de contratos pendientes accesible
   desde el endpoint `GET /api/v1/contracts/admin/pending/`.

### 2.3 Acuerdo de Nivel de Servicio (SLA)

El SLA de revision juridica establece un plazo maximo de **5 dias habiles** para que el abogado
complete la revision de cada contrato. El sistema gestiona este SLA de manera automatizada
mediante una tarea Celery (`check_admin_review_sla`) que se ejecuta diariamente:

**Recordatorio a las 24 horas del vencimiento:**
- Cuando faltan menos de 24 horas para que expire el plazo, el sistema envia un correo
  electronico de recordatorio al abogado con el numero de contrato y la fecha limite exacta.

**Escalamiento automatico al vencer el plazo:**
- Si el plazo de 5 dias habiles se cumple sin que el contrato haya sido revisado, el sistema:
  - Marca el campo `admin_review_escalated` como `True`.
  - Registra un evento de tipo `sla_escalation` en el historial del contrato (workflow history).
  - Envia un correo electronico al arrendador informandole que su contrato ha sido priorizado
    y que recibira respuesta en las proximas 24 horas.

### 2.4 Validacion de Conflicto de Interes

El sistema implementa una validacion automatica de conflicto de interes: **el abogado no puede
aprobar ni rechazar un contrato en el que el mismo figure como arrendador**. Esta validacion se
ejecuta tanto en el modelo (`approve_by_admin`, `reject_by_admin`) como en la capa de la API,
y lanza un error `ValidationError` si se detecta la coincidencia.

La validacion compara el `admin_user` (usuario que intenta aprobar/rechazar) con el campo
`landlord` del contrato. Si son la misma persona, la operacion es bloqueada con el mensaje:
"Conflicto de intereses: el administrador no puede aprobar un contrato en el que figura como
arrendador."

### 2.5 Flujo Circular (Re-revision)

VeriHome implementa un flujo circular que permite multiples ciclos de revision:

1. **Primera revision**: El contrato llega en estado `PENDING_ADMIN_REVIEW`. El abogado revisa
   y puede aprobar (pasa a `DRAFT`) o rechazar (pasa a `CANCELLED` con notas).

2. **Correccion del arrendador**: Si el contrato fue rechazado, el arrendador puede corregir
   los problemas senalados por el abogado. Durante este periodo, el contrato se encuentra en
   estado `LANDLORD_CORRECTING`.

3. **Re-envio para revision**: Una vez que el arrendador completa las correcciones, puede
   re-enviar el contrato para una nueva revision. El contrato pasa al estado `RE_PENDING_ADMIN`.
   El campo `review_cycle_count` se incrementa para llevar un registro de cuantos ciclos de
   revision ha atravesado el contrato.

4. **Nueva revision**: El abogado revisa nuevamente el contrato con las correcciones aplicadas.
   Puede aprobar (pasa a `DRAFT`) o rechazar nuevamente (el ciclo se repite).

El metodo `resubmit_for_admin_review` del modelo `LandlordControlledContract` gestiona este
flujo. El arrendador puede incluir un resumen de cambios (`changes_summary`) y una lista
detallada de modificaciones (`changes_list`), que se almacenan en el historial del workflow
para referencia del abogado durante la re-revision.

### 2.6 Criterios de Aprobacion

El abogado debe verificar los siguientes puntos antes de aprobar un contrato:

- Todas las clausulas obligatorias estan presentes (ver seccion 4).
- Los datos de la propiedad son coherentes (direccion, ciudad, tipo de inmueble).
- Los terminos economicos cumplen con los limites legales (Art. 18, Ley 820).
- El periodo del contrato es razonable y esta claramente definido.
- La destinacion del inmueble es licita y compatible con el tipo de contrato.
- Los datos del arrendador son validos.
- No existen clausulas abusivas o contrarias a la ley.

### 2.7 Criterios de Rechazo

El abogado debe rechazar un contrato cuando:

- Faltan clausulas obligatorias.
- El canon de arrendamiento excede el limite legal del 1% del valor comercial del inmueble.
- La destinacion del inmueble es ilicita o incompatible.
- Los terminos del contrato son ambiguos o contradictorios.
- Los datos de la propiedad son incompletos o inconsistentes.
- Se detectan clausulas abusivas o leoninas.
- El contrato no especifica claramente las obligaciones de las partes.

Al rechazar, el abogado **debe** proporcionar notas detalladas explicando las correcciones
necesarias. El sistema no permite rechazar un contrato sin notas explicativas.

---

## 3. Endpoints de Revision

### 3.1 Listar Contratos Pendientes de Revision

```
GET /api/v1/contracts/admin/pending/
```

**Permisos requeridos:** `IsAdminUser` (is_staff=True)

**Respuesta exitosa (200):**
```json
{
  "count": 3,
  "contracts": [
    {
      "id": "uuid-del-contrato",
      "contract_number": "VH-2026-000045",
      "landlord_name": "Juan Carlos Perez",
      "landlord_email": "jcperez@email.com",
      "property_address": "Calle 45 #12-30, Bucaramanga",
      "created_at": "2026-03-20T14:30:00Z",
      "monthly_rent": 1500000,
      "days_pending": 3
    }
  ]
}
```

**Notas:** Este endpoint solo retorna contratos en estado `PENDING_ADMIN_REVIEW`. Los contratos
en estado `RE_PENDING_ADMIN` (re-revision) tambien deben ser consultados. El campo `days_pending`
indica cuantos dias lleva el contrato esperando revision, lo que permite priorizar.

### 3.2 Estadisticas de Contratos

```
GET /api/v1/contracts/admin/stats/
```

**Permisos requeridos:** `IsAdminUser`

**Respuesta exitosa (200):**
```json
{
  "statistics": {
    "total": 150,
    "pending_review": 5,
    "draft": 12,
    "active": 89,
    "completed": 30,
    "cancelled": 14
  },
  "recent_pending": [
    {
      "id": "uuid",
      "contract_number": "VH-2026-000045",
      "landlord_name": "Juan Carlos Perez",
      "created_at": "2026-03-20T14:30:00Z",
      "days_pending": 3
    }
  ],
  "alert_level": "normal"
}
```

**Notas:** El campo `alert_level` cambia a `"high"` cuando hay mas de 5 contratos pendientes
de revision, indicando al abogado que debe priorizar su trabajo de revision.

### 3.3 Detalle del Contrato para Revision

```
GET /api/v1/contracts/admin/contracts/{contract_id}/
```

**Permisos requeridos:** `IsAdminUser`

**Respuesta exitosa (200):**
```json
{
  "id": "uuid",
  "contract_number": "VH-2026-000045",
  "current_state": "PENDING_ADMIN_REVIEW",
  "current_state_display": "Pendiente Revision Admin",
  "created_at": "2026-03-20T14:30:00Z",
  "updated_at": "2026-03-20T14:30:00Z",
  "landlord": {
    "id": "uuid-arrendador",
    "name": "Juan Carlos Perez",
    "email": "jcperez@email.com"
  },
  "property_data": {
    "property_address": "Calle 45 #12-30",
    "property_city": "Bucaramanga",
    "property_type": "apartment"
  },
  "economic_terms": {
    "monthly_rent": 1500000,
    "security_deposit": 1500000,
    "administration_fee": 200000
  },
  "contract_terms": {
    "duration_months": 12,
    "start_date": "2026-04-01",
    "pets_allowed": false,
    "smoking_allowed": false
  },
  "tenant_data": {},
  "clauses_preview": [
    {
      "number": 1,
      "ordinal": "PRIMERA",
      "title": "OBJETO",
      "category": "obligatory",
      "legal_reference": "Art. 5, Ley 820/2003",
      "content_preview": "EL ARRENDADOR entrega a titulo de arrendamiento..."
    }
  ],
  "admin_review": {
    "reviewed": false,
    "reviewed_at": null,
    "reviewer": null,
    "notes": null
  }
}
```

**Notas:** Este endpoint proporciona toda la informacion que el abogado necesita para realizar
su revision. El campo `clauses_preview` muestra un adelanto de las clausulas que se incluiran
en el contrato segun su tipo, incluyendo la referencia legal de cada una. El abogado debe
revisar cuidadosamente cada seccion antes de tomar una decision.

### 3.4 Aprobar un Contrato

```
POST /api/v1/contracts/admin/contracts/{contract_id}/approve/
```

**Permisos requeridos:** `IsAdminUser`

**Body de la solicitud:**
```json
{
  "notes": "Contrato revisado. Clausulas completas y conformes a la Ley 820/2003. Canon dentro del limite legal."
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Contrato aprobado exitosamente",
  "contract_id": "uuid",
  "contract_number": "VH-2026-000045",
  "new_state": "DRAFT",
  "new_state_display": "Borrador del Arrendador"
}
```

**Efectos de la aprobacion:**
- El contrato cambia de estado a `DRAFT`.
- Se registran los campos `admin_reviewed`, `admin_reviewed_at`, `admin_reviewer` y `admin_review_notes`.
- Se crea una entrada en el historial del workflow con tipo `admin_approval`.
- Se envia un correo electronico al arrendador informandole que su contrato fue aprobado y que
  puede continuar con el proceso de firma.

**Errores posibles:**
- `400`: El contrato no esta en estado de revision.
- `400`: Conflicto de interes (el abogado es el arrendador).
- `404`: Contrato no encontrado.

### 3.5 Rechazar un Contrato

```
POST /api/v1/contracts/admin/contracts/{contract_id}/reject/
```

**Permisos requeridos:** `IsAdminUser`

**Body de la solicitud:**
```json
{
  "notes": "El contrato requiere las siguientes correcciones: 1) Falta la clausula de terminacion anticipada. 2) El canon de $3.500.000 excede el 1% del valor comercial declarado ($250.000.000). El maximo permitido es $2.500.000. 3) La clausula de deposito de garantia no cumple con el Art. 16 de la Ley 820."
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Contrato devuelto para correcciones",
  "contract_id": "uuid",
  "contract_number": "VH-2026-000045",
  "rejection_notes": "El contrato requiere las siguientes correcciones..."
}
```

**Notas:** El campo `notes` es **obligatorio**. Si no se proporcionan notas, el sistema
retorna un error 400. Las notas deben ser claras, especificas y orientadas a que el arrendador
pueda corregir los problemas sin ambiguedad. Se envia un email al arrendador con las
correcciones requeridas.

---

## 4. Clausulas y Cumplimiento Legal

### 4.1 Sistema ClauseManager

VeriHome utiliza un sistema llamado `ContractClauseManager` que genera automaticamente las
clausulas del contrato segun su tipo (urbano, comercial, rural, habitacion). El abogado
debe verificar que las clausulas generadas son correctas y completas para el tipo de
contrato especifico.

El ClauseManager trabaja con tres categorias de clausulas:

1. **Clausulas base** (aplican a todos los contratos)
2. **Clausulas especificas por tipo** (varian segun el tipo de contrato)
3. **Clausulas opcionales** (seleccionadas por el arrendador)

### 4.2 Clausulas Obligatorias

Las siguientes clausulas deben estar presentes en todo contrato de arrendamiento:

**Clausula PRIMERA - OBJETO (Art. 5, Ley 820/2003):**
Identifica el inmueble objeto del arrendamiento, incluyendo su direccion completa, municipio
y referencia a los linderos. El abogado debe verificar que la direccion sea real y corresponda
al inmueble registrado en la plataforma.

**Clausula SEGUNDA - DESTINACION (Art. 5, Ley 820/2003):**
Establece el uso exclusivo del inmueble. Incluye un paragrafo que prohibe expresamente la
destinacion para fines ilicitos (ocultar armas, explosivos, drogas, contrabando). El abogado
debe verificar que la destinacion sea coherente con el tipo de contrato y la zonificacion
del inmueble.

**Clausula TERCERA - PRECIO (Art. 18, Ley 820/2003):**
Define el canon mensual de arrendamiento y la forma de pago (anticipada, los primeros cinco
dias habiles de cada mes). Incluye paragrafos sobre la indivisibilidad de los periodos de
pago y los intereses moratorios. **El abogado debe verificar que el canon no exceda el 1%
del valor comercial del inmueble.**

**Clausula sobre TERMINO DEL CONTRATO (Art. 5, Ley 820/2003):**
Define la duracion del contrato. Debe especificar claramente la fecha de inicio y la fecha
de terminacion, o en su defecto, la duracion en meses.

**Clausula sobre OBLIGACIONES DEL ARRENDADOR (Art. 8, Ley 820/2003):**
- Entregar el inmueble en buen estado y a satisfaccion del arrendatario.
- Mantener el inmueble en estado de servir para el fin pactado.
- Librar al arrendatario de toda perturbacion o embarazo.
- No perturbar al arrendatario en el uso del inmueble.

**Clausula sobre OBLIGACIONES DEL ARRENDATARIO (Art. 9, Ley 820/2003):**
- Pagar el precio del arrendamiento dentro del plazo estipulado.
- Cuidar el inmueble como un buen padre de familia.
- Restituir el inmueble al momento de la terminacion del contrato.
- Pagar los servicios publicos y cuotas de administracion (si aplica).
- Cumplir las normas de propiedad horizontal (si aplica).

**Clausula sobre CAUSALES DE TERMINACION (Arts. 22, 23 y 24, Ley 820/2003):**
Debe enumerar las causales de terminacion por parte del arrendador, del arrendatario y por
mutuo acuerdo.

**Clausula sobre DEPOSITO DE GARANTIA (Art. 16, Ley 820/2003):**
Si se exige deposito, debe cumplir con los limites y condiciones establecidos por la ley.
El deposito no podra exceder el valor de un mes de canon y debe ser devuelto al terminar
el contrato, previa verificacion del estado del inmueble.

### 4.3 Clausulas Especificas por Tipo de Contrato

**Arrendamiento Urbano (`rental_urban`):**
- Clausula de SERVICIOS PUBLICOS URBANOS: Establece que los servicios de energia, gas,
  acueducto, alcantarillado, telefono, internet, television, recoleccion de basuras estan
  a cargo del arrendatario.
- Clausula de ADMINISTRACION Y PORTERIA: Aplicable cuando el inmueble esta en regimen
  de propiedad horizontal (Ley 675/2001).

**Arrendamiento Comercial (`rental_commercial`):**
- Clausula de USO COMERCIAL: Especifica la actividad comercial autorizada. Todo cambio
  requiere autorizacion escrita del arrendador.
- Clausula de LICENCIAS Y PERMISOS: Obliga al arrendatario a obtener y mantener vigentes
  todas las licencias requeridas por las autoridades.
- Clausula de HORARIOS DE FUNCIONAMIENTO: Compromiso de respetar los horarios establecidos
  por las autoridades competentes.
- El abogado debe verificar el cumplimiento de los articulos 518 a 524 del Codigo de
  Comercio respecto al derecho de renovacion cuando aplique.

**Arrendamiento Rural (`rental_rural`):**
- Clausula de USO DEL TERRENO: Especifica el uso autorizado del terreno. Prohibe
  construcciones permanentes sin autorizacion escrita.
- Clausula de CONSERVACION AMBIENTAL: Compromiso de uso responsable del terreno y
  cumplimiento de normas ambientales vigentes.

**Arrendamiento de Habitacion (`rental_room`):**
- Clausula de USO COMPARTIDO: Establece el uso exclusivo de la habitacion y compartido
  de areas comunes segun inventario.
- Clausula de NORMAS DE CONVIVENCIA: Compromiso de respetar las normas de cohabitacion
  pacifica con otros ocupantes.

### 4.4 Clausulas Opcionales

El arrendador puede seleccionar clausulas opcionales al crear el contrato. El abogado debe
verificar que su contenido sea legal y razonable:

**MASCOTAS (`pets`):**
Permite o prohibe la tenencia de mascotas. Si se autoriza, puede incluir un deposito
adicional y la obligacion de mantener vacunas y documentacion sanitaria al dia. El abogado
debe verificar que el deposito por mascotas sea razonable y no sea confiscatorio.

**PROHIBICION DE FUMAR (`smoking`):**
Prohibicion expresa de fumar al interior del inmueble. El incumplimiento es causal de
terminacion inmediata. El abogado debe verificar que se ajuste a la libertad del arrendatario
y no sea desproporcionada.

**ESTACIONAMIENTO (`parking`):**
Otorga derecho de uso de espacios de estacionamiento identificados. El abogado debe verificar
que los espacios existan y esten correctamente identificados.

**MOBILIARIO (`furniture`):**
Aplica cuando el inmueble se entrega amoblado. El abogado debe verificar que se adjunte
un inventario detallado del mobiliario incluido.

**MEJORAS Y MODIFICACIONES (`improvements`):**
Permite o prohibe la realizacion de mejoras o modificaciones al inmueble. En caso de
autorizacion, las mejoras quedan en beneficio del inmueble sin derecho a compensacion.
El abogado debe verificar que esta clausula no sea abusiva y sea coherente con los
articulos 1993 y 1994 del Codigo Civil.

### 4.5 Verificacion del Canon de Arrendamiento

El articulo 18 de la Ley 820 de 2003 establece que el canon mensual de arrendamiento
de vivienda urbana no puede exceder el uno por ciento (1%) del valor comercial del inmueble
o de la parte dada en arriendo. El arrendador debe declarar el valor comercial del inmueble
en el contrato.

**Calculo de verificacion:**
```
Canon maximo mensual = Valor comercial del inmueble * 0.01
```

**Ejemplo:**
- Valor comercial declarado: $250.000.000 COP
- Canon maximo permitido: $2.500.000 COP
- Si el arrendador establece un canon de $3.000.000 COP, el contrato debe ser rechazado.

El abogado debe realizar esta verificacion en cada contrato de vivienda urbana. Para contratos
comerciales, esta restriccion no aplica directamente, pero el canon debe ser razonable y
acorde al mercado.

### 4.6 Verificacion del Periodo del Contrato

- Los contratos de vivienda urbana no tienen duracion minima ni maxima legal, pero VeriHome
  recomienda contratos de 12 meses como estandar.
- Si el contrato tiene una duracion menor a 6 meses o mayor a 60 meses, el abogado debe
  verificar que las condiciones sean razonables y que ambas partes esten de acuerdo.
- Los contratos comerciales tienen proteccion especial despues de 2 anos de ocupacion
  (Art. 518, Codigo de Comercio), por lo que el abogado debe informar esta proteccion.

---

## 5. Sistema de Objeciones

### 5.1 Descripcion General

VeriHome permite a los arrendatarios presentar objeciones formales a clausulas especificas
del contrato antes de la firma. Este sistema facilita la negociacion transparente entre las
partes y genera un registro auditable de las discusiones.

### 5.2 Flujo de Objeciones

1. **Presentacion**: El arrendatario identifica una clausula con la que no esta de acuerdo
   y presenta una objecion formal, indicando el valor actual, el valor propuesto y la
   justificacion de la objecion. Cada objecion tiene una prioridad (`HIGH`, `MEDIUM`, `LOW`).

2. **Revision por el arrendador**: El arrendador recibe la objecion y puede responder
   aceptandola (`ACCEPTED`) o rechazandola (`REJECTED`), con una nota explicativa.

3. **Mediacion del abogado**: Si las objeciones no se resuelven entre las partes, el
   abogado puede intervenir como mediador. El abogado tiene acceso a todas las objeciones
   pendientes y resueltas a traves del sistema.

4. **Resolucion**: Todas las objeciones deben estar resueltas (aceptadas o rechazadas)
   antes de que el contrato pueda avanzar al proceso de firma. Si hay objeciones pendientes,
   el contrato permanece en estado `OBJECTIONS_PENDING`.

### 5.3 Criterios de Mediacion para el Abogado

El abogado debe considerar los siguientes criterios al mediar en objeciones:

- La objecion se refiere a una clausula obligatoria que no puede ser modificada (por ejemplo,
  la prohibicion de uso ilicito del inmueble).
- La objecion propone terminos que contradicen la legislacion vigente.
- La objecion es razonable y busca un equilibrio justo entre las partes.
- Existe un precedente jurisprudencial que resuelve la disputa.

### 5.4 Endpoints Relevantes

```
GET  /api/v1/contracts/landlord/objections/          -- Listar todas las objeciones
GET  /api/v1/contracts/landlord/objections/{id}/      -- Detalle de una objecion
POST /api/v1/contracts/landlord/contracts/{id}/create_objection/      -- Crear objecion
POST /api/v1/contracts/landlord/contracts/{id}/respond_to_objection/  -- Responder objecion
```

---

## 6. Documentos Verificables

### 6.1 Tipos de Documento Colombiano Soportados

VeriHome soporta los siguientes tipos de documento de identidad colombiano, que son
verificados durante el proceso de autenticacion biometrica:

**Cedula de Ciudadania (CC):**
- Formato: 8 a 10 digitos numericos.
- Documento principal de identificacion para ciudadanos colombianos mayores de 18 anos.
- El abogado debe verificar que el numero de cedula sea coherente con los datos del
  titular (nombre, apellidos).

**Cedula de Extranjeria (CE):**
- Formato: 6 a 7 digitos numericos.
- Documento de identificacion para extranjeros residentes en Colombia.
- El abogado debe verificar que el documento este vigente y que el titular tenga
  autorizacion legal para celebrar contratos en Colombia.

**Pasaporte:**
- Formato: 2 letras seguidas de 7 digitos.
- Aceptado para extranjeros que aun no cuentan con cedula de extranjeria.
- El abogado debe verificar la vigencia del pasaporte.

**Licencia de Conduccion:**
- Formato: Prefijo 40 seguido de 9 digitos.
- Aceptado como documento complementario. No se recomienda como unico documento
  de identificacion para contratos de arrendamiento.

**RUT (Registro Unico Tributario):**
- Formato: 9 digitos mas un digito de verificacion.
- Relevante para arrendatarios que son personas juridicas o comerciantes.
- El abogado debe verificar que el RUT este activo y que la actividad economica
  registrada sea compatible con la destinacion del inmueble.

### 6.2 Validacion de Documentos por el Abogado

El abogado no ejecuta directamente la verificacion documental (esta es automatizada por el
sistema biometrico), pero debe:

- Verificar que el tipo de documento seleccionado sea coherente con la nacionalidad del titular.
- Confirmar que el numero de documento cumple con el formato esperado para su tipo.
- En caso de personas juridicas, verificar que se aporte el certificado de existencia y
  representacion legal vigente.
- Verificar que los documentos del arrendador y del arrendatario sean diferentes (no puede
  ser la misma persona en ambos roles).

---

## 7. Autenticacion Biometrica

### 7.1 Descripcion del Sistema

VeriHome implementa un sistema de autenticacion biometrica en 5 pasos que constituye una
innovacion en la industria inmobiliaria colombiana. Aunque el abogado no ejecuta directamente
estos pasos, debe comprender el sistema completo para poder asesorar a las partes y validar
la integridad juridica del proceso.

### 7.2 Los 5 Pasos de Autenticacion

**Paso 1 - Captura Facial (face-capture):**
El sistema captura fotografias del rostro del usuario desde dos angulos: frontal y lateral.
Se aplican controles de calidad de imagen (iluminacion, nitidez, deteccion de rostro).
El resultado se almacena de forma encriptada.

**Paso 2 - Verificacion de Documento (document-capture):**
El usuario presenta su documento de identidad ante la camara. El sistema realiza OCR
(Reconocimiento Optico de Caracteres) para extraer los datos del documento y verificar
su autenticidad. Se validan los formatos descritos en la seccion 6.

**Paso 3 - Verificacion Combinada (combined-capture):**
El sistema compara el rostro capturado en el Paso 1 con la fotografia del documento
capturado en el Paso 2. Se establece un porcentaje de coincidencia que debe superar
un umbral configurable para continuar.

**Paso 4 - Grabacion de Voz (voice-capture):**
El usuario lee en voz alta una frase contractual predefinida. La grabacion se almacena
como evidencia adicional de consentimiento informado. El sistema verifica que la grabacion
contenga audio valido y tenga una duracion minima.

**Paso 5 - Firma Digital (complete-auth):**
El usuario traza su firma digital en un pad tactil. La firma se almacena junto con metadatos
tecnicos (timestamp, user-agent, direccion IP, huella del dispositivo).

### 7.3 Orden Secuencial Obligatorio

La autenticacion biometrica sigue un orden secuencial estricto que **no puede ser alterado**:

1. **Arrendatario** - Siempre firma primero.
2. **Codeudor** (si aplica) - Firma despues del arrendatario.
3. **Arrendador** - Firma al final.

Este orden esta impuesto por el backend y garantiza que el arrendatario tenga pleno conocimiento
del contrato antes de que el arrendador lo ratifique con su firma.

### 7.4 Validez Juridica de la Firma Biometrica

La firma biometrica de VeriHome tiene validez juridica dentro del marco legal colombiano,
sustentada en:

- **Ley 527 de 1999**: Ley de Comercio Electronico. Reconoce la validez juridica de los
  mensajes de datos y las firmas electronicas en Colombia.
- **Articulo 7, Ley 527/1999**: Establece que la firma electronica tiene la misma fuerza
  y efectos que la firma manuscrita, siempre que cumpla con los requisitos de autenticidad,
  integridad y no repudio.
- **Decreto 2364 de 2012**: Reglamenta el articulo 7 de la Ley 527 de 1999 sobre firma
  electronica y establece los criterios de confiabilidad.
- **Ley 1581 de 2012**: Los datos biometricos recopilados son datos sensibles y se tratan
  conforme a esta ley, con autorizacion expresa del titular.

### 7.5 Sesiones y Expiracion

Las sesiones de autenticacion biometrica tienen un tiempo limite de expiracion. Una tarea
Celery (`check_biometric_expiration`) se ejecuta cada hora para notificar a los usuarios
cuya sesion esta por expirar en las proximas 2 horas. Si la sesion expira, el usuario debe
reiniciar el proceso completo.

### 7.6 Endpoints de Autenticacion Biometrica

```
POST /api/v1/contracts/{id}/start-authentication/    -- Iniciar sesion biometrica
POST /api/v1/contracts/{id}/face-capture/             -- Paso 1: Captura facial
POST /api/v1/contracts/{id}/document-capture/         -- Paso 2: Verificacion de documento
POST /api/v1/contracts/{id}/combined-capture/         -- Paso 3: Verificacion combinada
POST /api/v1/contracts/{id}/voice-capture/            -- Paso 4: Grabacion de voz
POST /api/v1/contracts/{id}/complete-auth/            -- Paso 5: Firma digital
GET  /api/v1/contracts/{id}/auth-status/              -- Consultar estado de autenticacion
```

---

## 8. Generacion de PDF Contractual

### 8.1 Diseno del PDF

VeriHome genera documentos PDF con diseno notarial profesional. Las caracteristicas del
documento incluyen:

- Marca de agua con la imagen de la **Diosa Themis**, simbolo de la justicia, que aparece
  de forma sutil en todas las paginas del contrato.
- Encabezado con el logotipo de VeriHome y los datos del contrato (numero, fecha, tipo).
- Formato de clausulas numeradas con ordinales en espanol (PRIMERA, SEGUNDA, TERCERA, etc.).
- Inclusion de paragrafos dentro de las clausulas cuando corresponde.
- Seccion de firmas con los datos biometricos encriptados.
- Pie de pagina con numero de pagina y leyenda de confidencialidad.
- Firma digital del sistema VeriHome como certificacion de autenticidad.

### 8.2 Contenido del PDF

El PDF incluye:
- Identificacion completa de las partes (nombres, documentos, direcciones).
- Todas las clausulas aprobadas por el abogado y aceptadas por las partes.
- Terminos economicos (canon, deposito, administracion).
- Datos de la propiedad (direccion, linderos, descripcion).
- Registro de la autenticacion biometrica (fecha, hora, tipo de verificacion).
- Datos encriptados de las firmas biometricas de todas las partes.

### 8.3 Endpoints de Generacion de PDF

```
POST /api/v1/contracts/{id}/generate-pdf/    -- Generar el PDF del contrato
GET  /api/v1/contracts/{id}/preview-pdf/     -- Vista previa del PDF (borrador)
```

**Notas:** La vista previa esta disponible antes de la firma y muestra el contrato con
marca de agua "BORRADOR". El PDF final se genera despues de completar la autenticacion
biometrica de todas las partes.

---

## 9. Renovacion de Contratos

### 9.1 Marco Legal de la Renovacion

La renovacion de contratos de arrendamiento de vivienda urbana esta regulada por el
articulo 20 de la Ley 820 de 2003, que establece:

- Cada doce (12) meses de ejecucion del contrato, el arrendador podra incrementar el
  canon de arrendamiento.
- El incremento no podra ser superior al cien por ciento (100%) del incremento que
  haya tenido el Indice de Precios al Consumidor (IPC) en el ano calendario
  inmediatamente anterior.
- El arrendador debe comunicar al arrendatario el incremento con no menos de un mes
  de anticipacion a la fecha de vencimiento del periodo pactado.

### 9.2 Sistema de Renovacion en VeriHome

VeriHome implementa un sistema de renovacion automatica con wizard que:

1. **Detecta contratos proximos a vencer**: Una tarea Celery (`check_contract_renewals`)
   revisa diariamente los contratos que vencen en 60, 30 y 15 dias y envia alertas.

2. **Calcula el nuevo canon**: Aplica automaticamente el incremento del IPC al canon
   vigente, respetando el limite legal del 100% del IPC.

3. **Genera propuesta de renovacion**: Crea un borrador de contrato renovado con las
   nuevas condiciones economicas.

4. **Requiere aceptacion de ambas partes**: La renovacion solo se materializa si ambas
   partes aceptan las nuevas condiciones.

### 9.3 Responsabilidades del Abogado en Renovaciones

El abogado debe:
- Verificar que el calculo del incremento del IPC sea correcto.
- Confirmar que el incremento no supere el 100% del IPC del ano anterior.
- Verificar que se haya notificado al arrendatario con al menos un mes de anticipacion.
- Revisar que las demas condiciones del contrato renovado sigan siendo legales y vigentes.
- Verificar que no existan causales de terminacion pendientes que impidan la renovacion.

---

## 10. Terminacion de Contratos

### 10.1 Causales de Terminacion por Parte del Arrendador (Art. 22, Ley 820/2003)

El arrendador puede dar por terminado el contrato de arrendamiento durante el plazo pactado
o su prorroga, por las siguientes causales:

1. **Incumplimiento del pago del canon** durante dos (2) meses consecutivos.
2. **Destinacion del inmueble para fines ilicitos** o diferentes de los pactados.
3. **Subarriendo total o parcial** del inmueble sin autorizacion escrita del arrendador.
4. **Incumplimiento de las obligaciones** del arrendatario establecidas en el contrato o la ley.
5. **Realizacion de mejoras, cambios o ampliaciones** del inmueble sin autorizacion escrita.
6. **Danos al inmueble** o a sus instalaciones por culpa del arrendatario.

### 10.2 Causales de Terminacion por Parte del Arrendatario (Art. 23, Ley 820/2003)

El arrendatario puede dar por terminado el contrato por las siguientes causales:

1. **Suspension de servicios publicos** por causa imputable al arrendador.
2. **Incumplimiento de las obligaciones** del arrendador establecidas en el contrato o la ley.
3. **Desconocimiento del derecho de preferencia** del arrendatario.
4. **Perturbacion del goce del inmueble** por parte del arrendador.

### 10.3 Terminacion por Mutuo Acuerdo (Art. 24, Ley 820/2003)

Las partes pueden dar por terminado el contrato en cualquier momento por mutuo acuerdo,
debiendo constar por escrito.

### 10.4 Preaviso (Art. 25, Ley 820/2003)

Para la terminacion unilateral del contrato por parte del arrendatario, se requiere un
preaviso de tres (3) meses, comunicado por escrito y a traves del servicio postal autorizado.

### 10.5 Proceso en la Plataforma

En VeriHome, la terminacion de un contrato sigue estos pasos:

1. La parte que solicita la terminacion registra la solicitud en la plataforma, indicando
   la causal legal aplicable.
2. El sistema notifica a la otra parte.
3. Si es terminacion por mutuo acuerdo, ambas partes deben confirmar.
4. Si es terminacion unilateral, se verifica el cumplimiento del preaviso legal.
5. El contrato pasa a estado `TERMINATED`.
6. Se genera un acta de terminacion.

### 10.6 Documentacion Requerida

El abogado debe verificar que la terminacion cuente con:
- Documento que acredite la causal invocada (comprobantes de mora, evidencia fotografica
  de danos, etc.).
- Constancia de notificacion a la otra parte.
- Acta de entrega del inmueble (inventario de devolucion).
- Paz y salvo de servicios publicos.
- Liquidacion del deposito de garantia (si aplica).

---

## 11. Facturacion Electronica DIAN

### 11.1 Marco Normativo

La facturacion electronica en Colombia esta regulada por:

- **Resolucion 000042 de 2020** de la DIAN: Establece las condiciones, terminos y
  mecanismos tecnicos para la generacion, transmision y validacion de la factura electronica.
- **Decreto 358 de 2020**: Reglamenta la obligacion de facturar electronicamente.
- **Estatuto Tributario, Art. 615-617**: Obligacion de expedir factura o documento equivalente.

### 11.2 Formato UBL 2.1

VeriHome genera facturas electronicas en formato **UBL 2.1 (Universal Business Language)**
en XML, que es el estandar requerido por la DIAN. El sistema incluye:

- Encabezado de factura con datos del emisor (VeriHome) y receptor.
- Lineas de detalle con descripcion del servicio (canon de arrendamiento, comision de
  plataforma, servicios adicionales).
- Calculo automatico de impuestos (IVA, retencion en la fuente, ICA cuando aplique).
- Firma digital de la factura.
- Cuadro de totales.

### 11.3 Auto-generacion de Facturas

El sistema genera automaticamente una factura electronica cada vez que se procesa un pago
de arriendo. El flujo es:

1. Se ejecuta el cargo automatico de arriendo (tarea Celery diaria).
2. Al confirmarse el pago, se genera la factura UBL 2.1.
3. La factura se asocia al pago y al contrato correspondiente.
4. Se notifica al arrendatario por correo electronico con la factura adjunta.

### 11.4 Implicaciones Tributarias

El abogado debe conocer las siguientes implicaciones tributarias:

- **IVA**: El arrendamiento de vivienda urbana esta excluido de IVA (Art. 476 del
  Estatuto Tributario). Sin embargo, el arrendamiento comercial si esta gravado con IVA
  a la tarifa general (19%).
- **Retencion en la fuente**: Los pagos de arrendamiento estan sujetos a retencion en la
  fuente del 3.5% cuando el pago supere 27 UVT (Art. 395, Estatuto Tributario).
- **ICA (Impuesto de Industria y Comercio)**: La comision de VeriHome por intermediacion
  puede estar sujeta a ICA segun el municipio.
- **Renta**: Los ingresos por arrendamiento deben declararse como renta gravable por el
  arrendador.

---

## 12. Disputas y Mediacion

### 12.1 Mediacion en Conflictos Arrendador-Arrendatario

El abogado puede actuar como mediador en los siguientes tipos de conflicto:

- **Disputas sobre el canon**: Cuando el arrendatario considera que el canon es excesivo o
  cuando el arrendador desea ajustar el canon fuera de los periodos legales.
- **Disputas sobre el estado del inmueble**: Cuando hay desacuerdo sobre danos, mejoras o
  el inventario de entrega/devolucion.
- **Disputas sobre servicios publicos**: Cuando una de las partes no cumple con el pago de
  servicios a su cargo.
- **Disputas sobre terminacion anticipada**: Cuando una parte invoca una causal de terminacion
  que la otra parte no reconoce.

### 12.2 Mediacion con Prestadores de Servicios

VeriHome tambien conecta a los arrendatarios con prestadores de servicios (plomeros,
electricistas, cerrajeros, etc.). El abogado puede mediar en disputas sobre:

- Calidad del servicio prestado.
- Incumplimiento de plazos o presupuestos.
- Danos causados durante la prestacion del servicio.
- Garantias y reclamaciones.

### 12.3 Documentacion de Resoluciones

Toda mediacion debe documentarse en la plataforma:

- Fecha y hora de la mediacion.
- Partes involucradas.
- Descripcion del conflicto.
- Argumentos de cada parte.
- Resolucion alcanzada.
- Compromisos adquiridos por cada parte.
- Fecha limite para el cumplimiento de los compromisos.

### 12.4 Tickets del Departamento Legal

El sistema de tickets internos de VeriHome incluye un departamento legal (`department='legal'`)
que recibe automaticamente los tickets relacionados con temas juridicos. Los tickets se
auto-distribuyen mediante deteccion de palabras clave en el mensaje del usuario.

**Endpoints de tickets:**
```
GET  /api/v1/core/tickets/                -- Listar tickets (staff: todos, usuario: propios)
POST /api/v1/core/tickets/                -- Crear ticket
POST /api/v1/core/tickets/{id}/assign/    -- Asignar a un miembro del equipo legal
POST /api/v1/core/tickets/{id}/respond/   -- Agregar respuesta (interna o publica)
POST /api/v1/core/tickets/{id}/resolve/   -- Marcar como resuelto
POST /api/v1/core/tickets/{id}/close/     -- Cerrar ticket
GET  /api/v1/core/tickets/stats/          -- Estadisticas por departamento, estado, prioridad
```

### 12.5 Escalamiento de Casos Complejos

Cuando un conflicto no puede resolverse mediante mediacion en la plataforma, el abogado debe:

1. Documentar completamente el caso en el sistema de tickets.
2. Informar a las partes que la via conciliatoria en la plataforma se ha agotado.
3. Orientar a las partes hacia los mecanismos legales externos:
   - Centros de conciliacion autorizados por el Ministerio de Justicia.
   - Inspeccion de Policia (para asuntos de convivencia y perturbacion).
   - Jurisdiccion ordinaria (demandas civiles por incumplimiento contractual).
   - Accion de tutela (si se vulneran derechos fundamentales como la vivienda digna).

---

## 13. Soporte y Contacto

### 13.1 Canal de Soporte Legal Interno

El abogado tiene acceso al departamento legal dentro del sistema de tickets de VeriHome.
Los tickets asignados al departamento `legal` pueden ser:

- **Consultas de usuarios**: Preguntas sobre clausulas, derechos, obligaciones legales.
- **Solicitudes de mediacion**: Peticiones de intervencion en disputas.
- **Reportes de incumplimiento**: Denuncias de incumplimiento contractual por alguna de las partes.
- **Consultas regulatorias**: Preguntas sobre actualizaciones normativas que afecten los contratos.

### 13.2 Departamentos Disponibles en el Sistema de Tickets

```
general               -- Consultas generales
verification_agents   -- Agentes de verificacion en campo
legal                 -- Departamento legal (abogados)
ceo                   -- Direccion ejecutiva
marketing             -- Mercadeo
technical             -- Soporte tecnico
billing               -- Facturacion y pagos
```

### 13.3 Prioridades de Atencion

Los tickets se clasifican por prioridad:

- **Critica**: Situaciones que requieren atencion inmediata (por ejemplo, un contrato con
  clausulas manifiestamente ilegales que ya fue firmado).
- **Alta**: Situaciones urgentes que deben resolverse en 24 horas (disputas activas,
  terminaciones unilaterales).
- **Media**: Consultas que requieren investigacion (revision de clausulas especificas,
  asesorias sobre derechos).
- **Baja**: Consultas informativas sin urgencia (preguntas generales sobre legislacion).

### 13.4 Contacto con el Sistema de FAQ

VeriHome mantiene un sistema de preguntas frecuentes (FAQ) dinamico accesible en:

```
GET /api/v1/core/faqs/    -- Obtener preguntas frecuentes
```

El abogado puede contribuir al contenido del FAQ proporcionando respuestas a preguntas
legales recurrentes que puedan resolverse sin intervencion directa.

### 13.5 Formulario de Contacto General

Los usuarios externos pueden enviar mensajes a VeriHome a traves del formulario de contacto:

```
POST /api/v1/core/contact/    -- Enviar mensaje de contacto
```

Los mensajes de contacto que contengan palabras clave legales se auto-distribuyen al
departamento legal como tickets de soporte. El abogado debe monitorear estos tickets
regularmente.

---

## Anexo A: Glosario de Estados del Contrato

| Estado | Codigo | Descripcion |
|--------|--------|-------------|
| Pendiente Revision Admin | PENDING_ADMIN_REVIEW | Contrato recien creado, esperando revision del abogado |
| Borrador del Arrendador | DRAFT | Aprobado por el abogado, el arrendador puede continuar |
| Arrendador Completando Datos | LANDLORD_COMPLETING | El arrendador esta completando informacion |
| Arrendatario Invitado | TENANT_INVITED | Se envio invitacion al arrendatario |
| En Revision por Arrendatario | TENANT_REVIEWING | El arrendatario esta revisando el contrato |
| Devuelto por Arrendatario | TENANT_RETURNED | El arrendatario devolvio el contrato para correccion |
| Arrendador Corrigiendo | LANDLORD_CORRECTING | El arrendador esta corrigiendo tras devolucion |
| Re-enviado a Revision Admin | RE_PENDING_ADMIN | Contrato corregido, pendiente de re-revision |
| Modificacion Solicitada | MODIFICATION_REQUESTED | El arrendatario solicito modificaciones |
| Arrendador Modificando | UNDER_MODIFICATION | El arrendador esta modificando el borrador |
| Objeciones Pendientes | OBJECTIONS_PENDING | Hay objeciones sin resolver |
| Negociacion en Progreso | NEGOTIATION_IN_PROGRESS | Las partes estan negociando terminos |
| Aprobado por Arrendatario | APPROVED_BY_TENANT | El arrendatario acepto los terminos |
| Rechazado por Arrendatario | REJECTED_BY_TENANT | El arrendatario rechazo el contrato |
| Arrendatario en Autenticacion | TENANT_AUTHENTICATION | Proceso biometrico del arrendatario |
| Firmado por Arrendatario | TENANT_SIGNED | El arrendatario completo la firma biometrica |
| Arrendador en Autenticacion | LANDLORD_AUTHENTICATION | Proceso biometrico del arrendador |
| Firmado por Arrendador | LANDLORD_SIGNED | El arrendador completo la firma biometrica |
| Listo para Publicar | READY_TO_PUBLISH | Todas las firmas completadas |
| Publicado | PUBLISHED | Contrato con vida juridica |
| Activo | ACTIVE | Contrato en ejecucion |
| Vencido | EXPIRED | Contrato cuyo termino expiro |
| Terminado | TERMINATED | Contrato terminado por alguna de las partes |
| Cancelado | CANCELLED | Contrato cancelado antes de adquirir vida juridica |

---

## Anexo B: Checklist de Revision Juridica

Antes de aprobar un contrato, el abogado debe verificar cada uno de los siguientes puntos:

```
[ ] 1. Datos del arrendador completos y validos (nombre, documento, direccion)
[ ] 2. Datos de la propiedad coherentes (direccion, tipo, ciudad)
[ ] 3. Clausula PRIMERA (OBJETO) presente y correcta
[ ] 4. Clausula SEGUNDA (DESTINACION) presente, licita y compatible
[ ] 5. Clausula TERCERA (PRECIO) presente y dentro del limite legal (1% valor comercial)
[ ] 6. Clausula de TERMINO DEL CONTRATO presente con fechas claras
[ ] 7. Clausula de OBLIGACIONES DEL ARRENDADOR completa (Art. 8, Ley 820)
[ ] 8. Clausula de OBLIGACIONES DEL ARRENDATARIO completa (Art. 9, Ley 820)
[ ] 9. Clausula de CAUSALES DE TERMINACION presente (Arts. 22-24, Ley 820)
[ ] 10. Clausula de DEPOSITO DE GARANTIA conforme a ley (si aplica)
[ ] 11. Clausulas especificas del tipo de contrato presentes (urbano/comercial/rural/habitacion)
[ ] 12. Clausulas opcionales legales y razonables (si aplica)
[ ] 13. No existen clausulas abusivas, leoninas o contrarias a la ley
[ ] 14. Canon de arrendamiento no excede el 1% del valor comercial (Art. 18, Ley 820)
[ ] 15. Periodo del contrato razonable y claramente definido
[ ] 16. Tipo de documento del arrendador valido y formato correcto
[ ] 17. Sin conflicto de interes (abogado diferente al arrendador)
[ ] 18. Cumplimiento de normativa de propiedad horizontal (si aplica, Ley 675/2001)
[ ] 19. Para contratos comerciales: verificacion de Arts. 518-524 Codigo de Comercio
[ ] 20. Clausula de proteccion de datos personales conforme a Ley 1581/2012
```

---

## Anexo C: Referencias Normativas Consolidadas

| Norma | Articulos Clave | Tema |
|-------|-----------------|------|
| Ley 820 de 2003 | Arts. 3-5, 8-9, 16, 18, 20, 22-25, 37 | Arrendamiento de vivienda urbana |
| Ley 1581 de 2012 | Arts. 4, 5, 8, 12 | Proteccion de datos personales |
| Ley 527 de 1999 | Art. 7 | Firma electronica y comercio electronico |
| Ley 675 de 2001 | Arts. generales | Propiedad horizontal |
| Decreto 2364 de 2012 | Completo | Reglamentacion de firma electronica |
| Decreto 1377 de 2013 | Completo | Reglamentacion de proteccion de datos |
| Codigo Civil | Arts. 1602, 1973-2044 | Arrendamiento general |
| Codigo de Comercio | Arts. 518-524 | Arrendamiento comercial |
| Estatuto Tributario | Arts. 395, 476, 615-617 | Impuestos y facturacion |
| Resolucion DIAN 000042/2020 | Completa | Facturacion electronica |
| Decreto 358 de 2020 | Completo | Obligacion de facturar electronicamente |

---

*Documento preparado por el equipo de desarrollo de VeriHome.*
*Para consultas sobre esta guia, contactar al departamento tecnico mediante ticket interno (department='technical').*
*Ultima actualizacion: 23 de marzo de 2026.*
