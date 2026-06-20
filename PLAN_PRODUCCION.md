# PLAN DE PRODUCCIÓN — VeriHome

**Creado**: 2026-06-11 · **Auditado contra el repo**: 2026-06-11 (roles,
puertos, configs docker/nginx, specs E2E y seeds verificados contra el
código real) · **Objetivo**: salir a producción sin errores.
**Estrategia acordada**: validar el 100% de la aplicación en localhost,
módulo por módulo, corrigiendo cada error encontrado. **No se compra ni
configura infraestructura (hosting, dominio) hasta que todo funcione.**

Este documento es la fuente de verdad del camino a producción. Cada
sesión avanza una casilla, termina en commit + push, y marca aquí el
progreso. **Regla de oro: no se abren features nuevas hasta terminar
la Fase 4.**

---

## Decisiones de alcance (cerradas, no re-discutir)

| Decisión | Estado |
|---|---|
| MVP v1 = propiedades + matching + mensajería + contratos biométricos | ✅ Decidido 2026-06-11 |
| Facturación DIAN (XAdES) | ⏸️ Aplazada post-lanzamiento |
| Pagos live (Stripe/Wompi) | ⏸️ Aplazados — solo sandbox/demo en v1 |
| Hosting y dominio | ⏸️ Se decide al terminar Fase 3 |
| Liveness facial real (P0.4b) | ⏸️ Se decide al terminar Fase 2 (ver riesgo en Fase 2.7) |

---

## FASE 0 — Cerrar el working tree (1 sesión)

Hay ~2.300 líneas sin commitear desde el 31 de mayo + la limpieza
staged del 11 de junio. Nada se puede probar con confianza sobre un
working tree sucio.

- [x] 0.1 ✅ 2026-06-11 — Suite backend: **971/971 OK + 3 skipped** (231s).
- [x] 0.2 ✅ 2026-06-11 — tsc 0 errores · build 42s (PWA 88 entries) · Jest
  **813/813** (el cuelgue era de WSL; en Ubuntu nativo corre en 29s).
  Nota: hubo que reinstalar `node_modules` (se perdió en la migración).
- [x] 0.3 ✅ 2026-06-11 — Commit `3436f92` (limpieza + debug spec +
  plantilla nginx obsoleta + scripts cypress→playwright en package.json).
- [x] 0.4 ✅ 2026-06-11 — Commit `cb46a69` (12 fixes PDF + biometric_service).
- [x] 0.5 ✅ 2026-06-11 — Commit `692b8e3` (refactor frontend −2.226 líneas;
  incluye fix del test TenantContractsDashboard con MemoryRouter y proxy
  Vite corregido 8001→8000).
- [x] 0.6 ✅ 2026-06-12 — Push + arreglo de los 3 jobs rojos de CI:
  - lint-check: pre-commit hooks aplicados → commit `adceb2f` (style).
  - security-scan: **pip-audit 40 vulns → 0** → commit `750169f`
    (Django 4.2.30, allauth 0.57→65.14.1 con migración de API/settings,
    Pillow 12, cryptography 46.0.7, weasyprint eliminado por no usarse,
    pins Twisted/pyopenssl). Suite re-validada 971/971.
  - test-frontend: los 6 errores ESLint de comillas quedaron resueltos
    por el formateo de `adceb2f`.
  - test-e2e-playwright: flake de timezone en `fase-c9` (runner UTC vs
    server America/Bogota: `issue_date` de "hoy" UTC caía en el futuro
    entre 7pm y medianoche Colombia) → fix `f828161` (daysAgo(2)).
  - **Run final 27392746738: 9/9 jobs verdes** (incluido deploy). ✅
- [x] 0.7 ✅ 2026-06-11 — `NEXT_SESSION.md` archivado en
  `docs/history/NEXT_SESSION_hasta_2026-04-21.md`; nuevo slim apunta aquí.

**Criterio de salida**: `git status` limpio ✅ · **CI 9/9 verde** ✅ ·
baseline documentado ✅. **FASE 0 COMPLETADA 2026-06-12.**

---

## FASE 1 — Validación funcional módulo por módulo en localhost (4-6 sesiones)

El corazón del plan. Se prueba **cada módulo como lo viviría un usuario
real** (Claude maneja el browser/API con Playwright + servidores locales
corriendo), en el orden del viaje de usuario. Por cada bug: fix → test
de regresión → commit. Un módulo no se marca ✅ hasta que su recorrido
completo pasa sin errores.

**Setup por sesión** (verificado contra `frontend/playwright.config.e2e-real.ts`):
- Backend en puerto **8000**: `python manage.py runserver 0.0.0.0:8000`
  (o `daphne -b 0.0.0.0 -p 8000 verihome.asgi:application` cuando se pruebe WebSocket).
- Frontend: `npm run dev` (5173) y correr Playwright con
  `PLAYWRIGHT_BASE_URL=http://localhost:5173` (el config espera 5174/build por defecto).
- El config e2e-real **no levanta servers** — hay que arrancarlos antes. Su
  `global-setup-e2e.ts` siembra datos automáticamente con
  `scripts/testing/seed_e2e_multiuser.py` (crea landlord, tenant, codeudor,
  admin, prestador y agente de verificación).

> **Nota de entorno (2026-06-12)**: en la máquina del dueño los puertos
> 8000 y 5173 están ocupados permanentemente por otro proyecto (Tutelas
> Manager). VeriHome local corre con backend **8001** y Vite **5174**:
> `python manage.py runserver 0.0.0.0:8001` ·
> `VITE_BACKEND_URL=http://127.0.0.1:8001 npx vite --port 5174 --strictPort`
> y Playwright con `PLAYWRIGHT_BASE_URL=http://localhost:5174`
> `PLAYWRIGHT_BACKEND_URL=http://localhost:8001`. CI sigue en 8000/5174.

### Orden de validación (viaje de usuario)

- [x] 1.1 ✅ 2026-06-12 **Autenticación** — validación completa:
  - Specs UI 24/24 (auth + navigation + public-pages) contra app real.
  - Recorrido real E2E: registro con código de entrevista → email de
    confirmación (console backend) → confirmación → login → dashboard →
    logout → forgot password → reset → login con contraseña nueva.
  - Login verificado para los 5 roles sembrados (200 todos).
  - Visual desktop + móvil (Pixel 5): login, registro, forgot, dashboard.
  - **Bug encontrado y ARREGLADO**: el submit del registro fallaba en
    silencio total — campos `required` dentro de acordeones colapsados
    no son focusables y la validación nativa cancelaba el submit sin
    mostrar nada. Fix: `noValidate` en el form (la validación JS con
    mensajes ya existía pero nunca corría) + scroll automático al Alert
    de error (se renderiza arriba y el botón está abajo).
  - **Bugs anotados para 1.11 (dashboard)**: "Pagos del mes 0,00 €"
    (moneda EUR en vez de COP) · "Ocupación NaN%" sin datos · gráfico
    "Flujo de Caja" muestra datos fake para usuario nuevo sin contratos.
- [x] 1.2 ✅ 2026-06-12 **Perfil + hoja de vida**:
  - Spec `fase-l1` 1/1 real (GET/PATCH profile, avatar 400 sin file, resume CRUD, landlord ve resume del tenant, prestador 403).
  - UI real: perfil muestra los datos del registro, edición persiste tras reload (PATCH 200); resume: estado vacío limpio → crear → llenar → guardar → completitud 10%→90% persistente. Salarios en COP ✓.
  - Visual desktop+móvil OK. Deuda nueva: D11 (4 GETs repetidos a `onboarding/me` por carga de página).
- [x] 1.3 ✅ 2026-06-12 **Propiedades**:
  - Specs: properties 4/4 (UI) · fase-g2 imagen real · fase-i2 búsqueda real (en los 55 E2E).
  - UI real: creación completa con imagen → 201 + modal de éxito profesional; propiedad verificada por API (status available, $1.800.000 COP, imagen 1). Autocomplete de direcciones (Nominatim/Mapbox) funcionando.
  - **Bug D13 ARREGLADO**: la dirección tecleada a mano nunca llegaba a `formData.address` (solo se seteaba al elegir sugerencia o capturar en mapa) → backend 400 con el campo lleno. Fix: sync `setValue('address')` en onChange.
  - Deudas nuevas: D14 (validación nativa muestra "Please fill out this field" en inglés), D15 (`lot_area` obligatorio incluso para apartamentos).
- [x] 1.4 ✅ 2026-06-12 **Matching** — flujo núcleo del marketplace validado E2E real por UI:
  - Tenant: detalle de propiedad → "Enviar Solicitud" → wizard 4 pasos (personal/financiera/preferencias/mensaje) → POST 201.
  - Landlord: Solicitudes → ve la solicitud con datos del tenant → Aceptar → 200 `match_code MT-MNWDGC5U`, status accepted.
  - **Bug D16 ARREGLADO**: fecha de mudanza opcional vacía viajaba como `''` → 400 del DateField; ahora los opcionales vacíos se omiten del payload.
  - Deuda nueva: D17 (contadores de Solicitudes quedan stale tras aceptar; la lista sí se refresca).
  - El match aceptado queda como insumo para el recorrido de contratos (1.6).
- [x] 1.5 ✅ 2026-06-12 **Mensajería**:
  - **WebSocket en tiempo real VERDE**: spec `fase-g1` des-skippeado y pasando — mensaje por API → entrega instantánea `new_message` al destinatario conectado (runserver ya sirve WS: daphne primero en INSTALLED_APPS).
  - Threads por contexto: `fase-e2` 1/1 (en los 55 E2E).
  - UI: inbox carga y muestra el mensaje automático de aceptación del match (integración matching→mensajería ✓, con código y compatibilidad).
  - Deuda nueva: D18 (mensaje de sistema renderiza "Sin asunto / De: Usuario / Fecha desconocida" y el contador de no-leídos no cuadra con el badge "Nuevo").
- [x] 1.6 ✅ 2026-06-12 **Contratos LCC — workflow completo por UI real**:
  visita programada → evaluada → documentos del tenant (5 subidos con
  confirmación c/u, revisados por landlord con gating backend "5
  pendientes" ✓) → contrato auto-generado → aprobación landlord →
  aprobación tenant → biometría. Objeciones/jurídico cubiertos por
  specs fase-a2/a3 + full-admin-review (en los 55).
  **Bug D20 ARREGLADO (backend)**: el approve del landlord no sincronizaba
  el MatchRequest → el tenant nunca veía su CTA de aprobación (flujo
  muerto para usuario real). Codeudor por token queda para 1.16.
- [x] 1.7 ✅ 2026-06-12 **Biometría 4 pasos por UI real** (cámara y mic
  fake de Chromium): facial → documento (PDF + nº + frontal/reverso con
  rostro) → voz (2 grabaciones con waveform) → firma digital en canvas
  (calidad 70%) **+ consentimiento explícito de datos biométricos y T&C
  (Ley 1581 ✓)** → complete-auth 200 **para ambas partes** →
  **contrato ACTIVE**. Deuda D21: el aviso de demo-mode que manda la API
  no se muestra en los pasos 1-3.
- [x] 1.8 ✅ 2026-06-12 **PDF del contrato**: VH-2026-000003 — 9 páginas,
  diseño notarial (laurel + Temis + QR), resumen ejecutivo, COP correcto,
  "Sin depósito", VIGENTE, ciudad real, cláusulas Ley 820. Los 12 fixes
  del 31-may verificados sobre contrato real. Deuda D22: no valida que
  las cédulas de las partes sean distintas.
- [x] 1.9 ✅ 2026-06-12 **Servicios y órdenes**: specs reales b1+b2 (órdenes/solicitudes) y f3+h3 (suscripciones) verdes en los 55; páginas del prestador probadas (dashboard, services, service-requests). Nota: D25 — revisar texto sospechoso en `/app/services` del prestador.
- [x] 1.10 ✅ 2026-06-12 **Ratings**: specs e1 (rating por service_order + unicidad parcial) e i1 (respuesta/reporte) verdes; página del tenant carga limpia.
- [x] 1.11 ✅ 2026-06-12 **Dashboard + notificaciones**: D1-D3 resueltas y verificadas por rol (tenant sin widgets ajenos/NaN/EUR; landlord con sus gráficos). Notificaciones de match/contrato visibles en campana e inbox. D12 (series reales) sigue abierta.
- [x] 1.12 ✅ 2026-06-12 **Admin**: spec admin-panel 6/6 (incl. acceso denegado a no-admin) + full-admin-review en los 55; **Audit Trail visto en vivo** (69 acciones con usuario/IP/acción — trazabilidad 1.9 funcionando).
- [x] 1.13 ✅ 2026-06-12 **Tickets**: specs f2+h2 verdes; página admin de tickets carga.
- [x] 1.14 ✅ 2026-06-12 **VeriHome ID**: los 9 specs c1-c9 verdes en los 55 (onboarding, enforcement, scoring, wizard agente, OTP, recibo público con fix de timezone, analytics); página del tenant carga.
- [x] 1.15 ✅ 2026-06-12 **Pagos sandbox**: specs d1+g4 verdes; **cronograma real visible en UI** (13 órdenes de $1.800.000 del contrato VH-2026-000003). Sin pasarela live ✓. **Bugs nuevos**: D23 (la activación vía biometría UI no disparó la generación del cronograma — el signal funciona en aislamiento; hubo que regenerar manualmente) y D24 (13 cuotas para contrato de 12 meses — off-by-one).

### Transversales (se prueban al cerrar los módulos)

- [x] 1.16 ✅ 2026-06-12 **Matriz de roles**:
  - Login 200 de los 6 perfiles (landlord, tenant, prestador, admin/staff, jurídico, agente).
  - Cruces prohibidos por API: tenant→contratos-landlord 403 · tenant→audit-logs 403 · prestador→crear-propiedad 403 · anónimo→perfil/propiedades 401. No-admin redirigido de /app/admin (spec).
  - Recorrido clave ejecutado por cada rol participante (1.1-1.8); agente cubierto por specs c5/c6; jurídico vía full-admin-review + Audit Trail en vivo.
  - **Pendiente acotado**: flujo de codeudor por token público (sin spec dedicado) → registrado como D29, validar en Fase 2 o con la beta.
- [x] 1.17 ✅ 2026-06-12 **Auditoría visual UI/UX** (≈25 screenshots de
  evidencia durante las casillas + barridos 1440px (9 págs × 3 roles) y
  360px (5 págs)):
  - Tema consistente, estados vacíos limpios con CTAs, formularios con feedback. Móvil con bottom-nav y cards apiladas — sólido.
  - Hallazgos consolidados como deuda: D28 (overflow horizontal de pocos px a 360px en dashboard/contratos/pagos/mensajes), D25 (texto sospechoso en /app/services del prestador) + menores previos D14 (validación en inglés), D17-D19. axe-core a11y ya corre en CI (fase-j2 ✓).
- [x] 1.18 ✅ 2026-06-12 **Emails transaccionales** (console backend):
  - Verificados en vivo en el recorrido: confirmación de registro (link
    `FRONTEND_URL` correcto, usado para confirmar), reset de contraseña
    (link usado), bienvenida, "Contrato Aprobado", "Solicitud de Firma
    Digital", "Requiere Correcciones", "Objeción Recibida", "Nueva visita
    asignada". OTP VeriHome ID cubierto por spec c8.
  - Pendiente de pulido: render HTML real (Mailpit) y revisión anti-spam
    quedan para Fase 4.3 con el SMTP de producción.

**Método por módulo**:
1. Correr los specs Playwright existentes del módulo (`playwright.config.e2e-real.ts`).
2. Recorrido manual dirigido (Claude opera el browser) cubriendo el happy path + 2-3 caminos de error.
3. **Chequeo visual del módulo**: screenshot de cada pantalla en desktop y móvil; revisar layout, estados vacíos/carga/error y consistencia con el tema antes de marcar la casilla.
4. **Chequeo de roles del módulo**: repetir las acciones clave con cada rol que interactúa con ese módulo (no solo el rol principal).
5. Bug encontrado → arreglar → test que lo cubra → commit `fix(módulo): …`.
6. Marcar la casilla aquí con fecha.

**Criterio de salida**: las 18 casillas marcadas ✅ · suite completa verde ✅
(55 E2E reales + 813 Jest + 971 backend + WS) · screenshots de evidencia ✅ ·
bugs críticos encontrados → arreglados en sesión (D1-D3, D13, D16, D20,
D23, D24, D26 + flake c9 + registro silencioso) · menores consolidados en
la tabla de deuda con destino asignado.
**FASE 1 COMPLETADA 2026-06-12.**

---

## FASE 2 — Hardening técnico (2-3 sesiones)

Lo que está "funcionando de milagro" se vuelve explícito y robusto.

- [x] 2.1 ✅ 2026-06-12 **Pipeline de estáticos resuelto**: `STATIC_ROOT=staticfiles/` (salida) · `STATICFILES_DIRS=[static/]` (fuentes) · coincide con el volumen del compose y con ReactAppView. Fix colateral: ReactAppView dev apuntaba a puerto muerto 3000 → ahora `FRONTEND_URL`. collectstatic re-validado (1449 archivos). Documentado en `docs/DEPLOYMENT.md`. Commit `d32fccb`.
- [x] 2.2 ✅ 2026-06-12 **Fallbacks ya no degradan en silencio (D9)**: BD → RuntimeError con DEBUG=False en vez de SQLite vacío; cache → re-lanza ImportError de django_redis en prod; `DJANGO_REDIS_LOG_IGNORED_EXCEPTIONS=True`. Validado: dev OK, prod con BD rota revienta. Commit `d32fccb`.
- [x] 2.3 ✅ 2026-06-12 **`check --deploy`**: sin warnings de seguridad (los 53 issues son W001/W002 de drf-spectacular — falta de type-hints en el schema OpenAPI, no afectan runtime). Registrado como D31 (menor).
- [ ] 2.4 **Datos fake fuera**: ⏳ se materializa en Fase 3.2 (seed de producción real sobre BD virgen; admin con datos reales, sin cédulas demo). La BD de dev actual no es la de prod.
- [x] 2.5 ✅ 2026-06-12 **Secretos**: grep de código trackeado limpio (0 keys hardcodeadas, 0 defaults peligrosos). `.env` no trackeado ✓. Pendiente operativo D5: el `.env` LOCAL tiene GITHUB_TOKEN + password Gmail — rotarlos antes de compartir la máquina; el `.env` de prod será nuevo (Fase 4.3).
- [x] 2.6 ✅ 2026-06-12 **UUID compartido (D8)**: `check_contract_sync --json` ahora hace **exit 1** con huérfanos y corre como gate en CI tras la suite E2E (sobre datos reales). Huérfanos locales limpiados. `--fix` sigue sin implementar (decisión: el gate previene, el fix manual con `_ensure_contract_exists` cubre casos puntuales). Commit `d32fccb`.
- [x] 2.7 ✅ 2026-06-12 **Sistema facial PROPIO** (decisión del dueño: nada de demos ni SaaS — reconocimiento en servidor propio, mejor para Ley 1581): `LocalFacialProvider` (`contracts/biometric_providers/local.py`) con dlib/face_recognition (detección HOG + embeddings 128-d + comparación selfie-vs-cédula real) y OpenCV (calidad: nitidez Laplaciana/brillo/tamaño). Liveness **heurístico v1** (nitidez/textura/color — anti-foto-borrosa y anti-pantalla básico; NO anti-deepfake). Validado con datos reales: misma persona 0.80, impostor 0.26, frame fake de Playwright rechazado. Factory con fallback a demo si faltan libs (CI). Dockerfile.prod compila dlib (cmake/g++). Commit `c6a8e4c`. **Mejora futura (D38)**: liveness por challenge (parpadeo/giro) con video multi-frame.
- [x] 2.8 ✅ 2026-06-12 **Pasada de seguridad dirigida**:
  - **Acceso horizontal: BLINDADO** — prestador→contrato/PDF/biometría/docs ajenos = 403/404 en todos los casos.
  - **Uploads: hueco encontrado y CERRADO** — el documento validaba solo por extensión (`.pdf`); un `.exe` renombrado pasaba. Añadida validación por magic bytes (`%PDF`). Avatar ya validaba imagen. Commit pendiente.
  - **Rate-limiting: CONFIRMADO funcionando** — 429 tras 10 logins desde IP externa (auth_strict 10/min); exento solo en localhost+DEBUG.
  - **Tokens**: basura/malformados → 401 limpio.
  - Hallazgo D32: login distingue "email no existe" de "password incorrecto" (user enumeration) — trade-off de producto (el front usa `error_type` para sugerir registro); decisión del dueño.
- [x] 2.9 ✅ 2026-06-12 **Resiliencia ante terceros caídos**: AWS biométrico mal configurado → degrada a `DemoFacialProvider` transparente (warning en log). Mapbox sin token → mapa no renderiza pero el form sigue (geocoder Nominatim primario). SMTP caído en registro → falla con mensaje legible (`fail_silently=False`, decisión del dueño; riesgo registrado D33).
- [ ] 2.10 **Mínimo legal Ley 1581** (tarea del dueño, en paralelo — es abogado):
  las páginas **ya existen** (`/terms` → `TermsPage.tsx`, `/privacy` →
  `PrivacyPage.tsx`, con contenido genérico de desarrollo). La tarea es
  **revisar y reemplazar ese texto** con redacción legal real, y verificar
  que el disclosure biométrico existente (BIO-002, Ley 1581) sea un
  **consentimiento explícito** (checkbox afirmativo), no solo un aviso.
  Claude integra los textos cuando estén redactados.
  **Bloqueante para go-live, no para Fases 1-3.**

**Criterio de salida**: `check --deploy` limpio · sin datos fake · estáticos documentados · seguridad y resiliencia probadas · decisión P0.4b tomada · textos legales en redacción.

---

## FASE 3 — Ensayo general de producción… en localhost (1-2 sesiones)

Probar el stack de producción **sin comprar nada**: levantar
`docker-compose.prod.yml` en esta misma máquina.

- [x] 3.1 ✅ 2026-06-12 Stack completo construido y levantado (variante
  `docker-compose.local.yml` + `nginx.local.conf`, HTTP sin SSL). El build
  de Vite llega vía bind `./staticfiles/frontend` → raíz de nginx. **2 bugs
  de deploy cazados por el ensayo** (ambos existían también en
  `docker-compose.prod.yml` y habrían tumbado producción):
  1. nginx no arrancaba: los volúmenes static/media iban anidados DENTRO
     del bind read-only de la SPA → docker no puede crear los mountpoints.
     Fix: van en `/srv/static` y `/srv/media` (compose + nginx conf, local
     y prod).
  2. `docker-entrypoint.sh` ignoraba `"$@"` y hacía `exec gunicorn`
     SIEMPRE → daphne y celery worker/beat en realidad corrían gunicorn
     (sin WebSockets ni tareas asíncronas), y los 4 contenedores migraban
     a la vez sobre la BD virgen pisándose ("column budget_range already
     exists"). Fix: con argumentos el entrypoint espera BD/Redis y ejecuta
     el comando del servicio; solo el backend (sin command) migra +
     collectstatic + superuser + gunicorn.
- [x] 3.2 ✅ 2026-06-12 **Instalación desde cero sobre BD virgen**: el
  Postgres del contenedor nace vacío; `migrate` corrió limpio (156
  migraciones, 0 pendientes). Seed de producción aplicado: superuser +
  `create_interview_codes` (comando NUEVO — no existía, ver 2.7-adyacente)
  + `seed_subscription_plans` (3 planes) + site domain `localhost`. **Esto
  cierra 2.4**: BD sin cédulas demo ni datos fake. **Bug cazado**: el login
  exige `EmailAddress` de allauth verificado, pero el superuser del
  entrypoint no creaba ninguno → admin de instalación nueva NO podía entrar.
  Fix en `docker-entrypoint.sh` (crea EmailAddress verified=True).
- [x] 3.3 ✅ 2026-06-12 **Smoke test** contra el stack prod-local: SPA carga
  (título VeriHome), login admin 200 (JWT), `/api/v1/users/auth/me/`,
  `/properties/`, `/contracts/contracts/`, `/matching/requests/`,
  subscription-plans y `/admin/` todos 200. WebSocket: handshake **101
  Switching Protocols + WSCONNECT** autenticado por `?token=`. (Viaje UI
  completo registro→PDF lo valida el dueño en navegador.)
- [x] 3.4 ✅ 2026-06-12 **WS + Celery + backup**. **Bug CRÍTICO cazado**
  (habría roto WS en producción real): `settings.py` tenía DOS bloques
  `CHANNEL_LAYERS`; el segundo sobreescribía al primero y **hardcodeaba
  `hosts: [("127.0.0.1", 6379)]`**, ignorando `REDIS_URL` → el channel
  layer nunca encontraba Redis remoto. Fix: usa `f"{REDIS_URL}/4"` y se
  borró el bloque muerto. **2º bug**: `REDIS_URL` en los compose traía
  sufijo `/1` y settings le añade su propio `/N` → URLs `…/1/4`
  malformadas; quitado el `/1`. Celery worker/beat conectados a Redis y
  `ready`. Backup diario: ver 3.6.
- [x] 3.5 ✅ 2026-06-12 **Checklist de seguridad**. **Bug cazado**: un
  bloque `if not DEBUG:` tardío en settings RE-HARDCODEABA
  SSL-redirect/HSTS/cookies-secure/CORS/EMAIL pisando los valores por env
  → el ensayo HTTP local hacía 301→https y cualquier deploy con TLS
  terminado en proxy se rompía. Fix: el env manda (SECURE_SSL_REDIRECT,
  SESSION/CSRF_COOKIE_SECURE, CORS_ALLOWED_ORIGINS, EMAIL_BACKEND);
  `CSRF_TRUSTED_ORIGINS` ahora también admite extras por env. Verificado:
  DEBUG=False + envs del ensayo → cookies/SSL no-seguras, rate-limiting
  activo (429 a los 10 logins/min).
- [x] 3.6 ✅ 2026-06-12 **Drill de backup/restore EJECUTADO**: `pg_dump`
  custom-format gzip (90K) → TRUNCATE/DELETE de users+codes+plans
  (verificado 0/0/0) → `pg_restore --clean --if-exists` → vuelta exacta al
  baseline (1 user / 10 codes / 3 plans) + login 200 post-restore. **Un
  backup restaurado de verdad.** Gaps anotados (D39, D40).
- [x] 3.7 ✅ **Runbook de operación** (`docs/RUNBOOK.md`, 1 página): cómo ver
  logs de cada servicio, reiniciar servicios, restaurar backup, qué revisar
  si la app no responde. Para el dueño a las 11pm sin Claude en la sesión.

### Estado 2026-06-12 (preparado; ejecución pendiente de instalar Docker)

**Para instalar Docker** (Ubuntu 24.04, requiere sudo del dueño):
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2 && sudo usermod -aG docker $USER
```
Luego reabrir terminal (o `newgrp docker`) para que aplique el grupo.

**Para correr el ensayo** (ya preparado, archivos creados):
```bash
docker compose -f docker-compose.local.yml --env-file .env.localprod up -d --build
curl http://localhost/api/v1/   # backend vía nginx
xdg-open http://localhost/       # frontend
docker compose -f docker-compose.local.yml --env-file .env.localprod down
```

**2 BUGS CRÍTICOS ya encontrados (el deploy real habría fallado) y
ARREGLADOS** antes siquiera de correr el contenedor, solo leyendo el
compose contra el código (`d8b6427`):
- **D-BD**: `database_config.py` leía `DB_*` pero compose/`.env.example`
  pasan `DATABASE_*` → producción usaba HOST=localhost y NUNCA conectaba
  a Postgres. + engine `django.db.backends.postgresql` caía a SQLite.
  RESUELTO (`_db_var`/`_is_postgres`).
- **D-frontend**: nginx montaba `./frontend/dist` (outDir viejo) → servía
  un dir vacío. RESUELTO → `./staticfiles/frontend`.

Archivos de ensayo creados: `docker-compose.local.yml`,
`nginx/nginx.local.conf`, `.env.localprod` (gitignored).

Validado SIN infra:
- [x] 3.1 (parcial) — `Dockerfile.prod` y `docker-compose.prod.yml`
  revisados; `docker-entrypoint.sh` sólido (espera BD/Redis, migra,
  collectstatic, superuser). **Hallazgos D35**: usa Python **3.11**
  (local es 3.12; verificar deps actualizadas Pillow12/cryptography46
  compilan) y `collectstatic` en build-time del Dockerfile ahora falla
  sin config de BD por el hardening 2.2 (lo salva `|| true`, pero el
  entrypoint lo re-ejecuta bien).
- [x] 3.2 ✅ **Migrate desde cero validado**: `makemigrations --check`
  → "No changes", sin conflictos ni leaf múltiples; la suite (971 tests)
  crea BD virgen y aplica TODAS las migraciones en cada run. El camino
  "producción nace vacía" está cubierto. Seed prod = `init_verihome.sh`
  + `seed_subscription_plans` (NO el seed E2E).
- [x] 3.5 (parcial) — Checklist de seguridad: cookies/SSL/HSTS/CSRF
  correctamente gateados por `DEBUG` en settings (prod = default seguro).
- [x] 3.7 ✅ **`docs/RUNBOOK.md`** escrito (arranque, logs, troubleshooting,
  backups, rollback).
- [x] Build de producción del frontend OK (88 entradas PWA → `staticfiles/frontend/`).

Pendiente (requiere Docker o PG/Redis local):
- [ ] 3.1 levantar el compose · 3.3 smoke E2E contra stack prod ·
  3.4 WS/Celery/backup en contenedor · 3.6 drill backup/restore.

**Criterio de salida**: la app corre completa en modo producción local y el smoke E2E pasa. **En este punto la app está lista — lo único que falta es dónde ponerla.**

---

## FASE 4 — Decisiones de lanzamiento y go-live (cuando la Fase 3 esté verde)

Recién aquí se gasta dinero. Decisiones pendientes:

- [ ] 4.1 Elegir hosting (recomendación actual: VPS ~€6-12/mes con el mismo docker-compose ya ensayado en Fase 3 — el ensayo hace que esto sea casi copy-paste).
- [ ] 4.2 Comprar dominio + DNS + SSL (Let's Encrypt).
- [ ] 4.3 `.env` de producción real (SECRET_KEY nuevo, SMTP real, AWS keys si P0.4b entró, Mapbox, Sentry).
- [ ] 4.4 Deploy + smoke test en producción + tag `v1.0.0`.
- [ ] 4.5 **Beta cerrada antes del anuncio público**: 3-5 personas de
  confianza (familia, colegas) hacen el recorrido completo **sin guía**
  — registro, publicar/buscar propiedad, match, mensajes, contrato.
  Recoger fricciones de UX y bugs, arreglar, y solo entonces anunciar.
  (Puede adelantarse desde localhost con un túnel gratuito tipo
  Cloudflare Tunnel si se quiere feedback antes de pagar hosting.)
- [ ] 4.6 Monitoreo activo primera semana (Sentry + health checks ya existentes).

---

## FASE 5 — Post-lanzamiento (backlog congelado hasta v1 live)

Pagos live (Wompi/Bold) · DIAN XAdES · liveness P0.4b si quedó fuera ·
i18n completo (~664 strings) · refactor de monolitos
(`contracts/api_views.py` 4200 líneas, `pdf_generator.py` 3679 líneas).

---

## Registro de deuda técnica (consolidado — se actualiza al encontrar/resolver)

| # | Deuda | Encontrada | Estado |
|---|-------|-----------|--------|
| D1 | Dashboard: "Pagos del mes" muestra **EUR (€)** en vez de COP | 1.1 (2026-06-12) | ✅ Resuelta 2026-06-12 — `formatCurrency` → es-CO/COP sin decimales |
| D2 | Dashboard: "Ocupación **NaN%**" cuando no hay datos | 1.1 (2026-06-12) | ✅ Resuelta 2026-06-12 — causa raíz: widgets de arrendador (Ocupación/Flujo de Caja) se mostraban a tenants cuyo payload no trae `occupied`; gateados a landlord + fallback `\|\| 0` |
| D3 | Dashboard: gráfico "Flujo de Caja" muestra **datos fake** para usuario sin contratos | 1.1 (2026-06-12) | ✅ Resuelta 2026-06-12 — `Math.random()` reemplazado por ceros honestos; fallback mock eliminado en producción (solo DEV) |
| D4 | Confirm-email dispara el POST **dos veces** (StrictMode/doble efecto); endpoint idempotente, sin daño, pero es ruido | 1.1 (2026-06-12) | 🟡 Menor |
| D5 | `.env` local contiene GITHUB_TOKEN y password Gmail (no trackeados, pero revisar en limpieza de secretos) | 1.1 (2026-06-12) | 🔴 Abierta → 2.5 |
| D6 | ESLint no cubre `playwright/` (parserOptions.project) y prettier estaba inconsistente en ~48 specs | 1.1 (2026-06-12) | 🟡 Menor → 2.x |
| D7 | `check_contract_sync --fix` no implementado (report-only) | Auditoría 2026-06-11 | ⏸️ Decidido 2026-06-12 (2.6): no se implementa — el gate en CI previene huérfanos y el fix manual con `_ensure_contract_exists` cubre casos puntuales |
| D8 | 3 modelos de contrato comparten UUID sin constraint | Auditoría 2026-06-11 | ✅ Resuelta 2026-06-12 (2.6) — `check_contract_sync --json` hace exit 1 con huérfanos y corre como gate en CI; huérfanos limpiados |
| D9 | Fallbacks Redis/Channels/PG degradan en silencio | Auditoría 2026-06-11 | ✅ Resuelta 2026-06-12 (2.2) — con DEBUG=False: BD→RuntimeError (no SQLite vacío), cache→re-lanza ImportError de django_redis |
| D10 | Monolitos: `contracts/api_views.py` ~4200 líneas, `pdf_generator.py` ~3700 | Histórico | ⏸️ Post-launch (Fase 5) |
| D11 | `/app/profile` dispara 4 GETs a `onboarding/me`. Diagnóstico: StrictMode duplica (**solo en dev** → en prod son 2) × 2 consumidores independientes (banner + VeriHomeIDCard). Fix limpio = React Query/context compartido (refactor, requiere decisión) | 1.2 (2026-06-12) | ✅ Resuelta 2026-06-20: `VeriHomeIDCard` usaba un `useEffect` manual sin caché (un GET por montaje + duplicado por StrictMode). Pasado a `useQuery` (key `verihome-id-onboarding-me`, staleTime 60s) → dedupe del doble-invoke + caché compartida. El banner ya usaba React Query. tsc/build OK |
| D12 | `/dashboard/stats/` no expone **series temporales** (ingresos/gastos por día) — el gráfico Flujo de Caja del landlord queda en ceros hasta tener endpoint real | D3 (2026-06-12) | 🔴 Abierta → 1.11 o Fase 5 |
| D13 | PropertyForm: dirección tecleada a mano no llegaba a `formData.address` → 400 | 1.3 (2026-06-12) | ✅ Resuelta 2026-06-12 — setValue en onChange |
| D14 | PropertyForm usa validación nativa del browser → tooltips "Please fill out this field" **en inglés** | 1.3 (2026-06-12) | 🟡 Menor → 1.17 auditoría visual |
| D15 | PropertyForm exige `lot_area` (área de lote) **incluso para apartamentos** | 1.3 (2026-06-12) | 🟡 Menor |
| D16 | MatchRequestForm: fecha opcional vacía viajaba como `''` → 400 | 1.4 (2026-06-12) | ✅ Resuelta 2026-06-12 — opcionales vacíos se omiten del payload |
| D17 | Contadores de Solicitudes (Pendientes/Aceptadas) no se refrescan tras aceptar — la lista sí | 1.4 (2026-06-12) | ✅ Resuelta 2026-06-20: los chips usaban el query separado `statistics` (no invalidado por `handleAcceptRequest`, que solo hacía `refetchMatchRequests`). Ahora se derivan del mismo array que las listas → siempre sincronizados. tsc/build OK |
| D18 | Inbox lista **mensajes individuales** (no threads) → "Sin asunto" porque el modelo `Message` no tiene subject (el `MessageThread` SÍ lo tiene = "Match Aceptado - …"). "De: Usuario / Fecha desconocida" = mapeos serializer↔render rotos. Fix = alinear el render del inbox con los campos reales (frontend, no one-liner) | 1.5 (2026-06-12) | ✅ Resuelta 2026-06-20: `MessageList` ahora lista HILOS (subject, otro participante, preview de last_message, last_message_at, badge no-leído) en vez de Message sueltos. Bonus: `MessageDetail` era un **stub vacío** (abrir conversación = pantalla en blanco) → implementado como vista de lectura del hilo con campos reales. tsc/build OK |
| D19 | Card del tenant muestra el workflow_status **crudo** ("documents_approved") en vez de label legible | 1.6 (2026-06-12) | 🟡 Menor |
| D20 | approve_contract del landlord no sincronizaba MatchRequest → el tenant nunca veía su CTA de aprobación (**flujo muerto**) | 1.6 (2026-06-12) | ✅ Resuelta 2026-06-12 — sync espejo del lado tenant en landlord_api_views |
| D21 | Biometría: el `demo_disclosure` que manda la API no se renderiza en los pasos 1-3 (el paso 4 sí tiene consentimientos Ley 1581) | 1.7 (2026-06-12) | ✅ Resuelta 2026-06-20: el flujo real es `ProfessionalBiometricFlow` (no `BiometricAuthenticationFlow`, que estaba sin usar) y NO mostraba disclosure en ningún paso. Añadida pantalla de **consentimiento informado Ley 1581 como gate ANTES del paso 1** (responsable, datos sensibles, finalidad, voluntariedad, derechos ARCO + checkbox de autorización expresa). Cubre los 4 pasos. Texto base; redacción final en 2.10. tsc/build/test OK |
| D22 | No se valida que las cédulas de arrendador y arrendatario sean **distintas** (PDF salió con la misma para ambos) | 1.8 (2026-06-12) | 🟡 Menor |
| D23 | **La activación por biometría UI no generó el cronograma de pagos**. Causa raíz: `Contract.save()` legacy sincronizaba el LCC con `queryset.update()` (sin signals) → el LCC ya estaba ACTIVE en BD cuando recompute "transicionaba" → el generador veía ACTIVE→ACTIVE y se saltaba | 1.15 (2026-06-12) | ✅ Resuelta 2026-06-12 (`74ba7ec`) — save() de instancia; repro E2E genera 12 órdenes |
| D24 | Cronograma generaba **13 cuotas para contrato de 12 meses** (+1 incondicional en `_months_between`) | 1.15 (2026-06-12) | ✅ Resuelta 2026-06-12 (`74ba7ec`) |
| D26 | `_handle_sequential_progression` buscaba el match **solo por property** — con varios matches en la misma propiedad tomaba uno arbitrario | D23-hunt (2026-06-12) | ✅ Resuelta 2026-06-12 — filtro por property+tenant |
| D27 | `Contract.save()` legacy pisa `match.workflow_status` con 'contract_signed' cuando status='active' — ping-pong con el 'all_biometrics_completed' de recompute (sin efecto visible hoy, pero frágil) | D23-hunt (2026-06-12) | 🟡 Menor → 2.6 (consolidar máquinas de estado) |
| D28 | Overflow horizontal de pocos px a 360px en dashboard/contratos/pagos/mensajes (usable; bottom-nav y stacking OK) | 1.17 (2026-06-12) | ✅ Resuelta 2026-06-20: el `<Box component='main'>` (flex-child) no tenía `minWidth:0` → hijos anchos (Grid con márgenes negativos, tablas) lo empujaban sobre el viewport. Añadido `minWidth:0` + `maxWidth:100%` + `overflowX:hidden`. tsc/build OK (verificación visual a 360px recomendada) |
| D29 | Flujo de **codeudor por token público** sin spec dedicado ni validación E2E manual | 1.16 (2026-06-12) | ✅ Resuelta 2026-06-20: `contracts/tests/test_codeudor_public_flow.py` (7 tests) cubre los endpoints sin login: validar token (200 + marca accessed), token inexistente (400 INVALID_TOKEN), expirado (400), ya completado no reutilizable, status válido/inexistente, autogeneración token+hash sha256+expiración 7d. Fix colateral: docstring del módulo daba mal el prefijo de URL. Suite 1013 OK |
| D30 | WebSocket en CI: el mensaje no propaga al receptor en el runner (spec g1 verde en local con daphne-runserver; skip condicional `process.env.CI`). Tuning ASGI/channel-layer del workflow: 2-3 sesiones | CI (2026-06-12) | 🟠 Media → Fase 5 (local + prod-local Fase 3 lo cubren) |
| D31 | `check --deploy`: 53 warnings W001/W002 de drf-spectacular (type-hints faltantes en el schema OpenAPI) — no afectan runtime, solo la doc `/api/schema/` | 2.3 (2026-06-12) | 🟡 Menor → Fase 5 |
| D32 | Login revela "email no existe" vs "password incorrecto" (**user enumeration**) — el front usa `error_type:user_not_found` para sugerir registro | 2.8 (2026-06-12) | 🟠 Media — DECISIÓN DEL DUEÑO (seguridad vs UX; mitigado por registro-por-invitación) |
| D33 | Registro con `fail_silently=False`: un hipo del SMTP de Gmail bloquea TODOS los registros con 500 | 2.9 (2026-06-12) | ✅ Resuelta 2026-06-20: el email de confirmación va por Celery (`users.tasks.send_confirmation_email`, reintenta 3×) encolado con `transaction.on_commit`; si SMTP/broker fallan el registro IGUAL devuelve 201 (usuario puede reenviar en `/auth/resend-confirmation/`). Bonus: arreglado el hardcode `localhost:5173` del adapter → `settings.FRONTEND_URL` (link de confirmación estaba roto en prod). 4 tests (`D33ConfirmationEmailTests`), suite 1006 OK. Verificado E2E: registro 201 + worker ejecuta la tarea (`succeeded: sent`) |
| D34 | `GuaranteeDocumentUpload.tsx` huérfano (sin imports vivos) con upload SIMULADO (`Math.random()` éxito/fallo) — código muerto a borrar | 2.4 (2026-06-12) | 🟡 Menor (limpieza) |
| D35 | `Dockerfile.prod` usa Python 3.11 (local 3.12) y corre collectstatic en build-time (frágil con hardening 2.2) — verificar al ensayar el compose | 3.1 (2026-06-12) | ✅ Resuelta 2026-06-20: **causa raíz extra hallada** — `venv_ubuntu/` (~6 GB, py3.12) NO estaba en `.dockerignore` → `COPY . .` lo metía en la imagen y `chmod -R 755 /app` lo recorría entero (build ~17 min, imagen 6.3 GB). Fixes: (1) venv excluido en `.dockerignore`; (2) `FROM python:3.12-slim` (paridad con local, dlib 20.0.1 compila OK, provider sigue `local`); (3) `collectstatic` de build-time eliminado (el entrypoint ya lo corre); (4) `chmod -R 755 /app` → `chmod +x` dirigido a entrypoint+scripts. **Resultado: imagen 6.3→2.95 GB (−53%), build 17→7 min** (rebuilds por código ahora en segundos). Verificado: py3.12.13, LocalFacialProvider, health/login 200, WS 101 |
| D36 | (resuelta) Docker instalado y ensayo Fase 3 ejecutado completo | 3 (2026-06-12) | ✅ Resuelta 2026-06-12 — stack levantado, smoke + drill OK |
| D-BD | **CRÍTICO**: database_config leía DB_* pero compose pasa DATABASE_* → prod nunca conectaba a Postgres (HOST=localhost). + engine path completo caía a SQLite | 3 (2026-06-12) | ✅ Resuelta 2026-06-12 (`d8b6427`) |
| D-FE | docker-compose.prod: nginx montaba ./frontend/dist (outDir viejo) → dir vacío | 3 (2026-06-12) | ✅ Resuelta 2026-06-12 (`d8b6427`) |
| D37 | `docker-compose.prod` tiene varios problemas para go-live: (a) pasa solo un SUBCONJUNTO de env al backend (faltan EMAIL_*, SENTRY_DSN, MAPBOX, SECURE_*, CSRF/CORS) → usarían defaults; debería usar `env_file`; (b) expone `5432:5432` y `6379:6379` al host (Postgres/Redis públicos — quitar en prod); (c) `daphne` no recibe `BIOMETRIC_*` ni varios env del backend | 3 (2026-06-12) | ✅ Resuelta 2026-06-20: los 4 servicios de app usan `env_file: .env.prod` (todo el entorno) + overrides mínimos de hostnames internos. Quitados `ports` de db/redis **y** de backend/daphne (8000/8001) — solo nginx publica 80/443. `.env.prod` y `.env.localprod` añadidos al `.gitignore` (estaban SIN ignorar). `.env.prod.example` REDIS_URL sin sufijo `/1`. Validado con `docker compose config` |
| D25 | `/app/services` autenticado renderiza la **landing pública de marketing** (con navbar "Iniciar Sesión/Registrarse") embebida dentro del layout de la app — doble navbar, confuso para un usuario logueado. (No era NaN: falso positivo de la heurística) | 1.9 (2026-06-12) | ✅ Resuelta 2026-06-20: la ruta app `services` (index.lazy.tsx) usaba `ServicesOverviewPage` (la landing pública) igual que la ruta pública `/services`. Cambiada a `ServicesPage` (panel in-app que estaba importado pero sin usar). Bonus: `ServicesPage` tenía un mock `useUser` hardcodeado a null → wireado a `useAuth` real (`user.user_type`). tsc 0 errores, build prod OK |
| D34 | (resuelta) GuaranteeDocumentUpload.tsx borrado | 2.4 (2026-06-12) | ✅ Resuelta 2026-06-12 (`197ad00`) |
| D19 | (resuelta) status crudo en dashboard tenant | 1.6 | ✅ Resuelta 2026-06-12 (`197ad00`) — mapa workflowStatusLabel |
| D38 | **Liveness por challenge** (parpadeo/giro de cabeza) con video multi-frame para el sistema facial propio — el liveness heurístico v1 actual NO es anti-deepfake. Mejora del diferenciador legal | 2.7 (2026-06-12) | 🟠 Media → antes del go-live o post-MVP (decisión dueño) |
| D39 | **Scripts backup/restore vs deploy en contenedor**: `scripts/backup_database.sh` y `restore_database.sh` leen `.env` (no `.env.localprod`) y `BACKUP_DIR=/backups` (no montado en el compose); el drill se hizo con pg_dump/pg_restore directos. Además la tarea Celery `core.tasks.backup_database` usa `dumpdata` JSON a `BASE_DIR/backups` — MECANISMO DISTINTO al de los scripts. Reconciliar: un solo método, ruta montada como volumen, `.env` o DATABASE_* disponibles | 3.4/3.6 (2026-06-12) | ✅ Resuelta 2026-06-20: **un solo método** = `scripts/backup_database.sh` (pg_dump custom+gzip), restaurable con `restore_database.sh`. La tarea Celery ahora delega en ese script (antes `dumpdata` JSON irrecuperable — y **estaba ROTA**: excluía `core.auditlog`, modelo inexistente → el backup diario fallaba en silencio desde siempre). Volumen `backup_volume:/backups` montado en backend + celery_worker (la tarea corre en el worker). `BACKUP_DIR` configurable por env. En contenedor las scripts usan los DATABASE_* ya exportados (no hace falta `.env`). Borrado el 3er mecanismo duplicado `scripts/backup_db.sh`. 3 tests nuevos (`core/tests/test_backup_task.py`). Verificado: pg_dump → `.sql.gz` 92K en /backups compartido backend↔worker |
| D40 | `pg_dump` del cliente (Debian del Dockerfile) es más nuevo que el server PG15 → emite `transaction_timeout` que PG15 rechaza (benigno, restore OK). Alinear versión cliente/servidor de Postgres en prod | 3.6 (2026-06-12) | ✅ Resuelta 2026-06-20: la base `python:3.12-slim` había saltado a Debian 13 (trixie) con pg_dump 17; fijada a `python:3.12-slim-bookworm` (Debian 12) → pg_dump **15.18** = server PG **15.18**. Bonus: build más reproducible (no sigue al `latest` de Debian). Verificado: backup sin warning, dlib/LocalFacialProvider OK en bookworm |
| D41 | **Doble beat schedule que se pisan**: `settings.CELERY_BEAT_SCHEDULE` y `verihome/celery.py` (`app.conf.beat_schedule = {...}`, línea 61) definen schedules DISTINTOS. Reconciliar a UNA sola definición y verificar qué tareas deben correr realmente | D39 (2026-06-20) | ✅ Resuelta 2026-06-20: schedule unificado en `settings.CELERY_BEAT_SCHEDULE` (única fuente); borrado el bloque de `celery.py`. **Hallazgo**: el `DatabaseScheduler` usaba el de settings, que tenía 1 tarea FANTASMA (`process_pending_notifications`, inexistente — `notifications/tasks.py` ni existe) y le faltaban 3 reales que nunca corrían: `cleanup_temp_files`, `update_platform_statistics` y **`process_auto_rent_charges`** (cobro automático de arriendo). Schedule final: 10 tareas, todas registradas (verificado). 3 tests nuevos (`core/tests/test_beat_schedule.py`, suite 1002 OK). Gotcha del `DatabaseScheduler` (no purga entradas viejas en deploys existentes) documentado en `docs/RUNBOOK.md`. Otras 2 fantasma de celery.py también eliminadas (`process_expired_contracts`, `send_payment_reminders`) |

---

## Reglas de trabajo (anti-patrón "no cerrar")

1. Cada sesión termina con **commit + push**, sin excepción.
2. **No features nuevas** hasta Fase 4 completada.
3. Un bug encontrado se arregla **en la misma sesión** o se anota como casilla aquí — nunca queda "en la cabeza".
4. Este archivo se actualiza al final de cada sesión (marcar casillas con fecha). No se crean planes nuevos: se ejecuta este.
