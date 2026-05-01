#!/usr/bin/env bash
# Reset total para pruebas manuales:
#   - detiene servidores en screen
#   - backup + borra db.sqlite3, media uploads, e2e-logs, playwright artifacts
#   - migrate desde cero
#   - crea superuser Django (wilson@verihome.com / WilsonAdmin2026!)
#   - corre seed full_ecosystem
#   - reinicia backend con VERIHOME_ID_ENFORCEMENT=True y frontend Vite
#
# Uso: bash scripts/testing/clean_slate.sh [--keep-db]

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

KEEP_DB=0
for arg in "$@"; do
  case "$arg" in
    --keep-db) KEEP_DB=1 ;;
  esac
done

echo "[clean-slate] Working dir: $PROJECT_ROOT"

echo "[clean-slate] 1/8 · deteniendo screens vh-backend* y vh-frontend"
for s in vh-backend vh-backend2 vh-frontend; do
  if screen -ls | grep -q "$s"; then
    screen -X -S "$s" quit || true
    echo "  · stopped $s"
  fi
done
sleep 2

# DB real: /scripts/database/db.sqlite3 (settings la define ahí)
DB_PATH="$PROJECT_ROOT/scripts/database/db.sqlite3"
if [[ "$KEEP_DB" == "0" ]]; then
  if [[ -f "$DB_PATH" ]]; then
    BACKUP="${DB_PATH}.bak.$(date +%Y%m%d_%H%M%S)"
    echo "[clean-slate] 2/8 · backup → $BACKUP"
    cp "$DB_PATH" "$BACKUP"
    rm -f "$DB_PATH"
  fi
  # Limpia también el legacy huérfano si existiera
  rm -f "$PROJECT_ROOT/db.sqlite3" 2>/dev/null || true
else
  echo "[clean-slate] 2/8 · --keep-db: dejando db.sqlite3 intacta"
fi

echo "[clean-slate] 3/8 · limpiando uploads y artefactos de tests"
rm -rf \
  "$PROJECT_ROOT/media/avatars" \
  "$PROJECT_ROOT/media/biometric" \
  "$PROJECT_ROOT/media/profiles" \
  "$PROJECT_ROOT/media/properties" \
  "$PROJECT_ROOT/media/tenant_documents" \
  "$PROJECT_ROOT/media/verihome_id" \
  "$PROJECT_ROOT/e2e-logs" \
  "$PROJECT_ROOT/frontend/e2e-logs" \
  "$PROJECT_ROOT/frontend/playwright-report" \
  "$PROJECT_ROOT/frontend/playwright-report-e2e-real" \
  "$PROJECT_ROOT/frontend/playwright-artifacts-e2e-real" \
  "$PROJECT_ROOT/screenlog.0" \
  "$PROJECT_ROOT/frontend/screenlog.0" 2>/dev/null || true

echo "[clean-slate] 4/8 · activando venv"
# shellcheck disable=SC1091
source "$PROJECT_ROOT/venv_ubuntu/bin/activate"

echo "[clean-slate] 5/8 · migrate"
python manage.py migrate --no-input 2>&1 | tail -5

echo "[clean-slate] 6/8 · superuser Django (wilson@verihome.com / WilsonAdmin2026!)"
python manage.py shell -c "
from django.contrib.auth import get_user_model
U = get_user_model()
u, created = U.objects.get_or_create(
    email='wilson@verihome.com',
    defaults={'first_name': 'Wilson', 'last_name': 'Admin', 'user_type': 'landlord'},
)
u.is_staff = True
u.is_superuser = True
u.is_verified = True
u.is_active = True
u.set_password('WilsonAdmin2026!')
u.save()
try:
    from allauth.account.models import EmailAddress
    EmailAddress.objects.update_or_create(
        user=u, email=u.email, defaults={'primary': True, 'verified': True},
    )
except Exception as e:
    print(f'warn allauth: {e}')
print(f'superuser ready: {u.email} (created={created})')
" 2>&1 | tail -3

echo "[clean-slate] 7/8 · seed full_ecosystem"
python scripts/testing/seed_e2e_multiuser.py full_ecosystem 2>&1 | grep -v "^\[INFO" | tail -40

echo "[clean-slate] 8/8 · arrancando servers en screen"
screen -dmS vh-backend bash -lc "cd '$PROJECT_ROOT' && source venv_ubuntu/bin/activate && export VERIHOME_ID_ENFORCEMENT=True && python manage.py runserver 0.0.0.0:8000"
screen -dmS vh-frontend bash -lc "cd '$PROJECT_ROOT/frontend' && npm run dev -- --port 5174"

echo ""
echo "[clean-slate] DONE. Servers arrancando — backend tarda ~60-90s en estar listo."
echo "  · backend: http://localhost:8000/  (Django admin: /admin/)"
echo "  · frontend: http://localhost:5174/"
echo ""
echo "  Verificar con: curl -s http://localhost:8000/api/v1/ -o /dev/null -w '%{http_code}\\n'"
