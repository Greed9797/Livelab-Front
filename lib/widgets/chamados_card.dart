import 'package:flutter/material.dart';
import '../design_system/design_system.dart';

class ChamadosCard extends StatelessWidget {
  final int count;
  const ChamadosCard({super.key, this.count = 0});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: EdgeInsets.zero,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.all(AppSpacing.x4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('CHAMADOS',
                        style: AppTypography.caption.copyWith(
                            color: context.colors.textSecondary,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.2)),
                    Stack(
                      children: [
                        Icon(Icons.person_outline,
                            size: 24, color: context.colors.textMuted),
                        if (count > 0)
                          Positioned(
                            right: 0,
                            top: 0,
                            child: Container(
                              padding: const EdgeInsets.all(3),
                              decoration: BoxDecoration(
                                  color: AppColors.primary,
                                  shape: BoxShape.circle),
                              child: Text('$count',
                                  style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 8,
                                      fontWeight: FontWeight.bold)),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  count > 0
                      ? '$count chamados não visualizados'
                      : 'Nenhum chamado pendente',
                  style:
                      AppTypography.caption.copyWith(color: context.colors.textSecondary),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
            decoration: BoxDecoration(
              color: count > 0
                  ? AppColors.danger
                  : context.colors.bgMuted,
              borderRadius: const BorderRadius.only(
                bottomLeft: Radius.circular(AppRadius.xl),
                bottomRight: Radius.circular(AppRadius.xl),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                    count > 0 ? Icons.money_off : Icons.check_circle_outline,
                    color: count > 0 ? Colors.white : context.colors.textSecondary,
                    size: 14),
                const SizedBox(width: 6),
                Flexible(
                  child: Text(
                    count > 0
                        ? 'INFORMATIVO: INADIMPLÊNCIA'
                        : 'Tudo em dia',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                        color: count > 0 ? Colors.white : context.colors.textSecondary,
                        fontWeight: FontWeight.w700,
                        fontSize: 11),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
