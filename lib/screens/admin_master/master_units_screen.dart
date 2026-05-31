import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../models/admin_master.dart';
import '../../providers/admin_master_provider.dart';
import '../../design_system/design_system.dart';
import '../../routes/app_routes.dart';
import '../../widgets/app_scaffold.dart';

List<String> _unitPeriods([int count = 6]) {
  final now = DateTime.now();
  return List.generate(count, (index) {
    final date = DateTime(now.year, now.month - index, 1);
    final month = date.month.toString().padLeft(2, '0');
    return '${date.year}-$month';
  });
}

String _periodText(String period) {
  return DateFormat('MMMM y', 'pt_BR').format(DateTime.parse('$period-01'));
}

String _money(double value) {
  return NumberFormat.currency(
    locale: 'pt_BR',
    symbol: 'R\$',
    decimalDigits: 2,
  ).format(value);
}

String _pct(double value) {
  final prefix = value > 0 ? '+' : '';
  return '$prefix${value.toStringAsFixed(1)}%';
}

class MasterUnitsScreen extends ConsumerStatefulWidget {
  const MasterUnitsScreen({super.key});

  @override
  ConsumerState<MasterUnitsScreen> createState() => _MasterUnitsScreenState();
}

class _MasterUnitsScreenState extends ConsumerState<MasterUnitsScreen> {
  late String _selectedPeriod;
  String _selectedStatus = 'todos';

  @override
  void initState() {
    super.initState();
    _selectedPeriod = _unitPeriods().first;
  }

  @override
  Widget build(BuildContext context) {
    final filters = (period: _selectedPeriod, status: _selectedStatus);
    final unitsAsync = ref.watch(masterUnitsProvider(filters));

    return AppScaffold(
      currentRoute: AppRoutes.masterUnits,
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.x6),
        child: unitsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => _UnitsErrorState(
            message: error.toString(),
            onRetry: () => ref.invalidate(masterUnitsProvider(filters)),
          ),
          data: (data) => SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _UnitsHeader(
                  period: _selectedPeriod,
                  periods: _unitPeriods(),
                  status: _selectedStatus,
                  onPeriodChanged: (value) {
                    if (value == null) return;
                    setState(() => _selectedPeriod = value);
                  },
                  onStatusChanged: (value) {
                    if (value == null) return;
                    setState(() => _selectedStatus = value);
                  },
                  onRefresh: () => ref.invalidate(masterUnitsProvider(filters)),
                ),
                const SizedBox(height: AppSpacing.x5),
                LayoutBuilder(
                  builder: (context, constraints) {
                    return Wrap(
                      spacing: AppSpacing.x3,
                      runSpacing: AppSpacing.x3,
                      children: [
                        SizedBox(
                          width: constraints.maxWidth >= 1100
                              ? (constraints.maxWidth - (AppSpacing.x3 * 3)) / 4
                              : constraints.maxWidth >= 700
                                  ? (constraints.maxWidth - AppSpacing.x3) / 2
                                  : constraints.maxWidth,
                          child: MetricCard(
                            label: 'UNIDADES',
                            value: '${data.summary.totalUnits}',
                            icon: Icons.storefront_rounded,
                            iconColor: AppColors.primary,
                          ),
                        ),
                        SizedBox(
                          width: constraints.maxWidth >= 1100
                              ? (constraints.maxWidth - (AppSpacing.x3 * 3)) / 4
                              : constraints.maxWidth >= 700
                                  ? (constraints.maxWidth - AppSpacing.x3) / 2
                                  : constraints.maxWidth,
                          child: MetricCard(
                            label: 'CLIENTES ATIVOS',
                            value: '${data.summary.activeClients}',
                            icon: Icons.people_alt_rounded,
                            iconColor: AppColors.info,
                          ),
                        ),
                        SizedBox(
                          width: constraints.maxWidth >= 1100
                              ? (constraints.maxWidth - (AppSpacing.x3 * 3)) / 4
                              : constraints.maxWidth >= 700
                                  ? (constraints.maxWidth - AppSpacing.x3) / 2
                                  : constraints.maxWidth,
                          child: MetricCard(
                            label: 'FATURAMENTO BRUTO',
                            value: _money(data.summary.grossRevenue),
                            icon: Icons.payments_rounded,
                            iconColor: AppColors.success,
                          ),
                        ),
                        SizedBox(
                          width: constraints.maxWidth >= 1100
                              ? (constraints.maxWidth - (AppSpacing.x3 * 3)) / 4
                              : constraints.maxWidth >= 700
                                  ? (constraints.maxWidth - AppSpacing.x3) / 2
                                  : constraints.maxWidth,
                          child: MetricCard(
                            label: 'RECEITA FRANQUEADORA',
                            value: _money(data.summary.franchisorRevenue),
                            icon: Icons.account_balance_rounded,
                            iconColor: context.colors.textPrimary,
                          ),
                        ),
                      ],
                    );
                  },
                ),
                const SizedBox(height: AppSpacing.x5),
                if (data.units.isEmpty)
                  AppCard(
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.x5),
                      child: Center(
                        child: Text(
                          'Nenhuma unidade encontrada para o filtro selecionado.',
                          style: AppTypography.bodySmall,
                        ),
                      ),
                    ),
                  )
                else
                  ...data.units.map(
                    (unit) => Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.x3),
                      child: _UnitExpansionCard(unit: unit),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _UnitsHeader extends StatelessWidget {
  final String period;
  final List<String> periods;
  final String status;
  final ValueChanged<String?> onPeriodChanged;
  final ValueChanged<String?> onStatusChanged;
  final VoidCallback onRefresh;

  const _UnitsHeader({
    required this.period,
    required this.periods,
    required this.status,
    required this.onPeriodChanged,
    required this.onStatusChanged,
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
              Text('Unidades', style: AppTypography.h1),
              const SizedBox(height: AppSpacing.x1),
              Text(
                'Cada unidade como uma mini-DRE operacional da rede, com drill-down por cliente final.',
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
                key: ValueKey('units-period-$period'),
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
                        child: Text(_periodText(item)),
                      ),
                    )
                    .toList(),
                onChanged: onPeriodChanged,
              ),
            ),
            SizedBox(
              width: 200,
              child: DropdownButtonFormField<String>(
                key: ValueKey('units-status-$status'),
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

class _UnitExpansionCard extends StatelessWidget {
  final MasterUnit unit;

  const _UnitExpansionCard({required this.unit});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding: EdgeInsets.zero,
          childrenPadding: EdgeInsets.zero,
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Wrap(
                spacing: AppSpacing.x3,
                runSpacing: AppSpacing.x2,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  Text(unit.name, style: AppTypography.h3),
                  AppBadge.status(unit.status),
                ],
              ),
              const SizedBox(height: AppSpacing.x2),
              Text(
                unit.region ?? 'Região não informada',
                style: AppTypography.bodySmall,
              ),
            ],
          ),
          subtitle: Padding(
            padding: const EdgeInsets.only(top: AppSpacing.x3),
            child: Wrap(
              spacing: AppSpacing.x4,
              runSpacing: AppSpacing.x2,
              children: [
                _SummaryChip(label: 'Clientes', value: '${unit.activeClients}'),
                _SummaryChip(
                  label: 'Faturamento bruto',
                  value: _money(unit.grossRevenue),
                ),
                _SummaryChip(
                  label: 'Receita líquida unidade',
                  value: _money(unit.unitNetRevenue),
                ),
                _SummaryChip(
                  label: 'Receita franqueadora',
                  value: _money(unit.franchisorRevenue),
                ),
                _SummaryChip(
                  label: 'Crescimento',
                  value: _pct(unit.growthPercent),
                  color: unit.growthPercent >= 0
                      ? AppColors.success
                      : AppColors.danger,
                ),
              ],
            ),
          ),
          children: [
            const Divider(height: AppSpacing.x8),
            Wrap(
              spacing: AppSpacing.x3,
              runSpacing: AppSpacing.x3,
              children: [
                _DetailMetric(
                  label: 'Percentual médio de contrato',
                  value: _pct(unit.contractPercent),
                ),
                _DetailMetric(
                  label: 'Take rate da franqueadora',
                  value: _pct(unit.takeRate),
                ),
                _DetailMetric(
                  label: 'Contratos pendentes',
                  value: '${unit.pendingContracts}',
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.x4),
            _UnitHistoryRow(history: unit.history),
            const SizedBox(height: AppSpacing.x5),
            Text(
              'Clientes finais da unidade',
              style: AppTypography.bodyMedium.copyWith(
                color: context.colors.textPrimary,
              ),
            ),
            const SizedBox(height: AppSpacing.x3),
            _ClientsSection(clients: unit.clients),
          ],
        ),
      ),
    );
  }
}

class _SummaryChip extends StatelessWidget {
  final String label;
  final String value;
  final Color? color;

  const _SummaryChip({required this.label, required this.value, this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.x3,
        vertical: AppSpacing.x2,
      ),
      decoration: BoxDecoration(
        color: (color ?? context.colors.textPrimary).withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        '$label · $value',
        style: AppTypography.caption.copyWith(
          color: color ?? context.colors.textPrimary,
        ),
      ),
    );
  }
}

class _DetailMetric extends StatelessWidget {
  final String label;
  final String value;

  const _DetailMetric({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 220,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: AppTypography.caption),
          const SizedBox(height: AppSpacing.x1),
          Text(
            value,
            style: AppTypography.bodyMedium.copyWith(color: context.colors.textPrimary),
          ),
        ],
      ),
    );
  }
}

class _UnitHistoryRow extends StatelessWidget {
  final List<MasterHistoryPoint> history;

  const _UnitHistoryRow({required this.history});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Histórico mensal',
          style: AppTypography.bodyMedium.copyWith(color: context.colors.textPrimary),
        ),
        const SizedBox(height: AppSpacing.x3),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: history
                .map(
                  (point) => Container(
                    width: 140,
                    margin: const EdgeInsets.only(right: AppSpacing.x3),
                    padding: const EdgeInsets.all(AppSpacing.x3),
                    decoration: BoxDecoration(
                      color: context.colors.bgPage,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.borderLight),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(point.label, style: AppTypography.caption),
                        const SizedBox(height: AppSpacing.x2),
                        Text(
                          _money(point.grossRevenue),
                          style: AppTypography.bodyMedium.copyWith(
                            color: context.colors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.x1),
                        Text(
                          'Franqueadora: ${_money(point.franchisorRevenue)}',
                          style: AppTypography.bodySmall,
                        ),
                      ],
                    ),
                  ),
                )
                .toList(),
          ),
        ),
      ],
    );
  }
}

class _ClientsSection extends StatelessWidget {
  final List<MasterClient> clients;

  const _ClientsSection({required this.clients});

  @override
  Widget build(BuildContext context) {
    if (clients.isEmpty) {
      return AppCard(
        color: context.colors.bgPage,
        child: Text(
          'Nenhum cliente final consolidado para esta unidade no período.',
          style: AppTypography.bodySmall,
        ),
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth >= 900) {
          return SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: DataTable(
              columnSpacing: 24,
              columns: const [
                DataColumn(label: Text('Cliente')),
                DataColumn(label: Text('Status')),
                DataColumn(label: Text('Fat. Cliente')),
                DataColumn(label: Text('% Contrato')),
                DataColumn(label: Text('Receita Franqueadora')),
                DataColumn(label: Text('Mensalidade')),
                DataColumn(label: Text('GMV Lives')),
              ],
              rows: clients
                  .map(
                    (client) => DataRow(
                      cells: [
                        DataCell(
                          SizedBox(width: 200, child: Text(client.name)),
                        ),
                        DataCell(AppBadge.status(client.status)),
                        DataCell(Text(_money(client.grossRevenue))),
                        DataCell(Text(_pct(client.contractPercent))),
                        DataCell(Text(_money(client.franchisorRevenue))),
                        DataCell(Text(_money(client.monthlyFee))),
                        DataCell(Text(_money(client.liveGmv))),
                      ],
                    ),
                  )
                  .toList(),
            ),
          );
        }

        return Column(
          children: clients
              .map(
                (client) => Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.x3),
                  child: AppCard(
                    color: context.colors.bgPage,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                client.name,
                                style: AppTypography.bodyMedium.copyWith(
                                  color: context.colors.textPrimary,
                                ),
                              ),
                            ),
                            AppBadge.status(client.status),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.x2),
                        Wrap(
                          spacing: AppSpacing.x3,
                          runSpacing: AppSpacing.x2,
                          children: [
                            _MiniLine(
                              label: 'Fat. cliente',
                              value: _money(client.grossRevenue),
                            ),
                            _MiniLine(
                              label: '% contrato',
                              value: _pct(client.contractPercent),
                            ),
                            _MiniLine(
                              label: 'Receita franqueadora',
                              value: _money(client.franchisorRevenue),
                            ),
                            _MiniLine(
                              label: 'Mensalidade',
                              value: _money(client.monthlyFee),
                            ),
                            _MiniLine(
                              label: 'GMV lives',
                              value: _money(client.liveGmv),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.x2),
                        Text(client.notes, style: AppTypography.bodySmall),
                      ],
                    ),
                  ),
                ),
              )
              .toList(),
        );
      },
    );
  }
}

class _MiniLine extends StatelessWidget {
  final String label;
  final String value;

  const _MiniLine({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 150,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: AppTypography.caption),
          const SizedBox(height: AppSpacing.x1),
          Text(
            value,
            style: AppTypography.bodyMedium.copyWith(color: context.colors.textPrimary),
          ),
        ],
      ),
    );
  }
}

class _UnitsErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _UnitsErrorState({required this.message, required this.onRetry});

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
              'Não foi possível carregar as unidades.',
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
