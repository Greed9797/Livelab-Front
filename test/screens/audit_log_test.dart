// ignore_for_file: avoid_print
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:liveshop_saas/livelab/theme/livelab_theme.dart';
import 'package:liveshop_saas/models/audit_log_entry.dart';
import 'package:liveshop_saas/providers/audit_log_provider.dart';
import 'package:liveshop_saas/screens/auditoria/audit_log_screen.dart';
import 'test_helpers.dart';

// ---------------------------------------------------------------------------
// Mock AuditLogNotifier — returns canned data, no network
// ---------------------------------------------------------------------------
class _MockAuditLogNotifier extends AuditLogNotifier {
  final AuditLogPage page;
  _MockAuditLogNotifier(this.page);

  @override
  Future<AuditLogPage> build() async => page;

  Future<void> refresh() async {
    state = AsyncData(page);
  }
}

AuditLogEntry _makeEntry({
  String id = 'e1',
  String action = 'contrato.criado',
  String? autorNome = 'Admin',
}) =>
    AuditLogEntry(
      id: id,
      action: action,
      metadata: const {},
      criadoEm: DateTime(2026, 5, 1, 10, 0),
      autorNome: autorNome,
    );

AuditLogPage _makePage(List<AuditLogEntry> itens) => AuditLogPage(
      itens: itens,
      total: itens.length,
      pagina: 1,
      porPagina: 50,
    );

// ---------------------------------------------------------------------------
// Mock AuditLogFiltrosNotifier — captures state changes
// ---------------------------------------------------------------------------
class _MockFiltrosNotifier extends AuditLogFiltrosNotifier {
  @override
  AuditLogFiltros build() => const AuditLogFiltros();
}

Widget _buildApp({
  required AuditLogPage page,
  String papel = 'auditor',
}) {
  final mockLog = _MockAuditLogNotifier(page);
  return ProviderScope(
    overrides: [
      ...scaffoldOverrides(papel: papel),
      auditLogProvider.overrideWith(() => mockLog),
      auditLogFiltrosProvider.overrideWith(() => _MockFiltrosNotifier()),
    ],
    child: MaterialApp(
      theme: LivelabTheme.light(),
      home: const AuditLogScreen(),
    ),
  );
}

void main() {
  setUpAll(() async {
    // AuditLogScreen uses DateFormat('dd/MM/yyyy', 'pt_BR') — must init locale
    await initializeDateFormatting('pt_BR', null);
  });

  group('AuditLogScreen', () {
    testWidgets('renderiza tela sem erro quando autenticado como auditor',
        (tester) async {
      setDesktopViewport(tester);
      await tester.pumpWidget(_buildApp(page: _makePage([])));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.byType(AuditLogScreen), findsOneWidget);
    });

    testWidgets('exibe tabela com dados mockados', (tester) async {
      setDesktopViewport(tester);
      final entries = [
        _makeEntry(id: 'e1', action: 'contrato.criado', autorNome: 'Fulano'),
        _makeEntry(id: 'e2', action: 'boleto.gerado', autorNome: 'Ciclano'),
      ];
      await tester.pumpWidget(_buildApp(page: _makePage(entries)));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Ações devem aparecer na tabela
      expect(find.textContaining('contrato.criado'), findsWidgets);
      expect(find.textContaining('boleto.gerado'), findsWidgets);
    });

    testWidgets('exibe estado vazio quando não há entradas', (tester) async {
      setDesktopViewport(tester);
      await tester.pumpWidget(_buildApp(page: _makePage([])));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Sem entradas → _EmptyState deve ser exibido
      expect(find.textContaining('Nenhum evento encontrado'), findsOneWidget);
    });

    testWidgets('filtro de ação (dropdown Ação) está presente na tela',
        (tester) async {
      setDesktopViewport(tester);
      await tester.pumpWidget(_buildApp(page: _makePage([])));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // O card de filtros deve conter o label "Ação"
      expect(find.text('Ação'), findsOneWidget);
    });

    testWidgets('filtro de entidade (dropdown Entidade) está presente',
        (tester) async {
      setDesktopViewport(tester);
      await tester.pumpWidget(_buildApp(page: _makePage([])));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Entidade'), findsOneWidget);
    });
  });
}
