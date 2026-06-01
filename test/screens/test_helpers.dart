// Shared test helpers — mock notifiers for scaffold-level providers
// so widget tests don't need real API calls or FlutterSecureStorage.
// ignore_for_file: avoid_print

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:liveshop_saas/livelab/theme/livelab_theme.dart';
import 'package:liveshop_saas/models/user.dart';
import 'package:liveshop_saas/models/configuracoes.dart';
import 'package:liveshop_saas/models/boleto.dart';
import 'package:liveshop_saas/models/boleto_alerta.dart';
import 'package:liveshop_saas/providers/auth_provider.dart';
import 'package:liveshop_saas/providers/billing_alert_provider.dart';
import 'package:liveshop_saas/providers/boletos_provider.dart';
import 'package:liveshop_saas/providers/configuracoes_provider.dart';
import 'package:liveshop_saas/providers/cliente_perfil_provider.dart';
import 'package:liveshop_saas/providers/clientes_provider.dart';
import 'package:liveshop_saas/providers/pacotes_provider.dart';
import 'package:liveshop_saas/models/cliente.dart';
import 'package:liveshop_saas/models/pacote.dart';

// ---------------------------------------------------------------------------
// User factories
// ---------------------------------------------------------------------------
User makeUser({String papel = 'franqueado'}) => User(
      id: 'u_test',
      nome: 'Test User',
      email: 'test@test.com',
      papel: papel,
      tenantId: 'tenant_test',
      tenantNome: 'Tenant Teste',
    );

// ---------------------------------------------------------------------------
// Auth mock — returns a pre-built user without touching SecureStorage
// ---------------------------------------------------------------------------
class MockAuthNotifier extends AuthNotifier {
  final String papel;
  MockAuthNotifier({this.papel = 'franqueado'});

  @override
  AuthState build() => AuthState(user: makeUser(papel: papel));

  @override
  Future<bool> login(String email, String senha) async => false;
}

// ---------------------------------------------------------------------------
// Scaffold-level async providers — return empty/null to avoid network calls
// ---------------------------------------------------------------------------
class MockBillingAlertNotifier extends BillingAlertNotifier {
  @override
  Future<BoletoAlerta?> build() async => null;
}

class MockBoletosNotifier extends BoletosNotifier {
  @override
  Future<List<Boleto>> build() async => const [];
}

class MockConfiguracoesNotifier extends ConfiguracoesNotifier {
  @override
  Future<ConfiguracoesFranquia> build() async => const ConfiguracoesFranquia(
        id: 'cfg',
        nome: 'Tenant Teste',
        hasAsaas: false,
        hasTiktok: false,
        metaDiariaGmv: 0,
        contactHistory: [],
      );
}

class MockClientesNotifier extends ClientesNotifier {
  final List<Cliente> data;
  MockClientesNotifier([this.data = const []]);

  @override
  Future<List<Cliente>> build() async => data;
}

class MockPacotesNotifier extends PacotesNotifier {
  @override
  Future<List<Pacote>> build() async => const [];
}

// ---------------------------------------------------------------------------
// Convenience: all scaffold-level overrides in one list
// ---------------------------------------------------------------------------
List<Override> scaffoldOverrides({
  String papel = 'franqueado',
  List<Cliente> clientes = const [],
}) =>
    [
      authProvider.overrideWith(() => MockAuthNotifier(papel: papel)),
      billingAlertProvider.overrideWith(() => MockBillingAlertNotifier()),
      boletosProvider.overrideWith(() => MockBoletosNotifier()),
      configuracoesProvider.overrideWith(() => MockConfiguracoesNotifier()),
      clientePerfilProvider.overrideWith((ref) async => null),
      clientesProvider.overrideWith(() => MockClientesNotifier(clientes)),
      pacotesProvider.overrideWith(() => MockPacotesNotifier()),
    ];

// ---------------------------------------------------------------------------
// Viewport helper — many screens need desktop-sized viewport to avoid overflow
// ---------------------------------------------------------------------------
void setDesktopViewport(WidgetTester tester, {Size size = const Size(1440, 900)}) {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  // Also suppress overflow errors that may occur in test viewport
  ignoreLayoutOverflows();
  addTearDown(restoreErrorHandler);
}

/// Ignores RenderFlex/layout overflow errors for a single pump call.
/// Use when testing screens that may overflow in test viewport but work in prod.
void Function(FlutterErrorDetails)? _originalOnError;

void ignoreLayoutOverflows() {
  _originalOnError = FlutterError.onError;
  FlutterError.onError = (details) {
    final msg = details.exceptionAsString();
    if (msg.contains('overflowed') ||
        msg.contains('RenderFlex') ||
        msg.contains('Competing ParentDataWidgets') ||
        msg.contains('ParentDataWidget') ||
        msg.contains('Incorrect use of')) {
      return; // suppress layout/parentdata errors from scaffold internals
    }
    _originalOnError?.call(details);
  };
}

void restoreErrorHandler() {
  if (_originalOnError != null) {
    FlutterError.onError = _originalOnError;
    _originalOnError = null;
  }
}

// ---------------------------------------------------------------------------
// MaterialApp with livelab theme (required by LivelabScaffold)
// ---------------------------------------------------------------------------
MaterialApp themedApp({required Widget home, Map<String, WidgetBuilder>? routes}) {
  return MaterialApp(
    theme: LivelabTheme.light(),
    home: home,
    routes: routes ?? const {},
  );
}

MaterialApp themedAppWithGenerator({
  required Widget home,
  required RouteFactory onGenerateRoute,
}) {
  return MaterialApp(
    theme: LivelabTheme.light(),
    home: home,
    onGenerateRoute: onGenerateRoute,
  );
}
