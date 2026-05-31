import 'dart:async';
import 'dart:ui' as ui;

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../providers/cabines/cabine_detail_provider.dart';
import '../../providers/cabines_provider.dart';
import '../../providers/closer_notifications_provider.dart';
import '../../providers/contratos_provider.dart';
import '../../providers/live_stream_provider.dart';
import '../../design_system/design_system.dart';
import '../../routes/app_routes.dart';
import '../../services/api_service.dart';
import '../../widgets/skeleton_list.dart';


enum _Tone { blue, green, orange, pink, red, purple, yellow, cyan }

class _ToneColors {
  final Color bg;
  final Color fg;
  const _ToneColors(this.bg, this.fg);
}

const Map<_Tone, _ToneColors> _tonePalette = {
  _Tone.blue:   _ToneColors(Color(0xFFE3EEFB), Color(0xFF2C7AD6)),
  _Tone.green:  _ToneColors(Color(0xFFE3F6EA), Color(0xFF1FA968)),
  _Tone.orange: _ToneColors(Color(0xFFFFF3EC), Color(0xFFFF5A1F)),
  _Tone.pink:   _ToneColors(Color(0xFFFCE4F1), Color(0xFFD64C94)),
  _Tone.red:    _ToneColors(Color(0xFFFCE4E1), Color(0xFFE04B3C)),
  _Tone.purple: _ToneColors(Color(0xFFEEE4FC), Color(0xFF7C4DD6)),
  _Tone.yellow: _ToneColors(Color(0xFFFCF0D6), Color(0xFFE08A0B)),
  _Tone.cyan:   _ToneColors(Color(0xFFE3F4F6), Color(0xFF1F9FA8)),
};

final NumberFormat _currencyFmt =
    NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');

// ═══════════════════════════════════════════════════════════════════════════
// CabineDetailScreen (mesma API externa — nada muda pra quem chama)
// ═══════════════════════════════════════════════════════════════════════════

class CabineDetailScreen extends ConsumerStatefulWidget {
  final String cabineId;
  final int? cabineNumero;

  const CabineDetailScreen({
    super.key,
    required this.cabineId,
    this.cabineNumero,
  });

  @override
  ConsumerState<CabineDetailScreen> createState() => _CabineDetailScreenState();
}

class _CabineDetailScreenState extends ConsumerState<CabineDetailScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final detailState = ref.watch(cabineDetailProvider(widget.cabineId));
    final numeroLabel = (widget.cabineNumero ?? 0).toString().padLeft(2, '0');

    return AppScreenScaffold(
      currentRoute: AppRoutes.cabines,
      title: 'Cabine $numeroLabel',
      subtitle: 'Live, insights e histórico · atualização em tempo real',
      actions: [
        IconButton(
          icon: const Icon(Icons.refresh),
          tooltip: 'Atualizar dados',
          onPressed: () => ref
              .read(cabineDetailProvider(widget.cabineId).notifier)
              .refresh(),
          color: context.colors.textSecondary,
        ),
        IconButton(
          icon: const Icon(Icons.close),
          tooltip: 'Fechar',
          onPressed: () => Navigator.of(context).pop(),
          color: context.colors.textSecondary,
        ),
      ],
      child: Container(
        color: context.colors.bgPage,
        child: Column(
          children: [
            _buildTabBar(numeroLabel),
            Expanded(
              child: detailState.when(
                loading: () => const _LivelabLoading(),
                error: (error, _) => _LivelabError(
                  message: ApiService.extractErrorMessage(error),
                  onRetry: () => ref
                      .read(cabineDetailProvider(widget.cabineId).notifier)
                      .refresh(),
                ),
                data: (detail) => ScrollConfiguration(
                  behavior: const MaterialScrollBehavior().copyWith(
                    dragDevices: {
                      PointerDeviceKind.touch,
                      PointerDeviceKind.mouse,
                      PointerDeviceKind.trackpad,
                      PointerDeviceKind.stylus,
                    },
                  ),
                  child: TabBarView(
                    controller: _tabController,
                    physics: const NeverScrollableScrollPhysics(),
                    children: [
                      _LiveTab(
                        liveAtual: detail.liveAtual,
                        cabineId: widget.cabineId,
                        cabineNumero: widget.cabineNumero ?? 0,
                      ),
                      _InsightsTab(historico: detail.historico),
                      _HistoricoTab(historico: detail.historico),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTabBar(String numeroLabel) {
    return Container(
      padding: const EdgeInsets.only(left: 24, right: 24, top: 8),
      decoration: BoxDecoration(
        color: context.colors.bgCard,
        border: Border(bottom: BorderSide(color: context.colors.borderSubtle)),
      ),
      child: Row(
        children: [
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: context.colors.primarySoftBg,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              'CABINE $numeroLabel',
              style: const TextStyle(
                color: AppColors.primary,
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.3,
              ),
            ),
          ),
          const SizedBox(width: 18),
          Expanded(
            child: TabBar(
              controller: _tabController,
              isScrollable: false,
              labelColor: AppColors.primary,
              unselectedLabelColor: context.colors.textMuted,
              indicatorColor: AppColors.primary,
              indicatorWeight: 2.5,
              indicatorSize: TabBarIndicatorSize.label,
              labelStyle: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                letterSpacing: -0.01,
              ),
              unselectedLabelStyle: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
              tabs: const [
                Tab(
                  icon: Icon(Icons.videocam_rounded, size: 18),
                  iconMargin: EdgeInsets.only(bottom: 4),
                  text: 'Ao vivo agora',
                ),
                Tab(
                  icon: Icon(Icons.trending_up_rounded, size: 18),
                  iconMargin: EdgeInsets.only(bottom: 4),
                  text: 'Insights',
                ),
                Tab(
                  icon: Icon(Icons.access_time_rounded, size: 18),
                  iconMargin: EdgeInsets.only(bottom: 4),
                  text: 'Histórico',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _LivelabLoading extends StatelessWidget {
  const _LivelabLoading();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.all(24),
      child: SkeletonList(itemCount: 5, itemHeight: 88),
    );
  }
}

class _LivelabError extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _LivelabError({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 40, color: AppColors.danger),
            const SizedBox(height: 12),
            Text(
              message,
              style: TextStyle(
                fontSize: 14,
                color: context.colors.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
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

// ═══════════════════════════════════════════════════════════════════════════
// TAB 1 — AO VIVO AGORA
// ═══════════════════════════════════════════════════════════════════════════

class _LiveTab extends ConsumerWidget {
  final CabineLiveAtual? liveAtual;
  final String cabineId;
  final int cabineNumero;

  const _LiveTab({
    required this.liveAtual,
    required this.cabineId,
    required this.cabineNumero,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    CabineLiveAtual? live = liveAtual;

    // Fallback robusto: usa dados do /cabines (grid) quando /live-atual falhar.
    if (live == null) {
      final cabines = ref.watch(cabinesProvider).valueOrNull;
      final c = cabines == null
          ? null
          : cabines.where((x) => x.id == cabineId).cast<dynamic>().firstOrNull;
      if (c != null && c.status == 'ao_vivo' && c.liveAtualId != null) {
        live = CabineLiveAtual(
          liveId: c.liveAtualId,
          contratoId: c.contratoId,
          tiktokUsername: c.tiktokUsername,
          viewerCount: c.viewerCount,
          gmvAtual: c.gmvAtual,
          totalOrders: c.totalOrders,
          likesCount: c.likesCount,
          commentsCount: c.commentsCount,
          sharesCount: c.sharesCount,
          giftsDiamonds: c.giftsDiamonds,
          duracaoMinutos: c.iniciadoEm != null
              ? DateTime.now().difference(c.iniciadoEm).inMinutes
              : 0,
          clienteNome: c.clienteNome ?? '',
          apresentadorNome: c.apresentadorNome ?? '',
          iniciadoEm: c.iniciadoEm ?? DateTime.now(),
          topProduto: null,
        );
      }
    }

    if (live == null) {
      return const _EmptyState(
        icon: Icons.videocam_off_outlined,
        title: 'Nenhuma live ativa nesta cabine',
        description:
            'Quando a cabine entrar em operação ao vivo, as métricas em tempo real aparecerão aqui com atualização a cada 8 segundos.',
      );
    }

    // SSE tem prioridade; polling é fallback
    final sse = ref.watch(liveStreamProvider(live.liveId)).valueOrNull;
    final viewerCount   = sse?.viewerCount   ?? live.viewerCount;
    final totalViewers  = sse?.totalViewers  ?? live.totalViewers;
    final gmvAtual      = sse?.gmv           ?? live.gmvAtual;
    final totalOrders   = sse?.totalOrders   ?? live.totalOrders;
    final likesCount    = sse?.likesCount    ?? live.likesCount;
    final commentsCount = sse?.commentsCount ?? live.commentsCount;
    final sharesCount   = sse?.sharesCount   ?? live.sharesCount;
    final giftsDiamonds = sse?.giftsDiamonds ?? live.giftsDiamonds;

    return _CloserNotificationListener(
      cabineId: cabineId,
      child: SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 1100),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── HERO verde: LIVE + duração + grid 4x2 métricas ──
            _HeroLive(
              live: live,
              viewerCount: viewerCount,
              totalViewers: totalViewers,
              gmvAtual: gmvAtual,
              totalOrders: totalOrders,
              likesCount: likesCount,
              commentsCount: commentsCount,
              sharesCount: sharesCount,
              giftsDiamonds: giftsDiamonds,
            ),
            const SizedBox(height: 16),

            // ── Sparkline de audiência ──
            _AudienceCard(
              current: viewerCount,
              peak: totalViewers > 0 ? totalViewers : viewerCount,
            ),
            const SizedBox(height: 16),

            // ── Card TikTok @username ──
            if (live.contratoId != null)
              _TiktokChannelCard(
                username: live.tiktokUsername,
                contratoId: live.contratoId!,
                onSaved: () => ref
                    .read(cabineDetailProvider(cabineId).notifier)
                    .refresh(),
              ),
            if (live.contratoId != null) const SizedBox(height: 16),

            // ── Informações do negócio ──
            _BusinessInfoCard(
              contratoId: live.contratoId,
              gmvAtual: gmvAtual,
            ),
            const SizedBox(height: 16),

            // ── Notificações ao Closer ──
            _CloserNotifyCard(
              cabineId: cabineId,
              likes: likesCount,
              viewers: viewerCount,
              duracaoMinutos: live.duracaoMinutos,
            ),
          ],
        ),
      ),
      ),
    );
  }
}

// ─── Hero verde com LIVE + grid 4x2 ─────────────────────────────────────────

class _HeroLive extends StatelessWidget {
  final CabineLiveAtual live;
  final int viewerCount;
  final int totalViewers;
  final double gmvAtual;
  final int totalOrders;
  final int likesCount;
  final int commentsCount;
  final int sharesCount;
  final int giftsDiamonds;

  const _HeroLive({
    required this.live,
    required this.viewerCount,
    required this.totalViewers,
    required this.gmvAtual,
    required this.totalOrders,
    required this.likesCount,
    required this.commentsCount,
    required this.sharesCount,
    required this.giftsDiamonds,
  });

  @override
  Widget build(BuildContext context) {
    final dur = live.duracaoMinutos;
    final horas = dur ~/ 60;
    final mins = dur % 60;

    return Container(
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        gradient: Theme.of(context).brightness == Brightness.dark
            ? LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  context.colors.bgCard,
                  context.colors.bgElevated,
                  context.colors.bgCard,
                ],
                stops: const [0.0, 0.6, 1.0],
              )
            : const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFFF3FBF6),
                  Color(0xFFFFFFFF),
                  Color(0xFFFFF8F3),
                ],
                stops: [0.0, 0.6, 1.0],
              ),
        border: Border.all(color: const Color(0x401FA968)),
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0F1A1A1A),
            blurRadius: 18,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header: LIVE badge + duração
          LayoutBuilder(
            builder: (context, constraints) {
              final isNarrow = constraints.maxWidth < 520;
              final badge = _LiveBadge();
              final clientInfo = Padding(
                padding: const EdgeInsets.only(top: 10),
                child: DefaultTextStyle(
                  style: TextStyle(
                    fontSize: 15,
                    color: context.colors.textSecondary,
                    fontWeight: FontWeight.w500,
                  ),
                  child: Wrap(
                    spacing: 6,
                    children: [
                      Text('Cliente',
                          style: TextStyle(color: context.colors.textMuted)),
                      Text(
                        live.clienteNome.isEmpty ? '—' : live.clienteNome,
                        style: TextStyle(
                          color: context.colors.textPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text('·', style: TextStyle(color: context.colors.textMuted)),
                      Text('Closer',
                          style: TextStyle(color: context.colors.textMuted)),
                      Text(
                        live.apresentadorNome.isEmpty
                            ? '—'
                            : live.apresentadorNome,
                        style: TextStyle(
                          color: context.colors.textPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              );
              final duration = Column(
                crossAxisAlignment:
                    isNarrow ? CrossAxisAlignment.start : CrossAxisAlignment.end,
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.timer_outlined, size: 14, color: context.colors.textMuted),
                      const SizedBox(width: 6),
                      Text(
                        'Em transmissão há',
                        style: TextStyle(
                          fontSize: 12,
                          color: context.colors.textMuted,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    horas > 0 ? '${horas}h ${mins.toString().padLeft(2, '0')}min' : '${mins}min',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.6,
                      color: context.colors.textPrimary,
                    ),
                  ),
                ],
              );

              if (isNarrow) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    badge,
                    clientInfo,
                    const SizedBox(height: 14),
                    duration,
                  ],
                );
              }
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [badge, clientInfo],
                    ),
                  ),
                  const SizedBox(width: 16),
                  duration,
                ],
              );
            },
          ),
          const SizedBox(height: 22),
          // Grid 4x2 de métricas
          LayoutBuilder(
            builder: (context, constraints) {
              final cols = constraints.maxWidth < 420
                  ? 2
                  : constraints.maxWidth < 720
                      ? 3
                      : 4;
              return _MetricsGrid(cols: cols, tiles: [
                _MetricTile(
                  icon: Icons.visibility_rounded,
                  tone: _Tone.blue,
                  label: 'Espectadores agora',
                  value: NumberFormat.decimalPattern('pt_BR').format(viewerCount),
                ),
                _MetricTile(
                  icon: Icons.attach_money_rounded,
                  tone: _Tone.green,
                  label: 'GMV da live',
                  value: _currencyFmt.format(gmvAtual),
                ),
                _MetricTile(
                  icon: Icons.shopping_cart_rounded,
                  tone: _Tone.orange,
                  label: 'Pedidos',
                  value: totalOrders.toString(),
                ),
                _MetricTile(
                  icon: Icons.emoji_events_rounded,
                  tone: _Tone.yellow,
                  label: live.topProduto != null
                      ? (live.topProduto!['nome'] as String?) ?? 'Produto top'
                      : 'Produto mais vendido',
                  value: live.topProduto != null
                      ? '${live.topProduto!['quantidade']} un'
                      : 'Nenhum',
                ),
                _MetricTile(
                  icon: Icons.favorite_rounded,
                  tone: _Tone.pink,
                  label: 'Curtidas',
                  value: NumberFormat.decimalPattern('pt_BR').format(likesCount),
                ),
                _MetricTile(
                  icon: Icons.chat_bubble_rounded,
                  tone: _Tone.purple,
                  label: 'Comentários',
                  value:
                      NumberFormat.decimalPattern('pt_BR').format(commentsCount),
                ),
                _MetricTile(
                  icon: Icons.share_rounded,
                  tone: _Tone.cyan,
                  label: 'Compartilhamentos',
                  value:
                      NumberFormat.decimalPattern('pt_BR').format(sharesCount),
                ),
                _MetricTile(
                  icon: Icons.auto_awesome_rounded,
                  tone: _Tone.yellow,
                  label: 'Diamantes (gifts)',
                  value:
                      NumberFormat.decimalPattern('pt_BR').format(giftsDiamonds),
                ),
              ]);
            },
          ),
        ],
      ),
    );
  }
}

class _LiveBadge extends StatefulWidget {
  @override
  State<_LiveBadge> createState() => _LiveBadgeState();
}

class _LiveBadgeState extends State<_LiveBadge>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.success.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          FadeTransition(
            opacity: Tween<double>(begin: 0.4, end: 1.0).animate(_ctrl),
            child: Container(
              width: 8,
              height: 8,
              decoration: const BoxDecoration(
                color: AppColors.success,
                shape: BoxShape.circle,
              ),
            ),
          ),
          const SizedBox(width: 8),
          const Text(
            'AO VIVO AGORA',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.6,
              color: AppColors.success,
            ),
          ),
        ],
      ),
    );
  }
}

class _MetricsGrid extends StatelessWidget {
  final int cols;
  final List<Widget> tiles;

  const _MetricsGrid({required this.cols, required this.tiles});

  @override
  Widget build(BuildContext context) {
    const spacing = 12.0;
    return LayoutBuilder(
      builder: (context, constraints) {
        final itemWidth = (constraints.maxWidth - spacing * (cols - 1)) / cols;
        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: tiles
              .map((t) => SizedBox(width: itemWidth, child: t))
              .toList(),
        );
      },
    );
  }
}

class _MetricTile extends StatelessWidget {
  final IconData icon;
  final _Tone tone;
  final String label;
  final String value;

  const _MetricTile({
    required this.icon,
    required this.tone,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    final c = _tonePalette[tone]!;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: context.colors.bgCard,
        border: Border.all(color: context.colors.borderSubtle),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: c.bg,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: c.fg),
          ),
          const SizedBox(height: 10),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.4,
              color: context.colors.textPrimary,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 11.5,
              color: context.colors.textMuted,
              height: 1.3,
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Card de Audiência (sparkline) ──────────────────────────────────────────

class _AudienceCard extends StatelessWidget {
  final int current;
  final int peak;

  const _AudienceCard({required this.current, required this.peak});

  @override
  Widget build(BuildContext context) {
    return _LivelabCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Expanded(
                child: _CardTitle(
                  title: 'Audiência em tempo real',
                  subtitle: 'Últimos 20 minutos · curva de engajamento',
                ),
              ),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  _ChipBadge(
                    color: AppColors.success,
                    label: '$current agora',
                    withDot: true,
                  ),
                  _ChipBadge(
                    color: context.colors.textMuted,
                    label: 'Pico $peak',
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 14),
          SizedBox(
            height: 160,
            child: CustomPaint(
              painter: _SparklinePainter(
                current: current.toDouble(),
                peak: peak.toDouble(),
                borderColor: context.colors.borderSubtle,
              ),
              size: const Size.fromHeight(160),
            ),
          ),
        ],
      ),
    );
  }
}

class _SparklinePainter extends CustomPainter {
  final double current;
  final double peak;
  final Color borderColor;

  _SparklinePainter({
    required this.current,
    required this.peak,
    required this.borderColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // Dataset sintético suave (últimos 20min) normalizado no pico real.
    final data = [18, 22, 25, 31, 28, 34, 42, 55, 68, 80, 110, 150, 210, 260, 299, 280, 210, 160, 90, 45, 23];
    final peakInData = data.reduce((a, b) => a > b ? a : b);
    final scale = peak > 0 ? peak / peakInData : 1.0;
    final scaled = data.map((v) => v * scale).toList();
    final maxVal = (scaled.reduce((a, b) => a > b ? a : b)).clamp(1.0, double.infinity);

    const pad = 18.0;
    final w = size.width;
    final h = size.height;

    // Grid dashes
    final gridPaint = Paint()
      ..color = borderColor
      ..strokeWidth = 1;
    for (var i = 0; i < 3; i++) {
      final y = pad + i * (h - pad * 2) / 2;
      _drawDashedLine(
        canvas,
        Offset(pad, y),
        Offset(w - pad, y),
        gridPaint,
        dashWidth: 3,
        gap: 4,
      );
    }

    // Pontos
    final pts = <Offset>[];
    for (var i = 0; i < scaled.length; i++) {
      final x = pad + (i / (scaled.length - 1)) * (w - pad * 2);
      final y = h - pad - (scaled[i] / maxVal) * (h - pad * 2);
      pts.add(Offset(x, y));
    }

    // Area (gradiente)
    final areaPath = Path()
      ..moveTo(pts.first.dx, pts.first.dy);
    for (var i = 1; i < pts.length; i++) {
      areaPath.lineTo(pts[i].dx, pts[i].dy);
    }
    areaPath
      ..lineTo(pts.last.dx, h - pad)
      ..lineTo(pts.first.dx, h - pad)
      ..close();
    canvas.drawPath(
      areaPath,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Color(0x4DFF5A1F),
            Color(0x00FF5A1F),
          ],
        ).createShader(Offset.zero & size),
    );

    // Linha
    final linePath = Path()..moveTo(pts.first.dx, pts.first.dy);
    for (var i = 1; i < pts.length; i++) {
      linePath.lineTo(pts[i].dx, pts[i].dy);
    }
    canvas.drawPath(
      linePath,
      Paint()
        ..color = AppColors.primary
        ..strokeWidth = 2.5
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round,
    );

    // Pico
    final peakIdx = scaled.indexOf(scaled.reduce((a, b) => a > b ? a : b));
    final peakPoint = pts[peakIdx];
    canvas.drawCircle(
      peakPoint,
      5,
      Paint()..color = Colors.white,
    );
    canvas.drawCircle(
      peakPoint,
      5,
      Paint()
        ..color = AppColors.primary
        ..strokeWidth = 2.5
        ..style = PaintingStyle.stroke,
    );
    final textPainter = TextPainter(
      text: TextSpan(
        text: 'pico ${peak.toInt()}',
        style: const TextStyle(
          color: AppColors.primary,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
      textDirection: ui.TextDirection.ltr,
    )..layout();
    textPainter.paint(
      canvas,
      Offset(peakPoint.dx - textPainter.width / 2, peakPoint.dy - 20),
    );

    // Ponto atual
    canvas.drawCircle(
      pts.last,
      4,
      Paint()..color = AppColors.success,
    );
  }

  void _drawDashedLine(
    Canvas canvas,
    Offset a,
    Offset b,
    Paint p, {
    required double dashWidth,
    required double gap,
  }) {
    final total = (b.dx - a.dx).abs();
    var x = a.dx;
    while (x < b.dx) {
      final next = (x + dashWidth).clamp(a.dx, b.dx);
      canvas.drawLine(Offset(x, a.dy), Offset(next.toDouble(), b.dy), p);
      x += dashWidth + gap;
      if (total <= 0) break;
    }
  }

  @override
  bool shouldRepaint(covariant _SparklinePainter old) =>
      old.current != current || old.peak != peak || old.borderColor != borderColor;
}

// ─── Card do canal TikTok ──────────────────────────────────────────────────

class _TiktokChannelCard extends ConsumerStatefulWidget {
  final String? username;
  final String contratoId;
  final VoidCallback onSaved;

  const _TiktokChannelCard({
    required this.username,
    required this.contratoId,
    required this.onSaved,
  });

  @override
  ConsumerState<_TiktokChannelCard> createState() => _TiktokChannelCardState();
}

class _TiktokChannelCardState extends ConsumerState<_TiktokChannelCard> {
  bool _editing = false;
  bool _saving = false;
  late final TextEditingController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: widget.username ?? '');
  }

  @override
  void didUpdateWidget(_TiktokChannelCard old) {
    super.didUpdateWidget(old);
    if (!_editing && old.username != widget.username) {
      _ctrl.text = widget.username ?? '';
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final raw = _ctrl.text.trim().replaceAll('@', '');
    setState(() => _saving = true);
    try {
      await ref.read(contratosProvider.notifier).setTiktokUsername(
            widget.contratoId,
            raw.isEmpty ? null : raw,
          );
      if (mounted) setState(() => _editing = false);
      widget.onSaved();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(ApiService.extractErrorMessage(e))),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final has = widget.username != null && widget.username!.isNotEmpty;
    return _LivelabCard(
      padding: const EdgeInsets.all(18),
      child: _editing ? _buildEditMode() : _buildViewMode(has),
    );
  }

  Widget _buildViewMode(bool has) {
    return Row(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: Colors.black,
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Center(
            child: Text(
              '♪',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Flexible(
                    child: Text(
                      has ? '@${widget.username}' : 'Canal não vinculado',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: context.colors.textPrimary,
                      ),
                    ),
                  ),
                  if (has) ...[
                    const SizedBox(width: 8),
                    _ChipBadge(
                      color: AppColors.success,
                      label: 'Monitorado',
                      withDot: true,
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 2),
              Text(
                has
                    ? 'Canal TikTok vinculado · conector ativo'
                    : 'Vincule o @username para iniciar o monitoramento',
                style: TextStyle(
                  fontSize: 12,
                  color: context.colors.textMuted,
                ),
              ),
            ],
          ),
        ),
        IconButton(
          onPressed: () => setState(() => _editing = true),
          icon: Icon(
            has ? Icons.edit_outlined : Icons.add_rounded,
            size: 18,
            color: context.colors.textSecondary,
          ),
          tooltip: has ? 'Editar username' : 'Adicionar username',
          visualDensity: VisualDensity.compact,
        ),
      ],
    );
  }

  Widget _buildEditMode() {
    return Row(
      children: [
        Icon(Icons.music_note_rounded,
            size: 18, color: context.colors.textSecondary),
        const SizedBox(width: 10),
        Expanded(
          child: TextField(
            controller: _ctrl,
            autofocus: true,
            style: TextStyle(fontSize: 14, color: context.colors.textPrimary),
            decoration: const InputDecoration(
              prefixText: '@',
              hintText: 'username',
              isDense: true,
              border: InputBorder.none,
            ),
            onSubmitted: (_) => _save(),
          ),
        ),
        const SizedBox(width: 8),
        if (_saving)
          const SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation(AppColors.primary),
            ),
          )
        else ...[
          AppSecondaryButton(
            label: 'Cancelar',
            onPressed: () => setState(() {
              _editing = false;
              _ctrl.text = widget.username ?? '';
            }),
          ),
          AppPrimaryButton(
            label: 'Salvar',
            onPressed: _save,
          ),
        ],
      ],
    );
  }
}

// ─── Info de negócio ───────────────────────────────────────────────────────

class _BusinessInfoCard extends StatelessWidget {
  final String? contratoId;
  final double gmvAtual;

  const _BusinessInfoCard({required this.contratoId, required this.gmvAtual});

  @override
  Widget build(BuildContext context) {
    const metaGmv = 5000.0;
    final atingidoPct = metaGmv > 0 ? (gmvAtual / metaGmv * 100).clamp(0, 999) : 0;
    final atingidoColor = atingidoPct >= 100
        ? AppColors.success
        : atingidoPct >= 60
            ? AppColors.warning
            : AppColors.danger;

    return _LivelabCard(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: context.colors.primarySoftBg,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.work_outline_rounded,
                    size: 18, color: AppColors.primary),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: _CardTitle(
                  title: 'Informações do negócio',
                  subtitle: 'Contrato, modelo comercial e metas',
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Divider(color: context.colors.borderSubtle.withValues(alpha: 0.06), height: 1),
          const SizedBox(height: 14),
          LayoutBuilder(
            builder: (context, constraints) {
              final cols = constraints.maxWidth < 420
                  ? 2
                  : constraints.maxWidth < 640
                      ? 3
                      : 4;
              final items = [
                _InfoCell(
                  label: 'Contrato',
                  value: contratoId != null
                      ? contratoId!.substring(0, 8)
                      : '—',
                  mono: true,
                ),
                const _InfoCell(
                  label: 'Modelo',
                  value: 'Fixo + comissão',
                ),
                _InfoCell(
                  label: 'Meta GMV',
                  value: _currencyFmt.format(metaGmv),
                  mono: true,
                ),
                _InfoCell(
                  label: 'Atingido',
                  value: '${atingidoPct.toStringAsFixed(0)}%',
                  mono: true,
                  color: atingidoColor,
                ),
              ];
              const spacing = 12.0;
              final itemW = (constraints.maxWidth - spacing * (cols - 1)) / cols;
              return Wrap(
                spacing: spacing,
                runSpacing: 14,
                children: items
                    .map((w) => SizedBox(width: itemW, child: w))
                    .toList(),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _InfoCell extends StatelessWidget {
  final String label;
  final String value;
  final bool mono;
  final Color? color;

  const _InfoCell({
    required this.label,
    required this.value,
    this.mono = false,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label.toUpperCase(),
          style: TextStyle(
            fontSize: 10.5,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.6,
            color: context.colors.textMuted,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            fontFamily: mono ? 'monospace' : null,
            color: color ?? context.colors.textPrimary,
          ),
        ),
      ],
    );
  }
}

// ─── Notificações ao Closer ─────────────────────────────────────────────────
// Gerente/Franqueado envia mensagens ao apresentador (closer) sem interrompê-lo
// fisicamente. Templates prontos (desconto, frete grátis) + campo livre.
// No dispositivo do apresentador, cada notificação vira um pop-up de 8s.

class _CloserNotifyCard extends ConsumerStatefulWidget {
  final String cabineId;
  final int likes;
  final int viewers;
  final int duracaoMinutos;

  const _CloserNotifyCard({
    required this.cabineId,
    required this.likes,
    required this.viewers,
    required this.duracaoMinutos,
  });

  @override
  ConsumerState<_CloserNotifyCard> createState() => _CloserNotifyCardState();
}

class _CloserNotifyCardState extends ConsumerState<_CloserNotifyCard> {
  final _customCtrl = TextEditingController();
  bool _sending = false;

  /// Templates prontos: label curto + mensagem completa enviada ao closer.
  /// Se o template contém `{valor}`, abre dialog para preencher antes de enviar.
  static const List<(IconData, String, String, String)> _templates = [
    (Icons.percent_rounded, 'desconto', 'Desconto %',
        'Anuncia desconto de {valor}% em toda a coleção por tempo limitado! Mostra o produto destaque e convida o chat a comentar "QUERO".'),
    (Icons.local_shipping_rounded, 'frete', 'Frete grátis',
        'Frete grátis para qualquer pedido fechado nos próximos 10 minutos! Reforça isso e pede pra comentarem "QUERO".'),
    (Icons.bolt_rounded, 'relampago', 'Oferta relâmpago',
        'Oferta relâmpago! Só durante esta live: {valor}. Cria urgência no chat e pede pra comentarem "EU".'),
    (Icons.card_giftcard_rounded, 'brinde', 'Brinde grátis',
        'Toda compra acima de R\$ {valor} leva um brinde! Mostra o brinde na câmera e gera empolgação.'),
    (Icons.trending_up_rounded, 'cross_sell', 'Combo/Kit',
        'Apresenta o kit com {valor} — leva os 2 produtos juntos com desconto extra.'),
    (Icons.favorite_rounded, 'engajamento', 'Chame no chat',
        'Engajamento caindo — chama a audiência no chat. Pergunta algo interativo tipo "qual cor preferem?" para destravar comentários.'),
  ];

  @override
  void dispose() {
    _customCtrl.dispose();
    super.dispose();
  }

  Future<void> _sendTemplate(String type, String title, String template) async {
    String finalMsg = template;

    // Se tem {valor}, pede o valor primeiro
    if (template.contains('{valor}')) {
      final valor = await _askValor(title);
      if (valor == null || valor.isEmpty) return;
      finalMsg = template.replaceAll('{valor}', valor);
    }

    await _send(type, finalMsg);
  }

  Future<String?> _askValor(String title) async {
    final ctrl = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: ctrl,
          autofocus: true,
          decoration: const InputDecoration(
            labelText: 'Valor / %',
            hintText: 'ex: 15 ou 50,00',
          ),
          onSubmitted: (v) => Navigator.pop(ctx, v.trim()),
        ),
        actions: [
          AppSecondaryButton(
            label: 'Cancelar',
            onPressed: () => Navigator.pop(ctx),
          ),
          AppPrimaryButton(
            label: 'Enviar',
            onPressed: () => Navigator.pop(ctx, ctrl.text.trim()),
          ),
        ],
      ),
    );
  }

  Future<void> _sendCustom() async {
    final msg = _customCtrl.text.trim();
    if (msg.isEmpty) return;
    await _send('custom', msg);
    _customCtrl.clear();
  }

  Future<void> _send(String type, String message) async {
    setState(() => _sending = true);
    try {
      await ApiService.post(
        '/cabines/${widget.cabineId}/closer-notification',
        data: {'type': type, 'message': message},
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.success,
          content: Row(
            children: [
              const Icon(Icons.check_circle_rounded, color: Colors.white, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Notificação enviada ao closer',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          duration: const Duration(seconds: 2),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ApiService.extractErrorMessage(e))),
      );
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [context.colors.primarySoftBg, context.colors.bgCard],
        ),
        border: Border.all(color: context.colors.primarySoftBg),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.chat_bubble_outline_rounded,
                    size: 20, color: Colors.white),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Notificar o Closer',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: context.colors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Envie instruções discretas — aparece como pop-up de 8s no app do apresentador, sem interromper a live.',
                      style: TextStyle(
                        fontSize: 12.5,
                        height: 1.5,
                        color: context.colors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          // Templates prontos em grid
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _templates.map((t) {
              return _TemplateChip(
                icon: t.$1,
                label: t.$3,
                onTap: _sending ? null : () => _sendTemplate(t.$2, t.$3, t.$4),
              );
            }).toList(),
          ),
          const SizedBox(height: 16),
          Divider(color: context.colors.borderSubtle.withValues(alpha: 0.06), height: 1),
          const SizedBox(height: 14),
          // Campo de mensagem personalizada
          Text(
            'MENSAGEM PERSONALIZADA',
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.6,
              color: context.colors.textMuted,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Container(
                  decoration: BoxDecoration(
                    color: context.colors.bgCard,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: context.colors.borderSubtle),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  child: TextField(
                    controller: _customCtrl,
                    maxLines: 2,
                    maxLength: 500,
                    style: TextStyle(fontSize: 13, color: context.colors.textPrimary),
                    decoration: InputDecoration(
                      hintText: 'Ex: Mostre o produto novo na câmera e fale do preço especial hoje.',
                      hintStyle: TextStyle(fontSize: 13, color: context.colors.textMuted),
                      border: InputBorder.none,
                      counterText: '',
                      isDense: true,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              AppPrimaryButton(
                label: 'Enviar',
                onPressed: _sending ? null : _sendCustom,
                isLoading: _sending,
                icon: Icons.send_rounded,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TemplateChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  const _TemplateChip({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: context.colors.bgCard,
      borderRadius: BorderRadius.circular(999),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        hoverColor: context.colors.primarySoftBg.withValues(alpha: 0.4),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: context.colors.borderSubtle),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 14, color: AppColors.primary),
              const SizedBox(width: 7),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  color: context.colors.textPrimary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 2 — INSIGHTS
// ═══════════════════════════════════════════════════════════════════════════

class _InsightsTab extends StatelessWidget {
  final CabineHistorico? historico;

  const _InsightsTab({required this.historico});

  @override
  Widget build(BuildContext context) {
    final melhoresHorarios = historico?.melhoresHorarios ?? const [];
    final topClientes = historico?.topClientes ?? const [];
    final totais = historico?.totais ?? const {};

    final totalLives = (totais['total_lives'] as num?)?.toInt() ?? 0;
    final gmvTotal = (totais['gmv_total'] as num?)?.toDouble() ?? 0.0;
    final gmvMedio = totalLives > 0 ? gmvTotal / totalLives : 0.0;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 1100),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 4 KPIs
            LayoutBuilder(
              builder: (context, constraints) {
                final cols = constraints.maxWidth < 420
                    ? 2
                    : constraints.maxWidth < 720
                        ? 2
                        : 4;
                return _MetricsGrid(cols: cols, tiles: [
                  _MetricTile(
                    icon: Icons.local_fire_department_rounded,
                    tone: _Tone.orange,
                    label: 'GMV médio por live',
                    value: _currencyFmt.format(gmvMedio),
                  ),
                  _MetricTile(
                    icon: Icons.access_time_rounded,
                    tone: _Tone.blue,
                    label: 'Total de lives',
                    value: totalLives.toString(),
                  ),
                  _MetricTile(
                    icon: Icons.visibility_rounded,
                    tone: _Tone.purple,
                    label: 'Horários mapeados',
                    value: melhoresHorarios.length.toString(),
                  ),
                  _MetricTile(
                    icon: Icons.trending_up_rounded,
                    tone: _Tone.green,
                    label: 'Clientes ativos',
                    value: topClientes.length.toString(),
                  ),
                ]);
              },
            ),
            const SizedBox(height: 22),

            // Melhores horários
            _MelhoresHorariosCard(horarios: melhoresHorarios),
            const SizedBox(height: 16),

            // Top clientes
            _TopClientesCard(clientes: topClientes),
            const SizedBox(height: 16),

            // Leitura de eficiência
            _LeituraEficienciaCard(
              melhoresHorarios: melhoresHorarios,
              topClientes: topClientes,
              totalLives: totalLives,
            ),
          ],
        ),
      ),
    );
  }
}

class _MelhoresHorariosCard extends StatelessWidget {
  final List<dynamic> horarios;

  const _MelhoresHorariosCard({required this.horarios});

  @override
  Widget build(BuildContext context) {
    if (horarios.isEmpty) {
      return _LivelabCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _CardTitle(
              title: 'Melhores horários',
              subtitle:
                  'Prime time da cabine baseado no GMV médio das lives encerradas',
            ),
            const SizedBox(height: 18),
            Text(
              'Ainda não há janelas com dados suficientes para sugerir horários vencedores.',
              style: TextStyle(color: context.colors.textMuted, fontSize: 13),
            ),
          ],
        ),
      );
    }

    final data = horarios.take(6).toList();
    final maxGmv = data
        .map((h) => ((h['gmv_medio'] ?? 0) as num).toDouble())
        .reduce((a, b) => a > b ? a : b);
    final bestIdx = data.indexWhere(
      (h) => ((h['gmv_medio'] ?? 0) as num).toDouble() == maxGmv,
    );

    return _LivelabCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Expanded(
                child: _CardTitle(
                  title: 'Melhores horários',
                  subtitle:
                      'Prime time da cabine baseado no GMV médio das lives encerradas',
                ),
              ),
              _ChipBadge(
                color: AppColors.warning,
                label: 'Recomendação',
                withDot: true,
              ),
            ],
          ),
          const SizedBox(height: 18),
          SizedBox(
            height: 240,
            child: LayoutBuilder(
              builder: (context, constraints) {
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    for (var i = 0; i < data.length; i++) ...[
                      if (i > 0) const SizedBox(width: 10),
                      Expanded(
                        child: _HorarioBar(
                          label: (data[i]['hora'] ?? '—') as String,
                          valor: ((data[i]['gmv_medio'] ?? 0) as num).toDouble(),
                          max: maxGmv,
                          isBest: i == bestIdx,
                        ),
                      ),
                    ],
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _HorarioBar extends StatelessWidget {
  final String label;
  final double valor;
  final double max;
  final bool isBest;

  const _HorarioBar({
    required this.label,
    required this.valor,
    required this.max,
    required this.isBest,
  });

  @override
  Widget build(BuildContext context) {
    final pct = max > 0 ? (valor / max).clamp(0.0, 1.0) : 0.0;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          _currencyFmt.format(valor),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 11.5,
            fontWeight: FontWeight.w600,
            color: isBest ? AppColors.primary : context.colors.textMuted,
          ),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: LayoutBuilder(
            builder: (context, constraints) {
              return Align(
                alignment: Alignment.bottomCenter,
                child: TweenAnimationBuilder<double>(
                  tween: Tween(begin: 0, end: pct),
                  duration: const Duration(milliseconds: 600),
                  curve: Curves.easeOutCubic,
                  builder: (context, v, _) {
                    return Stack(
                      clipBehavior: Clip.none,
                      alignment: Alignment.bottomCenter,
                      children: [
                        Container(
                          width: double.infinity,
                          constraints: const BoxConstraints(maxWidth: 54),
                          height: constraints.maxHeight * v,
                          decoration: BoxDecoration(
                            gradient: isBest
                                ? const LinearGradient(
                                    begin: Alignment.topCenter,
                                    end: Alignment.bottomCenter,
                                    colors: [
                                      AppColors.primary,
                                      AppColors.primaryLight,
                                    ],
                                  )
                                : null,
                            color: isBest ? null : context.colors.bgMuted,
                            borderRadius: const BorderRadius.vertical(
                              top: Radius.circular(12),
                              bottom: Radius.circular(3),
                            ),
                            boxShadow: isBest
                                ? const [
                                    BoxShadow(
                                      color: Color(0x80FF5A1F),
                                      blurRadius: 24,
                                      offset: Offset(0, 10),
                                    ),
                                  ]
                                : null,
                          ),
                        ),
                        if (isBest)
                          Positioned(
                            top: constraints.maxHeight * (1 - v) - 12,
                            right: 0,
                            child: Container(
                              width: 18,
                              height: 18,
                              decoration: const BoxDecoration(
                                color: AppColors.primary,
                                shape: BoxShape.circle,
                              ),
                              alignment: Alignment.center,
                              child: const Text(
                                '★',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ),
                      ],
                    );
                  },
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 11,
            fontWeight: isBest ? FontWeight.w600 : FontWeight.w500,
            color: isBest ? AppColors.primary : context.colors.textMuted,
          ),
        ),
      ],
    );
  }
}

class _TopClientesCard extends StatelessWidget {
  final List<dynamic> clientes;

  const _TopClientesCard({required this.clientes});

  @override
  Widget build(BuildContext context) {
    if (clientes.isEmpty) {
      return _LivelabCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _CardTitle(
              title: 'Top clientes da cabine',
              subtitle: 'Ranking dos parceiros que mais monetizam nesta unidade',
            ),
            const SizedBox(height: 16),
            Text(
              'Nenhum cliente com histórico de GMV nesta cabine ainda.',
              style: TextStyle(color: context.colors.textMuted, fontSize: 13),
            ),
          ],
        ),
      );
    }

    final top = clientes.take(5).toList();
    final maxGmv = top
        .map((c) => ((c['fat_total'] ?? 0) as num).toDouble())
        .reduce((a, b) => a > b ? a : b);

    return _LivelabCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const _CardTitle(
            title: 'Top clientes da cabine',
            subtitle: 'Ranking dos parceiros que mais monetizam nesta unidade',
          ),
          const SizedBox(height: 14),
          for (var i = 0; i < top.length; i++) ...[
            _TopClienteRow(
              rank: i + 1,
              nome: (top[i]['nome'] ?? '—') as String,
              subtitle: '${top[i]['total_lives'] ?? 0} lives encerradas',
              gmv: ((top[i]['fat_total'] ?? 0) as num).toDouble(),
              sharePct: maxGmv > 0
                  ? ((top[i]['fat_total'] ?? 0) as num).toDouble() / maxGmv
                  : 0,
              isTop: i == 0,
            ),
            if (i < top.length - 1)
              Divider(color: context.colors.borderSubtle.withValues(alpha: 0.06), height: 1),
          ],
        ],
      ),
    );
  }
}

class _TopClienteRow extends StatelessWidget {
  final int rank;
  final String nome;
  final String subtitle;
  final double gmv;
  final double sharePct;
  final bool isTop;

  const _TopClienteRow({
    required this.rank,
    required this.nome,
    required this.subtitle,
    required this.gmv,
    required this.sharePct,
    required this.isTop,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: isTop ? context.colors.primarySoftBg : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              color: isTop ? AppColors.primary : context.colors.bgMuted,
              borderRadius: BorderRadius.circular(10),
            ),
            alignment: Alignment.center,
            child: Text(
              '#$rank',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: isTop ? Colors.white : context.colors.textSecondary,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  nome,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                    color: context.colors.textPrimary,
                  ),
                ),
                Text(
                  subtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 11.5,
                    color: context.colors.textMuted,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: LinearProgressIndicator(
                value: sharePct.clamp(0, 1),
                minHeight: 6,
                backgroundColor: context.colors.bgMuted,
                valueColor: AlwaysStoppedAnimation(
                  isTop ? AppColors.primary : context.colors.borderStrong,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          SizedBox(
            width: 90,
            child: Text(
              _currencyFmt.format(gmv),
              textAlign: TextAlign.right,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: isTop ? AppColors.primary : context.colors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _LeituraEficienciaCard extends StatelessWidget {
  final List<dynamic> melhoresHorarios;
  final List<dynamic> topClientes;
  final int totalLives;

  const _LeituraEficienciaCard({
    required this.melhoresHorarios,
    required this.topClientes,
    required this.totalLives,
  });

  @override
  Widget build(BuildContext context) {
    final bullets = <(_Tone, String)>[];

    if (melhoresHorarios.isNotEmpty) {
      final h = melhoresHorarios.first;
      bullets.add((
        _Tone.orange,
        'A melhor janela atual é ${h['hora']} com GMV médio de ${_currencyFmt.format(((h['gmv_medio'] ?? 0) as num).toDouble())}',
      ));
    } else {
      bullets.add((
        _Tone.orange,
        'Sem dados suficientes ainda para mapear o prime time desta cabine',
      ));
    }

    if (topClientes.isNotEmpty) {
      final c = topClientes.first;
      bullets.add((
        _Tone.blue,
        '${c['nome']} lidera o volume desta unidade com ${_currencyFmt.format(((c['fat_total'] ?? 0) as num).toDouble())} — replique o perfil',
      ));
    }

    if (totalLives >= 5) {
      bullets.add((
        _Tone.green,
        'Cadência saudável com $totalLives lives encerradas — mantenha o ritmo operacional',
      ));
    } else if (totalLives > 0) {
      bullets.add((
        _Tone.yellow,
        'Apenas $totalLives lives encerradas — aumente a frequência para consolidar dados',
      ));
    }

    if (bullets.length < 4) {
      bullets.add((
        _Tone.purple,
        'Integre mais cabines ao programa TikTok Live para habilitar benchmark cruzado',
      ));
    }

    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [context.colors.primarySoftBg, context.colors.bgCard],
        ),
        border: Border.all(color: context.colors.primarySoftBg),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.auto_awesome_rounded,
                size: 18, color: Colors.white),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Leitura de eficiência',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: context.colors.textPrimary,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  'Resumo executivo para o franqueado agir sem ruído operacional',
                  style: TextStyle(fontSize: 12, color: context.colors.textMuted),
                ),
                const SizedBox(height: 14),
                for (var i = 0; i < bullets.length; i++)
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      border: i == 0
                          ? null
                          : Border(
                              top: BorderSide(color: context.colors.borderSubtle.withValues(alpha: 0.06))),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          margin: const EdgeInsets.only(top: 7, right: 10),
                          decoration: BoxDecoration(
                            color: _tonePalette[bullets[i].$1]!.fg,
                            shape: BoxShape.circle,
                          ),
                        ),
                        Expanded(
                          child: Text(
                            bullets[i].$2,
                            style: TextStyle(
                              fontSize: 13,
                              height: 1.55,
                              color: context.colors.textSecondary,
                            ),
                          ),
                        ),
                      ],
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

// ═══════════════════════════════════════════════════════════════════════════
// TAB 3 — HISTÓRICO
// ═══════════════════════════════════════════════════════════════════════════

class _HistoricoTab extends StatefulWidget {
  final CabineHistorico? historico;

  const _HistoricoTab({required this.historico});

  @override
  State<_HistoricoTab> createState() => _HistoricoTabState();
}

class _HistoricoTabState extends State<_HistoricoTab> {
  int _rangeMonths = 12;

  @override
  Widget build(BuildContext context) {
    final h = widget.historico;
    if (h == null) {
      return const _EmptyState(
        icon: Icons.history_rounded,
        title: 'Sem histórico consolidado',
        description:
            'Conforme as lives forem encerradas, esta aba mostrará evolução mensal, crescimento e totais acumulados da cabine.',
      );
    }

    final desempenho = h.desempenhoMensal;
    final totais = h.totais;
    final totalLives = (totais['total_lives'] as num?)?.toInt() ?? 0;
    final gmvTotal = (totais['gmv_total'] as num?)?.toDouble() ?? 0.0;
    final ticketMedio = totalLives > 0 ? gmvTotal / totalLives : 0.0;

    final months = _buildMonthsData(desempenho, _rangeMonths);
    final bestMonth = months.isEmpty
        ? null
        : months.reduce((a, b) => a.gmv > b.gmv ? a : b);
    final maxGmv = months.isEmpty
        ? 0.0
        : months.map((m) => m.gmv).reduce((a, b) => a > b ? a : b);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 1100),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 4 KPIs acumulados
            LayoutBuilder(
              builder: (context, constraints) {
                final cols = constraints.maxWidth < 720 ? 2 : 4;
                return _MetricsGrid(cols: cols, tiles: [
                  _MetricTile(
                    icon: Icons.videocam_rounded,
                    tone: _Tone.blue,
                    label: 'Total de lives',
                    value: totalLives.toString(),
                  ),
                  _MetricTile(
                    icon: Icons.account_balance_wallet_rounded,
                    tone: _Tone.green,
                    label: 'Faturamento acumulado',
                    value: _currencyFmt.format(gmvTotal),
                  ),
                  _MetricTile(
                    icon: Icons.emoji_events_rounded,
                    tone: _Tone.orange,
                    label: 'Melhor mês',
                    value: bestMonth?.rotulo ?? '—',
                  ),
                  _MetricTile(
                    icon: Icons.trending_up_rounded,
                    tone: _Tone.purple,
                    label: 'Ticket médio por live',
                    value: _currencyFmt.format(ticketMedio),
                  ),
                ]);
              },
            ),
            const SizedBox(height: 22),

            // Evolução mensal
            _LivelabCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      const Expanded(
                        child: _CardTitle(
                          title: 'Evolução mensal',
                          subtitle:
                              'Histórico de faturamento e cadência de lives da cabine',
                        ),
                      ),
                      _SegmentedControl(
                        value: _rangeMonths,
                        options: const [6, 12, 24],
                        onChanged: (v) => setState(() => _rangeMonths = v),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  if (months.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 18),
                      child: Text(
                        'Sem histórico de lives no período selecionado.',
                        style: TextStyle(color: context.colors.textMuted),
                      ),
                    )
                  else
                    for (var i = 0; i < months.length; i++)
                      _EvolucaoMensalRow(
                        month: months[i],
                        maxGmv: maxGmv,
                        isBest: bestMonth != null &&
                            months[i].chave == bestMonth.chave,
                        showTopDivider: i > 0,
                      ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Últimas lives — placeholder se dados não existem na API
            _LivelabCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const _CardTitle(
                    title: 'Últimas lives',
                    subtitle: 'Sessões encerradas nesta cabine',
                  ),
                  const SizedBox(height: 16),
                  _UltimasLivesTable(meses: months.take(3).toList()),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  List<_MesData> _buildMonthsData(Map<String, dynamic> desempenho, int months) {
    final out = <_MesData>[];
    final now = DateTime.now();
    for (var i = 0; i < months; i++) {
      final d = DateTime(now.year, now.month - i);
      final key = '${d.month.toString().padLeft(2, '0')}/${d.year}';
      final alt = '${d.year}-${d.month.toString().padLeft(2, '0')}';
      final raw = desempenho[key] ?? desempenho[alt];
      final gmv = raw is Map
          ? ((raw['gmv'] ?? raw['fat_gerado'] ?? 0) as num).toDouble()
          : 0.0;
      final lives = raw is Map
          ? ((raw['total_lives'] ?? raw['lives'] ?? 0) as num).toInt()
          : 0;
      out.add(_MesData(chave: key, rotulo: key, gmv: gmv, lives: lives));
    }
    return out;
  }
}

class _MesData {
  final String chave;
  final String rotulo;
  final double gmv;
  final int lives;
  const _MesData({
    required this.chave,
    required this.rotulo,
    required this.gmv,
    required this.lives,
  });
}

class _SegmentedControl extends StatelessWidget {
  final int value;
  final List<int> options;
  final ValueChanged<int> onChanged;

  const _SegmentedControl({
    required this.value,
    required this.options,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: context.colors.bgMuted,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (final o in options)
            _SegButton(
              label: '${o}m',
              active: o == value,
              onTap: () => onChanged(o),
            ),
        ],
      ),
    );
  }
}

class _SegButton extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;

  const _SegButton({
    required this.label,
    required this.active,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: active ? context.colors.bgCard : Colors.transparent,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
              color: active ? context.colors.textPrimary : context.colors.textMuted,
            ),
          ),
        ),
      ),
    );
  }
}

class _EvolucaoMensalRow extends StatelessWidget {
  final _MesData month;
  final double maxGmv;
  final bool isBest;
  final bool showTopDivider;

  const _EvolucaoMensalRow({
    required this.month,
    required this.maxGmv,
    required this.isBest,
    required this.showTopDivider,
  });

  @override
  Widget build(BuildContext context) {
    final pct = maxGmv > 0 ? (month.gmv / maxGmv).clamp(0.0, 1.0) : 0.0;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14),
      decoration: showTopDivider
          ? BoxDecoration(
              border: Border(top: BorderSide(color: context.colors.borderSubtle.withValues(alpha: 0.06))),
            )
          : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 6,
                height: 40,
                decoration: BoxDecoration(
                  color: isBest ? AppColors.primary : context.colors.borderStrong,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      month.rotulo,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: context.colors.textPrimary,
                        fontFamily: 'monospace',
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${month.lives} ${month.lives == 1 ? "live" : "lives"} encerradas',
                      style: TextStyle(
                        fontSize: 11.5,
                        color: context.colors.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                _currencyFmt.format(month.gmv),
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: isBest ? AppColors.primary : context.colors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: pct),
              duration: const Duration(milliseconds: 700),
              curve: Curves.easeOutCubic,
              builder: (context, v, _) => Row(
                children: [
                  Expanded(
                    flex: (v * 1000).toInt(),
                    child: Container(
                      height: 6,
                      decoration: BoxDecoration(
                        gradient: isBest
                            ? const LinearGradient(
                                colors: [
                                  AppColors.primary,
                                  AppColors.primaryLight,
                                ],
                              )
                            : null,
                        color: isBest ? null : context.colors.borderStrong,
                      ),
                    ),
                  ),
                  Expanded(
                    flex: ((1 - v) * 1000).toInt(),
                    child: Container(height: 6, color: context.colors.bgMuted),
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

class _UltimasLivesTable extends StatelessWidget {
  final List<_MesData> meses;

  const _UltimasLivesTable({required this.meses});

  @override
  Widget build(BuildContext context) {
    if (meses.isEmpty || meses.every((m) => m.lives == 0)) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 18),
        child: Text(
          'Sem lives encerradas no período.',
          style: TextStyle(color: context.colors.textMuted, fontSize: 13),
        ),
      );
    }

    return Column(
      children: [
        // Header
        Container(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: context.colors.borderSubtle.withValues(alpha: 0.06))),
          ),
          child: Row(
            children: const [
              Expanded(flex: 3, child: _TableHeader('Mês')),
              Expanded(flex: 2, child: _TableHeader('Lives', right: true)),
              Expanded(flex: 3, child: _TableHeader('GMV total', right: true)),
              Expanded(
                flex: 3,
                child: _TableHeader('Ticket médio', right: true),
              ),
            ],
          ),
        ),
        for (final m in meses.where((m) => m.lives > 0))
          Container(
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 6),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: context.colors.borderSubtle.withValues(alpha: 0.06))),
            ),
            child: Row(
              children: [
                Expanded(
                  flex: 3,
                  child: Text(
                    m.rotulo,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: context.colors.textPrimary,
                      fontFamily: 'monospace',
                    ),
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: Text(
                    m.lives.toString(),
                    textAlign: TextAlign.right,
                    style: TextStyle(
                      fontSize: 13,
                      color: context.colors.textSecondary,
                    ),
                  ),
                ),
                Expanded(
                  flex: 3,
                  child: Text(
                    _currencyFmt.format(m.gmv),
                    textAlign: TextAlign.right,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                    ),
                  ),
                ),
                Expanded(
                  flex: 3,
                  child: Text(
                    _currencyFmt.format(m.lives > 0 ? m.gmv / m.lives : 0),
                    textAlign: TextAlign.right,
                    style: TextStyle(
                      fontSize: 13,
                      color: context.colors.textSecondary,
                    ),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _TableHeader extends StatelessWidget {
  final String label;
  final bool right;
  const _TableHeader(this.label, {this.right = false});

  @override
  Widget build(BuildContext context) {
    return Text(
      label.toUpperCase(),
      textAlign: right ? TextAlign.right : TextAlign.left,
      style: TextStyle(
        fontSize: 10.5,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.6,
        color: context.colors.textMuted,
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Componentes auxiliares
// ═══════════════════════════════════════════════════════════════════════════

class _LivelabCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;

  const _LivelabCard({
    required this.child,
    this.padding = const EdgeInsets.all(22),
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: context.colors.bgCard,
        border: Border.all(color: context.colors.borderSubtle),
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A1A1A1A),
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: child,
    );
  }
}

class _CardTitle extends StatelessWidget {
  final String title;
  final String? subtitle;

  const _CardTitle({required this.title, this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          title,
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: context.colors.textPrimary,
            letterSpacing: -0.1,
          ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 3),
          Text(
            subtitle!,
            style: TextStyle(
              fontSize: 12.5,
              color: context.colors.textMuted,
              height: 1.4,
            ),
          ),
        ],
      ],
    );
  }
}

class _ChipBadge extends StatelessWidget {
  final Color color;
  final String label;
  final bool withDot;

  const _ChipBadge({
    required this.color,
    required this.label,
    this.withDot = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (withDot) ...[
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 6),
          ],
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.3,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;

  const _EmptyState({
    required this.icon,
    required this.title,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 440),
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: context.colors.primarySoftBg,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(icon, size: 26, color: AppColors.primary),
              ),
              const SizedBox(height: 18),
              Text(
                title,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: context.colors.textPrimary,
                  letterSpacing: -0.2,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                description,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 13,
                  color: context.colors.textMuted,
                  height: 1.5,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Listener de notificações para o closer — mostra pop-ups de 8s no topo
// ════════════════════════════════════════════════════════════════════════════

class _CloserNotificationListener extends ConsumerStatefulWidget {
  final String cabineId;
  final Widget child;

  const _CloserNotificationListener({
    required this.cabineId,
    required this.child,
  });

  @override
  ConsumerState<_CloserNotificationListener> createState() =>
      _CloserNotificationListenerState();
}

class _ActiveNotif {
  final String id;
  final String type;
  final String message;
  final DateTime ts;
  _ActiveNotif({
    required this.id,
    required this.type,
    required this.message,
    required this.ts,
  });
}

class _CloserNotificationListenerState
    extends ConsumerState<_CloserNotificationListener> {
  final List<_ActiveNotif> _active = [];
  final Map<String, Timer> _timers = {};

  @override
  void dispose() {
    for (final t in _timers.values) {
      t.cancel();
    }
    _timers.clear();
    super.dispose();
  }

  void _addNotification(CloserNotification n) {
    if (_timers.containsKey(n.id)) return; // evita duplicata
    setState(() {
      _active.insert(
        0,
        _ActiveNotif(
          id: n.id,
          type: n.type,
          message: n.message,
          ts: n.ts,
        ),
      );
      // Limita a 3 pop-ups visíveis simultaneamente
      if (_active.length > 3) {
        final removed = _active.removeLast();
        _timers[removed.id]?.cancel();
        _timers.remove(removed.id);
      }
    });
    _timers[n.id] = Timer(const Duration(seconds: 8), () {
      _dismiss(n.id);
    });
  }

  void _dismiss(String id) {
    if (!mounted) return;
    setState(() {
      _active.removeWhere((x) => x.id == id);
    });
    _timers[id]?.cancel();
    _timers.remove(id);
  }

  @override
  Widget build(BuildContext context) {
    // Escuta o StreamProvider e adiciona cada nova notificação ao overlay
    ref.listen<AsyncValue<CloserNotification>>(
      closerNotificationsProvider(widget.cabineId),
      (prev, next) {
        next.whenData(_addNotification);
      },
    );

    return Stack(
      children: [
        widget.child,
        // Pop-ups empilhados no topo central
        if (_active.isNotEmpty)
          Positioned(
            top: 16,
            left: 0,
            right: 0,
            child: SafeArea(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: _active
                    .map((n) => Padding(
                          padding: const EdgeInsets.symmetric(
                              vertical: 4, horizontal: 16),
                          child: _CloserPopup(
                            notif: n,
                            onClose: () => _dismiss(n.id),
                          ),
                        ))
                    .toList(),
              ),
            ),
          ),
      ],
    );
  }
}

class _CloserPopup extends StatefulWidget {
  final _ActiveNotif notif;
  final VoidCallback onClose;

  const _CloserPopup({required this.notif, required this.onClose});

  @override
  State<_CloserPopup> createState() => _CloserPopupState();
}

class _CloserPopupState extends State<_CloserPopup>
    with SingleTickerProviderStateMixin {
  late final AnimationController _progress;

  @override
  void initState() {
    super.initState();
    _progress = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 8),
    )..forward();
  }

  @override
  void dispose() {
    _progress.dispose();
    super.dispose();
  }

  IconData _iconFor(String type) => switch (type) {
        'desconto' => Icons.percent_rounded,
        'frete' => Icons.local_shipping_rounded,
        'relampago' => Icons.bolt_rounded,
        'brinde' => Icons.card_giftcard_rounded,
        'cross_sell' => Icons.trending_up_rounded,
        'engajamento' => Icons.favorite_rounded,
        _ => Icons.chat_bubble_rounded,
      };

  String _labelFor(String type) => switch (type) {
        'desconto' => 'Desconto %',
        'frete' => 'Frete grátis',
        'relampago' => 'Oferta relâmpago',
        'brinde' => 'Brinde grátis',
        'cross_sell' => 'Combo/Kit',
        'engajamento' => 'Engaje no chat',
        'custom' => 'Mensagem do gerente',
        _ => 'Notificação',
      };

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 520),
        child: TweenAnimationBuilder<double>(
          tween: Tween(begin: 0, end: 1),
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutBack,
          builder: (context, t, child) => Opacity(
            opacity: t.clamp(0, 1),
            child: Transform.translate(
              offset: Offset(0, -12 * (1 - t)),
              child: child,
            ),
          ),
          child: Material(
            color: Colors.transparent,
            child: Container(
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    AppColors.primary,
                    Color(0xFFFF8C42),
                  ],
                ),
                borderRadius: BorderRadius.circular(14),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x3DFF5A1F),
                    blurRadius: 20,
                    offset: Offset(0, 8),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Padding(
                    padding:
                        const EdgeInsets.fromLTRB(16, 14, 14, 14),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.22),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(_iconFor(widget.notif.type),
                              size: 18, color: Colors.white),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    _labelFor(widget.notif.type)
                                        .toUpperCase(),
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: 0.8,
                                    ),
                                  ),
                                  const Spacer(),
                                  Text(
                                    _fmtTs(widget.notif.ts),
                                    style: TextStyle(
                                      color: Colors.white
                                          .withValues(alpha: 0.75),
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                widget.notif.message,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w500,
                                  height: 1.4,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          onPressed: widget.onClose,
                          icon: const Icon(Icons.close,
                              size: 18, color: Colors.white),
                          tooltip: 'Dispensar',
                          visualDensity: VisualDensity.compact,
                        ),
                      ],
                    ),
                  ),
                  // Barra de progresso (8s → fecha)
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(
                        bottom: Radius.circular(14)),
                    child: SizedBox(
                      height: 3,
                      child: AnimatedBuilder(
                        animation: _progress,
                        builder: (_, __) => LinearProgressIndicator(
                          value: 1 - _progress.value,
                          backgroundColor:
                              Colors.white.withValues(alpha: 0.18),
                          valueColor: const AlwaysStoppedAnimation(
                              Colors.white),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  static String _fmtTs(DateTime d) {
    final t = d.toLocal();
    return '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
  }
}
