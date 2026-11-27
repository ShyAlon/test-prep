let sequence = 0;

// Error strings can contain request URLs. Never print the Error object itself:
// download errors also carry a working fallback URL with the original sharing key.
function safeMessage(error) {
  return String(error?.message ?? 'Unknown error')
    .replace(/https?:\/\/[^\s<>"']+/gi, '[redacted URL]')
    .slice(0, 400);
}

export function createThemeImportDiagnostics({ source = 'url', logger = console, now = () => performance.now() } = {}) {
  const startedAt = now();
  const context = { importId: `theme-import-${++sequence}`, source, stage: 'initialization' };
  function log(level, event, details = {}) {
    // Diagnostic failures must not interrupt imports (e.g. a browser console shim).
    try {
      logger[level](`[Theme import] ${event}`, {
        ...context, elapsedMs: Math.max(0, Math.round(now() - startedAt)), ...details,
      });
    } catch { /* Logging is best effort. */ }
  }
  log('info', 'Started');
  return {
    stage(stage, details) { context.stage = stage; log('info', 'Stage started', details); },
    info(event, details) { log('info', event, details); },
    downloadContext(link, { timeoutMs, maxBytes } = {}) {
      context.provider = link.provider;
      context.downloadHost = new URL(link.url).hostname;
      context.crossOrigin = globalThis.location ? new URL(link.url).origin !== globalThis.location.origin : null;
      log('info', 'Download requested', {
        online: globalThis.navigator?.onLine ?? null,
        credentials: 'omit',
        timeoutMs, maxBytes,
      });
    },
    failure(error) {
      const cancelled = error?.reason === 'cancelled';
      log(cancelled ? 'info' : 'error', cancelled ? 'Cancelled' : 'Failed', {
        reason: error?.reason ?? ({
          'file read': 'file-read-failed',
          'ZIP validation': 'invalid-zip', 'image decoding': 'image-decode-failed',
          'IndexedDB persistence': 'storage-failed', 'theme activation': 'activation-failed',
        }[context.stage] ?? 'import-error'),
        errorName: error?.name ?? 'Error',
        errorMessage: safeMessage(error),
        ...(error?.cause ? { causeName: error.cause.name, causeMessage: safeMessage(error.cause) } : {}),
        ...(error?.diagnosticHint ? { hint: error.diagnosticHint } : {}),
      });
    },
  };
}
