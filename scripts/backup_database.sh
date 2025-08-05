#!/bin/bash
# =============================================================================
# VERIHOME - SCRIPT DE BACKUP DE BASE DE DATOS POSTGRESQL
# =============================================================================

set -e

# Configuración
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="verihome_backup_${DATE}.sql"
COMPRESSED_FILE="verihome_backup_${DATE}.sql.gz"

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_message() {
    echo -e "${GREEN}[Backup]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[Warning]${NC} $1"
}

print_error() {
    echo -e "${RED}[Error]${NC} $1"
}

# Cargar variables de entorno
if [ -f ".env" ]; then
    export $(cat .env | grep -v ^# | xargs)
fi

# Configuración de la base de datos
DB_NAME=${DATABASE_NAME:-verihome}
DB_USER=${DATABASE_USER:-postgres}
DB_PASSWORD=${DATABASE_PASSWORD:-postgres}
DB_HOST=${DATABASE_HOST:-localhost}
DB_PORT=${DATABASE_PORT:-5432}

# Crear directorio de backup si no existe
mkdir -p $BACKUP_DIR

print_message "Iniciando backup de la base de datos VeriHome..."
print_message "Base de datos: $DB_NAME"
print_message "Host: $DB_HOST:$DB_PORT"
print_message "Usuario: $DB_USER"

# Verificar conexión a la base de datos
if ! PGPASSWORD=$DB_PASSWORD pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME; then
    print_error "No se puede conectar a la base de datos"
    exit 1
fi

# Crear backup
print_message "Creando backup: $BACKUP_FILE"

PGPASSWORD=$DB_PASSWORD pg_dump \
    --host=$DB_HOST \
    --port=$DB_PORT \
    --username=$DB_USER \
    --format=custom \
    --verbose \
    --file=$BACKUP_DIR/$BACKUP_FILE \
    --exclude-table-data=django_session \
    --exclude-table-data=core_auditlog \
    $DB_NAME

if [ $? -eq 0 ]; then
    print_message "Backup creado exitosamente"
    
    # Comprimir backup
    print_message "Comprimiendo backup..."
    gzip $BACKUP_DIR/$BACKUP_FILE
    
    # Mostrar información del backup
    BACKUP_SIZE=$(du -h $BACKUP_DIR/$COMPRESSED_FILE | cut -f1)
    print_message "Backup comprimido: $COMPRESSED_FILE ($BACKUP_SIZE)"
    
    # Limpiar backups antiguos (mantener últimos 7 días)
    print_message "Limpiando backups antiguos..."
    find $BACKUP_DIR -name "verihome_backup_*.sql.gz" -mtime +7 -delete
    
    # Mostrar backups disponibles
    print_message "Backups disponibles:"
    ls -lh $BACKUP_DIR/verihome_backup_*.sql.gz 2>/dev/null || print_warning "No hay backups previos"
    
    print_message "✅ Backup completado exitosamente!"
else
    print_error "Error al crear el backup"
    exit 1
fi