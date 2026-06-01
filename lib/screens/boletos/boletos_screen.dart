import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../providers/boletos_provider.dart';
import '../../models/boleto.dart';
import '../../routes/app_routes.dart';
import '../../design_system/design_system.dart';
import '../../services/api_service.dart';
import '../../widgets/boleto_card.dart';

class BoletosScreen extends ConsumerStatefulWidget {
  const BoletosScreen({super.key});

  @override
  ConsumerState<BoletosScreen> createState() => _BoletosScreenState();
}

class _BoletosScreenState extends ConsumerState<BoletosScreen> {
  @override
  Widget build(BuildContext context) {
    return const AppScreenScaffold(
      currentRoute: AppRoutes.boletos,
      eyebrow: 'Recebíveis da franquia',
      titleSerif: true,
      title: 'Financeiro',
      subtitle: 'Gerencie e pague seus boletos e faturas.',
      child: BoletosTab(),
    );
  }
}

class BoletosTab extends ConsumerStatefulWidget {
  const BoletosTab({super.key});

  @override
  ConsumerState<BoletosTab> createState() => _BoletosTabState();
}

class _BoletosTabState extends ConsumerState<BoletosTab> {
  String _categoria = 'todos';
  String _status = 'todos';

  List<Boleto> _filtrar(List<Boleto> boletos) {
    return boletos.where((b) {
      final categoriaOk = _categoria == 'todos' || b.tipo == _categoria;
      final statusOk = _status == 'todos' || b.status == _status;
      return categoriaOk && statusOk;
    }).toList();
  }

  int _countVencidos(List<Boleto> boletos) {
    final now = DateTime.now();
    return boletos
        .where((b) =>
            b.status == 'vencido' ||
            (b.status == 'pendente' && b.vencimento.isBefore(now)))
        .length;
  }

  int _countAVencer(List<Boleto> boletos) {
    final now = DateTime.now();
    final cutoff = now.add(const Duration(days: 30));
    return boletos
        .where((b) =>
            b.status == 'pendente' &&
            b.vencimento.isAfter(now) &&
            b.vencimento.isBefore(cutoff))
        .length;
  }

  int _countPagoMes(List<Boleto> boletos) {
    final now = DateTime.now();
    return boletos
        .where((b) =>
            b.status == 'pago' &&
            b.pagoEm != null &&
            b.pagoEm!.year == now.year &&
            b.pagoEm!.month == now.month)
        .length;
  }

  BoletoStatus _mapStatus(String s) {
    return switch (s) {
      'pago' => BoletoStatus.pago,
      'vencido' => BoletoStatus.vencido,
      _ => BoletoStatus.pendente,
    };
  }

  void _showAsaasPending() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text(
          'Pagamento online indisponível no momento. Use o código de barras ou PIX manualmente.',
        ),
        backgroundColor: AppColors.warning,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  Future<void> _copiarBoleto(Boleto b) async {
    if (b.asaasPix != null && b.asaasPix!.isNotEmpty) {
      await Clipboard.setData(ClipboardData(text: b.asaasPix!));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Código PIX copiado!')),
      );
    } else if (b.asaasUrl != null && b.asaasUrl!.isNotEmpty) {
      await _abrirBoleto(b);
    } else {
      _showAsaasPending();
    }
  }

  void _pagarBoleto(Boleto b) {
    _abrirBoleto(b);
  }

  Future<void> _abrirBoleto(Boleto b) async {
    final rawUrl = b.asaasUrl;
    if (rawUrl == null || rawUrl.isEmpty) {
      _showAsaasPending();
      return;
    }

    final uri = Uri.tryParse(rawUrl);
    if (uri == null || uri.scheme != 'https') {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Link de pagamento inválido.')),
      );
      return;
    }

    try {
      final launched =
          await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Não foi possível abrir o boleto. '
              'Permita pop-ups para este site e tente novamente.',
            ),
            duration: Duration(seconds: 5),
          ),
        );
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Não foi possível abrir o boleto. '
            'Permita pop-ups para este site e tente novamente.',
          ),
          duration: Duration(seconds: 5),
        ),
      );
    }
  }

  String _categoriaLabel(String tipo) =>
      const {
        'royalties': 'Royalties',
        'imposto': 'Impostos',
        'marketing': 'Marketing',
        'outros': 'Outros',
      }[tipo] ??
      tipo;

  @override
  Widget build(BuildContext context) {
    final boletosAsync = ref.watch(boletosProvider);

    return RefreshIndicator(
      onRefresh: () => ref.read(boletosProvider.notifier).refresh(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── KPI strip ────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.x5,
              AppSpacing.x4,
              AppSpacing.x5,
              0,
            ),
            child: boletosAsync.when(
              loading: () => const SizedBox(height: 100),
              error: (_, __) => const SizedBox(height: 100),
              data: (boletos) {
                final vencidos = _countVencidos(boletos);
                final aVencer = _countAVencer(boletos);
                final pagoMes = _countPagoMes(boletos);
                return Row(
                  children: [
                    Expanded(
                      child: KpiAccentCard(
                        label: 'Vencidos',
                        value: '$vencidos',
                        sub: 'em atraso',
                        valueColor: AppColors.danger,
                        accentTop: true,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.x3),
                    Expanded(
                      child: KpiAccentCard(
                        label: 'A vencer',
                        value: '$aVencer',
                        sub: 'nos próximos 30 dias',
                      ),
                    ),
                    const SizedBox(width: AppSpacing.x3),
                    Expanded(
                      child: KpiAccentCard(
                        label: 'Pago este mês',
                        value: '$pagoMes',
                        sub: 'quitados',
                        valueColor: AppColors.success,
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
          const SizedBox(height: AppSpacing.x4),

          // ── Filtros ────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.x5),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Categoria row
                Wrap(
                  spacing: AppSpacing.x2,
                  runSpacing: AppSpacing.x2,
                  children: [
                    AppChip(
                      label: 'Todos',
                      active: _categoria == 'todos',
                      onTap: () => setState(() => _categoria = 'todos'),
                    ),
                    AppChip(
                      label: 'Impostos',
                      active: _categoria == 'imposto',
                      onTap: () => setState(() => _categoria = 'imposto'),
                    ),
                    AppChip(
                      label: 'Royalties',
                      active: _categoria == 'royalties',
                      onTap: () => setState(() => _categoria = 'royalties'),
                    ),
                    AppChip(
                      label: 'Marketing',
                      active: _categoria == 'marketing',
                      onTap: () => setState(() => _categoria = 'marketing'),
                    ),
                    AppChip(
                      label: 'Outros',
                      active: _categoria == 'outros',
                      onTap: () => setState(() => _categoria = 'outros'),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.x2),
                // Status row
                Wrap(
                  spacing: AppSpacing.x2,
                  runSpacing: AppSpacing.x2,
                  children: [
                    AppChip(
                      label: 'Todos',
                      active: _status == 'todos',
                      onTap: () => setState(() => _status = 'todos'),
                    ),
                    AppChip(
                      label: 'Pendente',
                      active: _status == 'pendente',
                      onTap: () => setState(() => _status = 'pendente'),
                    ),
                    AppChip(
                      label: 'Vencido',
                      active: _status == 'vencido',
                      onTap: () => setState(() => _status = 'vencido'),
                    ),
                    AppChip(
                      label: 'Pago',
                      active: _status == 'pago',
                      onTap: () => setState(() => _status = 'pago'),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.x3),

          // ── Lista ────────────────────────────────────────────────────
          Expanded(
            child: boletosAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(ApiService.extractErrorMessage(e)),
                    const SizedBox(height: AppSpacing.x3),
                    AppSecondaryButton(
                      onPressed: () =>
                          ref.read(boletosProvider.notifier).refresh(),
                      label: 'Tentar novamente',
                    ),
                  ],
                ),
              ),
              data: (boletos) {
                final filtrados = _filtrar(boletos);
                if (filtrados.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.receipt_long_outlined,
                            size: 40, color: context.colors.textMuted),
                        const SizedBox(height: AppSpacing.x2),
                        Text(
                          'Nenhum boleto encontrado.',
                          style: AppTypography.bodySmall
                              .copyWith(color: context.colors.textSecondary),
                        ),
                      ],
                    ),
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.all(AppSpacing.x4),
                  itemCount: filtrados.length,
                  separatorBuilder: (_, __) =>
                      const SizedBox(height: AppSpacing.x3),
                  itemBuilder: (ctx, i) {
                    final boleto = filtrados[i];
                    return BoletoCard(
                      categoria: _categoriaLabel(boleto.tipo),
                      descricao: boleto.referenciaExterna ??
                          _categoriaLabel(boleto.tipo),
                      valor: NumberFormat.currency(
                        locale: 'pt_BR',
                        symbol: 'R\$',
                      ).format(boleto.valor),
                      vencimento: DateFormat('dd/MM/yyyy').format(
                          boleto.isPago && boleto.pagoEm != null
                              ? boleto.pagoEm!
                              : boleto.vencimento),
                      status: _mapStatus(boleto.status),
                      onCopiar: () => _copiarBoleto(boleto),
                      onPagar: () => _pagarBoleto(boleto),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
