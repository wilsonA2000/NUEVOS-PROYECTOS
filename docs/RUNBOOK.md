# RUNBOOK — Operación de VeriHome en producción

Guía de 1 página para el dueño (o quien opere) cuando algo falla y
Claude no está en la sesión. Asume el stack de `docker-compose.prod.yml`
(PostgreSQL + Redis + gunicorn:8000 + Daphne:8001 + Celery worker/beat +
nginx).

---

## Arranque / parada

```bash
docker compose -f docker-compose.prod.yml up -d        # arrancar todo
docker compose -f docker-compose.prod.yml ps           # estado de servicios
docker compose -f docker-compose.prod.yml down         # parar todo
docker compose -f docker-compose.prod.yml restart backend   # reiniciar 1 servicio
```

## Ver logs

```bash
docker compose -f docker-compose.prod.yml logs -f backend      # API gunicorn
docker compose -f docker-compose.prod.yml logs -f daphne       # WebSocket
docker compose -f docker-compose.prod.yml logs -f celery_worker
docker compose -f docker-compose.prod.yml logs --tail=100 nginx
```

## "La app no responde" — checklist en orden

1. `docker compose -f docker-compose.prod.yml ps` → ¿algún servicio en `Exit`/`unhealthy`?
2. Logs del servicio caído (arriba). Causas frecuentes:
   - **backend no arranca**: BD mal configurada → con DEBUG=False el
     settings lanza `RuntimeError` a propósito (no degrada a SQLite).
     Revisar variables `DATABASE_*` del `.env`.
   - **502 de nginx**: gunicorn/daphne aún arrancando o caídos. Esperar
     el healthcheck o reiniciar el backend.
   - **WebSocket no conecta**: revisar daphne + que Redis esté arriba
     (channel layer). `docker compose ... logs redis`.
3. Health endpoint: `curl https://TU_DOMINIO/api/v1/core/health/` (deep
   check de BD/cache/canales).
4. Sentry: revisar el dashboard si `SENTRY_DSN` está configurado — el
   error ya está ahí con traceback.

## Tareas de mantenimiento

```bash
# Entrar a un shell de Django dentro del contenedor
docker compose -f docker-compose.prod.yml exec backend python manage.py shell

# Migraciones (normalmente las corre el entrypoint al arrancar)
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate

# Verificar integridad Contract ↔ LCC (sale 1 si hay huérfanos)
docker compose -f docker-compose.prod.yml exec backend python manage.py check_contract_sync

# Reconstruir estáticos (ORDEN: collectstatic primero, build después)
docker compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
```

## Backups

El Celery beat genera un backup **diario** automático (`backup-database`
en `CELERY_BEAT_SCHEDULE`) en `BACKUP_DIR=/backups` dentro del contenedor.

```bash
# Backup manual inmediato
docker compose -f docker-compose.prod.yml exec backend bash scripts/backup_database.sh

# Restaurar (restaura en BD temporal y hace swap seguro)
docker compose -f docker-compose.prod.yml exec backend bash scripts/restore_database.sh <archivo.sql.gz>
```

**Probar el restore al menos una vez** (Fase 3.6) — un backup nunca
restaurado no es un backup. El script `restore_database.sh` restaura en
una BD temporal `${DB}_restore_<ts>` y solo hace swap si la verificación
de tablas pasa, así que es seguro de ensayar.

## Rollback de un deploy

```bash
git tag pre-deploy-$(date +%Y%m%d)      # ANTES de cada deploy
# si el deploy falla:
git checkout <tag-anterior>
docker compose -f docker-compose.prod.yml up -d --build
```

No apurar `migrate` en reverso. Las migraciones schema-only de Fase 1.9
son reversibles si la tabla es nueva; las de datos (backfill) son no-ops
en reverso.

## Contactos / recursos

- Documentación de despliegue: `docs/DEPLOYMENT.md`
- Arquitectura: `docs/ARCHITECTURE.md`, `docs/SYSTEMS.md`
- Plan de producción y deuda técnica: `PLAN_PRODUCCION.md`
