import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../models/admin_master.dart';
import '../../providers/admin_master_provider.dart';
import '../../widgets/empty_state_widget.dart';
import '../../widgets/skeleton_list.dart';
import '../../utils/web_download.dart';
import '../core/ll_theme.dart';
import '../widgets/ll_admin_widgets.dart';
import '../widgets/period_picker.dart' as pp;

String _currentPeriod() {
  final now = DateTime.now();
  return '${now.year}-${now.month.toString().padLeft(2, '0')}';
}

String _periodLabel(String period) {
  try {
    final date = DateTime.parse('$period-01');
    return DateFormat('MMMM y', 'pt_BR').format(date);
  } catch (_) {
    return period;
  }
}

String _currency(double v) =>
    NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$', decimalDigits: 2).format(v);

String _signedPercent(double v) =>
    '${v > 0 ? '+' : ''}${v.toStringAsFixed(1)}%';

void _exportCsv(BuildContext context, MasterConsolidatedData data) {
  final headers = [
    'Unidade',
    'Status',
    'Faturamento bruto',
    'Receita franqueadora',
    'Take rate (%)',
    '% contratual',
    'Crescimento (%)',
  ];
  final rows = <List<String>>[
    for (final u in data.units)
      [
        u.name,
        u.status,
        u.grossRevenue.toStringAsFixed(2).replaceAll('.', ','),
        u.franchisorRevenue.toStringAsFixed(2).replaceAll('.', ','),
        u.takeRate.toStringAsFixed(2).replaceAll('.', ','),
        u.contractPercent.toStringAsFixed(2).replaceAll('.', ','),
        u.growthPercent.toStringAsFixed(2).replaceAll('.', ','),
      ],
    [
      'Total da rede',
      '${data.units.length} unidade${data.units.length == 1 ? '' : 's'}',
      data.overview.grossRevenue.toStringAsFixed(2).replaceAll('.', ','),
      data.overview.franchisorRevenue.toStringAsFixed(2).replaceAll('.', ','),
      data.overview.averageTakeRate.toStringAsFixed(2).replaceAll('.', ','),
      '—',
      data.overview.growthPercent.toStringAsFixed(2).replaceAll('.', ','),
    ],
  ];
  final csv = buildCsv(headers: headers, rows: rows);
  final period = data.period.replaceAll('-', '');
  downloadTextFile(
    filename: 'consolidado_$period.csv',
    content: csv,
  );
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text('CSV exportado: consolidado_$period.csv'),
      duration: const Duration(seconds: 2),
    ),
  );
}

class ConsolidadoScreen extends ConsumerStatefulWidget {
  const ConsolidadoScreen({super.key});

  @override
  ConsumerState<ConsolidadoScreen> createState() => _ConsolidadoScreenState();
}

class _ConsolidadoScreenState extends ConsumerState<ConsolidadoScreen> {
  late String _periodo;
  String _status = 'todos';

  @override
  void initState() {
    super.initState();
    _periodo = _currentPeriod();
  }

  @override
  Widget build(BuildContext context) {
    final filters = (period: _periodo, status: _status);
    final async = ref.watch(masterConsolidatedProvider(filters));

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AdminPageToolbar(
            italic: 'Consolidado',
            subtitle:
                'Leitura financeira da rede: bruto, receita da franqueadora, mix de receitas e risco.',
            filters: [
              AdminFilterChip(
                label: 'Período',
                value: _periodLabel(_periodo),
                onTap: () async {
                  final picked = await pp.showPeriodPicker(context, _periodo);
                  if (picked != null && mounted) {
                    setState(() => _periodo = picked);
                  }
                },
              ),
              Builder(builder: (ctx) {
                return AdminFilterChip(
                  label: 'Status',
                  value: _statusLabel(_status),
                  onTap: () async {
                    final picked =
                        await pp.showStatusPicker(ctx, _status);
                    if (picked != null && mounted) {
                      setState(() => _status = picked);
                    }
                  },
                );
              }),
            ],
            onRefresh: () =>
                ref.invalidate(masterConsolidatedProvider(filters)),
          ),
          const SizedBox(height: 16),
          async.when(
            loading: () => const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: SkeletonList(itemCount: 4, itemHeight: 90),
            ),
            error: (e, _) => _ErrorBox(
              message: e.toString(),
              onRetry: () =>
                  ref.invalidate(masterConsolidatedProvider(filters)),
            ),
            data: (data) => _Body(data: data),
          ),
        ],
      ),
    );
  }

  String _statusLabel(String s) => switch (s) {
        'ativo' => 'Ativos',
        'inadimplente' => 'Inadimplentes',
        _ => 'Todos',
      };
}

class _Body extends StatelessWidget {
  const _Body({required this.data});
  final MasterConsolidatedData data;

  @override
  Widget build(BuildContext context) {
    final ov = data.overview;
    final kpis = [
      AdminKpiCard(
          label: 'Faturamento bruto',
          value: _currency(ov.grossRevenue),
          sub: 'rede consolidada',
          icon: Icons.live_tv_rounded,
          color: LL.success),
      AdminKpiCard(
          label: 'Receita franqueadora',
          value: _currency(ov.franchisorRevenue),
          sub: 'líquida no período',
          icon: Icons.apartment_rounded,
          color: LL.accent),
      AdminKpiCard(
          label: 'MRR da rede',
          value: _currency(ov.mrrNetwork),
          sub: 'recorrente mensal',
          icon: Icons.attach_money_rounded,
          color: LL.info),
      AdminKpiCard(
          label: 'Take rate médio',
          value: _signedPercent(ov.averageTakeRate),
          sub: 'bruto vs comissão',
          icon: Icons.local_offer_rounded,
          color: const Color(0xFFAF7BFF)),
      AdminKpiCard(
          label: 'Previsão de recebimento',
          value: _currency(ov.receivableForecast),
          sub: 'próximos 30 dias',
          icon: Icons.refresh_rounded,
          color: LL.success),
      AdminKpiCard(
          label: 'Inadimplência',
          value: _currency(ov.delinquencyValue),
          sub: '${ov.delinquencyPercent.toStringAsFixed(1)}% do bruto',
          icon: Icons.warning_amber_rounded,
          color: ov.delinquencyValue > 0 ? LL.live : LL.success,
          delta: _signedPercent(ov.delinquencyPercent),
          deltaUp: ov.delinquencyPercent <= 0),
      AdminKpiCard(
          label: 'Crescimento mensal',
          value: _signedPercent(ov.growthPercent),
          sub: 'vs mês anterior',
          icon: Icons.trending_up_rounded,
          color: ov.growthPercent >= 0 ? LL.success : LL.live,
          delta: 'MoM',
          deltaUp: ov.growthPercent >= 0),
      AdminKpiCard(
          label: 'Comparativo MoM',
          value: _currency(ov.comparisonValue),
          sub: 'diferença absoluta',
          icon: Icons.bar_chart_rounded,
          color: LL.accent),
    ];

    final history = data.history;
    final labels = history.map((h) => h.label).toList();
    final values = history.map((h) => h.grossRevenue / 1000).toList(); // em milhares
    final maxY = (values.isEmpty ? 70.0 : values.reduce((a, b) => a > b ? a : b))
        .clamp(10.0, double.infinity);
    final formatLast = values.isEmpty
        ? 'R\$ 0'
        : 'R\$ ${values.last.toStringAsFixed(1).replaceAll('.', ',')}k';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        LayoutBuilder(builder: (context, constraints) {
          final width = constraints.maxWidth;
          final columns = width < 680
              ? 1
              : width < 1040
                  ? 2
                  : 4;
          return GridView.count(
            shrinkWrap: true,
            primary: false,
            crossAxisCount: columns,
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: columns == 1 ? 4.2 : 2.05,
            children: kpis,
          );
        }),
        const SizedBox(height: 18),
        LayoutBuilder(builder: (context, constraints) {
          final compact = constraints.maxWidth < 840;
          final chartA = AdminChartCard(
            title: 'Evolução da rede',
            subtitle:
                'histórico consolidado para comparar tendência e sazonalidade',
            child: history.isEmpty
                ? Padding(
                    padding: const EdgeInsets.symmetric(vertical: 32),
                    child: Center(
                      child: Text('Sem histórico no período',
                          style: LL.caption.copyWith(fontSize: 11.5)),
                    ),
                  )
                : AdminLineChart(
                    labels: labels,
                    data: values,
                    maxY: maxY,
                    formatLast: formatLast,
                  ),
          );
          final chartB = AdminChartCard(
            title: 'Mix de receita',
            subtitle:
                'separação do que é mensalidade, comissão e outros componentes',
            child: RevenueMixWidget(overview: ov),
          );
          if (compact) {
            return Column(children: [chartA, const SizedBox(height: 10), chartB]);
          }
          return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(flex: 3, child: chartA),
            const SizedBox(width: 10),
            Expanded(flex: 2, child: chartB)
          ]);
        }),
        AdminSectionHeader(
            title: 'Tabela consolidada por unidade',
            subtitle:
                'bruto, mensal/contratual, receita da franqueadora, crescimento e status',
            actionLabel: 'Exportar CSV',
            onTap: () => _exportCsv(context, data)),
        ConsolidatedUnitTable(units: data.units, overview: ov),
      ],
    );
  }
}

class _ErrorBox extends StatelessWidget {
  const _ErrorBox({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 32),
      child: Column(
        children: [
          Icon(Icons.error_outline, size: 48, color: LL.live),
          const SizedBox(height: 12),
          Text('Não foi possível carregar o consolidado',
              style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: context.llTextPrimary)),
          const SizedBox(height: 4),
          Text(message,
              maxLines: 2,
              textAlign: TextAlign.center,
              style: LL.caption.copyWith(fontSize: 11.5)),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Tentar novamente'),
          ),
        ],
      ),
    );
  }
}

class RevenueMixWidget extends StatelessWidget {
  const RevenueMixWidget({super.key, required this.overview});
  final MasterConsolidatedOverview overview;

  @override
  Widget build(BuildContext context) {
    final gross = overview.grossRevenue == 0 ? 1 : overview.grossRevenue;
    final items = [
      _MixItem(
          label: 'Mensalidades',
          value: _currency(overview.monthlyFeeRevenue),
          pct: overview.monthlyFeeRevenue / gross,
          color: LL.info),
      _MixItem(
          label: 'Comissão',
          value: _currency(overview.commissionRevenue),
          pct: overview.commissionRevenue / gross,
          color: LL.accent),
      _MixItem(
          label: 'Outros',
          value: _currency(overview.otherRevenue),
          pct: overview.otherRevenue / gross,
          color: context.llTextMuted),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final item in items)
          Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: _MixBar(item: item)),
        Divider(color: context.llBorder),
        const SizedBox(height: 8),
        _MixFooter(
            label: 'Receita franqueadora',
            value: _currency(overview.franchisorRevenue)),
        const SizedBox(height: 8),
        _MixFooter(
            label: 'Take rate médio',
            value: _signedPercent(overview.averageTakeRate),
            color: LL.success),
      ],
    );
  }
}

class _MixItem {
  const _MixItem(
      {required this.label,
      required this.value,
      required this.pct,
      required this.color});
  final String label;
  final String value;
  final double pct;
  final Color color;
}

class _MixBar extends StatelessWidget {
  const _MixBar({required this.item});
  final _MixItem item;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
                child: Text(item.label,
                    style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w800,
                        color: context.llTextPrimary))),
            Text(item.value,
                style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w900,
                    color: context.llTextPrimary)),
          ],
        ),
        const SizedBox(height: 7),
        ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: Container(
            height: 10,
            color: context.llSurface3,
            alignment: Alignment.centerLeft,
            child: FractionallySizedBox(
                widthFactor: item.pct.clamp(0.0, 1.0),
                child: Container(color: item.color)),
          ),
        ),
        const SizedBox(height: 4),
        Text(
            '${(item.pct * 100).toStringAsFixed(1).replaceAll('.', ',')}% do consolidado',
            style: LL.caption.copyWith(fontSize: 10.5)),
      ],
    );
  }
}

class _MixFooter extends StatelessWidget {
  const _MixFooter({required this.label, required this.value, this.color});
  final String label;
  final String value;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
            child: Text(label,
                style: TextStyle(
                    fontSize: 12,
                    color: context.llTextSecond,
                    fontWeight: FontWeight.w700))),
        Text(value,
            style: TextStyle(
                fontSize: 12.5,
                color: color ?? context.llTextPrimary,
                fontWeight: FontWeight.w900)),
      ],
    );
  }
}

// Tabela consolidada: layout responsivo.
// >= 920px: Row flex Expanded (table-like).
// < 920px: cards verticais por unidade.

const _tableFlexes = [3, 2, 1, 2, 1, 1, 2];

class ConsolidatedUnitTable extends StatelessWidget {
  const ConsolidatedUnitTable({super.key, required this.units, required this.overview});
  final List<MasterConsolidatedUnit> units;
  final MasterConsolidatedOverview overview;

  @override
  Widget build(BuildContext context) {
    if (units.isEmpty) {
      return Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
            color: context.llSurface2,
            border: Border.all(color: context.llBorder),
            borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: const EmptyStateWidget(
          icon: Icons.table_rows_rounded,
          title: 'Sem unidades para listar',
          message: 'Nenhuma franquia consolidada no período selecionado.',
        ),
      );
    }
    return LayoutBuilder(builder: (context, c) {
      final isWide = c.maxWidth >= 760;
      final width = isWide ? c.maxWidth : 760.0;
      final tableContent = SizedBox(
        width: width,
        child: Column(
          children: [
            const _TableHeader(),
            for (var i = 0; i < units.length; i++) ...[
              _TableRowData.fromUnit(units[i]),
              if (i < units.length - 1)
                Divider(
                    height: 1, thickness: 1, color: context.llBorder),
            ],
            Divider(
                height: 1, thickness: 1, color: context.llBorder),
            _TableRowData.totalFromOverview(overview, count: units.length),
          ],
        ),
      );
      return Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
            color: context.llSurface2,
            border: Border.all(color: context.llBorder),
            borderRadius: BorderRadius.circular(12)),
        child: isWide
            ? tableContent
            : SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: tableContent,
              ),
      );
    });
  }
}

class _TableHeader extends StatelessWidget {
  const _TableHeader();

  @override
  Widget build(BuildContext context) {
    const headers = [
      'Unidade',
      'Faturamento bruto',
      '% contratual',
      'Receita franqueadora',
      'Take rate',
      'Crescimento',
      'Status'
    ];
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      decoration: BoxDecoration(
          color: context.llSurface3,
          border: Border(bottom: BorderSide(color: context.llBorder))),
      child: Row(
        children: [
          for (var i = 0; i < headers.length; i++)
            Expanded(
              flex: _tableFlexes[i],
              child: Padding(
                padding: EdgeInsets.only(right: i == headers.length - 1 ? 0 : 12),
                child: Text(
                  headers[i].toUpperCase(),
                  textAlign: i == headers.length - 1
                      ? TextAlign.right
                      : (i == 0 ? TextAlign.left : TextAlign.right),
                  style: LL.label.copyWith(
                      fontSize: 9.5,
                      letterSpacing: 0.8,
                      color: context.llTextMuted),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _TableRowData extends StatelessWidget {
  const _TableRowData({
    required this.unit,
    required this.gross,
    required this.contract,
    required this.franchisor,
    required this.takeRate,
    required this.growth,
    required this.status,
    required this.statusColor,
    this.total = false,
  });

  factory _TableRowData.fromUnit(MasterConsolidatedUnit u) {
    final (label, color) = switch (u.status) {
      'inadimplente' => ('Inadimplente', LL.live),
      'inativo' => ('Inativa', const Color(0xFF75716D)),
      'pendente' => ('Sem dados', LL.warning),
      _ => ('Ativa', LL.success),
    };
    return _TableRowData(
      unit: u.name,
      gross: _currency(u.grossRevenue),
      contract: _signedPercent(u.contractPercent),
      franchisor: _currency(u.franchisorRevenue),
      takeRate: '${u.takeRate.toStringAsFixed(1).replaceAll('.', ',')}%',
      growth: _signedPercent(u.growthPercent),
      status: label,
      statusColor: color,
    );
  }

  factory _TableRowData.totalFromOverview(MasterConsolidatedOverview ov,
      {required int count}) {
    return _TableRowData(
      unit: 'Total da rede',
      gross: _currency(ov.grossRevenue),
      contract: '—',
      franchisor: _currency(ov.franchisorRevenue),
      takeRate: '${ov.averageTakeRate.toStringAsFixed(1).replaceAll('.', ',')}%',
      growth: _signedPercent(ov.growthPercent),
      status: '$count unidade${count == 1 ? '' : 's'}',
      statusColor: LL.accent,
      total: true,
    );
  }

  final String unit;
  final String gross;
  final String contract;
  final String franchisor;
  final String takeRate;
  final String growth;
  final String status;
  final Color statusColor;
  final bool total;

  @override
  Widget build(BuildContext context) {
    final baseStyle = TextStyle(
      fontSize: 12.5,
      fontWeight: total ? FontWeight.w900 : FontWeight.w700,
      color: total ? context.llTextPrimary : context.llTextSecond,
      fontFeatures: const [FontFeature.tabularFigures()],
    );
    final values = [unit, gross, contract, franchisor, takeRate, growth];
    return Container(
      color: total ? context.llSurface3 : null,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      child: Row(
        children: [
          for (var i = 0; i < values.length; i++)
            Expanded(
              flex: _tableFlexes[i],
              child: Padding(
                padding: const EdgeInsets.only(right: 12),
                child: Text(
                  values[i],
                  overflow: TextOverflow.ellipsis,
                  textAlign: i == 0 ? TextAlign.left : TextAlign.right,
                  style: i == 5
                      ? baseStyle.copyWith(
                          color: growth.startsWith('-') ? LL.live : LL.success)
                      : (i == 0
                          ? baseStyle.copyWith(
                              color: total
                                  ? context.llTextPrimary
                                  : context.llTextPrimary,
                              fontWeight: total
                                  ? FontWeight.w900
                                  : FontWeight.w700)
                          : baseStyle),
                ),
              ),
            ),
          Expanded(
            flex: _tableFlexes[6],
            child: Align(
              alignment: Alignment.centerRight,
              child: total
                  ? Text(status,
                      style: LL.caption.copyWith(
                          fontWeight: FontWeight.w800,
                          color: context.llTextSecond))
                  : AdminStatusPill(label: status, color: statusColor),
            ),
          ),
        ],
      ),
    );
  }
}
