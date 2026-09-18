// ignore_for_file: avoid_print
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:liveshop_saas/livelab/theme/livelab_theme.dart';
import 'package:liveshop_saas/models/knowledge_article.dart';
import 'package:liveshop_saas/models/knowledge_category.dart';
import 'package:liveshop_saas/providers/knowledge_provider.dart';
import 'package:liveshop_saas/routes/app_routes.dart';
import 'package:liveshop_saas/screens/knowledge/knowledge_home_screen.dart';
import 'test_helpers.dart';

class _MockCategoriesNotifier extends KnowledgeCategoriesNotifier {
  final List<KnowledgeCategory> data;
  _MockCategoriesNotifier([this.data = const []]);

  @override
  Future<List<KnowledgeCategory>> build() async => data;
}

class _MockArticlesNotifier extends KnowledgeArticlesNotifier {
  @override
  Future<List<KnowledgeArticle>> build() async => const [];
}

class _MockArticlesFilterNotifier extends KnowledgeArticlesFilterNotifier {
  @override
  KnowledgeArticlesFilter build() => const KnowledgeArticlesFilter();
}

Widget _buildHome({required String papel}) {
  return ProviderScope(
    overrides: [
      ...scaffoldOverrides(papel: papel),
      knowledgeCategoriesProvider.overrideWith(() => _MockCategoriesNotifier()),
      knowledgeArticlesProvider.overrideWith(() => _MockArticlesNotifier()),
      knowledgeArticlesFilterProvider
          .overrideWith(() => _MockArticlesFilterNotifier()),
    ],
    child: MaterialApp(
      theme: LivelabTheme.dark(),
      routes: {
        AppRoutes.adminKnowledgeCategories: (_) =>
            const Scaffold(body: Text('AdminCategories')),
        AppRoutes.adminKnowledgeNew: (_) =>
            const Scaffold(body: Text('AdminNew')),
      },
      home: const KnowledgeHomeScreen(),
    ),
  );
}

void main() {
  testWidgets('master sees Gerenciar categorias + Novo artigo CTAs',
      (tester) async {
    setDesktopViewport(tester);
    await tester.pumpWidget(_buildHome(papel: 'franqueador_master'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('Base de Conhecimento'), findsOneWidget);
    expect(find.text('Gerenciar categorias'), findsOneWidget);
    expect(find.text('Novo artigo'), findsWidgets);
    expect(find.text('Nova categoria'), findsOneWidget);
  });

  testWidgets('non-master does not see category management CTAs',
      (tester) async {
    setDesktopViewport(tester);
    await tester.pumpWidget(_buildHome(papel: 'franqueado'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('Gerenciar categorias'), findsNothing);
    expect(find.text('Novo artigo'), findsNothing);
    expect(find.text('Nova categoria'), findsNothing);
  });
}
