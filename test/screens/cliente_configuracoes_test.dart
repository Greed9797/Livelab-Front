// ignore_for_file: avoid_print
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:liveshop_saas/livelab/theme/livelab_theme.dart';
import 'package:liveshop_saas/livelab_v2/screens/config_screen.dart';
import 'package:liveshop_saas/providers/auth_provider.dart';
import 'package:liveshop_saas/providers/cliente_perfil_provider.dart';
import 'test_helpers.dart';

Widget _buildApp({required String papel, ClientePerfil? perfil}) {
  return ProviderScope(
    overrides: [
      ...scaffoldOverrides(papel: papel),
      // Override auth specifically to set the correct papel
      authProvider.overrideWith(() => MockAuthNotifier(papel: papel)),
      clientePerfilProvider.overrideWith((ref) async => perfil),
    ],
    child: MaterialApp(
      theme: LivelabTheme.light(),
      home: const Scaffold(body: ConfigScreen()),
    ),
  );
}

void main() {
  group('ConfigScreen — seção TikTok (W3-A)', () {
    testWidgets('renderiza sem erro para cliente_parceiro', (tester) async {
      setDesktopViewport(tester);
      await tester.pumpWidget(_buildApp(papel: 'cliente_parceiro'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.byType(ConfigScreen), findsOneWidget);
    });

    testWidgets('cliente_parceiro vê seção Conta TikTok', (tester) async {
      setDesktopViewport(tester);
      await tester.pumpWidget(_buildApp(papel: 'cliente_parceiro'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Conta TikTok'), findsOneWidget);
    });

    testWidgets(
        'campo TikTok rejeita username com 1 caractere (mínimo é 2)',
        (tester) async {
      setDesktopViewport(tester);
      await tester.pumpWidget(_buildApp(papel: 'cliente_parceiro'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      final field = find.byKey(const ValueKey('config_tiktok_field'));
      expect(field, findsOneWidget);

      await tester.enterText(field, 'x');
      await tester.pump();
      await tester.pump();

      expect(find.textContaining('Formato inválido'), findsOneWidget);
    });

    testWidgets('campo TikTok aceita username válido sem mensagem de erro',
        (tester) async {
      setDesktopViewport(tester);
      await tester.pumpWidget(_buildApp(papel: 'cliente_parceiro'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      final field = find.byKey(const ValueKey('config_tiktok_field'));
      await tester.enterText(field, 'loja_oficial');
      await tester.pump();
      await tester.pump();

      expect(find.textContaining('Formato inválido'), findsNothing);
    });

    testWidgets(
        'perfil com tiktokUsername pré-preenche o campo automaticamente',
        (tester) async {
      setDesktopViewport(tester);
      await tester.pumpWidget(
        _buildApp(
          papel: 'cliente_parceiro',
          perfil: const ClientePerfil(tiktokUsername: 'minha_loja'),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));

      final field = find.byKey(const ValueKey('config_tiktok_field'));
      expect(field, findsOneWidget);
      final controller = tester.widget<TextFormField>(field).controller;
      expect(controller?.text, 'minha_loja');
    });

    testWidgets(
        'franqueador_master NÃO vê seção Conta TikTok', (tester) async {
      setDesktopViewport(tester);
      await tester.pumpWidget(_buildApp(papel: 'franqueador_master'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Conta TikTok'), findsNothing);
    });
  });
}
