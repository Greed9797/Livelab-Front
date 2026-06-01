// =============================================================
// CRM Master V3 — fiel ao handoff "Livelab CRM.html"
// Visual: dark canvas + KPIs + Kanban drag&drop + Pipeline + Campos
// Tokens replicados de :root (dark mode default — light segue tema do shell).
// =============================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../../models/admin_master.dart';
import '../../models/lead.dart';
import '../../providers/admin_master_provider.dart';
import '../../providers/leads_provider.dart';
import '../../widgets/crm/lead_filter.dart';
import '../../widgets/skeleton_list.dart';
import 'lead_dialog.dart';

class _C {
  // Surface + text tokens são theme-aware — recebem BuildContext.
  static bool _isDark(BuildContext c) =>
      Theme.of(c).brightness == Brightness.dark;

  static Color bgBase(BuildContext c) =>
      _isDark(c) ? const Color(0xFF0E0E10) : const Color(0xFFF5F4F2);
  static Color bgElev1(BuildContext c) =>
      _isDark(c) ? const Color(0xFF16161A) : const Color(0xFFFFFFFF);
  static Color bgElev2(BuildContext c) =>
      _isDark(c) ? const Color(0xFF1E1E22) : const Color(0xFFF0EEE8);
  static Color bgElev3(BuildContext c) =>
      _isDark(c) ? const Color(0xFF26262B) : const Color(0xFFE6E3DC);

  static Color textPrimary(BuildContext c) =>
      _isDark(c) ? const Color(0xFFF5F0EB) : const Color(0xFF1A1918);
  static Color textSecondary(BuildContext c) =>
      _isDark(c) ? const Color(0xFFB8B2AC) : const Color(0xFF6B6870);
  static Color textMuted(BuildContext c) =>
      _isDark(c) ? const Color(0xFF75716D) : const Color(0xFF9E9BA8);
  static Color textFaint(BuildContext c) =>
      _isDark(c) ? const Color(0xFF4A4744) : const Color(0xFFC8C4BC);

  static Color hairline(BuildContext c) =>
      _isDark(c) ? const Color(0x1AFFFFFF) : const Color(0x1A000000);

  // Cores semânticas — invariantes nos dois modos.
  static const primary       = Color(0xFFFF6A2F);
  static const primarySoft   = Color(0x24FF6A2F); // 14%
  static const primarySofter = Color(0x12FF6A2F); // 7%

  static const success     = Color(0xFF34D399);
  static const successSoft = Color(0x1F34D399);
  static const warning     = Color(0xFFFBBF24);
  static const warningSoft = Color(0x1FFBBF24);
  static const danger      = Color(0xFFF87171);
  static const info        = Color(0xFF5AC8FA);
  static const infoSoft    = Color(0x295AC8FA);
  static const accent      = Color(0xFFAF7BFF);
  static const accentSoft  = Color(0x2DAF7BFF);

  static TextStyle get serif => GoogleFonts.instrumentSerif(
        fontStyle: FontStyle.italic,
        fontWeight: FontWeight.w400,
      );
}

// ─── Stage config (handoff order) ───
class _StageDef {
  final String id;
  final String name;
  final Color color;
  const _StageDef(this.id, this.name, this.color);
}

const _STAGES = [
  _StageDef('lead_novo', 'Lead captado', _C.info),
  _StageDef('contato_iniciado', 'Qualificação', _C.info),
  _StageDef('reuniao_agendada', 'Reunião agendada', _C.info),
  _StageDef('proposta_enviada', 'Negociação', _C.primary),
  _StageDef('em_negociacao', 'Contrato enviado', _C.primary),
  _StageDef('aguardando_assinatura', 'Contrato pendente', _C.warning),
  _StageDef('ganho', 'Fechado ganho', _C.success),
  _StageDef('perdido', 'Fechado perdido', Color(0xFF7A7A82)),
];

final _money = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$', decimalDigits: 0);
final _moneyDec = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$', decimalDigits: 2);

// =============================================================
// SCREEN
// =============================================================

class MasterCrmV3Screen extends ConsumerStatefulWidget {
  const MasterCrmV3Screen({super.key});

  @override
  ConsumerState<MasterCrmV3Screen> createState() => _MasterCrmV3ScreenState();
}

class _MasterCrmV3ScreenState extends ConsumerState<MasterCrmV3Screen> {
  String _filter = 'Todos';
  String? _movingId;
  List<LeadFilter> _advFilters = const [];

  @override
  Widget build(BuildContext context) {
    final crmAsync = ref.watch(masterCrmProvider);
    final leadsAsync = ref.watch(leadsProvider);

    return DefaultTabController(
      length: 2,
      child: Material(
        color: _C.bgBase(context),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(24, 18, 24, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _Header(),
                  const SizedBox(height: 18),
                ],
              ),
            ),
            // TabBar
            Container(
              color: _C.bgElev1(context),
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: TabBar(
                labelColor: _C.primary,
                unselectedLabelColor: _C.textSecondary(context),
                indicatorColor: _C.primary,
                tabs: const [
                  Tab(text: 'Kanban'),
                  Tab(text: 'Dashboard'),
                ],
              ),
            ),
            // Tab content
            Expanded(
              child: TabBarView(
                children: [
                  // Tab 1: Kanban
                  SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        LeadFilterBuilder(
                          filters: _advFilters,
                          onChanged: (f) => setState(() => _advFilters = f),
                          bg: _C.bgElev1(context),
                          border: _C.hairline(context),
                          text: _C.textPrimary(context),
                          textMuted: _C.textMuted(context),
                          primary: _C.primary,
                        ),
                        const SizedBox(height: 16),
                        leadsAsync.when(
                          loading: () => const _LoadingBlock(),
                          error: (e, _) => _ErrorBlock(error: e, onRetry: () => ref.invalidate(leadsProvider)),
                          data: (leads) => _Kanban(
                            leads: _applyFilter(leads),
                            filter: _filter,
                            onFilterChange: (f) => setState(() => _filter = f),
                            movingId: _movingId,
                            onMove: (lead, newStage) => _moveLead(lead, newStage),
                            onCreate: () async {
                              final ok = await showLeadDialog(context);
                              if (ok == true && mounted) {
                                // KPIs vêm de /crm/summary (masterCrmProvider). Sem invalidar,
                                // criar/editar/deletar lead deixa os cards estagnados.
                                ref.invalidate(masterCrmProvider);
                              }
                            },
                            onEdit: (lead) async {
                              final ok = await showLeadDialog(context, lead: lead);
                              if (ok == true && mounted) {
                                ref.invalidate(masterCrmProvider);
                              }
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Tab 2: Dashboard
                  SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
                    child: crmAsync.when(
                      loading: () => const _LoadingBlock(),
                      error: (e, _) => _ErrorBlock(error: e, onRetry: () => ref.invalidate(masterCrmProvider)),
                      data: (crm) => Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _KpiGrid(
                            totalLeads: crm.summary.totalLeads,
                            leadPool: crm.summary.leadPool,
                            estimatedValue: crm.summary.estimatedValue,
                            pendingContracts: crm.summary.pendingContracts,
                          ),
                          const SizedBox(height: 16),
                          _PipelineRealCard(crm: crm),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  List<Lead> _applyFilter(List<Lead> leads) {
    // Aplica primeiro os filtros avançados (Pipedrive-style), depois o
    // chip rápido por nicho (Todos / Cliente / Creator / Unidade).
    final advFiltered = applyFilters(leads, _advFilters);
    switch (_filter) {
      case 'Cliente':
        return advFiltered.where((l) => (l.nicho ?? '').toLowerCase().contains('cliente')).toList();
      case 'Creator':
        return advFiltered.where((l) => (l.nicho ?? '').toLowerCase().contains('creator')).toList();
      case 'Unidade':
        return advFiltered.where((l) => (l.nicho ?? '').toLowerCase().contains('unidade')).toList();
      default:
        return advFiltered;
    }
  }

  Future<void> _moveLead(Lead lead, String newStage) async {
    if (lead.crmEtapa == newStage) return;
    setState(() => _movingId = lead.id);
    try {
      await ref.read(leadsProvider.notifier).moverEtapa(lead.id, newStage);
      // KPI summary depende de etapa — invalida pra recalcular.
      if (mounted) ref.invalidate(masterCrmProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao mover lead: $e'), backgroundColor: _C.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _movingId = null);
    }
  }
}

// =============================================================
// HEADER
// =============================================================

class _Header extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 4,
              height: 28,
              decoration: BoxDecoration(
                color: _C.primary,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(width: 12),
            Flexible(
              child: RichText(
                text: TextSpan(
                  style: GoogleFonts.inter(
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                    color: _C.textPrimary(context),
                    letterSpacing: -0.7,
                  ),
                  children: [
                    const TextSpan(text: 'CRM '),
                    TextSpan(
                      text: 'Master',
                      style: _C.serif.copyWith(
                        fontSize: 32,
                        color: _C.primary,
                        height: 1.0,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Text(
          'Pipeline comercial de toda a rede — leads, qualificação e fechamento.',
          style: GoogleFonts.inter(fontSize: 13.5, color: _C.textSecondary(context)),
        ),
      ],
    );
  }
}

class _ConstructionAlert extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [_C.primarySoft, _C.primarySofter],
        ),
        border: Border.all(color: _C.primary.withValues(alpha: 0.35)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: _C.primary,
              borderRadius: BorderRadius.circular(8),
            ),
            alignment: Alignment.center,
            child: const Icon(Icons.bolt_rounded, color: Colors.white, size: 16),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'PIPELINE EM EVOLUÇÃO',
                  style: GoogleFonts.inter(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w700,
                    color: _C.primary,
                    letterSpacing: 1.6,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Backend já responde. Conforme leads chegam (form bio, indicações, expansão), eles entram aqui automaticamente. Arraste cards entre colunas para mover etapas.',
                  style: GoogleFonts.inter(fontSize: 12.5, color: _C.textSecondary(context), height: 1.5),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// =============================================================
// KPI GRID
// =============================================================

class _KpiGrid extends StatelessWidget {
  final int totalLeads;
  final int leadPool;
  final double estimatedValue;
  final int pendingContracts;
  const _KpiGrid({
    required this.totalLeads,
    required this.leadPool,
    required this.estimatedValue,
    required this.pendingContracts,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (_, c) {
      final cross = c.maxWidth < 720 ? 2 : 4;
      return GridView.count(
        crossAxisCount: cross,
        mainAxisSpacing: 8,
        crossAxisSpacing: 8,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        childAspectRatio: cross == 2 ? 3.4 : 4.4,
        children: [
          _KpiCard(
            icon: Icons.groups_outlined,
            iconColor: _C.info,
            iconBg: _C.infoSoft,
            label: 'Lead pool',
            value: '$leadPool',
            sub: 'prontos para distribuir',
          ),
          _KpiCard(
            icon: Icons.warning_amber_rounded,
            iconColor: _C.primary,
            iconBg: _C.primarySoft,
            label: 'Leads totais',
            value: '$totalLeads',
            sub: 'em todas as etapas',
          ),
          _KpiCard(
            icon: Icons.attach_money_rounded,
            iconColor: _C.success,
            iconBg: _C.successSoft,
            label: 'Valor potencial',
            value: _moneyDec.format(estimatedValue),
            sub: 'pipeline total',
          ),
          _KpiCard(
            icon: Icons.assignment_late_outlined,
            iconColor: _C.warning,
            iconBg: _C.warningSoft,
            label: 'Contratos pendentes',
            value: '$pendingContracts',
            sub: 'herdados das unidades',
          ),
        ],
      );
    });
  }
}

class _KpiCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final Color iconBg;
  final String label;
  final String value;
  final String sub;
  const _KpiCard({
    required this.icon,
    required this.iconColor,
    required this.iconBg,
    required this.label,
    required this.value,
    required this.sub,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
      decoration: BoxDecoration(
        color: _C.bgElev1(context),
        border: Border.all(color: _C.hairline(context)),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Container(
            width: 26,
            height: 26,
            decoration: BoxDecoration(
              color: iconBg,
              borderRadius: BorderRadius.circular(7),
            ),
            alignment: Alignment.center,
            child: Icon(icon, size: 13, color: iconColor),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  label.toUpperCase(),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w700,
                    color: _C.textMuted(context),
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 2),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      value,
                      maxLines: 1,
                      overflow: TextOverflow.fade,
                      softWrap: false,
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: _C.textPrimary(context),
                        letterSpacing: -0.3,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        sub,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(
                            fontSize: 10, color: _C.textFaint(context)),
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
}

// =============================================================
// KANBAN
// =============================================================

class _Kanban extends StatelessWidget {
  final List<Lead> leads;
  final String filter;
  final ValueChanged<String> onFilterChange;
  final String? movingId;
  final void Function(Lead lead, String newStage) onMove;
  final VoidCallback onCreate;
  final void Function(Lead lead) onEdit;
  const _Kanban({
    required this.leads,
    required this.filter,
    required this.onFilterChange,
    required this.movingId,
    required this.onMove,
    required this.onCreate,
    required this.onEdit,
  });

  @override
  Widget build(BuildContext context) {
    final totalVal = leads.fold<double>(0, (s, l) => s + (l.valorOportunidade > 0 ? l.valorOportunidade : l.fatEstimado));
    final filters = ['Todos', 'Cliente', 'Creator', 'Unidade'];

    return Container(
      decoration: BoxDecoration(
        color: _C.bgElev1(context),
        border: Border.all(color: _C.hairline(context)),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 12),
            child: Wrap(
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              runSpacing: 10,
              children: [
                Text(
                  '${leads.length} leads · ${_money.format(totalVal)} em pipeline · arraste para mover de etapa',
                  style: GoogleFonts.inter(fontSize: 12, color: _C.textMuted(context)),
                ),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    for (final f in filters)
                      _FilterChip(
                        label: f,
                        active: filter == f,
                        onTap: () => onFilterChange(f),
                      ),
                    const SizedBox(width: 4),
                    _NewLeadButton(onTap: onCreate),
                  ],
                ),
              ],
            ),
          ),
          Divider(color: _C.hairline(context), height: 1),
          SizedBox(
            height: 520,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  for (final stg in _STAGES) ...[
                    _KanbanColumn(
                      stage: stg,
                      leads: leads.where((l) => l.crmEtapa == stg.id).toList(),
                      movingId: movingId,
                      onAccept: (lead) => onMove(lead, stg.id),
                      onCardTap: onEdit,
                    ),
                    const SizedBox(width: 10),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NewLeadButton extends StatelessWidget {
  final VoidCallback onTap;
  const _NewLeadButton({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: _C.primary,
          borderRadius: BorderRadius.circular(8),
          boxShadow: const [
            BoxShadow(color: Color(0x73FF6A2F), blurRadius: 12, offset: Offset(0, 4), spreadRadius: -4),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.add_rounded, color: Colors.white, size: 14),
            const SizedBox(width: 4),
            Text(
              'Novo lead',
              style: GoogleFonts.inter(fontSize: 11.5, fontWeight: FontWeight.w600, color: Colors.white),
            ),
          ],
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;
  const _FilterChip({required this.label, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 120),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: active ? _C.primary : _C.bgElev2(context),
          border: Border.all(color: active ? _C.primary : _C.hairline(context)),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 11.5,
            fontWeight: FontWeight.w600,
            color: active ? Colors.white : _C.textSecondary(context),
          ),
        ),
      ),
    );
  }
}

class _KanbanColumn extends StatefulWidget {
  final _StageDef stage;
  final List<Lead> leads;
  final String? movingId;
  final void Function(Lead lead) onAccept;
  final void Function(Lead lead) onCardTap;
  const _KanbanColumn({
    required this.stage,
    required this.leads,
    required this.movingId,
    required this.onAccept,
    required this.onCardTap,
  });

  @override
  State<_KanbanColumn> createState() => _KanbanColumnState();
}

class _KanbanColumnState extends State<_KanbanColumn> {
  bool _hovering = false;

  @override
  Widget build(BuildContext context) {
    final sum = widget.leads.fold<double>(
      0,
      (s, l) => s + (l.valorOportunidade > 0 ? l.valorOportunidade : l.fatEstimado),
    );

    return DragTarget<Lead>(
      onWillAcceptWithDetails: (details) {
        if (details.data.crmEtapa == widget.stage.id) return false;
        setState(() => _hovering = true);
        return true;
      },
      onLeave: (_) => setState(() => _hovering = false),
      onAcceptWithDetails: (details) {
        setState(() => _hovering = false);
        widget.onAccept(details.data);
      },
      builder: (ctx, candidates, rejected) {
        return AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          width: 280,
          decoration: BoxDecoration(
            color: _hovering ? _C.bgElev3(context) : _C.bgElev2(context),
            border: Border.all(
              color: _hovering ? widget.stage.color : _C.hairline(context),
              width: _hovering ? 1.5 : 1,
            ),
            borderRadius: BorderRadius.circular(12),
          ),
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: widget.stage.color,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      widget.stage.name,
                      style: GoogleFonts.inter(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                        color: _C.textPrimary(context),
                        letterSpacing: -0.1,
                      ),
                    ),
                  ),
                  Text(
                    '${widget.leads.length}',
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: _C.textMuted(context),
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Padding(
                padding: const EdgeInsets.only(left: 16),
                child: Text(
                  _money.format(sum),
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: _C.textMuted(context),
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Expanded(
                child: widget.leads.isEmpty
                    ? Center(
                        child: Text(
                          'Vazio',
                          style: GoogleFonts.inter(fontSize: 11, color: _C.textFaint(context)),
                        ),
                      )
                    : ListView.separated(
                        padding: EdgeInsets.zero,
                        itemCount: widget.leads.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (_, i) => _KanbanCard(
                          lead: widget.leads[i],
                          isMoving: widget.movingId == widget.leads[i].id,
                          onTap: () => widget.onCardTap(widget.leads[i]),
                        ),
                      ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _KanbanCard extends StatelessWidget {
  final Lead lead;
  final bool isMoving;
  final VoidCallback onTap;
  const _KanbanCard({required this.lead, required this.isMoving, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final tag = _tagFor(lead);
    final val = lead.valorOportunidade > 0 ? lead.valorOportunidade : lead.fatEstimado;

    final card = Container(
      padding: const EdgeInsets.all(11),
      decoration: BoxDecoration(
        color: _C.bgElev1(context),
        border: Border.all(color: _C.hairline(context)),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  lead.nome,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                    color: _C.textPrimary(context),
                    height: 1.25,
                  ),
                ),
              ),
              if (tag != null) ...[
                const SizedBox(width: 6),
                _TypeTag(label: tag.label, bg: tag.bg, fg: tag.fg),
              ],
            ],
          ),
          if ((lead.cidade != null && lead.cidade!.isNotEmpty) || (lead.origem != null && lead.origem!.isNotEmpty)) ...[
            const SizedBox(height: 6),
            Text(
              [
                if (lead.cidade != null && lead.cidade!.isNotEmpty) lead.cidade,
                if (lead.origem != null && lead.origem!.isNotEmpty) lead.origem,
              ].join(' · '),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.inter(fontSize: 10.5, color: _C.textMuted(context)),
            ),
          ],
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: Text(
                  val > 0 ? _money.format(val) : '—',
                  style: GoogleFonts.inter(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                    color: _C.textPrimary(context),
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
              ),
              if (lead.responsavelNome != null && lead.responsavelNome!.isNotEmpty)
                Container(
                  width: 22,
                  height: 22,
                  decoration: BoxDecoration(
                    color: _C.primarySoft,
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    _initials(lead.responsavelNome!),
                    style: GoogleFonts.inter(
                      fontSize: 9,
                      fontWeight: FontWeight.w700,
                      color: _C.primary,
                    ),
                  ),
                ),
            ],
          ),
          if (lead.isNovo) ...[
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: _C.successSoft,
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                'NOVO',
                style: GoogleFonts.inter(
                  fontSize: 9,
                  fontWeight: FontWeight.w700,
                  color: _C.success,
                  letterSpacing: 0.6,
                ),
              ),
            ),
          ],
        ],
      ),
    );

    if (isMoving) {
      return Opacity(opacity: 0.4, child: card);
    }

    return Draggable<Lead>(
      data: lead,
      feedback: Material(
        color: Colors.transparent,
        child: Transform.scale(scale: 1.04, child: SizedBox(width: 256, child: card)),
      ),
      childWhenDragging: Opacity(opacity: 0.3, child: card),
      child: MouseRegion(
        cursor: SystemMouseCursors.grab,
        child: GestureDetector(onTap: onTap, child: card),
      ),
    );
  }

  static _Tag? _tagFor(Lead lead) {
    final n = (lead.nicho ?? '').toLowerCase();
    if (n.contains('unidade') || n.contains('franquead')) {
      return const _Tag('Unidade', _C.infoSoft, _C.info);
    }
    if (n.contains('creator') || n.contains('apresentador')) {
      return const _Tag('Creator', _C.accentSoft, _C.accent);
    }
    if (n.contains('cliente') || n.contains('bio_')) {
      return const _Tag('Cliente', _C.primarySoft, _C.primary);
    }
    return null;
  }

  static String _initials(String s) {
    final parts = s.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts[0].substring(0, 1).toUpperCase();
    return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
  }
}

class _Tag {
  final String label;
  final Color bg;
  final Color fg;
  const _Tag(this.label, this.bg, this.fg);
}

class _TypeTag extends StatelessWidget {
  final String label;
  final Color bg;
  final Color fg;
  const _TypeTag({required this.label, required this.bg, required this.fg});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: GoogleFonts.inter(
          fontSize: 9.5,
          fontWeight: FontWeight.w700,
          color: fg,
          letterSpacing: 0.4,
        ),
      ),
    );
  }
}

// =============================================================
// PIPELINE + CAMPOS
// =============================================================

class _PipelineCard extends StatelessWidget {
  static const _items = [
    (Color(0xFF5AC8FA), 'Lead captado'),
    (Color(0xFF5AC8FA), 'Qualificação'),
    (Color(0xFF5AC8FA), 'Reunião agendada'),
    (Color(0xFFFF6A2F), 'Negociação'),
    (Color(0xFFFF6A2F), 'Contrato enviado'),
    (Color(0xFFFBBF24), 'Contrato pendente'),
    (Color(0xFF34D399), 'Fechado ganho'),
  ];

  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      title: 'Pipeline sugerida',
      subtitle: 'estrutura do funil — espelha as colunas do kanban acima',
      child: Column(
        children: [
          for (final it in _items)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 5),
              child: Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(color: it.$1, shape: BoxShape.circle),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      it.$2,
                      style: GoogleFonts.inter(fontSize: 13, color: _C.textPrimary(context)),
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

class _FieldsCard extends StatelessWidget {
  static const _fields = [
    'Nome do lead',
    'Tipo de lead (Cliente / Creator / Unidade)',
    'Origem (form bio, indicação, outbound)',
    'Responsável atribuído',
    'Etapa atual no CRM',
    'Valor potencial',
    'Próxima ação',
    'Data de follow-up',
    'Observações internas',
  ];

  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      title: 'Campos básicos do CRM',
      subtitle: 'modelagem mínima — backend já suporta todos',
      child: Column(
        children: [
          for (final f in _fields)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 5),
              child: Row(
                children: [
                  const Icon(Icons.check_circle_outline, size: 14, color: _C.success),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      f,
                      style: GoogleFonts.inter(fontSize: 13, color: _C.textPrimary(context)),
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

class _SectionCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final Widget child;
  const _SectionCard({required this.title, required this.subtitle, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
      decoration: BoxDecoration(
        color: _C.bgElev1(context),
        border: Border.all(color: _C.hairline(context)),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            title,
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: _C.textPrimary(context),
              letterSpacing: -0.2,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: GoogleFonts.inter(fontSize: 11.5, color: _C.textMuted(context)),
          ),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }
}

// =============================================================
// LOADING / ERROR
// =============================================================

class _LoadingBlock extends StatelessWidget {
  const _LoadingBlock();
  @override
  Widget build(BuildContext context) {
    return const SkeletonList(itemCount: 4, itemHeight: 80);
  }
}

class _ErrorBlock extends StatelessWidget {
  final Object error;
  final VoidCallback onRetry;
  const _ErrorBlock({required this.error, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: _C.bgElev1(context),
        border: Border.all(color: _C.danger.withValues(alpha: 0.3)),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        children: [
          const Icon(Icons.error_outline, color: _C.danger, size: 28),
          const SizedBox(height: 8),
          Text(
            'Erro ao carregar dados',
            style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: _C.textPrimary(context)),
          ),
          const SizedBox(height: 4),
          Text(
            '$error',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(fontSize: 11, color: _C.textMuted(context)),
          ),
          const SizedBox(height: 12),
          OutlinedButton(
            onPressed: onRetry,
            style: OutlinedButton.styleFrom(
              foregroundColor: _C.primary,
              side: const BorderSide(color: _C.primary),
            ),
            child: const Text('Tentar de novo'),
          ),
        ],
      ),
    );
  }
}

// =============================================================
// Pipeline real (W3-C) — agregação cross-tenant do backend.
// Cards por etapa com count + valor; clique abre modal com top 5 unidades.
// =============================================================

class _PipelineRealCard extends StatelessWidget {
  final MasterCrmData crm;
  const _PipelineRealCard({required this.crm});

  Color _stageColor(BuildContext ctx, String stageId) {
    switch (stageId) {
      case 'lead_novo':
      case 'contato_iniciado':
      case 'reuniao_agendada':
        return _C.info;
      case 'proposta_enviada':
      case 'em_negociacao':
        return _C.primary;
      case 'aguardando_assinatura':
        return _C.warning;
      case 'ganho':
        return _C.success;
      case 'perdido':
        return const Color(0xFF7A7A82);
      default:
        return _C.textMuted(ctx);
    }
  }

  @override
  Widget build(BuildContext context) {
    final totals = crm.totals;
    return _SectionCard(
      title: 'Pipeline cross-tenant',
      subtitle:
          'agregação real de leads em todas as unidades — clique numa etapa para o top 5 por unidade',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Totals strip
          Wrap(
            spacing: 18,
            runSpacing: 8,
            children: [
              _MiniStat(
                label: 'leads totais',
                value: '${totals.leadsTotal}',
              ),
              _MiniStat(
                label: 'valor pipeline',
                value: _money.format(totals.valorTotal),
              ),
              _MiniStat(
                label: 'novos 7d',
                value: '${totals.leadsUltimos7d}',
              ),
              _MiniStat(
                label: 'taxa ganho 30d',
                value: '${totals.taxaGanhos30d.toStringAsFixed(1)}%',
              ),
              if (totals.motivoPerdaTop != null)
                _MiniStat(
                  label: 'principal motivo perda',
                  value: totals.motivoPerdaTop!,
                ),
            ],
          ),
          const SizedBox(height: 14),
          // Stage rows
          for (final stage in crm.pipeline)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: InkWell(
                borderRadius: BorderRadius.circular(8),
                onTap: stage.porTenant.isEmpty
                    ? null
                    : () => _showStageDrillDown(context, stage),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    vertical: 8,
                    horizontal: 6,
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 10,
                        height: 10,
                        decoration: BoxDecoration(
                          color: _stageColor(context, stage.stageId),
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          stage.label,
                          style: GoogleFonts.inter(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w500,
                            color: _C.textPrimary(context),
                          ),
                        ),
                      ),
                      Text(
                        '${stage.count} leads',
                        style: GoogleFonts.inter(
                          fontSize: 12.5,
                          color: _C.textSecondary(context),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Text(
                        _money.format(stage.value),
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: _C.textPrimary(context),
                        ),
                      ),
                      if (stage.porTenant.isNotEmpty) ...[
                        const SizedBox(width: 8),
                        Icon(
                          Icons.chevron_right,
                          size: 18,
                          color: _C.textMuted(context),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  void _showStageDrillDown(BuildContext context, MasterPipelineStage stage) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: _C.bgElev1(ctx),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        child: Container(
          constraints: const BoxConstraints(maxWidth: 480),
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: _stageColor(ctx, stage.stageId),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      stage.label,
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: _C.textPrimary(ctx),
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(ctx).pop(),
                    icon: Icon(Icons.close, color: _C.textMuted(ctx)),
                    splashRadius: 18,
                  ),
                ],
              ),
              Text(
                'top 5 unidades nesta etapa',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  color: _C.textMuted(ctx),
                ),
              ),
              const SizedBox(height: 12),
              for (final t in stage.porTenant)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          t.tenantNome,
                          style: GoogleFonts.inter(
                            fontSize: 13.5,
                            color: _C.textPrimary(ctx),
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Text(
                        '${t.count} · ${_money.format(t.value)}',
                        style: GoogleFonts.inter(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                          color: _C.textSecondary(ctx),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  final String label;
  final String value;
  const _MiniStat({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label.toUpperCase(),
          style: GoogleFonts.inter(
            fontSize: 9.5,
            color: _C.textMuted(context),
            letterSpacing: 0.6,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: _C.textPrimary(context),
          ),
        ),
      ],
    );
  }
}
