// ignore_for_file: avoid_print
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:liveshop_saas/livelab/theme/livelab_theme.dart';
import 'package:liveshop_saas/models/knowledge_article.dart';
import 'package:liveshop_saas/providers/knowledge_provider.dart';
import 'package:liveshop_saas/screens/knowledge/knowledge_article_screen.dart';
import 'package:liveshop_saas/routes/app_routes.dart';
import 'test_helpers.dart';


// ---------------------------------------------------------------------------
// Helpers to build mock articles
// ---------------------------------------------------------------------------
KnowledgeArticle _makeArticle({
  String slug = 'test-article',
  String titulo = 'Artigo de Teste',
  String contentMarkdown = '## Seção\n\nConteúdo de exemplo.',
  KbVideoProvider videoProvider = KbVideoProvider.none,
  String? videoUrl,
  String? categoryName = 'CATEGORIA TESTE',
}) =>
    KnowledgeArticle(
      id: 'art_01',
      titulo: titulo,
      slug: slug,
      contentMarkdown: contentMarkdown,
      videoProvider: videoProvider,
      videoUrl: videoUrl,
      categoryName: categoryName,
      status: KbArticleStatus.published,
    );

// Mock the slug-based family provider
class _MockArticleBySlugNotifier
    extends KnowledgeArticleBySlugNotifier {
  final KnowledgeArticle? article;
  final Object? error;
  _MockArticleBySlugNotifier({this.article, this.error});

  @override
  Future<KnowledgeArticle> build(String slug) async {
    if (error != null) throw error!;
    if (article != null) return article!;
    throw Exception('Artigo não encontrado');
  }
}

Widget _buildApp({
  required String slug,
  KnowledgeArticle? article,
  Object? articleError,
  String papel = 'franqueado',
}) {
  return ProviderScope(
    overrides: [
      ...scaffoldOverrides(papel: papel),
      knowledgeArticleBySlugProvider.overrideWith(
        () => _MockArticleBySlugNotifier(article: article, error: articleError),
      ),
      // Also stub knowledgeArticlesProvider and filter to avoid network
      knowledgeArticlesProvider.overrideWith(
        () => _MockArticlesListNotifier(),
      ),
      knowledgeArticlesFilterProvider.overrideWith(
        () => _MockArticlesFilterNotifier(),
      ),
    ],
    child: MaterialApp(
      theme: LivelabTheme.light(),
      routes: {
        AppRoutes.knowledgeBase: (_) =>
            const Scaffold(body: Text('KnowledgeBase')),
      },
      home: KnowledgeArticleScreen(slug: slug),
    ),
  );
}

class _MockArticlesListNotifier extends KnowledgeArticlesNotifier {
  @override
  Future<List<KnowledgeArticle>> build() async => const [];
}

class _MockArticlesFilterNotifier extends KnowledgeArticlesFilterNotifier {
  @override
  KnowledgeArticlesFilter build() => const KnowledgeArticlesFilter();
}

void main() {
  group('KnowledgeArticleScreen', () {
    testWidgets('renderiza título do artigo quando dados carregam',
        (tester) async {
      setDesktopViewport(tester);
      final article = _makeArticle();
      await tester.pumpWidget(
          _buildApp(slug: article.slug, article: article));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Artigo de Teste'), findsWidgets);
    });

    testWidgets('renderiza conteúdo markdown', (tester) async {
      setDesktopViewport(tester);
      final article = _makeArticle(
        contentMarkdown: '## Seção\n\nConteúdo de exemplo.',
      );
      await tester.pumpWidget(
          _buildApp(slug: article.slug, article: article));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // O MarkdownRenderer renderiza o texto do markdown na árvore de widgets
      expect(find.textContaining('Conteúdo de exemplo'), findsOneWidget);
    });

    testWidgets(
        'franqueador_master vê botão Editar',
        (tester) async {
      setDesktopViewport(tester);
      final article = _makeArticle();
      await tester.pumpWidget(
          _buildApp(slug: article.slug, article: article, papel: 'franqueador_master'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.text('Editar'), findsOneWidget);
    });

    testWidgets(
        'franqueado NÃO vê botão Editar',
        (tester) async {
      setDesktopViewport(tester);
      final article = _makeArticle();
      await tester.pumpWidget(
          _buildApp(slug: article.slug, article: article, papel: 'franqueado'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.text('Editar'), findsNothing);
    });

    testWidgets('botão Copiar link está presente para todos os papéis',
        (tester) async {
      setDesktopViewport(tester);
      final article = _makeArticle();
      await tester.pumpWidget(
          _buildApp(slug: article.slug, article: article, papel: 'franqueado'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Copiar link'), findsOneWidget);
    });

    testWidgets('exibe mensagem de erro quando artigo não é encontrado',
        (tester) async {
      setDesktopViewport(tester);
      await tester.pumpWidget(
        _buildApp(
          slug: 'slug-invalido',
          articleError: Exception('Artigo não encontrado'),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Artigo indisponível'), findsOneWidget);
    });

    testWidgets('VideoBlock não aparece quando video_provider é none',
        (tester) async {
      setDesktopViewport(tester);
      final article = _makeArticle(videoProvider: KbVideoProvider.none);
      await tester.pumpWidget(
          _buildApp(slug: article.slug, article: article));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // VideoBlock fica oculto quando provider == none
      // Verificamos que o widget de vídeo não renderiza conteúdo visivelmente
      expect(find.byType(AspectRatio), findsNothing);
    });
  });
}
