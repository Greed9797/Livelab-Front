import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import '../design_system/design_system.dart';
import 'money_text.dart';

// StateProvider simples para gerenciar a visibilidade globalmente
final moneyVisibilityProvider = StateProvider<bool>((ref) => false);

class MoneyCard extends ConsumerWidget {
  final double total;
  final double bruto;
  final double liquido;
  final VoidCallback? onTap;

  const MoneyCard({
    super.key,
    required this.total,
    required this.bruto,
    required this.liquido,
    this.onTap,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isVisible = ref.watch(moneyVisibilityProvider);

    return AppCard(
      onTap: onTap,
      padding: const EdgeInsets.all(AppSpacing.x6),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: context.colors.bgMuted,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  PhosphorIcons.clockCounterClockwise(),
                  color: AppColors.primary,
                  size: 18,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Faturamento Total',
                  style: AppTypography.bodyLarge.copyWith(
                    color: context.colors.textPrimary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              IconButton(
                icon: Icon(
                  isVisible ? PhosphorIcons.eye() : PhosphorIcons.eyeSlash(),
                  color: context.colors.textMuted,
                  size: 18,
                ),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                onPressed: () => ref
                    .read(moneyVisibilityProvider.notifier)
                    .state = !isVisible,
              ),
            ],
          ),
          const SizedBox(height: 20),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: isVisible
                ? MoneyText(
                    value: total,
                    fontSize: 32,
                    fontWeight: FontWeight.w700,
                  )
                : Text(
                    'R\$ •••••••',
                    style: AppTypography.displayLarge.copyWith(
                      color: context.colors.textPrimary,
                      fontSize: 32,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
          ),
          const SizedBox(height: 20),
          Divider(color: context.colors.borderSubtle, height: 1),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _SubValue(
                  label: 'BRUTO',
                  value: bruto,
                  isVisible: isVisible,
                  color: AppColors.success,
                ),
              ),
              Container(
                  width: 1,
                  height: 36,
                  color: context.colors.borderSubtle),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(left: AppSpacing.x4),
                  child: _SubValue(
                    label: 'LÍQUIDO',
                    value: liquido,
                    isVisible: isVisible,
                    color: AppColors.primary,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SubValue extends StatelessWidget {
  final String label;
  final double value;
  final bool isVisible;
  final Color color;

  const _SubValue({
    required this.label,
    required this.value,
    required this.isVisible,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label[0] + label.substring(1).toLowerCase(),
          style: AppTypography.caption.copyWith(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: context.colors.textSecondary),
        ),
        const SizedBox(height: 4),
        FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: isVisible
              ? MoneyText(
                  value: value,
                  fontSize: 15,
                  color: color,
                )
              : Text(
                  'R\$ •••••',
                  style: AppTypography.bodyLarge.copyWith(
                    color: color,
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                  ),
                ),
        ),
      ],
    );
  }
}
