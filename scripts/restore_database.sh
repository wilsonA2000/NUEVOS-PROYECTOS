#!/bin/bash
# =============================================================================
# VERIHOME - SCRIPT DE RESTAURACIÓN DE BASE DE DATOS POSTGRESQL
# =============================================================================

set -e

# Configuración
BACKUP_DIR="/backups"

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_message() {
    echo -e "${GREEN}[Restore]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[Warning]${NC} $1"
}

print_error() {
    echo -e "${RED}[Error]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[Info]${NC} $1"
}

# Verificar argumentos
if [ $# -eq 0 ]; then
    print_error "Uso: $0 <archivo_backup.sql.gz>"
    print_info "Backups disponibles:"
    ls -lh $BACKUP_DIR/verihome_backup_*.sql.gz 2>/dev/null || print_warning "No hay backups disponibles"
    exit 1
fi

BACKUP_FILE=$1

# Verificar que el archivo existe
if [ ! -f "$BACKUP_FILE" ] && [ ! -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    print_error "Archivo de backup no encontrado: $BACKUP_FILE"
    exit 1
fi

# Si no se proporcionó ruta completa, buscar en directorio de backups
if [ ! -f "$BACKUP_FILE" ]; then
    BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
fi

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

print_warning "⚠️  ADVERTENCIA: Esta operación restaurará la base de datos VeriHome"
print_warning "⚠️  Se perderán todos los datos actuales"
print_info "Base de datos: $DB_NAME"
print_info "Host: $DB_HOST:$DB_PORT"
print_info "Archivo backup: $BACKUP_FILE"
print_info ""
read -p "¿Estás seguro de que quieres continuar? (escriba 'SI' para confirmar): " CONFIRM

if [ "$CONFIRM" != "SI" ]; then
    print_info "Operación cancelada"
    exit 0
fi

# Verificar conexión a la base de datos
if ! PGPASSWORD=$DB_PASSWORD pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER; then
    print_error "No se puede conectar al servidor PostgreSQL"
    exit 1
fi

print_message "Iniciando restauración de la base de datos..."

# Crear base de datos temporal para la restauración
TEMP_DB="${DB_NAME}_restore_$(date +%s)"

print_message "Creando base de datos temporal: $TEMP_DB"
PGPASSWORD=$DB_PASSWORD createdb \
    --host=$DB_HOST \
    --port=$DB_PORT \
    --username=$DB_USER \
    --template=template0 \
    --encoding=UTF8 \
    $TEMP_DB

# Descomprimir y restaurar
print_message "Restaurando desde backup: $(basename $BACKUP_FILE)"

if [[ $BACKUP_FILE == *.gz ]]; then
    # Archivo comprimido
    gunzip -c $BACKUP_FILE | PGPASSWORD=$DB_PASSWORD pg_restore \
        --host=$DB_HOST \
        --port=$DB_PORT \
        --username=$DB_USER \
        --dbname=$TEMP_DB \
        --verbose \
        --clean \
        --if-exists \
        --no-owner \
        --no-privileges
else
    # Archivo sin comprimir
    PGPASSWORD=$DB_PASSWORD pg_restore \
        --host=$DB_HOST \
        --port=$DB_PORT \
        --username=$DB_USER \
        --dbname=$TEMP_DB \
        --verbose \
        --clean \
        --if-exists \
        --no-owner \
        --no-privileges \
        $BACKUP_FILE
fi

if [ $? -eq 0 ]; then
    print_message "Backup restaurado exitosamente en base temporal"
    
    # Verificar la integridad de los datos restaurados
    print_message "Verificando integridad de datos..."
    TABLE_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $TEMP_DB -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
    print_info "Tablas restauradas: $(echo $TABLE_COUNT | xargs)"
    
    if [ "$(echo $TABLE_COUNT | xargs)" -gt 0 ]; then
        # Renombrar bases de datos
        print_message "Intercambiando bases de datos..."
        
        # Terminar conexiones activas a la base de datos original
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();
        "
        
        # Renombrar la base original
        OLD_DB="${DB_NAME}_old_$(date +%s)"
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "ALTER DATABASE $DB_NAME RENAME TO $OLD_DB;"
        
        # Renombrar la base temporal a la original
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "ALTER DATABASE $TEMP_DB RENAME TO $DB_NAME;"
        
        print_message "✅ Restauración completada exitosamente!"
        print_info "Base de datos original respaldada como: $OLD_DB"
        print_warning "Recuerda eliminar la base de datos antigua cuando confirmes que todo funciona correctamente:"
        print_warning "  dropdb -h $DB_HOST -p $DB_PORT -U $DB_USER $OLD_DB"
        
    else
        print_error "La base de datos restaurada parece estar vacía"
        PGPASSWORD=$DB_PASSWORD dropdb -h $DB_HOST -p $DB_PORT -U $DB_USER $TEMP_DB
        exit 1
    fi
    
else
    print_error "Error durante la restauración"
    print_info "Limpiando base de datos temporal..."
    PGPASSWORD=$DB_PASSWORD dropdb -h $DB_HOST -p $DB_PORT -U $DB_USER $TEMP_DB
    exit 1
fi