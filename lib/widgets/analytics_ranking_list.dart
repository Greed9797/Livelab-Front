import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/analytics_dashboard.dart';
import '../design_system/design_system.dart';

class AnalyticsRankingList extends StatelessWidget {
  final List<RankingApresentador> items;

  const AnalyticsRankingList({super.key, required this.items});

  static final _currency = NumberFormat.simpleCurrency(locale: 'pt_BR');

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.emoji_events_rounded, color: AppColors.medalGold, size: 20),
              const SizedBox(width: 8),
              Text('Top Apresentadores', style: AppTypography.h3.copyWith(fontSize: 15, color: context.colors.textPrimary)),
            ],
          ),
          const SizedBox(height: 4),
          Text('Ranking por GMV no período', style: AppTypography.caption.copyWith(color: context.colors.textSecondary)),
          const SizedBox(height: 16),
          if (items.isEmpty)
            _buildEmptyState(context)
          else
            ...items.asMap().entries.map((entry) => _buildItem(context, entry.key, entry.value)),
        ],
      ),
    );
  }

  Widget _buildItem(BuildContext context, int index, RankingApresentador item) {
    final position = index + 1;
    final isTopThree = position <= 3;

    final medalColor = switch (position) {
      1 => AppColors.medalGold,
      2 => AppColors.medalSilver,
      3 => AppColors.medalBronze,
      _ => context.colors.textMuted,
    };

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: EdgeInsets.symmetric(
        horizontal: 12,
        vertical: isTopThree ? 12 : 8,
      ),
      decoration: BoxDecoration(
        color: isTopThree
            ? medalColor.withValues(alpha: 0.07)
            : context.colors.bgPage,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: isTopThree
            ? Border.all(color: medalColor.withValues(alpha: 0.3))
            : null,
      ),
      child: Row(
        children: [
          // Badge de posição
          Container(
            width: isTopThree ? 32 : 28,
            height: isTopThree ? 32 : 28,
            decoration: BoxDecoration(
              color: medalColor.withValues(alpha: isTopThree ? 0.2 : 0.12),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: isTopThree
                  ? Icon(
                      position == 1
                          ? Icons.emoji_events_rounded
                          : Icons.military_tech_rounded,
                      size: 16,
                      color: medalColor,
                    )
                  : Text(
                      '$position',
                      style: AppTypography.caption.copyWith(
                        color: medalColor,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
            ),
          ),
          const SizedBox(width: 12),

          // Avatar com iniciais
          CircleAvatar(
            radius: isTopThree ? 18 : 14,
            backgroundColor: AppColors.primary.withValues(alpha: 0.15),
            child: Text(
              item.apresentadorNome.length >= 2
                  ? item.apresentadorNome.substring(0, 2).toUpperCase()
                  : item.apresentadorNome.substring(0, 1).toUpperCase(),
              style: AppTypography.caption.copyWith(
                color: AppColors.primary,
                fontWeight: FontWeight.bold,
                fontSize: isTopThree ? 12 : 10,
              ),
            ),
          ),
          const SizedBox(width: 10),

          // Nome e lives
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.apresentadorNome,
                  style: AppTypography.bodySmall.copyWith(
                    fontWeight: isTopThree ? FontWeight.w700 : FontWeight.w500,
                    color: context.colors.textPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  '${item.totalLives} live${item.totalLives != 1 ? 's' : ''}',
                  style: AppTypography.caption.copyWith(color: context.colors.textSecondary),
                ),
              ],
            ),
          ),

          // GMV
          Text(
            _currency.format(item.gmvTotal),
            style: AppTypography.bodySmall.copyWith(
              fontWeight: FontWeight.w700,
              color: isTopThree ? medalColor : context.colors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Center(
        child: Column(
          children: [
            Icon(Icons.people_outline_rounded, size: 40, color: context.colors.textMuted),
            const SizedBox(height: 8),
            Text('Nenhum apresentador no período',
                style: AppTypography.bodySmall.copyWith(color: context.colors.textSecondary)),
          ],
        ),
      ),
    );
  }
}
