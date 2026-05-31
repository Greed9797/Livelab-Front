import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../models/cabine.dart';
import '../../models/fila_ativacao_item.dart';
import '../lives/registrar_live_manual_dialog.dart';
import '../../models/franqueado_analytics_resumo.dart';
import '../../providers/cabines/cabine_detail_provider.dart';
import '../../providers/analytics_provider.dart';
import '../../providers/cabines_provider.dart';
import '../../providers/contratos_provider.dart';
import '../../providers/live_stream_provider.dart';
import '../../routes/app_routes.dart';
import '../../services/api_service.dart';
import '../../design_system/design_system.dart';
import '../../widgets/cabine_card.dart';
import '../../widgets/responsive_grid.dart';
import '../../widgets/reservar_cabine_modal.dart';
import '../../widgets/skeleton_list.dart';
import '../solicitacoes/solicitacoes_screen.dart';

class CabinesScreen extends ConsumerStatefulWidget {
  final int initialTab;

  const CabinesScreen({super.key, this.initialTab = 0});

  @override
  ConsumerState<CabinesScreen> createState() => _CabinesScreenState();
}

class _CabinesScreenState extends ConsumerState<CabinesScreen>
    with SingleTickerProviderStateMixin {
  static const _desktopBreakpoint = 950.0;

  static const _statusFilters = [
    'todos',
    'ao_vivo',
    'disponivel',
    'manutencao',
  ];

  final TextEditingController _searchController = TextEditingController();
  late final TabController _tabController;
  String _statusFilter = 'todos';
  String _searchQuery = '';
  String? _selectedCabineId;
  String? _selectedContratoId;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: 2,
      vsync: this,
      initialIndex: widget.initialTab.clamp(0, 1),
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _syncSelectedCabine(List<Cabine> cabines, {required bool isDesktop}) {
    if (!isDesktop || cabines.isEmpty) return;

    final hasCurrentSelection =
        cabines.any((cabine) => cabine.id == _selectedCabineId);
    if (hasCurrentSelection) return;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      setState(() => _selectedCabineId = cabines.first.id);
    });
  }

  List<Cabine> _applyFilters(List<Cabine> cabines) {
    return cabines.where((cabine) {
      if (_statusFilter != 'todos' && cabine.status != _statusFilter) {
        return false;
      }

      final query = _searchQuery.trim().toLowerCase();
      if (query.isEmpty) return true;

      final searchable = [
        cabine.numero.toString(),
        cabine.clienteNome ?? '',
        cabine.apresentadorNome ?? '',
        cabine.contratoId ?? '',
      ].join(' ').toLowerCase();

      return searchable.contains(query);
    }).toList();
  }

  Cabine? _findSelectedCabine(List<Cabine> cabines) {
    if (cabines.isEmpty) return null;

    for (final cabine in cabines) {
      if (cabine.id == _selectedCabineId) return cabine;
    }

    return cabines.first;
  }

  int _sumLiveAudienceFromSse(List<Cabine> cabines) {
    var total = 0;

    for (final cabine in cabines) {
      final liveId = cabine.liveAtualId;
      if (liveId == null) continue;

      final snapshot = ref.watch(liveStreamProvider(liveId));
      total += snapshot.valueOrNull?.viewerCount ?? 0;
    }

    return total;
  }

  FilaAtivacaoItem? _findSelectedContrato(List<FilaAtivacaoItem> fila) {
    if (fila.isEmpty) return null;

    for (final item in fila) {
      if (item.id == _selectedContratoId) return item;
    }

    return null;
  }

  Future<void> _openFilaAtivacaoSheet() async {
    final selected = await showModalBottomSheet<FilaAtivacaoItem>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: context.colors.bgCard,
      builder: (_) => const _FilaAtivacaoBottomSheet(),
    );

    if (selected == null || !mounted) return;
    setState(() => _selectedContratoId = selected.id);
  }

  Future<void> _reservarCabine(Cabine cabine, {required bool isDesktop}) async {
    if (_selectedContratoId == null) {
      await showReservarCabineModal(context: context, cabine: cabine);
      return;
    }

    try {
      await ref.read(cabinesProvider.notifier).reservarCabine(
            cabineId: cabine.id,
            contratoId: _selectedContratoId!,
          );

      if (!mounted) return;
      setState(() {
        _selectedContratoId = null;
        if (isDesktop) _selectedCabineId = cabine.id;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
              'Cabine ${cabine.numero.toString().padLeft(2, '0')} reservada com sucesso.'),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ApiService.extractErrorMessage(error))),
      );
    }
  }

  Future<void> _registrarLiveManual() async {
    await showDialog<bool>(
      context: context,
      builder: (_) => const RegistrarLiveManualDialog(),
    );
  }

  Future<void> _iniciarLive(Cabine cabine) async {
    try {
      await ref.read(cabinesProvider.notifier).iniciarLive(cabineId: cabine.id);

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(
                'Live iniciada na cabine ${cabine.numero.toString().padLeft(2, '0')}.')),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ApiService.extractErrorMessage(error))),
      );
    }
  }

  Future<void> _liberarCabine(Cabine cabine) async {
    try {
      await ref.read(cabinesProvider.notifier).liberarCabine(cabine.id);

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(
                'Cabine ${cabine.numero.toString().padLeft(2, '0')} liberada.')),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ApiService.extractErrorMessage(error))),
      );
    }
  }

  Future<void> _showTiktokDialog(Cabine cabine) async {
    if (cabine.contratoId == null) return;
    final ctrl = TextEditingController(text: cabine.tiktokUsername ?? '');
    bool saving = false;
    await showDialog<void>(
      context: context,
      builder: (_) => StatefulBuilder(
        builder: (ctx, setDlg) {
          return AlertDialog(
            title: Text(
                'TikTok — Cabine ${cabine.numero.toString().padLeft(2, '0')}'),
            content: TextField(
              controller: ctrl,
              autofocus: true,
              decoration: const InputDecoration(
                prefixText: '@',
                hintText: 'username',
                labelText: 'Username da marca no TikTok',
              ),
            ),
            actions: [
              AppSecondaryButton(
                label: 'Cancelar',
                onPressed: () => Navigator.pop(ctx),
              ),
              AppPrimaryButton(
                label: 'Salvar',
                isLoading: saving,
                onPressed: saving
                    ? null
                    : () async {
                        setDlg(() => saving = true);
                        final username = ctrl.text.trim().replaceAll('@', '');
                        try {
                          await ref
                              .read(contratosProvider.notifier)
                              .setTiktokUsername(cabine.contratoId!, username);
                          ref.invalidate(cabinesProvider);
                          if (ctx.mounted) Navigator.pop(ctx);
                        } catch (e) {
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                  content:
                                      Text(ApiService.extractErrorMessage(e))),
                            );
                          }
                          setDlg(() => saving = false);
                        }
                      },
              ),
            ],
          );
        },
      ),
    );
    ctrl.dispose();
  }

  void _handleCabineTap(Cabine cabine, {required bool isDesktop}) {
    if (isDesktop) {
      setState(() => _selectedCabineId = cabine.id);
      return;
    }

    Navigator.pushNamed(
      context,
      AppRoutes.cabineDetail,
      arguments: cabine,
    );
  }

  /// Duplo-clique (desktop) ou toque (mobile já navega via _handleCabineTap) →
  /// abre o detalhe da cabine direto.
  void _handleCabineDoubleTap(Cabine cabine) {
    Navigator.pushNamed(
      context,
      AppRoutes.cabineDetail,
      arguments: cabine,
    );
  }

  @override
  Widget build(BuildContext context) {
    final cabinesAsync = ref.watch(cabinesProvider);
    final filaAsync = ref.watch(filaAtivacaoProvider);

    final cabinesBody = LayoutBuilder(
      builder: (context, constraints) {
        final isDesktop = constraints.maxWidth >= _desktopBreakpoint;

        return cabinesAsync.when(
          loading: () => const Padding(
            padding: EdgeInsets.fromLTRB(
                AppSpacing.x6, AppSpacing.x3, AppSpacing.x6, AppSpacing.x4),
            child: SkeletonList(itemCount: 6, itemHeight: 140),
          ),
          error: (error, _) => Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                    'Erro ao carregar cabines: ${ApiService.extractErrorMessage(error)}'),
                const SizedBox(height: AppSpacing.x3),
                AppSecondaryButton(
                  onPressed: () => ref.read(cabinesProvider.notifier).refresh(),
                  label: 'Tentar novamente',
                ),
              ],
            ),
          ),
          data: (cabines) {
            _syncSelectedCabine(cabines, isDesktop: isDesktop);
            final filteredCabines = _applyFilters(cabines);
            final metrics = _CabinesMetrics.from(
              cabines,
              audienciaTotal: _sumLiveAudienceFromSse(cabines),
            );
            final selectedCabine = _findSelectedCabine(cabines);
            final fila = filaAsync.valueOrNull ?? const <FilaAtivacaoItem>[];
            final selectedContrato = _findSelectedContrato(fila);

            final mainArea = _MainOperationalArea(
              metrics: metrics,
              cabines: filteredCabines,
              statusFilter: _statusFilter,
              searchController: _searchController,
              selectedCabineId: _selectedCabineId,
              selectedContrato: selectedContrato,
              isDesktop: isDesktop,
              onOpenQueue: _openFilaAtivacaoSheet,
              onRefresh: () => ref.read(cabinesProvider.notifier).refresh(),
              onSearchChanged: (value) => setState(() => _searchQuery = value),
              onFilterChanged: (value) => setState(() => _statusFilter = value),
              onClearSelectedContrato: selectedContrato == null
                  ? null
                  : () => setState(() => _selectedContratoId = null),
              onCabineTap: (cabine) =>
                  _handleCabineTap(cabine, isDesktop: isDesktop),
              onCabineDoubleTap: _handleCabineDoubleTap,
              onReservar: (cabine) =>
                  _reservarCabine(cabine, isDesktop: isDesktop),
              onIniciarLive: _iniciarLive,
              onLiberar: _liberarCabine,
              onEditTiktokUsername: _showTiktokDialog,
            );

            if (!isDesktop) return mainArea;

            return Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(child: mainArea),
                const SizedBox(width: AppSpacing.x4),
                SizedBox(
                  width: 380,
                  child: _SidebarContent(
                    selectedCabine: selectedCabine,
                    selectedContrato: selectedContrato,
                    filaAsync: filaAsync,
                    onContratoSelected: (contrato) =>
                        setState(() => _selectedContratoId = contrato.id),
                    onClearContrato: selectedContrato == null
                        ? null
                        : () => setState(() => _selectedContratoId = null),
                    onOpenAnalyticalDetail: selectedCabine == null
                        ? null
                        : () => Navigator.pushNamed(
                              context,
                              AppRoutes.cabineDetail,
                              arguments: selectedCabine,
                            ),
                  ),
                ),
              ],
            );
          },
        );
      },
    );

    return AppScreenScaffold(
      currentRoute: AppRoutes.cabines,
      title: 'Painel de Cabines',
      eyebrow: 'Operação ao Vivo',
      titleSerif: true,
      subtitle:
          'Visão operacional da unidade: ao vivo, reservadas e rendimento.',
      actions: [
        AppPrimaryButton(
          label: 'Registrar Live',
          onPressed: _registrarLiveManual,
          icon: Icons.videocam_rounded,
        ),
      ],
      child: Column(
        children: [
          Material(
            color: context.colors.bgCard,
            child: TabBar(
              controller: _tabController,
              labelColor: AppColors.primary,
              unselectedLabelColor: context.colors.textSecondary,
              indicatorColor: AppColors.primary,
              tabs: const [
                Tab(text: 'Cabines'),
                Tab(text: 'Agendamentos'),
              ],
            ),
          ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                cabinesBody,
                const SolicitacoesScreen(embedded: true),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MainOperationalArea extends StatelessWidget {
  final _CabinesMetrics metrics;
  final List<Cabine> cabines;
  final String statusFilter;
  final TextEditingController searchController;
  final String? selectedCabineId;
  final FilaAtivacaoItem? selectedContrato;
  final bool isDesktop;
  final VoidCallback onOpenQueue;
  final VoidCallback onRefresh;
  final ValueChanged<String> onSearchChanged;
  final ValueChanged<String> onFilterChanged;
  final VoidCallback? onClearSelectedContrato;
  final ValueChanged<Cabine> onCabineTap;
  final ValueChanged<Cabine> onCabineDoubleTap;
  final ValueChanged<Cabine> onReservar;
  final ValueChanged<Cabine> onIniciarLive;
  final ValueChanged<Cabine> onLiberar;
  final ValueChanged<Cabine> onEditTiktokUsername;

  const _MainOperationalArea({
    required this.metrics,
    required this.cabines,
    required this.statusFilter,
    required this.searchController,
    required this.selectedCabineId,
    required this.selectedContrato,
    required this.isDesktop,
    required this.onOpenQueue,
    required this.onRefresh,
    required this.onSearchChanged,
    required this.onFilterChanged,
    required this.onClearSelectedContrato,
    required this.onCabineTap,
    required this.onCabineDoubleTap,
    required this.onReservar,
    required this.onIniciarLive,
    required this.onLiberar,
    required this.onEditTiktokUsername,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final crossAxisCount = width > 1400
            ? 5
            : width > 1100
                ? 4
                : width > 800
                    ? 3
                    : width > 500
                        ? 2
                        : 2;

        return _buildScrollView(context, crossAxisCount);
      },
    );
  }

  Widget _buildScrollView(BuildContext context, int crossAxisCount) {
    return CustomScrollView(
      slivers: [
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(
              AppSpacing.x6, AppSpacing.x6, AppSpacing.x6, 0),
          sliver: SliverToBoxAdapter(
            child: _HeaderSection(
              onOpenQueue: onOpenQueue,
              onRefresh: onRefresh,
              selectedContrato: selectedContrato,
            ),
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(
              AppSpacing.x6, AppSpacing.x4, AppSpacing.x6, 0),
          sliver: SliverToBoxAdapter(
            child: _KpiSection(metrics: metrics),
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(
              AppSpacing.x6, AppSpacing.x4, AppSpacing.x6, 0),
          sliver: SliverToBoxAdapter(
            child: _ToolbarSection(
              controller: searchController,
              currentFilter: statusFilter,
              metrics: metrics,
              onSearchChanged: onSearchChanged,
              onFilterChanged: onFilterChanged,
            ),
          ),
        ),
        if (!isDesktop && selectedContrato != null)
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(
                AppSpacing.x6, AppSpacing.x4, AppSpacing.x6, 0),
            sliver: SliverToBoxAdapter(
              child: _SelectedContractBanner(
                contrato: selectedContrato!,
                onClear: onClearSelectedContrato,
              ),
            ),
          ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(
              AppSpacing.x6, AppSpacing.x3, AppSpacing.x6, AppSpacing.x4),
          sliver: cabines.isEmpty
              ? const SliverFillRemaining(
                  hasScrollBody: false,
                  child: _CabinesEmptyState(),
                )
              : SliverGrid(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final cabine = cabines[index];
                      return _OperationalCard(
                        cabine: cabine,
                        isSelected: cabine.id == selectedCabineId,
                        isDesktop: isDesktop,
                        hasSelectedContrato: selectedContrato != null,
                        onTap: () => onCabineTap(cabine),
                        onDoubleTap: () => onCabineDoubleTap(cabine),
                        onReservar: cabine.status == 'disponivel'
                            ? () => onReservar(cabine)
                            : null,
                        onIniciarLive: (cabine.status == 'reservada' ||
                                cabine.status == 'ativa')
                            ? () => onIniciarLive(cabine)
                            : null,
                        onLiberar: (cabine.status == 'reservada' ||
                                cabine.status == 'ativa')
                            ? () => onLiberar(cabine)
                            : null,
                        onEditTiktokUsername: cabine.contratoId == null
                            ? null
                            : () => onEditTiktokUsername(cabine),
                      );
                    },
                    childCount: cabines.length,
                  ),
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: crossAxisCount,
                    crossAxisSpacing: AppSpacing.x3,
                    mainAxisSpacing: AppSpacing.x3,
                    // Altura fixa — CabineCard (inclui TikTok row + engajamento ao vivo)
                    // + SizedBox(8) + _OperationalActions (~50px) ≈ 290px.
                    mainAxisExtent: 295,
                  ),
                ),
        ),
      ],
    );
  }
}

class _HeaderSection extends StatelessWidget {
  final VoidCallback onOpenQueue;
  final VoidCallback onRefresh;
  final FilaAtivacaoItem? selectedContrato;

  const _HeaderSection({
    required this.onOpenQueue,
    required this.onRefresh,
    required this.selectedContrato,
  });

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: AppSpacing.x3,
      runSpacing: AppSpacing.x3,
      children: [
        selectedContrato == null
            ? AppSecondaryButton(
                label: 'Fila de Ativação',
                icon: Icons.playlist_add_check_circle_outlined,
                onPressed: onOpenQueue,
              )
            : AppPrimaryButton(
                label: 'Contrato selecionado',
                icon: Icons.playlist_add_check_circle_outlined,
                onPressed: onOpenQueue,
              ),
        IconButton(
          tooltip: 'Atualizar dados',
          onPressed: onRefresh,
          icon: const Icon(Icons.refresh),
        ),
      ],
    );
  }
}

class _KpiSection extends StatelessWidget {
  final _CabinesMetrics metrics;

  const _KpiSection({required this.metrics});

  @override
  Widget build(BuildContext context) {
    final hasLiveStream = metrics.livesComStream > 0;
    final liveLabel = metrics.livesComStream == 1 ? 'live' : 'lives';

    return Column(
      children: [
        // 4 KPIs operacionais
        ResponsiveGrid(
          mobileColumns: 2,
          tabletColumns: 4,
          desktopColumns: 4,
          spacing: AppSpacing.x3,
          runSpacing: AppSpacing.x3,
          children: [
            KpiAccentCard(
              label: 'Cabines mapeadas',
              value: metrics.total.toString(),
              sub: 'Total alocado na unidade',
              accentTop: true,
            ),
            KpiAccentCard(
              label: 'Ao vivo',
              value: metrics.aoVivo.toString(),
              sub: 'sessões em andamento',
              valueColor: AppColors.success,
            ),
            KpiAccentCard(
              label: 'Reservadas',
              value: metrics.reservadas.toString(),
              sub: 'aguardando ativação',
              valueColor: AppColors.warning,
            ),
            KpiAccentCard(
              label: 'Livres',
              value: metrics.disponiveis.toString(),
              sub: 'prontas para receber',
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.x3),
        // KPI operacional destacado
        ResponsiveGrid(
          mobileColumns: 1,
          tabletColumns: 1,
          desktopColumns: 1,
          spacing: AppSpacing.x3,
          runSpacing: AppSpacing.x3,
          children: [
            _FeaturedKpiCard(
              label: 'Audiência simultânea',
              value: '–',
              sub: hasLiveStream
                  ? 'integração TikTok pendente · ${metrics.livesComStream} $liveLabel ativa${metrics.livesComStream == 1 ? '' : 's'}'
                  : 'sem lives ativas no momento',
            ),
          ],
        ),
      ],
    );
  }
}

class _FeaturedKpiCard extends StatelessWidget {
  final String label;
  final String value;
  final String sub;

  const _FeaturedKpiCard({
    required this.label,
    required this.value,
    required this.sub,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.x5),
      decoration: BoxDecoration(
        color: context.colors.bgCard,
        border: Border.all(color: context.colors.borderSubtle),
        borderRadius: BorderRadius.circular(AppRadius.xl),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label.toUpperCase(),
            style: AppTypography.caption.copyWith(
              color: context.colors.textMuted,
              fontWeight: FontWeight.w500,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: AppSpacing.x2),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: AppTypography.h1.copyWith(
                fontSize: 32,
                fontWeight: FontWeight.w700,
                letterSpacing: -1,
                color: context.colors.textPrimary,
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.x1),
          Text(
            sub,
            style:
                AppTypography.caption.copyWith(color: context.colors.textMuted),
          ),
        ],
      ),
    );
  }
}

class _ToolbarSection extends StatelessWidget {
  final TextEditingController controller;
  final String currentFilter;
  final _CabinesMetrics metrics;
  final ValueChanged<String> onSearchChanged;
  final ValueChanged<String> onFilterChanged;

  const _ToolbarSection({
    required this.controller,
    required this.currentFilter,
    required this.metrics,
    required this.onSearchChanged,
    required this.onFilterChanged,
  });

  int _countFor(String status) => switch (status) {
        'ao_vivo' => metrics.aoVivo,
        'disponivel' => metrics.disponiveis,
        'manutencao' => metrics.manutencao,
        _ => metrics.total,
      };

  @override
  Widget build(BuildContext context) {
    return AppCard(
      shadow: const [],
      padding: const EdgeInsets.all(AppSpacing.x3),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppTextField(
            controller: controller,
            onChanged: onSearchChanged,
            hint:
                'Buscar por cliente, apresentador, contrato ou número da cabine',
            prefixIcon: Icons.search,
          ),
          const SizedBox(height: AppSpacing.x3),
          Wrap(
            spacing: AppSpacing.x2,
            runSpacing: AppSpacing.x2,
            children: _CabinesScreenState._statusFilters
                .map(
                  (filter) => _ChipWithCount(
                    label: _statusLabel(filter),
                    count: _countFor(filter),
                    active: currentFilter == filter,
                    onTap: () => onFilterChanged(filter),
                  ),
                )
                .toList(),
          ),
        ],
      ),
    );
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'ao_vivo':
        return 'Ao vivo';
      case 'disponivel':
        return 'Disponível';
      case 'manutencao':
        return 'Manutenção';
      default:
        return 'Todas';
    }
  }
}

class _ChipWithCount extends StatelessWidget {
  final String label;
  final int count;
  final bool active;
  final VoidCallback onTap;

  const _ChipWithCount({
    required this.label,
    required this.count,
    required this.active,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: active ? AppColors.primary : context.colors.bgCard,
      borderRadius: BorderRadius.circular(AppRadius.full),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.x3,
            vertical: AppSpacing.x2,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: AppTypography.caption.copyWith(
                  fontWeight: FontWeight.w600,
                  color: active
                      ? AppColors.textOnPrimary
                      : context.colors.textPrimary,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                '$count',
                style: AppTypography.caption.copyWith(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: active
                      ? AppColors.textOnPrimary.withValues(alpha: 0.75)
                      : context.colors.textMuted,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SelectedContractBanner extends StatelessWidget {
  final FilaAtivacaoItem contrato;
  final VoidCallback? onClear;

  const _SelectedContractBanner({required this.contrato, this.onClear});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.x3),
      decoration: BoxDecoration(
        color: context.colors.bgMuted,
        borderRadius: BorderRadius.circular(AppRadius.xl),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          const Icon(Icons.link_rounded, color: AppColors.primary),
          const SizedBox(width: AppSpacing.x3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Contrato selecionado para ativação',
                  style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: context.colors.textPrimary),
                ),
                const SizedBox(height: AppSpacing.x1),
                Text('${contrato.clienteNome} • ${contrato.localizacao}',
                    style: TextStyle(color: context.colors.textSecondary)),
              ],
            ),
          ),
          if (onClear != null)
            AppSecondaryButton(
              onPressed: onClear!,
              label: 'Limpar',
            ),
        ],
      ),
    );
  }
}

class _OperationalCard extends StatelessWidget {
  final Cabine cabine;
  final bool isSelected;
  final bool isDesktop;
  final bool hasSelectedContrato;
  final VoidCallback onTap;
  final VoidCallback? onDoubleTap;
  final VoidCallback? onReservar;
  final VoidCallback? onIniciarLive;
  final VoidCallback? onLiberar;
  final VoidCallback? onEditTiktokUsername;

  const _OperationalCard({
    required this.cabine,
    required this.isSelected,
    required this.isDesktop,
    required this.hasSelectedContrato,
    required this.onTap,
    this.onDoubleTap,
    this.onReservar,
    this.onIniciarLive,
    this.onLiberar,
    this.onEditTiktokUsername,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          child: CabineCard(
            cabine: cabine,
            onTap: onTap,
            onDoubleTap: onDoubleTap,
            isSelected: isSelected,
            isSelectable: hasSelectedContrato && cabine.status == 'disponivel',
            onEditTiktokUsername: onEditTiktokUsername,
          ),
        ),
        const SizedBox(height: AppSpacing.x2),
        _OperationalActions(
          cabine: cabine,
          onReservar: onReservar,
          onIniciarLive: onIniciarLive,
          onLiberar: onLiberar,
        ),
      ],
    );
  }
}

class _OperationalActions extends StatelessWidget {
  final Cabine cabine;
  final VoidCallback? onReservar;
  final VoidCallback? onIniciarLive;
  final VoidCallback? onLiberar;

  const _OperationalActions({
    required this.cabine,
    this.onReservar,
    this.onIniciarLive,
    this.onLiberar,
  });

  @override
  Widget build(BuildContext context) {
    if (cabine.status == 'ao_vivo') {
      return const SizedBox.shrink();
    }

    if (cabine.status == 'reservada' || cabine.status == 'ativa') {
      return LayoutBuilder(
        builder: (context, constraints) {
          final isNarrow = constraints.maxWidth < 200;
          return Row(
            children: [
              Expanded(
                child: AppPrimaryButton(
                  label: isNarrow ? 'INICIAR' : 'INICIAR LIVE',
                  icon: Icons.play_arrow_rounded,
                  onPressed: onIniciarLive ?? () {},
                ),
              ),
              const SizedBox(width: AppSpacing.x2),
              AppSecondaryButton(
                onPressed: onLiberar ?? () {},
                label: 'Liberar',
              ),
            ],
          );
        },
      );
    }

    if (cabine.status == 'disponivel') {
      return AppGhostButton(
        label: 'VINCULAR',
        icon: Icons.link_rounded,
        onPressed: onReservar ?? () {},
      );
    }

    return AppSecondaryButton(
      label: 'MANUTENÇÃO',
      icon: Icons.build_circle_outlined,
      onPressed: null, // Feature pending
    );
  }
}

class _SidebarContent extends ConsumerWidget {
  final Cabine? selectedCabine;
  final FilaAtivacaoItem? selectedContrato;
  final AsyncValue<List<FilaAtivacaoItem>> filaAsync;
  final ValueChanged<FilaAtivacaoItem> onContratoSelected;
  final VoidCallback? onClearContrato;
  final VoidCallback? onOpenAnalyticalDetail;

  const _SidebarContent({
    required this.selectedCabine,
    required this.selectedContrato,
    required this.filaAsync,
    required this.onContratoSelected,
    this.onClearContrato,
    this.onOpenAnalyticalDetail,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cabine = selectedCabine;
    final detailAsync = cabine == null
        ? AsyncValue<CabineDetailState>.data(CabineDetailState())
        : ref.watch(cabineDetailProvider(cabine.id));

    return AppCard(
      borderColor: context.colors.borderSubtle,
      padding: const EdgeInsets.all(AppSpacing.x5),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Trilho Operacional',
            style: AppTypography.h3.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: AppSpacing.x1),
          Text(
            'Da fila de ativação ao raio-X da cabine, sem sair do painel.',
            style: TextStyle(color: context.colors.textSecondary),
          ),
          const SizedBox(height: AppSpacing.x5),
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _SelectedCabinePanel(
                    cabine: cabine,
                    detailAsync: detailAsync,
                    filaAsync: filaAsync,
                    onOpenAnalyticalDetail: onOpenAnalyticalDetail,
                  ),
                  const SizedBox(height: AppSpacing.x4),
                  _QueuePanel(
                    filaAsync: filaAsync,
                    selectedContrato: selectedContrato,
                    onContratoSelected: onContratoSelected,
                    onClearContrato: onClearContrato,
                  ),
                  const SizedBox(height: AppSpacing.x4),
                  _MiniAnalyticsPanel(detailAsync: detailAsync),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SelectedCabinePanel extends ConsumerStatefulWidget {
  final Cabine? cabine;
  final AsyncValue<CabineDetailState> detailAsync;
  final AsyncValue<List<FilaAtivacaoItem>> filaAsync;
  final VoidCallback? onOpenAnalyticalDetail;

  const _SelectedCabinePanel({
    required this.cabine,
    required this.detailAsync,
    required this.filaAsync,
    this.onOpenAnalyticalDetail,
  });

  @override
  ConsumerState<_SelectedCabinePanel> createState() =>
      _SelectedCabinePanelState();
}

class _SelectedCabinePanelState extends ConsumerState<_SelectedCabinePanel> {

  Future<void> _addApresentador(BuildContext context, WidgetRef ref, Cabine cabine) async {
    final liveId = cabine.liveAtualId;
    if (liveId == null) return;

    final ctrl = TextEditingController();
    bool saving = false;

    await showDialog<void>(
      context: context,
      builder: (_) => StatefulBuilder(
        builder: (ctx, setDlg) => AlertDialog(
          title: const Text('Adicionar Apresentador'),
          content: TextField(
            controller: ctrl,
            autofocus: true,
            decoration: const InputDecoration(
              hintText: 'UUID do apresentador',
              labelText: 'ID do apresentador',
            ),
          ),
          actions: [
            AppSecondaryButton(
              label: 'Cancelar',
              onPressed: () => Navigator.pop(ctx),
            ),
            AppPrimaryButton(
              label: 'Adicionar',
              isLoading: saving,
              onPressed: saving
                  ? null
                  : () async {
                      final id = ctrl.text.trim();
                      if (id.isEmpty) return;
                      setDlg(() => saving = true);
                      try {
                        await ApiService.post(
                          '/lives/$liveId/apresentadores',
                          data: {'apresentador_id': id},
                        );
                        ref.invalidate(cabinesProvider);
                        if (ctx.mounted) Navigator.pop(ctx);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                                content: Text('Apresentador adicionado')),
                          );
                        }
                      } catch (e) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                                content: Text(
                                    ApiService.extractErrorMessage(e))),
                          );
                        }
                        setDlg(() => saving = false);
                      }
                    },
            ),
          ],
        ),
      ),
    );
    ctrl.dispose();
  }

  String _buildApresentadoresLabel(Cabine cabine) {
    final primary = cabine.apresentadorNome;
    final extras = cabine.apresentadoresExtra;
    final all = [
      if (primary != null && primary.isNotEmpty) primary,
      ...extras,
    ];
    return all.isEmpty ? 'A definir' : all.join(' · ');
  }

  @override
  Widget build(BuildContext context) {
    // SSE do live_snapshots — dados em tempo real (flush a cada 10s no backend)
    final live = widget.detailAsync.valueOrNull?.liveAtual;
    final sse = live != null
        ? ref.watch(liveStreamProvider(live.liveId)).valueOrNull
        : null;

    // Alias for convenience inside build
    final cabine = widget.cabine;
    final detailAsync = widget.detailAsync;
    final filaAsync = widget.filaAsync;

    // Fallback: quando /live-atual falhar, usar dados do card da cabine (já
    // vindos do /cabines com engajamento completo). Garante que sidebar
    // sempre mostra números quando cabine está AO VIVO no grid.
    final isAoVivo = cabine?.status == 'ao_vivo';

    final viewers = sse?.viewerCount ??
        live?.viewerCount ??
        (isAoVivo ? cabine?.viewerCount : null) ??
        0;
    final gmv = sse?.gmv ??
        live?.gmvAtual ??
        (isAoVivo ? cabine?.gmvAtual : null) ??
        0.0;
    final likes = sse?.likesCount ??
        live?.likesCount ??
        (isAoVivo ? cabine?.likesCount : null) ??
        0;
    final comments = sse?.commentsCount ??
        live?.commentsCount ??
        (isAoVivo ? cabine?.commentsCount : null) ??
        0;
    final shares = sse?.sharesCount ??
        live?.sharesCount ??
        (isAoVivo ? cabine?.sharesCount : null) ??
        0;
    final gifts = sse?.giftsDiamonds ??
        live?.giftsDiamonds ??
        (isAoVivo ? cabine?.giftsDiamonds : null) ??
        0;
    final orders = sse?.totalOrders ??
        live?.totalOrders ??
        (isAoVivo ? cabine?.totalOrders : null) ??
        0;

    return _SidebarCard(
      title: 'Cabine Selecionada',
      child: cabine == null
          ? const Text(
              'Selecione uma cabine no grid para inspecionar a operação desta unidade.')
          : Center(
              child: ConstrainedBox(
                constraints:
                    const BoxConstraints(maxWidth: AppBreakpoints.desktop),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Cabine ${cabine.numero.toString().padLeft(2, '0')}',
                            style: AppTypography.h3
                                .copyWith(fontWeight: FontWeight.w700),
                          ),
                        ),
                        AppBadge.status(cabine.status),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.x3),
                    // ── Primary info (always visible, full weight) ──────────
                    _InfoLine(
                        label: 'Cliente',
                        value: cabine.clienteNome ?? 'Sem vínculo ativo'),
                    if (cabine.status == 'ao_vivo' &&
                        cabine.iniciadoEm != null) ...[
                      _InfoLine(
                        label: 'Tempo no ar',
                        value: _formatDuracao(
                            DateTime.now().difference(cabine.iniciadoEm!)),
                      ),
                      _TempoRestanteLine(cabine: cabine),
                    ],
                    if (cabine.status == 'ao_vivo') ...[
                      Builder(
                        builder: (context) {
                          final fila = filaAsync.valueOrNull;
                          if (fila == null || fila.isEmpty) {
                            return const _InfoLine(
                                label: 'Próximo na fila', value: '—');
                          }
                          final proximo = fila.first;
                          return _InfoLine(
                            label: 'Próximo na fila',
                            value: proximo.clienteNome,
                          );
                        },
                      ),
                    ],
                    const SizedBox(height: 12),
                    detailAsync.when(
                      loading: () => const Padding(
                        padding: EdgeInsets.symmetric(vertical: 12),
                        child: LinearProgressIndicator(minHeight: 3),
                      ),
                      error: (_, __) => const Text(
                          'Não foi possível carregar os indicadores detalhados desta cabine.'),
                      data: (detail) {
                        // Mostra dados ao vivo sempre que a cabine está ao_vivo no grid
                        // (mesmo que /live-atual tenha falhado — fallback usa dados do card)
                        if (detail.liveAtual == null && !isAoVivo) {
                          // ── Secondary info when not live ──────────────────
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _SecondaryInfoLine(
                                label: 'Apresentadores',
                                value: _buildApresentadoresLabel(cabine),
                              ),
                              if (cabine.tiktokUsername != null &&
                                  cabine.tiktokUsername!.isNotEmpty)
                                _SecondaryInfoLine(
                                  label: 'TikTok da marca',
                                  value: '@${cabine.tiktokUsername}',
                                ),
                              _SecondaryInfoLine(
                                label: 'Contrato',
                                value: cabine.contratoId?.substring(0, 8) ??
                                    'Sem contrato',
                              ),
                              _SecondaryInfoLine(
                                label: 'Horas contrat.',
                                value: cabine.horasContratadas > 0
                                    ? '${cabine.horasContratadas.toStringAsFixed(1)}h'
                                    : '–',
                              ),
                            ],
                          );
                        }
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _InfoLine(
                              label: 'GMV atual',
                              value: 'R\$ ${gmv.toStringAsFixed(2)}',
                            ),
                            _InfoLine(
                              label: 'Audiência',
                              value: '–',
                            ),
                            _InfoLine(
                              label: 'Pedidos',
                              value: '$orders',
                            ),
                            const SizedBox(height: AppSpacing.x2),
                            // Engajamento ao vivo — atualiza via SSE
                            Wrap(
                              spacing: AppSpacing.x3,
                              runSpacing: AppSpacing.x2,
                              children: [
                                _EngajamentoChip(
                                  icon: Icons.favorite,
                                  color: AppColors.danger,
                                  value: likes,
                                  label: 'curtidas',
                                ),
                                _EngajamentoChip(
                                  icon: Icons.chat_bubble_outline,
                                  color: AppColors.info,
                                  value: comments,
                                  label: 'comentários',
                                ),
                                _EngajamentoChip(
                                  icon: Icons.share,
                                  color: AppColors.primary,
                                  value: shares,
                                  label: 'shares',
                                ),
                                _EngajamentoChip(
                                  icon: Icons.card_giftcard,
                                  color: AppColors.warning,
                                  value: gifts,
                                  label: '💎',
                                ),
                              ],
                            ),
                            const SizedBox(height: AppSpacing.x3),
                            // ── Secondary info (smaller, muted) ──────────
                            _SecondaryInfoLine(
                              label: 'Apresentadores',
                              value: _buildApresentadoresLabel(cabine),
                            ),
                            if (cabine.status == 'ao_vivo')
                              Padding(
                                padding: const EdgeInsets.only(
                                    bottom: AppSpacing.x1),
                                child: AppGhostButton(
                                  label: '+ Apresentador',
                                  onPressed: () => _addApresentador(
                                      context, ref, cabine),
                                  icon: Icons.person_add_outlined,
                                ),
                              ),
                            if (cabine.tiktokUsername != null &&
                                cabine.tiktokUsername!.isNotEmpty)
                              _SecondaryInfoLine(
                                label: 'TikTok da marca',
                                value: '@${cabine.tiktokUsername}',
                              ),
                            _SecondaryInfoLine(
                              label: 'Contrato',
                              value: cabine.contratoId?.substring(0, 8) ??
                                  'Sem contrato',
                            ),
                            _SecondaryInfoLine(
                              label: 'Horas contrat.',
                              value: cabine.horasContratadas > 0
                                  ? '${cabine.horasContratadas.toStringAsFixed(1)}h'
                                  : '–',
                            ),
                          ],
                        );
                      },
                    ),
                    const SizedBox(height: AppSpacing.x3),
                    if (cabine.status == 'ao_vivo') ...[
                      AppSecondaryButton(
                        label: 'Ver Analytics Completo',
                        icon: Icons.analytics_outlined,
                        fullWidth: true,
                        onPressed: () => Navigator.of(context)
                            .pushNamed(AppRoutes.analyticsDashboard),
                      ),
                      const SizedBox(height: AppSpacing.x2),
                    ],
                    AppSecondaryButton(
                      label: 'Ver Analítico',
                      icon: Icons.analytics_outlined,
                      onPressed: widget.onOpenAnalyticalDetail ?? () {},
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}

class _QueuePanel extends StatelessWidget {
  final AsyncValue<List<FilaAtivacaoItem>> filaAsync;
  final FilaAtivacaoItem? selectedContrato;
  final ValueChanged<FilaAtivacaoItem> onContratoSelected;
  final VoidCallback? onClearContrato;

  const _QueuePanel({
    required this.filaAsync,
    required this.selectedContrato,
    required this.onContratoSelected,
    this.onClearContrato,
  });

  @override
  Widget build(BuildContext context) {
    return _SidebarCard(
      title: 'Fila de Ativação',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (selectedContrato != null) ...[
            _SelectedContractBanner(
                contrato: selectedContrato!, onClear: onClearContrato),
            const SizedBox(height: AppSpacing.x3),
          ],
          filaAsync.when(
            loading: () => const Center(
                child: Padding(
              padding: EdgeInsets.symmetric(vertical: AppSpacing.x4),
              child: CircularProgressIndicator(),
            )),
            error: (error, _) => Text(ApiService.extractErrorMessage(error)),
            data: (fila) {
              if (fila.isEmpty) {
                return const Text(
                    'Nenhum contrato ativo aguardando cabine no momento.');
              }

              return Column(
                children: fila.take(4).map((item) {
                  final isSelected = selectedContrato?.id == item.id;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.x3),
                    child: InkWell(
                      onTap: () => onContratoSelected(item),
                      borderRadius: BorderRadius.circular(AppRadius.lg),
                      child: Container(
                        padding: const EdgeInsets.all(AppSpacing.x3),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          color: isSelected
                              ? context.colors.bgMuted
                              : context.colors.bgPage,
                          border: Border.all(
                            color: isSelected
                                ? AppColors.primary.withValues(alpha: 0.35)
                                : context.colors.borderSubtle,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(item.clienteNome,
                                style: TextStyle(
                                    fontWeight: FontWeight.w700,
                                    color: context.colors.textPrimary)),
                            const SizedBox(height: AppSpacing.x1),
                            Text(item.localizacao,
                                style: TextStyle(
                                    color: context.colors.textSecondary)),
                            const SizedBox(height: AppSpacing.x2),
                            Text(
                              'Contrato ${item.id.substring(0, 8)} • Fixo R\$ ${item.valorFixo.toStringAsFixed(2)}',
                              style: AppTypography.caption.copyWith(
                                  color: context.colors.textSecondary),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _MiniAnalyticsPanel extends ConsumerWidget {
  final AsyncValue<CabineDetailState> detailAsync;

  const _MiniAnalyticsPanel({required this.detailAsync});

  static final NumberFormat _currency =
      NumberFormat.simpleCurrency(locale: 'pt_BR');

  String _formatHourBucket(int hora) {
    final end = (hora + 1) % 24;
    return '${hora.toString().padLeft(2, '0')}h-${end.toString().padLeft(2, '0')}h';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final analyticsAsync = ref.watch(franqueadoAnalyticsResumoProvider);
    final cabinesAsync = ref.watch(cabinesProvider);

    // Compute horas planejadas/realizadas from the cabines list
    final cabines = cabinesAsync.valueOrNull ?? const <Cabine>[];
    final horasPlanejadas = cabines
        .where((c) =>
            c.status == 'ao_vivo' ||
            c.status == 'reservada' ||
            c.status == 'ativa')
        .fold<double>(0.0, (sum, c) => sum + c.horasContratadas);
    // Horas realizadas = encerradas hoje (from backend) + in-progress ao_vivo
    final now = DateTime.now();
    final horasRealizadas = cabines.fold<double>(0.0, (sum, c) {
      double h = c.horasRealizadasHoje;
      if (c.status == 'ao_vivo' && c.iniciadoEm != null) {
        h += now.difference(c.iniciadoEm!).inMinutes / 60.0;
      }
      return sum + h;
    });

    return _SidebarCard(
      title: 'Mini Analytics',
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 220),
        child: analyticsAsync.when(
          loading: () => const Padding(
            key: ValueKey('analytics-loading'),
            padding: EdgeInsets.symmetric(vertical: AppSpacing.x4),
            child: Center(child: CircularProgressIndicator()),
          ),
          error: (error, _) => Text(
            ApiService.extractErrorMessage(error),
            key: const ValueKey('analytics-error'),
          ),
          data: (analytics) {
            final historico = detailAsync.valueOrNull?.historico;
            final cabineTopClientes =
                historico?.topClientes.take(3).toList() ?? const [];
            final cabineMelhoresHorarios =
                historico?.melhoresHorarios.take(3).toList() ?? const [];
            final heatmapTop = [...analytics.heatmapHorarios]
              ..sort((a, b) => b.gmvTotal.compareTo(a.gmvTotal));

            return Column(
              key: const ValueKey('analytics-data'),
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _AnalyticsSummaryRow(
                  resumo: analytics.resumoHoje,
                  horasPlanejadas: horasPlanejadas,
                  horasRealizadas: horasRealizadas,
                ),
                const SizedBox(height: AppSpacing.x4),
                Text('Top Closers da unidade',
                    style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: context.colors.textPrimary)),
                const SizedBox(height: AppSpacing.x2),
                if (analytics.rankingClosers.isEmpty)
                  Text('Nenhum closer com histórico suficiente ainda.',
                      style: TextStyle(color: context.colors.textSecondary))
                else
                  ...analytics.rankingClosers
                      .take(3)
                      .toList()
                      .asMap()
                      .entries
                      .map(
                        (entry) => Padding(
                          padding: const EdgeInsets.only(bottom: AppSpacing.x2),
                          child: _RankedMetricRow(
                            rank: entry.key,
                            title: entry.value.apresentadorNome,
                            subtitle:
                                '${entry.value.totalLives} lives fechadas',
                            value: _currency.format(entry.value.gmvTotal),
                          ),
                        ),
                      ),
                const SizedBox(height: AppSpacing.x4),
                Text('Top Parceiros por volume',
                    style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: context.colors.textPrimary)),
                const SizedBox(height: AppSpacing.x2),
                if (analytics.rankingClientes.isEmpty)
                  Text('Nenhum parceiro com volume relevante ainda.',
                      style: TextStyle(color: context.colors.textSecondary))
                else
                  ...analytics.rankingClientes.take(3).map(
                        (cliente) => Padding(
                          padding: const EdgeInsets.only(bottom: AppSpacing.x2),
                          child: _MetricRankRow(
                            title: cliente.clienteNome,
                            value: _currency.format(cliente.gmvTotal),
                          ),
                        ),
                      ),
                const SizedBox(height: AppSpacing.x4),
                Text('Prime time da franquia',
                    style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: context.colors.textPrimary)),
                const SizedBox(height: AppSpacing.x2),
                if (analytics.heatmapHorarios.isEmpty)
                  Text(
                      'Ainda não há dados suficientes para mapear o melhor horário da unidade.',
                      style: TextStyle(color: context.colors.textSecondary))
                else
                  ...heatmapTop.take(3).map(
                        (horario) => Padding(
                          padding: const EdgeInsets.only(bottom: AppSpacing.x2),
                          child: _MetricRankRow(
                            title: _formatHourBucket(horario.hora),
                            value: _currency.format(horario.gmvTotal),
                          ),
                        ),
                      ),
                const SizedBox(height: AppSpacing.x4),
                Text('Raio-X da cabine selecionada',
                    style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: context.colors.textPrimary)),
                const SizedBox(height: AppSpacing.x2),
                if (historico == null)
                  Text(
                      'Selecione uma cabine no grid para ver os clientes e horários fortes desta unidade.',
                      style: TextStyle(color: context.colors.textSecondary))
                else ...[
                  if (cabineTopClientes.isEmpty)
                    Text('Sem histórico de clientes para esta cabine ainda.',
                        style: TextStyle(color: context.colors.textSecondary))
                  else
                    ...cabineTopClientes.map(
                      (cliente) => Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.x2),
                        child: _MetricRankRow(
                          title: cliente['nome'] as String,
                          value: _currency
                              .format((cliente['fat_total'] as num).toDouble()),
                        ),
                      ),
                    ),
                  const SizedBox(height: AppSpacing.x3),
                  if (cabineMelhoresHorarios.isEmpty)
                    const Text(
                        'Ainda não há amostra suficiente para sugerir janelas ideais desta cabine.')
                  else
                    ...cabineMelhoresHorarios.map(
                      (horario) => Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.x2),
                        child: _MetricRankRow(
                          title: horario['hora'] as String,
                          value:
                              'GMV médio ${_currency.format((horario['gmv_medio'] as num).toDouble())}',
                        ),
                      ),
                    ),
                ],
              ],
            );
          },
        ),
      ),
    );
  }
}

class _SidebarCard extends StatelessWidget {
  final String title;
  final Widget child;

  const _SidebarCard({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.x3),
      decoration: BoxDecoration(
        color: context.colors.bgPage,
        borderRadius: BorderRadius.circular(AppRadius.xl),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: AppTypography.bodyLarge
                  .copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.x3),
          child,
        ],
      ),
    );
  }
}

class _InfoLine extends StatelessWidget {
  final String label;
  final String value;

  const _InfoLine({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.x2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 94,
            child: Text(
              '$label:',
              style: TextStyle(color: context.colors.textSecondary),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: context.colors.textPrimary),
            ),
          ),
        ],
      ),
    );
  }
}

class _SecondaryInfoLine extends StatelessWidget {
  final String label;
  final String value;

  const _SecondaryInfoLine({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.x1),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 94,
            child: Text(
              '$label:',
              style: AppTypography.bodySmall.copyWith(
                color: context.colors.textMuted,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: AppTypography.bodySmall.copyWith(
                color: context.colors.textSecondary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TempoRestanteLine extends StatelessWidget {
  final Cabine cabine;

  const _TempoRestanteLine({required this.cabine});

  @override
  Widget build(BuildContext context) {
    // If horas_contratadas not available from backend yet, show –
    if (cabine.horasContratadas <= 0 || cabine.iniciadoEm == null) {
      return const _InfoLine(label: 'Tempo restante', value: '–');
    }

    final totalMin = (cabine.horasContratadas * 60).round();
    final decorrido = DateTime.now().difference(cabine.iniciadoEm!).inMinutes;
    final restante = totalMin - decorrido;

    if (restante <= 0) {
      return Padding(
        padding: const EdgeInsets.only(bottom: AppSpacing.x2),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 94,
              child: Text(
                'Encerramento:',
                style: TextStyle(color: context.colors.textSecondary),
              ),
            ),
            Expanded(
              child: Text(
                'Previsto',
                style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: AppColors.danger),
              ),
            ),
          ],
        ),
      );
    }

    final h = restante ~/ 60;
    final m = restante.remainder(60);
    final label = h > 0 ? '${h}h${m.toString().padLeft(2, '0')}m' : '${m}min';
    return _InfoLine(label: 'Tempo restante', value: label);
  }
}

class _MetricRankRow extends StatelessWidget {
  final String title;
  final String value;

  const _MetricRankRow({required this.title, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
                fontWeight: FontWeight.w600, color: context.colors.textPrimary),
          ),
        ),
        const SizedBox(width: AppSpacing.x2),
        Flexible(
            child: Text(value,
                style: TextStyle(color: context.colors.textSecondary),
                maxLines: 1,
                overflow: TextOverflow.ellipsis)),
      ],
    );
  }
}

class _RankedMetricRow extends StatelessWidget {
  final int rank;
  final String title;
  final String subtitle;
  final String value;

  const _RankedMetricRow({
    required this.rank,
    required this.title,
    required this.subtitle,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    final rankLabel = switch (rank) {
      0 => 'Ouro',
      1 => 'Prata',
      _ => 'Bronze',
    };

    final rankColor = switch (rank) {
      0 => AppColors.medalGold,
      1 => AppColors.medalSilver,
      _ => AppColors.medalBronze,
    };

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.x2, vertical: AppSpacing.x1),
          decoration: BoxDecoration(
            color: rankColor.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(AppRadius.full),
          ),
          child: Text(
            rankLabel,
            style: AppTypography.caption
                .copyWith(color: rankColor, fontWeight: FontWeight.w700),
          ),
        ),
        const SizedBox(width: AppSpacing.x3),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title,
                  style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: context.colors.textPrimary)),
              const SizedBox(height: AppSpacing.x1),
              Text(subtitle,
                  style: AppTypography.caption
                      .copyWith(color: context.colors.textSecondary)),
            ],
          ),
        ),
        const SizedBox(width: AppSpacing.x2),
        Text(value, style: TextStyle(color: context.colors.textSecondary)),
      ],
    );
  }
}

class _AnalyticsSummaryRow extends StatelessWidget {
  final ResumoHojeAnalytics resumo;
  final double horasPlanejadas;
  final double horasRealizadas;

  const _AnalyticsSummaryRow({
    required this.resumo,
    required this.horasPlanejadas,
    required this.horasRealizadas,
  });

  String _formatHoras(double h) {
    if (h <= 0) return '–';
    final hInt = h.floor();
    final min = ((h - hInt) * 60).round();
    return min > 0 ? '${hInt}h${min.toString().padLeft(2, '0')}m' : '${hInt}h';
  }

  @override
  Widget build(BuildContext context) {
    final cards = [
      ('Lives hoje', '${resumo.totalLivesHoje}', AppColors.info),
      ('Hs planejadas', _formatHoras(horasPlanejadas), AppColors.primary),
      ('Hs realizadas', _formatHoras(horasRealizadas), AppColors.success),
    ];

    return Wrap(
      spacing: AppSpacing.x2,
      runSpacing: AppSpacing.x2,
      children: cards
          .map(
            (item) => SizedBox(
              width: 95,
              child: AppCard(
                shadow: const [],
                borderColor: context.colors.borderSubtle,
                padding: const EdgeInsets.all(AppSpacing.x3),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(item.$1,
                        style: AppTypography.caption
                            .copyWith(color: context.colors.textSecondary)),
                    const SizedBox(height: AppSpacing.x1),
                    Text(
                      item.$2,
                      style: TextStyle(
                          fontWeight: FontWeight.w700, color: item.$3),
                    ),
                  ],
                ),
              ),
            ),
          )
          .toList(),
    );
  }
}

class _CabinesEmptyState extends StatelessWidget {
  const _CabinesEmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: AppCard(
          padding: const EdgeInsets.all(AppSpacing.x6),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.video_camera_front_outlined,
                  size: 42, color: context.colors.textMuted),
              const SizedBox(height: AppSpacing.x3),
              Text(
                'Ainda não existem cabines para essa unidade.',
                style: AppTypography.bodyLarge
                    .copyWith(fontWeight: FontWeight.w600),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.x6),
              AppSecondaryButton(
                label: 'Abrir chamada',
                onPressed: null, // Feature pending
                icon: Icons.support_agent_rounded,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FilaAtivacaoBottomSheet extends ConsumerWidget {
  const _FilaAtivacaoBottomSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filaAsync = ref.watch(filaAtivacaoProvider);

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
            AppSpacing.x5, AppSpacing.x2, AppSpacing.x5, AppSpacing.x5),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Fila de Ativação',
              style: AppTypography.h2
                  .copyWith(fontSize: 20, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: AppSpacing.x1),
            Text(
              'Selecione um contrato ativo e depois toque em uma cabine disponível.',
              style: TextStyle(color: context.colors.textSecondary),
            ),
            const SizedBox(height: AppSpacing.x4),
            Flexible(
              child: filaAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (error, _) => Center(
                  child: Text(ApiService.extractErrorMessage(error)),
                ),
                data: (fila) {
                  if (fila.isEmpty) {
                    return const Center(
                      child: Text(
                          'Nenhum contrato ativo aguardando cabine no momento.'),
                    );
                  }

                  return ListView.separated(
                    shrinkWrap: true,
                    itemCount: fila.length,
                    separatorBuilder: (_, __) =>
                        const SizedBox(height: AppSpacing.x3),
                    itemBuilder: (context, index) {
                      final item = fila[index];
                      return AppCard(
                        onTap: () => Navigator.pop(context, item),
                        shadow: const [],
                        borderColor: context.colors.borderSubtle,
                        padding: const EdgeInsets.all(AppSpacing.x3),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(item.clienteNome,
                                style: AppTypography.bodyMedium
                                    .copyWith(fontWeight: FontWeight.w700)),
                            const SizedBox(height: AppSpacing.x1),
                            Text(item.localizacao,
                                style: AppTypography.bodySmall.copyWith(
                                    color: context.colors.textSecondary)),
                            const SizedBox(height: AppSpacing.x2),
                            Text(
                              'Contrato ${item.id.substring(0, 8)} • Fixo R\$ ${item.valorFixo.toStringAsFixed(2)} • Comissão ${item.comissaoPct.toStringAsFixed(0)}%',
                              style: AppTypography.caption.copyWith(
                                  color: context.colors.textSecondary),
                            ),
                          ],
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── METRICS ─────────────────────────────────────────────────────────────────

class _CabinesMetrics {
  final int total;
  final int aoVivo;
  final int reservadas;
  final int ativas;
  final int disponiveis;
  final int manutencao;
  final double gmvTotalHoje;
  final int audienciaTotal;
  final int livesComStream;

  const _CabinesMetrics({
    required this.total,
    required this.aoVivo,
    required this.reservadas,
    required this.ativas,
    required this.disponiveis,
    required this.manutencao,
    required this.gmvTotalHoje,
    required this.audienciaTotal,
    required this.livesComStream,
  });

  factory _CabinesMetrics.from(
    List<Cabine> cabines, {
    required int audienciaTotal,
  }) {
    return _CabinesMetrics(
      total: cabines.length,
      aoVivo: cabines.where((c) => c.status == 'ao_vivo').length,
      reservadas: cabines.where((c) => c.status == 'reservada').length,
      ativas: cabines.where((c) => c.status == 'ativa').length,
      disponiveis: cabines.where((c) => c.status == 'disponivel').length,
      manutencao: cabines.where((c) => c.status == 'manutencao').length,
      gmvTotalHoje: cabines.fold(0.0, (sum, c) => sum + c.gmvAtual),
      audienciaTotal: audienciaTotal,
      livesComStream: cabines.where((c) => c.liveAtualId != null).length,
    );
  }
}

class _EngajamentoChip extends StatelessWidget {
  final IconData icon;
  final Color color;
  final int value;
  final String label;

  const _EngajamentoChip({
    required this.icon,
    required this.color,
    required this.value,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding:
          const EdgeInsets.symmetric(horizontal: AppSpacing.x2, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(AppRadius.full),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            '$value',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
          const SizedBox(width: 3),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              color: context.colors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

String _formatDuracao(Duration d) {
  final h = d.inHours;
  final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
  return h > 0 ? '${h}h${m}min' : '${d.inMinutes}min';
}
