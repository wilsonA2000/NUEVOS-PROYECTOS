-- =============================================================================
-- VERIHOME - INICIALIZACIÓN DE BASE DE DATOS POSTGRESQL  
-- Enhanced for migration from SQLite with advanced features
-- =============================================================================

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "btree_gin";      -- Advanced indexing
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- Text similarity search
CREATE EXTENSION IF NOT EXISTS "unaccent";       -- Text normalization
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- Query statistics

-- Configurar timezone para Colombia
SET TIME ZONE 'America/Bogota';

-- Crear esquemas adicionales para organización
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS cache;

-- Configuraciones de rendimiento para PostgreSQL
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET track_activity_query_size = 2048;
ALTER SYSTEM SET pg_stat_statements.track = 'all';

-- Configuraciones de logging
ALTER SYSTEM SET log_statement = 'mod';
ALTER SYSTEM SET log_min_duration_statement = 1000;
ALTER SYSTEM SET log_line_prefix = '%m [%p] %q%u@%d ';

-- Configuraciones de conexión
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';

-- Configuraciones para mejor rendimiento con Django
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;

-- Aplicar configuraciones
SELECT pg_reload_conf();

-- Mensaje de confirmación
SELECT 'VeriHome Database initialized successfully!' as message;