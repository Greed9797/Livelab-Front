import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../../models/analytics_dashboard.dart';
import '../../providers/analytics_dashboard_provider.dart';
import '../../providers/clientes_provider.dart';
import '../../routes/app_routes.dart';
import '../../livelab/core/responsive.dart';
import '../../livelab/theme/livelab_theme.dart';
import '../../livelab/theme/tokens.dart';
import '../../livelab/widgets/livelab_scaffold.dart';
import '../../services/api_service.dart';

String _formatDeltaPct(num delta, bool positive) {
  final abs = delta.abs();
  // Cap em ±999% — valores acima viram setinha tripla.
  // Ex: período anterior ~zero gera deltas como +42854% — sem sentido visualmente.
  if (abs > 999) return positive ? '↑↑↑' : '↓↓↓';
  return '${positive ? '+' : ''}${delta.toStringAsFixed(1)}%';
}

class AnalyticsDashboardScreen extends ConsumerStatefulWidget {
  const AnalyticsDashboardScreen({super.key});

  @override
  ConsumerState<AnalyticsDashboardScreen> createState() => _AnalyticsDashboardScreenState();
}

class _AnalyticsDashboardScreenState extends ConsumerState<AnalyticsDashboardScreen> {
  void _refresh() {
    ref.read(analyticsDashboardProvider.notifier).refresh();
  }

  void _setPreset(AnalyticsPreset p) {
    ref.read(dashboardFiltrosProvider.notifier).setPreset(p);
  }

  Future<void> _openCustomRangePicker() async {
    final cur = ref.read(dashboardFiltrosProvider);
    final result = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      initialDateRange: DateTimeRange(start: cur.from, end: cur.to),
      helpText: 'Selecione o período',
      cancelText: 'Cancelar',
      confirmText: 'Aplicar',
      saveText: 'Aplicar',
      builder: (ctx, child) {
        final t = ctx.llTokens;
        return Theme(
          data: Theme.of(ctx).copyWith(
            colorScheme: Theme.of(ctx).colorScheme.copyWith(
                  primary: t.primary,
                  onPrimary: Colors.white,
                  surface: t.bgElev1,
                  onSurface: t.textPrimary,
                ),
          ),
          child: child!,
        );
      },
    );
    if (result != null) {
      ref.read(dashboardFiltrosProvider.notifier).setCustomRange(result.start, result.end);
    }
  }

  @override
  Widget build(BuildContext context) {
    final asyncData = ref.watch(analyticsDashboardProvider);

    return LivelabScaffold(
      currentRoute: AppRoutes.analyticsDashboard,
      onRefresh: _refresh,
      child: asyncData.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              'Erro: ${ApiService.extractErrorMessage(e)}',
              style: const TextStyle(color: Colors.red),
            ),
          ),
        ),
        data: (data) => _content(data),
      ),
    );
  }

  Widget _content(AnalyticsDashboardData data) {
    final t = context.llTokens;
    final r = LlResponsive.of(context);
    final pad = r.isMobile ? 16.0 : 28.0;

    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(pad, 16, pad, 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _pageHeader(t),
          const SizedBox(height: 18),
          _filtersBar(t),
          const SizedBox(height: 16),
          _kpiStrip(t, data),
          const SizedBox(height: 24),
          _sectionTitle(t, 'Desempenho mensal', 'GMV e volume de lives nos últimos 12 meses'),
          const SizedBox(height: 8),
          _row2(
            r,
            _faturamentoCard(t, data),
            _vendasCard(t, data),
          ),
          const SizedBox(height: 24),
          _sectionTitle(t, 'Inteligência comercial', 'Prime time e heatmap de conversão por horário'),
          const SizedBox(height: 8),
          _row2(
            r,
            _peakHoursCard(t, data),
            _heatmapCard(t, data),
          ),
          const SizedBox(height: 24),
          _sectionTitle(t, 'Horas de live e ranking', 'Distribuição de horas e top apresentadores'),
          const SizedBox(height: 8),
          _row2(
            r,
            _horasCard(t, data),
            _rankingCard(t, data),
          ),
        ],
      ),
    );
  }

  Widget _row2(LlResponsive r, Widget a, Widget b) {
    if (r.isMobile) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [a, const SizedBox(height: 12), b],
      );
    }
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(child: a),
        const SizedBox(width: 12),
        Expanded(child: b),
      ],
    );
  }

  Widget _pageHeader(LlTokens t) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '— PERFORMANCE COMERCIAL',
                style: TextStyle(
                  color: t.primary,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: 4),
              Text.rich(
                TextSpan(
                  children: [
                    TextSpan(
                      text: 'Painel de ',
                      style: TextStyle(
                        color: t.textPrimary,
                        fontSize: 32,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.9,
                      ),
                    ),
                    TextSpan(
                      text: 'Analytics',
                      style: GoogleFonts.instrumentSerif(
                        color: t.primary,
                        fontStyle: FontStyle.italic,
                        fontSize: 36,
                        fontWeight: FontWeight.w400,
                        letterSpacing: -1,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Análise de faturamento e performance · todas as unidades',
                style: TextStyle(color: t.textMuted, fontSize: 13),
              ),
            ],
          ),
        ),
        Material(
          color: t.bgElev1,
          borderRadius: BorderRadius.circular(12),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: _refresh,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                border: Border.all(color: t.border),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.refresh, size: 14, color: t.textSecondary),
                  const SizedBox(width: 6),
                  Text(
                    'Atualizar',
                    style: TextStyle(
                      color: t.textSecondary,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _filtersBar(LlTokens t) {
    final filtros = ref.watch(dashboardFiltrosProvider);
    final fmt = DateFormat('dd/MM/yyyy', 'pt_BR');
    final rangeLabel = filtros.from == filtros.to
        ? fmt.format(filtros.from)
        : '${fmt.format(filtros.from)} → ${fmt.format(filtros.to)}';

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        _presetPill(t, AnalyticsPreset.hoje, filtros.preset),
        _presetPill(t, AnalyticsPreset.ontem, filtros.preset),
        _presetPill(t, AnalyticsPreset.dias7, filtros.preset),
        _presetPill(t, AnalyticsPreset.dias14, filtros.preset),
        _presetPill(t, AnalyticsPreset.mes1, filtros.preset),
        _customRangeBtn(t, filtros.preset == AnalyticsPreset.custom),
        _clienteFilterBtn(t, filtros.clienteId),
        const SizedBox(width: 8),
        Padding(
          padding: const EdgeInsets.only(left: 4),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.calendar_today_outlined, size: 13, color: t.textMuted),
              const SizedBox(width: 6),
              Text(
                rangeLabel,
                style: TextStyle(color: t.textMuted, fontSize: 11, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _clienteFilterBtn(LlTokens t, String? selectedId) {
    final clientesAsync = ref.watch(clientesProvider);
    final clientes = clientesAsync.valueOrNull ?? const [];
    final selecionado = selectedId == null
        ? null
        : clientes.where((c) => c.id == selectedId).firstOrNull;
    final label = selecionado != null
        ? selecionado.nome
        : (selectedId == null ? 'Todos os clientes' : 'Cliente');
    final isActive = selectedId != null;

    return Material(
      color: isActive ? t.primarySoft : t.bgElev1,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: () async {
          if (clientes.isEmpty) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Sem clientes carregados')),
            );
            return;
          }
          final picked = await showModalBottomSheet<String?>(
            context: context,
            backgroundColor: t.bgElev2,
            shape: const RoundedRectangleBorder(
              borderRadius:
                  BorderRadius.vertical(top: Radius.circular(16)),
            ),
            builder: (sheetCtx) => SafeArea(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Text('Filtrar por cliente',
                            style: TextStyle(
                                color: t.textPrimary,
                                fontSize: 14,
                                fontWeight: FontWeight.w800)),
                        const Spacer(),
                        TextButton(
                          onPressed: () => Navigator.pop(sheetCtx, null),
                          child: const Text('Limpar'),
                        ),
                      ],
                    ),
                  ),
                  Flexible(
                    child: ListView.builder(
                      shrinkWrap: true,
                      itemCount: clientes.length,
                      itemBuilder: (_, i) {
                        final c = clientes[i];
                        final isSel = c.id == selectedId;
                        return ListTile(
                          leading: Icon(
                            isSel
                                ? Icons.radio_button_checked
                                : Icons.radio_button_off,
                            color: isSel ? t.primary : t.textMuted,
                          ),
                          title: Text(c.nome,
                              style: TextStyle(color: t.textPrimary)),
                          subtitle: c.cidade != null && c.cidade!.isNotEmpty
                              ? Text(c.cidade!,
                                  style: TextStyle(color: t.textMuted, fontSize: 12))
                              : null,
                          onTap: () => Navigator.pop(sheetCtx, c.id),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          );
          if (!mounted) return;
          // null distingue "limpar" de "cancelar". Como ambos retornam null,
          // só alteramos quando o resultado vem via toque (Limpar ou item).
          // Aqui assumimos toque qualquer = troca; cancelar via swipe não chama.
          ref
              .read(dashboardFiltrosProvider.notifier)
              .setClienteId(picked);
        },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
          decoration: BoxDecoration(
            border: Border.all(color: isActive ? t.primary : t.border),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.person_outline,
                  size: 14,
                  color: isActive ? t.primary : t.textSecondary),
              const SizedBox(width: 6),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 160),
                child: Text(
                  label,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: isActive ? t.primary : t.textSecondary,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _presetPill(LlTokens t, AnalyticsPreset preset, AnalyticsPreset active) {
    final isActive = preset == active;
    return Material(
      color: isActive ? t.primarySoft : t.bgElev1,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: () => _setPreset(preset),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
          decoration: BoxDecoration(
            border: Border.all(color: isActive ? t.primary : t.border),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            preset.label,
            style: TextStyle(
              color: isActive ? t.primary : t.textSecondary,
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ),
    );
  }

  Widget _customRangeBtn(LlTokens t, bool active) {
    return Material(
      color: active ? t.primarySoft : t.bgElev1,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: _openCustomRangePicker,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
          decoration: BoxDecoration(
            border: Border.all(color: active ? t.primary : t.border),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.edit_calendar_outlined, size: 14, color: active ? t.primary : t.textSecondary),
              const SizedBox(width: 6),
              Text(
                'Personalizado',
                style: TextStyle(
                  color: active ? t.primary : t.textSecondary,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _kpiStrip(LlTokens t, AnalyticsDashboardData d) {
    final fmtBrl = NumberFormat.simpleCurrency(locale: 'pt_BR', decimalDigits: 0);
    final kpis = d.kpis;
    final cards = [
      _KpiSpec(
        icon: Icons.attach_money,
        iconColor: t.primary,
        iconBg: t.primarySoft,
        label: 'Faturamento total',
        value: fmtBrl.format(kpis.faturamentoTotal),
        sub: 'GMV consolidado · período',
        delta: kpis.deltaFaturamento,
      ),
      _KpiSpec(
        icon: Icons.shopping_cart_outlined,
        iconColor: const Color(0xFF5AC8FA),
        iconBg: const Color(0xFF5AC8FA).withValues(alpha: 0.16),
        label: 'Total de vendas',
        value: '${kpis.totalVendas} ${kpis.totalVendas == 1 ? "venda" : "vendas"}',
        sub: 'encerradas no período',
        delta: kpis.deltaVendas,
      ),
      _KpiSpec(
        icon: Icons.trending_up,
        iconColor: const Color(0xFF34C759),
        iconBg: const Color(0xFF34C759).withValues(alpha: 0.16),
        label: 'Ticket médio',
        value: fmtBrl.format(kpis.ticketMedio),
        sub: 'por live encerrada',
        delta: kpis.deltaTicket,
      ),
      _KpiSpec(
        icon: Icons.people_outline,
        iconColor: const Color(0xFFAF7BFF),
        iconBg: const Color(0xFFAF7BFF).withValues(alpha: 0.18),
        label: 'Audiência média',
        value: _compactInt(kpis.audienciaMedia),
        sub: 'viewers por live',
        delta: kpis.deltaAudiencia,
      ),
    ];

    return LayoutBuilder(
      builder: (c, box) {
        final cols = box.maxWidth < 720 ? 2 : 4;
        return GridView.builder(
          primary: false,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: cols,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            mainAxisExtent: 138,
          ),
          itemCount: cards.length,
          itemBuilder: (_, i) => _kpiCard(t, cards[i]),
        );
      },
    );
  }

  Widget _kpiCard(LlTokens t, _KpiSpec spec) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: t.bgElev1,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: t.border),
        boxShadow: t.shadowCard,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: spec.iconBg,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(spec.icon, size: 18, color: spec.iconColor),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  spec.label,
                  style: TextStyle(color: t.textSecondary, fontSize: 12, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          Text(
            spec.value,
            style: TextStyle(
              color: t.textPrimary,
              fontSize: 24,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.6,
              height: 1.05,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          Row(
            children: [
              Expanded(
                child: Text(
                  spec.sub,
                  style: TextStyle(color: t.textMuted, fontSize: 11),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (spec.delta != 0) _deltaPill(t, spec.delta),
            ],
          ),
        ],
      ),
    );
  }

  Widget _deltaPill(LlTokens t, int delta) {
    final positive = delta >= 0;
    final color = positive ? t.success : t.danger;
    final bg = positive ? t.successSoft : t.dangerSoft;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(6)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(positive ? Icons.trending_up : Icons.trending_down, size: 11, color: color),
          const SizedBox(width: 3),
          Text(
            _formatDeltaPct(delta, positive),
            style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }

  Widget _sectionTitle(LlTokens t, String title, String sub) {
    return Padding(
      padding: const EdgeInsets.only(top: 4, bottom: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            margin: const EdgeInsets.only(top: 6, right: 8),
            width: 4,
            height: 16,
            decoration: BoxDecoration(color: t.primary, borderRadius: BorderRadius.circular(2)),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(color: t.textPrimary, fontSize: 16, fontWeight: FontWeight.w700, letterSpacing: -0.2),
                ),
                Text(
                  sub,
                  style: TextStyle(color: t.textMuted, fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _cardShell(LlTokens t, {required String title, required String subtitle, Widget? tag, required Widget body, double? minHeight}) {
    return Container(
      constraints: BoxConstraints(minHeight: minHeight ?? 0),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: t.bgElev1,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: t.border),
        boxShadow: t.shadowCard,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: TextStyle(color: t.textPrimary, fontSize: 13, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    Text(subtitle, style: TextStyle(color: t.textMuted, fontSize: 11)),
                  ],
                ),
              ),
              if (tag != null) tag,
            ],
          ),
          const SizedBox(height: 16),
          body,
        ],
      ),
    );
  }

  Widget _tag(LlTokens t, String text, {Color? color, Color? bg}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: bg ?? t.bgElev2,
        borderRadius: BorderRadius.circular(7),
      ),
      child: Text(
        text,
        style: TextStyle(color: color ?? t.textSecondary, fontSize: 11, fontWeight: FontWeight.w700),
      ),
    );
  }

  /// Gera lista de últimos 12 meses no formato "YYYY-MM" terminando no mês de `to`.
  List<String> _last12Months() {
    final filtros = ref.read(dashboardFiltrosProvider);
    final out = <String>[];
    for (var i = 11; i >= 0; i--) {
      final d = DateTime(filtros.to.year, filtros.to.month - i, 1);
      out.add('${d.year}-${d.month.toString().padLeft(2, '0')}');
    }
    return out;
  }

  Widget _faturamentoCard(LlTokens t, AnalyticsDashboardData d) {
    final byMes = {for (final m in d.faturamentoMensal) m.mes: m.gmv};
    final fat = _last12Months()
        .map((m) => FaturamentoMensal(mes: m, gmv: byMes[m] ?? 0))
        .toList();
    final maxV = fat.fold<double>(1, (a, b) => b.gmv > a ? b.gmv : a);
    final total = fat.fold<double>(0, (a, b) => a + b.gmv);
    final fmt = NumberFormat.simpleCurrency(locale: 'pt_BR', decimalDigits: 0);
    return _cardShell(
      t,
      title: 'Faturamento mensal (GMV)',
      subtitle: 'Últimos 12 meses',
      tag: _tag(t, 'total ${_compactBrl(total)}'),
      minHeight: 280,
      body: SizedBox(
        height: 200,
        child: fat.isEmpty
            ? _emptyState(t, 'Sem dados de faturamento')
            : Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: fat.map((m) {
                  final h = (m.gmv / maxV * 160).clamp(0.0, 160.0);
                  final isLast = m == fat.last;
                  return Expanded(
                    child: Tooltip(
                      message: '${_mesLabel(m.mes)} · ${fmt.format(m.gmv)}',
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 3),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            if (m.gmv > 0)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 4),
                                child: Text(
                                  _compactBrl(m.gmv),
                                  style: TextStyle(color: t.textSecondary, fontSize: 9, fontWeight: FontWeight.w600),
                                ),
                              ),
                            Container(
                              height: h.toDouble(),
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.topCenter,
                                  end: Alignment.bottomCenter,
                                  colors: [t.primary, t.primary.withValues(alpha: 0.5)],
                                ),
                                borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              _mesLabel(m.mes).substring(0, 3),
                              style: TextStyle(
                                color: isLast ? t.primary : t.textMuted,
                                fontSize: 10,
                                fontWeight: isLast ? FontWeight.w700 : FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
      ),
    );
  }

  Widget _vendasCard(LlTokens t, AnalyticsDashboardData d) {
    final byMes = {for (final m in d.vendasMensal) m.mes: m.totalVendas};
    final vendas = _last12Months()
        .map((m) => VendasMensal(mes: m, totalVendas: byMes[m] ?? 0))
        .toList();
    final maxV = vendas.fold<int>(1, (a, b) => b.totalVendas > a ? b.totalVendas : a);
    final total = vendas.fold<int>(0, (a, b) => a + b.totalVendas);
    return _cardShell(
      t,
      title: 'Vendas mensais',
      subtitle: 'Lives encerradas por mês',
      tag: _tag(t, 'total $total'),
      minHeight: 280,
      body: SizedBox(
        height: 200,
        child: vendas.isEmpty
            ? _emptyState(t, 'Sem vendas no período')
            : Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: vendas.map((m) {
                  final h = (m.totalVendas / maxV * 160).clamp(0.0, 160.0);
                  final isLast = m == vendas.last;
                  return Expanded(
                    child: Tooltip(
                      message: '${_mesLabel(m.mes)} · ${m.totalVendas} ${m.totalVendas == 1 ? "venda" : "vendas"}',
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 3),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            if (m.totalVendas > 0)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 4),
                                child: Text(
                                  '${m.totalVendas}',
                                  style: TextStyle(color: t.textSecondary, fontSize: 9, fontWeight: FontWeight.w600),
                                ),
                              ),
                            Container(
                              height: h.toDouble(),
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.topCenter,
                                  end: Alignment.bottomCenter,
                                  colors: [t.info, t.info.withValues(alpha: 0.5)],
                                ),
                                borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              _mesLabel(m.mes).substring(0, 3),
                              style: TextStyle(
                                color: isLast ? t.info : t.textMuted,
                                fontSize: 10,
                                fontWeight: isLast ? FontWeight.w700 : FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
      ),
    );
  }

  Widget _peakHoursCard(LlTokens t, AnalyticsDashboardData d) {
    final hoursList = List.generate(16, (i) => 6 + i); // 6h..21h
    final byHour = {for (final p in d.peakHours) p.hora: p.gmv};
    final maxV = hoursList.fold<double>(1, (a, h) {
      final v = byHour[h] ?? 0;
      return v > a ? v : a;
    });
    final total = byHour.values.fold<double>(0, (a, b) => a + b);
    final peakHour = byHour.entries.fold<MapEntry<int, double>?>(null,
        (best, cur) => best == null || cur.value > best.value ? cur : best);

    return _cardShell(
      t,
      title: 'Horários de pico',
      subtitle: 'GMV por horário do dia',
      tag: peakHour != null && peakHour.value > 0
          ? _tag(t, 'pico ${peakHour.key}h', color: t.primary, bg: t.primarySoft)
          : _tag(t, 'sem dados'),
      minHeight: 280,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            height: 140,
            child: total == 0
                ? _emptyState(t, 'Sem horários registrados')
                : Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: hoursList.map((h) {
                      final v = byHour[h] ?? 0;
                      final hPct = (v / maxV * 120).clamp(2.0, 120.0);
                      return Expanded(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 1),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              Container(
                                height: hPct.toDouble(),
                                decoration: BoxDecoration(
                                  color: v > 0 ? t.primary : t.bgElev2,
                                  borderRadius: const BorderRadius.vertical(top: Radius.circular(3)),
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text('${h}h', style: TextStyle(color: t.textMuted, fontSize: 8)),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
          ),
          if (total > 0) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(
                        text: _compactBrl(total),
                        style: TextStyle(color: t.textPrimary, fontSize: 13, fontWeight: FontWeight.w700),
                      ),
                      TextSpan(
                        text: peakHour != null && peakHour.value > 0 ? '  concentrado às ${peakHour.key}h' : '',
                        style: TextStyle(color: t.textSecondary, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _heatmapCard(LlTokens t, AnalyticsDashboardData d) {
    const dows = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const blocos = [6, 9, 12, 15, 18, 21];
    final byKey = <String, double>{};
    double maxVal = 0;
    for (final c in d.heatmapConversao) {
      final k = '${c.dow}-${c.blocoHora}';
      byKey[k] = c.gmv;
      if (c.gmv > maxVal) maxVal = c.gmv;
    }

    String? peakLabel;
    if (maxVal > 0) {
      for (final c in d.heatmapConversao) {
        if (c.gmv == maxVal) {
          peakLabel = '${dows[(c.dow - 1).clamp(0, 6)].toLowerCase()} · ${c.blocoHora}h pico';
          break;
        }
      }
    }

    Color cellColor(double v) {
      if (v <= 0 || maxVal == 0) return t.bgElev2;
      final ratio = (v / maxVal).clamp(0.1, 1.0);
      return Color.lerp(t.bgElev2, t.primary, ratio.toDouble())!;
    }

    return _cardShell(
      t,
      title: 'Conversão por dia',
      subtitle: 'Heatmap GMV por hora · semana × bloco 3h',
      tag: _tag(t, peakLabel ?? 'sem dados'),
      minHeight: 280,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header columns
          Padding(
            padding: const EdgeInsets.only(left: 36),
            child: Row(
              children: blocos
                  .map((b) => Expanded(
                        child: Center(
                          child: Text('${b}h', style: TextStyle(color: t.textMuted, fontSize: 10, fontWeight: FontWeight.w600)),
                        ),
                      ))
                  .toList(),
            ),
          ),
          const SizedBox(height: 4),
          // Rows
          ...List.generate(7, (rowIdx) {
            final dow = rowIdx + 1;
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 2),
              child: Row(
                children: [
                  SizedBox(
                    width: 32,
                    child: Text(
                      dows[rowIdx],
                      style: TextStyle(color: t.textMuted, fontSize: 10, fontWeight: FontWeight.w600),
                    ),
                  ),
                  const SizedBox(width: 4),
                  ...blocos.map((b) {
                    final v = byKey['$dow-$b'] ?? 0;
                    return Expanded(
                      child: Tooltip(
                        message: v > 0 ? '${dows[rowIdx]} ${b}h · ${_compactBrl(v)}' : '${dows[rowIdx]} ${b}h',
                        child: Padding(
                          padding: const EdgeInsets.all(2),
                          child: Container(
                            height: 26,
                            decoration: BoxDecoration(
                              color: cellColor(v),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            alignment: Alignment.center,
                            child: v > 0 && v / maxVal > 0.6
                                ? Text(
                                    _compactBrl(v).replaceAll('R\$ ', ''),
                                    style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w700),
                                  )
                                : null,
                          ),
                        ),
                      ),
                    );
                  }),
                ],
              ),
            );
          }),
          const SizedBox(height: 8),
          Row(
            children: [
              Text('menor', style: TextStyle(color: t.textMuted, fontSize: 10)),
              const SizedBox(width: 6),
              Expanded(
                child: Container(
                  height: 6,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: [t.bgElev2, t.primary]),
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              ),
              const SizedBox(width: 6),
              Text('maior', style: TextStyle(color: t.textMuted, fontSize: 10)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _horasCard(LlTokens t, AnalyticsDashboardData d) {
    // Preenche todos os dias do range selecionado com 0 quando não há dado
    final byDia = {for (final h in d.horasLivePorDia) h.dia: h.horas};
    final filtros = ref.read(dashboardFiltrosProvider);
    final totalDays = filtros.to.difference(filtros.from).inDays + 1;
    final horas = List.generate(totalDays, (i) {
      final dt = filtros.from.add(Duration(days: i));
      final iso = '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
      return HorasLiveDia(dia: iso, horas: byDia[iso] ?? 0);
    });
    return _cardShell(
      t,
      title: 'Horas no ar · diário',
      subtitle: '$totalDays ${totalDays == 1 ? "dia" : "dias"} no período',
      tag: _tag(t, '${d.kpis.totalHorasNoAr.toStringAsFixed(1)}h total'),
      minHeight: 260,
      body: SizedBox(
        height: 160,
        child: horas.isEmpty
            ? _emptyState(t, 'Sem horas registradas')
            : CustomPaint(
                size: Size.infinite,
                painter: _LineChartPainter(
                  values: horas.map((h) => h.horas).toList(),
                  primary: t.primary,
                  hairline: t.hairline,
                ),
              ),
      ),
    );
  }

  Widget _rankingCard(LlTokens t, AnalyticsDashboardData d) {
    final ranking = d.rankingApresentadores;
    final maxGmv = ranking.fold<double>(1, (a, b) => b.gmvTotal > a ? b.gmvTotal : a);
    final fmt = NumberFormat.simpleCurrency(locale: 'pt_BR', decimalDigits: 0);
    return _cardShell(
      t,
      title: 'Top apresentadores',
      subtitle: 'Ranking por GMV no período',
      tag: _tag(t, '${ranking.length} ${ranking.length == 1 ? "ativo" : "ativos"}'),
      minHeight: 260,
      body: ranking.isEmpty
          ? _emptyState(t, 'Sem apresentadores no período')
          : Column(
              children: ranking.take(5).toList().asMap().entries.map((e) {
                final pos = e.key + 1;
                final p = e.value;
                final share = (p.gmvTotal / maxGmv * 100).round();
                final initials = _initials(p.apresentadorNome);
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Row(
                    children: [
                      _medalPos(t, pos),
                      const SizedBox(width: 10),
                      Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: t.bgElev2,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          initials,
                          style: TextStyle(color: t.textPrimary, fontSize: 11, fontWeight: FontWeight.w700),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              p.apresentadorNome,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(color: t.textPrimary, fontSize: 13, fontWeight: FontWeight.w600),
                            ),
                            Text(
                              '${p.totalLives} ${p.totalLives == 1 ? "live" : "lives"} · share $share%',
                              style: TextStyle(color: t.textMuted, fontSize: 10),
                            ),
                            const SizedBox(height: 4),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(2),
                              child: LinearProgressIndicator(
                                value: (share / 100).clamp(0.0, 1.0),
                                minHeight: 4,
                                backgroundColor: t.bgElev2,
                                valueColor: AlwaysStoppedAnimation(t.primary),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        fmt.format(p.gmvTotal),
                        style: TextStyle(
                          color: t.textPrimary,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
    );
  }

  Widget _medalPos(LlTokens t, int pos) {
    final gradient = switch (pos) {
      1 => const LinearGradient(colors: [Color(0xFFFFC93C), Color(0xFFFF9F1C)]),
      2 => const LinearGradient(colors: [Color(0xFFD8D8D8), Color(0xFFA8A8A8)]),
      3 => const LinearGradient(colors: [Color(0xFFD49664), Color(0xFFB07042)]),
      _ => null,
    };
    return Container(
      width: 26,
      height: 26,
      decoration: BoxDecoration(
        gradient: gradient,
        color: gradient == null ? t.bgElev2 : null,
        borderRadius: BorderRadius.circular(7),
      ),
      alignment: Alignment.center,
      child: Text(
        '$pos',
        style: TextStyle(
          color: pos <= 3 ? Colors.black : t.textSecondary,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  Widget _emptyState(LlTokens t, String msg) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: Text(
          msg,
          style: TextStyle(color: t.textFaint, fontSize: 12, fontStyle: FontStyle.italic),
        ),
      ),
    );
  }

  String _mesLabel(String iso) {
    final parts = iso.split('-');
    if (parts.length != 2) return iso;
    final mes = int.tryParse(parts[1]) ?? 0;
    const nomes = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return mes >= 1 && mes <= 12 ? nomes[mes] : iso;
  }

  String _compactBrl(double v) {
    if (v >= 1000000) return 'R\$ ${(v / 1000000).toStringAsFixed(1)}M';
    if (v >= 1000) return 'R\$ ${(v / 1000).toStringAsFixed(v >= 10000 ? 0 : 1)}k';
    return 'R\$ ${v.toStringAsFixed(0)}';
  }

  String _compactInt(int v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)}M';
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(v >= 10000 ? 0 : 1)}k';
    return '$v';
  }

  String _initials(String name) {
    final parts = name.trim().split(' ').where((s) => s.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return (parts.first.substring(0, 1) + parts.last.substring(0, 1)).toUpperCase();
  }
}

class _KpiSpec {
  final IconData icon;
  final Color iconColor;
  final Color iconBg;
  final String label;
  final String value;
  final String sub;
  final int delta;
  const _KpiSpec({
    required this.icon,
    required this.iconColor,
    required this.iconBg,
    required this.label,
    required this.value,
    required this.sub,
    required this.delta,
  });
}

class _LineChartPainter extends CustomPainter {
  final List<double> values;
  final Color primary;
  final Color hairline;
  _LineChartPainter({required this.values, required this.primary, required this.hairline});

  @override
  void paint(Canvas canvas, Size size) {
    if (values.isEmpty) return;
    final maxV = values.reduce((a, b) => a > b ? a : b);
    if (maxV == 0) return;

    final w = size.width;
    final h = size.height;

    // Hairlines
    final hairlinePaint = Paint()
      ..color = hairline
      ..strokeWidth = 1;
    for (final r in [0.25, 0.5, 0.75]) {
      canvas.drawLine(Offset(0, h * r), Offset(w, h * r), hairlinePaint);
    }

    // Build path
    final path = Path();
    final fillPath = Path();
    final stepX = w / (values.length - 1).clamp(1, double.infinity);

    for (var i = 0; i < values.length; i++) {
      final x = stepX * i;
      final y = h - (values[i] / maxV * h * 0.9);
      if (i == 0) {
        path.moveTo(x, y);
        fillPath.moveTo(x, h);
        fillPath.lineTo(x, y);
      } else {
        path.lineTo(x, y);
        fillPath.lineTo(x, y);
      }
    }
    fillPath.lineTo(w, h);
    fillPath.close();

    // Fill gradient
    final fillPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [primary.withValues(alpha: 0.32), primary.withValues(alpha: 0)],
      ).createShader(Rect.fromLTWH(0, 0, w, h));
    canvas.drawPath(fillPath, fillPaint);

    // Line
    final linePaint = Paint()
      ..color = primary
      ..strokeWidth = 2.2
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    canvas.drawPath(path, linePaint);
  }

  @override
  bool shouldRepaint(_LineChartPainter old) =>
      old.values != values || old.primary != primary;
}
