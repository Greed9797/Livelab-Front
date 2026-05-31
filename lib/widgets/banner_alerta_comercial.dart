import 'package:flutter/material.dart';

import '../models/contrato.dart';
import '../design_system/design_system.dart';

class BannerAlertaComercial extends StatelessWidget {
  final Contrato contrato;

  const BannerAlertaComercial({
    super.key,
    required this.contrato,
  });

  @override
  Widget build(BuildContext context) {
    final data = _resolveBannerData(contrato);
    if (data == null) {
      return const SizedBox.shrink();
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: data.background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: data.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(data.icon, size: 20, color: data.iconColor),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  data.title,
                  style: AppTypography.bodyLarge.copyWith(
                    fontWeight: FontWeight.w700,
                    color: data.textColor,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  data.message,
                  style:
                      AppTypography.bodySmall.copyWith(color: data.textColor),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  _BannerData? _resolveBannerData(Contrato contrato) {
    final status = contrato.status.toLowerCase();
    const pendenciaColor = AppColors.primaryHover;
    const reprovacaoColor = AppColors.danger;

    if (status == 'pendencia' || status == 'pendencia_comercial') {
      final motivo = contrato.pendenciaMotivo?.trim();
      return _BannerData(
        icon: Icons.edit_note_rounded,
        title: 'Falta pouco para ativar!',
        message: motivo != null && motivo.isNotEmpty
            ? 'Para liberarmos seu faturamento, por favor: $motivo'
            : 'Para liberarmos seu faturamento, precisamos de um ajuste rapido nesta venda.',
        background: pendenciaColor.withValues(alpha: 0.10),
        border: pendenciaColor.withValues(alpha: 0.35),
        iconColor: pendenciaColor,
        textColor: pendenciaColor,
      );
    }

    if (status == 'reprovado') {
      final motivo = contrato.reprovacaoMotivo?.trim();
      return _BannerData(
        icon: Icons.gpp_maybe_rounded,
        title: 'Atencao: Restricao na Operacao',
        message: motivo != null && motivo.isNotEmpty
            ? 'O backoffice identificou uma restricao: $motivo. Voce pode revisar as condicoes com o cliente ou, se preferir, assumir a responsabilidade comercial desta venda.'
            : 'O backoffice identificou uma restricao nesta operacao. Voce pode revisar as condicoes com o cliente ou, se preferir, assumir a responsabilidade comercial desta venda.',
        background: reprovacaoColor.withValues(alpha: 0.10),
        border: reprovacaoColor.withValues(alpha: 0.35),
        iconColor: reprovacaoColor,
        textColor: reprovacaoColor,
      );
    }

    if (status == 'aprovado' || status == 'ativo') {
      const successColor = AppColors.success;
      return _BannerData(
        icon: Icons.check_circle_rounded,
        title: 'Contrato liberado',
        message:
            'Tudo certo para avançar com implantação e ativação comercial do cliente.',
        background: successColor.withValues(alpha: 0.10),
        border: successColor.withValues(alpha: 0.35),
        iconColor: successColor,
        textColor: successColor,
      );
    }

    if (status == 'em_analise' || status == 'novo' || status == 'assinado') {
      const infoColor = AppColors.info;
      return _BannerData(
        icon: Icons.hourglass_top_rounded,
        title: 'Análise em andamento',
        message:
            'Estamos processando os dados do contrato. Você receberá o próximo passo em instantes.',
        background: infoColor.withValues(alpha: 0.10),
        border: infoColor.withValues(alpha: 0.35),
        iconColor: infoColor,
        textColor: infoColor,
      );
    }

    return null;
  }
}

class _BannerData {
  final IconData icon;
  final String title;
  final String message;
  final Color background;
  final Color border;
  final Color iconColor;
  final Color textColor;

  const _BannerData({
    required this.icon,
    required this.title,
    required this.message,
    required this.background,
    required this.border,
    required this.iconColor,
    required this.textColor,
  });
}
