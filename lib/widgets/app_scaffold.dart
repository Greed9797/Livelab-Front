import 'package:phosphor_flutter/phosphor_flutter.dart';
import '../providers/billing_alert_provider.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../livelab/widgets/livelab_scaffold.dart';
import '../providers/auth_provider.dart';
import '../providers/configuracoes_provider.dart';
import '../design_system/design_system.dart';
import '../providers/boletos_provider.dart';

class AppScaffold extends ConsumerWidget {
  final Widget child;
  final String currentRoute;
  final String? userName;

  const AppScaffold({
    super.key,
    required this.child,
    required this.currentRoute,
    this.userName = 'FVC Promoções',
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.listen(billingAlertProvider, (prev, next) {
      if (next.valueOrNull != null) {
        final alert = next.valueOrNull!;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          showDialog(
            context: context,
            barrierDismissible: false,
            builder: (ctx) => AlertDialog(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              title: const Row(
                children: [
                  Icon(PhosphorIconsBold.receipt, color: AppColors.primary),
                  SizedBox(width: 8),
                  Text('Fatura Disponível'),
                ],
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                      'Seu boleto referente aos serviços e comissões do período foi emitido.'),
                  const SizedBox(height: 12),
                  Text(
                    'Valor: ${NumberFormat.simpleCurrency(locale: 'pt_BR').format(alert.valor)}',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              actions: [
                if (alert.asaasPixCopiaCola != null)
                  AppPrimaryButton(
                    label: 'Copiar PIX',
                    color: AppColors.success,
                    icon: Icons.copy_rounded,
                    onPressed: () {
                      Clipboard.setData(
                        ClipboardData(text: alert.asaasPixCopiaCola!),
                      );
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Código PIX copiado!')),
                      );
                      ref
                          .read(billingAlertProvider.notifier)
                          .marcarVisto(alert.id);
                      Navigator.pop(ctx);
                    },
                  ),
                AppSecondaryButton(
                  label: 'Fechar',
                  onPressed: () {
                    ref
                        .read(billingAlertProvider.notifier)
                        .marcarVisto(alert.id);
                    Navigator.pop(ctx);
                  },
                ),
              ],
            ),
          );
        });
      }
    });

    // Touch derived providers to keep notifiers warm (boletos, configuracoes).
    ref.watch(boletosProvider);
    // /v1/configuracoes restrito a papéis comerciais — pular pra
    // cliente_parceiro/apresentador evita 403 silencioso no console.
    final papel = ref.watch(authProvider).user?.papel;
    if (papel != 'cliente_parceiro' &&
        papel != 'apresentador' &&
        papel != 'apresentadora') {
      ref.watch(configuracoesProvider);
    }

    return LivelabScaffold(
      currentRoute: currentRoute,
      child: child,
    );
  }
}
