import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../../design_system/app_components.dart';
import '../../models/cabine.dart';
import '../../models/cliente.dart';
import '../../models/apresentadora.dart';
import '../../providers/solicitacoes_provider.dart';
import '../../providers/cabines_provider.dart';
import '../../providers/clientes_provider.dart';
import '../../providers/apresentadoras_provider.dart';
import '../../routes/app_routes.dart';
import '../../services/api_service.dart';
import '../../livelab/core/responsive.dart';
import '../../livelab/theme/livelab_theme.dart';
import '../../livelab/theme/tokens.dart';
import '../../livelab/widgets/livelab_scaffold.dart';

class SolicitacoesScreen extends ConsumerStatefulWidget {
  final bool embedded;
  const SolicitacoesScreen({super.key, this.embedded = false});

  @override
  ConsumerState<SolicitacoesScreen> createState() => _SolicitacoesScreenState();
}

class _SolicitacoesScreenState extends ConsumerState<SolicitacoesScreen> {
  int _tab = 0; // 0 pendentes, 1 todas
  String _statusFilter = 'todos'; // todos | pendente | aprovada | recusada
  String _dateFilter = '';
  String _cabineFilter = '';

  void _refresh() {
    ref.read(solicitacoesProvider.notifier).refresh();
  }

  Future<void> _aprovar(String id) async {
    try {
      await ref.read(solicitacoesProvider.notifier).aprovar(id);
      if (!mounted) return;
      _snack('Live aprovada com sucesso', success: true);
    } on ApiException catch (e) {
      if (!mounted) return;
      _snack(e.message, success: false);
    }
  }

  Future<void> _recusar(String id) async {
    final motivoCtrl = TextEditingController();
    final t = context.llTokens;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: t.bgElev1,
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Motivo da recusa',
            style: TextStyle(color: t.textPrimary)),
        content: SizedBox(
          width: 360,
          child: TextField(
            controller: motivoCtrl,
            autofocus: true,
            maxLines: 3,
            style: TextStyle(color: t.textPrimary),
            decoration: InputDecoration(
              hintText: 'Por que a solicitação está sendo recusada?',
              hintStyle: TextStyle(color: t.textMuted),
              border: const OutlineInputBorder(),
            ),
          ),
        ),
        actions: [
          AppSecondaryButton(
            label: 'Cancelar',
            onPressed: () => Navigator.pop(ctx, false),
          ),
          AppDangerButton(
            label: 'Recusar',
            onPressed: () {
              if (motivoCtrl.text.trim().isEmpty) return;
              Navigator.pop(ctx, true);
            },
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ref
          .read(solicitacoesProvider.notifier)
          .recusar(id, motivoCtrl.text.trim());
      if (!mounted) return;
      _snack('Agendamento recusado', success: true);
    } on ApiException catch (e) {
      if (!mounted) return;
      _snack(e.message, success: false);
    }
  }

  void _snack(String msg, {required bool success}) {
    final t = context.llTokens;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: success ? t.success : t.danger,
        duration: const Duration(seconds: 4),
      ),
    );
  }

  Future<void> _novoAgendamento() async {
    await showDialog<void>(
      context: context,
      builder: (ctx) => _NovoAgendamentoDialog(
        onSalvar: (data) async {
          await ref
              .read(solicitacoesProvider.notifier)
              .criarAgendamento(data);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.embedded) return _content();

    return LivelabScaffold(
      currentRoute: AppRoutes.agendamentos,
      onRefresh: _refresh,
      child: _content(),
    );
  }

  Widget _content() {
    final t = context.llTokens;
    final r = LlResponsive.of(context);
    final pad = r.isMobile ? 16.0 : 28.0;

    final asyncData = ref.watch(solicitacoesProvider);

    return Stack(
      children: [
        SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(pad, 16, pad, 100),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (!widget.embedded) ...[
                _pageHeader(t),
                const SizedBox(height: 18),
              ],
              _kpis(t, asyncData),
              const SizedBox(height: 18),
              _tabStrip(t, asyncData),
              const SizedBox(height: 18),
              asyncData.when(
                loading: () => const Padding(
                  padding: EdgeInsets.symmetric(vertical: 60),
                  child: Center(child: CircularProgressIndicator()),
                ),
                error: (e, _) => _errorBox(t, e),
                data: (items) {
                  final pendentes =
                      items.where((s) => s.status == 'pendente').toList();
                  if (_tab == 0) {
                    if (pendentes.isEmpty) {
                      return _emptyBox(
                        t,
                        icon: Icons.check_circle_outline_rounded,
                        title: 'Nenhum agendamento pendente',
                        sub:
                            'Tudo em dia. Quando um cliente solicitar uma live, ela aparecerá aqui.',
                      );
                    }
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: pendentes
                          .map((s) => _SolRow(
                                t: t,
                                s: s,
                                onAprovar: () => _aprovar(s.id),
                                onRecusar: () => _recusar(s.id),
                                pending: true,
                              ))
                          .toList(),
                    );
                  }
                  // tab Todas
                  final filtered = items.where(_passesFilter).toList();
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _filtersBar(t),
                      const SizedBox(height: 14),
                      if (filtered.isEmpty)
                        _emptyBox(
                          t,
                          icon: Icons.search_off_rounded,
                          title: 'Nenhum agendamento encontrado',
                          sub: 'Tente ajustar os filtros.',
                        )
                      else
                        ...filtered.map((s) => _SolRow(
                              t: t,
                              s: s,
                              pending: false,
                              onAprovar: () => _aprovar(s.id),
                              onRecusar: () => _recusar(s.id),
                            )),
                    ],
                  );
                },
              ),
            ],
          ),
        ),
        Positioned(
          right: pad,
          bottom: 24,
          child: Material(
            color: t.primary,
            borderRadius: BorderRadius.circular(999),
            elevation: 6,
            shadowColor: t.primary.withValues(alpha: 0.4),
            child: InkWell(
              borderRadius: BorderRadius.circular(999),
              onTap: _novoAgendamento,
              child: Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 18, vertical: 14),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    Icon(Icons.add, size: 18, color: Colors.white),
                    SizedBox(width: 8),
                    Text(
                      'Novo Agendamento',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  bool _passesFilter(SolicitacaoFranqueador s) {
    if (_statusFilter != 'todos' && s.status != _statusFilter) return false;
    if (_dateFilter.isNotEmpty) {
      final formatted = _ddmmyyyy(s.dataSolicitada);
      if (!formatted.contains(_dateFilter)) return false;
    }
    if (_cabineFilter.isNotEmpty) {
      final n = 'cabine ${s.cabineNumero.toString().padLeft(2, '0')}';
      if (!n.toLowerCase().contains(_cabineFilter.toLowerCase())) {
        return false;
      }
    }
    return true;
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
                '— AGENDA OPERACIONAL',
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
                      text: 'Solicitações de ',
                      style: TextStyle(
                        color: t.textPrimary,
                        fontSize: 32,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.9,
                      ),
                    ),
                    TextSpan(
                      text: 'Live',
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
                'Aprove, recuse e acompanhe pedidos de horário dos clientes.',
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
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
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

  Widget _kpis(LlTokens t, AsyncValue<List<SolicitacaoFranqueador>> async) {
    final items = async.valueOrNull ?? const <SolicitacaoFranqueador>[];
    final mes = DateFormat('yyyy-MM').format(DateTime.now());
    final pendentes = items.where((s) => s.status == 'pendente').length;
    final aprovadasMes = items
        .where(
            (s) => s.status == 'aprovada' && s.dataSolicitada.startsWith(mes))
        .length;
    final recusadasMes = items
        .where(
            (s) => s.status == 'recusada' && s.dataSolicitada.startsWith(mes))
        .length;
    final totalDecidido = aprovadasMes + recusadasMes;
    final taxa = totalDecidido == 0
        ? '—'
        : '${(aprovadasMes / totalDecidido * 100).round()}%';

    final cards = <Widget>[
      _kpi(t,
          label: 'PENDENTES',
          value: '$pendentes',
          sub: 'aguardando aprovação',
          color: pendentes > 0 ? t.primary : t.textPrimary,
          accent: pendentes > 0),
      _kpi(t,
          label: 'APROVADAS (MÊS)',
          value: '$aprovadasMes',
          sub: 'neste mês',
          color: t.success),
      _kpi(t,
          label: 'RECUSADAS (MÊS)',
          value: '$recusadasMes',
          sub: 'neste mês',
          color: t.danger),
      _kpi(t,
          label: 'TAXA APROVAÇÃO',
          value: taxa,
          sub: 'aprovadas / decididas',
          color: totalDecidido == 0 ? t.textMuted : t.textPrimary),
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
            mainAxisExtent: 132,
          ),
          itemCount: cards.length,
          itemBuilder: (_, i) => cards[i],
        );
      },
    );
  }

  Widget _kpi(
    LlTokens t, {
    required String label,
    required String value,
    required String sub,
    required Color color,
    bool accent = false,
  }) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: t.bgElev1,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: accent ? t.primary : t.border),
        boxShadow: t.shadowCard,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              color: t.textMuted,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.2,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              color: color,
              fontSize: 38,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.8,
              height: 1,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
          Text(
            sub,
            style: TextStyle(color: t.textMuted, fontSize: 11),
          ),
        ],
      ),
    );
  }

  Widget _tabStrip(LlTokens t,
      AsyncValue<List<SolicitacaoFranqueador>> async) {
    final items = async.valueOrNull ?? const <SolicitacaoFranqueador>[];
    final pendentes = items.where((s) => s.status == 'pendente').length;
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        _tabPill(t,
            i: 0,
            icon: Icons.schedule,
            label: 'Pendentes',
            badge: pendentes > 0 ? '$pendentes' : null,
            badgeAccent: true),
        _tabPill(t,
            i: 1,
            icon: Icons.list_alt_outlined,
            label: 'Todas',
            badge: '${items.length}',
            badgeAccent: false),
      ],
    );
  }

  Widget _tabPill(LlTokens t,
      {required int i,
      required IconData icon,
      required String label,
      String? badge,
      required bool badgeAccent}) {
    final active = _tab == i;
    return Material(
      color: active ? t.primarySoft : t.bgElev1,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => setState(() => _tab = i),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            border: Border.all(color: active ? t.primary : t.border),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 16, color: active ? t.primary : t.textSecondary),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  color: active ? t.primary : t.textSecondary,
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
              if (badge != null) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: badgeAccent ? t.primary : t.bgElev2,
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(
                        color: badgeAccent ? t.primary : t.border),
                  ),
                  child: Text(
                    badge,
                    style: TextStyle(
                      color: badgeAccent ? Colors.white : t.textSecondary,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _filtersBar(LlTokens t) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: t.bgElev1,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: t.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _statusChip(t, 'todos', 'Todos'),
              _statusChip(t, 'pendente', 'Pendente'),
              _statusChip(t, 'aprovada', 'Aprovada'),
              _statusChip(t, 'recusada', 'Recusada'),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _searchInput(t,
                  icon: Icons.calendar_today_outlined,
                  hint: 'Data (dd/mm/aaaa)',
                  onChanged: (v) => setState(() => _dateFilter = v))),
              const SizedBox(width: 10),
              Expanded(child: _searchInput(t,
                  icon: Icons.video_camera_back_outlined,
                  hint: 'Cabine nº',
                  onChanged: (v) => setState(() => _cabineFilter = v))),
            ],
          ),
        ],
      ),
    );
  }

  Widget _statusChip(LlTokens t, String value, String label) {
    final active = _statusFilter == value;
    return Material(
      color: active ? t.primarySoft : t.bgElev2,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        borderRadius: BorderRadius.circular(999),
        onTap: () => setState(() => _statusFilter = value),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            border: Border.all(color: active ? t.primary : t.border),
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: active ? t.primary : t.textSecondary,
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ),
    );
  }

  Widget _searchInput(
    LlTokens t, {
    required IconData icon,
    required String hint,
    required void Function(String) onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: t.bgElev2,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: t.border),
      ),
      child: Row(
        children: [
          Icon(icon, size: 14, color: t.textMuted),
          const SizedBox(width: 8),
          Expanded(
            child: TextField(
              onChanged: onChanged,
              style: TextStyle(color: t.textPrimary, fontSize: 13),
              decoration: InputDecoration(
                isDense: true,
                hintText: hint,
                hintStyle: TextStyle(color: t.textMuted, fontSize: 13),
                border: InputBorder.none,
                contentPadding:
                    const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _emptyBox(LlTokens t,
      {required IconData icon, required String title, required String sub}) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
      decoration: BoxDecoration(
        color: t.bgElev1,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: t.border),
      ),
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: t.primarySoft,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: t.primary, size: 26),
          ),
          const SizedBox(height: 14),
          Text(title,
              style: TextStyle(
                color: t.textPrimary,
                fontSize: 15,
                fontWeight: FontWeight.w700,
              )),
          const SizedBox(height: 4),
          Text(sub,
              textAlign: TextAlign.center,
              style: TextStyle(color: t.textMuted, fontSize: 12)),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SolRow
// ─────────────────────────────────────────────────────────────────────────────

class _SolRow extends StatelessWidget {
  final LlTokens t;
  final SolicitacaoFranqueador s;
  final VoidCallback onAprovar;
  final VoidCallback onRecusar;
  final bool pending;
  const _SolRow({
    required this.t,
    required this.s,
    required this.onAprovar,
    required this.onRecusar,
    required this.pending,
  });

  Color _statusColor(LlTokens t, String st) {
    switch (st) {
      case 'aprovada':
        return t.success;
      case 'recusada':
        return t.danger;
      default:
        return t.warning;
    }
  }

  String _statusLabel(String st) {
    switch (st) {
      case 'aprovada':
        return 'Aprovada';
      case 'recusada':
        return 'Recusada';
      default:
        return 'Pendente';
    }
  }

  @override
  Widget build(BuildContext context) {
    final r = LlResponsive.of(context);
    final stack = r.isMobile;
    final accentLeftBorder = pending ? t.primary : _statusColor(t, s.status);

    final left = Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: t.bgElev2,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: t.border),
          ),
          child: Text(
            'CABINE ${s.cabineNumero.toString().padLeft(2, '0')}',
            style: TextStyle(
              color: t.textPrimary,
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.6,
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                s.clienteNome,
                style: TextStyle(
                  color: t.textPrimary,
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Wrap(
                spacing: 12,
                runSpacing: 4,
                children: [
                  _meta(t, Icons.calendar_today_outlined,
                      '${_ddmmyyyy(s.dataSolicitada)} às ${s.horaInicioDisplay}'),
                  _meta(t, Icons.schedule,
                      '${s.horaInicioDisplay} – ${s.horaFimDisplay}'),
                  _meta(t, Icons.mic_none_rounded,
                      s.apresentadoraNome ?? s.solicitanteNome),
                ],
              ),
            ],
          ),
        ),
      ],
    );

    final right = pending
        ? Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              _actionBtn(t,
                  icon: Icons.close,
                  label: 'Recusar',
                  fg: t.danger,
                  bg: t.dangerSoft,
                  onTap: onRecusar),
              const SizedBox(width: 8),
              _actionBtn(t,
                  icon: Icons.check,
                  label: 'Aprovar',
                  fg: Colors.white,
                  bg: t.success,
                  onTap: onAprovar),
            ],
          )
        : Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: _statusColor(t, s.status).withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              _statusLabel(s.status),
              style: TextStyle(
                color: _statusColor(t, s.status),
                fontSize: 11,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.4,
              ),
            ),
          );

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: t.bgElev1,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: t.border),
        boxShadow: t.shadowCard,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: Row(
          children: [
            Container(width: 4, color: accentLeftBorder),
            Expanded(
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                child: stack
                    ? Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          left,
                          const SizedBox(height: 12),
                          Align(alignment: Alignment.centerRight, child: right),
                        ],
                      )
                    : Row(children: [
                        Expanded(child: left),
                        const SizedBox(width: 12),
                        right,
                      ]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _meta(LlTokens t, IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 12, color: t.textMuted),
        const SizedBox(width: 4),
        Text(text,
            style: TextStyle(color: t.textMuted, fontSize: 11.5)),
      ],
    );
  }

  Widget _actionBtn(LlTokens t,
      {required IconData icon,
      required String label,
      required Color fg,
      required Color bg,
      required VoidCallback onTap}) {
    return Material(
      color: bg,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 14, color: fg),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  color: fg,
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
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

String _ddmmyyyy(String iso) {
  // 'YYYY-MM-DD' → 'DD/MM/YYYY'
  if (iso.length < 10) return iso;
  return '${iso.substring(8, 10)}/${iso.substring(5, 7)}/${iso.substring(0, 4)}';
}

Widget _errorBox(LlTokens t, Object e) {
  return Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: t.dangerSoft,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: t.danger.withValues(alpha: 0.3)),
    ),
    child: Row(
      children: [
        Icon(Icons.error_outline, color: t.danger),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            ApiService.extractErrorMessage(e),
            style: TextStyle(color: t.danger, fontSize: 13),
          ),
        ),
      ],
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Novo Agendamento Dialog (com pickers reais)
// ─────────────────────────────────────────────────────────────────────────────

class _NovoAgendamentoDialog extends ConsumerStatefulWidget {
  final Future<void> Function(Map<String, dynamic> data) onSalvar;
  const _NovoAgendamentoDialog({required this.onSalvar});

  @override
  ConsumerState<_NovoAgendamentoDialog> createState() =>
      _NovoAgendamentoDialogState();
}

class _NovoAgendamentoDialogState
    extends ConsumerState<_NovoAgendamentoDialog> {
  Cabine? _cabine;
  Cliente? _cliente;
  Apresentadora? _apresentadora;
  DateTime? _data;
  TimeOfDay? _horaInicio;
  TimeOfDay? _horaFim;
  final _obsCtrl = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _obsCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickData() async {
    final t = context.llTokens;
    final picked = await showDatePicker(
      context: context,
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      initialDate: _data ?? DateTime.now(),
      helpText: 'Data do agendamento',
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: Theme.of(ctx).colorScheme.copyWith(
                primary: t.primary,
                onPrimary: Colors.white,
                surface: t.bgElev1,
                onSurface: t.textPrimary,
              ),
        ),
        child: child!,
      ),
    );
    if (picked != null) setState(() => _data = picked);
  }

  Future<void> _pickHora({required bool inicio}) async {
    final t = context.llTokens;
    final picked = await showTimePicker(
      context: context,
      initialTime: (inicio ? _horaInicio : _horaFim) ??
          const TimeOfDay(hour: 9, minute: 0),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: Theme.of(ctx).colorScheme.copyWith(
                primary: t.primary,
                onPrimary: Colors.white,
                surface: t.bgElev1,
                onSurface: t.textPrimary,
              ),
        ),
        child: MediaQuery(
          data: MediaQuery.of(ctx)
              .copyWith(alwaysUse24HourFormat: true),
          child: child!,
        ),
      ),
    );
    if (picked != null) {
      setState(() {
        if (inicio) {
          _horaInicio = picked;
        } else {
          _horaFim = picked;
        }
      });
    }
  }

  String _fmtTime(TimeOfDay? t) {
    if (t == null) return '--:--';
    return '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
  }

  Future<void> _salvar() async {
    final t = context.llTokens;
    if (_cabine == null ||
        _cliente == null ||
        _data == null ||
        _horaInicio == null ||
        _horaFim == null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        backgroundColor: t.danger,
        content: const Text('Preencha cabine, cliente, data e horários'),
      ));
      return;
    }
    setState(() => _saving = true);
    try {
      await widget.onSalvar({
        'cabine_id': _cabine!.id,
        'cliente_id': _cliente!.id,
        if (_apresentadora != null) 'apresentadora_id': _apresentadora!.id,
        'data_solicitada':
            '${_data!.year}-${_data!.month.toString().padLeft(2, '0')}-${_data!.day.toString().padLeft(2, '0')}',
        'hora_inicio': _fmtTime(_horaInicio),
        'hora_fim': _fmtTime(_horaFim),
        if (_obsCtrl.text.trim().isNotEmpty)
          'observacao': _obsCtrl.text.trim(),
      });
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          backgroundColor: t.success,
          content: const Text('Agendamento criado com sucesso'),
        ));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          backgroundColor: t.danger,
          content: Text(ApiService.extractErrorMessage(e)),
        ));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    final cabinesAsync = ref.watch(cabinesProvider);
    final clientesAsync = ref.watch(clientesProvider);
    final apresentadorasAsync = ref.watch(apresentadorasProvider);

    final dataLabel = _data == null
        ? 'Selecionar data'
        : DateFormat('dd/MM/yyyy', 'pt_BR').format(_data!);

    return AlertDialog(
      backgroundColor: t.bgElev1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Row(
        children: [
          Icon(Icons.event_available, color: t.primary, size: 20),
          const SizedBox(width: 10),
          Text('Novo agendamento',
              style: TextStyle(
                  color: t.textPrimary, fontWeight: FontWeight.w700)),
        ],
      ),
      content: SizedBox(
        width: 460,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _label(t, 'Cabine *'),
              cabinesAsync.when(
                loading: () => const LinearProgressIndicator(),
                error: (e, _) => _errorBox(t, e),
                data: (list) => DropdownButtonFormField<Cabine>(
                  initialValue: _cabine,
                  isExpanded: true,
                  dropdownColor: t.bgElev1,
                  style: TextStyle(color: t.textPrimary, fontSize: 13),
                  decoration: _ddDecoration(t),
                  items: list
                      .map((c) => DropdownMenuItem<Cabine>(
                            value: c,
                            child: Text(
                              'Cabine ${c.numero.toString().padLeft(2, '0')}'
                              '${c.nome != null ? ' · ${c.nome}' : ''}',
                            ),
                          ))
                      .toList(),
                  onChanged: (v) => setState(() => _cabine = v),
                ),
              ),
              const SizedBox(height: 12),
              _label(t, 'Cliente *'),
              clientesAsync.when(
                loading: () => const LinearProgressIndicator(),
                error: (e, _) => _errorBox(t, e),
                data: (list) => DropdownButtonFormField<Cliente>(
                  initialValue: _cliente,
                  isExpanded: true,
                  dropdownColor: t.bgElev1,
                  style: TextStyle(color: t.textPrimary, fontSize: 13),
                  decoration: _ddDecoration(t),
                  items: list
                      .map((c) => DropdownMenuItem<Cliente>(
                            value: c,
                            child: Text(c.nome,
                                overflow: TextOverflow.ellipsis),
                          ))
                      .toList(),
                  onChanged: (v) => setState(() => _cliente = v),
                ),
              ),
              const SizedBox(height: 12),
              _label(t, 'Apresentadora (opcional)'),
              apresentadorasAsync.when(
                loading: () => const LinearProgressIndicator(),
                error: (e, _) => _errorBox(t, e),
                data: (list) => DropdownButtonFormField<Apresentadora?>(
                  initialValue: _apresentadora,
                  isExpanded: true,
                  dropdownColor: t.bgElev1,
                  style: TextStyle(color: t.textPrimary, fontSize: 13),
                  decoration: _ddDecoration(t),
                  items: <DropdownMenuItem<Apresentadora?>>[
                    DropdownMenuItem<Apresentadora?>(
                      value: null,
                      child: Text('— Sem apresentadora —',
                          style: TextStyle(color: t.textMuted)),
                    ),
                    ...list.map((a) => DropdownMenuItem<Apresentadora?>(
                          value: a,
                          child:
                              Text(a.nome, overflow: TextOverflow.ellipsis),
                        )),
                  ],
                  onChanged: (v) => setState(() => _apresentadora = v),
                ),
              ),
              const SizedBox(height: 12),
              _label(t, 'Data *'),
              _pickerTile(t,
                  icon: Icons.calendar_today_outlined,
                  text: dataLabel,
                  onTap: _pickData),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        _label(t, 'Início *'),
                        _pickerTile(t,
                            icon: Icons.schedule,
                            text: _fmtTime(_horaInicio),
                            onTap: () => _pickHora(inicio: true)),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        _label(t, 'Fim *'),
                        _pickerTile(t,
                            icon: Icons.schedule,
                            text: _fmtTime(_horaFim),
                            onTap: () => _pickHora(inicio: false)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _label(t, 'Observação (opcional)'),
              TextField(
                controller: _obsCtrl,
                maxLines: 2,
                style: TextStyle(color: t.textPrimary, fontSize: 13),
                decoration: _ddDecoration(t).copyWith(
                  hintText: 'Detalhes ou contexto adicional…',
                  hintStyle: TextStyle(color: t.textMuted),
                ),
              ),
            ],
          ),
        ),
      ),
      actions: [
        AppSecondaryButton(
          label: 'Cancelar',
          onPressed: _saving ? null : () => Navigator.pop(context),
        ),
        AppPrimaryButton(
          label: 'Agendar',
          isLoading: _saving,
          onPressed: _saving ? null : _salvar,
        ),
      ],
    );
  }

  Widget _label(LlTokens t, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Text(text,
          style: TextStyle(
            color: t.textMuted,
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.0,
          )),
    );
  }

  InputDecoration _ddDecoration(LlTokens t) {
    return InputDecoration(
      isDense: true,
      filled: true,
      fillColor: t.bgElev2,
      contentPadding:
          const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide(color: t.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide(color: t.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide(color: t.primary),
      ),
    );
  }

  Widget _pickerTile(LlTokens t,
      {required IconData icon,
      required String text,
      required VoidCallback onTap}) {
    return Material(
      color: t.bgElev2,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          decoration: BoxDecoration(
            border: Border.all(color: t.border),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(
            children: [
              Icon(icon, size: 14, color: t.textMuted),
              const SizedBox(width: 8),
              Expanded(
                child: Text(text,
                    style: TextStyle(
                        color: t.textPrimary,
                        fontSize: 13,
                        fontWeight: FontWeight.w600)),
              ),
              Icon(Icons.expand_more,
                  size: 16, color: t.textMuted),
            ],
          ),
        ),
      ),
    );
  }
}
