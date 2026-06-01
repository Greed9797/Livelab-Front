import 'package:flutter/material.dart';
import '../design_system/design_system.dart';

/// NPS Gauge — layout horizontal compacto que se adapta ao espaço disponível.
/// Substitui o termômetro vertical que quebrava em containers estreitos.
class NpsGauge extends StatelessWidget {
  final double score; // 0 to 10
  const NpsGauge({super.key, required this.score});

  Color _scoreColor() {
    if (score >= 9) return AppColors.success;
    if (score >= 7) return AppColors.warning;
    return AppColors.danger;
  }

  String get _label {
    if (score >= 9) return 'Excelente';
    if (score >= 7) return 'Bom';
    if (score >= 5) return 'Regular';
    return 'Crítico';
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.x4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Text('NPS',
                    style: AppTypography.caption.copyWith(
                        color: context.colors.textSecondary,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.2)),
                const Spacer(),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: _scoreColor().withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(AppRadius.full),
                  ),
                  child: Text(
                    _label,
                    style: AppTypography.caption.copyWith(
                        color: _scoreColor(),
                        fontWeight: FontWeight.w700,
                        fontSize: 10),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  score.toStringAsFixed(1),
                  style: AppTypography.h1.copyWith(
                      fontSize: 32, color: _scoreColor()),
                ),
                Padding(
                  padding: const EdgeInsets.only(bottom: 4, left: 2),
                  child: Text(
                    '/10',
                    style: AppTypography.caption
                        .copyWith(color: context.colors.textMuted),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            // Barra de progresso horizontal
            ClipRRect(
              borderRadius: BorderRadius.circular(AppRadius.sm),
              child: LinearProgressIndicator(
                value: score / 10,
                minHeight: 6,
                backgroundColor: context.colors.bgMuted,
                valueColor: AlwaysStoppedAnimation<Color>(_scoreColor()),
              ),
            ),
            const SizedBox(height: 8),
            // Escala 0-10
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('0',
                    style: AppTypography.caption
                        .copyWith(fontSize: 9, color: context.colors.textMuted)),
                Text('5',
                    style: AppTypography.caption
                        .copyWith(fontSize: 9, color: context.colors.textMuted)),
                Text('10',
                    style: AppTypography.caption
                        .copyWith(fontSize: 9, color: context.colors.textMuted)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
