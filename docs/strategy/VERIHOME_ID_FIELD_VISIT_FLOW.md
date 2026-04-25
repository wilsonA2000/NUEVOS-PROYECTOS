# VeriHome ID — Flujo de Visita en Campo

**Versión**: 1.0 · **Fecha**: 2026-04-25 · **Estado**: Diseño aprobado para implementación

---

## Propósito

Definir el flujo end-to-end de la visita presencial que ejecuta el agente
VeriHome para validar la identidad de un nuevo miembro (arrendador,
arrendatario o prestador de servicios). Este flujo es la espina dorsal
del modelo "VeriHome ID Verified™" — el diferenciador estructural de
VeriHome frente a plataformas KYC genéricas (Truora, Anteia, Metamap).

## Posicionamiento

VeriHome ID combina:
- **Triangulación documental digital** (cédula + selfie + match + email + OTP)
- **Cruces con fuentes oficiales colombianas** (ADRES, RUAF, RUNT, STN, etc.)
- **Visita presencial con agente** (validación física insustituible)
- **Acta firmada por abogado titulado** (peso probatorio nivel notarial)

Resultado: nivel de confianza superior al de cualquier KYC digital puro,
imposible de replicar sin la operación física.

---

## Etapas del flujo

### 1. Pre-visita (asíncrono, antes del encuentro)

| Paso | Actor | Acción | Output |
|---|---|---|---|
| 1.1 | Solicitante | Completa formulario online: datos básicos, foto cédula (anverso/reverso), selfie | Pre-registro en estado `PENDING_FIELD_VISIT` |
| 1.2 | IA backend | Validación inicial: OCR cédula, match facial preliminar, score de plausibilidad | Score pre-visita 0.0-1.0 |
| 1.3 | Sistema | Si score >=0.5 → habilita agendamiento. Si <0.5 → rechazo automático con razones | Estado `READY_TO_SCHEDULE` o `REJECTED_PRE` |
| 1.4 | Solicitante | Agenda visita: ciudad, dirección, fecha, hora (slots de 60 min) | `FieldVisit` creada |
| 1.5 | Sistema | Asigna agente disponible por zona + envía notificación a ambos | Agente con visita en su agenda |
| 1.6 | Agente | Confirma 24h antes vía app móvil. Descarga paquete pre-visita encriptado | Datos cacheados localmente |

**Paquete pre-visita** (descargado a tablet del agente):
- Datos del solicitante (nombre, cédula, dirección reportada)
- Foto cédula y selfie del pre-registro
- Score y razones del pre-análisis IA
- Lista de fuentes a consultar durante la visita
- Plantilla de acta editable
- Modelo de consentimiento informado

### 2. Llegada y apertura (5 min)

| Paso | Actor | Acción | Documento |
|---|---|---|---|
| 2.1 | Agente | Llega a la dirección. Identificación con carnet VeriHome físico + QR verificable | — |
| 2.2 | Solicitante | Recibe al agente. Verifica el QR del carnet en su celular (link con foto del agente) | Confirmación visual |
| 2.3 | Agente | Saludo formal, contexto del proceso (3 min explicativos) | — |
| 2.4 | Agente | Lectura del consentimiento informado en voz alta | Consentimiento informado |
| 2.5 | Solicitante | Firma consentimiento informado en tablet del agente (con stylus o dedo) | Consentimiento firmado + biometría firma |
| 2.6 | Sistema | Hash + timestamp + geolocalización + IP del consentimiento | `ConsentRecord` con hash chain |

**Contenido del consentimiento informado** (resumen — versión completa en
`docs/legal/CONSENTIMIENTO_INFORMADO_VERIHOME_ID.md`):
- Identificación de VeriHome como Responsable de Tratamiento (Ley 1581)
- Finalidad: validación de identidad para participar en plataforma
- Datos a recolectar: biométricos (cara, voz), documentales (cédula,
  recibos), consultas a fuentes (ADRES, RUAF, RUNT, etc.)
- Derechos ARCO (Acceso, Rectificación, Cancelación, Oposición)
- Tiempo de retención (5 años post-fin de relación, justificado en
  Ley 820 art. 28 sobre prescripción acciones)
- Identidad del DPO + canales de contacto
- Firma del titular + del agente como testigo + tu firma de abogado
  certificando el proceso

### 3. Validación física presencial (10 min)

| Paso | Actor | Acción | Validación |
|---|---|---|---|
| 3.1 | Agente | Solicita cédula física | Compara foto cédula vs persona presente |
| 3.2 | IA local (tablet) | Captura cédula con autocaptura skeleton | OCR + parser CO + detección de holograma |
| 3.3 | Solicitante | Selfie con liveness activo (head turns: izq → der → arr → abj) | face-api.js + landmarks tracking |
| 3.4 | IA local | Match facial cédula ↔ selfie ↔ persona presente | Cosine similarity >= 0.85 |
| 3.5 | Agente | Observación física: ¿la cédula muestra signos de adulteración? ¿la persona se comporta normal? | Acta: campo "observaciones agente" |

### 4. Cruces con fuentes oficiales (10 min)

Para cada fuente, el patrón es: **IA orquesta + humano resuelve captcha + IA estructura resultado**.

| # | Fuente | Qué se valida | URL |
|---|---|---|---|
| 4.1 | **ADRES BDUA** | Afiliación al sistema de salud, EPS, régimen | `servicios.adres.gov.co/BDUA/Consulta-Afiliados-BDUA` |
| 4.2 | **RUAF** | Afiliación seguridad social total (salud + pensión + ARL + caja + cesantías) | `wsp.minsalud.gov.co/RUAF/Index.aspx` |
| 4.3 | **RUNT** | Vehículos a nombre + licencia conducir + comparendos | `runt.com.co/consultaCiudadana/#/consultaPersona` |
| 4.4 | **Procuraduría** | Antecedentes disciplinarios | `procuraduria.gov.co/Pages/anteced.aspx` |
| 4.5 | **Contraloría** | Responsabilidad fiscal | `contraloria.gov.co` |
| 4.6 | **Policía Nacional** | Antecedentes judiciales | `antecedentes.policia.gov.co` |
| 4.7 | **DAFP** (solo si aplica) | PEPs públicos | `funcionpublica.gov.co` |
| 4.8 | **DIAN RUT** (si persona jurídica o independiente) | Estado tributario | `muisca.dian.gov.co/WebRutMuisca` |

**Paso adicional para arrendadores:**

| # | Fuente | Qué se valida |
|---|---|---|
| 4.9 | **Superintendencia Notariado y Registro** | Certificado de tradición y libertad del inmueble (es propietario o autorizado) |
| 4.10 | **IGAC** | Avalúo catastral (validar valor canon vs avalúo) |
| 4.11 | **Catastro municipal** | Predios + matrícula inmobiliaria |

**Workflow técnico de cada cruce:**

```
1. Agente click "Validar fuente X"
2. IA local abre browser headed (Playwright) en tablet
3. Página oficial carga
4. Captcha aparece (si lo hay)
5. Solicitante (o agente) resuelve el captcha presencial
6. Página muestra resultado
7. IA local captura DOM con consentimiento explícito
8. IA estructura resultado en JSON
9. Hash + timestamp + persistencia encriptada
10. Vuelve a la app del agente con resultado verde/amarillo/rojo
```

### 5. Validación documental complementaria (10 min)

| Paso | Actor | Documento | Validación |
|---|---|---|---|
| 5.1 | Solicitante | Recibo público <60 días (luz/agua/gas) | OCR + cruce dirección |
| 5.2 | Solicitante | Comprobante laboral (carta o extracto bancario últimos 3 meses) | OCR + parser empleador + monto |
| 5.3 | Solicitante (opcional) | Conexión LinkedIn vía OAuth oficial | Profesión + empleador match |
| 5.4 | Solicitante | Validación email (link enviado al momento, click verificable) | Email confirmado |
| 5.5 | Solicitante | OTP teléfono (SMS al momento) | Teléfono confirmado |

### 6. Verificación inmueble (solo arrendadores, 15 min adicionales)

| Paso | Acción |
|---|---|
| 6.1 | Foto frontal del inmueble (geolocalizada) |
| 6.2 | Foto interior (sala + alguna habitación + baño + cocina) |
| 6.3 | Lectura del medidor de servicios (foto) |
| 6.4 | Conversación con vecino (voluntaria, grabada con consentimiento) |
| 6.5 | Cruce GPS visita ↔ catastro ↔ tradición y libertad |
| 6.6 | Calificación del estado del inmueble (escala 1-5 con foto evidencia) |

### 7. Cierre y acta (10 min)

| Paso | Actor | Acción |
|---|---|---|
| 7.1 | IA local | Genera borrador del acta consolidando: consentimiento, capturas, cruces, observaciones |
| 7.2 | Agente | Revisa el acta en tablet, ajusta observaciones manuales |
| 7.3 | Agente | Lee resumen al solicitante |
| 7.4 | Solicitante | Firma final sobre acta consolidada |
| 7.5 | Agente | Firma como testigo |
| 7.6 | Sistema | Envía acta a tu email para firma de abogado certificando el proceso |
| 7.7 | Sistema | Hash chain final + persistencia VPS Colombia encriptado |
| 7.8 | Solicitante | Recibe copia PDF del acta firmada por email |

**Tiempo total estimado de visita**: 50-60 minutos arrendatario, 75-90 min arrendador.

---

## Estructura del Acta de Visita VeriHome ID

```
ACTA DE VERIFICACIÓN DE IDENTIDAD VERIHOME ID
Acta Nº [auto] · Fecha: [auto] · Hora: [auto] · Hash: [auto]
GPS: [auto] · Ciudad: [auto]

I. IDENTIFICACIÓN DEL VERIFICADO
   Nombre: ...
   Documento: ...
   Tipo de membresía solicitada: arrendador / arrendatario / prestador

II. AGENTE VERIFICADOR
   Nombre: ...
   Carnet VeriHome Nº: ...
   Firma + huella digital

III. CONSENTIMIENTO INFORMADO
   Hash del documento firmado: ...
   Fecha-hora firma: ...

IV. VALIDACIÓN BIOMÉTRICA
   Match facial cédula ↔ selfie: [score]
   Liveness: [aprobado/rechazado] (head turns)
   Detector de cédula falsa: [resultado]
   Observación visual del agente: ...

V. CRUCES CON FUENTES OFICIALES
   ADRES BDUA: ...
   RUAF: ...
   RUNT: ...
   Procuraduría: ...
   Contraloría: ...
   Policía: ...
   DAFP (PEP): ...

VI. VALIDACIÓN DOCUMENTAL
   Recibo público: ...
   Comprobante laboral: ...
   Email verificado: ...
   Teléfono verificado: ...

VII. VERIFICACIÓN INMUEBLE (si aplica)
   Tradición y libertad: ...
   IGAC: ...
   Estado físico: ...

VIII. SCORE COMPUESTO VERIHOME ID
   Score total: [0.00 - 1.00]
   Decisión: APROBADO / OBSERVADO / RECHAZADO
   Razones: ...

IX. FIRMAS
   [Verificado] firma + huella
   [Agente] firma + huella
   [Wilson A., abogado titulado, T.P. Nº ...] firma certificando
   el proceso conforme a Ley 527/1999, Ley 1581/2012, Ley 820/2003.

X. HASH CHAIN
   Hash de este acta: ...
   Hash anterior: ...
   Bloque: ...
```

---

## Decisión final automática

Score compuesto VeriHome ID:

```python
score = (
    0.20 * match_facial +
    0.15 * liveness +
    0.15 * adres_match +
    0.15 * ruaf_match +
    0.10 * runt_match +
    0.05 * procuraduria_clean +
    0.05 * contraloria_clean +
    0.05 * policia_clean +
    0.05 * comprobante_laboral_match +
    0.05 * recibo_publico_match
)
```

| Rango | Decisión | Acción |
|---|---|---|
| ≥ 0.85 | APROBADO | Acceso completo a plataforma |
| 0.70-0.84 | OBSERVADO | Acceso con bandera amarilla, requiere documento adicional |
| < 0.70 | RECHAZADO | Sin acceso. Razones documentadas. Posibilidad de apelar con nuevo proceso. |

---

## Stack técnico para implementar

| Capa | Tecnología | Despliegue |
|---|---|---|
| App agente (móvil/tablet) | React Native o PWA con Service Worker | Tablet Android del agente |
| Browser automation | Playwright (Python) | Tablet o VPS |
| LLM local orquestador | Llama 3.1 8B Q4 / Qwen 2.5 7B (~6GB RAM) | Tablet (CPU) o VPS Colombia (con GPU T4) |
| Vision modelos | YOLO + EfficientNet (anti-deepfake) | Tablet edge |
| OCR | Tesseract.js + parser CO existente | Edge |
| face-api.js | Liveness + match | Edge browser |
| Storage encriptado | PostgreSQL + AES-256 + KMS | VPS Bogotá (Triara/IFX) |
| Hash chain | Merkle tree + SHA-256 | Backend Django |
| Acta PDF | ReportLab + tu firma electrónica | Backend Django |

---

## Próximos pasos derivados

Este flujo deriva en los siguientes chunks de implementación (cada uno
corresponde a 0.5-1 sesión Claude):

- **C1** — Redactar 4 derechos de petición (RNEC, MinTIC, ADRES, STN)
- **C2** — Skeleton overlay cédula + autocaptura (OpenCV.js)
- **C3** — OCR cédula con Tesseract + wire al parser CO existente
- **C4** — Liveness face-api.js con head turns
- **C5** — Match facial cédula ↔ selfie ↔ persona presente
- **C6** — Asistente IA local + Playwright workflow visita
- **C7** — Cruces ADRES + RUAF + RUNT
- **C8** — Cruce STN + IGAC + Catastro (arrendador)
- **C9** — Cruces antecedentes (Procuraduría/Contraloría/Policía)
- **C10** — Validaciones complementarias (email, OTP, recibos, OAuth LinkedIn)
- **C11** — Acta visita campo + tu firma abogado + hash chain
- **C12** — Score compuesto + dashboard interno
- **C13** — VPS Colombia encriptado + KMS + provider storage
- **C14** — LLM local fine-tuned VeriHome (corpus jurídico + contratos previos)

---

**Última actualización**: 2026-04-25 · **Próxima revisión**: tras
respuestas de los 4 derechos de petición (15 días hábiles).
