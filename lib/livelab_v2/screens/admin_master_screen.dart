import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../models/admin_master.dart';
import '../../providers/admin_master_provider.dart';
import '../../routes/app_routes.dart';
import '../core/ll_theme.dart';
import '../widgets/ll_admin_widgets.dart';
import '../widgets/ll_components.dart';
import '../widgets/period_picker.dart';

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

class AdminMasterScreen extends ConsumerStatefulWidget {
  const AdminMasterScreen({super.key});

  @override
  ConsumerState<AdminMasterScreen> createState() => _AdminMasterScreenState();
}

class _AdminMasterScreenState extends ConsumerState<AdminMasterScreen> {
  late String _period;

  @override
  void initState() {
    super.initState();
    _period = _currentPeriod();
  }

  @override
  Widget build(BuildContext context) {
    final dashboardAsync = ref.watch(masterDashboardProvider(_period));

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AdminPageToolbar(
            italic: 'Painel',
            bold: 'Master',
            subtitle:
                'Leitura executiva da rede em poucos segundos, sem ruído operacional.',
            filters: [
              AdminFilterChip(
                label: 'Período',
                value: _periodLabel(_period),
                onTap: () async {
                  final picked = await showPeriodPicker(context, _period);
                  if (picked != null && mounted) {
                    setState(() => _period = picked);
                  }
                },
              ),
            ],
            onRefresh: () =>
                ref.invalidate(masterDashboardProvider(_period)),
          ),
          const SizedBox(height: 16),
          dashboardAsync.when(
            loading: () => const Padding(
              padding: EdgeInsets.symmetric(vertical: 80),
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (e, _) => _ErrorBox(
              message: e.toString(),
              onRetry: () =>
                  ref.invalidate(masterDashboardProvider(_period)),
            ),
            data: (dashboard) => _Body(dashboard: dashboard),
          ),
        ],
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.dashboard});
  final MasterDashboardData dashboard;

  @override
  Widget build(BuildContext context) {
    final cards = dashboard.cards;
    final revenueRank = dashboard.revenueRanking
        .take(3)
        .map((r) => RankItem(
              name: r.unitName,
              value: _currency(r.grossRevenue),
              delta: _signedPercent(r.growthPercent),
              up: r.growthPercent >= 0,
            ))
        .toList();
    final growthRank = dashboard.growthRanking
        .take(3)
        .map((r) => RankItem(
              name: r.unitName,
              value: _currency(r.grossRevenue),
              delta: _signedPercent(r.growthPercent),
              up: r.growthPercent >= 0,
            ))
        .toList();

    final maxGrowth = dashboard.unitGrowth
        .map((u) => u.growthPercent.abs())
        .fold<double>(0, (acc, v) => v > acc ? v : acc);
    final growthBars = dashboard.unitGrowth
        .take(3)
        .map((u) => GrowthBarItem(
              name: u.unitName,
              normalizedValue:
                  maxGrowth == 0 ? 0 : (u.growthPercent / maxGrowth).clamp(0.0, 1.0),
              deltaLabel: _signedPercent(u.growthPercent),
            ))
        .toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _ExecutiveSummary(text: dashboard.executiveSummary),
        const SizedBox(height: 14),
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
            children: [
              AdminKpiCard(
                  label: 'Unidades ativas',
                  value: '${cards.unitsActive}',
                  sub: '${cards.unitsActive} franquia(s) operando',
                  icon: Icons.apartment_rounded,
                  color: LL.accent),
              AdminKpiCard(
                  label: 'Clientes ativos',
                  value: '${cards.clientsActive}',
                  sub: 'contratos faturando',
                  icon: Icons.groups_2_rounded,
                  color: LL.info),
              AdminKpiCard(
                  label: 'Faturamento da rede',
                  value: _currency(cards.grossRevenue),
                  sub: 'vs mês anterior',
                  icon: Icons.live_tv_rounded,
                  color: LL.success,
                  delta: _signedPercent(cards.growthPercent),
                  deltaUp: cards.growthPercent >= 0),
              AdminKpiCard(
                  label: 'Receita franqueadora',
                  value: _currency(cards.franchisorNetRevenue),
                  sub: 'líquida no período',
                  icon: Icons.account_balance_wallet_rounded,
                  color: LL.accent),
              AdminKpiCard(
                  label: 'Contratos pendentes',
                  value: '${cards.pendingContracts}',
                  sub: 'aguardando assinatura',
                  icon: Icons.pending_actions_rounded,
                  color: LL.warning),
              AdminKpiCard(
                  label: 'Crescimento',
                  value: _signedPercent(cards.growthPercent),
                  sub: 'vs mês anterior',
                  icon: Icons.trending_up_rounded,
                  color: cards.growthPercent >= 0 ? LL.success : LL.live,
                  delta: 'MoM',
                  deltaUp: cards.growthPercent >= 0),
              AdminKpiCard(
                  label: 'Inadimplência',
                  value: _currency(cards.delinquencyValue),
                  sub:
                      'representa ${cards.delinquencyPercent.toStringAsFixed(1)}%',
                  icon: Icons.warning_amber_rounded,
                  color: cards.delinquencyValue > 0 ? LL.live : LL.success,
                  delta: _signedPercent(cards.delinquencyPercent),
                  deltaUp: cards.delinquencyPercent <= 0),
              AdminKpiCard(
                  label: 'Ticket médio / unidade',
                  value: _currency(cards.averageTicketPerUnit),
                  sub: 'receita por franquia ativa',
                  icon: Icons.sell_rounded,
                  color: LL.info),
            ],
          );
        }),
        const AdminSectionHeader(
            title: 'Ranking de unidades',
            subtitle:
                'desempenho consolidado da rede no período selecionado'),
        LayoutBuilder(builder: (context, constraints) {
          final compact = constraints.maxWidth < 760;
          final cardA =
              RankCard(title: 'Por faturamento', items: revenueRank);
          final cardB =
              RankCard(title: 'Por crescimento', items: growthRank);
          if (compact) {
            return Column(
                children: [cardA, const SizedBox(height: 10), cardB]);
          }
          return Row(children: [
            Expanded(
                child: Padding(
                    padding: const EdgeInsets.only(right: 10), child: cardA)),
            Expanded(child: cardB),
          ]);
        }),
        const AdminSectionHeader(
            title: 'Alertas críticos',
            subtitle: 'situações que pedem ação direta da franqueadora'),
        if (dashboard.alerts.isEmpty)
          LLCard(
            padding: const EdgeInsets.all(16),
            child: Center(
              child: Text(
                  'Sem alertas críticos no período. Tudo sob controle.',
                  style: LL.caption.copyWith(fontSize: 12)),
            ),
          )
        else
          LLCard(
            padding: const EdgeInsets.all(12),
            child: Column(
              children: [
                for (final a in dashboard.alerts.take(6))
                  AdminAlertRow(
                    kind: _alertKind(a.severity),
                    title: a.title,
                    body: a.unitName.isNotEmpty
                        ? '${a.unitName} — ${a.description}'
                        : a.description,
                    action: 'Abrir',
                    onAction: () => _openAlertDetail(context, a),
                  ),
              ],
            ),
          ),
        const AdminSectionHeader(
            title: 'Performance da rede',
            subtitle: 'tendências que importam — sem ruído'),
        LayoutBuilder(builder: (context, constraints) {
          final compact = constraints.maxWidth < 840;
          final history = dashboard.networkHistory;
          final maxY = history.isEmpty
              ? 1.0
              : history
                      .map((h) => h.grossRevenue)
                      .reduce((a, b) => a > b ? a : b) *
                  1.1;
          final chartA = AdminChartCard(
            title: 'Receita consolidada da rede',
            subtitle:
                'últimos ${history.length} meses · faturamento bruto e receita da franqueadora',
            child: history.isEmpty
                ? SizedBox(
                    height: 180,
                    child: Center(
                      child: Text('Sem histórico de receita',
                          style: LL.caption.copyWith(fontSize: 11.5)),
                    ),
                  )
                : AdminLineChart(
                    labels: history.map((h) => h.label).toList(),
                    data: history
                        .map((h) => h.grossRevenue / 1000.0)
                        .toList(),
                    secondaryData: history
                        .map((h) => h.franchisorRevenue / 1000.0)
                        .toList(),
                    maxY: maxY / 1000.0,
                  ),
          );
          final chartB = AdminChartCard(
            title: 'Crescimento por unidade',
            subtitle: 'comparativo com o mês anterior, por franquia',
            child: AdminGrowthChart(items: growthBars),
          );
          if (compact) {
            return Column(
                children: [chartA, const SizedBox(height: 10), chartB]);
          }
          return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(flex: 3, child: chartA),
            const SizedBox(width: 10),
            Expanded(flex: 2, child: chartB),
          ]);
        }),
        const AdminSectionHeader(
            title: 'Comercial & financeiro',
            subtitle:
                'leitura direta do pipeline e do caixa da franqueadora'),
        LayoutBuilder(builder: (context, constraints) {
          final compact = constraints.maxWidth < 760;
          final pipeline = _PipelineCard(stages: dashboard.crmPipeline);
          final commission =
              _CommissionCard(summary: dashboard.commissionSummary);
          if (compact) {
            return Column(children: [
              pipeline,
              const SizedBox(height: 10),
              commission,
            ]);
          }
          return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(child: pipeline),
            const SizedBox(width: 10),
            Expanded(child: commission),
          ]);
        }),
      ],
    );
  }

  AdminAlertKind _alertKind(String severity) {
    switch (severity) {
      case 'alta':
        return AdminAlertKind.danger;
      case 'baixa':
        return AdminAlertKind.info;
      default:
        return AdminAlertKind.warning;
    }
  }
}

class _ExecutiveSummary extends StatelessWidget {
  const _ExecutiveSummary({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    final body = text.isNotEmpty
        ? text
        : 'Sem resumo disponível para o período. Os dados aparecem aqui após a primeira live faturada.';
    return LLCard(
      padding: const EdgeInsets.all(16),
      color: LL.accentSoft,
      borderColor: LL.accent.llOpacity(0.24),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
                color: LL.accent.llOpacity(0.16),
                borderRadius: BorderRadius.circular(13)),
            child: const Icon(Icons.trending_up_rounded,
                color: LL.accent, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('RESUMO EXECUTIVO',
                    style: LL.label
                        .copyWith(color: LL.accent, fontSize: 9.5)),
                const SizedBox(height: 4),
                Text(body,
                    style: LL.body.copyWith(
                        color: context.llTextPrimary, fontSize: 13.2, height: 1.38)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PipelineCard extends StatelessWidget {
  const _PipelineCard({required this.stages});
  final List<MasterPipelineStage> stages;

  @override
  Widget build(BuildContext context) {
    return AdminChartCard(
      title: 'Pipeline do CRM',
      subtitle: 'estrutura comercial em andamento',
      child: stages.isEmpty
          ? Padding(
              padding: const EdgeInsets.symmetric(vertical: 18),
              child: Center(
                child: Text('Sem registros no pipeline',
                    style: LL.caption.copyWith(fontSize: 11.5)),
              ),
            )
          : Column(children: [for (final s in stages) _PipeRow(stage: s)]),
    );
  }
}

class _PipeRow extends StatelessWidget {
  const _PipeRow({required this.stage});
  final MasterPipelineStage stage;

  Color _color(BuildContext context) => switch (stage.stage) {
        'fechado_ganho' => LL.success,
        'fechado_perdido' => context.llTextMuted,
        'contrato_pendente' => LL.warning,
        'negociacao' || 'contrato_enviado' => LL.accent,
        _ => LL.info,
      };

  String get _label => switch (stage.stage) {
        'lead_captado' => 'Lead captado',
        'qualificacao' => 'Qualificação',
        'reuniao_agendada' => 'Reunião agendada',
        'negociacao' => 'Negociação',
        'contrato_enviado' => 'Contrato enviado',
        'contrato_pendente' => 'Contrato pendente',
        'fechado_ganho' => 'Fechado ganho',
        'fechado_perdido' => 'Fechado perdido',
        _ => stage.stage,
      };

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: context.llBorder))),
      child: Row(
        children: [
          Container(
              width: 8,
              height: 8,
              decoration:
                  BoxDecoration(color: _color(context), shape: BoxShape.circle)),
          const SizedBox(width: 9),
          Expanded(
              child: Text(_label,
                  style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                      color: context.llTextSecond))),
          Text('${stage.count}',
              style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                  color:
                      stage.count > 0 ? context.llTextPrimary : context.llTextMuted)),
        ],
      ),
    );
  }
}

class _CommissionCard extends StatelessWidget {
  const _CommissionCard({required this.summary});
  final MasterCommissionSummary summary;

  @override
  Widget build(BuildContext context) {
    final total = summary.received + summary.pending + summary.overdue;
    final receiveRate = total == 0 ? 0.0 : (summary.received / total) * 100;

    return AdminChartCard(
      title: 'Comissionamento da franqueadora',
      subtitle: 'leitura direta do caixa da franqueadora no período',
      child: Column(
        children: [
          _MoneyStatus(
              label: 'Previsto',
              value: _currency(summary.forecast),
              color: LL.accent),
          _MoneyStatus(
              label: 'Recebido',
              value: _currency(summary.received),
              color: LL.success),
          _MoneyStatus(
              label: 'Pendente',
              value: _currency(summary.pending),
              color: LL.warning),
          _MoneyStatus(
              label: 'Inadimplente',
              value: _currency(summary.overdue),
              color: LL.live),
          const SizedBox(height: 12),
          Divider(color: context.llBorder, height: 1),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                  child: Text('Taxa de recebimento',
                      style: TextStyle(
                          fontSize: 11,
                          color: context.llTextMuted,
                          fontWeight: FontWeight.w600))),
              Text('${receiveRate.toStringAsFixed(0)}%',
                  style: TextStyle(
                      fontSize: 14,
                      color: receiveRate >= 80
                          ? LL.success
                          : receiveRate >= 50
                              ? LL.warning
                              : LL.live,
                      fontWeight: FontWeight.w900)),
            ],
          ),
        ],
      ),
    );
  }
}

class _MoneyStatus extends StatelessWidget {
  const _MoneyStatus(
      {required this.label, required this.value, required this.color});
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: context.llBorder))),
      child: Row(
        children: [
          Container(
              width: 8,
              height: 8,
              decoration:
                  BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 9),
          Expanded(
              child: Text(label,
                  style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                      color: context.llTextSecond))),
          Text(value,
              style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                  color: context.llTextPrimary)),
        ],
      ),
    );
  }
}

void _openAlertDetail(BuildContext context, MasterAlertItem alert) {
  final messenger = ScaffoldMessenger.of(context);
  // Navega pra rota mais relevante do alerta. Tipos conhecidos:
  //   - sem_venda / queda_receita / unit_*  → tela Unidades
  //   - contrato_pipeline / contrato_*      → tela CRM
  //   - inadimplencia / boleto_*            → tela Consolidado
  String? targetRoute;
  switch (alert.type) {
    case 'contrato_pipeline':
    case 'contrato_pendente':
    case 'lead_parado':
      targetRoute = AppRoutes.masterCrm;
      break;
    case 'inadimplencia':
    case 'boleto_atrasado':
      targetRoute = AppRoutes.masterConsolidated;
      break;
    case 'sem_venda':
    case 'queda_receita':
    default:
      targetRoute = AppRoutes.masterUnits;
  }

  showModalBottomSheet<void>(
    context: context,
    backgroundColor: context.llSurface2,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (sheetCtx) => Padding(
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: _alertColor(alert.severity).llOpacity(0.16),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(Icons.warning_amber_rounded,
                    size: 17, color: _alertColor(alert.severity)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(alert.title,
                    style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w900,
                        color: sheetCtx.llTextPrimary)),
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(sheetCtx),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (alert.unitName.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text('Unidade: ${alert.unitName}',
                  style: TextStyle(
                      fontSize: 12.5,
                      color: sheetCtx.llTextSecond,
                      fontWeight: FontWeight.w700)),
            ),
          Text(alert.description,
              style: TextStyle(
                  fontSize: 13,
                  color: sheetCtx.llTextPrimary,
                  height: 1.5)),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: LLButton(
                  label: 'Fechar',
                  variant: LLButtonVariant.ghost,
                  onTap: () => Navigator.pop(sheetCtx),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: LLButton(
                  label: 'Ir para tela',
                  icon: Icons.arrow_forward_rounded,
                  onTap: () {
                    Navigator.pop(sheetCtx);
                    Navigator.of(context).pushNamed(targetRoute!);
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    ),
  );

  if (alert.unitId.isEmpty) {
    messenger.showSnackBar(
      const SnackBar(
        content: Text('Alerta sem unidade vinculada'),
        duration: Duration(seconds: 2),
      ),
    );
  }
}

Color _alertColor(String severity) {
  switch (severity) {
    case 'critica':
    case 'alta':
      return LL.live;
    case 'baixa':
      return LL.info;
    default:
      return LL.warning;
  }
}

class _ErrorBox extends StatelessWidget {
  const _ErrorBox({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return LLCard(
      padding: const EdgeInsets.all(20),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Icon(Icons.error_outline, color: LL.live, size: 24),
        const SizedBox(height: 10),
        Text('Não foi possível carregar o painel master',
            style: TextStyle(
                color: context.llTextPrimary,
                fontSize: 14,
                fontWeight: FontWeight.w800)),
        const SizedBox(height: 6),
        Text(message,
            style: LL.caption.copyWith(fontSize: 12, color: context.llTextSecond)),
        const SizedBox(height: 14),
        LLButton(
            label: 'Tentar novamente',
            icon: Icons.refresh_rounded,
            onTap: onRetry),
      ]),
    );
  }
}
