import * as Sentry from "@sentry/react";

const DSN = import.meta.env.VITE_SENTRY_DSN || "";

// Only initialize in production — don't pollute with local dev errors
const isProd = import.meta.env.PROD;

export function initSentry() {
  if (!DSN || !isProd) return;

  Sentry.init({
    dsn: DSN,
    environment: isProd ? "production" : "development",
    // Capture unhandled promise rejections and uncaught errors automatically
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    // Trace a small percentage of transactions for performance monitoring
    tracesSampleRate: 0.1,
    // Send default PII (IP address) so we can correlate errors to clients
    sendDefaultPii: true,
    // Filter out noisy errors
    ignoreErrors: [
      // Common browser extensions
      "ResizeObserver loop",
      "Non-Error promise rejection",
      // Network errors that aren't bugs
      "Failed to fetch",
      "NetworkError",
      "Load failed",
    ],
    beforeSend(event, hint) {
      // Drop errors from local dev even if someone hits prod URL
      if (window.location.hostname === "localhost") return null;
      return event;
    },
  });
}

/**
 * Tag all subsequent Sentry events with the current client's slug and email.
 * Call this after auth loads so we know which client hit an error.
 */
export function setSentryUser(slug: string | null, email: string | null) {
  if (!DSN || !isProd) return;
  if (slug) {
    Sentry.setUser({
      id: slug,
      email: email || undefined,
      username: slug,
    });
    Sentry.setTag("clientSlug", slug);
  } else {
    Sentry.setUser(null);
  }
}

export { Sentry };
