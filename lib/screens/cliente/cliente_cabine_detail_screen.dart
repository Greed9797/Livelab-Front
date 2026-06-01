import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../design_system/design_system.dart';
import '../../models/live_request.dart';
import '../../providers/cliente_cabine_detail_provider.dart';
import '../../providers/live_requests_provider.dart';
import '../../providers/live_stream_provider.dart';
import '../../services/api_service.dart';

class ClienteCabineDetailScreen extends ConsumerStatefulWidget {
  final String cabineId;
  final int cabineNumero;

  const ClienteCabineDetailScreen({
    super.key,
    required this.cabineId,
    required this.cabineNumero,
  });

  @override
  ConsumerState<ClienteCabineDetailScreen> createState() =>
      _ClienteCabineDetailScreenState();
}

class _ClienteCabineDetailScreenState
    extends ConsumerState<ClienteCabineDetailScreen>
    with SingleTickerProviderStateMixin {
  static final _currency = NumberFormat.simpleCurrency(locale: 'pt_BR');
  static final _dateFormat = DateFormat("dd/MM/yyyy 'às' HH:mm", 'pt_BR');

  late final TabController _tabController;
  Timer? _pollingTimer;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this)
      ..addListener(_syncPolling);
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    _tabController
      ..removeListener(_syncPolling)
      ..dispose();
    super.dispose();
  }

  void _showSolicitarLiveSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _SolicitarLiveSheet(cabineId: widget.cabineId),
    );
  }

  void _syncPolling() {
    final detail =
        ref.read(clienteCabineDetailProvider(widget.cabineId)).valueOrNull;
    final shouldPoll = _tabController.index == 0 &&
        detail?.liveAtual != null &&
        !_tabController.indexIsChanging;

    if (shouldPoll) {
      _pollingTimer ??=
          Timer.periodic(const Duration(seconds: 30), (_) {
        ref
            .read(clienteCabineDetailProvider(widget.cabineId).notifier)
            .refreshLiveOnly();
      });
      return;
    }
    _pollingTimer?.cancel();
    _pollingTimer = null;
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<AsyncValue<ClienteCabineDetailState>>(
        clienteCabineDetailProvider(widget.cabineId), (_, __) {
      _syncPolling();
    });

    final detailAsync =
        ref.watch(clienteCabineDetailProvider(widget.cabineId));

    return Scaffold(
      backgroundColor: context.colors.bgPage,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showSolicitarLiveSheet(context),
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.calendar_today_rounded,
            color: Colors.white),
        label: const Text(
          'Solicitar Live',
          style: TextStyle(
              color: Colors.white, fontWeight: FontWeight.w600),
        ),
      ),
      appBar: AppBar(
        title: Text(
          'Cabine ${widget.cabineNumero.toString().padLeft(2, '0')}',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: context.colors.bgCard,
        foregroundColor: context.colors.textPrimary,
        elevation: 1,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Atualizar',
            onPressed: () => ref
                .read(clienteCabineDetailProvider(widget.cabineId).notifier)
                .refresh(),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primary,
          unselectedLabelColor: context.colors.textSecondary,
          indicatorColor: AppColors.primary,
          tabs: const [
            Tab(text: 'Live', icon: Icon(Icons.live_tv_outlined)),
            Tab(text: 'Histórico', icon: Icon(Icons.history_outlined)),
          ],
        ),
      ),
      body: detailAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.x6),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.error_outline,
                    size: 48, color: AppColors.danger),
                const SizedBox(height: AppSpacing.x3),
                Text('Erro ao carregar dados: $error',
                    textAlign: TextAlign.center),
                const SizedBox(height: AppSpacing.x2),
                AppGhostButton(
                  label: 'Tentar novamente',
                  onPressed: () => ref
                      .read(clienteCabineDetailProvider(widget.cabineId)
                          .notifier)
                      .refresh(),
                ),
              ],
            ),
          ),
        ),
        data: (detail) => TabBarView(
          controller: _tabController,
          children: [
            _LiveTab(
              liveAtual: detail.liveAtual,
              currency: _currency,
            ),
            _HistoricoTab(
              lives: detail.historicoLives,
              currency: _currency,
              dateFormat: _dateFormat,
            ),
          ],
        ),
      ),
    );
  }
}

// ──────────────────────────────────────────────────────────────
// Tab: Live
// ──────────────────────────────────────────────────────────────

class _LiveTab extends ConsumerWidget {
  final ClienteLiveAtual? liveAtual;
  final NumberFormat currency;

  const _LiveTab({required this.liveAtual, required this.currency});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final live = liveAtual;

    // SSE snapshot com fallback para os dados REST
    final snapshot = live != null
        ? ref.watch(liveStreamProvider(live.liveId)).valueOrNull
        : null;

    final viewerCount   = snapshot?.viewerCount   ?? live?.viewerCount   ?? 0;
    final gmvAtual      = snapshot?.gmv            ?? live?.gmvAtual      ?? 0.0;
    final totalOrders   = snapshot?.totalOrders    ?? live?.totalOrders   ?? 0;
    final likesCount    = snapshot?.likesCount     ?? live?.likesCount    ?? 0;
    final commentsCount = snapshot?.commentsCount  ?? live?.commentsCount ?? 0;

    if (live == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.x6),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.videocam_off_outlined,
                  size: 64, color: context.colors.textMuted),
              const SizedBox(height: AppSpacing.x4),
              Text(
                'Nenhuma live em andamento',
                style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: context.colors.textSecondary),
              ),
              const SizedBox(height: AppSpacing.x2),
              Text(
                'Quando sua cabine estiver ao vivo, as métricas\naparecerão aqui em tempo real.',
                textAlign: TextAlign.center,
                style: TextStyle(color: context.colors.textMuted),
              ),
            ],
          ),
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.x6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Card AO VIVO
          AppCard(
            padding: const EdgeInsets.all(AppSpacing.x4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.danger,
                        borderRadius:
                            BorderRadius.circular(AppRadius.full),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.circle,
                              size: 8, color: Colors.white),
                          SizedBox(width: 4),
                          Text('AO VIVO',
                              style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                    const SizedBox(width: AppSpacing.x2),
                    if (live.apresentadorNome != null)
                      Expanded(
                        child: Text(
                          live.apresentadorNome!,
                          style: AppTypography.bodySmall
                              .copyWith(color: context.colors.textSecondary),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    Text(
                      '${live.duracaoMinutos}min',
                      style: AppTypography.caption
                          .copyWith(color: context.colors.textSecondary),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.x4),
                // Métricas em grid 2x2
                _MetricGrid(
                  items: [
                    _MetricItem(
                      icon: Icons.remove_red_eye_outlined,
                      label: 'Espectadores',
                      value: '$viewerCount',
                      color: AppColors.info,
                    ),
                    _MetricItem(
                      icon: Icons.attach_money_rounded,
                      label: 'GMV',
                      value: currency.format(gmvAtual),
                      color: AppColors.success,
                    ),
                    _MetricItem(
                      icon: Icons.shopping_bag_outlined,
                      label: 'Pedidos',
                      value: '$totalOrders',
                      color: AppColors.primary,
                    ),
                    _MetricItem(
                      icon: Icons.favorite_outline_rounded,
                      label: 'Curtidas',
                      value: '$likesCount',
                      color: AppColors.danger,
                    ),
                  ],
                ),
                if (commentsCount > 0) ...[
                  const SizedBox(height: AppSpacing.x2),
                  Row(
                    children: [
                      Icon(Icons.chat_bubble_outline,
                          size: 14, color: context.colors.textMuted),
                      const SizedBox(width: 4),
                      Text(
                        '$commentsCount comentários',
                        style: AppTypography.caption
                            .copyWith(color: context.colors.textSecondary),
                      ),
                    ],
                  ),
                ],
                if (live.topProduto != null) ...[
                  const Divider(height: AppSpacing.x6),
                  Row(
                    children: [
                      Icon(Icons.star_outline_rounded,
                          size: 16, color: AppColors.warning),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          'Mais vendido: ${live.topProduto}',
                          style: AppTypography.bodySmall.copyWith(
                              fontWeight: FontWeight.w600),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MetricGrid extends StatelessWidget {
  final List<_MetricItem> items;
  const _MetricGrid({required this.items});

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: AppSpacing.x2,
      mainAxisSpacing: AppSpacing.x2,
      childAspectRatio: 2.4,
      children: items
          .map((item) => Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.x3, vertical: AppSpacing.x2),
                decoration: BoxDecoration(
                  color: item.color.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                child: Row(
                  children: [
                    Icon(item.icon, size: 18, color: item.color),
                    const SizedBox(width: AppSpacing.x2),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            item.value,
                            style: AppTypography.bodyMedium.copyWith(
                                fontWeight: FontWeight.bold,
                                color: context.colors.textPrimary),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text(
                            item.label,
                            style: AppTypography.caption
                                .copyWith(color: context.colors.textSecondary),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ))
          .toList(),
    );
  }
}

class _MetricItem {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _MetricItem({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });
}

// ──────────────────────────────────────────────────────────────
// Tab: Histórico
// ──────────────────────────────────────────────────────────────

class _HistoricoTab extends StatelessWidget {
  final List<ClienteHistoricoLive> lives;
  final NumberFormat currency;
  final DateFormat dateFormat;

  const _HistoricoTab({
    required this.lives,
    required this.currency,
    required this.dateFormat,
  });

  @override
  Widget build(BuildContext context) {
    if (lives.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.x6),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.history_outlined,
                  size: 64, color: context.colors.textMuted),
              const SizedBox(height: AppSpacing.x4),
              Text(
                'Nenhuma live registrada nesta cabine',
                style:
                    TextStyle(color: context.colors.textSecondary, fontSize: 15),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.x6),
      itemCount: lives.length,
      separatorBuilder: (_, __) =>
          const SizedBox(height: AppSpacing.x2),
      itemBuilder: (_, i) => _LiveHistoricoCard(
        live: lives[i],
        currency: currency,
        dateFormat: dateFormat,
      ),
    );
  }
}

class _LiveHistoricoCard extends StatelessWidget {
  final ClienteHistoricoLive live;
  final NumberFormat currency;
  final DateFormat dateFormat;

  const _LiveHistoricoCard({
    required this.live,
    required this.currency,
    required this.dateFormat,
  });

  @override
  Widget build(BuildContext context) {
    // Exibe a data conforme armazenada (sem conversão de fuso — Phase 5 cuida disso)
    DateTime? date;
    try {
      date = DateTime.parse(live.iniciadoEm).toLocal();
    } catch (_) {}

    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.x4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  date != null
                      ? dateFormat.format(date)
                      : live.iniciadoEm,
                  style: AppTypography.bodySmall
                      .copyWith(fontWeight: FontWeight.w600),
                ),
              ),
              AppBadge.status(live.status),
            ],
          ),
          const SizedBox(height: AppSpacing.x2),
          Row(
            children: [
              Icon(Icons.timer_outlined,
                  size: 14, color: context.colors.textMuted),
              const SizedBox(width: 4),
              Text(
                '${live.duracaoMin} min',
                style: AppTypography.caption
                    .copyWith(color: context.colors.textSecondary),
              ),
            ],
          ),
          const Divider(height: AppSpacing.x6),
          Row(
            children: [
              _StatColumn(
                value: currency.format(live.fatGerado),
                label: 'faturamento',
                color: AppColors.success,
              ),
              if (live.comissaoCalculada > 0) ...[
                const SizedBox(width: AppSpacing.x6),
                _StatColumn(
                  value: currency.format(live.comissaoCalculada),
                  label: 'sua comissão',
                  color: AppColors.lilac,
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class _StatColumn extends StatelessWidget {
  final String value;
  final String label;
  final Color color;

  const _StatColumn({
    required this.value,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value,
          style: AppTypography.bodyLarge
              .copyWith(fontWeight: FontWeight.bold, color: color),
        ),
        Text(
          label,
          style: AppTypography.caption
              .copyWith(color: context.colors.textSecondary),
        ),
      ],
    );
  }
}

// ──────────────────────────────────────────────────────────────
// Modal: Solicitar Live
// ──────────────────────────────────────────────────────────────

class _SolicitarLiveSheet extends ConsumerStatefulWidget {
  final String cabineId;
  const _SolicitarLiveSheet({required this.cabineId});

  @override
  ConsumerState<_SolicitarLiveSheet> createState() =>
      _SolicitarLiveSheetState();
}

class _SolicitarLiveSheetState
    extends ConsumerState<_SolicitarLiveSheet> {
  DateTime? _selectedDate;
  TimeOfDay? _horaInicio;
  TimeOfDay? _horaFim;
  final _observacaoCtrl = TextEditingController();
  bool _isSubmitting = false;
  String? _formError;

  static final _dateFmt = DateFormat('dd/MM/yyyy');
  static final _dateIso = DateFormat('yyyy-MM-dd');

  @override
  void dispose() {
    _observacaoCtrl.dispose();
    super.dispose();
  }

  // ── Conversão de fuso-segura: apenas string, sem DateTime ──

  /// Formata DateTime → "yyyy-MM-dd" (ISO, string pura para o backend)
  String _toDateString(DateTime d) => _dateIso.format(d);

  /// Formata TimeOfDay → "HH:mm" (string pura para o backend)
  String _toTimeString(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  /// Compara "HH:mm" strings lexicograficamente (funciona porque são zero-padded)
  bool _horaFimValida(String inicio, String fim) =>
      fim.compareTo(inicio) > 0;

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? now,
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
      locale: const Locale('pt', 'BR'),
    );
    if (picked != null) {
      setState(() {
        _selectedDate = picked;
        _formError = null;
      });
    }
  }

  Future<void> _pickHoraInicio() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _horaInicio ?? const TimeOfDay(hour: 9, minute: 0),
      builder: (ctx, child) => MediaQuery(
        data: MediaQuery.of(ctx).copyWith(alwaysUse24HourFormat: true),
        child: child!,
      ),
    );
    if (picked != null) {
      setState(() {
        _horaInicio = picked;
        _formError = null;
      });
    }
  }

  Future<void> _pickHoraFim() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _horaFim ??
          (_horaInicio != null
              ? TimeOfDay(hour: _horaInicio!.hour + 2, minute: 0)
              : const TimeOfDay(hour: 11, minute: 0)),
      builder: (ctx, child) => MediaQuery(
        data: MediaQuery.of(ctx).copyWith(alwaysUse24HourFormat: true),
        child: child!,
      ),
    );
    if (picked != null) {
      setState(() {
        _horaFim = picked;
        _formError = null;
      });
    }
  }

  Future<void> _submit() async {
    // Validação completa antes de qualquer chamada à API
    if (_selectedDate == null || _horaInicio == null || _horaFim == null) {
      setState(
          () => _formError = 'Preencha a data, hora de início e hora de fim.');
      return;
    }

    final dateStr = _toDateString(_selectedDate!);
    final inicioStr = _toTimeString(_horaInicio!);
    final fimStr = _toTimeString(_horaFim!);
    final todayStr = _toDateString(DateTime.now());

    if (dateStr.compareTo(todayStr) < 0) {
      setState(() => _formError = 'A data não pode ser anterior a hoje.');
      return;
    }

    if (!_horaFimValida(inicioStr, fimStr)) {
      setState(
          () => _formError = 'O horário de fim deve ser após o de início.');
      return;
    }

    setState(() {
      _formError = null;
      _isSubmitting = true;
    });

    try {
      await ref.read(liveRequestsProvider(widget.cabineId).notifier)
          .solicitarLive(
            dataSolicitada: dateStr,
            horaInicio: inicioStr,
            horaFim: fimStr,
            observacao: _observacaoCtrl.text.trim().isEmpty
                ? null
                : _observacaoCtrl.text.trim(),
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Solicitação enviada! Aguarde aprovação do franqueador.'),
          backgroundColor: AppColors.success,
        ),
      );
      // Reset form
      setState(() {
        _selectedDate = null;
        _horaInicio = null;
        _horaFim = null;
      });
      _observacaoCtrl.clear();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.message),
          backgroundColor: AppColors.danger,
        ),
      );
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final requestsAsync = ref.watch(liveRequestsProvider(widget.cabineId));

    return Container(
      decoration: BoxDecoration(
        color: context.colors.bgCard,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(
            AppSpacing.x6, AppSpacing.x4,
            AppSpacing.x6, AppSpacing.x8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            // ── Handle visual ──
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.borderLight,
                  borderRadius: BorderRadius.circular(AppRadius.full),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.x4),

            Text(
              'Solicitar Live',
              style: AppTypography.h3
                  .copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: AppSpacing.x6),

            // ── Data ──
            _PickerRow(
              icon: Icons.calendar_today_rounded,
              label: _selectedDate != null
                  ? _dateFmt.format(_selectedDate!)
                  : 'Selecionar data',
              placeholder: _selectedDate == null,
              onTap: _pickDate,
            ),
            const SizedBox(height: AppSpacing.x2),

            // ── Hora início ──
            _PickerRow(
              icon: Icons.access_time_rounded,
              label: _horaInicio != null
                  ? _toTimeString(_horaInicio!)
                  : 'Hora de início',
              placeholder: _horaInicio == null,
              onTap: _pickHoraInicio,
            ),
            const SizedBox(height: AppSpacing.x2),

            // ── Hora fim ──
            _PickerRow(
              icon: Icons.access_time_filled_rounded,
              label: _horaFim != null
                  ? _toTimeString(_horaFim!)
                  : 'Hora de fim',
              placeholder: _horaFim == null,
              onTap: _pickHoraFim,
            ),
            const SizedBox(height: AppSpacing.x3),

            // ── Observação ──
            TextField(
              controller: _observacaoCtrl,
              decoration: InputDecoration(
                hintText: 'Observação (opcional)',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                filled: true,
                fillColor: context.colors.bgPage,
              ),
              maxLines: 2,
              textCapitalization: TextCapitalization.sentences,
            ),
            const SizedBox(height: AppSpacing.x2),

            // ── Erro de validação ──
            if (_formError != null)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.x2),
                child: Text(
                  _formError!,
                  style: AppTypography.caption
                      .copyWith(color: AppColors.danger),
                ),
              ),

            // ── Botão enviar ──
            AppPrimaryButton(
              label: 'Enviar Solicitação',
              fullWidth: true,
              isLoading: _isSubmitting,
              onPressed: _isSubmitting ? null : _submit,
            ),

            // ── Histórico de solicitações desta cabine ──
            const SizedBox(height: AppSpacing.x8),
            const Divider(),
            const SizedBox(height: AppSpacing.x3),
            Text(
              'Minhas Solicitações',
              style: AppTypography.bodyMedium
                  .copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: AppSpacing.x3),
            requestsAsync.when(
              loading: () => const Center(
                  child: CircularProgressIndicator()),
              error: (_, __) => Text(
                'Não foi possível carregar as solicitações.',
                style: TextStyle(color: context.colors.textMuted),
              ),
              data: (requests) => requests.isEmpty
                  ? Padding(
                      padding:
                          const EdgeInsets.symmetric(vertical: AppSpacing.x4),
                      child: Text(
                        'Nenhuma solicitação ainda.',
                        style: TextStyle(color: context.colors.textMuted),
                        textAlign: TextAlign.center,
                      ),
                    )
                  : Column(
                      children: requests
                          .map((r) => _LiveRequestTile(request: r))
                          .toList(),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Linha clicável do picker ──
class _PickerRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool placeholder;
  final VoidCallback onTap;

  const _PickerRow({
    required this.icon,
    required this.label,
    required this.placeholder,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadius.md),
      child: Container(
        padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.x3, vertical: AppSpacing.x3),
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.borderLight),
          borderRadius: BorderRadius.circular(AppRadius.md),
          color: context.colors.bgPage,
        ),
        child: Row(
          children: [
            Icon(icon, size: 18, color: AppColors.primary),
            const SizedBox(width: AppSpacing.x2),
            Text(
              label,
              style: AppTypography.bodySmall.copyWith(
                color: placeholder
                    ? context.colors.textMuted
                    : context.colors.textPrimary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Tile de solicitação existente ──
class _LiveRequestTile extends StatelessWidget {
  final LiveRequest request;

  const _LiveRequestTile({required this.request});

  static final _dateFmt = DateFormat('dd/MM/yyyy');

  String _formatDate(String iso) {
    try {
      return _dateFmt
          .format(DateFormat('yyyy-MM-dd').parse(iso));
    } catch (_) {
      return iso;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.x2),
      padding: const EdgeInsets.all(AppSpacing.x3),
      decoration: BoxDecoration(
        color: context.colors.bgPage,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: context.colors.bgPage),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${_formatDate(request.dataSolicitada)}  '
                  '${request.horaInicioDisplay} – ${request.horaFimDisplay}',
                  style: AppTypography.bodySmall
                      .copyWith(fontWeight: FontWeight.w600),
                ),
                if (request.motivoRecusa != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    request.motivoRecusa!,
                    style: AppTypography.caption
                        .copyWith(color: AppColors.danger),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.x2),
          AppBadge.status(request.status),
        ],
      ),
    );
  }
}
