import 'package:flutter/material.dart';
import '../design_system/design_system.dart';

class RankingDestaque extends StatelessWidget {
  final List<Map<String, dynamic>> rankings;

  const RankingDestaque({super.key, required this.rankings});

  @override
  Widget build(BuildContext context) {
    if (rankings.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.x6),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.emoji_events_outlined,
                  size: 36, color: context.colors.textMuted),
              const SizedBox(height: 8),
              Text('Sem vendas registradas hoje',
                  style: AppTypography.bodySmall),
            ],
          ),
        ),
      );
    }

    final safe = [
      ...rankings,
      if (rankings.length < 2) {'nome': '—'},
      if (rankings.length < 3) {'nome': '—'},
    ];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.x4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.flag_outlined, size: 20, color: context.colors.textMuted),
                const SizedBox(width: 8),
                Flexible(
                  child: Text(
                    'DESTAQUES DO DIA',
                    style: AppTypography.caption.copyWith(
                      color: context.colors.textSecondary,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.2,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                Icon(Icons.flag_outlined, size: 20, color: context.colors.textMuted),
              ],
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Flexible(child: _buildAvatar(context, safe[1], '2º', AppColors.medalSilver, 0.8)),
                Flexible(child: _buildAvatar(context, safe[0], '1º', AppColors.medalGold, 1.0)),
                Flexible(child: _buildAvatar(context, safe[2], '3º', AppColors.medalBronze, 0.8)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAvatar(
      BuildContext context, Map<String, dynamic> data, String place, Color medalColor, double scale) {
    final nome = data['nome'] as String? ?? '—';
    final isEmpty = nome == '—';

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            Container(
              width: 56 * scale,
              height: 56 * scale,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isEmpty
                    ? context.colors.bgPage
                    : medalColor.withValues(alpha: 0.18),
                border: Border.all(color: medalColor, width: 2),
              ),
              child: isEmpty
                  ? Icon(Icons.person_outline,
                      size: 22 * scale, color: context.colors.textMuted)
                  : Text(
                      nome.trim().isNotEmpty
                          ? nome.trim()[0].toUpperCase()
                          : '?',
                      style: AppTypography.h3.copyWith(
                        color: medalColor,
                        fontWeight: FontWeight.w700,
                        fontSize: 20 * scale,
                      ),
                    ),
            ),
            Positioned(
              bottom: -4,
              left: 0,
              right: 0,
              child: Center(
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: medalColor,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    place,
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 9,
                        fontWeight: FontWeight.w800),
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        SizedBox(
          width: 80,
          child: Text(
            nome,
            textAlign: TextAlign.center,
            style: AppTypography.caption
                .copyWith(fontWeight: FontWeight.w600, fontSize: 11),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
