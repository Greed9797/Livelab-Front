import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:liveshop_saas/design_system/app_theme.dart';
import 'package:liveshop_saas/livelab/theme/tokens.dart';
import 'package:liveshop_saas/models/knowledge_article.dart';
import 'package:liveshop_saas/models/knowledge_category.dart';
import 'package:liveshop_saas/widgets/knowledge/article_card.dart';
import 'package:liveshop_saas/widgets/knowledge/category_card.dart';
import 'package:liveshop_saas/widgets/knowledge/markdown_renderer.dart';

void main() {
  testWidgets('dark mode KB text uses LlTokens, not light-theme black',
      (tester) async {
    const dark = LlTokens.dark;
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.dark,
        home: Scaffold(
          body: ListView(
            children: [
              CategoryCard(
                category: const KnowledgeCategory(
                  id: 'c1',
                  name: 'Operação de cabine',
                  slug: 'ops',
                  description: 'Checklists e rotinas de cabine',
                ),
                articleCount: 2,
              ),
              ArticleCard(
                article: KnowledgeArticle(
                  id: 'a1',
                  titulo: 'Checklist pré-live',
                  slug: 'checklist',
                  excerpt: 'O que validar antes de ir ao ar',
                  contentMarkdown: '',
                  status: KbArticleStatus.published,
                ),
              ),
              const MarkdownRenderer(
                data: '## Antes de abrir\n\n1. Conferir cabine',
              ),
            ],
          ),
        ),
      ),
    );
    await tester.pump();

    TextStyle? styleOf(String text) =>
        tester.widget<Text>(find.text(text)).style;

    expect(styleOf('Operação de cabine')?.color, dark.textPrimary);
    expect(styleOf('Checklists e rotinas de cabine')?.color, dark.textSecondary);
    expect(styleOf('Checklist pré-live')?.color, dark.textPrimary);
    expect(styleOf('O que validar antes de ir ao ar')?.color, dark.textSecondary);
    expect(styleOf('Operação de cabine')?.color, isNot(const Color(0xFF1A1A1A)));
    expect(styleOf('Checklists e rotinas de cabine')?.color, isNot(const Color(0xFF4A4A4A)));
  });
}
