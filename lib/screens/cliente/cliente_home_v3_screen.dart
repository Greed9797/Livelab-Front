// =============================================================
// Cliente Home V3 — content only (sem Scaffold/Sidebar/TopBar próprios).
// Shell vem de fora via _LlScope (AppScaffold + LivelabScaffold).
// Conteúdo fiel ao handoff: PageHeader + KPIs + Meta/Próximas/Melhores
// + Evolução mensal + Lives detalhadas.
// =============================================================

import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../providers/cliente_dashboard_provider.dart'
    show
        ClienteDashboard,
        ClientePeriod,
        ProximaLive,
        SerieMensal,
        ClienteLive,
        HorarioVenda,
        clienteDashboardProvider,
        clientePeriodProvider,
        clientePeriodStringProvider;
import '../../routes/app_routes.dart';

class _HomeTone {
  final Color bgBase, bgElev1, bgElev2, cardBg, hairline;
  final Color textPrimary, textSecondary, textMuted, textFaint;
  const _HomeTone({
    required this.bgBase,
    required this.bgElev1,
    required this.bgElev2,
    required this.cardBg,
    required this.hairline,
    required this.textPrimary,
    required this.textSecondary,
    required this.textMuted,
    required this.textFaint,
  });

  static const dark = _HomeTone(
    bgBase: Color(0xFF0A0A0B),
    bgElev1: Color(0xFF141416),
    bgElev2: Color(0xFF1E1E22),
    cardBg: Color(0xFF131316),
    hairline: Color(0xFF26262B),
    textPrimary: Color(0xFFF5F5F7),
    textSecondary: Color(0xFFC8C8CD),
    textMuted: Color(0xFF8A8A92),
    textFaint: Color(0xFF55555C),
  );

  static const light = _HomeTone(
    bgBase: Color(0xFFFDF6F1),
    bgElev1: Color(0xFFFFF3EC),
    bgElev2: Color(0xFFEFE6DD),
    cardBg: Color(0xFFFFFFFF),
    hairline: Color(0x141A1A1A),
    textPrimary: Color(0xFF1A1A1A),
    textSecondary: Color(0xFF4A4A4A),
    textMuted: Color(0xFF8A8A92),
    textFaint: Color(0xFFB6ADA6),
  );
}

extension _HomeContext on BuildContext {
  _HomeTone get h =>
      Theme.of(this).brightness == Brightness.dark ? _HomeTone.dark : _HomeTone.light;
}

class _HomeTheme {
  // Brand semantic colors (mesma cor em light + dark)
  static const primary      = Color(0xFFE85D2C);
  static const primaryLight = Color(0xFFFF9966);
  static const primarySoft  = Color(0x29E85D2C);

  static const danger  = Color(0xFFFF453A);
  static const warning = Color(0xFFFF9F0A);
  static const success = Color(0xFF34C759);
  static const info    = Color(0xFF5AC8FA);
  static const accent  = Color(0xFFAF7BFF);

  static const radiusCard = 14.0;

  static TextStyle get serif => const TextStyle(
        fontFamily: 'Playfair Display',
        fontStyle: FontStyle.italic,
        fontWeight: FontWeight.w500,
      );
}

class ClienteHomeV3Screen extends ConsumerStatefulWidget {
  const ClienteHomeV3Screen({super.key});

  @override
  ConsumerState<ClienteHomeV3Screen> createState() => _ClienteHomeV3ScreenState();
}

class _ClienteHomeV3ScreenState extends ConsumerState<ClienteHomeV3Screen> {
  final _scroll = ScrollController();

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final dashAsync = ref.watch(clienteDashboardProvider);
    return Container(
      color: context.h.bgBase,
      child: dashAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: _HomeTheme.primary),
        ),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, color: _HomeTheme.danger, size: 32),
                const SizedBox(height: 12),
                Text('Não foi possível carregar os dados.',
                    style: TextStyle(color: context.h.textPrimary, fontSize: 14)),
                const SizedBox(height: 6),
                Text('$e',
                    style: TextStyle(color: context.h.textMuted, fontSize: 11),
                    textAlign: TextAlign.center),
                const SizedBox(height: 14),
                OutlinedButton(
                  onPressed: () => ref.invalidate(clienteDashboardProvider),
                  child: const Text('Tentar de novo'),
                ),
              ],
            ),
          ),
        ),
        data: (d) => Scrollbar(
          controller: _scroll,
          thumbVisibility: true,
          child: ListView(
            controller: _scroll,
            padding: const EdgeInsets.fromLTRB(24, 18, 24, 28),
            children: [
              const _PageHeader(),
              const SizedBox(height: 14),
              _KpiRow(d: d),
              const SizedBox(height: 12),
              _Row3MetaProximasMelhores(d: d),
              const SizedBox(height: 12),
              _EvolucaoMensal(series: d.seriesMensais),
              const SizedBox(height: 12),
              _LivesDetalhadas(d: d),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}

// =============================================================
// FORMATTERS
// =============================================================

final _moneyFmt = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$', decimalDigits: 2);
final _intFmt = NumberFormat.decimalPattern('pt_BR');

String _fmtMoney(double v) => _moneyFmt.format(v);
String _fmtInt(int v) => _intFmt.format(v);
String _fmtHrs(double h) => '${h.toStringAsFixed(1)}h';

// =============================================================
// PAGE HEADER + PERIOD TABS
// =============================================================

class _PageHeader extends StatelessWidget {
  const _PageHeader();

  @override
  Widget build(BuildContext context) {
    return Wrap(
      alignment: WrapAlignment.spaceBetween,
      crossAxisAlignment: WrapCrossAlignment.end,
      runSpacing: 12,
      spacing: 16,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            RichText(
              text: TextSpan(
                style: TextStyle(
                  fontSize: 30,
                  fontWeight: FontWeight.w700,
                  color: context.h.textPrimary,
                  letterSpacing: -0.8,
                ),
                children: [
                  TextSpan(
                    text: 'Minha',
                    style: _HomeTheme.serif.copyWith(
                      fontSize: 30,
                      color: context.h.textPrimary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const TextSpan(text: ' Loja'),
                ],
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Visão geral da performance de lives',
              style: TextStyle(
                color: context.h.textMuted,
                fontSize: 13,
              ),
            ),
          ],
        ),
        const _PeriodTabs(),
      ],
    );
  }
}

class _PeriodTabs extends ConsumerWidget {
  const _PeriodTabs();

  static const tabs = [
    ('hoje', 'Hoje'),
    ('7dias', '7 dias'),
    ('30dias', '30 dias'),
    ('mes_atual', 'Mês atual'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activeStr = ref.watch(clientePeriodStringProvider);
    final period = ref.watch(clientePeriodProvider);
    final dt = DateTime(period.ano, period.mes);

    void setPeriodStr(String s) {
      ref.read(clientePeriodStringProvider.notifier).state = s;
      ref.read(clienteDashboardProvider.notifier).fetchPeriodo(s);
    }

    void shiftMonth(int delta) {
      final newPeriod = delta < 0 ? period.previous() : period.next();
      ref.read(clientePeriodProvider.notifier).state = newPeriod;
      ref.read(clienteDashboardProvider.notifier).setPeriodo(newPeriod);
    }

    return Wrap(
      alignment: WrapAlignment.end,
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 8,
      runSpacing: 8,
      children: [
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: context.h.bgElev1,
            border: Border.all(color: context.h.hairline),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: tabs.map((t) {
              final isActive = t.$1 == activeStr;
              return InkWell(
                onTap: () => setPeriodStr(t.$1),
                borderRadius: BorderRadius.circular(7),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 120),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: isActive ? _HomeTheme.primary : Colors.transparent,
                    borderRadius: BorderRadius.circular(7),
                  ),
                  child: Text(
                    t.$2,
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w500,
                      color: isActive ? Colors.white : context.h.textMuted,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 3),
          decoration: BoxDecoration(
            color: context.h.bgElev1,
            border: Border.all(color: context.h.hairline),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton(
                icon: Icon(Icons.chevron_left, size: 16, color: context.h.textMuted),
                onPressed: () => shiftMonth(-1),
                splashRadius: 16,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                tooltip: 'Mês anterior',
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Text(
                  DateFormat("MMMM 'de' y", 'pt_BR').format(dt),
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: context.h.textSecondary,
                  ),
                ),
              ),
              IconButton(
                icon: Icon(Icons.chevron_right, size: 16, color: context.h.textMuted),
                onPressed: () => shiftMonth(1),
                splashRadius: 16,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                tooltip: 'Próximo mês',
              ),
            ],
          ),
        ),
        IconButton(
          icon: Icon(Icons.refresh, size: 17, color: context.h.textSecondary),
          tooltip: 'Atualizar',
          onPressed: () => ref.invalidate(clienteDashboardProvider),
          style: IconButton.styleFrom(
            backgroundColor: context.h.bgElev1,
            side: BorderSide(color: context.h.hairline),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        ),
      ],
    );
  }
}

// =============================================================
// KPI ROW
// =============================================================

class _KpiRow extends StatelessWidget {
  final ClienteDashboard d;
  const _KpiRow({required this.d});

  @override
  Widget build(BuildContext context) {
    final faturamento = d.gmvTotal > 0 ? d.gmvTotal : d.faturamentoMes;
    final ticket = d.ticketMedio;
    return LayoutBuilder(builder: (ctx, c) {
      final cross = c.maxWidth < 720 ? 2 : 4;
      return GridView.count(
        crossAxisCount: cross,
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        childAspectRatio: 2.6,
        children: [
          _KpiCard(
            label: 'Faturamento do período',
            value: faturamento > 0 ? _fmtMoney(faturamento) : '—',
            valueFaint: faturamento <= 0,
            sub: faturamento > 0 ? 'no período atual' : 'sem vendas no período',
            icon: Icons.trending_up,
            iconBg: _HomeTheme.primarySoft,
            iconColor: _HomeTheme.primary,
          ),
          _KpiCard(
            label: 'Lives realizadas',
            value: '${d.totalLives}',
            sub: d.proximasLives.isEmpty
                ? 'sem agendamentos'
                : '${d.proximasLives.length} próximas agendadas',
            icon: Icons.videocam_outlined,
            iconBg: const Color(0x295AC8FA),
            iconColor: _HomeTheme.info,
          ),
          _KpiCard(
            label: 'Horas no ar',
            value: _fmtHrs(d.horasLive),
            sub: 'tempo total transmitido',
            icon: Icons.access_time,
            iconBg: const Color(0x2DAF7BFF),
            iconColor: _HomeTheme.accent,
          ),
          _KpiCard(
            label: 'Ticket médio',
            value: ticket > 0 ? _fmtMoney(ticket) : '—',
            valueFaint: ticket <= 0,
            sub: ticket > 0 ? 'por pedido' : 'sem vendas no período',
            icon: Icons.local_offer_outlined,
            iconBg: const Color(0x2934C759),
            iconColor: _HomeTheme.success,
          ),
        ],
      );
    });
  }
}

class _KpiCard extends StatelessWidget {
  final String label, value, sub;
  final IconData icon;
  final Color iconBg, iconColor;
  final bool valueFaint;
  const _KpiCard({
    required this.label,
    required this.value,
    required this.sub,
    required this.icon,
    required this.iconBg,
    required this.iconColor,
    this.valueFaint = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      decoration: BoxDecoration(
        color: context.h.cardBg,
        border: Border.all(color: context.h.hairline),
        borderRadius: BorderRadius.circular(_HomeTheme.radiusCard),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: iconBg,
                  borderRadius: BorderRadius.circular(7),
                ),
                child: Icon(icon, size: 12, color: iconColor),
              ),
              const SizedBox(width: 7),
              Expanded(
                child: Text(
                  label,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 11,
                    color: context.h.textMuted,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.fade,
            softWrap: false,
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.4,
              fontFeatures: const [FontFeature.tabularFigures()],
              color: valueFaint ? context.h.textFaint : context.h.textPrimary,
            ),
          ),
          Text(
            sub,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 10.5,
              color: context.h.textFaint,
            ),
          ),
        ],
      ),
    );
  }
}

// =============================================================
// ROW 3: META + PRÓXIMAS + MELHORES
// =============================================================

class _Row3MetaProximasMelhores extends StatelessWidget {
  final ClienteDashboard d;
  const _Row3MetaProximasMelhores({required this.d});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (ctx, c) {
      final isWide = c.maxWidth > 900;
      final cards = [
        _MetaCard(d: d),
        _ProximasLivesCard(proximas: d.proximasLives),
        _MelhoresHorariosCard(horarios: d.melhoresHorariosVenda),
      ];
      if (isWide) {
        return IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(flex: 12, child: cards[0]),
              const SizedBox(width: 10),
              Expanded(flex: 10, child: cards[1]),
              const SizedBox(width: 10),
              Expanded(flex: 10, child: cards[2]),
            ],
          ),
        );
      }
      return Column(
        children: [
          cards[0],
          const SizedBox(height: 10),
          cards[1],
          const SizedBox(height: 10),
          cards[2],
        ],
      );
    });
  }
}

class _MetaCard extends ConsumerWidget {
  final ClienteDashboard d;
  const _MetaCard({required this.d});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final hasMeta = d.metaGmv > 0;
    final pct = (d.pctMeta / 100).clamp(0.0, 1.0);
    final pctLabel = hasMeta ? '${d.pctMeta.round()}%' : '—';
    final statusLabel = _statusLabel(d.statusMeta);
    final statusColor = _statusColor(d.statusMeta);
    return _CardShell(
      titleIcon: Icons.local_fire_department_outlined,
      title: 'Meta do mês',
      trailing: InkWell(
        onTap: () => _editMeta(context, ref, d),
        borderRadius: BorderRadius.circular(8),
        child: Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            color: Colors.transparent,
            border: Border.all(color: context.h.hairline),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(Icons.edit_outlined, size: 13, color: context.h.textMuted),
        ),
      ),
      child: !hasMeta
          ? const _EmptyBlock(
              icon: Icons.flag_outlined,
              title: 'Meta não definida',
              subtitle: 'Defina sua meta mensal para acompanhar o progresso',
            )
          : Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                SizedBox(
                  width: 84,
                  height: 84,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      CustomPaint(
                        size: const Size(84, 84),
                        painter: _DonutPainter(progress: pct, color: _HomeTheme.primary, trackColor: context.h.bgElev2),
                      ),
                      Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(pctLabel,
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                letterSpacing: -0.3,
                                color: context.h.textPrimary,
                              )),
                          const SizedBox(height: 2),
                          Text('DA META',
                              style: TextStyle(
                                fontSize: 9,
                                color: context.h.textMuted,
                                letterSpacing: 1.4,
                                fontWeight: FontWeight.w600,
                              )),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      RichText(
                        text: TextSpan(
                          style: TextStyle(
                            color: context.h.textPrimary,
                            fontFeatures: const [FontFeature.tabularFigures()],
                          ),
                          children: [
                            TextSpan(text: _fmtMoney(d.gmvTotal),
                                style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, letterSpacing: -0.3)),
                            TextSpan(text: '  / ${_fmtMoney(d.metaGmv)}',
                                style: TextStyle(fontSize: 12, color: context.h.textMuted, fontWeight: FontWeight.w400)),
                          ],
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: statusColor.withValues(alpha: 0.16),
                          borderRadius: BorderRadius.circular(5),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            _Dot(color: statusColor),
                            const SizedBox(width: 5),
                            Text(statusLabel,
                                style: TextStyle(
                                  fontSize: 9.5,
                                  color: statusColor,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 1.2,
                                )),
                          ],
                        ),
                      ),
                      const SizedBox(height: 8),
                      RichText(
                        text: TextSpan(
                          style: TextStyle(fontSize: 11.5, color: context.h.textMuted),
                          children: [
                            const TextSpan(text: 'Faltam '),
                            TextSpan(
                              text: _fmtMoney(d.gmvFaltante),
                              style: TextStyle(color: context.h.textPrimary, fontWeight: FontWeight.w600),
                            ),
                            const TextSpan(text: ' para fechar a meta'),
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

  static Future<void> _editMeta(BuildContext context, WidgetRef ref, ClienteDashboard d) async {
    final period = ref.read(clientePeriodProvider);
    final ctrl = TextEditingController(text: d.metaGmv > 0 ? d.metaGmv.toStringAsFixed(0) : '');
    const dialogBg = Color(0xFF141416);
    const dialogText = Color(0xFFF5F0EB);
    const dialogMuted = Color(0xFF75716D);
    const dialogFaint = Color(0xFF4A4744);
    const dialogElev2 = Color(0xFF1E1E22);
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: dialogBg,
        title: Text(
          'Meta de GMV — ${period.mes.toString().padLeft(2, '0')}/${period.ano}',
          style: const TextStyle(color: dialogText, fontSize: 16),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Defina sua meta de faturamento mensal (R\$).',
              style: TextStyle(color: dialogMuted, fontSize: 12),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: ctrl,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              autofocus: true,
              cursorColor: _HomeTheme.primary,
              style: const TextStyle(color: dialogText),
              decoration: InputDecoration(
                prefixText: 'R\$ ',
                prefixStyle: const TextStyle(color: dialogMuted),
                hintText: 'Ex: 50000',
                hintStyle: const TextStyle(color: dialogFaint),
                filled: true,
                fillColor: dialogElev2,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar', style: TextStyle(color: dialogMuted)),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: _HomeTheme.primary),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Salvar'),
          ),
        ],
      ),
    );
    if (saved != true) return;
    final raw = ctrl.text.replaceAll(RegExp(r'[^\d,.]'), '').replaceAll(',', '.');
    final value = double.tryParse(raw) ?? 0;
    if (value < 0) return;
    try {
      await ref
          .read(clienteDashboardProvider.notifier)
          .updateMeta(period.ano, period.mes, value);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Meta atualizada.'), backgroundColor: _HomeTheme.success),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao salvar meta: $e'), backgroundColor: _HomeTheme.danger),
        );
      }
    }
  }

  static String _statusLabel(String s) {
    switch (s.toLowerCase()) {
      case 'no_ritmo':
      case 'no ritmo':
        return 'NO RITMO';
      case 'atrasado':
        return 'ATRASADO';
      case 'adiantado':
        return 'ADIANTADO';
      case 'concluido':
      case 'concluído':
        return 'CONCLUÍDO';
      default:
        return s.toUpperCase();
    }
  }

  static Color _statusColor(String s) {
    switch (s.toLowerCase()) {
      case 'atrasado':
        return _HomeTheme.danger;
      case 'adiantado':
      case 'concluido':
      case 'concluído':
        return _HomeTheme.success;
      default:
        return _HomeTheme.warning;
    }
  }
}

class _Dot extends StatelessWidget {
  final Color color;
  const _Dot({required this.color});
  @override
  Widget build(BuildContext context) => Container(
        width: 5,
        height: 5,
        decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      );
}

class _DonutPainter extends CustomPainter {
  final double progress;
  final Color color;
  final Color trackColor;
  _DonutPainter({required this.progress, required this.color, required this.trackColor});

  @override
  void paint(Canvas canvas, Size size) {
    const stroke = 9.0;
    final rect = Rect.fromCircle(
      center: size.center(Offset.zero),
      radius: math.min(size.width, size.height) / 2 - stroke / 2,
    );
    final track = Paint()
      ..color = trackColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke;
    canvas.drawArc(rect, 0, math.pi * 2, false, track);

    if (progress > 0) {
      final p = Paint()
        ..color = color
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..strokeCap = StrokeCap.round;
      canvas.drawArc(rect, -math.pi / 2, math.pi * 2 * progress, false, p);
    }
  }

  @override
  bool shouldRepaint(covariant _DonutPainter old) =>
      old.progress != progress || old.color != color || old.trackColor != trackColor;
}

class _ProximasLivesCard extends StatelessWidget {
  final List<ProximaLive> proximas;
  const _ProximasLivesCard({required this.proximas});

  @override
  Widget build(BuildContext context) {
    if (proximas.isEmpty) {
      return const _CardShell(
        titleIcon: Icons.calendar_today_outlined,
        title: 'Próximas lives',
        trailing: _MiniTag('0 agendadas'),
        child: _EmptyBlock(
          icon: Icons.calendar_today_outlined,
          title: 'Nenhuma live agendada',
          subtitle: 'Quando agendar, aparecerão aqui em ordem cronológica',
          cta: '+ Solicitar nova live',
        ),
      );
    }
    return _CardShell(
      titleIcon: Icons.calendar_today_outlined,
      title: 'Próximas lives',
      trailing: _MiniTag('${proximas.length} agendada${proximas.length == 1 ? '' : 's'}'),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: proximas.take(4).map((p) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: _ProximaLiveRow(p: p),
            )).toList(),
      ),
    );
  }
}

class _ProximaLiveRow extends StatelessWidget {
  final ProximaLive p;
  const _ProximaLiveRow({required this.p});

  @override
  Widget build(BuildContext context) {
    final dataLabel = p.data != null ? DateFormat('dd/MM', 'pt_BR').format(p.data!) : '—';
    final horaLabel = p.horaInicio ?? '—';
    return Row(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: _HomeTheme.primarySoft,
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Icon(Icons.videocam_outlined, size: 14, color: _HomeTheme.primary),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Cabine ${p.cabineNumero}',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: context.h.textPrimary,
                  )),
              Text('$dataLabel · $horaLabel · ${p.status}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 10.5, color: context.h.textMuted)),
            ],
          ),
        ),
      ],
    );
  }
}

class _MelhoresHorariosCard extends StatelessWidget {
  final List<HorarioVenda> horarios;
  const _MelhoresHorariosCard({required this.horarios});

  @override
  Widget build(BuildContext context) {
    if (horarios.isEmpty) {
      return const _CardShell(
        titleIcon: Icons.access_time,
        title: 'Melhores horários',
        trailing: _MiniTag('GMV / hora'),
        child: _EmptyBlock(
          icon: Icons.bar_chart,
          title: 'Sem vendas no período',
          subtitle: 'Os horários campeões aparecerão aqui após algumas lives',
        ),
      );
    }
    final sorted = [...horarios]..sort((a, b) => b.gmvTotal.compareTo(a.gmvTotal));
    final top = sorted.take(4).toList();
    final maxGmv = top.first.gmvTotal == 0 ? 1.0 : top.first.gmvTotal;
    return _CardShell(
      titleIcon: Icons.access_time,
      title: 'Melhores horários',
      trailing: const _MiniTag('GMV / hora'),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: top.map((h) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                children: [
                  SizedBox(
                    width: 50,
                    child: Text(h.label,
                        style: TextStyle(fontSize: 11.5, color: context.h.textPrimary, fontWeight: FontWeight.w600)),
                  ),
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: Container(
                        height: 7,
                        color: context.h.bgElev2,
                        child: FractionallySizedBox(
                          alignment: Alignment.centerLeft,
                          widthFactor: (h.gmvTotal / maxGmv).clamp(0.0, 1.0),
                          child: Container(color: _HomeTheme.primary),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 70,
                    child: Text(_fmtMoney(h.gmvTotal),
                        textAlign: TextAlign.right,
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: context.h.textPrimary)),
                  ),
                ],
              ),
            )).toList(),
      ),
    );
  }
}

// =============================================================
// EVOLUÇÃO MENSAL
// =============================================================

class _EvolucaoMensal extends StatelessWidget {
  final List<SerieMensal> series;
  const _EvolucaoMensal({required this.series});

  @override
  Widget build(BuildContext context) {
    if (series.isEmpty) {
      return const _CardShell(
        titleIcon: Icons.trending_up,
        title: 'Evolução mensal',
        subtitle: 'GMV, horas no ar e ROAS · últimos meses',
        trailing: _MiniTag('sem histórico'),
        child: _EmptyBlock(
          icon: Icons.bar_chart,
          title: 'Sem dados históricos',
          subtitle: 'A evolução mensal aparecerá aqui após o primeiro fechamento de mês',
        ),
      );
    }
    final now = DateTime.now();
    final maxGmv = series.map((s) => s.gmvTotal).fold<double>(0, math.max);
    return _CardShell(
      titleIcon: Icons.trending_up,
      title: 'Evolução mensal',
      subtitle: 'GMV, horas no ar e ROAS · últimos ${series.length} meses',
      trailing: _MiniTag('${series.length.toString().padLeft(2, '0')} meses'),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: series
            .map((s) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 3),
                  child: _EvoRow(
                    d: _EvoData(
                      '${s.mes.toString().padLeft(2, '0')}/${s.ano}',
                      _fmtMoney(s.gmvTotal),
                      s.totalLives,
                      _fmtHrs(s.horasLive),
                      s.roas.toStringAsFixed(2),
                      maxGmv == 0 ? 0 : (s.gmvTotal / maxGmv).clamp(0.0, 1.0),
                      s.mes == now.month && s.ano == now.year,
                    ),
                  ),
                ))
            .toList(),
      ),
    );
  }
}

class _EvoData {
  final String month, gmv, hrs, roas;
  final int lives;
  final double width;
  final bool current;
  const _EvoData(this.month, this.gmv, this.lives, this.hrs, this.roas, this.width, this.current);
}

class _EvoRow extends StatelessWidget {
  final _EvoData d;
  const _EvoRow({required this.d});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
      decoration: BoxDecoration(
        color: d.current ? _HomeTheme.primarySoft : Colors.transparent,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 92,
            child: Row(
              children: [
                Text(d.month,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: context.h.textPrimary,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    )),
                if (d.current) ...[
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                    decoration: BoxDecoration(
                      color: _HomeTheme.primary,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text('ATUAL',
                        style: TextStyle(
                          fontSize: 8.5,
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.6,
                        )),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: Container(
                height: 7,
                color: context.h.bgElev2,
                child: FractionallySizedBox(
                  alignment: Alignment.centerLeft,
                  widthFactor: d.width.clamp(0.0, 1.0),
                  child: Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(colors: [
                        _HomeTheme.primary,
                        _HomeTheme.primaryLight,
                      ]),
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          SizedBox(
            width: 168,
            child: Text(
              '${d.lives} lives · ${d.hrs} · ROAS ${d.roas}',
              style: TextStyle(
                fontSize: 10.5,
                color: context.h.textMuted,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
          ),
          SizedBox(
            width: 80,
            child: Text(
              d.gmv,
              textAlign: TextAlign.right,
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
                color: context.h.textPrimary,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// =============================================================
// LIVES DETALHADAS
// =============================================================

class _LivesDetalhadas extends StatelessWidget {
  final ClienteDashboard d;
  const _LivesDetalhadas({required this.d});

  @override
  Widget build(BuildContext context) {
    final lives = d.lives;
    final totalLives = d.totalLives;
    final viewers = d.viewers;
    final comentarios = d.comentarios;
    final likes = d.likes;
    final horas = d.horasLive;
    final investido = d.valorInvestidoLives > 0 ? d.valorInvestidoLives : d.valorInvestidoMes;
    return _CardShell(
      titleIcon: Icons.videocam_outlined,
      title: 'Lives detalhadas',
      subtitle: 'desempenho individual de cada transmissão',
      trailing: _MiniTag('$totalLives lives no período'),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          LayoutBuilder(builder: (ctx, c) {
            final cross = c.maxWidth < 600 ? 2 : 4;
            return GridView.count(
              crossAxisCount: cross,
              mainAxisSpacing: 8,
              crossAxisSpacing: 8,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              childAspectRatio: 2.4,
              children: [
                _DetailKpi(
                  icon: Icons.videocam_outlined, label: 'LIVES', value: '$totalLives',
                  sub: '${_fmtHrs(horas)} transmitidas',
                  iconBg: const Color(0x29FF453A), iconColor: _HomeTheme.danger,
                ),
                _DetailKpi(
                  icon: Icons.visibility_outlined, label: 'VIEWERS', value: _fmtInt(viewers),
                  sub: _fmtInt(viewers) + ' totais',
                  iconBg: const Color(0x295AC8FA), iconColor: _HomeTheme.info,
                ),
                _DetailKpi(
                  icon: Icons.chat_bubble_outline, label: 'COMENTÁRIOS', value: _fmtInt(comentarios),
                  sub: '${_fmtInt(likes)} likes total',
                  iconBg: const Color(0x2DAF7BFF), iconColor: _HomeTheme.accent,
                ),
                _DetailKpi(
                  icon: Icons.attach_money, label: 'INVESTIDO', value: investido > 0 ? _fmtMoney(investido) : '—',
                  sub: 'ROAS ${d.roas.toStringAsFixed(2)}',
                  iconBg: _HomeTheme.primarySoft, iconColor: _HomeTheme.primary,
                ),
              ],
            );
          }),
          const SizedBox(height: 12),
          if (lives.isEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              decoration: BoxDecoration(
                color: context.h.bgElev1,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: context.h.hairline),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.videocam_outlined, size: 13, color: context.h.textMuted),
                  const SizedBox(width: 8),
                  Text(
                    'Nenhuma live registrada neste período',
                    style: TextStyle(fontSize: 11.5, color: context.h.textMuted),
                  ),
                ],
              ),
            )
          else
            Column(
              children: lives.take(5).map((l) => Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: _LiveListRow(l: l),
                  )).toList(),
            ),
          const SizedBox(height: 10),
          const _DashedCta(label: '+ Solicitar nova live'),
        ],
      ),
    );
  }
}

class _LiveListRow extends StatelessWidget {
  final ClienteLive l;
  const _LiveListRow({required this.l});

  @override
  Widget build(BuildContext context) {
    final dataLabel = l.iniciadoEm != null
        ? DateFormat('dd/MM HH:mm', 'pt_BR').format(l.iniciadoEm!)
        : '—';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: context.h.bgElev1,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: context.h.hairline),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 90,
            child: Text(dataLabel,
                style: TextStyle(fontSize: 11.5, color: context.h.textPrimary, fontWeight: FontWeight.w600)),
          ),
          Expanded(
            child: Text('GMV ${_fmtMoney(l.gmv)}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 11, color: context.h.textMuted)),
          ),
        ],
      ),
    );
  }
}

class _DetailKpi extends StatelessWidget {
  final IconData icon;
  final String label, value, sub;
  final Color iconBg, iconColor;
  const _DetailKpi({
    required this.icon,
    required this.label,
    required this.value,
    required this.sub,
    required this.iconBg,
    required this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      decoration: BoxDecoration(
        color: context.h.bgElev1,
        border: Border.all(color: context.h.hairline),
        borderRadius: BorderRadius.circular(11),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: iconBg,
                  borderRadius: BorderRadius.circular(7),
                ),
                child: Icon(icon, size: 12, color: iconColor),
              ),
              const SizedBox(width: 7),
              Expanded(
                child: Text(label,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 10.5,
                      color: context.h.textMuted,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.5,
                    )),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(value,
              maxLines: 1,
              overflow: TextOverflow.fade,
              softWrap: false,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.4,
                color: context.h.textPrimary,
                fontFeatures: const [FontFeature.tabularFigures()],
              )),
          Text(sub,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 10.5,
                color: context.h.textFaint,
                fontFeatures: const [FontFeature.tabularFigures()],
              )),
        ],
      ),
    );
  }
}

// =============================================================
// PRIMITIVES
// =============================================================

class _CardShell extends StatelessWidget {
  final IconData titleIcon;
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final Widget child;
  const _CardShell({
    required this.titleIcon,
    required this.title,
    this.subtitle,
    this.trailing,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
      decoration: BoxDecoration(
        color: context.h.cardBg,
        border: Border.all(color: context.h.hairline),
        borderRadius: BorderRadius.circular(_HomeTheme.radiusCard),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        Icon(titleIcon, size: 14, color: _HomeTheme.primary),
                        const SizedBox(width: 7),
                        Flexible(
                          child: Text(title,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: context.h.textPrimary,
                              )),
                        ),
                      ],
                    ),
                    if (subtitle != null) ...[
                      const SizedBox(height: 2),
                      Text(subtitle!,
                          style: TextStyle(
                            fontSize: 11.5,
                            color: context.h.textMuted,
                          )),
                    ],
                  ],
                ),
              ),
              if (trailing != null) trailing!,
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

class _MiniTag extends StatelessWidget {
  final String text;
  const _MiniTag(this.text);
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: context.h.bgElev1,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(text,
          style: TextStyle(
            fontSize: 10.5,
            color: context.h.textMuted,
          )),
    );
  }
}

class _EmptyBlock extends StatelessWidget {
  final IconData icon;
  final String title, subtitle;
  final String? cta;
  final VoidCallback? onCta;
  const _EmptyBlock({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.cta,
    this.onCta,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: context.h.bgElev1,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, size: 17, color: context.h.textFaint),
          ),
          const SizedBox(height: 8),
          Text(title,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: context.h.textPrimary,
              )),
          const SizedBox(height: 3),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Text(subtitle,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 11,
                  color: context.h.textMuted,
                )),
          ),
          if (cta != null) ...[
            const SizedBox(height: 10),
            _OutlinedCta(label: cta!, onTap: onCta ?? () => _goSolicitar(context)),
          ],
        ],
      ),
    );
  }
}

class _OutlinedCta extends StatelessWidget {
  final String label;
  final VoidCallback? onTap;
  const _OutlinedCta({required this.label, this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: _HomeTheme.primarySoft,
          border: Border.all(color: _HomeTheme.primary),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(label,
            style: const TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w600,
              color: _HomeTheme.primary,
            )),
      ),
    );
  }
}

void _goSolicitar(BuildContext context) {
  Navigator.of(context).pushNamed(AppRoutes.clienteCabinesTabs);
}

class _DashedCta extends StatelessWidget {
  final String label;
  final VoidCallback? onTap;
  const _DashedCta({required this.label, this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap ?? () => _goSolicitar(context),
      borderRadius: BorderRadius.circular(10),
      child: CustomPaint(
        painter: _DashedBorderPainter(
          color: _HomeTheme.primary,
          radius: 10,
          strokeWidth: 1,
          dashLength: 6,
          gapLength: 4,
        ),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 11),
          alignment: Alignment.center,
          child: Text(label,
              style: const TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                color: _HomeTheme.primary,
              )),
        ),
      ),
    );
  }
}

class _DashedBorderPainter extends CustomPainter {
  final Color color;
  final double radius, strokeWidth, dashLength, gapLength;
  _DashedBorderPainter({
    required this.color,
    required this.radius,
    required this.strokeWidth,
    required this.dashLength,
    required this.gapLength,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final rect = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, 0, size.width, size.height),
      Radius.circular(radius),
    );
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;

    final path = Path()..addRRect(rect);
    final metrics = path.computeMetrics();
    for (final m in metrics) {
      double dist = 0;
      while (dist < m.length) {
        final next = math.min(dist + dashLength, m.length);
        canvas.drawPath(m.extractPath(dist, next), paint);
        dist = next + gapLength;
      }
    }
  }

  @override
  bool shouldRepaint(covariant _DashedBorderPainter old) => old.color != color || old.radius != radius;
}
