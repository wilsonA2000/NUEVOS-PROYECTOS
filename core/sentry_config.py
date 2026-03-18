"""
Sentry Error Monitoring Configuration for VeriHome Backend.

Initializes Sentry SDK with Django and Celery integrations.
Completely optional - the app works without SENTRY_DSN configured.
"""

import os
import logging

logger = logging.getLogger(__name__)


def init_sentry():
    """
    Initialize Sentry SDK if SENTRY_DSN environment variable is set.
    Safe to call even if sentry-sdk is not installed.
    """
    dsn = os.environ.get('SENTRY_DSN', '')
    if not dsn:
        return

    try:
        import sentry_sdk
        from sentry_sdk.integrations.django import DjangoIntegration
        from sentry_sdk.integrations.celery import CeleryIntegration
    except ImportError:
        logger.warning(
            'sentry-sdk is not installed. Sentry monitoring disabled. '
            'Install with: pip install sentry-sdk[django]'
        )
        return

    environment = os.environ.get('SENTRY_ENVIRONMENT', 'development')
    release = os.environ.get('SENTRY_RELEASE', 'latest')

    sentry_sdk.init(
        dsn=dsn,
        environment=environment,
        release=release,
        integrations=[
            DjangoIntegration(
                transaction_style='url',
                middleware_spans=True,
                signals_spans=True,
                cache_spans=True,
            ),
            CeleryIntegration(
                monitor_beat_tasks=True,
            ),
        ],
        # Performance monitoring
        traces_sample_rate=0.1,
        profiles_sample_rate=0.1,
        # Error sampling - capture all errors
        sample_rate=1.0,
        # Privacy - do not send PII by default
        send_default_pii=False,
        # Only trace API transactions
        before_send_transaction=lambda event, hint: (
            event if event.get('transaction', '').startswith('/api/') else None
        ),
    )

    logger.info('Sentry initialized for environment: %s', environment)
