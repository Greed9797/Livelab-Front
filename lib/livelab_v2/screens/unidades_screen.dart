import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../models/admin_master.dart';
import '../../providers/admin_master_provider.dart';
import '../../widgets/empty_state_widget.dart';
import '../../widgets/skeleton_list.dart';
import '../core/ll_theme.dart';
import '../widgets/ll_admin_widgets.dart';
import '../widgets/ll_components.dart';
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

String _currency(double value) =>
    NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$', decimalDigits: 2)
        .format(value);

String _signedPercent(double value) {
  final prefix = value > 0 ? '+' : '';
  return '$prefix${value.toStringAsFixed(1)}%';
}

class UnidadesScreen extends ConsumerStatefulWidget {
  const UnidadesScreen({super.key});

  @override
  ConsumerState<UnidadesScreen> createState() => _UnidadesScreenState();
}

class _UnidadesScreenState extends ConsumerState<UnidadesScreen> {
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
    final unitsAsync = ref.watch(masterUnitsProvider(filters));

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AdminPageToolbar(
            italic: 'Unidades',
            subtitle:
                'Cada unidade como uma mini-DRE operacional da rede, com drill-down por cliente final.',
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
            onRefresh: () => ref.invalidate(masterUnitsProvider(filters)),
          ),
          const SizedBox(height: 16),
          unitsAsync.when(
            loading: () => const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: SkeletonList(itemCount: 4, itemHeight: 90),
            ),
            error: (e, _) => _ErrorBox(
              message: e.toString(),
              onRetry: () => ref.invalidate(masterUnitsProvider(filters)),
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
  final MasterUnitsData data;

  @override
  Widget build(BuildContext context) {
    final summary = data.summary;
    final units = data.units;

    final kpis = [
      AdminKpiCard(
          label: 'Unidades',
          value: '${summary.totalUnits}',
          sub: 'rede ativa',
          icon: Icons.apartment_rounded,
          color: LL.accent),
      AdminKpiCard(
          label: 'Clientes ativos',
          value: '${summary.activeClients}',
          sub: 'contratos faturando',
          icon: Icons.groups_2_rounded,
          color: LL.info),
      AdminKpiCard(
          label: 'Faturamento bruto',
          value: _currency(summary.grossRevenue),
          sub: 'rede consolidada',
          icon: Icons.live_tv_rounded,
          color: LL.success),
      AdminKpiCard(
          label: 'Receita franqueadora',
          value: _currency(summary.franchisorRevenue),
          sub: 'líquida no período',
          icon: Icons.account_balance_wallet_rounded,
          color: LL.accent),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        LayoutBuilder(
          builder: (context, constraints) {
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
          },
        ),
        const SizedBox(height: 18),
        if (units.isEmpty)
          EmptyStateWidget(
            icon: Icons.apartment_rounded,
            title: 'Sem unidades no período',
            message:
                'Nenhuma unidade encontrada com os filtros atuais. Ajuste o período ou status.',
          )
        else
          ...[
            for (var i = 0; i < units.length; i++) ...[
              UnitDrillDownCard(unit: units[i], initiallyOpen: i == 0),
              const SizedBox(height: 12),
            ],
          ],
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
          Text('Não foi possível carregar as unidades',
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

class UnitDrillDownCard extends StatefulWidget {
  const UnitDrillDownCard({super.key, required this.unit, this.initiallyOpen = false});
  final MasterUnit unit;
  final bool initiallyOpen;

  @override
  State<UnitDrillDownCard> createState() => _UnitDrillDownCardState();
}

class _UnitDrillDownCardState extends State<UnitDrillDownCard> {
  late bool open = widget.initiallyOpen;

  @override
  Widget build(BuildContext context) {
    final unit = widget.unit;
    final isInadimplente = unit.status == 'inadimplente';
    final isPendente = unit.status == 'pendente';
    final isInativo = unit.status == 'inativo';
    final regionLabel = unit.region == null || unit.region!.isEmpty
        ? 'Região não informada'
        : unit.region!;
    final (statusLabel, statusColor) = isInadimplente
        ? ('Inadimplente', LL.live)
        : isInativo
            ? ('Inativa', context.llTextMuted)
            : isPendente
                ? ('Sem dados no período', LL.warning)
                : ('Ativa', LL.success);

    return LLCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          InkWell(
            onTap: () => setState(() => open = !open),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          spacing: 8,
                          runSpacing: 6,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            Text(unit.name,
                                style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w900,
                                    color: context.llTextPrimary)),
                            AdminStatusPill(
                                label: statusLabel,
                                color: statusColor),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(regionLabel, style: LL.caption),
                      ],
                    ),
                  ),
                  AnimatedRotation(
                    turns: open ? .5 : 0,
                    duration: const Duration(milliseconds: 180),
                    child: Icon(Icons.keyboard_arrow_down_rounded,
                        size: 22, color: context.llTextMuted),
                  ),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _UnitChip(label: 'Clientes', value: '${unit.activeClients}'),
                _UnitChip(
                    label: 'Faturamento bruto',
                    value: _currency(unit.grossRevenue)),
                _UnitChip(
                    label: 'Receita líquida unidade',
                    value: _currency(unit.unitNetRevenue)),
                _UnitChip(
                    label: 'Receita franqueadora',
                    value: _currency(unit.franchisorRevenue)),
                _UnitChip(
                    label: 'Crescimento',
                    value: _signedPercent(unit.growthPercent),
                    color:
                        unit.growthPercent >= 0 ? LL.success : LL.live),
              ],
            ),
          ),
          AnimatedCrossFade(
            firstChild: const SizedBox.shrink(),
            secondChild: _UnitExpandedContent(unit: unit),
            crossFadeState:
                open ? CrossFadeState.showSecond : CrossFadeState.showFirst,
            duration: const Duration(milliseconds: 180),
          ),
        ],
      ),
    );
  }
}

class _UnitChip extends StatelessWidget {
  const _UnitChip({required this.label, required this.value, this.color});
  final String label;
  final String value;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
          color:
              (color ?? context.llTextSecond).llOpacity(color == null ? 0.06 : 0.12),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color?.llOpacity(0.22) ?? context.llBorder)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label, style: LL.caption.copyWith(fontSize: 10.5)),
          const SizedBox(width: 8),
          Text(value,
              style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  color: color ?? context.llTextPrimary)),
        ],
      ),
    );
  }
}

class _UnitExpandedContent extends StatelessWidget {
  const _UnitExpandedContent({required this.unit});
  final MasterUnit unit;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: context.llSurface3,
          border: Border(top: BorderSide(color: context.llBorder))),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final compact = constraints.maxWidth < 760;
          final dre = _MiniDreCard(unit: unit);
          final clients = _TopClientsCard(unit: unit);
          if (compact) {
            return Column(children: [dre, const SizedBox(height: 12), clients]);
          }
          return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(flex: 3, child: dre),
            const SizedBox(width: 12),
            Expanded(flex: 2, child: clients)
          ]);
        },
      ),
    );
  }
}

class _MiniDreCard extends StatelessWidget {
  const _MiniDreCard({required this.unit});
  final MasterUnit unit;

  @override
  Widget build(BuildContext context) {
    final operationalCosts = unit.grossRevenue -
        unit.unitNetRevenue -
        unit.franchisorRevenue;
    return LLCard(
      color: context.llSurface2,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('MINI-DRE DA UNIDADE',
              style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  color: context.llTextSecond,
                  letterSpacing: 0.7)),
          const SizedBox(height: 10),
          _DreRow(
              label: 'Receita bruta',
              value: _currency(unit.grossRevenue),
              positive: true),
          _DreRow(
              label: '(–) Comissão franqueadora',
              value: '– ${_currency(unit.franchisorRevenue)}',
              negative: true),
          if (operationalCosts > 0)
            _DreRow(
                label: '(–) Custos operacionais',
                value: '– ${_currency(operationalCosts.abs())}',
                negative: true),
          Divider(color: context.llBorder),
          _DreRow(
              label: 'Receita líquida',
              value: _currency(unit.unitNetRevenue),
              positive: true,
              total: true),
        ],
      ),
    );
  }
}

class _TopClientsCard extends StatelessWidget {
  const _TopClientsCard({required this.unit});
  final MasterUnit unit;

  @override
  Widget build(BuildContext context) {
    final top = unit.clients.take(3).toList();
    return LLCard(
      color: context.llSurface2,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('TOP 3 CLIENTES FINAIS',
              style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  color: context.llTextSecond,
                  letterSpacing: 0.7)),
          const SizedBox(height: 10),
          if (top.isEmpty)
            Text('Sem clientes com faturamento no período.',
                style: TextStyle(color: context.llTextMuted, fontSize: 12))
          else
            for (final c in top) ...[
              _ClientRow(client: c),
              if (c != top.last) const SizedBox(height: 8),
            ],
        ],
      ),
    );
  }
}

class _ClientRow extends StatelessWidget {
  const _ClientRow({required this.client});
  final MasterClient client;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(client.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                  color: context.llTextPrimary)),
        ),
        Text(_currency(client.grossRevenue),
            style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w900,
                color: context.llTextSecond)),
      ],
    );
  }
}

class _DreRow extends StatelessWidget {
  const _DreRow(
      {required this.label,
      required this.value,
      this.positive = false,
      this.negative = false,
      this.total = false});
  final String label;
  final String value;
  final bool positive;
  final bool negative;
  final bool total;

  @override
  Widget build(BuildContext context) {
    final color = positive
        ? LL.success
        : negative
            ? LL.live
            : context.llTextPrimary;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Expanded(
              child: Text(label,
                  style: TextStyle(
                      fontSize: total ? 13 : 12,
                      fontWeight: total ? FontWeight.w900 : FontWeight.w600,
                      color: total ? context.llTextPrimary : context.llTextSecond))),
          Text(value,
              style: TextStyle(
                  fontSize: total ? 13 : 12,
                  fontWeight: FontWeight.w900,
                  color: color)),
        ],
      ),
    );
  }
}
