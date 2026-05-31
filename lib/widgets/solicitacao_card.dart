import 'package:flutter/material.dart';
import '../../design_system/design_system.dart';

class SolicitacaoCard extends StatelessWidget {
  final String cabineNumero;
  final String clienteNome;
  final String data;
  final String hora;
  final String duracao;
  final String solicitadoPor;
  final String? apresentadoraNome;
  final String status;
  final VoidCallback onApprove;
  final VoidCallback onReject;
  final bool showStatusBadge;

  const SolicitacaoCard({
    super.key,
    required this.cabineNumero,
    required this.clienteNome,
    required this.data,
    required this.hora,
    required this.duracao,
    required this.solicitadoPor,
    this.apresentadoraNome,
    required this.status,
    required this.onApprove,
    required this.onReject,
    this.showStatusBadge = true,
  });

  @override
  Widget build(BuildContext context) {
    final badgeType = switch (status) {
      'aprovada' => AppBadgeType.success,
      'recusada' => AppBadgeType.danger,
      _ => AppBadgeType.warning,
    };
    final badgeLabel = switch (status) {
      'aprovada' => 'Aprovada',
      'recusada' => 'Recusada',
      _ => 'Pendente',
    };
    final isPendente = status == 'pendente';

    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.x4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: context.colors.primarySoftBg,
                  borderRadius: BorderRadius.circular(AppRadius.full),
                ),
                child: Text(
                  'CABINE $cabineNumero',
                  style: AppTypography.caption.copyWith(
                      color: AppColors.primary, fontWeight: FontWeight.w600),
                ),
              ),
              const SizedBox(width: AppSpacing.x3),
              Expanded(
                child: Text(clienteNome,
                    style: AppTypography.bodyMedium
                        .copyWith(fontWeight: FontWeight.w600)),
              ),
              if (showStatusBadge)
                AppBadge(label: badgeLabel, type: badgeType, showDot: false),
            ],
          ),
          const SizedBox(height: AppSpacing.x3),
          Row(
            children: [
              Icon(Icons.calendar_today_outlined,
                  size: 14, color: context.colors.textMuted),
              const SizedBox(width: 4),
              Text('$data às $hora',
                  style: AppTypography.caption
                      .copyWith(color: context.colors.textMuted)),
              const SizedBox(width: AppSpacing.x3),
              Icon(Icons.timer_outlined,
                  size: 14, color: context.colors.textMuted),
              const SizedBox(width: 4),
              Text(duracao,
                  style: AppTypography.caption
                      .copyWith(color: context.colors.textMuted)),
              const SizedBox(width: AppSpacing.x3),
              Icon(Icons.person_outline,
                  size: 14, color: context.colors.textMuted),
              const SizedBox(width: 4),
              Text(solicitadoPor,
                  style: AppTypography.caption
                      .copyWith(color: context.colors.textMuted)),
              if ((apresentadoraNome ?? '').isNotEmpty) ...[
                const SizedBox(width: AppSpacing.x3),
                Icon(Icons.badge_outlined,
                    size: 14, color: context.colors.textMuted),
                const SizedBox(width: 4),
                Text(apresentadoraNome!,
                    style: AppTypography.caption
                        .copyWith(color: context.colors.textMuted)),
              ],
            ],
          ),
          if (isPendente) ...[
            const SizedBox(height: AppSpacing.x4),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                AppGhostButton(label: 'Recusar', onPressed: onReject),
                const SizedBox(width: AppSpacing.x3),
                AppPrimaryButton(label: 'Aprovar', onPressed: onApprove),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
