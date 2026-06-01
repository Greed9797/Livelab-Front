import 'package:flutter/foundation.dart' show kReleaseMode;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'providers/auth_provider.dart';
import 'providers/theme_mode_provider.dart';
import 'design_system/design_system.dart';
import 'routes/app_navigator.dart';
import 'routes/app_routes.dart';
import 'services/api_service.dart';
import 'services/sentry_service.dart';
import 'config/e2e_bootstrap.dart';

const bool isE2ETesting = bool.fromEnvironment(
  'E2E_TESTING',
  defaultValue: false,
);

const String e2eRole = String.fromEnvironment(
  'E2E_ROLE',
  defaultValue: 'franqueador_master',
);

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // A11y on por default — ativar Flutter semantics tree para screen readers
  // funcionarem sem o usuário precisar clicar "Enable accessibility".
  WidgetsBinding.instance.ensureSemantics();

  // Error boundary global — substitui tela cinza padrão por widget user-friendly
  // com CTA de retry. Ativo só em release (em debug, mostrar stack helps dev).
  if (kReleaseMode) {
    ErrorWidget.builder = (FlutterErrorDetails details) => _GlobalErrorWidget(
      details: details,
    );
    FlutterError.onError = (details) {
      FlutterError.presentError(details);
      // Reporta erros não tratados ao Sentry (no-op se SENTRY_DSN ausente).
      if (SentryService.enabled) {
        SentryService.capture(
          details.exception,
          stackTrace: details.stack,
          tags: const {'source': 'flutter_error_handler'},
        );
      }
    };
  }

  await initializeDateFormatting('pt_BR', null);
  await ApiService.init();

  final container = ProviderContainer();

  ApiService.setUnauthorizedHandler(() async {
    await container.read(authProvider.notifier).expireSession();
  });

  // Bootstrap resiliente: storage I/O com timeout + fallback silencioso.
  // Garante que runApp() execute mesmo se SecureStorage estiver travado.
  try {
    await container
        .read(authProvider.notifier)
        .restoreSession()
        .timeout(const Duration(seconds: 8));
  } catch (e) {
    debugPrint('[bootstrap] restoreSession falhou: $e');
  }
  try {
    await container
        .read(themeModeProvider.notifier)
        .restore()
        .timeout(const Duration(seconds: 5));
  } catch (e) {
    debugPrint('[bootstrap] themeMode restore falhou: $e');
  }

  // E2E auth bootstrap só em builds NÃO-release. Em produção (release build)
  // qualquer tentativa de --dart-define=E2E_TESTING=true é ignorada.
  if (!kReleaseMode && isE2ETesting) {
    WidgetsBinding.instance.ensureSemantics();
    try {
      await bootstrapE2EAuth(container, role: e2eRole)
          .timeout(const Duration(seconds: 10));
    } catch (e) {
      debugPrint('[bootstrap] E2E auth falhou: $e');
    }
  }

  // Se autenticado, propaga user para o Sentry (no-op se DSN ausente).
  final restoredUser = container.read(authProvider).user;
  if (restoredUser != null && SentryService.enabled) {
    await SentryService.setUser(
      id: restoredUser.id,
      email: restoredUser.email,
      papel: restoredUser.papel,
      tenantId: restoredUser.tenantId,
    );
  }

  // Sentry.init wrapping runApp captura erros assíncronos do framework.
  // Quando SENTRY_DSN não está setado, init() roda appRunner direto (no-op).
  await SentryService.init(() async {
    runApp(UncontrolledProviderScope(
      container: container,
      child: const LiveShopApp(),
    ));
  });
}

/// Widget de fallback global quando algum descendente lança exception
/// fora de um async catch. Mostra UI amigável com retry em vez de tela cinza.
class _GlobalErrorWidget extends StatelessWidget {
  const _GlobalErrorWidget({required this.details});
  final FlutterErrorDetails details;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0xFFFFF5F0),
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.warning_amber_rounded,
                  size: 48, color: Color(0xFFE8673C)),
              const SizedBox(height: 16),
              const Text('Algo deu errado',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1A1A1A),
                  )),
              const SizedBox(height: 8),
              const Text(
                'Tente recarregar a página. Se o problema continuar, fale com o suporte.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: Color(0xFF666666)),
              ),
              const SizedBox(height: 20),
              FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFFE8673C),
                ),
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Recarregar'),
                onPressed: () {
                  appNavigatorKey.currentState
                      ?.pushNamedAndRemoveUntil(AppRoutes.login, (_) => false);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class LiveShopApp extends ConsumerWidget {
  const LiveShopApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    ref.listen<AuthState>(authProvider, (previous, next) {
      if (previous?.isAuthenticated == true && !next.isAuthenticated) {
        appNavigatorKey.currentState?.pushNamedAndRemoveUntil(
          AppRoutes.login,
          (_) => false,
        );
      }
      if (next.isAuthenticated) {
        ref.read(themeModeProvider.notifier).defaultForRole(next.user?.papel);
      }
      // Onboarding concluído → navega para a tela principal do papel
      if (previous?.user?.onboardingCompleted == false &&
          next.user?.onboardingCompleted == true) {
        appNavigatorKey.currentState?.pushNamedAndRemoveUntil(
          AppRoutes.routeForRole(next.user?.papel, onboardingCompleted: true),
          (_) => false,
        );
      }
    });

    if (authState.isAuthenticated) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ref
            .read(themeModeProvider.notifier)
            .defaultForRole(authState.user?.papel);
      });
    }

    return MaterialApp(
      navigatorKey: appNavigatorKey,
      title: 'Livelab SaaS',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: ref.watch(themeModeProvider),
      initialRoute: authState.isAuthenticated
          ? AppRoutes.routeForRole(
              authState.user?.papel,
              onboardingCompleted: authState.user?.onboardingCompleted ?? true,
            )
          : AppRoutes.login,
      routes: AppRoutes.routes,
      onGenerateRoute: AppRoutes.onGenerateRoute,
    );
  }
}
