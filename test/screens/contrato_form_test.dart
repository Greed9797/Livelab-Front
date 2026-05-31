// ignore_for_file: avoid_print
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:liveshop_saas/livelab/theme/livelab_theme.dart';
import 'package:liveshop_saas/providers/contratos_provider.dart';
import 'package:liveshop_saas/models/cliente.dart';
import 'package:liveshop_saas/screens/vendas/contrato_screen.dart';
import 'package:liveshop_saas/routes/app_routes.dart';
import 'test_helpers.dart';

// ---------------------------------------------------------------------------
// Mock ContratosNotifier — never touches ApiService
// ---------------------------------------------------------------------------
class _MockContratosNotifier extends ContratosNotifier {
  bool criarCalled = false;
  Map<String, dynamic>? lastArgs;

  @override
  void build() {}

  @override
  Future<String> criar({
    required String clienteId,
    required double valorFixo,
    required double comissaoPct,
    String? pacoteId,
    String? tiktokUsername,
  }) async {
    criarCalled = true;
    lastArgs = {
      'clienteId': clienteId,
      'valorFixo': valorFixo,
      'comissaoPct': comissaoPct,
      'tiktokUsername': tiktokUsername,
    };
    return 'mock_contrato_id';
  }

  @override
  Future<Map<String, dynamic>> criarComDetalhes({
    required String clienteId,
    required double valorFixo,
    required double comissaoPct,
    String? pacoteId,
    String? tiktokUsername,
  }) async {
    criarCalled = true;
    lastArgs = {
      'clienteId': clienteId,
      'valorFixo': valorFixo,
      'comissaoPct': comissaoPct,
      'tiktokUsername': tiktokUsername,
    };
    return {
      'id': 'mock_contrato_id',
      'horas_contratadas': 10,
      'horas_consumidas': 0,
    };
  }
}

// A cliente that has tiktokUsername for auto-fill test
const _clienteComTiktok = Cliente(
  id: 'c1',
  nome: 'Cliente Teste',
  celular: '11999999999',
  email: 'cliente@test.com',
  tiktokUsername: 'loja_autofill',
  status: 'ativo',
  fatAnual: 0,
  score: 0,
);

Widget _buildApp({
  required _MockContratosNotifier contratosMock,
  List<Cliente> clientes = const [],
  String? clienteId,
}) {
  final overrides = [
    ...scaffoldOverrides(clientes: clientes),
    contratosProvider.overrideWith(() => contratosMock),
  ];

  return ProviderScope(
    overrides: overrides,
    child: MaterialApp(
      theme: LivelabTheme.light(),
      onGenerateRoute: (settings) {
        if (settings.name == AppRoutes.analiseCredito) {
          return MaterialPageRoute(
            builder: (_) => const Scaffold(body: Text('AnaliseCredito')),
          );
        }
        return MaterialPageRoute(
          builder: (_) => const ContratoScreen(),
          settings: RouteSettings(
            name: AppRoutes.contrato,
            arguments: clienteId != null ? {'clienteId': clienteId} : null,
          ),
        );
      },
      initialRoute: AppRoutes.contrato,
    ),
  );
}

void main() {
  group('ContratoScreen — campo TikTok (W3-A)', () {
    testWidgets('renderiza campo TikTok com chave correta', (tester) async {
      setDesktopViewport(tester);
      final mock = _MockContratosNotifier();
      await tester.pumpWidget(_buildApp(contratosMock: mock));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.byKey(const ValueKey('contrato_tiktok')), findsOneWidget);
    });

    testWidgets('campo TikTok é obrigatório — exibe erro ao submeter vazio',
        (tester) async {
      setDesktopViewport(tester);
      final mock = _MockContratosNotifier();
      // clienteId é necessário para o botão CRIAR aparecer
      await tester.pumpWidget(
          _buildApp(contratosMock: mock, clienteId: 'c1'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Garantir que o TikTok está vazio e tenta criar
      await tester.tap(find.byKey(const ValueKey('contrato_criar_btn')));
      await tester.pump();

      expect(find.text('Informe o @TikTok do cliente'), findsOneWidget);
    });

    testWidgets('campo TikTok rejeita formato inválido (1 char)',
        (tester) async {
      setDesktopViewport(tester);
      final mock = _MockContratosNotifier();
      await tester.pumpWidget(_buildApp(contratosMock: mock));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      final field = find.byKey(const ValueKey('contrato_tiktok'));
      await tester.enterText(field, 'a'); // 1 char — abaixo do mínimo
      await tester.pump();
      await tester.pump();

      expect(find.textContaining('Formato inválido'), findsOneWidget);
    });

    testWidgets(
        'auto-fill com tiktokUsername do cliente quando clienteId corresponde',
        (tester) async {
      setDesktopViewport(tester);
      final mock = _MockContratosNotifier();
      await tester.pumpWidget(
        _buildApp(
          contratosMock: mock,
          clientes: const [_clienteComTiktok],
          clienteId: 'c1',
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));

      final field = find.byKey(const ValueKey('contrato_tiktok'));
      final controller = tester.widget<TextFormField>(field).controller;
      expect(controller?.text, 'loja_autofill');
    });

    testWidgets('campo TikTok permite override manual do auto-fill',
        (tester) async {
      setDesktopViewport(tester);
      final mock = _MockContratosNotifier();
      await tester.pumpWidget(
        _buildApp(
          contratosMock: mock,
          clientes: const [_clienteComTiktok],
          clienteId: 'c1',
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));

      final field = find.byKey(const ValueKey('contrato_tiktok'));
      await tester.enterText(field, 'nova_loja_override');
      await tester.pump();

      final controller = tester.widget<TextFormField>(field).controller;
      expect(controller?.text, 'nova_loja_override');
    });
  });
}
