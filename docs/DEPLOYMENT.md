# Deployment — VeriHome

Guía mínima para producción. Para dev commands ver `CLAUDE.md`.

---

## Variables de entorno

### Backend (`.env` en raíz)

```bash
# Django
SECRET_KEY=<secret>
DEBUG=False
ALLOWED_HOSTS=tudominio.com,api.tudominio.com

# Base de datos
DATABASE_URL=postgresql://user:pass@host:5432/verihome

# Redis
REDIS_URL=redis://host:6379

# Email
EMAIL_HOST_USER=<email>
EMAIL_HOST_PASSWORD=<app-password>

# Frontend URL (para generar links en emails)
FRONTEND_URL=https://tudominio.com
```

### Frontend (`frontend/.env`)

```bash
VITE_API_URL=https://api.tudominio.com/api/v1
VITE_MAPBOX_TOKEN=<token>
VITE_DEFAULT_COUNTRY=CO
VITE_DEFAULT_LAT=4.5709
VITE_DEFAULT_LNG=-74.2973
VITE_DEFAULT_ZOOM=6
```

---

## Comandos de deploy

### Static files

```bash
python manage.py collectstatic --noinput
# Frontend builds a: static/frontend/
cd frontend && npm run build
```

### ASGI con Daphne (WebSocket)

```bash
daphne -b 0.0.0.0 -p 8001 verihome.asgi:application
```

### Celery worker + beat

```bash
celery -A verihome worker -l info
celery -A verihome beat -l info
```

---

## Checklist de seguridad producción

- [ ] `DEBUG=False`.
- [ ] `ALLOWED_HOSTS` configurado.
- [ ] HTTPS forzado: `SECURE_SSL_REDIRECT=True`.
- [ ] Cookies seguras (`SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`).
- [ ] CORS sólo a orígenes conocidos (`CORS_ALLOWED_ORIGINS`).
- [ ] Sentry habilitado (opcional, recomendado).
- [ ] Rate-limiting activo (middleware de `core/middleware.py`).
- [ ] Backup automático de la BD.
- [ ] Certificados SSL renovados (Let's Encrypt recomendado).
- [ ] Logs rotados (logrotate o equivalente).
- [ ] Webhooks de pasarelas (Stripe / Wompi / Bold / PSE) configurados
  con secret verificado.
- [ ] Firma DIAN XAdES habilitada (cuando esté lista).

---

## Pruebas finales antes de release

```bash
# Backend
python manage.py test                    # suite completa
python manage.py check --deploy          # validaciones Django

# Frontend
cd frontend
npx tsc --noEmit                          # type check
npm run lint                              # ESLint
npm test                                  # Jest
npx playwright test --config=playwright.config.e2e-real.ts
```

---

## Rollback

1. Tag la versión previa antes de cada deploy (`git tag pre-deploy-YYYYMMDD`).
2. En caso de fallo mantener deploy anterior, no apurar migrate back.
3. Migraciones schema-only (Fase 1.9.3, 1.9.5, 1.9.6) son reversibles
   si la tabla es nueva. Las de datos (1.9.2 backfill) son no-ops en
   reverso — el JSONField legacy permanece intocado.
