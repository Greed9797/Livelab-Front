import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../models/admin_master.dart';
import '../../providers/admin_master_provider.dart';
import '../../design_system/design_system.dart';
import '../../routes/app_routes.dart';
import '../../widgets/app_scaffold.dart';

List<String> _recentPeriods([int count = 6]) {
  final now = DateTime.now();
  return List.generate(count, (index) {
    final date = DateTime(now.year, now.month - index, 1);
    final month = date.month.toString().padLeft(2, '0');
    return '${date.year}-$month';
  });
}

String _periodLabel(String period) {
  final date = DateTime.parse('$period-01');
  return DateFormat('MMMM y', 'pt_BR').format(date);
}

String _currency(double value) {
  return NumberFormat.currency(
    locale: 'pt_BR',
    symbol: 'R\$',
    decimalDigits: 2,
  ).format(value);
}

String _signedPercent(double value) {
  final prefix = value > 0 ? '+' : '';
  return '$prefix${value.toStringAsFixed(1)}%';
}

Color _severityColor(String severity) {
  switch (severity) {
    case 'alta':
      return AppColors.danger;
    case 'media':
      return AppColors.warning;
    default:
      return AppColors.info;
  }
}

class MasterDashboardScreen extends ConsumerStatefulWidget {
  const MasterDashboardScreen({super.key});

  @override
  ConsumerState<MasterDashboardScreen> createState() =>
      _MasterDashboardScreenState();
}

class _MasterDashboardScreenState extends ConsumerState<MasterDashboardScreen> {
  late String _selectedPeriod;

  @override
  void initState() {
    super.initState();
    _selectedPeriod = _recentPeriods().first;
  }

  @override
  Widget build(BuildContext context) {
    final dashboardAsync = ref.watch(masterDashboardProvider(_selectedPeriod));

    return AppScaffold(
      currentRoute: AppRoutes.masterDashboard,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final contentWidth = constraints.maxWidth;

          return Padding(
            padding: const EdgeInsets.all(AppSpacing.x6),
            child: dashboardAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => _MasterErrorState(
                message: error.toString(),
                onRetry: () =>
                    ref.invalidate(masterDashboardProvider(_selectedPeriod)),
              ),
              data: (dashboard) => SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _DashboardHeader(
                      period: _selectedPeriod,
                      periods: _recentPeriods(),
                      onPeriodChanged: (value) {
                        if (value == null) return;
                        setState(() => _selectedPeriod = value);
                      },
                      onRefresh: () => ref.invalidate(
                        masterDashboardProvider(_selectedPeriod),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.x5),
                    _ExecutiveSummaryBanner(
                      summary: dashboard.executiveSummary,
                    ),
                    const SizedBox(height: AppSpacing.x5),
                    _MetricsGrid(width: contentWidth, cards: dashboard.cards),
                    const SizedBox(height: AppSpacing.x5),
                    _AdaptiveGrid(
                      width: contentWidth,
                      minCardWidth: 320,
                      children: [
                        _RankingCard(
                          title: 'Ranking por Faturamento',
                          items: dashboard.revenueRanking,
                        ),
                        _RankingCard(
                          title: 'Ranking por Crescimento',
                          items: dashboard.growthRanking,
                          highlightGrowth: true,
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.x5),
                    _AlertsCard(alerts: dashboard.alerts),
                    const SizedBox(height: AppSpacing.x5),
                    _AdaptiveGrid(
                      width: contentWidth,
                      minCardWidth: 420,
                      children: [
                        _RevenueHistoryCard(points: dashboard.networkHistory),
                        _GrowthCard(points: dashboard.unitGrowth),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.x5),
                    _AdaptiveGrid(
                      width: contentWidth,
                      minCardWidth: 320,
                      children: [
                        _PipelineCard(stages: dashboard.crmPipeline),
                        _CommissionSummaryCard(
                          summary: dashboard.commissionSummary,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _DashboardHeader extends StatelessWidget {
  final String period;
  final List<String> periods;
  final ValueChanged<String?> onPeriodChanged;
  final VoidCallback onRefresh;

  const _DashboardHeader({
    required this.period,
    required this.periods,
    required this.onPeriodChanged,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: AppSpacing.x3,
      runSpacing: AppSpacing.x3,
      crossAxisAlignment: WrapCrossAlignment.center,
      alignment: WrapAlignment.spaceBetween,
      children: [
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 620),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Painel Master', style: AppTypography.h1),
              const SizedBox(height: AppSpacing.x1),
              Text(
                'Leitura executiva da rede em poucos segundos, sem ruído operacional.',
                style: AppTypography.bodyLarge.copyWith(
                  color: context.colors.textSecondary,
                ),
              ),
            ],
          ),
        ),
        Wrap(
          spacing: AppSpacing.x3,
          runSpacing: AppSpacing.x3,
          children: [
            SizedBox(
              width: 220,
              child: DropdownButtonFormField<String>(
                key: ValueKey('dashboard-period-$period'),
                initialValue: period,
                decoration: const InputDecoration(
                  labelText: 'Período',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
                items: periods
                    .map(
                      (item) => DropdownMenuItem<String>(
                        value: item,
                        child: Text(
                          _periodLabel(item),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    )
                    .toList(),
                onChanged: onPeriodChanged,
              ),
            ),
            AppPrimaryButton(
              label: 'Atualizar',
              onPressed: onRefresh,
              icon: Icons.refresh_rounded,
            ),
          ],
        ),
      ],
    );
  }
}

class _ExecutiveSummaryBanner extends StatelessWidget {
  final String summary;

  const _ExecutiveSummaryBanner({required this.summary});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      color: AppColors.primaryLight,
      borderColor: context.colors.primarySoftFg.withValues(alpha: 0.3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: const BoxDecoration(
              color: AppColors.primary,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.insights_rounded, color: Colors.white),
          ),
          const SizedBox(width: AppSpacing.x4),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Resumo Executivo',
                  style: AppTypography.bodyMedium.copyWith(
                    color: context.colors.textPrimary,
                  ),
                ),
                const SizedBox(height: AppSpacing.x1),
                Text(
                  summary,
                  style: AppTypography.bodyLarge.copyWith(
                    color: context.colors.textPrimary,
                    height: 1.45,
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

class _MetricsGrid extends StatelessWidget {
  final double width;
  final MasterDashboardCards cards;

  const _MetricsGrid({required this.width, required this.cards});

  @override
  Widget build(BuildContext context) {
    final items = [
      MetricCard(
        label: 'UNIDADES ATIVAS',
        value: '${cards.unitsActive}',
        icon: Icons.storefront_rounded,
        iconColor: AppColors.success,
      ),
      MetricCard(
        label: 'CLIENTES ATIVOS',
        value: '${cards.clientsActive}',
        icon: Icons.people_alt_rounded,
        iconColor: AppColors.info,
      ),
      MetricCard(
        label: 'FATURAMENTO DA REDE',
        value: _currency(cards.grossRevenue),
        icon: Icons.payments_rounded,
        iconColor: AppColors.primary,
      ),
      MetricCard(
        label: 'RECEITA FRANQUEADORA',
        value: _currency(cards.franchisorNetRevenue),
        icon: Icons.account_balance_rounded,
        iconColor: context.colors.textPrimary,
      ),
      MetricCard(
        label: 'CONTRATOS PENDENTES',
        value: '${cards.pendingContracts}',
        icon: Icons.assignment_late_rounded,
        iconColor: AppColors.warning,
      ),
      MetricCard(
        label: 'CRESCIMENTO',
        value: _signedPercent(cards.growthPercent),
        icon: Icons.trending_up_rounded,
        iconColor:
            cards.growthPercent >= 0 ? AppColors.success : AppColors.danger,
      ),
      MetricCard(
        label: 'INADIMPLÊNCIA',
        value: _currency(cards.delinquencyValue),
        subtitle: _signedPercent(cards.delinquencyPercent),
        icon: Icons.warning_amber_rounded,
        iconColor: AppColors.danger,
      ),
      MetricCard(
        label: 'TICKET MÉDIO / UNIDADE',
        value: _currency(cards.averageTicketPerUnit),
        icon: Icons.sell_rounded,
        iconColor: AppColors.info,
      ),
    ];

    return _AdaptiveGrid(width: width, minCardWidth: 220, children: items);
  }
}

class _AdaptiveGrid extends StatelessWidget {
  final double width;
  final double minCardWidth;
  final List<Widget> children;

  const _AdaptiveGrid({
    required this.width,
    required this.minCardWidth,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    final columns =
        ((width / (minCardWidth + AppSpacing.x3)).floor()).clamp(1, 4).toInt();
    const spacing = AppSpacing.x3;
    final itemWidth =
        columns == 1 ? width : (width - (spacing * (columns - 1))) / columns;

    return Wrap(
      spacing: spacing,
      runSpacing: spacing,
      children: children
          .map((child) => SizedBox(width: itemWidth, child: child))
          .toList(),
    );
  }
}

class _RankingCard extends StatelessWidget {
  final String title;
  final List<MasterRankingItem> items;
  final bool highlightGrowth;

  const _RankingCard({
    required this.title,
    required this.items,
    this.highlightGrowth = false,
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: AppTypography.h3),
          const SizedBox(height: AppSpacing.x3),
          if (items.isEmpty)
            Text(
              'Sem dados suficientes para montar o ranking.',
              style: AppTypography.bodySmall,
            )
          else
            ...items.asMap().entries.map(
                  (entry) => Padding(
                    padding: EdgeInsets.only(
                      bottom: entry.key == items.length - 1 ? 0 : AppSpacing.x3,
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 32,
                          height: 32,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: context.colors.primarySoftBg,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '${entry.key + 1}',
                            style: AppTypography.bodyMedium.copyWith(
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.x3),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                entry.value.unitName,
                                style: AppTypography.bodyMedium.copyWith(
                                  color: context.colors.textPrimary,
                                ),
                              ),
                              Text(
                                _currency(entry.value.grossRevenue),
                                style: AppTypography.bodySmall,
                              ),
                            ],
                          ),
                        ),
                        if (highlightGrowth)
                          Text(
                            _signedPercent(entry.value.growthPercent),
                            style: AppTypography.bodyMedium.copyWith(
                              color: entry.value.growthPercent >= 0
                                  ? AppColors.success
                                  : AppColors.danger,
                            ),
                          )
                        else
                          Text(
                            _signedPercent(entry.value.growthPercent),
                            style: AppTypography.bodySmall,
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

class _AlertsCard extends StatelessWidget {
  final List<MasterAlertItem> alerts;

  const _AlertsCard({required this.alerts});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Alertas Críticos', style: AppTypography.h3),
          const SizedBox(height: AppSpacing.x3),
          if (alerts.isEmpty)
            Text(
              'Nenhum alerta crítico no período selecionado.',
              style: AppTypography.bodySmall,
            )
          else
            ...alerts.map(
              (alert) => Container(
                margin: const EdgeInsets.only(bottom: AppSpacing.x3),
                padding: const EdgeInsets.all(AppSpacing.x4),
                decoration: BoxDecoration(
                  color: _severityColor(alert.severity).withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: _severityColor(
                      alert.severity,
                    ).withValues(alpha: 0.2),
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.error_outline_rounded,
                      color: _severityColor(alert.severity),
                    ),
                    const SizedBox(width: AppSpacing.x3),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            alert.title,
                            style: AppTypography.bodyMedium.copyWith(
                              color: context.colors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: AppSpacing.x1),
                          Text(
                            alert.description,
                            style: AppTypography.bodySmall.copyWith(
                              color: context.colors.textPrimary,
                            ),
                          ),
                        ],
                      ),
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

class _RevenueHistoryCard extends StatelessWidget {
  final List<MasterHistoryPoint> points;

  const _RevenueHistoryCard({required this.points});

  @override
  Widget build(BuildContext context) {
    final maxValue = points.fold<double>(
      0,
      (max, point) => point.grossRevenue > max ? point.grossRevenue : max,
    );

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Receita Consolidada da Rede', style: AppTypography.h3),
          const SizedBox(height: AppSpacing.x1),
          Text(
            'Últimos 6 meses de faturamento bruto e receita da franqueadora.',
            style: AppTypography.bodySmall,
          ),
          const SizedBox(height: AppSpacing.x4),
          if (points.isEmpty || maxValue <= 0)
            SizedBox(
              height: 240,
              child: Center(
                child: Text(
                  'Sem histórico suficiente para o gráfico.',
                  style: AppTypography.bodySmall,
                ),
              ),
            )
          else
            SizedBox(
              height: 240,
              child: LineChart(
                LineChartData(
                  minY: 0,
                  gridData: FlGridData(
                    show: true,
                    horizontalInterval: maxValue / 4 == 0 ? 1 : maxValue / 4,
                  ),
                  borderData: FlBorderData(show: false),
                  titlesData: FlTitlesData(
                    topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 52,
                        interval: maxValue / 4 == 0 ? 1 : maxValue / 4,
                        getTitlesWidget: (value, _) => Text(
                          NumberFormat.compactCurrency(
                            locale: 'pt_BR',
                            symbol: 'R\$',
                          ).format(value),
                          style: AppTypography.caption,
                        ),
                      ),
                    ),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, _) {
                          final index = value.toInt();
                          if (index < 0 || index >= points.length) {
                            return const SizedBox.shrink();
                          }
                          return Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(
                              points[index].label,
                              style: AppTypography.caption,
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                  lineBarsData: [
                    LineChartBarData(
                      isCurved: true,
                      color: AppColors.primary,
                      barWidth: 3,
                      dotData: const FlDotData(show: true),
                      spots: points
                          .asMap()
                          .entries
                          .map(
                            (entry) => FlSpot(
                              entry.key.toDouble(),
                              entry.value.grossRevenue,
                            ),
                          )
                          .toList(),
                    ),
                    LineChartBarData(
                      isCurved: true,
                      color: context.colors.textPrimary,
                      barWidth: 3,
                      dotData: const FlDotData(show: true),
                      spots: points
                          .asMap()
                          .entries
                          .map(
                            (entry) => FlSpot(
                              entry.key.toDouble(),
                              entry.value.franchisorRevenue,
                            ),
                          )
                          .toList(),
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

class _GrowthCard extends StatelessWidget {
  final List<MasterGrowthUnit> points;

  const _GrowthCard({required this.points});

  @override
  Widget build(BuildContext context) {
    final maxValue = points.fold<double>(0, (max, point) {
      final abs = point.growthPercent.abs();
      return abs > max ? abs : max;
    });

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Crescimento por Unidade', style: AppTypography.h3),
          const SizedBox(height: AppSpacing.x1),
          Text(
            'Comparativo com o mês anterior por unidade.',
            style: AppTypography.bodySmall,
          ),
          const SizedBox(height: AppSpacing.x4),
          if (points.isEmpty || maxValue <= 0)
            SizedBox(
              height: 240,
              child: Center(
                child: Text(
                  'Sem variação relevante para exibir.',
                  style: AppTypography.bodySmall,
                ),
              ),
            )
          else
            SizedBox(
              height: 240,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  maxY: maxValue + 10,
                  minY: 0,
                  borderData: FlBorderData(show: false),
                  gridData: FlGridData(
                    show: true,
                    horizontalInterval: ((maxValue + 10) / 4).clamp(
                      1,
                      double.infinity,
                    ),
                  ),
                  titlesData: FlTitlesData(
                    topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 42,
                        getTitlesWidget: (value, _) => Text(
                          '${value.toStringAsFixed(0)}%',
                          style: AppTypography.caption,
                        ),
                      ),
                    ),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, _) {
                          final index = value.toInt();
                          if (index < 0 || index >= points.length) {
                            return const SizedBox.shrink();
                          }
                          return Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(
                              points[index].unitName.split(' ').first,
                              style: AppTypography.caption,
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                  barGroups: points.asMap().entries.map((entry) {
                    final growth = entry.value.growthPercent.abs();
                    return BarChartGroupData(
                      x: entry.key,
                      barRods: [
                        BarChartRodData(
                          toY: growth,
                          color: entry.value.growthPercent >= 0
                              ? AppColors.success
                              : AppColors.danger,
                          width: 20,
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ],
                    );
                  }).toList(),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _PipelineCard extends StatelessWidget {
  final List<MasterPipelineStage> stages;

  const _PipelineCard({required this.stages});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Pipeline do CRM', style: AppTypography.h3),
          const SizedBox(height: AppSpacing.x1),
          Text(
            'Estrutura pronta para expansão comercial global.',
            style: AppTypography.bodySmall,
          ),
          const SizedBox(height: AppSpacing.x4),
          ...stages.map(
            (stage) => Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.x2),
              child: Row(
                children: [
                  Expanded(
                    child: Text(stage.stage, style: AppTypography.bodyMedium),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: context.colors.bgMuted,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      '${stage.count}',
                      style: AppTypography.caption.copyWith(
                        color: context.colors.textPrimary,
                      ),
                    ),
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

class _CommissionSummaryCard extends StatelessWidget {
  final MasterCommissionSummary summary;

  const _CommissionSummaryCard({required this.summary});

  @override
  Widget build(BuildContext context) {
    final items = [
      ('Previsto', summary.forecast, AppColors.primary),
      ('Recebido', summary.received, AppColors.success),
      ('Pendente', summary.pending, AppColors.warning),
      ('Inadimplente', summary.overdue, AppColors.danger),
    ];

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Comissionamento da Franqueadora', style: AppTypography.h3),
          const SizedBox(height: AppSpacing.x1),
          Text(
            'Leitura direta do caixa da franqueadora no período.',
            style: AppTypography.bodySmall,
          ),
          const SizedBox(height: AppSpacing.x4),
          ...items.map(
            (item) => Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.x3),
              child: Row(
                children: [
                  Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: item.$3,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.x2),
                  Expanded(
                    child: Text(item.$1, style: AppTypography.bodyMedium),
                  ),
                  Text(
                    _currency(item.$2),
                    style: AppTypography.bodyMedium.copyWith(
                      color: context.colors.textPrimary,
                    ),
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

class _MasterErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _MasterErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: AppCard(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.error_outline_rounded,
              size: 32,
              color: AppColors.danger,
            ),
            const SizedBox(height: AppSpacing.x3),
            Text(
              'Não foi possível carregar o painel master.',
              style: AppTypography.h3,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.x2),
            Text(
              message,
              style: AppTypography.bodySmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.x4),
            AppPrimaryButton(
              label: 'Tentar novamente',
              onPressed: onRetry,
            ),
          ],
        ),
      ),
    );
  }
}
