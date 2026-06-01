import 'package:flutter/material.dart';

import '../../../design_system/design_system.dart';

class AuditoriaSlaChip extends StatelessWidget {
  final int? hours;
  const AuditoriaSlaChip({super.key, required this.hours});

  @override
  Widget build(BuildContext context) {
    if (hours == null) return const SizedBox.shrink();

    final color = hours! >= 24
        ? AppColors.danger
        : hours! >= 12
            ? AppColors.primary
            : context.colors.textSecondary;

    final bg = hours! >= 24
        ? AppColors.danger.withValues(alpha: 0.12)
        : hours! >= 12
            ? AppColors.primary.withValues(alpha: 0.12)
            : context.colors.textPrimary.withValues(alpha: 0.05);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(AppRadius.full),
      ),
      child: Text(
        '⏳ ${hours}h',
        style: AppTypography.caption.copyWith(
          color: color,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
