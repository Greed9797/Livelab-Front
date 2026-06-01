import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/boleto.dart';
import '../design_system/design_system.dart';
import 'money_text.dart';

class BoletoItem extends StatelessWidget {
  final Boleto boleto;

  const BoletoItem({super.key, required this.boleto});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: AppCard(
        padding: const EdgeInsets.all(16),
        child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header: tipo icon + label + AUTO badge + status chip
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      _TipoIcon(tipo: boleto.tipo),
                      const SizedBox(width: 8),
                      Text(
                        _tipoLabel(boleto.tipo),
                        style: AppTypography.bodyLarge.copyWith(fontWeight: FontWeight.w600),
                      ),
                      if (boleto.geradoAutomaticamente) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.infoPurple.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(AppRadius.sm),
                          ),
                          child: Text(
                            'AUTO',
                            style: AppTypography.caption.copyWith(
                              color: AppColors.infoPurple,
                              fontWeight: FontWeight.w700,
                              fontSize: 10,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  AppBadge(
                    label: _statusLabel(boleto.status),
                    type: _statusType(boleto.status),
                  ),
                ],
              ),

              const SizedBox(height: 12),

              // Valor + Vencimento
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Valor', style: AppTypography.caption),
                        const SizedBox(height: 2),
                        MoneyText(
                          value: boleto.valor,
                          fontSize: 20,
                          color: AppColors.primary,
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(boleto.isPago ? 'Pago em' : 'Vencimento', style: AppTypography.caption),
                        Text(
                          boleto.isPago && boleto.pagoEm != null
                              ? _formatDate(boleto.pagoEm!)
                              : _formatDate(boleto.vencimento),
                          style: AppTypography.bodySmall.copyWith(
                            color: boleto.isVencido ? AppColors.danger : context.colors.textPrimary,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              // Erro Asaas — mensagem amigável
              if (boleto.temErroAsaas) ...[
                const SizedBox(height: 8),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.warning.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                  ),
                  child: Text(
                    'Link de pagamento indisponível. Entre em contato com o suporte.',
                    style: AppTypography.caption
                        .copyWith(color: AppColors.warning),
                  ),
                ),
              ],

              // Botões de ação (só para pendente/vencido)
              if (boleto.isPendente || boleto.isVencido) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    if (boleto.temLinkPagamento) ...[
                      Expanded(
                        child: AppPrimaryButton(
                          label: 'Abrir Boleto',
                          icon: Icons.open_in_new_rounded,
                          onPressed: () => _abrirLink(context, boleto.asaasUrl!),
                        ),
                      ),
                      if (boleto.asaasPix != null) ...[
                        const SizedBox(width: 8),
                        AppSecondaryButton(
                          label: 'Copiar PIX',
                          icon: Icons.copy_rounded,
                          onPressed: () => _copiarPix(context, boleto.asaasPix!),
                        ),
                      ],
                    ] else ...[
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: context.colors.bgPage,
                            borderRadius: BorderRadius.circular(AppRadius.md),
                          ),
                          child: Text('Sem link de pagamento',
                              style: AppTypography.caption),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ],
          ),
        ),
    );
  }

  Future<void> _abrirLink(BuildContext context, String url) async {
    final uri = Uri.parse(url);
    if (uri.scheme != 'https') {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('URL inválida')),
        );
      }
      return;
    }
    try {
      final ok = await canLaunchUrl(uri);
      if (!ok) throw Exception('cannot_launch');
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Não foi possível abrir o link')),
        );
      }
    }
  }

  Future<void> _copiarPix(BuildContext context, String pix) async {
    try {
      await Clipboard.setData(ClipboardData(text: pix));
    } catch (_) {
      // ignore: clipboard errors are non-critical
    }
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('PIX copiado!',
              style: AppTypography.bodySmall.copyWith(color: Colors.white)),
          backgroundColor: AppColors.success,
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  String _tipoLabel(String tipo) => const {
    'royalties': 'Royalties',
    'imposto': 'Imposto',
    'marketing': 'Marketing',
    'outros': 'Outros',
  }[tipo] ?? tipo;

  String _formatDate(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
}

String _statusLabel(String s) {
  return switch (s) {
    'pago' => 'Pago',
    'vencido' => 'Vencido',
    _ => 'Pendente',
  };
}

AppBadgeType _statusType(String s) {
  return switch (s) {
    'pago' => AppBadgeType.success,
    'vencido' => AppBadgeType.danger,
    _ => AppBadgeType.warning,
  };
}

class _TipoIcon extends StatelessWidget {
  final String tipo;
  const _TipoIcon({required this.tipo});

  @override
  Widget build(BuildContext context) {
    final (icon, color) = switch (tipo) {
      'royalties' => (Icons.percent_rounded,          AppColors.primary),
      'imposto'   => (Icons.account_balance_rounded,  AppColors.info),
      'marketing' => (Icons.campaign_rounded,          AppColors.infoPurple),
      _           => (Icons.receipt_long_rounded,      context.colors.textMuted),
    };
    return Icon(icon, size: 20, color: color);
  }
}
