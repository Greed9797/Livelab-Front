import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/contrato.dart';
import '../../widgets/app_scaffold.dart';
import '../../widgets/banner_alerta_comercial.dart';
import '../../providers/contratos_provider.dart';
import '../../routes/app_routes.dart';
import '../../design_system/design_system.dart';
import '../auditoria/widgets/assumir_risco_modal.dart';

/// Tela de análise financeira — chama API real e exibe resultado
class AnaliseFinanceiraScreen extends ConsumerStatefulWidget {
  const AnaliseFinanceiraScreen({super.key});
  @override
  ConsumerState<AnaliseFinanceiraScreen> createState() => _AnaliseState();
}

class _AnaliseState extends ConsumerState<AnaliseFinanceiraScreen> {
  // 0=analisando, 1=aprovado, 2=recusado, 3=erro
  int _fase = 0;
  int? _score;
  String? _erro;

  String? get _contratoId {
    final args = ModalRoute.of(context)?.settings.arguments as Map?;
    return args?['contratoId'] as String?;
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _analisar());
  }

  Future<void> _analisar() async {
    final args = ModalRoute.of(context)?.settings.arguments as Map?;
    final contratoId = args?['contratoId'] as String?;

    if (contratoId == null) {
      if (mounted) {
        setState(() {
          _fase = 3;
          _erro =
              'ID do contrato não informado. Retorne à esteira de vendas para iniciar uma análise de crédito.';
        });
      }
      return;
    }

    // Se veio da assinatura digital, o resultado já foi calculado
    final aprovadoAutomatico = args?['aprovadoAutomatico'] as bool?;
    if (aprovadoAutomatico != null) {
      if (mounted) {
        setState(() {
          _score = args?['score'] as int?;
          _fase = aprovadoAutomatico ? 1 : 2;
        });
      }
      return;
    }

    // Fallback: chamar API (quando acessado fora do fluxo de assinatura)
    try {
      final result =
          await ref.read(contratosProvider.notifier).analisar(contratoId);
      if (!mounted) return;
      setState(() {
        _score = result['score'] as int?;
        _fase = (result['aprovado'] as bool? ?? false) ? 1 : 2;
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _fase = 3;
          _erro = e.toString();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final contratoBanner = _contratoBanner;

    return AppScaffold(
      currentRoute: AppRoutes.vendas,
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 500),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.x10),
              child: switch (_fase) {
                0 => const _AnalisandoView(),
                1 => Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (contratoBanner != null) ...[
                        BannerAlertaComercial(contrato: contratoBanner),
                        const SizedBox(height: AppSpacing.x5),
                      ],
                      _AprovadoView(
                        score: _score,
                        onContinuar: () => Navigator.pushNamedAndRemoveUntil(
                          context,
                          AppRoutes.vendas,
                          (_) => false,
                        ),
                      ),
                    ],
                  ),
                2 => Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (contratoBanner != null) ...[
                        BannerAlertaComercial(contrato: contratoBanner),
                        const SizedBox(height: AppSpacing.x5),
                      ],
                      _RecusadoView(
                        score: _score,
                        onAssumir: () async {
                          final id = _contratoId;
                          if (id == null) return;
                          final accepted = await showDialog<bool>(
                            context: context,
                            barrierDismissible: false,
                            builder: (_) => AssumirRiscoModal(
                              contrato: Contrato(
                                id: id,
                                clienteId: '',
                                status: 'reprovado',
                                valorFixo: 0,
                                comissaoPct: 0,
                                deRisco: true,
                              ),
                            ),
                          );
                          if (!context.mounted) return;
                          if (accepted == true) {
                            final messenger = ScaffoldMessenger.of(context);
                            messenger.showSnackBar(
                              const SnackBar(
                                content: Text(
                                  'Sucesso! Risco assumido e contrato liberado para seguir na esteira comercial.',
                                ),
                              ),
                            );
                            Navigator.pushNamedAndRemoveUntil(
                              context,
                              AppRoutes.vendas,
                              (_) => false,
                            );
                          }
                        },
                        onCancelar: () async {
                          final id = _contratoId;
                          if (id == null) return;
                          try {
                            await ref
                                .read(contratosProvider.notifier)
                                .cancelar(id);
                          } catch (_) {}
                          if (!context.mounted) return;
                          Navigator.pushNamedAndRemoveUntil(
                            context,
                            AppRoutes.vendas,
                            (_) => false,
                          );
                        },
                      ),
                    ],
                  ),
                _ => _ErroView(
                    mensagem: _erro ?? 'Erro desconhecido',
                    onTentar: () {
                      if (_contratoId == null) {
                        Navigator.pushNamedAndRemoveUntil(
                          context,
                          AppRoutes.vendas,
                          (_) => false,
                        );
                        return;
                      }
                      setState(() => _fase = 0);
                      _analisar();
                    },
                  ),
              },
            ),
          ),
        ),
      ),
    );
  }

  Contrato? get _contratoBanner {
    final id = _contratoId;
    if (id == null) return null;

    final status = switch (_fase) {
      1 => 'aprovado',
      2 => 'reprovado',
      _ => 'em_analise',
    };

    return Contrato(
      id: id,
      clienteId: '',
      status: status,
      valorFixo: 0,
      comissaoPct: 0,
      deRisco: _fase == 2,
      clienteScore: _score,
      reprovacaoMotivo: _fase == 2
          ? 'Crédito acima da política padrão. Avalie opção de garantia adicional.'
          : null,
    );
  }
}

class _AnalisandoView extends StatelessWidget {
  const _AnalisandoView();
  @override
  Widget build(BuildContext context) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(),
          const SizedBox(height: AppSpacing.x6),
          Text('Analisando dados financeiros...',
              style: AppTypography.bodyLarge.copyWith(fontWeight: FontWeight.w500)),
          const SizedBox(height: AppSpacing.x2),
          Text('Consultando score de crédito',
              style: AppTypography.bodySmall.copyWith(color: context.colors.textSecondary)),
        ],
      );
}

class _AprovadoView extends StatelessWidget {
  final int? score;
  final VoidCallback onContinuar;
  const _AprovadoView({required this.score, required this.onContinuar});

  @override
  Widget build(BuildContext context) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.check_circle_rounded,
              color: AppColors.success, size: 64),
          const SizedBox(height: AppSpacing.x4),
          Text('APROVADO',
              style: AppTypography.h1.copyWith(
                  fontSize: 24,
                  color: AppColors.success,
                  fontWeight: FontWeight.w500)),
          if (score != null) ...[
            const SizedBox(height: AppSpacing.x2),
            Text('Score: $score/100',
                style: AppTypography.bodySmall.copyWith(color: context.colors.textSecondary)),
          ],
          const SizedBox(height: AppSpacing.x2),
          const Text('Cliente aprovado para contrato ativo!'),
          const SizedBox(height: AppSpacing.x6),
          AppPrimaryButton(
              label: 'CONTINUAR',
              onPressed: onContinuar,
              color: AppColors.success),
        ],
      );
}

class _RecusadoView extends StatelessWidget {
  final int? score;
  final VoidCallback onAssumir;
  final VoidCallback onCancelar;
  const _RecusadoView(
      {required this.score, required this.onAssumir, required this.onCancelar});

  @override
  Widget build(BuildContext context) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.warning_rounded, color: AppColors.danger, size: 64),
          const SizedBox(height: AppSpacing.x4),
          Text('CLIENTE COM ALTO RISCO',
              style: AppTypography.h3.copyWith(
                  color: AppColors.danger,
                  fontWeight: FontWeight.w500)),
          if (score != null) ...[
            const SizedBox(height: AppSpacing.x2),
            Text('Score: $score/100',
                style: AppTypography.bodySmall.copyWith(color: context.colors.textSecondary)),
          ],
          const SizedBox(height: AppSpacing.x3),
          Container(
            padding: const EdgeInsets.all(AppSpacing.x3),
            decoration: BoxDecoration(
              color: AppColors.danger.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: Text(
              'Você pode negociar pagamento antecipado ou assumir o risco.',
              style: TextStyle(color: AppColors.danger),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(height: AppSpacing.x6),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              AppPrimaryButton(
                  label: 'ASSUMIR RISCO',
                  onPressed: onAssumir,
                  color: AppColors.warning),
              const SizedBox(width: AppSpacing.x3),
              AppPrimaryButton(
                  label: 'CANCELAR',
                  onPressed: onCancelar,
                  outlined: true,
                  color: AppColors.danger),
            ],
          ),
        ],
      );
}

class _ErroView extends StatelessWidget {
  final String mensagem;
  final VoidCallback onTentar;
  const _ErroView({required this.mensagem, required this.onTentar});

  @override
  Widget build(BuildContext context) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.error_outline, color: AppColors.danger, size: 48),
          const SizedBox(height: AppSpacing.x3),
          Text(mensagem, textAlign: TextAlign.center),
          const SizedBox(height: AppSpacing.x4),
          AppPrimaryButton(
              onPressed: onTentar, label: 'Tentar novamente'),
        ],
      );
}
