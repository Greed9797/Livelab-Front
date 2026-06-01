import 'package:flutter/material.dart';
import '../../design_system/design_system.dart';

enum BoletoStatus { pendente, vencido, pago }

class BoletoCard extends StatelessWidget {
  final String categoria;
  final String descricao;
  final String valor;
  final String vencimento;
  final BoletoStatus status;
  final VoidCallback onCopiar;
  final VoidCallback onPagar;

  const BoletoCard({
    super.key,
    required this.categoria,
    required this.descricao,
    required this.valor,
    required this.vencimento,
    required this.status,
    required this.onCopiar,
    required this.onPagar,
  });

  IconData _categoriaIcon() {
    return switch (categoria.toLowerCase()) {
      'impostos' => Icons.receipt_long_outlined,
      'royalties' => Icons.account_balance_outlined,
      'marketing' => Icons.campaign_outlined,
      _ => Icons.description_outlined,
    };
  }

  @override
  Widget build(BuildContext context) {
    final isVencido = status == BoletoStatus.vencido;
    final isPago = status == BoletoStatus.pago;
    final badgeType = switch (status) {
      BoletoStatus.pago => AppBadgeType.success,
      BoletoStatus.vencido => AppBadgeType.danger,
      BoletoStatus.pendente => AppBadgeType.warning,
    };
    final badgeLabel = switch (status) {
      BoletoStatus.pago => 'Pago',
      BoletoStatus.vencido => 'Vencido',
      BoletoStatus.pendente => 'Pendente',
    };

    return Container(
      decoration: BoxDecoration(
        color: context.colors.bgCard,
        borderRadius: BorderRadius.circular(AppRadius.xl),
        border: isVencido ? Border.all(color: AppColors.danger.withValues(alpha: 0.3), width: 1) : null,
        boxShadow: AppShadows.md,
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(AppSpacing.x4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 40, height: 40,
                      decoration: BoxDecoration(color: context.colors.primarySoftBg, borderRadius: AppRadius.mdR),
                      child: Icon(_categoriaIcon(), size: 20, color: AppColors.primary),
                    ),
                    const SizedBox(width: AppSpacing.x3),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(categoria, style: AppTypography.caption.copyWith(color: context.colors.textMuted, letterSpacing: 0.5)),
                          Text(descricao, style: AppTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                    AppBadge(label: badgeLabel, type: badgeType, showDot: false),
                  ],
                ),
                const SizedBox(height: AppSpacing.x4),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Valor', style: AppTypography.caption.copyWith(color: context.colors.textMuted)),
                          Text(valor, style: AppTypography.h2.copyWith(fontWeight: FontWeight.w700)),
                        ],
                      ),
                    ),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Vencimento', style: AppTypography.caption.copyWith(color: context.colors.textMuted)),
                          Text(vencimento, style: AppTypography.bodyMedium.copyWith(fontWeight: FontWeight.w500)),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          if (!isPago)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppSpacing.x3),
              decoration: BoxDecoration(
                color: context.colors.primarySoftBg,
                borderRadius: const BorderRadius.vertical(bottom: Radius.circular(AppRadius.xl)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  AppGhostButton(label: 'Copiar', icon: Icons.copy, onPressed: onCopiar),
                  const SizedBox(width: AppSpacing.x3),
                  AppPrimaryButton(label: 'Pagar', icon: Icons.payment, onPressed: onPagar),
                ],
              ),
            ),
        ],
      ),
    );
  }
}