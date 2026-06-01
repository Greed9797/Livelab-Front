import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../design_system/design_system.dart';
import '../../models/cliente.dart';
import '../../providers/clientes_provider.dart';
import '../../routes/app_routes.dart';
import '../../services/api_service.dart';
import '../../widgets/nota_timeline.dart';
import '../../widgets/skeleton_list.dart';
import '../../widgets/responsive_grid.dart';

// ── Métricas provider ─────────────────────────────────────────────────────────

class _ClientesMetricas {
  final double ltvTotal;
  final double faturamentoAcumulado;
  final int totalLives;
  final double comissaoPaga;

  const _ClientesMetricas({
    required this.ltvTotal,
    required this.faturamentoAcumulado,
    required this.totalLives,
    required this.comissaoPaga,
  });

  factory _ClientesMetricas.fromJson(Map<String, dynamic> j) =>
      _ClientesMetricas(
        ltvTotal: (j['ltv_total'] as num? ?? 0).toDouble(),
        faturamentoAcumulado:
            (j['faturamento_acumulado'] as num? ?? 0).toDouble(),
        totalLives: (j['total_lives'] as num? ?? 0).toInt(),
        comissaoPaga: (j['comissao_paga'] as num? ?? 0).toDouble(),
      );
}

final _clientesMetricasProvider =
    FutureProvider.autoDispose<_ClientesMetricas>((ref) async {
  final resp = await ApiService.get('/clientes/metricas');
  return _ClientesMetricas.fromJson(resp.data as Map<String, dynamic>);
});

class ClientesLeadsScreen extends ConsumerWidget {
  const ClientesLeadsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final clientesAsync = ref.watch(clientesProvider);

    return AppScreenScaffold(
      currentRoute: AppRoutes.clientes,
      eyebrow: 'Carteira convertida',
      titleSerif: true,
      title: 'Clientes',
      subtitle:
          'Apenas clientes convertidos: ativos, inadimplentes e cancelados.',
      actions: [
        IconButton(
          icon: const Icon(Icons.refresh),
          color: context.colors.textSecondary,
          onPressed: () => ref.read(clientesProvider.notifier).refresh(),
        ),
      ],
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.x6),
        child: clientesAsync.when(
          loading: () => const SkeletonList(itemCount: 6, itemHeight: 80),
          error: (error, _) => Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(ApiService.extractErrorMessage(error)),
                const SizedBox(height: AppSpacing.x3),
                AppSecondaryButton(
                  label: 'Tentar novamente',
                  onPressed: () =>
                      ref.read(clientesProvider.notifier).refresh(),
                ),
              ],
            ),
          ),
          data: (clientes) => _ClientesContent(clientes: clientes),
        ),
      ),
    );
  }
}

// ── Kanban phase definition ───────────────────────────────────────────────────

class _KanbanPhase {
  final String id;
  final String label;
  final Color color;
  final List<Cliente> clients;

  const _KanbanPhase({
    required this.id,
    required this.label,
    required this.color,
    required this.clients,
  });
}

List<_KanbanPhase> _buildPhases(List<Cliente> all) {
  return [
    _KanbanPhase(
      id: 'onboarding',
      label: 'Onboarding',
      color: AppColors.info,
      clients: all.where((c) => c.status == 'onboarding').toList(),
    ),
    _KanbanPhase(
      id: 'satisfeito',
      label: 'Ativo: Satisfeito',
      color: AppColors.success,
      clients: all
          .where((c) => c.status == 'ativo' && c.score >= 70)
          .toList(),
    ),
    _KanbanPhase(
      id: 'alerta',
      label: 'Ativo: Alerta',
      color: AppColors.warning,
      clients: all
          .where((c) => c.status == 'ativo' && c.score >= 30 && c.score < 70)
          .toList(),
    ),
    _KanbanPhase(
      id: 'churn',
      label: 'Risco de Churn',
      color: AppColors.danger,
      clients: all
          .where((c) => c.status == 'ativo' && c.score < 30)
          .toList(),
    ),
    _KanbanPhase(
      id: 'inativo',
      label: 'Inadimplente / Cancelado',
      color: AppColors.textMuted,
      clients: all
          .where((c) =>
              c.status == 'inadimplente' || c.status == 'cancelado')
          .toList(),
    ),
  ];
}

// ── Content widget ────────────────────────────────────────────────────────────

class _ClientesContent extends ConsumerStatefulWidget {
  final List<Cliente> clientes;

  const _ClientesContent({required this.clientes});

  @override
  ConsumerState<_ClientesContent> createState() => _ClientesContentState();
}

class _ClientesContentState extends ConsumerState<_ClientesContent> {
  String _searchQuery = '';
  final _searchCtrl = TextEditingController();

  static final _currencyFmt = NumberFormat.currency(
    locale: 'pt_BR',
    symbol: 'R\$',
    decimalDigits: 0,
  );

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  List<Cliente> get _allClientes => widget.clientes;

  List<Cliente> _applySearch(List<Cliente> source) {
    final q = _searchQuery.toLowerCase();
    if (q.isEmpty) return source;
    return source.where((c) {
      return c.nome.toLowerCase().contains(q) ||
          c.celular.toLowerCase().contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final ativos =
        _allClientes.where((c) => c.status == 'ativo').length;
    final inadimplentes =
        _allClientes.where((c) => c.status == 'inadimplente').length;
    final cancelados =
        _allClientes.where((c) => c.status == 'cancelado').length;

    final metricasAsync = ref.watch(_clientesMetricasProvider);

    // Build phases from the full list, then apply search to each
    final phases = _buildPhases(_allClientes).map((phase) {
      return _KanbanPhase(
        id: phase.id,
        label: phase.label,
        color: phase.color,
        clients: _applySearch(phase.clients),
      );
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── KPI cards (always full list) ──────────────────────────────
        ResponsiveGrid(
          mobileColumns: 1,
          tabletColumns: 3,
          desktopColumns: 3,
          spacing: AppSpacing.x3,
          runSpacing: AppSpacing.x3,
          children: [
            KpiAccentCard(
              label: 'Ativos',
              value: '$ativos',
              sub: 'com contrato em operação',
              accentTop: true,
              valueColor: AppColors.success,
            ),
            KpiAccentCard(
              label: 'Inadimplentes',
              value: '$inadimplentes',
              sub: 'continuam na carteira',
              valueColor: AppColors.danger,
            ),
            KpiAccentCard(
              label: 'Cancelados',
              value: '$cancelados',
              sub: 'histórico mantido',
              valueColor: context.colors.textSecondary,
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.x4),

        // ── Métricas LTV (dados de lives encerradas) ──────────────────
        metricasAsync.when(
          loading: () => ResponsiveGrid(
            mobileColumns: 1,
            tabletColumns: 4,
            desktopColumns: 4,
            spacing: AppSpacing.x3,
            runSpacing: AppSpacing.x3,
            children: List.generate(
              4,
              (_) => const KpiAccentCard(label: '—', value: '...'),
            ),
          ),
          error: (_, __) => const ResponsiveGrid(
            mobileColumns: 1,
            tabletColumns: 4,
            desktopColumns: 4,
            spacing: AppSpacing.x3,
            runSpacing: AppSpacing.x3,
            children: [
              KpiAccentCard(label: 'LTV Total', value: '–'),
              KpiAccentCard(label: 'Faturamento Acumulado', value: '–'),
              KpiAccentCard(label: 'Total de Lives', value: '–'),
              KpiAccentCard(label: 'Comissão Paga', value: '–'),
            ],
          ),
          data: (m) => ResponsiveGrid(
            mobileColumns: 1,
            tabletColumns: 4,
            desktopColumns: 4,
            spacing: AppSpacing.x3,
            runSpacing: AppSpacing.x3,
            children: [
              KpiAccentCard(
                label: 'LTV Total',
                value: _currencyFmt.format(m.ltvTotal),
                sub: 'soma de lives encerradas',
                valueColor: AppColors.primary,
              ),
              KpiAccentCard(
                label: 'Faturamento Acumulado',
                value: _currencyFmt.format(m.faturamentoAcumulado),
                sub: 'receita bruta gerada',
                valueColor: AppColors.primary,
              ),
              KpiAccentCard(
                label: 'Total de Lives',
                value: '${m.totalLives}',
                sub: 'lives encerradas',
                valueColor: AppColors.info,
              ),
              KpiAccentCard(
                label: 'Comissão Paga',
                value: _currencyFmt.format(m.comissaoPaga),
                sub: 'comissão calculada',
                valueColor: AppColors.warning,
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.x5),

        // ── Search field ──────────────────────────────────────────────
        AppTextField(
          controller: _searchCtrl,
          hint: 'Buscar por nome ou telefone',
          prefixIcon: Icons.search,
          onChanged: (v) => setState(() => _searchQuery = v),
        ),
        const SizedBox(height: AppSpacing.x4),

        // ── Kanban board ──────────────────────────────────────────────
        if (_allClientes.isEmpty)
          Expanded(
            child: Center(
              child: Text(
                'Nenhum cliente convertido encontrado.',
                style: AppTypography.bodyMedium
                    .copyWith(color: context.colors.textSecondary),
              ),
            ),
          )
        else
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: phases.map((phase) {
                  return Padding(
                    padding: const EdgeInsets.only(right: AppSpacing.x4),
                    child: _KanbanColumn(
                      phase: phase,
                      onMoverParaOnboarding: _moverParaOnboarding,
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
      ],
    );
  }

  Future<void> _moverParaOnboarding(Cliente cliente) async {
    try {
      // Status válidos em clientes_status_check: 'ativo' (não 'ganho', que é
      // crm_etapa de lead). Promover para onboarding = mover pro status 'ativo'.
      await ApiService.patch('/clientes/${cliente.id}',
          data: {'status': 'ativo'});
      ref.read(clientesProvider.notifier).refresh();
      ref.invalidate(_clientesMetricasProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Cliente promovido para Ativo! Onboarding iniciado.'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(ApiService.extractErrorMessage(e)),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    }
  }
}

// ── Kanban column ─────────────────────────────────────────────────────────────

class _KanbanColumn extends StatelessWidget {
  final _KanbanPhase phase;
  final Future<void> Function(Cliente) onMoverParaOnboarding;

  const _KanbanColumn({
    required this.phase,
    required this.onMoverParaOnboarding,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 280,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.x3,
              vertical: AppSpacing.x2,
            ),
            decoration: BoxDecoration(
              color: phase.color.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(AppRadius.md),
              border: Border.all(
                color: phase.color.withValues(alpha: 0.2),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    phase.label,
                    style: AppTypography.caption.copyWith(
                      fontWeight: FontWeight.w700,
                      color: phase.color,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.x2,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: phase.color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(AppRadius.full),
                  ),
                  child: Text(
                    '${phase.clients.length}',
                    style: AppTypography.caption.copyWith(
                      fontWeight: FontWeight.w700,
                      color: phase.color,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.x3),

          // Cards list (scrollable vertically within the column)
          Flexible(
            child: phase.clients.isEmpty
                ? Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(AppSpacing.x4),
                    decoration: BoxDecoration(
                      color: context.colors.bgMuted,
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      border: Border.all(
                        color: context.colors.borderSubtle,
                      ),
                    ),
                    child: Text(
                      'Nenhum cliente',
                      textAlign: TextAlign.center,
                      style: AppTypography.caption.copyWith(
                        color: context.colors.textMuted,
                      ),
                    ),
                  )
                : ListView.separated(
                    shrinkWrap: true,
                    physics: const AlwaysScrollableScrollPhysics(),
                    itemCount: phase.clients.length,
                    separatorBuilder: (_, __) =>
                        const SizedBox(height: AppSpacing.x3),
                    itemBuilder: (context, index) => _KanbanCard(
                      cliente: phase.clients[index],
                      onMoverParaOnboarding: onMoverParaOnboarding,
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

// ── Kanban card ───────────────────────────────────────────────────────────────

class _KanbanCard extends StatelessWidget {
  final Cliente cliente;
  final Future<void> Function(Cliente) onMoverParaOnboarding;

  const _KanbanCard({
    required this.cliente,
    required this.onMoverParaOnboarding,
  });

  static final _currencyFmt = NumberFormat.currency(
    locale: 'pt_BR',
    symbol: 'R\$',
    decimalDigits: 0,
  );

  bool get _podeIniciarOnboarding =>
      cliente.status == 'ativo' || cliente.status == 'inadimplente';

  @override
  Widget build(BuildContext context) {
    final hasFat = cliente.fatAnual > 0;

    final locationNicho = [
      if ((cliente.cidade ?? '').isNotEmpty)
        '${cliente.cidade}${cliente.estado != null ? '/${cliente.estado}' : ''}',
      if ((cliente.nicho ?? '').isNotEmpty) cliente.nicho!,
    ].join(' · ');

    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.x3),
      borderColor: context.colors.borderSubtle,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Name + status badge + menu
          Row(
            children: [
              Expanded(
                child: Text(
                  cliente.nome,
                  style: AppTypography.bodyMedium
                      .copyWith(fontWeight: FontWeight.w700),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: AppSpacing.x2),
              AppBadge(label: _statusLabel, type: _badgeType),
              const SizedBox(width: AppSpacing.x1),
              PopupMenuButton<String>(
                icon: Icon(
                  Icons.more_vert,
                  size: 16,
                  color: context.colors.textMuted,
                ),
                onSelected: (value) {
                  if (value == 'onboarding') {
                    onMoverParaOnboarding(cliente);
                  } else if (value == 'historico') {
                    showModalBottomSheet<void>(
                      context: context,
                      isScrollControlled: true,
                      builder: (_) => _HistoricoSheet(cliente: cliente),
                    );
                  }
                },
                itemBuilder: (_) => [
                  const PopupMenuItem(
                    value: 'historico',
                    child: Text('Histórico (notas)'),
                  ),
                  if (_podeIniciarOnboarding)
                    const PopupMenuItem(
                      value: 'onboarding',
                      child: Text('Mover para Onboarding'),
                    ),
                ],
              ),
            ],
          ),

          // City + nicho
          if (locationNicho.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.x1),
            Text(
              locationNicho,
              style: AppTypography.caption
                  .copyWith(color: context.colors.textSecondary),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],

          // Fat. anual
          if (hasFat) ...[
            const SizedBox(height: AppSpacing.x1),
            Text(
              'Fat. anual: ${_currencyFmt.format(cliente.fatAnual)}',
              style: AppTypography.caption.copyWith(
                color: context.colors.textMuted,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],

          const SizedBox(height: AppSpacing.x2),

          // Score chip
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.x2,
              vertical: 2,
            ),
            decoration: BoxDecoration(
              color: _scoreColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(AppRadius.full),
              border: Border.all(
                color: _scoreColor.withValues(alpha: 0.3),
              ),
            ),
            child: Text(
              'Score: ${cliente.score}',
              style: AppTypography.caption.copyWith(
                color: _scoreColor,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color get _scoreColor {
    if (cliente.score >= 70) return AppColors.success;
    if (cliente.score >= 30) return AppColors.warning;
    return AppColors.danger;
  }

  AppBadgeType get _badgeType => switch (cliente.status) {
        'ativo' => AppBadgeType.success,
        'inadimplente' => AppBadgeType.danger,
        _ => AppBadgeType.neutral,
      };

  String get _statusLabel => switch (cliente.status) {
        'ativo' => 'ATIVO',
        'inadimplente' => 'INADIMP.',
        'cancelado' => 'CANCELADO',
        'onboarding' => 'ONBOARDING',
        _ => cliente.status.toUpperCase(),
      };
}

class _HistoricoSheet extends StatelessWidget {
  final Cliente cliente;
  const _HistoricoSheet({required this.cliente});

  @override
  Widget build(BuildContext context) {
    final mq = MediaQuery.of(context);
    return Padding(
      padding: EdgeInsets.only(bottom: mq.viewInsets.bottom),
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: mq.size.height * 0.85),
        child: Container(
          decoration: BoxDecoration(
            color: context.colors.bgCard,
            borderRadius: const BorderRadius.vertical(
              top: Radius.circular(16),
            ),
          ),
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40, height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.borderLight,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(cliente.nome,
                  style: AppTypography.h2.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 16),
              Flexible(
                child: SingleChildScrollView(
                  child: NotaTimeline(clienteId: cliente.id),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
