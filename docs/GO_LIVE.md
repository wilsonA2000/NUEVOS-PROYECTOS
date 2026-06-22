# GO-LIVE — Checklist de lanzamiento de VeriHome

Guía ordenada para llevar VeriHome a producción. Asume el stack
`docker-compose.prod.yml` (PostgreSQL + Redis + gunicorn + Daphne + Celery
worker/beat + nginx). Complementa a `docs/DEPLOYMENT.md` y `docs/RUNBOOK.md`.

> Estado a 2026-06-20: la app está **lista técnicamente**. Lo que falta es
> infraestructura (hosting/dominio/SSL/SMTP) y decisiones del dueño. Todo lo
> de código está verde: backend 1013 tests, frontend 813 Jest.

---

## 0. Pre-requisitos (compras / cuentas del dueño)

- [ ] **Servidor** (VPS con ≥ 4 GB RAM, 2 vCPU, ≥ 40 GB disco; la imagen pesa
      ~3 GB y dlib compila en build). Ubuntu 22.04/24.04.
- [ ] **Dominio** (ej. `verihome.com`) + acceso al DNS.
- [ ] **Correo SMTP de producción** (Gmail App Password, SendGrid, SES…).
- [ ] **Sentry** (opcional pero recomendado) → `SENTRY_DSN`.
- [ ] **Mapbox** token de producción.
- [ ] **Pasarela de pago** real (Wompi / Stripe / Bold) si se cobra desde el día 1.

## 1. Decisiones del dueño (antes del go-live)

- [ ] **2.10 Textos legales** (abogado): redactar `TermsPage.tsx` y
      `PrivacyPage.tsx` definitivos y afinar el texto de consentimiento
      biométrico (Ley 1581) que ya está como gate en el flujo.
- [ ] **D38** liveness anti-deepfake: ¿entra antes del go-live o post-MVP?
- [ ] **D32** user-enumeration en login: ¿se mantiene por UX (mitigado por
      registro-por-invitación) o se unifica el mensaje?

## 2. Provisionar el servidor

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git
sudo usermod -aG docker $USER   # reabrir sesión
git clone <repo> verihome && cd verihome
```

## 3. Crear `.env.prod` (NUNCA commitear)

```bash
cp .env.prod.example .env.prod
# Editar TODOS los CAMBIAR_*. Mínimo obligatorio:
#  SECRET_KEY (50+ chars aleatorios)   ALLOWED_HOSTS=verihome.com,www...
#  DATABASE_PASSWORD  REDIS_PASSWORD   (fuertes, únicos)
#  EMAIL_HOST_USER / EMAIL_HOST_PASSWORD (SMTP real)
#  FRONTEND_URL=https://app.verihome.com   (link de confirmación de registro)
#  DJANGO_SUPERUSER_EMAIL / _PASSWORD
#  SENTRY_DSN, MAPBOX_ACCESS_TOKEN, claves de pago según corresponda
#  LAWYER_FULL_NAME / _CC / _TP_NUMBER / _EMAIL (firmante del contrato)
#  BIOMETRIC_FACIAL_PROVIDER=local  BIOMETRIC_DOCUMENT_PROVIDER=local
#    (verificación de identidad REAL: match facial + OCR de cédula server-side.
#     El binario tesseract-ocr+spa ya viene en la imagen — sin paso manual.)
```

`.env.prod` y `.env.localprod` están en `.gitignore`. Verificar que el
`.env.prod.example` cubre TODAS las variables (auditado 2026-06-22: completo,
incluye proveedores biométricos `local`). Config del compose prod validada
(`docker compose -f docker-compose.prod.yml config` → OK).

## 4. DNS

- [ ] `A` record del dominio → IP del servidor (apex + `www` + `app` si aplica).
- [ ] Esperar propagación (`dig verihome.com`).

## 5. SSL/TLS (certificado real)

El `nginx/nginx.prod.conf` espera certs en `nginx/ssl/`. Opciones:

```bash
# Opción A: certbot (Let's Encrypt) en el host, montar los certs
sudo apt install -y certbot
sudo certbot certonly --standalone -d verihome.com -d www.verihome.com
# copiar/symlink fullchain.pem y privkey.pem a ./nginx/ssl/
```

- [ ] Certs en `nginx/ssl/`.
- [ ] Programar renovación (`certbot renew` en cron) + reload de nginx.

## 6. Deploy

```bash
git tag pre-deploy-$(date +%Y%m%d)   # punto de rollback
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f docker-compose.prod.yml ps   # todo "Up"/"healthy"
```

El `docker-entrypoint.sh` corre migraciones + collectstatic + crea superuser +
`EmailAddress` verificado. Solo el backend migra (los demás esperan).

## 7. Seed inicial

```bash
docker compose -f docker-compose.prod.yml exec backend bash scripts/init_verihome.sh
# crea planes de suscripción + códigos de entrevista iniciales (sin datos fake)
```

## 8. Verificación post-deploy (smoke)

> ⚠️ **CRÍTICO — verificar el build EN NAVEGADOR, no solo que compile.**
> Un `npm run build` exitoso y los tests Jest NO garantizan que el bundle
> corra: un chunking mal configurado puede dar pantalla en blanco (pasó:
> dependencias circulares entre chunks, arreglado en vite.config). Cargar la
> URL en un navegador real y confirmar que la app monta es OBLIGATORIO.
> Hay un smoke headless reutilizable: `node frontend/scripts/smoke-screenshots.mjs`
> (ajusta `BASE_URL`), que captura login + dashboard y reporta errores de consola.


- [ ] `curl https://verihome.com/api/v1/core/health/` → 200 `healthy`.
- [ ] Login admin → 200.
- [ ] Registro de prueba → 201 y **llega el email** de confirmación (SMTP real).
- [ ] WebSocket conecta (101) tras login.
- [ ] Provider facial = `local` (`LocalFacialProvider`).
- [ ] `check_contract_sync` sin huérfanos.
- [ ] `check --deploy` sin warnings de seguridad **con SSL on** (ver §10).

## 9. Backups

- [ ] Confirmar el volumen `backup_volume` montado y el beat agendando
      `backup-database` (diario 3 AM).
- [ ] **Drill**: correr `scripts/backup_database.sh` y luego
      `scripts/restore_database.sh <archivo>` una vez (un backup sin restaurar
      no es backup). Ver `docs/RUNBOOK.md`.

## 10. Notas de seguridad (revisado 2026-06-20)

- ✅ Sin secretos hardcodeados en código trackeado (solo passwords de tests).
- ✅ `.env*` reales no trackeados; `.gitignore` cubre `.env.prod`/`.env.localprod`.
- ✅ `compose.prod` fuerza `DEBUG=False`; solo nginx expone puertos (80/443);
      Postgres/Redis sin puertos al host; todos los servicios vía `env_file`.
- ✅ Rate-limit de login (10/min). Registro por invitación (códigos).
- ✅ Cookies/SSL/HSTS seguros en prod (env-driven, defaults True). En el
      ensayo local salen "off" **a propósito** (corre sobre HTTP en localhost).
- ℹ️ `X_FRAME_OPTIONS=SAMEORIGIN` (no `DENY`): **intencional** — la app embebe
      su propio contenido en iframes (preview de PDF, video, documentos).
      Sigue bloqueando clickjacking cross-origin. `check --deploy` marca W019
      como falso positivo para este caso.
- 🔁 Pendiente operativo D5: rotar `GITHUB_TOKEN` y password Gmail del `.env`
      LOCAL antes de compartir la máquina; el `.env.prod` es nuevo.

## 11. Rollback

```bash
git checkout <tag-anterior>
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```
Ver `docs/RUNBOOK.md` para detalle de rollback y purga de tareas beat viejas.

---

## Deuda técnica conocida (no bloquea go-live)

- **D27** (🟡 riesgoso): máquina de estados dual de contrato — consolidar con
  cuidado post-launch (no tocar aislado).
- **D31** + ~1825 warnings de lint frontend → Fase 5 (calidad, no runtime).
