import 'dart:async';

import 'package:sentry_flutter/sentry_flutter.dart';

/// Wrapper centralizado para Sentry no frontend.
///
/// Princípios:
/// - Opt-in via `--dart-define=SENTRY_DSN=...` (sem DSN = no-op total).
/// - PII scrub: senha, token, authorization, secret, api_key, cpf, cnpj
///   nunca são enviados — neutralizados em `beforeSend`.
/// - tracesSampleRate baixo (10%) para não estourar quota.
/// - Não captura 4xx esperados (validação) — apenas exceções não tratadas
///   e erros explicitamente reportados via [SentryService.capture].
class SentryService {
  static const String dsn = String.fromEnvironment('SENTRY_DSN');
  static const String _environment = String.fromEnvironment(
    'SENTRY_ENVIRONMENT',
    defaultValue: 'production',
  );
  static const String _release = String.fromEnvironment(
    'SENTRY_RELEASE',
    defaultValue: 'liveshop_saas_frontend@dev',
  );

  /// `true` quando há DSN configurado e o SDK foi inicializado.
  static bool get enabled => dsn.isNotEmpty;

  /// Inicializa o Sentry e roda o [appRunner]. Quando não há DSN, executa
  /// `appRunner` direto sem inicializar nada (no-op).
  static Future<void> init(Future<void> Function() appRunner) async {
    if (!enabled) {
      await appRunner();
      return;
    }

    await SentryFlutter.init(
      (options) {
        options.dsn = dsn;
        options.environment = _environment;
        options.release = _release;
        options.tracesSampleRate = 0.1;
        // Não captura breadcrumbs sensíveis automaticamente
        options.sendDefaultPii = false;
        options.attachStacktrace = true;
        options.beforeSend = _beforeSend;
      },
      appRunner: appRunner,
    );
  }

  /// PII scrub aplicado a todo evento antes de envio.
  static FutureOr<SentryEvent?> _beforeSend(
    SentryEvent event,
    Hint hint,
  ) {
    final request = event.request;
    if (request != null) {
      event = event.copyWith(
        request: request.copyWith(
          headers: _scrubMap(request.headers),
          data: _scrubDynamic(request.data),
          cookies: null,
        ),
      );
    }
    return event;
  }

  static final RegExp _sensitiveKey = RegExp(
    r'^(senha|password|token|access_token|refresh_token|authorization|x-.*-token|secret|api.?key|credit.?card|cvv|cpf|cnpj)$',
    caseSensitive: false,
  );

  static Map<String, String>? _scrubMap(Map<String, String>? map) {
    if (map == null) return null;
    return map.map(
      (k, v) => MapEntry(k, _sensitiveKey.hasMatch(k) ? '[redacted]' : v),
    );
  }

  static dynamic _scrubDynamic(dynamic value) {
    if (value is Map) {
      return value.map((k, v) {
        final key = k.toString();
        if (_sensitiveKey.hasMatch(key)) return MapEntry(key, '[redacted]');
        return MapEntry(key, _scrubDynamic(v));
      });
    }
    if (value is List) {
      return value.map(_scrubDynamic).toList();
    }
    return value;
  }

  /// Marca o usuário corrente no escopo global. Chamar após login.
  static Future<void> setUser({
    required String id,
    required String email,
    String? papel,
    String? tenantId,
  }) async {
    if (!enabled) return;
    await Sentry.configureScope((scope) {
      scope.setUser(
        SentryUser(
          id: id,
          email: email,
          data: {
            if (papel != null) 'papel': papel,
            if (tenantId != null) 'tenant_id': tenantId,
          },
        ),
      );
    });
  }

  /// Limpa o usuário do escopo. Chamar no logout.
  static Future<void> clearUser() async {
    if (!enabled) return;
    await Sentry.configureScope((scope) => scope.setUser(null));
  }

  /// Captura uma exception explicitamente. Use para erros que merecem
  /// alerta mas que já foram tratados (não chegariam no error handler global).
  /// Não usar para 4xx esperados (validação, auth).
  static Future<void> capture(
    Object error, {
    StackTrace? stackTrace,
    Map<String, String>? tags,
  }) async {
    if (!enabled) return;
    await Sentry.captureException(
      error,
      stackTrace: stackTrace,
      withScope: tags == null
          ? null
          : (scope) {
              tags.forEach(scope.setTag);
            },
    );
  }
}
