import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../models/admin_master.dart';
import '../../providers/admin_master_provider.dart';
import '../../design_system/design_system.dart';
import '../../routes/app_routes.dart';
import '../../widgets/app_scaffold.dart';

List<String> _consolidatedPeriods([int count = 6]) {
  final now = DateTime.now();
  return List.generate(count, (index) {
    final date = DateTime(now.year, now.month - index, 1);
    final month = date.month.toString().padLeft(2, '0');
    return '${date.year}-$month';
  });
}

String _periodName(String period) {
  return DateFormat('MMMM y', 'pt_BR').format(DateTime.parse('$period-01'));
}

String _formatMoney(double value) {
  return NumberFormat.currency(
    locale: 'pt_BR',
    symbol: 'R\$',
    decimalDigits: 2,
  ).format(value);
}

String _formatPct(double value) {
  final prefix = value > 0 ? '+' : '';
  return '$prefix${value.toStringAsFixed(1)}%';
}

class MasterConsolidatedScreen extends ConsumerStatefulWidget {
  const MasterConsolidatedScreen({super.key});

  @override
  ConsumerState<MasterConsolidatedScreen> createState() =>
      _MasterConsolidatedScreenState();
}

class _MasterConsolidatedScreenState
    extends ConsumerState<MasterConsolidatedScreen> {
  late String _selectedPeriod;
  String _selectedStatus = 'todos';
  String _sortBy = 'gross';

  @override
  void initState() {
    super.initState();
    _selectedPeriod = _consolidatedPeriods().first;
  }

  @override
  Widget build(BuildContext context) {
    final filters = (period: _selectedPeriod, status: _selectedStatus);
    final consolidatedAsync = ref.watch(masterConsolidatedProvider(filters));

    return AppScaffold(
      currentRoute: AppRoutes.masterConsolidated,
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.x6),
        child: consolidatedAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => _ConsolidatedErrorState(
            message: error.toString(),
            onRetry: () => ref.invalidate(masterConsolidatedProvider(filters)),
          ),
          data: (data) {
            final sortedUnits = [...data.units];
            switch (_sortBy) {
              case 'net':
                sortedUnits.sort(
                  (a, b) => b.franchisorRevenue.compareTo(a.franchisorRevenue),
                );
                break;
              case 'growth':
                sortedUnits.sort(
                  (a, b) => b.growthPercent.compareTo(a.growthPercent),
                );
                break;
              default:
                sortedUnits.sort(
                  (a, b) => b.grossRevenue.compareTo(a.grossRevenue),
                );
            }

            return SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _ConsolidatedHeader(
                    period: _selectedPeriod,
                    periods: _consolidatedPeriods(),
                    status: _selectedStatus,
                    sortBy: _sortBy,
                    onPeriodChanged: (value) {
                      if (value == null) return;
                      setState(() => _selectedPeriod = value);
                    },
                    onStatusChanged: (value) {
                      if (value == null) return;
                      setState(() => _selectedStatus = value);
                    },
                    onSortChanged: (value) {
                      if (value == null) return;
                      setState(() => _sortBy = value);
                    },
                    onRefresh: () =>
                        ref.invalidate(masterConsolidatedProvider(filters)),
                  ),
                  const SizedBox(height: AppSpacing.x5),
                  LayoutBuilder(
                    builder: (context, constraints) {
                      final cardWidth = constraints.maxWidth >= 1100
                          ? (constraints.maxWidth - (AppSpacing.x3 * 3)) / 4
                          : constraints.maxWidth >= 700
                              ? (constraints.maxWidth - AppSpacing.x3) / 2
                              : constraints.maxWidth;

                      return Wrap(
                        spacing: AppSpacing.x3,
                        runSpacing: AppSpacing.x3,
                        children: [
                          SizedBox(
                            width: cardWidth,
                            child: MetricCard(
                              label: 'FATURAMENTO BRUTO',
                              value: _formatMoney(data.overview.grossRevenue),
                              icon: Icons.payments_rounded,
                              iconColor: AppColors.primary,
                            ),
                          ),
                          SizedBox(
                            width: cardWidth,
                            child: MetricCard(
                              label: 'RECEITA FRANQUEADORA',
                              value: _formatMoney(
                                data.overview.franchisorRevenue,
                              ),
                              icon: Icons.account_balance_rounded,
                              iconColor: context.colors.textPrimary,
                            ),
                          ),
                          SizedBox(
                            width: cardWidth,
                            child: MetricCard(
                              label: 'MRR DA REDE',
                              value: _formatMoney(data.overview.mrrNetwork),
                              icon: Icons.autorenew_rounded,
                              iconColor: AppColors.info,
                            ),
                          ),
                          SizedBox(
                            width: cardWidth,
                            child: MetricCard(
                              label: 'TAKE RATE MÉDIO',
                              value: _formatPct(data.overview.averageTakeRate),
                              icon: Icons.percent_rounded,
                              iconColor: AppColors.success,
                            ),
                          ),
                          SizedBox(
                            width: cardWidth,
                            child: MetricCard(
                              label: 'PREVISÃO DE RECEBIMENTO',
                              value: _formatMoney(
                                data.overview.receivableForecast,
                              ),
                              icon: Icons.schedule_rounded,
                              iconColor: AppColors.warning,
                            ),
                          ),
                          SizedBox(
                            width: cardWidth,
                            child: MetricCard(
                              label: 'INADIMPLÊNCIA',
                              value: _formatMoney(
                                data.overview.delinquencyValue,
                              ),
                              subtitle: _formatPct(
                                data.overview.delinquencyPercent,
                              ),
                              icon: Icons.warning_amber_rounded,
                              iconColor: AppColors.danger,
                            ),
                          ),
                          SizedBox(
                            width: cardWidth,
                            child: MetricCard(
                              label: 'CRESCIMENTO MENSAL',
                              value: _formatPct(data.overview.growthPercent),
                              icon: Icons.trending_up_rounded,
                              iconColor: data.overview.growthPercent >= 0
                                  ? AppColors.success
                                  : AppColors.danger,
                            ),
                          ),
                          SizedBox(
                            width: cardWidth,
                            child: MetricCard(
                              label: 'COMPARATIVO MÊS A MÊS',
                              value: _formatMoney(
                                data.overview.comparisonValue,
                              ),
                              icon: Icons.compare_arrows_rounded,
                              iconColor: context.colors.textPrimary,
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                  const SizedBox(height: AppSpacing.x5),
                  LayoutBuilder(
                    builder: (context, constraints) {
                      final cardWidth = constraints.maxWidth >= 1100
                          ? (constraints.maxWidth - AppSpacing.x3) / 2
                          : constraints.maxWidth;
                      return Wrap(
                        spacing: AppSpacing.x3,
                        runSpacing: AppSpacing.x3,
                        children: [
                          SizedBox(
                            width: cardWidth,
                            child: _NetworkHistoryCard(history: data.history),
                          ),
                          SizedBox(
                            width: cardWidth,
                            child: _RevenueBreakdownCard(data: data.overview),
                          ),
                        ],
                      );
                    },
                  ),
                  const SizedBox(height: AppSpacing.x5),
                  _ConsolidatedTable(units: sortedUnits),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _ConsolidatedHeader extends StatelessWidget {
  final String period;
  final List<String> periods;
  final String status;
  final String sortBy;
  final ValueChanged<String?> onPeriodChanged;
  final ValueChanged<String?> onStatusChanged;
  final ValueChanged<String?> onSortChanged;
  final VoidCallback onRefresh;

  const _ConsolidatedHeader({
    required this.period,
    required this.periods,
    required this.status,
    required this.sortBy,
    required this.onPeriodChanged,
    required this.onStatusChanged,
    required this.onSortChanged,
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
          constraints: const BoxConstraints(maxWidth: 680),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Consolidado', style: AppTypography.h1),
              const SizedBox(height: AppSpacing.x1),
              Text(
                'Leitura financeira da rede: bruto, receita da franqueadora, mix de receitas e risco.',
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
                key: ValueKey('consolidated-period-$period'),
                initialValue: period,
                decoration: const InputDecoration(
                  labelText: 'Período',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
                items: periods
                    .map(
                      (item) => DropdownMenuItem(
                        value: item,
                        child: Text(_periodName(item)),
                      ),
                    )
                    .toList(),
                onChanged: onPeriodChanged,
              ),
            ),
            SizedBox(
              width: 180,
              child: DropdownButtonFormField<String>(
                key: ValueKey('consolidated-status-$status'),
                initialValue: status,
                decoration: const InputDecoration(
                  labelText: 'Status',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
                items: const [
                  DropdownMenuItem(value: 'todos', child: Text('Todos')),
                  DropdownMenuItem(value: 'ativo', child: Text('Ativas')),
                  DropdownMenuItem(
                    value: 'inadimplente',
                    child: Text('Inadimplentes'),
                  ),
                  DropdownMenuItem(value: 'pendente', child: Text('Pendentes')),
                  DropdownMenuItem(value: 'inativo', child: Text('Inativas')),
                ],
                onChanged: onStatusChanged,
              ),
            ),
            SizedBox(
              width: 210,
              child: DropdownButtonFormField<String>(
                key: ValueKey('consolidated-sort-$sortBy'),
                initialValue: sortBy,
                decoration: const InputDecoration(
                  labelText: 'Ordenar por',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
                items: const [
                  DropdownMenuItem(
                    value: 'gross',
                    child: Text('Maior faturamento'),
                  ),
                  DropdownMenuItem(
                    value: 'net',
                    child: Text('Maior receita líquida'),
                  ),
                  DropdownMenuItem(
                    value: 'growth',
                    child: Text('Maior crescimento'),
                  ),
                ],
                onChanged: onSortChanged,
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

class _NetworkHistoryCard extends StatelessWidget {
  final List<MasterHistoryPoint> history;

  const _NetworkHistoryCard({required this.history});

  @override
  Widget build(BuildContext context) {
    final maxValue = history.fold<double>(
      0,
      (max, point) => point.grossRevenue > max ? point.grossRevenue : max,
    );

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Evolução da Rede', style: AppTypography.h3),
          const SizedBox(height: AppSpacing.x1),
          Text(
            'Histórico consolidado para comparar tendência e sazonalidade.',
            style: AppTypography.bodySmall,
          ),
          const SizedBox(height: AppSpacing.x4),
          if (history.isEmpty || maxValue <= 0)
            SizedBox(
              height: 260,
              child: Center(
                child: Text(
                  'Sem histórico consolidado suficiente.',
                  style: AppTypography.bodySmall,
                ),
              ),
            )
          else
            SizedBox(
              height: 260,
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
                        reservedSize: 54,
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
                          if (index < 0 || index >= history.length) {
                            return const SizedBox.shrink();
                          }
                          return Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(
                              history[index].label,
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
                      spots: history
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
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _RevenueBreakdownCard extends StatelessWidget {
  final MasterConsolidatedOverview data;

  const _RevenueBreakdownCard({required this.data});

  @override
  Widget build(BuildContext context) {
    final total = [
      data.monthlyFeeRevenue,
      data.commissionRevenue,
      data.otherRevenue,
    ].fold<double>(0, (sum, value) => sum + value);

    final breakdown = [
      ('Mensalidade', data.monthlyFeeRevenue, AppColors.info),
      ('Comissão', data.commissionRevenue, AppColors.primary),
      ('Outros', data.otherRevenue, context.colors.textMuted),
    ];

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Mix de Receita', style: AppTypography.h3),
          const SizedBox(height: AppSpacing.x1),
          Text(
            'Separação do que é mensalidade, comissão e outros componentes.',
            style: AppTypography.bodySmall,
          ),
          const SizedBox(height: AppSpacing.x4),
          ...breakdown.map((item) {
            final percent = total > 0 ? (item.$2 / total) * 100 : 0;
            return Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.x3),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(item.$1, style: AppTypography.bodyMedium),
                      ),
                      Text(
                        _formatMoney(item.$2),
                        style: AppTypography.bodyMedium.copyWith(
                          color: context.colors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.x1),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(999),
                    child: LinearProgressIndicator(
                      value: total > 0 ? item.$2 / total : 0,
                      minHeight: 10,
                      backgroundColor: context.colors.bgMuted,
                      valueColor: AlwaysStoppedAnimation<Color>(item.$3),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.x1),
                  Text(
                    '${percent.toStringAsFixed(1)}% do consolidado',
                    style: AppTypography.caption,
                  ),
                ],
              ),
            );
          }),
          const Divider(height: AppSpacing.x5),
          _InlineMetric(
            label: 'Receita franqueadora',
            value: _formatMoney(data.franchisorRevenue),
          ),
          const SizedBox(height: AppSpacing.x2),
          _InlineMetric(
            label: 'Take rate médio',
            value: _formatPct(data.averageTakeRate),
          ),
        ],
      ),
    );
  }
}

class _InlineMetric extends StatelessWidget {
  final String label;
  final String value;

  const _InlineMetric({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: Text(label, style: AppTypography.bodyMedium)),
        Text(
          value,
          style: AppTypography.bodyMedium.copyWith(color: context.colors.textPrimary),
        ),
      ],
    );
  }
}

class _ConsolidatedTable extends StatelessWidget {
  final List<MasterConsolidatedUnit> units;

  const _ConsolidatedTable({required this.units});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Tabela Consolidada por Unidade', style: AppTypography.h3),
          const SizedBox(height: AppSpacing.x1),
          Text(
            'Bruto, percentual contratual, receita da franqueadora, crescimento e status.',
            style: AppTypography.bodySmall,
          ),
          const SizedBox(height: AppSpacing.x4),
          if (units.isEmpty)
            Text(
              'Nenhuma unidade encontrada para os filtros selecionados.',
              style: AppTypography.bodySmall,
            )
          else
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                columnSpacing: 28,
                columns: const [
                  DataColumn(label: Text('Unidade')),
                  DataColumn(label: Text('Faturamento bruto')),
                  DataColumn(label: Text('% contrato')),
                  DataColumn(label: Text('Receita franqueadora')),
                  DataColumn(label: Text('Take rate')),
                  DataColumn(label: Text('Crescimento')),
                  DataColumn(label: Text('Status')),
                ],
                rows: units
                    .map(
                      (unit) => DataRow(
                        cells: [
                          DataCell(
                            SizedBox(width: 220, child: Text(unit.name)),
                          ),
                          DataCell(Text(_formatMoney(unit.grossRevenue))),
                          DataCell(Text(_formatPct(unit.contractPercent))),
                          DataCell(Text(_formatMoney(unit.franchisorRevenue))),
                          DataCell(Text(_formatPct(unit.takeRate))),
                          DataCell(
                            Text(
                              _formatPct(unit.growthPercent),
                              style: TextStyle(
                                color: unit.growthPercent >= 0
                                    ? AppColors.success
                                    : AppColors.danger,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          DataCell(AppBadge.status(unit.status)),
                        ],
                      ),
                    )
                    .toList(),
              ),
            ),
        ],
      ),
    );
  }
}

class _ConsolidatedErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ConsolidatedErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: AppCard(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.error_outline_rounded,
              color: AppColors.danger,
              size: 32,
            ),
            const SizedBox(height: AppSpacing.x3),
            Text(
              'Não foi possível carregar o consolidado.',
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
