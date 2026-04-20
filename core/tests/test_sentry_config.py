"""Tests para `core.sentry_config.init_sentry` (Fase J1).

Verifica los guards del inicializador:
1. Sin `SENTRY_DSN` en env → no intenta importar sentry_sdk, no lanza.
2. Con `SENTRY_DSN` pero sin la lib instalada → loggea warning y sale limpio.
3. Con `SENTRY_DSN` y la lib presente → llama a `sentry_sdk.init` con
   los parámetros esperados.

Importante: estos tests no requieren `sentry-sdk` instalado. Usan
monkey-patching para simular ambos escenarios.
"""

from unittest import mock

from django.test import TestCase


class InitSentryGuardsTests(TestCase):
    """init_sentry() debe ser seguro de llamar en cualquier entorno."""

    def test_returns_early_without_dsn(self):
        """Sin SENTRY_DSN no se intenta importar sentry_sdk."""
        with mock.patch.dict("os.environ", {"SENTRY_DSN": ""}, clear=False):
            # Limpiar explícitamente por si el env del test tiene un valor.
            import os

            os.environ.pop("SENTRY_DSN", None)

            from core.sentry_config import init_sentry

            # No debe lanzar; el retorno es None (sin efecto).
            self.assertIsNone(init_sentry())

    def test_handles_missing_sentry_sdk_gracefully(self):
        """Con SENTRY_DSN pero sin sentry_sdk instalado → warning y return.

        Simulamos la ausencia retirando los módulos de `sys.modules` y
        usando un finder que niega imports del namespace `sentry_sdk`.
        """
        import os
        import sys

        os.environ["SENTRY_DSN"] = "https://fake@sentry.example.com/1"
        # Conservar refs para restaurar.
        removed = {
            k: sys.modules.pop(k)
            for k in list(sys.modules)
            if k == "sentry_sdk" or k.startswith("sentry_sdk.")
        }

        class DenyFinder:
            def find_spec(self, fullname, path=None, target=None):
                if fullname == "sentry_sdk" or fullname.startswith("sentry_sdk."):
                    raise ImportError(f"No module named {fullname}")
                return None

        finder = DenyFinder()
        sys.meta_path.insert(0, finder)
        try:
            from core.sentry_config import init_sentry

            self.assertIsNone(init_sentry())
        finally:
            sys.meta_path.remove(finder)
            sys.modules.update(removed)
            os.environ.pop("SENTRY_DSN", None)

    def test_calls_sentry_init_when_lib_present(self):
        """Con DSN + lib disponible → sentry_sdk.init recibe los kwargs."""
        import os

        os.environ["SENTRY_DSN"] = "https://fake@sentry.example.com/1"
        try:
            # Patch directo del módulo cargado.
            sentry_sdk_mock = mock.MagicMock()
            django_integration_mock = mock.MagicMock()
            celery_integration_mock = mock.MagicMock()

            with mock.patch.dict(
                "sys.modules",
                {
                    "sentry_sdk": sentry_sdk_mock,
                    "sentry_sdk.integrations.django": django_integration_mock,
                    "sentry_sdk.integrations.celery": celery_integration_mock,
                },
            ):
                from core.sentry_config import init_sentry

                init_sentry()

                sentry_sdk_mock.init.assert_called_once()
                call_kwargs = sentry_sdk_mock.init.call_args.kwargs
                self.assertEqual(
                    call_kwargs["dsn"], "https://fake@sentry.example.com/1"
                )
                self.assertEqual(call_kwargs["send_default_pii"], False)
                self.assertEqual(call_kwargs["traces_sample_rate"], 0.1)
                self.assertEqual(call_kwargs["sample_rate"], 1.0)
                # Debe incluir 2 integraciones (Django + Celery).
                self.assertEqual(len(call_kwargs["integrations"]), 2)
        finally:
            os.environ.pop("SENTRY_DSN", None)
