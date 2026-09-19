# lib/services/sentry_service.dart

- SentryService · class · L14-L142 — class SentryService
- dsn · constant · L15-L15 — static const String dsn = String.fromEnvironment('SENTRY_DSN');
- _environment · constant · L16-L19 — static const String _environment = String.fromEnvironment(
- _release · constant · L20-L23 — static const String _release = String.fromEnvironment(
- init · method · L30-L49 — static Future<void> init(Future<void> Function() appRunner) async
- _beforeSend · method · L52-L67 — static FutureOr<SentryEvent?> _beforeSend(
- _sensitiveKey · constant · L69-L72 — static final RegExp _sensitiveKey = RegExp(
- _scrubMap · method · L74-L79 — static Map<String, String>? _scrubMap(Map<String, String>? map)
- _scrubDynamic · method · L81-L93 — static dynamic _scrubDynamic(dynamic value)
- setUser · method · L96-L115 — static Future<void> setUser(
- clearUser · method · L118-L121 — static Future<void> clearUser() async
- capture · method · L126-L141 — static Future<void> capture(
