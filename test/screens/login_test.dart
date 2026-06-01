// ignore_for_file: avoid_print
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:liveshop_saas/livelab/theme/livelab_theme.dart';
import 'package:liveshop_saas/providers/auth_provider.dart';
import 'package:liveshop_saas/models/user.dart';
import 'package:liveshop_saas/screens/auth/login_screen.dart';
import 'package:liveshop_saas/routes/app_routes.dart';
import 'test_helpers.dart';

// ---------------------------------------------------------------------------
// Mock AuthNotifier — never touches ApiService / FlutterSecureStorage
// ---------------------------------------------------------------------------
class _MockAuthNotifier extends AuthNotifier {
  bool loginCalled = false;
  bool loginShouldSucceed;
  String? capturedEmail;
  String? capturedPassword;

  _MockAuthNotifier({this.loginShouldSucceed = false});

  @override
  AuthState build() => const AuthState();

  @override
  Future<bool> login(String email, String senha) async {
    loginCalled = true;
    capturedEmail = email;
    capturedPassword = senha;
    if (loginShouldSucceed) {
      state = AuthState(
        user: User(
          id: 'u1',
          nome: 'Test User',
          email: email,
          papel: 'franqueado',
          tenantId: 't1',
          tenantNome: 'Tenant',
        ),
      );
      return true;
    }
    state = AuthState(error: 'Credenciais inválidas');
    return false;
  }
}

// ---------------------------------------------------------------------------
// Helper — wraps LoginScreen in a minimal navigator + ProviderScope
// ---------------------------------------------------------------------------
Widget _buildApp({required _MockAuthNotifier mock}) {
  return ProviderScope(
    overrides: [
      authProvider.overrideWith(() => mock),
    ],
    child: MaterialApp(
      theme: LivelabTheme.light(),
      onGenerateRoute: (settings) {
        if (settings.name == AppRoutes.esqueciSenha) {
          return MaterialPageRoute(
            builder: (_) => const Scaffold(body: Text('EsqueciSenha')),
          );
        }
        return MaterialPageRoute(
          builder: (_) => const Scaffold(body: Text('Home')),
        );
      },
      home: const LoginScreen(),
    ),
  );
}

/// Sets viewport and ignores any overflow errors from the login card layout.
void _setupLoginTest(WidgetTester tester) {
  tester.view.physicalSize = const Size(1440, 900);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  ignoreLayoutOverflows();
  addTearDown(restoreErrorHandler);
}

void main() {
  group('LoginScreen', () {
    testWidgets('renderiza campos de e-mail e senha', (tester) async {
      _setupLoginTest(tester);
      final mock = _MockAuthNotifier();
      await tester.pumpWidget(_buildApp(mock: mock));
      await tester.pump();

      expect(find.byKey(const ValueKey('login_email')), findsOneWidget);
      expect(find.byKey(const ValueKey('login_senha')), findsOneWidget);
      expect(find.text('Entrar'), findsOneWidget);
    });

    testWidgets('exibe erro quando e-mail está vazio e submit é acionado',
        (tester) async {
      _setupLoginTest(tester);
      final mock = _MockAuthNotifier();
      await tester.pumpWidget(_buildApp(mock: mock));
      await tester.pump();

      await tester.tap(find.text('Entrar'));
      await tester.pump();

      expect(find.text('E-mail inválido.'), findsOneWidget);
      expect(mock.loginCalled, isFalse);
    });

    testWidgets('exibe erro quando e-mail é inválido (sem @)', (tester) async {
      _setupLoginTest(tester);
      final mock = _MockAuthNotifier();
      await tester.pumpWidget(_buildApp(mock: mock));
      await tester.pump();

      await tester.enterText(
          find.byKey(const ValueKey('login_email')), 'invalido');
      await tester.tap(find.text('Entrar'));
      await tester.pump();

      expect(find.text('E-mail inválido.'), findsOneWidget);
      expect(mock.loginCalled, isFalse);
    });

    testWidgets('exibe erro quando senha está vazia', (tester) async {
      _setupLoginTest(tester);
      final mock = _MockAuthNotifier();
      await tester.pumpWidget(_buildApp(mock: mock));
      await tester.pump();

      await tester.enterText(
          find.byKey(const ValueKey('login_email')), 'user@example.com');
      await tester.tap(find.text('Entrar'));
      await tester.pump();

      expect(find.text('Informe a senha.'), findsOneWidget);
      expect(mock.loginCalled, isFalse);
    });

    testWidgets(
        'submit válido chama authProvider.login com credenciais corretas',
        (tester) async {
      _setupLoginTest(tester);
      final mock = _MockAuthNotifier(loginShouldSucceed: false);
      await tester.pumpWidget(_buildApp(mock: mock));
      await tester.pump();

      await tester.enterText(
          find.byKey(const ValueKey('login_email')), 'user@example.com');
      await tester.enterText(
          find.byKey(const ValueKey('login_senha')), 'senha123');
      await tester.tap(find.text('Entrar'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(mock.loginCalled, isTrue);
      expect(mock.capturedEmail, 'user@example.com');
      expect(mock.capturedPassword, 'senha123');
    });

    testWidgets(
        'tap em "Esqueci a senha" navega para a tela de recuperação',
        (tester) async {
      _setupLoginTest(tester);
      final mock = _MockAuthNotifier();
      await tester.pumpWidget(_buildApp(mock: mock));
      await tester.pump();

      await tester.tap(find.byKey(const ValueKey('login_esqueci_senha')));
      await tester.pumpAndSettle();

      expect(find.text('EsqueciSenha'), findsOneWidget);
    });
  });
}
