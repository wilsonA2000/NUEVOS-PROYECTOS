# Proxima sesion · Pruebas manuales E2E + deploy

## Estado al cerrar 2026-04-16 (auditoria profunda completada)

- Branch: `main` sincronizado con `origin/main`
- Ultimo commit: `f01b721`
- **15 bugs corregidos** en auditoria profunda 2026-04-16 (7 commits)
- **49 bugs total** acumulados en las dos auditorias (34 + 15)
- **0 bugs P0/P1 pendientes**

### Backend
- 711 tests verde (subio de 664) · 0 fails · 3 skipped
- E2E triple firma biometrica: verde
- 5 apps auditadas profundamente: core, requests, messaging, ratings, users
- requests app: primera cobertura (25 tests nuevos)
- `users/admin_views.py` legacy ELIMINADO (449 lineas codigo muerto)

### Frontend
- tsc --noEmit: 0 errores
- 287 tests services/lib verde
- 53 tests ratings/messaging verde
- Bugs estaticos arreglados en ReviewsList, RatingForm, messageService,
  ThreadDetail, lib/api

## FASES completadas (1-6)

| FASE | Resultado | Bugs |
|------|-----------|------|
| 1 | ContactRateThrottle desactivado en testing | CORE-01 |
| 2 | requests audit + 25 tests primera cobertura | REQ-01, REQ-02 |
| 3 | messaging audit + 8 tests regresion | MSG-01, MSG-02, MSG-03 |
| 4 | ratings audit + 4 tests regresion | RAT-01, RAT-02 |
| 5 | users audit + admin_views muerto eliminado | USR-01, USR-02 |
| 6 | frontend: ratings/messaging/lib URL fixes | FE-RAT-01/02/03, FE-MSG-04/05, FE-LIB-01, FE-RAT-05 |

### Patron descubierto
**`self.getattr(request, ...)` siempre fue bug copy-paste**. Lo encontre en
3 lugares (messaging, ratings, users-search). En memoria como
`feedback_getattr_antipattern.md` para sesiones futuras.

## Pendiente para PROXIMA SESION

### Pruebas manuales (orden recomendado)
1. **Property image upload + gallery** (drag&drop, compresion)
2. **Payments** (Stripe + Wompi/PSE + Nequi en sandbox)
3. **Ratings/reviews UI completa** (ahora que ReviewsList apunta a URL correcta)
4. **Service provider subscriptions** (3 planes)
5. **Maintenance requests** workflow tenant→provider
6. **DIAN electronic invoicing** (XML UBL 2.1)
7. **Admin verification dashboard** (agentes, visitas, reportes)
8. **Admin tickets dashboard** (departamentos, asignacion, respuesta)
9. **Verification agents module**
10. **Audit trail / SLA dashboard**

### Tareas tecnicas pendientes (bajo riesgo)
- VIS-5: ~50% archivos con hex hardcoded sin migrar a tokens (cosmetico)
- NAV-01: revisar navegacion legacy (si aun aplica)
- Integrar specs E2E al pipeline CI como regresion permanente

### Despliegue
- Configurar dominio + SSL
- Variables de entorno produccion (DEBUG=False, SECURE_SSL_REDIRECT=True)
- PostgreSQL + Redis productivos
- Daphne + Celery workers
- Sentry monitoring (opcional)

## Como arrancar rapido proxima sesion

```bash
# 1. Posicionarte
cd "/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS"
git status  # debe decir "On branch main, up to date"

# 2. Confirmar tests base
source venv_ubuntu/bin/activate
python manage.py test 2>&1 | tail -3
# Esperado: Ran 711 tests, OK (skipped=3)

# 3. Arrancar servidores si no estan corriendo
screen -list  # ver si django/vite ya estan
screen -dmS django bash -c "source venv_ubuntu/bin/activate && python manage.py runserver 0.0.0.0:8000"
cd frontend && screen -dmS vite bash -c "npm run dev" && cd ..

# 4. Empezar pruebas manuales segun lista arriba
```
