import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../design_system/app_colors.dart' as ds_colors;
import '../../design_system/app_colors_theme.dart';
import '../../design_system/app_screen_scaffold.dart';
import '../../design_system/app_tokens.dart' as ds_tokens;
import '../../design_system/app_typography.dart' as ds_typography;
import '../../providers/cliente_dashboard_provider.dart';
import '../../routes/app_routes.dart';
import '../../design_system/app_components.dart';

class AppColors {
  static const primary = ds_colors.AppColors.primary;
  static const primaryOrange = ds_colors.AppColors.primary;
  static const gray200 = ds_colors.AppColors.borderLight;
  static const infoBlue = ds_colors.AppColors.info;
  static const lilac = ds_colors.AppColors.lilac;
  static const orange600 = ds_colors.AppColors.primaryLight;
  static const successGreen = ds_colors.AppColors.success;
  static const warningYellow = ds_colors.AppColors.warning;
}

class AppSpacing {
  static const xs = ds_tokens.AppSpacing.x1;
  static const sm = ds_tokens.AppSpacing.x2;
  static const md = ds_tokens.AppSpacing.x4;
  static const lg = ds_tokens.AppSpacing.x6;
  static const xl = ds_tokens.AppSpacing.x8;
  static const x2l = ds_tokens.AppSpacing.x10;
  static const x3l = ds_tokens.AppSpacing.x12;
  static const screenPadding = ds_tokens.AppSpacing.x6;
}

class AppRadius {
  static const md = ds_tokens.AppRadius.md;
  static const lg = ds_tokens.AppRadius.lg;
  static const full = ds_tokens.AppRadius.full;
  static const pill = ds_tokens.AppRadius.full;
}

class AppTypography {
  static const h2 = ds_typography.AppTypography.h2;
  static const h3 = ds_typography.AppTypography.h3;
  static const bodyLarge = ds_typography.AppTypography.bodyLarge;
  static const bodySmall = ds_typography.AppTypography.bodySmall;
  static const caption = ds_typography.AppTypography.caption;
  static const labelLarge = ds_typography.AppTypography.label;
  static const labelSmall = ds_typography.AppTypography.caption;
}

class ClienteScreen extends ConsumerWidget {
  const ClienteScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashAsync = ref.watch(clienteDashboardProvider);
    final period = ref.watch(clientePeriodProvider);

    return AppScreenScaffold(
      currentRoute: AppRoutes.cliente,
      eyebrow: 'PAINEL DO PARCEIRO',
      title: 'Minha Loja',
      subtitle: 'Visão geral da performance de lives',
      titleSerif: true,
      actions: [_PeriodSelector(period: period)],
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.screenPadding),
        child: dashAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Erro: $error'),
                const SizedBox(height: AppSpacing.md),
                AppPrimaryButton(
                  label: 'Tentar novamente',
                  onPressed: () =>
                      ref.read(clienteDashboardProvider.notifier).refresh(),
                  icon: Icons.refresh_rounded,
                ),
              ],
            ),
          ),
          data: (dashboard) =>
              _ClienteContent(dashboard: dashboard, period: period),
        ),
      ),
    );
  }
}

class _ClienteContent extends StatelessWidget {
  static final NumberFormat _currency = NumberFormat.simpleCurrency(
    locale: 'pt_BR',
  );

  final ClienteDashboard dashboard;
  final ClientePeriod period;

  const _ClienteContent({required this.dashboard, required this.period});

  @override
  Widget build(BuildContext context) {
    final crescendo = dashboard.crescimentoPct >= 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (dashboard.liveAtiva != null) ...[
          _LivePanel(live: dashboard.liveAtiva!),
          const SizedBox(height: AppSpacing.x2l),
        ],
        Wrap(
          spacing: AppSpacing.md,
          runSpacing: AppSpacing.md,
          children: [
            _MetricBox(
              child: MetricCard(
                label: 'GMV DO MÊS',
                value: _currency.format(dashboard.faturamentoMes),
                icon: Icons.payments_rounded,
                iconColor: AppColors.primary,
                subtitle:
                    '${crescendo ? '+' : ''}${dashboard.crescimentoPct}% vs. mês anterior',
              ),
            ),
            _MetricBox(
              child: MetricCard(
                label: 'ITENS VENDIDOS',
                value: '${dashboard.volumeVendas}',
                icon: Icons.inventory_2_outlined,
                iconColor: AppColors.infoBlue,
                subtitle: '${dashboard.pedidos} pedidos capturados',
              ),
            ),
            _MetricBox(
              child: MetricCard(
                label: 'ROAS',
                value: dashboard.roas.toStringAsFixed(2),
                icon: Icons.show_chart_rounded,
                iconColor: AppColors.successGreen,
                subtitle: 'GMV sobre valor investido',
              ),
            ),
            _MetricBox(
              child: MetricCard(
                label: 'HORAS DE LIVE',
                value: dashboard.horasLive.toStringAsFixed(1),
                icon: Icons.schedule_rounded,
                iconColor: AppColors.lilac,
                subtitle: '${dashboard.totalLives} lives no período',
              ),
            ),
            _MetricBox(
              child: MetricCard(
                label: 'VALOR INVESTIDO',
                value: _currency.format(dashboard.valorInvestidoMes),
                icon: Icons.savings_rounded,
                iconColor: AppColors.warningYellow,
                subtitle: 'Proporcional às horas usadas',
              ),
            ),
            _MetricBox(
              child: MetricCard(
                label: 'ENGAJAMENTO',
                value: '${dashboard.comentarios}',
                icon: Icons.forum_rounded,
                iconColor: AppColors.orange600,
                subtitle: '${dashboard.viewers} viewers no acumulado',
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.x3l),
        _PerformanceSection(dashboard: dashboard),
        const SizedBox(height: AppSpacing.x3l),
        _BenchmarkSection(
          nicho: dashboard.benchmarkNicho,
          geral: dashboard.benchmarkGeral,
        ),
        const SizedBox(height: AppSpacing.x3l),
        LayoutBuilder(
          builder: (context, constraints) {
            final isWide = constraints.maxWidth >= 980;
            final children = [
              Expanded(
                flex: 3,
                child: _RecentLivesCard(lives: dashboard.lives),
              ),
              const SizedBox(width: AppSpacing.lg),
              Expanded(
                flex: 2,
                child: _MaisVendidosCard(produtos: dashboard.maisVendidos),
              ),
            ];

            if (isWide) {
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: children,
              );
            }

            return Column(
              children: [
                _RecentLivesCard(lives: dashboard.lives),
                const SizedBox(height: AppSpacing.lg),
                _MaisVendidosCard(produtos: dashboard.maisVendidos),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _MetricBox extends StatelessWidget {
  final Widget child;

  const _MetricBox({required this.child});

  @override
  Widget build(BuildContext context) {
    return SizedBox(width: 220, child: child);
  }
}

class _PeriodSelector extends ConsumerWidget {
  static final DateFormat _periodFormat = DateFormat.yMMMM('pt_BR');

  final ClientePeriod period;

  const _PeriodSelector({required this.period});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final label = _periodFormat.format(DateTime(period.ano, period.mes));

    return AppCard(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      shadow: const [],
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            tooltip: 'Mês anterior',
            onPressed: () => ref
                .read(clienteDashboardProvider.notifier)
                .setPeriodo(period.previous()),
            icon: const Icon(Icons.chevron_left_rounded),
          ),
          SizedBox(
            width: 150,
            child: Text(
              label,
              textAlign: TextAlign.center,
              style: AppTypography.bodySmall.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          IconButton(
            tooltip: 'Próximo mês',
            onPressed: () => ref
                .read(clienteDashboardProvider.notifier)
                .setPeriodo(period.next()),
            icon: const Icon(Icons.chevron_right_rounded),
          ),
          const SizedBox(width: AppSpacing.xs),
          IconButton(
            tooltip: 'Atualizar',
            onPressed: () =>
                ref.read(clienteDashboardProvider.notifier).refresh(),
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
    );
  }
}

class _PerformanceSection extends StatelessWidget {
  static final NumberFormat _currency = NumberFormat.simpleCurrency(
    locale: 'pt_BR',
  );

  final ClienteDashboard dashboard;

  const _PerformanceSection({required this.dashboard});

  @override
  Widget build(BuildContext context) {
    final bestMonth = dashboard.seriesMensais
        .where((month) => month.gmvTotal > 0)
        .fold<SerieMensal?>(null, (best, current) {
      if (best == null || current.gmvTotal > best.gmvTotal) return current;
      return best;
    });

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'DASHBOARD DO PERÍODO',
          style: AppTypography.labelSmall.copyWith(
            fontWeight: FontWeight.bold,
            letterSpacing: 1,
            color: context.colors.textPrimary,
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        Wrap(
          spacing: AppSpacing.lg,
          runSpacing: AppSpacing.lg,
          children: [
            SizedBox(
              width: 360,
              child: _HorariosCard(horarios: dashboard.melhoresHorariosVenda),
            ),
            SizedBox(
              width: 360,
              child: _InsightCard(
                icon: Icons.rocket_launch_rounded,
                title: 'Pico de performance',
                value: bestMonth == null
                    ? _currency.format(0)
                    : _currency.format(bestMonth.gmvTotal),
                description: bestMonth == null
                    ? 'Sem GMV registrado no ano selecionado.'
                    : 'Melhor mês do ano: ${bestMonth.mes.toString().padLeft(2, '0')}/${bestMonth.ano}.',
              ),
            ),
            SizedBox(
              width: 360,
              child: _InsightCard(
                icon: Icons.groups_rounded,
                title: 'Engajamento',
                value: '${dashboard.likes + dashboard.shares}',
                description:
                    '${dashboard.likes} likes, ${dashboard.shares} shares e ${dashboard.comentarios} comentários.',
              ),
            ),
            if (dashboard.rankingDia != null)
              SizedBox(
                width: 360,
                child: _InsightCard(
                  icon: Icons.emoji_events_rounded,
                  title: 'Ranking do período',
                  value: '#${dashboard.rankingDia!.posicao}',
                  description:
                      '${_currency.format(dashboard.rankingDia!.gmvDia)} entre ${dashboard.rankingDia!.totalParticipantes} parceiros.',
                ),
              ),
          ],
        ),
      ],
    );
  }
}

class _HorariosCard extends StatelessWidget {
  static final NumberFormat _currency = NumberFormat.simpleCurrency(
    locale: 'pt_BR',
  );

  final List<HorarioVenda> horarios;

  const _HorariosCard({required this.horarios});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _CardTitle(
            icon: Icons.access_time_filled_rounded,
            title: 'Melhores horários',
          ),
          const SizedBox(height: AppSpacing.md),
          if (horarios.isEmpty)
            Text(
              'Sem vendas suficientes no período.',
              style: TextStyle(color: context.colors.textSecondary),
            )
          else
            ...horarios.map(
              (horario) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 7),
                child: Row(
                  children: [
                    SizedBox(
                      width: 46,
                      child: Text(
                        horario.label,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(AppRadius.pill),
                        child: LinearProgressIndicator(
                          minHeight: 8,
                          value: _progress(horario),
                          backgroundColor: AppColors.gray200,
                          color: AppColors.primaryOrange,
                        ),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Text(_currency.format(horario.gmvTotal)),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  double _progress(HorarioVenda item) {
    final maxGmv = horarios.fold<double>(
      0,
      (max, horario) => horario.gmvTotal > max ? horario.gmvTotal : max,
    );
    if (maxGmv <= 0) return 0;
    return (item.gmvTotal / maxGmv).clamp(0.0, 1.0);
  }
}

class _InsightCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;
  final String description;

  const _InsightCard({
    required this.icon,
    required this.title,
    required this.value,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _CardTitle(icon: icon, title: title),
          const SizedBox(height: AppSpacing.md),
          Text(value, style: AppTypography.h2.copyWith(fontSize: 26)),
          const SizedBox(height: AppSpacing.sm),
          Text(
            description,
            style: TextStyle(color: context.colors.textSecondary),
          ),
        ],
      ),
    );
  }
}

class _CardTitle extends StatelessWidget {
  final IconData icon;
  final String title;

  const _CardTitle({required this.icon, required this.title});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: AppColors.primaryOrange, size: 20),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: Text(
            title,
            style: AppTypography.bodyLarge.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ],
    );
  }
}

class _BenchmarkSection extends StatelessWidget {
  final BenchmarkResumo? nicho;
  final BenchmarkResumo? geral;

  const _BenchmarkSection({required this.nicho, required this.geral});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'BENCHMARK',
          style: AppTypography.labelSmall.copyWith(
            fontWeight: FontWeight.bold,
            letterSpacing: 1,
            color: context.colors.textPrimary,
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        if (nicho == null && geral == null)
          AppCard(
            shadow: const [],
            child: Text(
              'Os dados comparativos ainda estão em processamento.',
              style: TextStyle(color: context.colors.textSecondary),
            ),
          )
        else
          Wrap(
            spacing: AppSpacing.lg,
            runSpacing: AppSpacing.lg,
            children: [
              if (nicho != null)
                SizedBox(
                  width: 360,
                  child: _BenchmarkCard(title: 'Seu nicho', benchmark: nicho!),
                ),
              if (geral != null)
                SizedBox(
                  width: 360,
                  child: _BenchmarkCard(
                    title: 'Unidade geral',
                    benchmark: geral!,
                  ),
                ),
            ],
          ),
      ],
    );
  }
}

class _BenchmarkCard extends StatelessWidget {
  static final NumberFormat _currency = NumberFormat.simpleCurrency(
    locale: 'pt_BR',
  );

  final String title;
  final BenchmarkResumo benchmark;

  const _BenchmarkCard({required this.title, required this.benchmark});

  @override
  Widget build(BuildContext context) {
    final progress = (benchmark.percentualDaMedia / 100).clamp(0.0, 1.0);

    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _CardTitle(icon: Icons.query_stats_rounded, title: title),
          if (benchmark.nicho != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              benchmark.nicho!,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ],
          const SizedBox(height: AppSpacing.md),
          Text(
            '${benchmark.percentualDaMedia.toStringAsFixed(0)}% da média',
            style: AppTypography.h2.copyWith(fontSize: 24),
          ),
          const SizedBox(height: AppSpacing.sm),
          ClipRRect(
            borderRadius: BorderRadius.circular(AppRadius.pill),
            child: LinearProgressIndicator(
              minHeight: 10,
              value: progress,
              backgroundColor: AppColors.gray200,
              color: benchmark.acimaDaMedia
                  ? AppColors.successGreen
                  : AppColors.primaryOrange,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: _MiniMetric(
                  label: 'Seu GMV',
                  value: _currency.format(benchmark.meuGmv),
                ),
              ),
              Expanded(
                child: _MiniMetric(
                  label: 'Média',
                  value: _currency.format(benchmark.mediaGmv),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          _MiniMetric(
            label: 'Amostra',
            value: '${benchmark.amostra} parceiros',
          ),
        ],
      ),
    );
  }
}

class _MiniMetric extends StatelessWidget {
  final String label;
  final String value;

  const _MiniMetric({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTypography.caption.copyWith(color: context.colors.textMuted),
        ),
        const SizedBox(height: 3),
        Text(
          value,
          style: AppTypography.bodySmall.copyWith(fontWeight: FontWeight.w700),
        ),
      ],
    );
  }
}

class _LivePanel extends StatelessWidget {
  static final NumberFormat _currency = NumberFormat.simpleCurrency(
    locale: 'pt_BR',
  );

  final LiveAtiva live;

  const _LivePanel({required this.live});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      borderColor: AppColors.successGreen,
      padding: const EdgeInsets.all(AppSpacing.xl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md,
                  vertical: AppSpacing.xs,
                ),
                decoration: BoxDecoration(
                  color: AppColors.successGreen,
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                ),
                child: Text(
                  'AO VIVO AGORA',
                  style: AppTypography.caption.copyWith(
                    color: context.colors.bgCard,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const Spacer(),
              Icon(
                Icons.timer_outlined,
                color: context.colors.textMuted,
                size: 18,
              ),
              const SizedBox(width: AppSpacing.xs),
              Text('${live.duracaoMin} min'),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          Wrap(
            spacing: AppSpacing.x2l,
            runSpacing: AppSpacing.md,
            children: [
              _LiveMetric(
                icon: Icons.payments_rounded,
                label: 'GMV atual',
                value: _currency.format(live.gmvAtual),
              ),
              _LiveMetric(
                icon: Icons.visibility_rounded,
                label: 'Viewers',
                value: '${live.viewerCount}',
              ),
              _LiveMetric(
                icon: Icons.shopping_cart_rounded,
                label: 'Pedidos',
                value: '${live.pedidos}',
              ),
              _LiveMetric(
                icon: Icons.forum_rounded,
                label: 'Comentários',
                value: '${live.comentarios}',
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _LiveMetric extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _LiveMetric({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 150,
      child: Row(
        children: [
          Icon(icon, color: AppColors.primaryOrange, size: 22),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: AppTypography.bodyLarge.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  label,
                  style: AppTypography.caption.copyWith(
                    color: context.colors.textMuted,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _RecentLivesCard extends StatelessWidget {
  static final NumberFormat _currency = NumberFormat.simpleCurrency(
    locale: 'pt_BR',
  );
  static final DateFormat _date = DateFormat('dd/MM HH:mm', 'pt_BR');

  final List<ClienteLive> lives;

  const _RecentLivesCard({required this.lives});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _CardTitle(
            icon: Icons.video_library_rounded,
            title: 'Lives do período',
          ),
          const SizedBox(height: AppSpacing.md),
          if (lives.isEmpty)
            Text(
              'Nenhuma live registrada neste período.',
              style: TextStyle(color: context.colors.textSecondary),
            )
          else
            ...lives.take(5).map(
                  (live) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 9),
                    child: Row(
                      children: [
                        SizedBox(
                          width: 86,
                          child: Text(
                            live.iniciadoEm == null
                                ? '--'
                                : _date.format(live.iniciadoEm!.toLocal()),
                            style: AppTypography.caption.copyWith(
                              color: context.colors.textMuted,
                            ),
                          ),
                        ),
                        Expanded(
                          child: Text(
                            '${live.duracaoHoras.toStringAsFixed(1)}h • ${live.itensVendidos} itens • ROAS ${live.roas.toStringAsFixed(2)}',
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Text(
                          _currency.format(live.gmv),
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                  ),
                ),
        ],
      ),
    );
  }
}

class _MaisVendidosCard extends StatelessWidget {
  static final NumberFormat _currency = NumberFormat.simpleCurrency(
    locale: 'pt_BR',
  );

  final List<ProdutoVendido> produtos;

  const _MaisVendidosCard({required this.produtos});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _CardTitle(
            icon: Icons.inventory_2_rounded,
            title: 'Produtos mais vendidos',
          ),
          const SizedBox(height: AppSpacing.md),
          if (produtos.isEmpty)
            Text(
              'Nenhuma venda registrada neste mês.',
              style: TextStyle(color: context.colors.textMuted),
            )
          else
            ...produtos.map(
              (produto) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      alignment: Alignment.center,
                      padding: const EdgeInsets.symmetric(
                        vertical: AppSpacing.xs,
                      ),
                      decoration: BoxDecoration(
                        color: context.colors.bgMuted,
                        borderRadius: BorderRadius.circular(AppRadius.md),
                      ),
                      child: Text(
                        '${produto.qty}x',
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Text(
                        produto.produto,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text(_currency.format(produto.valor)),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
