import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../design_system/design_system.dart';
import '../../models/knowledge_article.dart';
import '../../providers/knowledge_provider.dart';
import '../../routes/app_routes.dart';
import '../../widgets/empty_state_widget.dart';
import '../../widgets/knowledge/article_card.dart';
import '../../widgets/skeleton_list.dart';

class KnowledgeCategoryScreen extends ConsumerWidget {
  final String slug;
  const KnowledgeCategoryScreen({super.key, required this.slug});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categoriesAsync = ref.watch(knowledgeCategoriesProvider);
    final articlesAsync = ref.watch(knowledgeArticlesProvider);

    final categories = categoriesAsync.valueOrNull ?? const [];
    final matches = categories.where((c) => c.slug == slug);
    final category = matches.isNotEmpty ? matches.first : null;

    final categoryName = category?.name ?? _slugToName(slug);
    final categoryDesc = category?.description;

    return AppScreenScaffold(
      currentRoute: AppRoutes.knowledgeBase,
      eyebrow: 'CATEGORIA',
      title: categoryName,
      subtitle: categoryDesc,
      actions: [
        AppGhostButton(
          label: 'Voltar',
          icon: PhosphorIcons.arrowLeft(),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
      ],
      child: ListView(
        padding: const EdgeInsets.fromLTRB(28, 4, 28, 32),
        children: [
          articlesAsync.when(
            loading: () => const _Skeleton(),
            error: (e, _) => EmptyStateWidget(
              icon: PhosphorIcons.warningCircle(),
              title: 'Não foi possível carregar os artigos',
              message: e.toString(),
              actionLabel: 'Tentar de novo',
              onAction: () =>
                  ref.read(knowledgeArticlesProvider.notifier).refresh(),
            ),
            data: (articles) {
              final filtered = articles
                  .where((a) =>
                      a.categorySlug == slug &&
                      a.status == KbArticleStatus.published)
                  .toList()
                ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
              if (filtered.isEmpty) {
                return EmptyStateWidget(
                  icon: PhosphorIcons.fileDashed(),
                  title: 'Nenhum artigo nesta categoria',
                  message:
                      'Quando publicarmos novos materiais sobre $categoryName, eles aparecerão aqui.',
                );
              }
              return _Grid(articles: filtered);
            },
          ),
        ],
      ),
    );
  }

  static String _slugToName(String slug) {
    if (slug.isEmpty) return 'Categoria';
    return slug
        .split('-')
        .map((s) =>
            s.isEmpty ? s : '${s[0].toUpperCase()}${s.substring(1)}')
        .join(' ');
  }
}

class _Grid extends StatelessWidget {
  final List<KnowledgeArticle> articles;
  const _Grid({required this.articles});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, constraints) {
      final w = constraints.maxWidth;
      final cols = w >= 1200 ? 3 : (w >= 800 ? 2 : 1);
      return GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: cols,
          crossAxisSpacing: AppSpacing.x4,
          mainAxisSpacing: AppSpacing.x4,
          mainAxisExtent: 360,
        ),
        itemCount: articles.length,
        itemBuilder: (_, i) {
          final a = articles[i];
          return ArticleCard(
            article: a,
            onTap: () => Navigator.of(context).pushNamed(
              '${AppRoutes.knowledgeArticle}/${a.slug}',
            ),
          );
        },
      );
    });
  }
}

class _Skeleton extends StatelessWidget {
  const _Skeleton();

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, constraints) {
      final cols = constraints.maxWidth >= 800 ? 2 : 1;
      return GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: cols,
          crossAxisSpacing: AppSpacing.x4,
          mainAxisSpacing: AppSpacing.x4,
          mainAxisExtent: 360,
        ),
        itemCount: cols * 2,
        itemBuilder: (_, __) => const SkeletonCard(height: 360),
      );
    });
  }
}
