import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../design_system/design_system.dart';
import '../../models/knowledge_article.dart';
import '../../providers/auth_provider.dart';
import '../../providers/knowledge_provider.dart';
import '../../routes/app_routes.dart';
import '../../widgets/empty_state_widget.dart';
import '../../widgets/knowledge/markdown_renderer.dart';
import '../../widgets/knowledge/video_block.dart';
import '../../widgets/skeleton_list.dart';

class KnowledgeArticleScreen extends ConsumerWidget {
  final String slug;
  const KnowledgeArticleScreen({super.key, required this.slug});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final isMaster = auth.user?.papel == 'franqueador_master' ||
        auth.user?.papel == 'admin_master';

    final asyncValue = ref.watch(knowledgeArticleBySlugProvider(slug));

    return AppScreenScaffold(
      currentRoute: AppRoutes.knowledgeBase,
      title: asyncValue.valueOrNull?.titulo ?? 'Artigo',
      titleSerif: true,
      eyebrow: asyncValue.valueOrNull?.categoryName?.toUpperCase() ??
          'BASE DE CONHECIMENTO',
      actions: [
        AppGhostButton(
          label: 'Voltar',
          icon: PhosphorIcons.arrowLeft(),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        const SizedBox(width: AppSpacing.x2),
        AppGhostButton(
          label: 'Copiar link',
          icon: PhosphorIcons.link(),
          onPressed: () async {
            final article = asyncValue.valueOrNull;
            if (article == null) return;
            final link = '/conhecimento/a/${article.slug}';
            await Clipboard.setData(ClipboardData(text: link));
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Link copiado')),
              );
            }
          },
        ),
        if (isMaster) ...[
          const SizedBox(width: AppSpacing.x2),
          AppPrimaryButton(
            label: 'Editar',
            icon: PhosphorIcons.pencilSimple(),
            onPressed: () {
              final article = asyncValue.valueOrNull;
              if (article == null) return;
              Navigator.of(context).pushNamed(
                '${AppRoutes.adminKnowledgeEdit}/${article.id}',
                arguments: article,
              );
            },
          ),
        ],
      ],
      child: asyncValue.when(
        loading: () => const _ArticleSkeleton(),
        error: (e, _) => EmptyStateWidget(
          icon: PhosphorIcons.warningCircle(),
          title: 'Artigo indisponível',
          message: e.toString(),
          actionLabel: 'Voltar',
          onAction: () => Navigator.of(context).maybePop(),
        ),
        data: (article) => _ArticleBody(article: article),
      ),
    );
  }
}

class _ArticleBody extends ConsumerWidget {
  final KnowledgeArticle article;
  const _ArticleBody({required this.article});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final updated = article.atualizadoEm;
    final updatedLabel = updated != null
        ? 'Atualizado em ${_formatDate(updated)}'
        : null;

    // Buscar artigos da mesma categoria pra navegação ant/prox
    final siblings = article.categorySlug != null
        ? ref.watch(knowledgeArticlesProvider).valueOrNull?.where((a) =>
            a.categorySlug == article.categorySlug &&
            a.status == KbArticleStatus.published).toList()
        : null;
    KnowledgeArticle? prev;
    KnowledgeArticle? next;
    if (siblings != null && siblings.length > 1) {
      siblings.sort((a, b) {
        final cmp = a.sortOrder.compareTo(b.sortOrder);
        if (cmp != 0) return cmp;
        return (a.publishedAt ?? DateTime(0))
            .compareTo(b.publishedAt ?? DateTime(0));
      });
      final idx = siblings.indexWhere((a) => a.id == article.id);
      if (idx > 0) prev = siblings[idx - 1];
      if (idx >= 0 && idx < siblings.length - 1) next = siblings[idx + 1];
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(28, 4, 28, 48),
      children: [
        // Meta
        Wrap(
          spacing: AppSpacing.x3,
          runSpacing: AppSpacing.x2,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            if (article.categoryName != null &&
                article.categoryName!.trim().isNotEmpty)
              AppBadge(
                label: article.categoryName!.toUpperCase(),
                type: AppBadgeType.neutral,
                showDot: false,
              ),
            if (article.estimatedReadMinutes != null)
              _MetaItem(
                icon: PhosphorIcons.clock(),
                label: '${article.estimatedReadMinutes} min de leitura',
              ),
            if (updatedLabel != null)
              _MetaItem(
                icon: PhosphorIcons.calendarBlank(),
                label: updatedLabel,
              ),
            if (article.status == KbArticleStatus.draft)
              const AppBadge(
                  label: 'RASCUNHO',
                  type: AppBadgeType.warning,
                  showDot: false),
            if (article.status == KbArticleStatus.archived)
              const AppBadge(
                  label: 'ARQUIVADO',
                  type: AppBadgeType.neutral,
                  showDot: false),
          ],
        ),
        const SizedBox(height: AppSpacing.x6),

        // Vídeo (se houver)
        VideoBlock(
          provider: article.videoProvider,
          url: article.videoUrl,
        ),

        // Cover (sem vídeo) — render acima do conteúdo
        if (article.videoProvider == KbVideoProvider.none &&
            article.coverImageUrl != null &&
            article.coverImageUrl!.trim().isNotEmpty) ...[
          ClipRRect(
            borderRadius: AppRadius.xlR,
            child: AspectRatio(
              aspectRatio: 16 / 9,
              child: Image.network(
                article.coverImageUrl!,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  color: AppColors.bgMuted,
                ),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.x6),
        ],

        // Excerpt como lead paragraph
        if (article.excerpt != null && article.excerpt!.trim().isNotEmpty) ...[
          Text(
            article.excerpt!,
            style: AppTypography.bodyLarge.copyWith(
              color: AppColors.textSecondary,
              fontSize: 18,
              height: 1.6,
            ),
          ),
          const SizedBox(height: AppSpacing.x4),
          const Divider(color: AppColors.borderLight, height: 1),
          const SizedBox(height: AppSpacing.x4),
        ],

        // Markdown content
        if (article.contentMarkdown.trim().isNotEmpty)
          MarkdownRenderer(data: article.contentMarkdown)
        else
          EmptyStateWidget(
            icon: PhosphorIcons.fileDashed(),
            title: 'Sem conteúdo',
            message: 'Este artigo ainda não tem conteúdo escrito.',
          ),

        const SizedBox(height: AppSpacing.x6),

        // Tags
        if (article.tags.isNotEmpty) ...[
          const Divider(color: AppColors.borderLight, height: 1),
          const SizedBox(height: AppSpacing.x4),
          Wrap(
            spacing: AppSpacing.x2,
            runSpacing: AppSpacing.x2,
            children: article.tags
                .map(
                  (t) => Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.x3,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.bgMuted,
                      borderRadius: AppRadius.fullR,
                    ),
                    child: Text(
                      '#$t',
                      style: AppTypography.caption
                          .copyWith(color: AppColors.textSecondary),
                    ),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: AppSpacing.x6),
        ],

        // Navegação anterior/próximo (mesma categoria)
        if (prev != null || next != null) ...[
          const Divider(color: AppColors.borderLight, height: 1),
          const SizedBox(height: AppSpacing.x4),
          Row(
            children: [
              Expanded(
                child: prev != null
                    ? _NavCard(
                        article: prev,
                        label: 'Anterior',
                        icon: PhosphorIcons.arrowLeft(),
                        alignment: CrossAxisAlignment.start,
                      )
                    : const SizedBox.shrink(),
              ),
              const SizedBox(width: AppSpacing.x3),
              Expanded(
                child: next != null
                    ? _NavCard(
                        article: next,
                        label: 'Próximo',
                        icon: PhosphorIcons.arrowRight(),
                        alignment: CrossAxisAlignment.end,
                      )
                    : const SizedBox.shrink(),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.x6),
        ],

        // Footer — voltar para categoria
        if (article.categorySlug != null &&
            article.categorySlug!.isNotEmpty)
          Center(
            child: AppGhostButton(
              label: 'Ver mais em ${article.categoryName ?? "esta categoria"}',
              icon: PhosphorIcons.arrowRight(),
              onPressed: () => Navigator.of(context).pushReplacementNamed(
                '${AppRoutes.knowledgeCategory}/${article.categorySlug}',
              ),
            ),
          ),
      ],
    );
  }

  static String _formatDate(DateTime d) {
    const months = [
      'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
      'jul', 'ago', 'set', 'out', 'nov', 'dez',
    ];
    final m = months[(d.month - 1).clamp(0, 11)];
    return '${d.day.toString().padLeft(2, '0')} de $m de ${d.year}';
  }
}

class _NavCard extends StatelessWidget {
  final KnowledgeArticle article;
  final String label;
  final IconData icon;
  final CrossAxisAlignment alignment;

  const _NavCard({
    required this.article,
    required this.label,
    required this.icon,
    required this.alignment,
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: () => Navigator.of(context).pushReplacementNamed(
        '${AppRoutes.knowledgeArticle}/${article.slug}',
      ),
      padding: const EdgeInsets.all(AppSpacing.x4),
      child: Column(
        crossAxisAlignment: alignment,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (alignment == CrossAxisAlignment.start) ...[
                Icon(icon, size: 14, color: AppColors.textMuted),
                const SizedBox(width: 4),
              ],
              Text(label.toUpperCase(),
                  style: AppTypography.caption.copyWith(
                      color: AppColors.textMuted,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.5)),
              if (alignment == CrossAxisAlignment.end) ...[
                const SizedBox(width: 4),
                Icon(icon, size: 14, color: AppColors.textMuted),
              ],
            ],
          ),
          const SizedBox(height: 4),
          Text(article.titulo,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              textAlign: alignment == CrossAxisAlignment.end
                  ? TextAlign.right
                  : TextAlign.left,
              style: AppTypography.bodyMedium
                  .copyWith(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

class _MetaItem extends StatelessWidget {
  final IconData icon;
  final String label;

  const _MetaItem({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: AppColors.textMuted),
        const SizedBox(width: 6),
        Text(label,
            style: AppTypography.caption
                .copyWith(color: AppColors.textMuted)),
      ],
    );
  }
}

class _ArticleSkeleton extends StatelessWidget {
  const _ArticleSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(28, 4, 28, 48),
      children: const [
        SkeletonCard(height: 24),
        SizedBox(height: AppSpacing.x4),
        SkeletonCard(height: 320),
        SizedBox(height: AppSpacing.x6),
        SkeletonCard(height: 18),
        SizedBox(height: AppSpacing.x2),
        SkeletonCard(height: 18),
        SizedBox(height: AppSpacing.x2),
        SkeletonCard(height: 18),
      ],
    );
  }
}
