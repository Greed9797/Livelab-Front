import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../design_system/design_system.dart';
import '../../providers/contratos_provider.dart';
import '../../routes/app_routes.dart';
import '../../widgets/app_scaffold.dart';
import 'widgets/auditoria_contract_card.dart';
import 'widgets/auditoria_tabs.dart';
import 'widgets/pendencia_modal.dart';
import 'widgets/reprovar_modal.dart';

class AnaliseCreditoScreen extends ConsumerStatefulWidget {
  const AnaliseCreditoScreen({super.key});

  @override
  ConsumerState<AnaliseCreditoScreen> createState() =>
      _AnaliseCreditoScreenState();
}

class _AnaliseCreditoScreenState extends ConsumerState<AnaliseCreditoScreen>
    with WidgetsBindingObserver {
  Timer? _pollingTimer;
  bool _isRefreshing = false;

  void _showActionFeedback(String message, {bool isError = false}) {
    if (!mounted) return;
    final messenger = ScaffoldMessenger.of(context);
    messenger.showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? AppColors.danger : null,
      ),
    );
  }

  void _startPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      _refreshCurrentAba();
    });
  }

  void _stopPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
  }

  Future<void> _refreshCurrentAba({bool silent = true}) async {
    if (!mounted || _isRefreshing) return;

    final aba = ref.read(auditoriaAbaProvider);
    final current = ref.read(analiseCreditoProvider(aba));
    if (current.isLoading) return;

    _isRefreshing = true;
    try {
      ref.read(contratosProvider.notifier).refreshAuditoriaAba(aba);
      await ref.read(analiseCreditoProvider(aba).future);
    } catch (error) {
      if (!silent) {
        _showActionFeedback(
          'Não foi possível atualizar a auditoria agora: $error',
          isError: true,
        );
      }
    } finally {
      _isRefreshing = false;
    }
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _startPolling();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _startPolling();
      _refreshCurrentAba();
      return;
    }

    if (state == AppLifecycleState.inactive ||
        state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden ||
        state == AppLifecycleState.detached) {
      _stopPolling();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _stopPolling();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final aba = ref.watch(auditoriaAbaProvider);
    final contratosAsync = ref.watch(analiseCreditoProvider(aba));

    return AppScaffold(
      currentRoute: AppRoutes.auditoriaContratos,
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Auditoria de Contratos', style: AppTypography.h2),
            const SizedBox(height: 6),
            Text(
              'Fila de ativação comercial e análise interna.',
              style: AppTypography.bodySmall,
            ),
            const SizedBox(height: 20),
            AuditoriaTabs(
              current: aba,
              onChanged: (value) =>
                  ref.read(auditoriaAbaProvider.notifier).state = value,
            ),
            const SizedBox(height: 20),
            Expanded(
              child: contratosAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (error, _) => _ErrorState(
                  message: 'Não foi possível carregar a auditoria agora.',
                  onRetry: () => _refreshCurrentAba(silent: false),
                ),
                data: (items) {
                  if (items.isEmpty) {
                    return const _EmptyState();
                  }

                  return ListView.separated(
                    itemCount: items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (_, index) {
                      final contrato = items[index];
                      return AuditoriaContractCard(
                        contrato: contrato,
                        onApprove: () async {
                          try {
                            await ref
                                .read(contratosProvider.notifier)
                                .aprovar(contrato.id);
                            if (!mounted) return;
                            _showActionFeedback(
                              'Sucesso! ${contrato.clienteNome ?? 'Contrato'} aprovado para ativação comercial.',
                            );
                          } catch (error) {
                            if (!mounted) return;
                            _showActionFeedback(
                              'Não foi possível aprovar agora: $error',
                              isError: true,
                            );
                          }
                        },
                        onPendencia: () async {
                          final motivo = await showDialog<String>(
                            context: context,
                            builder: (_) => const PendenciaModal(),
                          );
                          if (motivo == null || motivo.isEmpty) return;
                          try {
                            await ref
                                .read(contratosProvider.notifier)
                                .pendencia(contrato.id, motivo);
                            if (!mounted) return;
                            _showActionFeedback(
                              'Contrato movido para pendência. O time comercial já pode ajustar e reenviar.',
                            );
                          } catch (error) {
                            if (!mounted) return;
                            _showActionFeedback(
                              'Não foi possível registrar a pendência: $error',
                              isError: true,
                            );
                          }
                        },
                        onReprovar: () async {
                          final motivo = await showDialog<String>(
                            context: context,
                            builder: (_) => const ReprovarModal(),
                          );
                          if (motivo == null || motivo.isEmpty) return;
                          try {
                            await ref
                                .read(contratosProvider.notifier)
                                .reprovar(contrato.id, motivo);
                            if (!mounted) return;
                            _showActionFeedback(
                              'Contrato reprovado com orientação registrada para o próximo contato comercial.',
                            );
                          } catch (error) {
                            if (!mounted) return;
                            _showActionFeedback(
                              'Não foi possível reprovar agora: $error',
                              isError: true,
                            );
                          }
                        },
                        onArquivar: () async {
                          try {
                            await ref
                                .read(contratosProvider.notifier)
                                .arquivar(contrato.id);
                            if (!mounted) return;
                            _showActionFeedback(
                              'Contrato arquivado. Você pode reabrir uma nova análise se necessário.',
                            );
                          } catch (error) {
                            if (!mounted) return;
                            _showActionFeedback(
                              'Não foi possível arquivar agora: $error',
                              isError: true,
                            );
                          }
                        },
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.fact_check_outlined,
              size: 48, color: context.colors.textSecondary),
          const SizedBox(height: 12),
          Text('Nenhum contrato nesta fila', style: AppTypography.h3),
          const SizedBox(height: 6),
          Text(
            'Assim que uma nova venda entrar em auditoria, ela aparecerá aqui.',
            style: AppTypography.bodySmall,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.cloud_off_rounded,
              size: 48, color: context.colors.textSecondary),
          const SizedBox(height: 12),
          Text('Ops, algo deu errado', style: AppTypography.h3),
          const SizedBox(height: 8),
          Text(message,
              style: AppTypography.bodySmall, textAlign: TextAlign.center),
          const SizedBox(height: 16),
          AppPrimaryButton(onPressed: onRetry, label: 'Tentar novamente'),
        ],
      ),
    );
  }
}
