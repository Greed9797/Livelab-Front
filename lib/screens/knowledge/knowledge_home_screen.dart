import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../design_system/design_system.dart';
import '../../models/knowledge_article.dart';
import '../../models/knowledge_category.dart';
import '../../providers/auth_provider.dart';
import '../../providers/knowledge_provider.dart';
import '../../routes/app_routes.dart';
import '../../widgets/empty_state_widget.dart';
import '../../widgets/knowledge/article_card.dart';
import '../../widgets/knowledge/category_card.dart';
import '../../widgets/skeleton_list.dart';

class KnowledgeHomeScreen extends ConsumerStatefulWidget {
  const KnowledgeHomeScreen({super.key});

  @override
  ConsumerState<KnowledgeHomeScreen> createState() =>
      _KnowledgeHomeScreenState();
}

class _KnowledgeHomeScreenState extends ConsumerState<KnowledgeHomeScreen> {
  final TextEditingController _searchCtrl = TextEditingController();
  Timer? _debounce;
  String _query = '';

  @override
  void dispose() {
    _debounce?.cancel();
    _searchCtrl.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () {
      if (mounted) setState(() => _query = value.trim());
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final isMaster = auth.user?.papel == 'franqueador_master' ||
        auth.user?.papel == 'admin_master';

    return AppScreenScaffold(
      currentRoute: AppRoutes.knowledgeBase,
      eyebrow: 'CENTRAL DE AJUDA',
      title: 'Base de Conhecimento',
      titleSerif: true,
      subtitle:
          'Tutoriais, manuais e respostas rápidas para dominar a plataforma.',
      actions: [
        if (isMaster) ...[
          AppGhostButton(
            label: 'Categorias',
            icon: PhosphorIcons.folders(),
            onPressed: () => Navigator.of(context)
                .pushNamed(AppRoutes.adminKnowledgeCategories),
          ),
          const SizedBox(width: AppSpacing.x2),
          AppPrimaryButton(
            label: 'Novo artigo',
            icon: PhosphorIcons.plus(),
            onPressed: () =>
                Navigator.of(context).pushNamed(AppRoutes.adminKnowledgeNew),
          ),
        ],
      ],
      child: ListView(
        padding: const EdgeInsets.fromLTRB(28, 4, 28, 32),
        children: [
          _SearchBar(
            controller: _searchCtrl,
            onChanged: _onSearchChanged,
            onClear: () {
              _searchCtrl.clear();
              setState(() => _query = '');
            },
          ),
          const SizedBox(height: AppSpacing.x6),
          if (_query.length >= 2)
            _SearchResults(query: _query)
          else
            _BrowseContent(isMaster: isMaster),
        ],
      ),
    );
  }
}

class _SearchBar extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final VoidCallback onClear;

  const _SearchBar({
    required this.controller,
    required this.onChanged,
    required this.onClear,
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.x4,
        vertical: AppSpacing.x2,
      ),
      child: Row(
        children: [
          Icon(PhosphorIcons.magnifyingGlass(),
              size: 18, color: AppColors.textSecondary),
          const SizedBox(width: AppSpacing.x3),
          Expanded(
            child: TextField(
              controller: controller,
              onChanged: onChanged,
              style: AppTypography.bodyMedium,
              decoration: const InputDecoration(
                hintText: 'Busque por título, tag ou conteúdo…',
                isDense: true,
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
              ),
            ),
          ),
          if (controller.text.isNotEmpty)
            IconButton(
              icon: Icon(PhosphorIcons.x(), size: 16),
              color: AppColors.textSecondary,
              tooltip: 'Limpar',
              onPressed: onClear,
            ),
        ],
      ),
    );
  }
}

class _BrowseContent extends ConsumerWidget {
  final bool isMaster;
  const _BrowseContent({required this.isMaster});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categoriesAsync = ref.watch(knowledgeCategoriesProvider);
    final articlesAsync = ref.watch(knowledgeArticlesProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Categorias',
            style: AppTypography.h2.copyWith(color: AppColors.textPrimary)),
        const SizedBox(height: AppSpacing.x4),
        categoriesAsync.when(
          loading: () => const _CategoriesSkeleton(),
          error: (e, _) => EmptyStateWidget(
            icon: PhosphorIcons.warningCircle(),
            title: 'Não foi possível carregar as categorias',
            message: e.toString(),
            actionLabel: 'Tentar de novo',
            onAction: () => ref
                .read(knowledgeCategoriesProvider.notifier)
                .refresh(),
          ),
          data: (categories) {
            if (categories.isEmpty) {
              return EmptyStateWidget(
                icon: PhosphorIcons.folder(),
                title: 'Nenhuma categoria por enquanto',
                message: isMaster
                    ? 'Crie a primeira categoria para começar a organizar artigos.'
                    : 'Em breve você verá aqui materiais organizados por tema.',
              );
            }
            final articles = articlesAsync.valueOrNull ?? const [];
            final countBySlug = <String, int>{};
            for (final a in articles) {
              if (a.status != KbArticleStatus.published) continue;
              final slug = a.categorySlug;
              if (slug == null) continue;
              countBySlug[slug] = (countBySlug[slug] ?? 0) + 1;
            }
            return _CategoryGrid(
              categories: categories,
              countBySlug: countBySlug,
            );
          },
        ),
        const SizedBox(height: AppSpacing.x8),
        Text('Destaques',
            style: AppTypography.h2.copyWith(color: AppColors.textPrimary)),
        const SizedBox(height: AppSpacing.x4),
        articlesAsync.when(
          loading: () => const _ArticlesSkeleton(),
          error: (e, _) => EmptyStateWidget(
            icon: PhosphorIcons.warningCircle(),
            title: 'Não foi possível carregar os artigos',
            message: e.toString(),
            actionLabel: 'Tentar de novo',
            onAction: () =>
                ref.read(knowledgeArticlesProvider.notifier).refresh(),
          ),
          data: (articles) {
            final published = articles
                .where((a) => a.status == KbArticleStatus.published)
                .toList();
            final destaques =
                published.where((a) => a.destaque).toList();
            final picks = destaques.isNotEmpty
                ? destaques
                : (published.length > 6 ? published.sublist(0, 6) : published);
            if (picks.isEmpty) {
              return EmptyStateWidget(
                icon: PhosphorIcons.bookOpen(),
                title: 'Ainda não há artigos publicados',
                message: isMaster
                    ? 'Comece criando o primeiro artigo da Base de Conhecimento.'
                    : 'Volte em breve — nosso time está organizando o conteúdo.',
                actionLabel: isMaster ? 'Novo artigo' : null,
                onAction: isMaster
                    ? () => Navigator.of(context)
                        .pushNamed(AppRoutes.adminKnowledgeNew)
                    : null,
              );
            }
            return _ArticleGrid(articles: picks);
          },
        ),
      ],
    );
  }
}

class _CategoryGrid extends StatelessWidget {
  final List<KnowledgeCategory> categories;
  final Map<String, int> countBySlug;

  const _CategoryGrid({
    required this.categories,
    required this.countBySlug,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, constraints) {
      final w = constraints.maxWidth;
      final cols = w >= 1200 ? 4 : (w >= 800 ? 3 : (w >= 520 ? 2 : 1));
      return GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: cols,
          crossAxisSpacing: AppSpacing.x4,
          mainAxisSpacing: AppSpacing.x4,
          mainAxisExtent: 220,
        ),
        itemCount: categories.length,
        itemBuilder: (_, i) {
          final cat = categories[i];
          return CategoryCard(
            category: cat,
            articleCount: countBySlug[cat.slug] ?? 0,
            onTap: () => Navigator.of(context).pushNamed(
              '${AppRoutes.knowledgeCategory}/${cat.slug}',
            ),
          );
        },
      );
    });
  }
}

class _ArticleGrid extends StatelessWidget {
  final List<KnowledgeArticle> articles;
  const _ArticleGrid({required this.articles});

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

class _SearchResults extends ConsumerWidget {
  final String query;
  const _SearchResults({required this.query});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncValue = ref.watch(knowledgeSearchProvider(query));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Resultados para "$query"',
          style: AppTypography.h3.copyWith(color: AppColors.textPrimary),
        ),
        const SizedBox(height: AppSpacing.x4),
        asyncValue.when(
          loading: () => const _ArticlesSkeleton(),
          error: (e, _) => EmptyStateWidget(
            icon: PhosphorIcons.warningCircle(),
            title: 'Erro ao buscar',
            message: e.toString(),
          ),
          data: (results) {
            if (results.isEmpty) {
              return EmptyStateWidget(
                icon: PhosphorIcons.magnifyingGlass(),
                title: 'Nada encontrado',
                message:
                    'Tente outras palavras-chave ou explore as categorias.',
              );
            }
            return _ArticleGrid(articles: results);
          },
        ),
      ],
    );
  }
}

class _CategoriesSkeleton extends StatelessWidget {
  const _CategoriesSkeleton();

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, constraints) {
      final cols = constraints.maxWidth >= 800 ? 3 : 2;
      return GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: cols,
          crossAxisSpacing: AppSpacing.x4,
          mainAxisSpacing: AppSpacing.x4,
          mainAxisExtent: 220,
        ),
        itemCount: cols * 2,
        itemBuilder: (_, __) => const SkeletonCard(height: 220),
      );
    });
  }
}

class _ArticlesSkeleton extends StatelessWidget {
  const _ArticlesSkeleton();

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
