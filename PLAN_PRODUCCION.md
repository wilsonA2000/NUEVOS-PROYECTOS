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

### Orden de validación (viaje de usuario)

- [ ] 1.1 **Autenticación**: registro landlord/tenant/service_provider, verificación email, login, refresh token, logout, recuperación de contraseña, permisos por rol.
- [ ] 1.2 **Perfil + hoja de vida**: edición de perfil, avatar, completitud, resume del tenant, visibilidad entre roles.
- [ ] 1.3 **Propiedades**: CRUD completo, subida de imágenes, búsqueda y filtros, mapa (Mapbox), vista pública vs autenticada.
- [ ] 1.4 **Matching**: solicitud de match, aceptar/rechazar, dashboard de matches, estados del workflow, notificaciones generadas.
- [ ] 1.5 **Mensajería**: threads, envío/recepción, tiempo real por WebSocket (requiere Daphne), contextos (match/contrato/orden).
- [ ] 1.6 **Contratos LCC — workflow completo**: crear borrador → invitar tenant → datos tenant → objeciones → negociación → revisión jurídica admin → aprobación → listo para biometría. Incluye `check_contract_sync` y el **flujo de codeudor por token público** (`/codeudor-auth/:token`).
- [ ] 1.7 **Biometría 5 pasos**: cámara facial, documento (OCR), combinado, voz, firma. En modo demo provider (sin AWS) y verificación del disclosure Ley 1581.
- [ ] 1.8 **PDF del contrato**: generación, contenido correcto (los 12 fixes del 31-may), preview, descarga por ambas partes, permisos.
- [ ] 1.9 **Servicios y órdenes**: ServiceRequest, ServiceOrder, workflow del prestador, trazabilidad, **suscripciones de planes** (specs `fase-f3` + `fase-h3`, `SubscriptionPlans.tsx`).
- [ ] 1.10 **Ratings**: calificación por contrato y por service_order, restricciones de unicidad.
- [ ] 1.11 **Dashboard + notificaciones**: widgets por rol, contadores, campana de notificaciones.
- [ ] 1.12 **Admin**: audit logs (ADM-001), revisión jurídica de contratos, impersonación si existe.
- [ ] 1.13 **Tickets / soporte** y cualquier módulo descubierto en el camino.
- [ ] 1.14 **VeriHome ID / verificación** (subsistema completo, 9 specs `fase-c1`…`fase-c9`): onboarding, enforcement al tenant, banner/gate, scoring y wizard del agente de verificación, OTP por email, recibo público, analytics admin, field visits (`/app/admin/verification`, `/app/admin/field-visits`, `/app/admin/verihome-id/*`).
- [ ] 1.15 **Pagos en modo sandbox**: cronograma de canon automático, recibos, vista de transacciones (`/app/payments`, specs `fase-d1` + `fase-g4`). Sin pasarela live — verificar `WOMPI_SANDBOX_MODE=true` y que ningún flujo intente cobrar dinero real.

### Transversales (se prueban al cerrar los módulos)

- [ ] 1.16 **Matriz de roles completa** (roles reales verificados contra
  `users/models/user.py`): los 3 `user_type` — **arrendador, arrendatario,
  prestador de servicios** — más **admin/staff** (`is_staff`, incl. jurídico),
  **agente de verificación** (usuario con perfil de agente, no es un user_type),
  **codeudor** (acceso por token público, sin cuenta) y **anónimo**. Verificar:
  - Cada rol ve solo sus menús, rutas y dashboards (sin opciones huérfanas).
  - Acciones prohibidas devuelven 403/redirect limpio, nunca error 500 ni pantalla rota.
  - El mismo recorrido clave (propiedad → match → contrato) ejecutado de
    punta a punta una vez por cada rol participante.
  - El seed E2E (`scripts/testing/seed_e2e_multiuser.py`) ya crea un usuario
    de cada rol — usarlo como base.
- [ ] 1.17 **Auditoría visual UI/UX global** (con screenshots de evidencia):
  - Consistencia de tema: colores, tipografía, spacing, botones (tokens de `tokens.ts`).
  - Responsive en 3 anchos: 360px (móvil), 768px (tablet), 1440px (desktop).
  - Estados vacíos ("sin propiedades", "sin mensajes"), spinners de carga y mensajes de error legibles y en español.
  - Sin layouts rotos, textos cortados, overflow horizontal ni placeholders de desarrollo visibles.
  - Formularios: validación inline clara, labels correctos, feedback al guardar.
- [ ] 1.18 **Emails transaccionales**: registro/verificación de cuenta,
  recuperación de contraseña, invitación a contrato, OTP de VeriHome ID,
  notificaciones de match y mensajes. En localhost: setear
  `EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend` en `.env`
  (settings.py ya lo lee de env — cero cambios de código; Mailpit es opcional
  si se quiere ver el render HTML). Verificar: contenido correcto, links
  apuntando a `FRONTEND_URL`, sin placeholders.

**Método por módulo**:
1. Correr los specs Playwright existentes del módulo (`playwright.config.e2e-real.ts`).
2. Recorrido manual dirigido (Claude opera el browser) cubriendo el happy path + 2-3 caminos de error.
3. **Chequeo visual del módulo**: screenshot de cada pantalla en desktop y móvil; revisar layout, estados vacíos/carga/error y consistencia con el tema antes de marcar la casilla.
4. **Chequeo de roles del módulo**: repetir las acciones clave con cada rol que interactúa con ese módulo (no solo el rol principal).
5. Bug encontrado → arreglar → test que lo cubra → commit `fix(módulo): …`.
6. Marcar la casilla aquí con fecha.

**Criterio de salida**: las 18 casillas marcadas · 0 bugs conocidos abiertos · suite completa verde · screenshots de evidencia visual por módulo.

---

## FASE 2 — Hardening técnico (2-3 sesiones)

Lo que está "funcionando de milagro" se vuelve explícito y robusto.

- [ ] 2.1 **Pipeline de estáticos**: resolver la confusión `static/` vs `staticfiles/` vs `STATICFILES_DIRS` (tarea pendiente marcada el 11-jun). Documentar el flujo final en `docs/DEPLOYMENT.md`.
- [ ] 2.2 **Fallbacks silenciosos**: Redis/Channels/PG degradan sin alertar. En modo producción deben fallar ruidosamente o loguear ERROR + Sentry.
- [ ] 2.3 `python manage.py check --deploy` → resolver todos los warnings.
- [ ] 2.4 **Datos fake fuera**: perfil de admin@verihome.com sin datos reales, cédulas fake (12345678/99887766) en biometría, contratos de prueba. Crear seed limpio de producción.
- [ ] 2.5 **Limpieza de logs/secretos**: revisar que `.env` no esté trackeado, que no haya keys hardcodeadas (grep de secrets).
- [ ] 2.6 **Riesgo UUID compartido**: los 3 modelos de contrato comparten UUID sin constraint. `check_contract_sync` existe pero es **solo reporte** (el flag `--fix` no está implementado): integrar su modo `--json` como check de CI, y evaluar si vale implementar `--fix` o un constraint a nivel de modelo.
- [ ] 2.7 **Decisión liveness P0.4b**: con todo lo demás verde, decidir si el frontend Amplify de Face Liveness entra antes del go-live (recomendado: sí, es el diferenciador legal) o sale con disclosure.
- [ ] 2.8 **Pasada de seguridad dirigida** (1 sesión, usar `/security-review`):
  - Uploads: validación de tipo/tamaño de archivo (¿qué pasa si suben un .exe como cédula?), límites, almacenamiento.
  - Acceso horizontal: ¿puede el usuario A ver contratos/documentos/mensajes del usuario B cambiando el UUID en la URL? Probar en los endpoints sensibles.
  - Rate-limiting verificado funcionando (no solo configurado).
  - Tokens: expiración, refresh, invalidación al logout.
- [ ] 2.9 **Resiliencia ante terceros caídos**: simular fallo de Mapbox, AWS (Rekognition/Textract a mitad de biometría) y SMTP. El usuario debe ver un mensaje claro y poder reintentar — nunca pantalla blanca ni estado corrupto del contrato.
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

- [ ] 3.1 Construir `Dockerfile.prod` y levantar el compose completo local
  (PG + Redis + gunicorn:8000 + Daphne:8001 + Celery worker/beat + nginx,
  con `nginx/nginx.prod.conf` — la única config tras borrar la plantilla
  obsoleta en Fase 0). **Atención**: `Dockerfile.prod` solo construye el
  backend Python — validar explícitamente cómo llega el build de Vite al
  volumen `static` que sirve nginx (conecta con la confusión de estáticos
  de 2.1; el frontend tiene su propio `frontend/Dockerfile`).
- [ ] 3.2 **Instalación desde cero**: `migrate` contra una **BD virgen** (no
  una copia de la de dev — producción nacerá vacía y ese camino nunca se
  ha probado: migraciones que dependen de datos o de orden entre apps
  fallan justo aquí). Luego `collectstatic` + seed de producción real:
  `scripts/init_verihome.sh` (superuser + site domain) +
  `python manage.py seed_subscription_plans`. **El seed E2E
  (`seed_e2e_multiuser.py`) es SOLO de testing — jamás en producción.**
- [ ] 3.3 Smoke test E2E completo contra el stack prod-local (el viaje de la Fase 1 condensado: registro → propiedad → match → mensaje → contrato → biometría → PDF).
- [ ] 3.4 Verificar WebSockets vía Daphne/nginx, tareas Celery (emails,
  expiraciones, `check_admin_review_sla`, `check_biometric_expiration`) y el
  **backup automático diario** que Celery beat ya programa (`backup-database`
  en settings): el script usa `BACKUP_DIR=/backups` hardcodeado — confirmar
  que esa ruta existe en el contenedor y que el backup se genera de verdad.
- [ ] 3.5 Checklist de seguridad de `docs/DEPLOYMENT.md` aplicado al compose (DEBUG=False, cookies seguras, CORS, rate-limiting).
- [ ] 3.6 **Drill de backup/restore**: hacer backup contra el stack prod-local,
  destruir el contenedor de BD, restaurar con `scripts/restore_database.sh`
  y verificar que la app funciona con los datos restaurados. **Un backup
  nunca restaurado no es un backup.**
- [ ] 3.7 **Runbook de operación** (`docs/RUNBOOK.md`, 1 página): cómo ver
  logs de cada servicio, reiniciar servicios, restaurar backup, qué revisar
  si la app no responde. Para el dueño a las 11pm sin Claude en la sesión.

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

## Reglas de trabajo (anti-patrón "no cerrar")

1. Cada sesión termina con **commit + push**, sin excepción.
2. **No features nuevas** hasta Fase 4 completada.
3. Un bug encontrado se arregla **en la misma sesión** o se anota como casilla aquí — nunca queda "en la cabeza".
4. Este archivo se actualiza al final de cada sesión (marcar casillas con fecha). No se crean planes nuevos: se ejecuta este.
