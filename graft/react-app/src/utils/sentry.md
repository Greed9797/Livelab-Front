# react-app/src/utils/sentry.ts

- scrubUrl · function · L34-L42 — function scrubUrl(raw: string): string
- initSentry · function · L44-L94 — function initSentry(): void
- beforeSend · method · L60-L73 — beforeSend(event)
- beforeBreadcrumb · method · L75-L90 — beforeBreadcrumb(breadcrumb)
- captureError · function · L97-L100 — function captureError(error: unknown, context?: Record<string, unknown>): void
- flushSentry · function · L109-L112 — function flushSentry(timeoutMs = 1500): Promise<boolean>
