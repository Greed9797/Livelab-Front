import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../design_system/design_system.dart';
import '../widgets/client_avatar.dart';

/// Card de lead com botão "Qualificar" e barra de fit score
class LeadCard extends StatelessWidget {
  final Map<String, dynamic> lead;
  final VoidCallback? onPegar;
  const LeadCard({super.key, required this.lead, this.onPegar});

  static final _currencyFmt = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$', decimalDigits: 0);

  @override
  Widget build(BuildContext context) {
    final isNovo = lead['novo'] == true;
    final fat = (lead['fat_estimado'] as num?)?.toInt() ?? 0;
    // Fit score 0-100, default to 50 if not present
    final fitScore = ((lead['fit_score'] as num?)?.toDouble() ?? 50.0).clamp(0.0, 100.0) / 100.0;
    final scorePct = (fitScore * 100).round();
    final scoreColor = scorePct >= 70
        ? AppColors.success
        : scorePct >= 40
            ? AppColors.warning
            : AppColors.danger;

    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.x4),
      child: Row(
        children: [
          ClientAvatar(
            initials: (lead['nome'] as String? ?? '?').isNotEmpty
                ? (lead['nome'] as String)[0].toUpperCase()
                : '?',
            tone: ClientAvatarTone.neutral,
            size: 40,
          ),
          const SizedBox(width: AppSpacing.x3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(lead['nome'] as String,
                      style: AppTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
                    if (isNovo) ...[
                      const SizedBox(width: 8),
                      const AppBadge(label: 'NOVO', type: AppBadgeType.danger, showDot: false),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  '${lead['nicho']} • ${lead['cidade']}',
                  style: AppTypography.caption,
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Text(
                      'Fit: $scorePct%',
                      style: AppTypography.caption.copyWith(
                        color: scoreColor,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.x2),
                    Expanded(
                      child: AppProgressBar(value: fitScore, height: 4),
                    ),
                  ],
                ),
                if (fat > 0)
                  Text(
                    'Fat. est.: ${_currencyFmt.format(fat)}',
                    style: AppTypography.caption.copyWith(color: context.colors.textMuted),
                  ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.x3),
          AppGhostButton(
            label: 'Qualificar',
            icon: Icons.bolt_rounded,
            onPressed: onPegar,
          ),
        ],
      ),
    );
  }
}
