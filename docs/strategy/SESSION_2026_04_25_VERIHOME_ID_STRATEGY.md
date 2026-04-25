# VeriHome ID — Estrategia de Identidad Digital Soberana
**Sesión de diseño**: 2026-04-25
**Estado**: Decisión arquitectónica tomada · Plan ejecutivo de 14 chunks
**Pivot crítico**: De "integrar Truora" → "construir VeriHome ID propio"

---

## Resumen ejecutivo

En esta sesión, VeriHome pivotó su estrategia de validación de identidad
desde **integrar un proveedor externo (Truora/Anteia/Metamap)** hacia
**construir un sistema propio "VeriHome ID"** que combina:

1. Triangulación documental digital (cédula + selfie + match + email + OTP)
2. Cruces con fuentes oficiales colombianas (con consentimiento titular)
3. Visita presencial con agente VeriHome
4. Acta firmada por abogado titulado (tu firma)
5. IA local en tablet/VPS Colombia para asistencia técnica
6. VPS Colombia encriptado con KMS para data residency Ley 1581

**Filosofía**: máxima autonomía. No depender de terceros para construir
una utility (KYC) que no diferencia VeriHome. El verdadero diferenciador
es la combinación digital + presencial + abogado certificador, **imposible
de replicar por proveedores SaaS puros**.

## Decisiones tomadas

| # | Decisión | Justificación |
|---|---|---|
| 1 | Retirar AWS Rekognition + Textract + Liveness | Cumplido en commit `565b31e` (TR-5) |
| 2 | NO integrar Truora | Sales-led (1 sem espera), $0.50/validación, dependencia vendor |
| 3 | NO integrar Stripe Identity | No soporta cédula Colombia |
| 4 | NO patentar modelo de utilidad | ROI bajo vs marca + derechos autor (alternativas) |
| 5 | NO scraping con bypass de captcha (incluso con IA local) | Riesgo Ley 1273 + reputacional |
| 6 | SÍ user-driven scraping con consentimiento (Belvo pattern) | Legal + alta tasa éxito |
| 7 | SÍ IA local para asistencia, anti-fraude, parsing | Compatible con marca premium |
| 8 | SÍ visita presencial como diferenciador estructural | Único, defendible, marca |
| 9 | SÍ tu firma como abogado certificando proceso | Activo legal subestimado |
| 10 | SÍ 4 derechos de petición (RNEC, MinTIC, ADRES, SNR) | Documentación oficial + posible apertura |
| 11 | SÍ VPS Colombia encriptado | Cumplimiento Ley 1581 sin asteriscos |
| 12 | Postergar SAS hasta tener 5-10 contratos firmados pagantes | Evitar costo prematuro |

## Niveles de confianza KYC (marco conceptual)

| Nivel | Descripción | Riesgo fraude | Caso de uso |
|---|---|---|---|
| 1 — Declarativo | Solo datos del usuario | 30%+ | Redes sociales |
| 2 — Triangulación digital | Cédula+selfie+match+email+fone+pago | 5-10% | Fintech early |
| 3 — Cruce oficial | Nivel 2 + RNEC/centrales (Truora) | 1-2% | Banca |
| 4 — Notarial | Nivel 3 + presencia física + firma certificada ECD | <0.5% | Compraventa inmuebles |
| **VeriHome ID** | **Nivel 2 + cruces ADRES/RUAF/RUNT/STN/IGAC + visita + acta abogado** | **<2%** | **Único en mercado arrendamiento CO** |

**Posicionamiento**: VeriHome ID es Nivel 3.5 — entre cruce oficial
estándar y notarial, sin el cruce facial RNEC (bloqueante regulatorio)
pero con presencia física que **ningún proveedor SaaS ofrece**.

## Análisis Truora — por qué se descartó

**Pricing real Truora Identity**: ~$0.30-0.80 USD/validación (NO los $12/mes
que el founder vio inicialmente — esos son del producto ZapSign de firma
electrónica, no de KYC).

**Modelo onboarding**: B2B sales-led. Requiere:
- Formulario "Hablar con ventas"
- Espera 3-10 días para llamada
- Onboarding empresarial (RUT, caso de uso, SARLAFT básico)
- Acuerdo de tratamiento de datos firmado
- Acceso a sandbox solo después de aprobación

**Lo que Truora aporta**: cruce con RNEC vía convenio (la pieza realmente
regulada y cara que VeriHome no puede replicar sin SARLAFT formal).

**Lo que NO aporta**: visita presencial, certificación por abogado,
verificación de inmueble (tradición y libertad, IGAC, foto in-situ).

**Conclusión**: Truora es 10% del problema (cruce RNEC). El otro 90%
(captura, OCR, liveness, listas, validaciones, IA local, presencia) lo
construye VeriHome con costo marginal cercano a cero.

## Realidad legal Colombia

### Lo que VeriHome SÍ puede hacer sin convenio

- Captura biométrica propia con consentimiento (Ley 1581 cumplida)
- OCR de cédula CO (parser ya implementado en `_colombian_id_parser.py`)
- Liveness facial con head turns (face-api.js + MediaPipe)
- Match facial cédula ↔ selfie (face-api.js embeddings)
- Listas OFAC/ONU/UE (datos públicos descargables)
- PEPs CO públicos (DAFP scraping)
- Antecedentes Procuraduría/Contraloría/Policía (datos públicos)
- Validación email (SMTP + DNS)
- OTP teléfono propio (Twilio/Hablame)
- Firma electrónica simple Ley 527 art. 7 (ya implementada)
- Audit trail + integrity hash + timestamp (ya implementado)
- Storage encriptado en infraestructura Colombia
- Web of trust interno (DB propia)
- Visita en campo + acta firmada por abogado titulado

### Lo que NO puede hacer sin convenio

- Cruce con RNEC + foto biométrica (requiere convenio, ~12-18 meses + capital)
- Firma certificada por ECD (requiere acreditación ONAC, ~12-18 meses + COP $200-500M)
- Centrales de riesgo (DataCrédito, TransUnion, CIFIN — convenio comercial)
- API biométrica RNEC gratuita (no existe, nunca ha existido)

### Marco normativo clave

| Ley/Decreto | Aplicación |
|---|---|
| Constitución art. 23 | Derecho de petición — 15 días hábiles respuesta |
| Constitución art. 15 | Habeas data — el titular puede consultar sus datos |
| Constitución art. 51 | Vivienda digna — argumento para tarifa preferencial RNEC |
| Ley 527/1999 | Firma electrónica simple — válida y suficiente para arrendamiento |
| Ley 820/2003 | Régimen de arrendamiento de vivienda urbana |
| Ley 1273/2009 | Delitos informáticos — bypass captcha autónomo es riesgo penal |
| Ley 1581/2012 | Protección datos personales — consentimiento + finalidad |
| Decreto 1377/2013 | Reglamentario Ley 1581 |
| Ley 1751/2015 | Estatutaria Salud — transparencia BDUA |
| Ley 1755/2015 | Derecho de petición — plazos y procedimiento |
| Decreto 2364/2012 | Firma electrónica certificada — opcional, no obligatoria |
| Resoluciones RNEC 5631/2014, 7300/2016 | Servicios de validación biométrica |

### Sanciones reales en Colombia

- **SIC vs Datacrédito-DataLegal (2022)**: COP $580M por uso indebido de
  fuentes públicas sin consentimiento.
- Esto refuerza la regla: consentimiento explícito + finalidad documentada
  + no bypass de medidas de seguridad.

## Fuentes oficiales colombianas (mapa completo)

| Fuente | URL | Qué da | Captcha |
|---|---|---|---|
| **ADRES BDUA** | `servicios.adres.gov.co/BDUA/Consulta-Afiliados-BDUA` | Afiliación salud + EPS + régimen | reCAPTCHA |
| **RUAF** | `wsp.minsalud.gov.co/RUAF/Index.aspx` | Salud + pensión + ARL + caja + cesantías | Sí |
| **RUNT** | `runt.com.co/consultaCiudadana/#/consultaPersona` | Vehículos + licencias + comparendos | reCAPTCHA |
| **Procuraduría** | `procuraduria.gov.co/Pages/anteced.aspx` | Antecedentes disciplinarios | Sí |
| **Contraloría** | `contraloria.gov.co` | Responsabilidad fiscal | Sí |
| **Policía** | `antecedentes.policia.gov.co` | Antecedentes judiciales | Sí |
| **DAFP** | `funcionpublica.gov.co` | PEPs públicos | No (datos abiertos) |
| **DIAN RUT** | `muisca.dian.gov.co/WebRutMuisca` | Estado tributario | Sí |
| **RUES (Cámara Comercio)** | `rues.org.co` | Empresas + representantes | No |
| **STN — Tradición y Libertad** | `vur.gov.co` | Propiedad inmobiliaria | Pago + login |
| **IGAC** | `igac.gov.co` | Avalúo catastral | Sí |
| **Catastro Bogotá** | `catastrobogota.gov.co` | Predios + matrícula | Sí |
| **SIMIT** | `simit.org.co` | Comparendos consolidado | Sí |
| **Migración Colombia** | `migracioncolombia.gov.co` | Cédula extranjería | Sí |

## El mito desmontado: "IA local actuando como humano"

**Idea original del founder**: entrenar IA local que automatice consultas
"como si fuera humano".

**Realidad legal**: Ley 1273/2009 art. 269A (Acceso abusivo a sistema
informático) **no distingue entre bot tradicional y IA imitando humano**.
Bypass de captcha = violación de medida de seguridad = riesgo penal
4-8 años + multa.

**Realidad técnica**: reCAPTCHA v2/v3 detecta:
- Patrones de mouse (humano vs bot)
- Velocidad de tipeo
- TLS fingerprint
- IP residencial vs datacenter
- Score de comportamiento
LLM local (Llama 8B/Qwen 7B) NO los rompe. Tasa de éxito real:
20-40% inicial, cae a 5-10% en 2 semanas con bloqueos progresivos.

**Solución correcta**: **user-driven scraping con consentimiento**
(patrón Belvo/Plaid/TrueLayer):
- Usuario abre sitio oficial (página real, no proxy)
- Usuario resuelve captcha él mismo (es SU cédula)
- VeriHome captura DOM resultante con consentimiento explícito
- Tasa éxito 95-99%, cero costo legal, cero mantenimiento

## IA local — usos legítimos en VeriHome

Donde la IA local **sí aporta valor real** (compatible con marca premium):

| Uso | Modelo | Valor |
|---|---|---|
| Detector cédulas falsas | YOLO/CV pequeño | Holograma, microimpresiones, escudo |
| Parser inteligente comprobantes | Llama 3.1 8B Q4 | Extrae empleador, monto, frecuencia de PDFs |
| Anti-deepfake facial | EfficientNet | Detecta máscaras 3D, foto-de-foto |
| Análisis coherencia documental | Llama 3.1 8B | Cruza cédula+recibo+carta laboral |
| Asistente cláusulas Ley 820 | Qwen 2.5 7B fine-tuned | Genera cláusulas custom validadas |
| Scoring riesgo arrendatario | LightGBM + LLM | Score interpretable |
| Estructuración actas visita | Llama 3.1 8B + vision | Extrae info de fotos + audio |
| Fuzzy match listas OFAC/PEPs | Embedding model | Match local sin scraping |

**Stack IA local recomendado:**
- Modelo principal: **Llama 3.1 8B Q4** o **Qwen 2.5 7B Q4**
- RAM requerida: ~6GB
- CPU: viable pero lento (5-10 tokens/seg)
- GPU consumer (RTX 3060 12GB): rápido (~50-100 tokens/seg)
- Despliegue: tablet del agente (edge) o VPS Colombia con T4 (~$300/mes)

## Modelo de negocio derivado

**"VeriHome ID Verified™" como producto premium:**

- Membership único pagado por el usuario (no por la plataforma):
  COP $50-150K/usuario verificado
- Vigencia: 12 meses (re-verificación anual)
- Beneficios: acceso prioritario a inmuebles top, sello visible en perfil,
  derechos preferentes, garantía de respuesta arrendador <24h

**Ventajas vs modelo Truora (donde plataforma absorbe costo):**
- Cliente paga directo por el sello → financia operación visita campo
- Genera ingreso recurrente (renovación anual)
- Crea moat de marca ("yo soy VeriHome ID Verified")
- Transferible: el sello acompaña al usuario en futuros arriendos

**Costo operativo estimado por visita:**
- Agente VeriHome (transporte + tiempo): COP $30-50K
- Infraestructura (VPS + IA local): COP $5-10K amortizado
- Stationery + tablet/datos móviles: COP $5K
- **Total**: ~COP $40-65K/visita
- **Ingreso por visita** (si membership $80K): COP $40-15K margen
- **Volumen**: 1000 verificaciones/mes = ingresos COP $80M, margen ~$25-50M

## Plan ejecutivo — 14 chunks

Cada chunk = 0.5 a 1 sesión Claude.

| # | Chunk | Tiempo | Bloqueado por |
|---|---|---|---|
| C1 | 4 derechos de petición listos para radicar | ✅ Hecho | — |
| C2 | Skeleton overlay cédula + autocaptura (OpenCV.js) | 1 sesión | — |
| C3 | OCR cédula con Tesseract + parser CO | 0.5 sesión | C2 |
| C4 | Liveness face-api.js con head turns | 1 sesión | — |
| C5 | Match facial cédula ↔ selfie | 0.5 sesión | C3+C4 |
| C6 | Asistente IA local + Playwright workflow visita | 1 sesión | C2-C5 |
| C7 | Cruces ADRES + RUAF + RUNT (user-driven) | 1 sesión | C6 |
| C8 | Cruces antecedentes (Procuraduría/Contraloría/Policía) | 1 sesión | C6 |
| C9 | Cruce STN tradición y libertad + IGAC | 1 sesión | C6 |
| C10 | Validaciones complementarias (email, OTP, recibos, OAuth) | 1 sesión | — |
| C11 | Acta visita campo + firma abogado + hash chain | 1 sesión | C6+C7 |
| C12 | Score compuesto + dashboard interno | 1 sesión | C7-C11 |
| C13 | VPS Colombia encriptado + KMS + provider storage | 0.5 sesión | — |
| C14 | LLM local fine-tuned VeriHome (corpus jurídico) | 1 sesión | tras tracción |

**Total estimado**: ~12 sesiones para sistema completo (3-4 semanas).

## Roadmap a 6 meses

| Mes | Hitos |
|---|---|
| **1** | C1 (radicar peticiones) + C2-C5 (captura+OCR+liveness+match) · Sistema KYC digital end-to-end |
| **2** | C6-C9 (asistente IA + cruces oficiales) · Respuestas peticiones llegan |
| **3** | C10-C12 (complementarias + acta + score) · Primer agente operativo en Bogotá |
| **4** | C13-C14 (VPS + LLM fine-tuned) · 50 visitas reales completadas · iteración UX |
| **5** | Constituir SAS · Registrar marca VeriHome ID · Aliados estratégicos |
| **6** | Lanzamiento público VeriHome ID Verified · 200+ usuarios verificados · revenue de membership |

## Próximos pasos inmediatos (esta semana)

**Tú:**
1. Personalizar los 4 derechos de petición (insertar tu nombre, CC, TP, dirección, email, teléfono).
2. Radicar en orden de prioridad: ADRES → SNR → RNEC → MinTIC.
3. Anotar fecha de radicación de cada uno (15 días hábiles cuenta desde radicado).
4. Documentar respuestas conforme lleguen.

**Próxima sesión Claude:**
1. Confirmar que los derechos de petición fueron radicados.
2. Arrancar C2 — skeleton overlay cédula con OpenCV.js + autocaptura.
3. Definir stack del agente VeriHome (web app vs PWA vs React Native).

## Archivos generados en esta sesión

- `docs/strategy/VERIHOME_ID_FIELD_VISIT_FLOW.md` — Flujo detallado visita campo
- `docs/strategy/SESSION_2026_04_25_VERIHOME_ID_STRATEGY.md` — Este documento
- `docs/legal/derecho_peticion_RNEC.md` — Petición Registraduría
- `docs/legal/derecho_peticion_MINTIC.md` — Petición MinTIC
- `docs/legal/derecho_peticion_ADRES.md` — Petición ADRES
- `docs/legal/derecho_peticion_SUPERNOTARIADO.md` — Petición SNR

## Commits relevantes en esta sesión

- `565b31e` · TR-5: AWS retirado limpio (-1689/+66 LOC, 0 regresión)
- `d12d7ee` · TR-A2: placeholders Truora env vars (después se descartan)
- [pendiente] · Documentación estrategia VeriHome ID

## Lecciones aprendidas (valor para sesiones futuras)

1. **Verificar antes de afirmar**: asumí que Truora tenía signup self-service.
   No lo tiene. Lección: para servicios B2B enterprise, verificar flujo de
   onboarding antes de incluir en plan.

2. **Sales-led es industria estándar en KYC**: Truora, Sumsub, Persona,
   Onfido, Veriff, Anteia, Metamap — todos requieren contacto ventas.
   La única excepción self-service (Stripe Identity) no soporta Colombia.

3. **El 90% del KYC es construible**: solo el cruce con RNEC + foto biométrica
   está realmente bloqueado por convenio. Todo lo demás es infraestructura
   técnica + voluntad legal.

4. **Consentimiento ≠ permiso ilimitado**: el consentimiento del titular del
   dato cubre Ley 1581 pero NO autoriza a violar términos de uso de la
   plataforma fuente ni a bypassear medidas de seguridad técnicas (Ley 1273).

5. **User-driven scraping es el patrón correcto**: lo que hacen Belvo/Plaid.
   Usuario ejecuta consulta sobre sus propios datos con asistencia técnica.
   Legal + alta tasa éxito + cero mantenimiento.

6. **Tu firma como abogado es un activo subestimado**: en disputa de
   arrendamiento, acta + consentimiento + biometría + tu firma profesional
   = peso pericial nivel notarial. Ningún proveedor SaaS puede ofrecerlo.

7. **Modelo híbrido digital + presencial es defendible**: Truora opera
   digital puro. Habi/La Haus tienen visitas pero sin IA + acta legal.
   La intersección de los tres es estrategia única.

8. **Derecho de petición es herramienta gratuita y obligatoria**: 15 días
   hábiles de respuesta legal. Sirve para documentar realidad oficial,
   establecer relación institucional, y eventualmente abrir puertas que
   no se sabían existían.

---

**Última actualización**: 2026-04-25 · **Próxima revisión**: tras
respuestas peticiones (15 días hábiles).



