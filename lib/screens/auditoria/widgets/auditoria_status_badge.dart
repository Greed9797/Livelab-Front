import 'package:flutter/material.dart';

import '../../../design_system/design_system.dart';

class AuditoriaStatusBadge extends StatelessWidget {
  final String status;
  const AuditoriaStatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (status) {
      'em_analise' => ('Em Análise', AppColors.warning),
      'pendencia_comercial' => ('Pendência', AppColors.warning),
      'reprovado' => ('Restrição', AppColors.danger),
      'ativo' || 'aprovado' => ('Aprovado', AppColors.success),
      'arquivado' => ('Arquivado', context.colors.textSecondary),
      _ => (status, context.colors.textSecondary),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(AppRadius.full),
      ),
      child: Text(
        label,
        style: AppTypography.caption.copyWith(
          color: color,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
