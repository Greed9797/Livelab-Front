import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/analytics_provider.dart';
import '../../providers/configuracoes_provider.dart';
import '../../routes/app_routes.dart';
import '../../design_system/design_system.dart';
import '../../widgets/app_scaffold.dart';
import '../../widgets/charts/heatmap_horarios_chart.dart';

class AnaliseVendasScreen extends ConsumerStatefulWidget {
  const AnaliseVendasScreen({super.key});

  @override
  ConsumerState<AnaliseVendasScreen> createState() =>
      _AnaliseVendasScreenState();
}

class _AnaliseVendasScreenState extends ConsumerState<AnaliseVendasScreen> {
  bool _mostrarMeta = false;

  @override
  Widget build(BuildContext context) {
    final analyticsAsync = ref.watch(franqueadoAnalyticsResumoProvider);
    final metaReal = ref.watch(configuracoesProvider).valueOrNull?.metaDiariaGmv ?? 10000.0;

    return AppScaffold(
      currentRoute: AppRoutes.analise,
      child: analyticsAsync.when(
        loading: () => Center(
            child: CircularProgressIndicator(color: AppColors.primary)),
        error: (err, _) => _buildError(context, err.toString()),
        data: (analytics) => _buildDashboard(context, analytics, metaReal),
      ),
    );
  }

  Widget _buildError(BuildContext context, String error) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.error_outline_rounded,
              color: AppColors.danger, size: 48),
          const SizedBox(height: 16),
          Text(
            'Erro ao carregar o dashboard de vendas.',
            style:
                AppTypography.bodyLarge.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Text(
            error,
            style: AppTypography.bodySmall
                .copyWith(color: context.colors.textSecondary),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          AppPrimaryButton(
            onPressed: () => ref.invalidate(franqueadoAnalyticsResumoProvider),
            label: 'Tentar novamente',
          )
        ],
      ),
    );
  }

  Widget _buildDashboard(BuildContext context, dynamic analytics, double metaReal) {
    // Usamos slivers para melhor performance e elasticidade do layout.
    return CustomScrollView(
      slivers: [
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(AppSpacing.x6, AppSpacing.x8, AppSpacing.x6, AppSpacing.x4),
          sliver: SliverToBoxAdapter(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Inteligência Comercial', style: AppTypography.h1),
                    const SizedBox(height: 4),
                    Text(
                      'Visão estratégica e heatmap de conversão operacional.',
                      style: AppTypography.bodySmall
                          .copyWith(color: context.colors.textSecondary),
                    ),
                  ],
                ),
                // Toggle para demonstrar o gráfico com Meta vs Pico dinâmico
                Row(
                  children: [
                    Text('Exibir Meta',
                        style: AppTypography.caption
                            .copyWith(color: context.colors.textSecondary)),
                    Switch(
                      value: _mostrarMeta,
                      activeThumbColor: AppColors.primary,
                      onChanged: (val) {
                        setState(() {
                          _mostrarMeta = val;
                        });
                      },
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      icon: Icon(Icons.refresh_rounded,
                          color: context.colors.textSecondary),
                      tooltip: 'Atualizar',
                      onPressed: () =>
                          ref.invalidate(franqueadoAnalyticsResumoProvider),
                    ),
                  ],
                )
              ],
            ),
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.x6, vertical: AppSpacing.x2),
          sliver: SliverToBoxAdapter(
            child: LayoutBuilder(builder: (context, constraints) {
              // Largura do painel de controle
              return Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  color: context.colors.bgCard,
                  borderRadius: BorderRadius.circular(AppRadius.xl),
                  boxShadow: AppShadows.md,
                ),
                child: HeatmapHorariosChart(
                  dados: analytics.heatmapHorarios,
                  metaDiaria: _mostrarMeta ? metaReal : null,
                ),
              );
            }),
          ),
        ),

        const SliverToBoxAdapter(child: SizedBox.shrink())
      ],
    );
  }
}
