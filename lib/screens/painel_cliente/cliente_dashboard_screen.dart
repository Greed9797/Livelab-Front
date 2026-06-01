import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../design_system/design_system.dart';
import '../../livelab/theme/livelab_theme.dart';
import '../../providers/cliente_dashboard_provider.dart'
    show
        ClienteDashboard,
        ClientePeriod,
        HorarioVenda,
        ProximaLive,
        SerieMensal,
        clienteDashboardProvider,
        clientePeriodProvider,
        clientePeriodStringProvider;
import '../../providers/cliente_lives_provider.dart'
    show ClienteLive, ClienteLivesResponse, clienteLivesProvider;
import '../../routes/app_routes.dart';
import 'dart:math' as math;

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------
final _currency = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');
final _periodFormat = DateFormat.yMMMM('pt_BR');

// ---------------------------------------------------------------------------
// Root screen
// ---------------------------------------------------------------------------
class ClienteDashboardScreen extends ConsumerWidget {
  const ClienteDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final period = ref.watch(clientePeriodProvider);
    final periodoStr = ref.watch(clientePeriodStringProvider);
    final dashAsync = ref.watch(clienteDashboardProvider);
    final livesAsync = ref.watch(clienteLivesProvider);

    return AppScreenScaffold(
      currentRoute: AppRoutes.cliente,
      eyebrow: 'PAINEL DO PARCEIRO',
      title: 'Minha Loja',
      subtitle: 'Visão geral da performance de lives',
      titleSerif: true,
      actions: [
        _PeriodTabs(
          selected: periodoStr,
          period: period,
        ),
      ],
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.x6),
        child: dashAsync.when(
          loading: () => const Center(
            child: Padding(
              padding: EdgeInsets.symmetric(vertical: AppSpacing.x10),
              child: CircularProgressIndicator(),
            ),
          ),
          error: (error, _) => _ErrorState(error: error),
          data: (dashboard) => _DashboardContent(
            dashboard: dashboard,
            livesAsync: livesAsync,
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Period tabs
// ---------------------------------------------------------------------------
class _PeriodTabs extends ConsumerWidget {
  final String selected;
  final ClientePeriod period;

  const _PeriodTabs({required this.selected, required this.period});

  static const _tabs = [
    ('hoje', 'Hoje'),
    ('7dias', '7 dias'),
    ('30dias', '30 dias'),
    ('mes_atual', 'Mês atual'),
    ('personalizado', 'Personalizado'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.llTokens;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.all(3),
          decoration: BoxDecoration(
            color: t.bgElev2,
            borderRadius: BorderRadius.circular(9),
            border: Border.all(color: t.border),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: _tabs.map((tab) {
              final isSelected = tab.$1 == selected;
              return InkWell(
                borderRadius: BorderRadius.circular(7),
                onTap: () => _onTap(context, ref, tab.$1),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 11,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: isSelected ? t.primary : Colors.transparent,
                    borderRadius: BorderRadius.circular(7),
                  ),
                  child: Text(
                    tab.$2,
                    style: TextStyle(
                      fontSize: 12,
                      color: isSelected ? Colors.white : t.textMuted,
                      fontWeight:
                          isSelected ? FontWeight.w700 : FontWeight.w500,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(width: 8),
        if (selected == 'mes_atual' || selected == 'personalizado')
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
            decoration: BoxDecoration(
              color: t.bgElev2,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: t.border),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                InkWell(
                  borderRadius: BorderRadius.circular(4),
                  onTap: () => ref
                      .read(clienteDashboardProvider.notifier)
                      .setPeriodo(period.previous()),
                  child: Padding(
                    padding: const EdgeInsets.all(2),
                    child:
                        Icon(Icons.chevron_left_rounded, size: 16, color: t.textSecondary),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 6),
                  child: Text(
                    _periodFormat.format(DateTime(period.ano, period.mes)),
                    style: TextStyle(
                      fontSize: 12.5,
                      color: t.textPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                InkWell(
                  borderRadius: BorderRadius.circular(4),
                  onTap: () => ref
                      .read(clienteDashboardProvider.notifier)
                      .setPeriodo(period.next()),
                  child: Padding(
                    padding: const EdgeInsets.all(2),
                    child: Icon(Icons.chevron_right_rounded,
                        size: 16, color: t.textSecondary),
                  ),
                ),
              ],
            ),
          ),
        const SizedBox(width: 4),
        InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: () =>
              ref.read(clienteDashboardProvider.notifier).refresh(),
          child: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: t.bgElev2,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: t.border),
            ),
            child: Icon(Icons.refresh_rounded,
                size: 16, color: t.textSecondary),
          ),
        ),
      ],
    );
  }

  void _onTap(BuildContext context, WidgetRef ref, String periodoStr) {
    if (periodoStr == 'personalizado') {
      // Show date range picker — temporarily uses 30dias backend
      _showDateRangePicker(context, ref);
      return;
    }
    ref.read(clientePeriodStringProvider.notifier).state = periodoStr;
  }

  Future<void> _showDateRangePicker(
    BuildContext context,
    WidgetRef ref,
  ) async {
    final now = DateTime.now();
    final range = await showDateRangePicker(
      context: context,
      firstDate: DateTime(now.year - 2),
      lastDate: now,
      initialDateRange: DateTimeRange(
        start: now.subtract(const Duration(days: 30)),
        end: now,
      ),
      locale: const Locale('pt', 'BR'),
    );
    if (range != null) {
      // Backend custom period not yet implemented — fall back to 30dias
      ref.read(clientePeriodStringProvider.notifier).state = 'personalizado';
    }
  }
}

// ---------------------------------------------------------------------------
// Main content
// ---------------------------------------------------------------------------
class _DashboardContent extends StatelessWidget {
  final ClienteDashboard dashboard;
  final AsyncValue<ClienteLivesResponse> livesAsync;

  const _DashboardContent({
    required this.dashboard,
    required this.livesAsync,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Active live banner
        if (dashboard.liveAtiva != null) ...[
          _ActiveLiveCard(dashboard: dashboard),
          const SizedBox(height: AppSpacing.x6),
        ],

        // Block 1 — KPI Cards
        _KpiGrid(dashboard: dashboard),
        const SizedBox(height: AppSpacing.x8),

        // Block 2 — Meta e Projeção
        _MetaCard(dashboard: dashboard),
        const SizedBox(height: AppSpacing.x8),

        // Block 7 — Próximas Lives
        _ProximasLivesCard(lives: dashboard.proximasLives),
        const SizedBox(height: AppSpacing.x8),

        // Block 8 — Pendências
        if (dashboard.pendentesAprovacao > 0) ...[
          _PendenciasCard(count: dashboard.pendentesAprovacao),
          const SizedBox(height: AppSpacing.x8),
        ],

        // Analytics detail (from existing dashboard)
        LayoutBuilder(
          builder: (context, constraints) {
            final isWide = constraints.maxWidth >= 1160;
            if (isWide) {
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: _SalesWindowsCard(
                      horarios: dashboard.melhoresHorariosVenda,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.x4),
                  Expanded(
                    child: _MonthlySeriesCard(series: dashboard.seriesMensais),
                  ),
                ],
              );
            }
            return Column(
              children: [
                _SalesWindowsCard(horarios: dashboard.melhoresHorariosVenda),
                const SizedBox(height: AppSpacing.x4),
                _MonthlySeriesCard(series: dashboard.seriesMensais),
              ],
            );
          },
        ),
        const SizedBox(height: AppSpacing.x8),

        // Detailed lives section
        livesAsync.when(
          loading: () => const _SectionLoading(
            title: 'Lives detalhadas',
            subtitle: 'Carregando métricas por live',
          ),
          error: (error, _) => _SectionError(
            title: 'Lives detalhadas',
            message: 'Não foi possível carregar as lives: $error',
          ),
          data: (response) => _DetailedLivesSection(response: response),
        ),
        const SizedBox(height: AppSpacing.x8),

        // Block 9 — Nova Live CTA
        _NovaLiveCta(),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Block 1 — KPI Grid
// ---------------------------------------------------------------------------
class _KpiGrid extends StatelessWidget {
  final ClienteDashboard dashboard;

  const _KpiGrid({required this.dashboard});

  @override
  Widget build(BuildContext context) {
    final ticketDisplay = dashboard.totalPedidos == 0
        ? '–'
        : _currency.format(dashboard.ticketMedio);

    return Wrap(
      spacing: AppSpacing.x4,
      runSpacing: AppSpacing.x4,
      children: [
        _KpiCard(
          value: _currency.format(dashboard.gmvTotal),
          label: 'Faturamento do período',
          color: AppColors.primary,
          icon: PhosphorIcons.chartLineUp(),
        ),
        _KpiCard(
          value: '${dashboard.totalLives}',
          label: 'Lives realizadas',
          color: AppColors.info,
          icon: PhosphorIcons.videoCamera(),
        ),
        _KpiCard(
          value: '${dashboard.horasLive.toStringAsFixed(1)}h',
          label: 'Horas no ar',
          color: AppColors.success,
          icon: PhosphorIcons.clock(),
        ),
        _KpiCard(
          value: ticketDisplay,
          label: 'Ticket médio',
          color: AppColors.warning,
          icon: PhosphorIcons.tag(),
        ),
      ],
    );
  }
}

class _KpiCard extends StatelessWidget {
  final String value;
  final String label;
  final Color color;
  final IconData? icon;

  const _KpiCard({
    required this.value,
    required this.label,
    required this.color,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    return SizedBox(
      width: 220,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        decoration: BoxDecoration(
          color: t.bgElev2,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: t.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                if (icon != null) ...[
                  Icon(icon, size: 14, color: color),
                  const SizedBox(width: 6),
                ],
                Expanded(
                  child: Text(
                    label,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: t.textMuted,
                      letterSpacing: 0.2,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              value,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w800,
                color: t.textPrimary,
                letterSpacing: -0.96,
                height: 1,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Block 2 — Meta e Projeção
// ---------------------------------------------------------------------------
class _MetaCard extends ConsumerWidget {
  final ClienteDashboard dashboard;

  const _MetaCard({required this.dashboard});

  Color _barColor(String status) {
    switch (status) {
      case 'acima_da_meta':
        return AppColors.success;
      case 'dentro_do_ritmo':
        return AppColors.primary;
      case 'abaixo_do_ritmo':
        return AppColors.warning;
      case 'critico':
        return AppColors.danger;
      default:
        return AppColors.primary;
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'acima_da_meta':
        return 'Acima da meta';
      case 'dentro_do_ritmo':
        return 'No ritmo';
      case 'abaixo_do_ritmo':
        return 'Abaixo do ritmo';
      case 'critico':
        return 'Crítico';
      default:
        return 'No ritmo';
    }
  }

  Color _statusTextColor(String status) {
    switch (status) {
      case 'acima_da_meta':
        return AppColors.success;
      case 'dentro_do_ritmo':
        return AppColors.primary;
      case 'abaixo_do_ritmo':
        return AppColors.warning;
      case 'critico':
        return AppColors.danger;
      default:
        return AppColors.primary;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.llTokens;
    final progress = (dashboard.pctMeta / 100).clamp(0.0, 1.0);
    final barColor = _barColor(dashboard.statusMeta);
    final metaAtingida = dashboard.pctMeta >= 100;
    final pctRounded = dashboard.pctMeta.round();

    return Container(
      decoration: BoxDecoration(
        color: t.bgElev1,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: t.border),
      ),
      padding: const EdgeInsets.all(AppSpacing.x6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          SizedBox(
            width: 88,
            height: 88,
            child: Stack(
              alignment: Alignment.center,
              children: [
                CustomPaint(
                  size: const Size(88, 88),
                  painter: _CircularProgressPainter(
                    value: progress,
                    color: barColor,
                    trackColor: t.border,
                    stroke: 7,
                  ),
                ),
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      '$pctRounded%',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: t.textPrimary,
                        letterSpacing: -0.6,
                        height: 1,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'DA META',
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                        color: t.textMuted,
                        letterSpacing: 0.6,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.x6),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Meta do Mês',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: t.textPrimary,
                        ),
                      ),
                    ),
                    IconButton(
                      tooltip: 'Editar meta',
                      onPressed: () =>
                          _showMetaDialog(context, ref, dashboard),
                      iconSize: 16,
                      padding: const EdgeInsets.all(4),
                      visualDensity: VisualDensity.compact,
                      constraints:
                          const BoxConstraints(minWidth: 24, minHeight: 24),
                      icon: Icon(
                        PhosphorIcons.pencilSimple(),
                        color: t.textMuted,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      _currency.format(dashboard.gmvTotal),
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: t.textPrimary,
                        letterSpacing: -0.6,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '/ ${_currency.format(dashboard.metaGmv)}',
                      style: TextStyle(fontSize: 12, color: t.textMuted),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: _statusTextColor(dashboard.statusMeta)
                            .withValues(alpha: 0.14),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        _statusLabel(dashboard.statusMeta).toUpperCase(),
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: _statusTextColor(dashboard.statusMeta),
                          letterSpacing: 0.6,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        metaAtingida
                            ? 'Meta atingida!'
                            : 'Faltam ${_currency.format(dashboard.gmvFaltante)}',
                        style: TextStyle(
                          fontSize: 11,
                          color: t.textMuted,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showMetaDialog(
    BuildContext context,
    WidgetRef ref,
    ClienteDashboard dashboard,
  ) {
    showDialog<void>(
      context: context,
      builder: (_) => _MetaEditDialog(dashboard: dashboard, ref: ref),
    );
  }
}

class _MetaEditDialog extends StatefulWidget {
  final ClienteDashboard dashboard;
  final WidgetRef ref;

  const _MetaEditDialog({required this.dashboard, required this.ref});

  @override
  State<_MetaEditDialog> createState() => _MetaEditDialogState();
}

class _MetaEditDialogState extends State<_MetaEditDialog> {
  late final TextEditingController _ctrl;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final existing = widget.dashboard.metaGmv;
    _ctrl = TextEditingController(
      text: existing > 0 ? existing.toStringAsFixed(2) : '',
    );
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final value = double.tryParse(_ctrl.text.replaceAll(',', '.'));
    if (value == null || value <= 0) return;
    setState(() => _saving = true);
    try {
      final period = widget.ref.read(clientePeriodProvider);
      await widget.ref
          .read(clienteDashboardProvider.notifier)
          .updateMeta(period.ano, period.mes, value);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao salvar meta: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final period = widget.ref.read(clientePeriodProvider);
    final monthLabel =
        _periodFormat.format(DateTime(period.ano, period.mes));

    return AlertDialog(
      title: const Text('Definir meta de GMV'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            monthLabel,
            style: AppTypography.bodySmall.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: AppSpacing.x4),
          TextField(
            controller: _ctrl,
            keyboardType:
                const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(
              labelText: 'Meta de GMV (R\$)',
              prefixText: 'R\$ ',
              border: OutlineInputBorder(),
            ),
          ),
        ],
      ),
      actions: [
        AppSecondaryButton(
          label: 'Cancelar',
          onPressed: () => Navigator.of(context).pop(),
        ),
        AppPrimaryButton(
          label: 'Salvar',
          isLoading: _saving,
          onPressed: _saving ? null : _save,
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Block 7 — Próximas Lives
// ---------------------------------------------------------------------------
class _ProximasLivesCard extends ConsumerWidget {
  final List<ProximaLive> lives;

  const _ProximasLivesCard({required this.lives});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.llTokens;
    return Container(
      decoration: BoxDecoration(
        color: t.bgElev2,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: t.border),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(PhosphorIcons.videoCamera(), size: 14, color: t.primary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Próximas Lives',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: t.textPrimary,
                  ),
                ),
              ),
              Text(
                lives.isEmpty ? '—' : '${lives.length} agendada${lives.length == 1 ? '' : 's'}',
                style: TextStyle(fontSize: 11, color: t.textMuted),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (lives.isEmpty)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Nenhuma live agendada',
                  style: TextStyle(fontSize: 12, color: t.textMuted),
                ),
                const SizedBox(height: 12),
                AppPrimaryButton(
                  label: 'Solicitar nova live',
                  outlined: true,
                  onPressed: () => _onSolicitarLive(context),
                  icon: Icons.add,
                ),
              ],
            )
          else
            Column(
              children: lives
                  .map((live) => _ProximaLiveRow(live: live))
                  .toList(),
            ),
        ],
      ),
    );
  }

  void _onSolicitarLive(BuildContext context) {
    Navigator.of(context).pushNamed(AppRoutes.clienteAgenda);
  }
}

class _ProximaLiveRow extends StatelessWidget {
  final ProximaLive live;

  const _ProximaLiveRow({required this.live});

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    final timeStr = live.horaInicio ?? '–';
    final dateStr = live.data != null
        ? DateFormat("dd/MM", 'pt_BR').format(live.data!)
        : '';
    final cabLabel = 'Cab. ${live.cabineNumero.toString().padLeft(2, '0')}';
    final subLine = [if (dateStr.isNotEmpty) dateStr, cabLabel].join(' · ');

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          SizedBox(
            width: 44,
            child: Text(
              timeStr,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: t.textPrimary,
                letterSpacing: -0.26,
                height: 1,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Container(
            width: 4,
            height: 4,
            decoration: BoxDecoration(
              color: t.primary,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  cabLabel,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: t.textPrimary,
                  ),
                  overflow: TextOverflow.ellipsis,
                  maxLines: 1,
                ),
                const SizedBox(height: 2),
                Text(
                  subLine,
                  style: TextStyle(
                    fontSize: 10,
                    color: t.textMuted,
                  ),
                  overflow: TextOverflow.ellipsis,
                  maxLines: 1,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

}

// ---------------------------------------------------------------------------
// Block 8 — Pendências
// ---------------------------------------------------------------------------
class _PendenciasCard extends StatelessWidget {
  final int count;

  const _PendenciasCard({required this.count});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.x4),
      decoration: BoxDecoration(
        color: AppColors.warningBg,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.warning.withOpacity(0.4)),
      ),
      child: Row(
        children: [
          Icon(
            PhosphorIcons.warning(),
            color: AppColors.warning,
            size: 20,
          ),
          const SizedBox(width: AppSpacing.x3),
          Expanded(
            child: Text(
              'Você tem $count live(s) aguardando confirmação da unidade.',
              style: AppTypography.bodySmall.copyWith(
                color: AppColors.warning,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Block 9 — Nova Live CTA
// ---------------------------------------------------------------------------
class _NovaLiveCta extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return AppPrimaryButton(
      label: 'Solicitar nova live',
      outlined: true,
      fullWidth: true,
      onPressed: () => Navigator.of(context).pushNamed(AppRoutes.clienteAgenda),
      icon: Icons.add,
    );
  }
}

// ---------------------------------------------------------------------------
// Active Live Banner (preserved from dashboard)
// ---------------------------------------------------------------------------
class _ActiveLiveCard extends StatelessWidget {
  final ClienteDashboard dashboard;

  const _ActiveLiveCard({required this.dashboard});

  @override
  Widget build(BuildContext context) {
    final live = dashboard.liveAtiva!;

    return AppCard(
      borderColor: AppColors.success,
      padding: const EdgeInsets.all(AppSpacing.x6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.x3,
                  vertical: AppSpacing.x1,
                ),
                decoration: BoxDecoration(
                  color: AppColors.success,
                  borderRadius: BorderRadius.circular(AppRadius.full),
                ),
                child: Text(
                  'AO VIVO',
                  style: AppTypography.caption.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.x3),
              Text(
                'Cabine ${live.cabineNumero.toString().padLeft(2, '0')}',
                style: AppTypography.bodyLarge.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const Spacer(),
              Text(
                '${live.duracaoMin} min',
                style: AppTypography.bodySmall.copyWith(
                  color: context.colors.textSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.x5),
          Wrap(
            spacing: AppSpacing.x6,
            runSpacing: AppSpacing.x4,
            children: [
              _LivePulseMetric(
                icon: Icons.payments_rounded,
                label: 'GMV atual',
                value: _currency.format(live.gmvAtual),
              ),
              _LivePulseMetric(
                icon: Icons.visibility_rounded,
                label: 'Viewers',
                value: '${live.viewerCount}',
              ),
              _LivePulseMetric(
                icon: Icons.shopping_bag_rounded,
                label: 'Pedidos',
                value: '${live.pedidos}',
              ),
              _LivePulseMetric(
                icon: Icons.favorite_rounded,
                label: 'Likes',
                value: '${live.likes}',
              ),
              _LivePulseMetric(
                icon: Icons.chat_bubble_rounded,
                label: 'Comentários',
                value: '${live.comentarios}',
              ),
              _LivePulseMetric(
                icon: Icons.share_rounded,
                label: 'Shares',
                value: '${live.shares}',
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _LivePulseMetric extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _LivePulseMetric({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 132,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 15, color: AppColors.primary),
              const SizedBox(width: AppSpacing.x2),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTypography.caption.copyWith(
                    color: context.colors.textSecondary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.x1),
          Text(
            value,
            style: AppTypography.bodyLarge.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Analytics — Sales Windows
// ---------------------------------------------------------------------------
class _SalesWindowsCard extends StatelessWidget {
  final List<HorarioVenda> horarios;

  const _SalesWindowsCard({required this.horarios});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionTitle(
            icon: Icons.access_time_filled_rounded,
            title: 'Melhores horários de venda',
            subtitle: 'Faixas com maior GMV por hora do dia',
          ),
          const SizedBox(height: AppSpacing.x4),
          if (horarios.isEmpty)
            const _EmptyHint(
              message:
                  'Sem vendas suficientes para montar o ranking do período.',
            )
          else
            ...horarios.map(
              (horario) => Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.x3),
                child: _HorarioRow(
                  horario: horario,
                  maxGmv: horarios.fold<double>(
                    0,
                    (max, item) => item.gmvTotal > max ? item.gmvTotal : max,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _HorarioRow extends StatelessWidget {
  final HorarioVenda horario;
  final double maxGmv;

  const _HorarioRow({required this.horario, required this.maxGmv});

  @override
  Widget build(BuildContext context) {
    final progress = maxGmv <= 0 ? 0.0 : (horario.gmvTotal / maxGmv);

    return Row(
      children: [
        SizedBox(
          width: 52,
          child: Text(
            horario.label,
            style: AppTypography.bodySmall.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(AppRadius.full),
            child: LinearProgressIndicator(
              value: progress.clamp(0.0, 1.0),
              minHeight: 10,
              backgroundColor: AppColors.borderLight,
              color: AppColors.primary,
            ),
          ),
        ),
        const SizedBox(width: AppSpacing.x3),
        SizedBox(
          width: 96,
          child: Text(
            _currency.format(horario.gmvTotal),
            textAlign: TextAlign.right,
            style: AppTypography.bodySmall.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Analytics — Monthly Series
// ---------------------------------------------------------------------------
class _MonthlySeriesCard extends StatelessWidget {
  final List<SerieMensal> series;

  const _MonthlySeriesCard({required this.series});

  @override
  Widget build(BuildContext context) {
    final ordered = [...series]..sort((a, b) {
        final aKey = a.ano * 100 + a.mes;
        final bKey = b.ano * 100 + b.mes;
        return aKey.compareTo(bKey);
      });
    final visible =
        ordered.length > 6 ? ordered.sublist(ordered.length - 6) : ordered;
    final maxGmv = visible.fold<double>(
      0,
      (max, item) => item.gmvTotal > max ? item.gmvTotal : max,
    );

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionTitle(
            icon: Icons.timeline_rounded,
            title: 'Evolução mensal',
            subtitle: 'GMV e horas de live nos meses mais recentes',
          ),
          const SizedBox(height: AppSpacing.x4),
          if (visible.isEmpty)
            const _EmptyHint(
              message:
                  'Ainda não há série mensal disponível para este parceiro.',
            )
          else
            ...visible.map(
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.x4),
                child: _MonthlySeriesRow(item: item, maxGmv: maxGmv),
              ),
            ),
        ],
      ),
    );
  }
}

class _MonthlySeriesRow extends StatelessWidget {
  final SerieMensal item;
  final double maxGmv;

  const _MonthlySeriesRow({required this.item, required this.maxGmv});

  @override
  Widget build(BuildContext context) {
    final label = '${item.mes.toString().padLeft(2, '0')}/${item.ano}';
    final progress = maxGmv <= 0 ? 0.0 : (item.gmvTotal / maxGmv);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: AppTypography.bodySmall.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            Text(
              _currency.format(item.gmvTotal),
              style: AppTypography.bodySmall.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.x2),
        ClipRRect(
          borderRadius: BorderRadius.circular(AppRadius.full),
          child: LinearProgressIndicator(
            value: progress.clamp(0.0, 1.0),
            minHeight: 10,
            backgroundColor: AppColors.borderLight,
            color: AppColors.primaryLight,
          ),
        ),
        const SizedBox(height: AppSpacing.x2),
        Text(
          '${item.totalLives} lives • ${item.horasLive.toStringAsFixed(1)}h • ROAS ${item.roas.toStringAsFixed(2)}',
          style: AppTypography.caption.copyWith(
            color: context.colors.textSecondary,
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Detailed Lives Section (preserved)
// ---------------------------------------------------------------------------
class _MetricBox extends StatelessWidget {
  final Widget child;

  const _MetricBox({required this.child});

  @override
  Widget build(BuildContext context) {
    return SizedBox(width: 220, child: child);
  }
}

class _DetailedLivesSection extends StatelessWidget {
  final ClienteLivesResponse response;

  const _DetailedLivesSection({required this.response});

  @override
  Widget build(BuildContext context) {
    final resumo = response.resumo;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionTitle(
          icon: Icons.live_tv_rounded,
          title: 'Lives detalhadas',
          subtitle: 'Desempenho individual de cada transmissão',
        ),
        const SizedBox(height: AppSpacing.x4),
        Wrap(
          spacing: AppSpacing.x4,
          runSpacing: AppSpacing.x4,
          children: [
            _MetricBox(
              child: MetricCard(
                label: 'LIVES',
                value: '${resumo.totalLives}',
                icon: Icons.video_library_rounded,
                iconColor: AppColors.primary,
                subtitle: '${resumo.horasLive.toStringAsFixed(1)}h',
              ),
            ),
            _MetricBox(
              child: MetricCard(
                label: 'VIEWERS',
                value: '${resumo.viewerCount}',
                icon: Icons.visibility_rounded,
                iconColor: AppColors.info,
                subtitle: '${resumo.totalOrders} pedidos',
              ),
            ),
            _MetricBox(
              child: MetricCard(
                label: 'COMENTÁRIOS',
                value: '${resumo.commentsCount}',
                icon: Icons.forum_rounded,
                iconColor: AppColors.primaryLight,
                subtitle: '${resumo.likesCount} likes',
              ),
            ),
            _MetricBox(
              child: MetricCard(
                label: 'INVESTIDO',
                value: _currency.format(resumo.valorInvestidoLives),
                icon: Icons.savings_rounded,
                iconColor: AppColors.warning,
                subtitle: 'ROAS ${resumo.roas.toStringAsFixed(2)}',
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.x6),
        if (response.lives.isEmpty)
          const _EmptyHint(
            message: 'Nenhuma live registrada neste período.',
          )
        else
          Column(
            children: response.lives
                .map(
                  (live) => Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.x4),
                    child: _LiveDetailCard(live: live),
                  ),
                )
                .toList(),
          ),
      ],
    );
  }
}

class _LiveDetailCard extends StatelessWidget {
  static final DateFormat _dateFormat = DateFormat('dd/MM/yyyy HH:mm');

  final ClienteLive live;

  const _LiveDetailCard({required this.live});

  @override
  Widget build(BuildContext context) {
    final startedAt = live.iniciadoEm == null
        ? 'Sem início'
        : _dateFormat.format(live.iniciadoEm!.toLocal());
    final statusLabel =
        live.encerradoEm == null ? 'em andamento' : 'encerrada';

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  live.streamerNome?.isNotEmpty == true
                      ? live.streamerNome!
                      : 'Live ${live.id}',
                  style: AppTypography.bodyLarge.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.x3,
                  vertical: AppSpacing.x1,
                ),
                decoration: BoxDecoration(
                  color: live.encerradoEm == null
                      ? context.colors.primarySoftBg
                      : AppColors.successBg,
                  borderRadius: BorderRadius.circular(AppRadius.full),
                ),
                child: Text(
                  statusLabel,
                  style: AppTypography.caption.copyWith(
                    color: live.encerradoEm == null
                        ? AppColors.primary
                        : AppColors.success,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.x2),
          Text(
            startedAt,
            style: AppTypography.caption.copyWith(
              color: context.colors.textSecondary,
            ),
          ),
          const SizedBox(height: AppSpacing.x4),
          Wrap(
            spacing: AppSpacing.x5,
            runSpacing: AppSpacing.x3,
            children: [
              _LiveMetric(label: 'Duração', value: '${live.duracaoMin} min'),
              _LiveMetric(
                label: 'GMV',
                value: _currency.format(live.gmv),
                highlight: true,
              ),
              _LiveMetric(label: 'Itens', value: '${live.itensVendidos}'),
              _LiveMetric(label: 'Pedidos', value: '${live.totalOrders}'),
              _LiveMetric(label: 'Viewers', value: '${live.viewerCount}'),
              _LiveMetric(
                label: 'Comentários',
                value: '${live.commentsCount}',
              ),
              _LiveMetric(label: 'Likes', value: '${live.likesCount}'),
              _LiveMetric(label: 'Shares', value: '${live.sharesCount}'),
              _LiveMetric(label: 'ROAS', value: live.roas.toStringAsFixed(2)),
              _LiveMetric(
                label: 'Investido',
                value: _currency.format(live.valorInvestido),
              ),
            ],
          ),
          if (live.topProduto?.isNotEmpty == true) ...[
            const SizedBox(height: AppSpacing.x4),
            Row(
              children: [
                const Icon(
                  Icons.star_rounded,
                  size: 15,
                  color: AppColors.warning,
                ),
                const SizedBox(width: AppSpacing.x2),
                Expanded(
                  child: Text(
                    'Top produto: ${live.topProduto}',
                    style: AppTypography.bodySmall.copyWith(
                      color: context.colors.textSecondary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _LiveMetric extends StatelessWidget {
  final String label;
  final String value;
  final bool highlight;

  const _LiveMetric({
    required this.label,
    required this.value,
    this.highlight = false,
  });

  @override
  Widget build(BuildContext context) {
    final color = highlight ? AppColors.primary : context.colors.textPrimary;

    return SizedBox(
      width: 118,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: AppTypography.caption.copyWith(
              color: context.colors.textSecondary,
            ),
          ),
          const SizedBox(height: AppSpacing.x1),
          Text(
            value,
            style: AppTypography.bodySmall.copyWith(
              color: color,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Shared sub-widgets
// ---------------------------------------------------------------------------
class _SectionTitle extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;

  const _SectionTitle({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: context.colors.bgMuted,
            shape: BoxShape.circle,
          ),
          child: Icon(icon, size: 18, color: AppColors.primary),
        ),
        const SizedBox(width: AppSpacing.x3),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: AppTypography.bodyLarge.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              if (subtitle != null)
                Text(
                  subtitle!,
                  style: AppTypography.caption.copyWith(
                    color: context.colors.textSecondary,
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _EmptyHint extends StatelessWidget {
  final String message;

  const _EmptyHint({required this.message});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      variant: AppCardVariant.flat,
      child: Text(
        message,
        style: AppTypography.bodySmall.copyWith(
          color: context.colors.textSecondary,
        ),
      ),
    );
  }
}

class _SectionLoading extends StatelessWidget {
  final String title;
  final String subtitle;

  const _SectionLoading({required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SectionTitle(
            icon: Icons.pending_rounded,
            title: title,
            subtitle: subtitle,
          ),
          const SizedBox(height: AppSpacing.x6),
          const Center(child: CircularProgressIndicator()),
        ],
      ),
    );
  }
}

class _SectionError extends StatelessWidget {
  final String title;
  final String message;

  const _SectionError({required this.title, required this.message});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SectionTitle(
            icon: Icons.error_outline_rounded,
            title: title,
            subtitle: null,
          ),
          const SizedBox(height: AppSpacing.x3),
          Text(
            message,
            style: AppTypography.bodySmall.copyWith(
              color: context.colors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

class _ErrorState extends ConsumerWidget {
  final Object error;

  const _ErrorState({required this.error});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.x10),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Erro ao carregar dashboard',
              style: AppTypography.h3,
            ),
            const SizedBox(height: AppSpacing.x2),
            Text(
              '$error',
              style: AppTypography.bodySmall.copyWith(
                color: context.colors.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.x4),
            AppPrimaryButton(
              onPressed: () =>
                  ref.read(clienteDashboardProvider.notifier).refresh(),
              label: 'Tentar novamente',
              icon: Icons.refresh_rounded,
            ),
          ],
        ),
      ),
    );
  }
}

class _CircularProgressPainter extends CustomPainter {
  final double value;
  final Color color;
  final Color trackColor;
  final double stroke;

  _CircularProgressPainter({
    required this.value,
    required this.color,
    required this.trackColor,
    this.stroke = 7,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - stroke) / 2;

    final track = Paint()
      ..color = trackColor
      ..strokeWidth = stroke
      ..style = PaintingStyle.stroke;
    canvas.drawCircle(center, radius, track);

    if (value <= 0) return;

    final arc = Paint()
      ..color = color
      ..strokeWidth = stroke
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    final sweep = (value.clamp(0.0, 1.0)) * 2 * math.pi;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2,
      sweep,
      false,
      arc,
    );
  }

  @override
  bool shouldRepaint(_CircularProgressPainter old) =>
      old.value != value ||
      old.color != color ||
      old.trackColor != trackColor ||
      old.stroke != stroke;
}
