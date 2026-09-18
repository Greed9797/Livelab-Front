import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../design_system/design_system.dart';
import '../../livelab/theme/livelab_theme.dart';
import '../../models/knowledge_article.dart';

/// Card de artigo da Knowledge Base.
class ArticleCard extends StatelessWidget {
  final KnowledgeArticle article;
  final VoidCallback? onTap;

  const ArticleCard({
    super.key,
    required this.article,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    final coverUrl = article.coverImageUrl;
    final hasCover = coverUrl != null && coverUrl.trim().isNotEmpty;

    return AppCard(
      padding: EdgeInsets.zero,
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (hasCover)
            ClipRRect(
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(AppRadius.xl),
                topRight: Radius.circular(AppRadius.xl),
              ),
              child: AspectRatio(
                aspectRatio: 16 / 9,
                child: Image.network(
                  coverUrl,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => _CoverFallback(
                    icon: _resolveIcon(article),
                  ),
                ),
              ),
            )
          else
            _CoverFallback(
              icon: _resolveIcon(article),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(AppRadius.xl),
                topRight: Radius.circular(AppRadius.xl),
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(AppSpacing.x5),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    if (article.categoryName != null &&
                        article.categoryName!.trim().isNotEmpty)
                      AppBadge(
                        label: article.categoryName!.toUpperCase(),
                        type: AppBadgeType.neutral,
                        showDot: false,
                      ),
                    if (article.estimatedReadMinutes != null) ...[
                      const SizedBox(width: AppSpacing.x2),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(PhosphorIcons.clock(),
                              size: 12, color: t.textMuted),
                          const SizedBox(width: 4),
                          Text(
                            '${article.estimatedReadMinutes} min',
                            style: AppTypography.caption
                                .copyWith(color: t.textMuted),
                          ),
                        ],
                      ),
                    ],
                    if (article.destaque) ...[
                      const SizedBox(width: AppSpacing.x2),
                      Icon(PhosphorIcons.star(PhosphorIconsStyle.fill),
                          size: 12, color: t.warning),
                    ],
                  ],
                ),
                const SizedBox(height: AppSpacing.x3),
                Text(
                  article.titulo,
                  style: AppTypography.h3
                      .copyWith(color: t.textPrimary),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                if (article.excerpt != null &&
                    article.excerpt!.trim().isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.x2),
                  Text(
                    article.excerpt!,
                    style: AppTypography.bodyMedium.copyWith(
                      color: t.textSecondary,
                      height: 1.5,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                if (article.tags.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.x4),
                  Wrap(
                    spacing: AppSpacing.x2,
                    runSpacing: AppSpacing.x2,
                    children: article.tags
                        .take(3)
                        .map(
                          (tag) => Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.x2,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: t.bgElev2,
                              borderRadius: AppRadius.smR,
                            ),
                            child: Text(
                              '#$tag',
                              style: AppTypography.caption.copyWith(
                                color: t.textSecondary,
                              ),
                            ),
                          ),
                        )
                        .toList(),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  IconData _resolveIcon(KnowledgeArticle a) {
    if (a.videoProvider != KbVideoProvider.none) {
      return PhosphorIcons.playCircle();
    }
    return PhosphorIcons.book();
  }
}

class _CoverFallback extends StatelessWidget {
  final IconData icon;
  final BorderRadius? borderRadius;
  const _CoverFallback({required this.icon, this.borderRadius});

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    return AspectRatio(
      aspectRatio: 16 / 9,
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              t.primarySoft,
              t.bgElev2,
            ],
          ),
          borderRadius: borderRadius,
        ),
        alignment: Alignment.center,
        child: Icon(icon, size: 36, color: AppColors.primary),
      ),
    );
  }
}
