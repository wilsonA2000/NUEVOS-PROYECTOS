"""
Comando de Django para optimizar la base de datos.
Aplica índices, vacuum, analyze y otras optimizaciones.
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from core.database_optimization import DatabaseOptimizer
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        "Optimiza la base de datos con índices, vacuum y otras mejoras de rendimiento"
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--create-indexes",
            action="store_true",
            help="Crear índices de rendimiento optimizados",
        )

        parser.add_argument(
            "--vacuum",
            action="store_true",
            help="Ejecutar VACUUM y ANALYZE para limpiar y optimizar",
        )

        parser.add_argument(
            "--stats",
            action="store_true",
            help="Mostrar estadísticas detalladas de la base de datos",
        )

        parser.add_argument(
            "--connection-settings",
            action="store_true",
            help="Aplicar configuraciones optimizadas de conexión",
        )

        parser.add_argument(
            "--analyze-query",
            type=str,
            help="Analizar el rendimiento de una query específica",
        )

        parser.add_argument(
            "--all",
            action="store_true",
            help="Ejecutar todas las optimizaciones (recomendado)",
        )

        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Mostrar qué se haría sin ejecutar cambios",
        )

        parser.add_argument(
            "--verbose",
            action="store_true",
            help="Mostrar información detallada del proceso",
        )

    def handle(self, *args, **options):
        self.verbose = options["verbose"]
        self.dry_run = options["dry_run"]

        if self.dry_run:
            self.stdout.write(
                self.style.WARNING("MODO DRY-RUN: No se ejecutarán cambios reales")
            )

        optimizer = DatabaseOptimizer()

        try:
            # Verificar conexión a la base de datos
            self._check_database_connection()

            if options["create_indexes"] or options["all"]:
                self._create_performance_indexes(optimizer)

            if options["connection_settings"] or options["all"]:
                self._optimize_connection_settings(optimizer)

            if options["vacuum"] or options["all"]:
                self._vacuum_and_analyze(optimizer)

            if options["stats"] or options["all"]:
                self._show_database_stats(optimizer)

            if options["analyze_query"]:
                self._analyze_specific_query(optimizer, options["analyze_query"])

            if not any(
                [
                    options["create_indexes"],
                    options["vacuum"],
                    options["stats"],
                    options["connection_settings"],
                    options["analyze_query"],
                    options["all"],
                ]
            ):
                self.stdout.write(
                    self.style.WARNING(
                        "No se especificaron acciones. Use --help para ver las opciones disponibles.\n"
                        "Recomendación: use --all para aplicar todas las optimizaciones."
                    )
                )
                return

            self.stdout.write(
                self.style.SUCCESS(
                    "\n✅ Optimización de base de datos completada exitosamente!"
                )
            )

        except Exception as e:
            logger.error(f"Error durante la optimización: {e}")
            raise CommandError(f"Error durante la optimización: {e}")

    def _check_database_connection(self):
        """Verificar que la conexión a la base de datos funcione."""
        self._log_info("🔍 Verificando conexión a la base de datos...")

        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
                if result[0] == 1:
                    self._log_success("✅ Conexión a la base de datos exitosa")
                else:
                    raise CommandError("La conexión a la base de datos falló")
        except Exception as e:
            raise CommandError(f"Error de conexión a la base de datos: {e}")

    def _create_performance_indexes(self, optimizer):
        """Crear índices de rendimiento."""
        self._log_info("📊 Creando índices de rendimiento...")

        if self.dry_run:
            self.stdout.write("  [DRY-RUN] Se crearían los siguientes índices:")
            indexes = [
                "idx_user_email_active (users_user)",
                "idx_property_type_status (properties_property)",
                "idx_property_location (properties_property)",
                "idx_contract_property_status (contracts_contract)",
                "idx_message_conversation_created (messaging_message)",
                "... y otros índices optimizados",
            ]
            for idx in indexes:
                self.stdout.write(f"    - {idx}")
            return

        try:
            optimizer.create_performance_indexes()
            self._log_success("✅ Índices de rendimiento creados exitosamente")
        except Exception as e:
            self._log_error(f"❌ Error creando índices: {e}")
            raise

    def _optimize_connection_settings(self, optimizer):
        """Aplicar configuraciones optimizadas de conexión."""
        self._log_info("⚙️ Aplicando configuraciones optimizadas de conexión...")

        if self.dry_run:
            self.stdout.write(
                "  [DRY-RUN] Se aplicarían las siguientes configuraciones:"
            )
            self.stdout.write("    - PRAGMA journal_mode=WAL (SQLite)")
            self.stdout.write("    - PRAGMA synchronous=NORMAL (SQLite)")
            self.stdout.write("    - PRAGMA cache_size=10000 (SQLite)")
            self.stdout.write("    - work_mem=32MB (PostgreSQL)")
            return

        try:
            optimizer.optimize_connection_settings()
            self._log_success("✅ Configuraciones de conexión aplicadas")
        except Exception as e:
            self._log_error(f"❌ Error aplicando configuraciones: {e}")
            raise

    def _vacuum_and_analyze(self, optimizer):
        """Ejecutar VACUUM y ANALYZE."""
        self._log_info("🧹 Ejecutando VACUUM y ANALYZE...")

        if self.dry_run:
            self.stdout.write("  [DRY-RUN] Se ejecutarían:")
            self.stdout.write("    - VACUUM (limpiar espacio no utilizado)")
            self.stdout.write("    - ANALYZE (actualizar estadísticas)")
            return

        try:
            optimizer.vacuum_and_analyze()
            self._log_success("✅ VACUUM y ANALYZE completados")
        except Exception as e:
            self._log_error(f"❌ Error en VACUUM/ANALYZE: {e}")
            raise

    def _show_database_stats(self, optimizer):
        """Mostrar estadísticas de la base de datos."""
        self._log_info("📈 Obteniendo estadísticas de la base de datos...")

        try:
            stats = optimizer.get_database_stats()

            self.stdout.write("\n" + "=" * 50)
            self.stdout.write("📊 ESTADÍSTICAS DE LA BASE DE DATOS")
            self.stdout.write("=" * 50)

            self.stdout.write(f"🔧 Motor: {stats.get('engine', 'Desconocido')}")

            if "size_mb" in stats:
                self.stdout.write(
                    f"💾 Tamaño: {stats['size_mb']} MB ({stats['size_bytes']} bytes)"
                )
            elif "size" in stats:
                self.stdout.write(f"💾 Tamaño: {stats['size']}")

            if "tables" in stats:
                self.stdout.write(f"📋 Tablas: {stats['tables']}")

            if "indexes" in stats:
                self.stdout.write(f"🗂️ Índices: {stats['indexes']}")

            if self.verbose and "table_list" in stats:
                self.stdout.write("\n📋 Lista de tablas:")
                for table in stats["table_list"][:10]:  # Mostrar solo las primeras 10
                    self.stdout.write(f"  - {table}")
                if len(stats["table_list"]) > 10:
                    self.stdout.write(f"  ... y {len(stats['table_list']) - 10} más")

            if self.verbose and "index_list" in stats:
                self.stdout.write("\n🗂️ Lista de índices:")
                for index in stats["index_list"][:10]:  # Mostrar solo los primeros 10
                    self.stdout.write(f"  - {index}")
                if len(stats["index_list"]) > 10:
                    self.stdout.write(f"  ... y {len(stats['index_list']) - 10} más")

            self.stdout.write("=" * 50)

        except Exception as e:
            self._log_error(f"❌ Error obteniendo estadísticas: {e}")
            raise

    def _analyze_specific_query(self, optimizer, query):
        """Analizar el rendimiento de una query específica."""
        self._log_info(f"🔍 Analizando query: {query[:50]}...")

        if self.dry_run:
            self.stdout.write(f"  [DRY-RUN] Se analizaría la query: {query}")
            return

        try:
            analysis = optimizer.analyze_query_performance(query)

            self.stdout.write("\n" + "=" * 50)
            self.stdout.write("🔍 ANÁLISIS DE RENDIMIENTO DE QUERY")
            self.stdout.write("=" * 50)

            self.stdout.write(
                f"⏱️ Tiempo de ejecución: {analysis['execution_time_ms']:.2f} ms"
            )
            self.stdout.write(f"📊 Filas devueltas: {analysis['row_count']}")

            if analysis["execution_time_ms"] > 100:
                self.stdout.write(
                    self.style.WARNING("⚠️ Query lenta detectada (>100ms)")
                )
            elif analysis["execution_time_ms"] > 50:
                self.stdout.write(
                    self.style.WARNING("⚠️ Query moderadamente lenta (>50ms)")
                )
            else:
                self.stdout.write(self.style.SUCCESS("✅ Query rápida (<50ms)"))

            if self.verbose and analysis["explain_plan"]:
                self.stdout.write("\n📋 Plan de ejecución:")
                for line in analysis["explain_plan"]:
                    self.stdout.write(f"  {line}")

            self.stdout.write("=" * 50)

        except Exception as e:
            self._log_error(f"❌ Error analizando query: {e}")
            raise

    def _log_info(self, message):
        """Log de información."""
        self.stdout.write(message)
        if self.verbose:
            logger.info(message)

    def _log_success(self, message):
        """Log de éxito."""
        self.stdout.write(self.style.SUCCESS(message))
        if self.verbose:
            logger.info(message)

    def _log_error(self, message):
        """Log de error."""
        self.stdout.write(self.style.ERROR(message))
        logger.error(message)
