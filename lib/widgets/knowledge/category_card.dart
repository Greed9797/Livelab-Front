import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../design_system/design_system.dart';
import '../../models/knowledge_category.dart';

/// Card de categoria da Knowledge Base.
class CategoryCard extends StatelessWidget {
  final KnowledgeCategory category;
  final int articleCount;
  final VoidCallback? onTap;

  const CategoryCard({
    super.key,
    required this.category,
    required this.articleCount,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.10),
              borderRadius: AppRadius.mdR,
            ),
            alignment: Alignment.center,
            child: Icon(
              _resolveIcon(category.icon),
              color: AppColors.primary,
              size: 22,
            ),
          ),
          const SizedBox(height: AppSpacing.x4),
          Text(
            category.name,
            style:
                AppTypography.h3.copyWith(color: AppColors.textPrimary),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: AppSpacing.x2),
          Text(
            (category.description != null &&
                    category.description!.trim().isNotEmpty)
                ? category.description!
                : 'Artigos sobre ${category.name.toLowerCase()}.',
            style: AppTypography.bodyMedium.copyWith(
              color: AppColors.textMuted,
              height: 1.5,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: AppSpacing.x4),
          Row(
            children: [
              Icon(PhosphorIcons.fileText(),
                  size: 14, color: AppColors.textMuted),
              const SizedBox(width: 6),
              Text(
                _articleCountLabel(articleCount),
                style: AppTypography.caption
                    .copyWith(color: AppColors.textMuted),
              ),
              const Spacer(),
              Icon(PhosphorIcons.arrowRight(),
                  size: 16, color: AppColors.primary),
            ],
          ),
        ],
      ),
    );
  }

  static String _articleCountLabel(int n) {
    if (n == 0) return 'Nenhum artigo';
    if (n == 1) return '1 artigo';
    return '$n artigos';
  }

  static IconData _resolveIcon(String? name) {
    if (name == null || name.trim().isEmpty) return PhosphorIcons.book();
    switch (name.toLowerCase()) {
      case 'book':
        return PhosphorIcons.book();
      case 'wrench':
        return PhosphorIcons.wrench();
      case 'gear':
        return PhosphorIcons.gear();
      case 'shopping_cart':
      case 'shoppingcart':
        return PhosphorIcons.shoppingCart();
      case 'users':
        return PhosphorIcons.users();
      case 'wallet':
        return PhosphorIcons.wallet();
      case 'video':
      case 'videocamera':
        return PhosphorIcons.videoCamera();
      case 'chart':
      case 'chartbar':
        return PhosphorIcons.chartBar();
      case 'house':
        return PhosphorIcons.house();
      case 'lightbulb':
        return PhosphorIcons.lightbulb();
      case 'rocket':
        return PhosphorIcons.rocket();
      case 'graduationcap':
      case 'graduation_cap':
        return PhosphorIcons.graduationCap();
      default:
        return PhosphorIcons.book();
    }
  }
}
