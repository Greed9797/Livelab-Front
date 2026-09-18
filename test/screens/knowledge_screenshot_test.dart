// Screenshot harness for Flutter KB dark UI — writes PNGs for Project media.
// ignore_for_file: avoid_print
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:liveshop_saas/livelab/theme/livelab_theme.dart';
import 'package:liveshop_saas/models/knowledge_article.dart';
import 'package:liveshop_saas/models/knowledge_category.dart';
import 'package:liveshop_saas/providers/knowledge_provider.dart';
import 'package:liveshop_saas/routes/app_routes.dart';
import 'package:liveshop_saas/screens/knowledge/admin_categories_screen.dart';
import 'package:liveshop_saas/screens/knowledge/knowledge_article_screen.dart';
import 'package:liveshop_saas/screens/knowledge/knowledge_home_screen.dart';

import 'test_helpers.dart';

const _outDir =
    '/cursor/stores/bc-bc80dd72-8325-4787-8220-fedc9d8e955f/media';

KnowledgeCategory _cat({
  required String id,
  required String name,
  required String slug,
  int? count,
}) =>
    KnowledgeCategory(
      id: id,
      name: name,
      slug: slug,
      description: 'Materiais de $name',
      sortOrder: 0,
      articleCount: count,
    );

KnowledgeArticle _article({
  required String id,
  required String slug,
  required String titulo,
  String? categorySlug,
  String? categoryName,
  String excerpt = 'Resumo curto do material.',
}) =>
    KnowledgeArticle(
      id: id,
      titulo: titulo,
      slug: slug,
      excerpt: excerpt,
      contentMarkdown:
          '## Como fazer\n\nPasso a passo operacional para a unidade.\n\n1. Preparar cabine\n2. Validar GMV\n3. Encerrar live\n',
      categorySlug: categorySlug,
      categoryName: categoryName,
      status: KbArticleStatus.published,
      destaque: true,
      estimatedReadMinutes: 4,
      atualizadoEm: DateTime(2026, 9, 10),
    );

class _Cats extends KnowledgeCategoriesNotifier {
  final List<KnowledgeCategory> data;
  _Cats(this.data);
  @override
  Future<List<KnowledgeCategory>> build() async => data;
}

class _Arts extends KnowledgeArticlesNotifier {
  final List<KnowledgeArticle> data;
  _Arts(this.data);
  @override
  Future<List<KnowledgeArticle>> build() async => data;
}

class _Filter extends KnowledgeArticlesFilterNotifier {
  @override
  KnowledgeArticlesFilter build() => const KnowledgeArticlesFilter();
}

class _ArticleBySlug extends KnowledgeArticleBySlugNotifier {
  final KnowledgeArticle article;
  _ArticleBySlug(this.article);
  @override
  Future<KnowledgeArticle> build(String slug) async => article;
}

final _cats = [
  _cat(id: '1', name: 'Operação de cabine', slug: 'ops', count: 2),
  _cat(id: '2', name: 'Onboarding', slug: 'onboarding', count: 1),
];
final _arts = [
  _article(
    id: 'a1',
    slug: 'checklist-pre-live',
    titulo: 'Checklist pré-live',
    categorySlug: 'ops',
    categoryName: 'Operação de cabine',
    excerpt: 'O que validar 15 minutos antes de ir ao ar',
  ),
  _article(
    id: 'a2',
    slug: 'encerramento-gmv',
    titulo: 'Encerramento e GMV',
    categorySlug: 'ops',
    categoryName: 'Operação de cabine',
    excerpt: 'Como registrar resultado e fechar a sessão',
  ),
];

Widget _wrap({
  required Widget child,
  required String papel,
  List<Override> extra = const [],
}) {
  return ProviderScope(
    overrides: [
      ...scaffoldOverrides(papel: papel),
      ...extra,
    ],
    child: MaterialApp(
      theme: LivelabTheme.dark(),
      debugShowCheckedModeBanner: false,
      home: child,
      routes: {
        AppRoutes.adminKnowledgeCategories: (_) =>
            const Scaffold(body: Text('cats')),
        AppRoutes.adminKnowledgeNew: (_) =>
            const Scaffold(body: Text('new')),
        AppRoutes.knowledgeBase: (_) => const Scaffold(body: Text('kb')),
      },
    ),
  );
}

Future<void> _copyGolden(String name, {String? asName}) async {
  final src = File('${Directory.current.path}/test/screens/goldens/$name');
  final destName = asName ?? name;
  await src.copy('$_outDir/$destName');
  print('Copied ${src.path} -> $_outDir/$destName (${src.lengthSync()} bytes)');
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() {
    Directory(_outDir).createSync(recursive: true);
    Directory('${Directory.current.path}/test/screens/goldens')
        .createSync(recursive: true);
  });

  testWidgets('golden: kb home CTAs + list', (tester) async {
    setDesktopViewport(tester, size: const Size(1440, 960));
    await tester.pumpWidget(_wrap(
      papel: 'franqueador_master',
      child: const KnowledgeHomeScreen(),
      extra: [
        knowledgeCategoriesProvider.overrideWith(() => _Cats(_cats)),
        knowledgeArticlesProvider.overrideWith(() => _Arts(_arts)),
        knowledgeArticlesFilterProvider.overrideWith(() => _Filter()),
      ],
    ));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('Gerenciar categorias'), findsOneWidget);
    await expectLater(
      find.byType(MaterialApp),
      matchesGoldenFile('goldens/kb-master-ctas.png'),
    );
    await _copyGolden('kb-master-ctas.png');
    await _copyGolden('kb-master-ctas.png', asName: 'kb-list.png');
  });

  testWidgets('golden: kb reader', (tester) async {
    setDesktopViewport(tester, size: const Size(1440, 960));
    await tester.pumpWidget(_wrap(
      papel: 'franqueador_master',
      child: KnowledgeArticleScreen(slug: _arts.first.slug),
      extra: [
        knowledgeArticleBySlugProvider
            .overrideWith(() => _ArticleBySlug(_arts.first)),
        knowledgeArticlesProvider.overrideWith(() => _Arts(_arts)),
        knowledgeArticlesFilterProvider.overrideWith(() => _Filter()),
      ],
    ));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('Editar'), findsOneWidget);
    await expectLater(
      find.byType(MaterialApp),
      matchesGoldenFile('goldens/kb-reader.png'),
    );
    await _copyGolden('kb-reader.png');
  });

  testWidgets('golden: kb categories admin', (tester) async {
    setDesktopViewport(tester, size: const Size(1440, 960));
    await tester.pumpWidget(_wrap(
      papel: 'franqueador_master',
      child: const AdminKnowledgeCategoriesScreen(),
      extra: [
        knowledgeCategoriesProvider.overrideWith(() => _Cats(_cats)),
      ],
    ));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('Nova categoria'), findsOneWidget);
    await expectLater(
      find.byType(MaterialApp),
      matchesGoldenFile('goldens/kb-categories-admin.png'),
    );
    await _copyGolden('kb-categories-admin.png');
  });
}
