import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../design_system/design_system.dart';

/// Chip compacto para sinalizar um alerta operacional do dashboard master.
///
/// `tipo` é um código retornado por `GET /v1/master/alertas`:
/// - `gmv_queda_30pct`           → trending down vermelho
/// - `sem_lives_7dias`           → relógio amarelo
/// - `boleto_vencido`            → cifrão vermelho
/// - `contrato_expirando_30dias` → arquivo amarelo
class AlertChip extends StatelessWidget {
  const AlertChip({
    super.key,
    required this.tipo,
    required this.detalhe,
    this.nome,
    this.onTap,
  });

  final String tipo;
  final String detalhe;
  final String? nome;
  final VoidCallback? onTap;

  ({IconData icon, Color color, Color bg, String label}) _config() {
    switch (tipo) {
      case 'gmv_queda_30pct':
        return (
          icon: PhosphorIcons.trendDown(),
          color: AppColors.danger,
          bg: AppColors.dangerBg,
          label: 'GMV em queda',
        );
      case 'sem_lives_7dias':
        return (
          icon: PhosphorIcons.clockCountdown(),
          color: AppColors.warning,
          bg: AppColors.warningBg,
          label: 'Sem lives 7d',
        );
      case 'boleto_vencido':
        return (
          icon: PhosphorIcons.currencyCircleDollar(),
          color: AppColors.danger,
          bg: AppColors.dangerBg,
          label: 'Boleto vencido',
        );
      case 'contrato_expirando_30dias':
        return (
          icon: PhosphorIcons.fileText(),
          color: AppColors.warning,
          bg: AppColors.warningBg,
          label: 'Contrato expirando',
        );
      default:
        return (
          icon: PhosphorIcons.warningCircle(),
          color: AppColors.info,
          bg: AppColors.infoBg,
          label: 'Alerta',
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final cfg = _config();
    final tooltip = nome != null && nome!.isNotEmpty
        ? '$nome — $detalhe'
        : detalhe;

    final chip = Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: cfg.bg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: cfg.color.withValues(alpha: 0.32)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(cfg.icon, size: 14, color: cfg.color),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              nome != null && nome!.isNotEmpty
                  ? '${cfg.label} · ${nome!}'
                  : cfg.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
                color: cfg.color,
              ),
            ),
          ),
        ],
      ),
    );

    final wrapped = Tooltip(message: tooltip, child: chip);
    if (onTap == null) return wrapped;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: wrapped,
    );
  }
}
