#!/bin/bash
# =============================================================================
# VeriHome - Backup de Base de Datos PostgreSQL
# =============================================================================
# Uso: ./scripts/backup_db.sh
# Cron: 0 2 * * * /path/to/scripts/backup_db.sh >> /var/log/verihome-backup.log 2>&1

set -e

# Configuracion
BACKUP_DIR="${BACKUP_DIR:-/backups/verihome}"
DB_NAME="${DATABASE_NAME:-verihome_prod}"
DB_USER="${DATABASE_USER:-verihome_user}"
DB_HOST="${DATABASE_HOST:-db}"
DB_PORT="${DATABASE_PORT:-5432}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "=========================================="
echo "  VeriHome - Database Backup"
echo "  $(date)"
echo "=========================================="

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

# Ejecutar backup
echo "[1/3] Creando backup de ${DB_NAME}..."
if command -v docker &> /dev/null; then
    # Si estamos fuera del container, usar docker exec
    docker exec verihome_db_prod pg_dump \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --format=plain \
        --no-owner \
        --no-privileges \
        | gzip > "$BACKUP_FILE"
else
    # Si estamos dentro del container
    PGPASSWORD="$DATABASE_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --format=plain \
        --no-owner \
        --no-privileges \
        | gzip > "$BACKUP_FILE"
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "  Backup creado: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Limpiar backups antiguos
echo "[2/3] Limpiando backups con mas de ${RETENTION_DAYS} dias..."
DELETED=$(find "$BACKUP_DIR" -name "*.sql.gz" -mtime +"$RETENTION_DAYS" -delete -print | wc -l)
echo "  ${DELETED} backups antiguos eliminados."

# Verificar integridad
echo "[3/3] Verificando integridad del backup..."
if gzip -t "$BACKUP_FILE" 2>/dev/null; then
    echo "  Backup verificado correctamente."
else
    echo "  ERROR: Backup corrupto!"
    exit 1
fi

echo "=========================================="
echo "  Backup completado exitosamente"
echo "  Archivo: ${BACKUP_FILE}"
echo "  Tamano: ${BACKUP_SIZE}"
echo "=========================================="
