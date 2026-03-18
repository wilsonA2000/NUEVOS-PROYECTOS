/**
 * Sentry Error Monitoring Service
 *
 * Initializes Sentry for error tracking, performance monitoring, and session replay.
 * Completely optional - the app works without a DSN configured.
 */

import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const IS_PRODUCTION = import.meta.env.MODE === 'production';

/**
 * Initialize Sentry SDK.
 * Only activates if VITE_SENTRY_DSN is provided.
 */
export function initSentry(): void {
  if (!SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',

    // Performance monitoring
    tracesSampleRate: IS_PRODUCTION ? 0.1 : 1.0,

    // Session Replay
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: IS_PRODUCTION ? 0.1 : 1.0,

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],

    // Filter out noisy development errors
    beforeSend(event) {
      // Skip errors from browser extensions
      if (event.exception?.values?.some(
        (e) => e.stacktrace?.frames?.some(
          (f) => f.filename?.includes('extensions/')
            || f.filename?.includes('chrome-extension')
        )
      )) {
        return null;
      }

      return event;
    },
  });
}

/**
 * Capture an exception and send it to Sentry.
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!SENTRY_DSN) {
    return;
  }
  Sentry.captureException(error, { extra: context });
}

/**
 * Capture an informational message.
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
): void {
  if (!SENTRY_DSN) {
    return;
  }
  Sentry.captureMessage(message, level);
}

/**
 * Set the current user context for Sentry events.
 * Call this after login.
 */
export function setUser(user: {
  id: string;
  email?: string;
  username?: string;
  role?: string;
}): void {
  if (!SENTRY_DSN) return;
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
  if (user.role) {
    Sentry.setTag('user.role', user.role);
  }
}

/**
 * Clear the user context.
 * Call this on logout.
 */
export function clearUser(): void {
  if (!SENTRY_DSN) return;
  Sentry.setUser(null);
}

// Re-export Sentry's ErrorBoundary for use in App.tsx
export const SentryErrorBoundary = Sentry.ErrorBoundary;
