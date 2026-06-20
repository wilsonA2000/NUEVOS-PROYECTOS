"""
Tests para la tarea Celery de backup de base de datos (core.tasks.backup_database).

Protege la reconciliación D39: el backup automático debe producir el MISMO
artefacto restaurable (pg_dump custom + gzip vía scripts/backup_database.sh)
que el backup manual y que sabe leer scripts/restore_database.sh. Antes la
tarea usaba `dumpdata` JSON, un formato que el script de restore no podía leer.
"""

import os
import subprocess
from unittest import mock

from django.conf import settings
from django.test import SimpleTestCase

from core.tasks import backup_database


class BackupDatabaseTaskTest(SimpleTestCase):
    """La tarea delega en scripts/backup_database.sh (un solo método de backup)."""

    @mock.patch("core.tasks.subprocess.run")
    def test_invoca_script_pg_dump(self, mock_run):
        """Debe ejecutar bash scripts/backup_database.sh desde BASE_DIR."""
        mock_run.return_value = subprocess.CompletedProcess(
            args=[], returncode=0, stdout="Backup completado", stderr=""
        )

        result = backup_database()

        mock_run.assert_called_once()
        args, kwargs = mock_run.call_args
        cmd = args[0]
        expected_script = os.path.join(
            settings.BASE_DIR, "scripts", "backup_database.sh"
        )
        self.assertEqual(cmd, ["bash", expected_script])
        self.assertEqual(str(kwargs["cwd"]), str(settings.BASE_DIR))
        self.assertTrue(kwargs["check"])
        self.assertIn("pg_dump", result)

    @mock.patch("core.tasks.subprocess.run")
    def test_propaga_fallo_del_script(self, mock_run):
        """Si el script falla (rc != 0), la tarea propaga el error (no silencia)."""
        mock_run.side_effect = subprocess.CalledProcessError(
            returncode=1, cmd=["bash"], stderr="pg_dump: connection refused"
        )

        with self.assertRaises(subprocess.CalledProcessError):
            backup_database()

    @mock.patch("core.tasks.subprocess.run")
    def test_no_usa_dumpdata_json(self, mock_run):
        """Regresión D39: la tarea ya NO genera dumpdata JSON."""
        mock_run.return_value = subprocess.CompletedProcess(
            args=[], returncode=0, stdout="", stderr=""
        )

        backup_database()

        cmd = mock_run.call_args.args[0]
        self.assertNotIn("dumpdata", cmd)
        self.assertTrue(any("backup_database.sh" in part for part in cmd))
