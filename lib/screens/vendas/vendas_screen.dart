import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../design_system/design_system.dart';
import '../../models/lead.dart';
import '../../providers/leads_provider.dart';
import '../../providers/pacotes_provider.dart';
import '../../routes/app_routes.dart';
import '../../services/api_service.dart';
import '../../widgets/client_avatar.dart';

class VendasScreen extends ConsumerStatefulWidget {
  const VendasScreen({super.key});

  @override
  ConsumerState<VendasScreen> createState() => _VendasScreenState();
}

class _VendasScreenState extends ConsumerState<VendasScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  static const _etapas = <_CrmStage>[
    _CrmStage('lead_novo', 'Lead novo'),
    _CrmStage('contato_iniciado', 'Contato iniciado'),
    _CrmStage('reuniao_agendada', 'Reunião agendada'),
    _CrmStage('proposta_enviada', 'Proposta enviada'),
    _CrmStage('em_negociacao', 'Em negociação'),
    _CrmStage('aguardando_assinatura', 'Aguardando assinatura'),
    _CrmStage('perdido', 'Perdido'),
  ];

  static final _brl =
      NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final leadsAsync = ref.watch(leadsProvider);
    final leads = leadsAsync.valueOrNull ?? const <Lead>[];
    final abertos = leads.where((lead) => lead.crmEtapa != 'perdido').toList();
    final pipelineValue =
        abertos.fold(0.0, (sum, lead) => sum + lead.valorOportunidade);
    final parados = abertos.where(_leadParado).length;
    final aguardandoAssinatura =
        leads.where((l) => l.crmEtapa == 'aguardando_assinatura').length;

    return AppScreenScaffold(
      currentRoute: AppRoutes.comercial,
      title: 'Comercial',
      eyebrow: 'CRM',
      titleSerif: true,
      subtitle: 'Pipeline de leads e negociações.',
      actions: [
        IconButton(
          tooltip: 'Atualizar',
          icon: const Icon(Icons.refresh),
          color: context.colors.textSecondary,
          onPressed: () => ref.read(leadsProvider.notifier).refresh(),
        ),
        AppPrimaryButton(
          label: 'Novo lead',
          icon: Icons.add,
          onPressed: () => _showLeadForm(context, ref),
        ),
      ],
      child: Column(
        children: [
          // ── Barra de abas ──
          Material(
            color: context.colors.bgCard,
            elevation: 1,
            child: TabBar(
              controller: _tabController,
              labelColor: AppColors.primary,
              unselectedLabelColor: context.colors.textSecondary,
              indicatorColor: AppColors.primary,
              tabs: const [
                Tab(
                  icon: Icon(Icons.view_column_outlined, size: 18),
                  text: 'Pipeline',
                ),
                Tab(
                  icon: Icon(Icons.analytics_outlined, size: 18),
                  text: 'Métricas',
                ),
              ],
            ),
          ),

          // ── Conteúdo das abas ──
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                // Tab 0 — Pipeline
                leadsAsync.when(
                  loading: () =>
                      const Center(child: CircularProgressIndicator()),
                  error: (e, _) => _ErrorState(
                    message: ApiService.extractErrorMessage(e),
                    onRetry: () => ref.read(leadsProvider.notifier).refresh(),
                  ),
                  data: (items) => _KanbanBoard(
                    etapas: _etapas,
                    leads: items,
                    currency: _brl,
                    onOpenLead: (lead) =>
                        _showLeadDetail(context, ref, lead),
                    onMoveLead: (lead, etapa) =>
                        _moveLead(context, ref, lead, etapa),
                  ),
                ),

                // Tab 1 — Métricas
                _MetricasTab(
                  leads: leads,
                  abertos: abertos,
                  pipelineValue: pipelineValue,
                  parados: parados,
                  aguardandoAssinatura: aguardandoAssinatura,
                  etapas: _etapas,
                  currency: _brl,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static bool _leadParado(Lead lead) {
    final refDate = lead.atualizadoEm ?? lead.pegoEm ?? lead.criadoEm;
    return DateTime.now().difference(refDate).inDays >= 7;
  }

  static Future<void> _moveLead(
    BuildContext context,
    WidgetRef ref,
    Lead lead,
    String etapa,
  ) async {
    if (lead.crmEtapa == etapa) return;

    String? motivo;
    if (etapa == 'perdido') {
      motivo = await _askMotivoPerda(context);
      if (motivo == null || motivo.trim().isEmpty) return;
    }

    try {
      await ref
          .read(leadsProvider.notifier)
          .moverEtapa(lead.id, etapa, motivoPerda: motivo?.trim());
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ApiService.extractErrorMessage(e))),
      );
    }
  }

  static Future<String?> _askMotivoPerda(BuildContext context) {
    final ctrl = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Motivo de perda', style: AppTypography.h3),
        content: _TextArea(
          controller: ctrl,
          hint: 'Ex.: sem fit, preço, sem retorno...',
          maxLines: 3,
        ),
        actions: [
          AppSecondaryButton(
            label: 'Cancelar',
            onPressed: () => Navigator.of(dialogContext).pop(),
          ),
          AppPrimaryButton(
            label: 'Salvar',
            onPressed: () => Navigator.of(dialogContext).pop(ctrl.text),
          ),
        ],
      ),
    );
  }

  static Future<void> _showLeadForm(BuildContext context, WidgetRef ref) async {
    final nomeCtrl = TextEditingController();
    final valorCtrl = TextEditingController();
    final responsavelCtrl = TextEditingController();
    final origemCtrl = TextEditingController(text: 'SDR');
    final nichoCtrl = TextEditingController();
    final cidadeCtrl = TextEditingController();
    bool saving = false;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: context.colors.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
      ),
      builder: (sheetContext) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.fromLTRB(
            AppSpacing.x5,
            AppSpacing.x2,
            AppSpacing.x5,
            AppSpacing.x5 + MediaQuery.of(ctx).viewInsets.bottom,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Novo lead', style: AppTypography.h2),
              const SizedBox(height: AppSpacing.x4),
              AppTextField(controller: nomeCtrl, hint: 'Nome do lead *'),
              const SizedBox(height: AppSpacing.x3),
              AppTextField(
                controller: valorCtrl,
                hint: 'Valor da oportunidade R\$',
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
              ),
              const SizedBox(height: AppSpacing.x3),
              Row(
                children: [
                  Expanded(
                    child: AppTextField(
                      controller: responsavelCtrl,
                      hint: 'Responsável',
                    ),
                  ),
                  const SizedBox(width: AppSpacing.x3),
                  Expanded(
                    child: AppTextField(
                      controller: origemCtrl,
                      hint: 'Origem',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.x3),
              Row(
                children: [
                  Expanded(
                    child: AppTextField(controller: nichoCtrl, hint: 'Nicho'),
                  ),
                  const SizedBox(width: AppSpacing.x3),
                  Expanded(
                    child: AppTextField(controller: cidadeCtrl, hint: 'Cidade'),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.x5),
              if (saving)
                const Center(child: CircularProgressIndicator())
              else
                Row(
                  children: [
                    Expanded(
                      child: AppSecondaryButton(
                        label: 'Cancelar',
                        fullWidth: true,
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.x3),
                    Expanded(
                      child: AppPrimaryButton(
                        label: 'Salvar',
                        fullWidth: true,
                        onPressed: () async {
                          final nome = nomeCtrl.text.trim();
                          if (nome.isEmpty) {
                            ScaffoldMessenger.of(ctx).showSnackBar(
                              const SnackBar(
                                  content: Text('Nome é obrigatório')),
                            );
                            return;
                          }
                          setModalState(() => saving = true);
                          try {
                            final valor = double.tryParse(
                                  valorCtrl.text.replaceAll(',', '.'),
                                ) ??
                                0;
                            await ref.read(leadsProvider.notifier).criar({
                              'nome': nome,
                              'valor_oportunidade': valor,
                              'fat_estimado': valor,
                              if (responsavelCtrl.text.trim().isNotEmpty)
                                'responsavel_nome': responsavelCtrl.text.trim(),
                              if (origemCtrl.text.trim().isNotEmpty)
                                'origem': origemCtrl.text.trim(),
                              if (nichoCtrl.text.trim().isNotEmpty)
                                'nicho': nichoCtrl.text.trim(),
                              if (cidadeCtrl.text.trim().isNotEmpty)
                                'cidade': cidadeCtrl.text.trim(),
                            });
                            if (ctx.mounted) Navigator.pop(ctx);
                          } catch (e) {
                            if (!ctx.mounted) return;
                            ScaffoldMessenger.of(ctx).showSnackBar(
                              SnackBar(
                                  content:
                                      Text(ApiService.extractErrorMessage(e))),
                            );
                          } finally {
                            if (ctx.mounted) {
                              setModalState(() => saving = false);
                            }
                          }
                        },
                      ),
                    ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }

  static Future<void> _showLeadDetail(
    BuildContext context,
    WidgetRef ref,
    Lead lead,
  ) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: context.colors.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
      ),
      builder: (_) => _LeadDetailSheet(
        lead: lead,
        currency: _brl,
        onSave: (payload) =>
            ref.read(leadsProvider.notifier).atualizar(lead.id, payload),
        onLost: () async {
          final motivo = await _askMotivoPerda(context);
          if (motivo == null || motivo.trim().isEmpty) return;
          await ref
              .read(leadsProvider.notifier)
              .moverEtapa(lead.id, 'perdido', motivoPerda: motivo.trim());
        },
        onWon: () => _showGanharLeadDialog(context, ref, lead),
      ),
    );
  }

  static Future<void> _showGanharLeadDialog(
    BuildContext context,
    WidgetRef ref,
    Lead lead,
  ) async {
    final celularCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    String? pacoteId;
    bool saving = false;

    await showDialog<void>(
      context: context,
      builder: (dialogContext) => Consumer(
        builder: (ctx, ref, _) {
          final pacotesAsync = ref.watch(pacotesProvider);
          final pacotes =
              pacotesAsync.valueOrNull?.where((p) => p.ativo).toList() ?? [];
          pacoteId ??= pacotes.isNotEmpty ? pacotes.first.id : null;

          return StatefulBuilder(
            builder: (ctx, setDialogState) => AlertDialog(
              title: const Text('Marcar ganho', style: AppTypography.h3),
              content: SizedBox(
                width: 460,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    AppTextField(
                      controller: celularCtrl,
                      hint: 'Telefone do cliente *',
                    ),
                    const SizedBox(height: AppSpacing.x3),
                    AppTextField(
                      controller: emailCtrl,
                      hint: 'E-mail do cliente',
                      keyboardType: TextInputType.emailAddress,
                    ),
                    const SizedBox(height: AppSpacing.x3),
                    DropdownButtonFormField<String>(
                      initialValue: pacoteId,
                      items: pacotes
                          .map(
                            (p) => DropdownMenuItem(
                              value: p.id,
                              child: Text(
                                '${p.nome} · ${_brl.format(p.valorFixo)} · ${p.comissaoPct.toStringAsFixed(1)}%',
                              ),
                            ),
                          )
                          .toList(),
                      onChanged: (value) =>
                          setDialogState(() => pacoteId = value),
                      decoration: const InputDecoration(
                        labelText: 'Pacote do contrato ativo',
                      ),
                    ),
                    if (pacotesAsync.isLoading)
                      const Padding(
                        padding: EdgeInsets.only(top: AppSpacing.x3),
                        child: LinearProgressIndicator(),
                      ),
                  ],
                ),
              ),
              actions: [
                AppSecondaryButton(
                  label: 'Cancelar',
                  onPressed: () => Navigator.pop(ctx),
                ),
                AppPrimaryButton(
                  label: saving ? 'Convertendo...' : 'Criar cliente',
                  onPressed: saving
                      ? null
                      : () async {
                          if (celularCtrl.text.trim().isEmpty ||
                              pacoteId == null) {
                            ScaffoldMessenger.of(ctx).showSnackBar(
                              const SnackBar(
                                content: Text('Informe telefone e pacote.'),
                              ),
                            );
                            return;
                          }
                          setDialogState(() => saving = true);
                          try {
                            await ref.read(leadsProvider.notifier).ganhar(
                              lead.id,
                              {
                                'pacote_id': pacoteId,
                                'celular': celularCtrl.text.trim(),
                                if (emailCtrl.text.trim().isNotEmpty)
                                  'email': emailCtrl.text.trim(),
                              },
                            );
                            if (ctx.mounted) Navigator.pop(ctx);
                          } catch (e) {
                            if (!ctx.mounted) return;
                            ScaffoldMessenger.of(ctx).showSnackBar(
                              SnackBar(
                                content:
                                    Text(ApiService.extractErrorMessage(e)),
                              ),
                            );
                          } finally {
                            if (ctx.mounted) {
                              setDialogState(() => saving = false);
                            }
                          }
                        },
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

// ── Tab 1: Métricas ────────────────────────────────────────────────────────

class _MetricasTab extends StatelessWidget {
  final List<Lead> leads;
  final List<Lead> abertos;
  final double pipelineValue;
  final int parados;
  final int aguardandoAssinatura;
  final List<_CrmStage> etapas;
  final NumberFormat currency;

  const _MetricasTab({
    required this.leads,
    required this.abertos,
    required this.pipelineValue,
    required this.parados,
    required this.aguardandoAssinatura,
    required this.etapas,
    required this.currency,
  });

  @override
  Widget build(BuildContext context) {
    final total = leads.length;
    final perdidos = leads.where((l) => l.crmEtapa == 'perdido').length;
    final ganhos = leads.where((l) => l.crmEtapa == 'aguardando_assinatura').length;
    final taxaConversao = total > 0
        ? (ganhos / total * 100).toStringAsFixed(1)
        : '0.0';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.x4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── KPI cards (2×2 grid) ──
          LayoutBuilder(
            builder: (ctx, constraints) {
              final isNarrow = constraints.maxWidth < 560;
              if (isNarrow) {
                return Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: KpiAccentCard(
                            label: 'Pipeline aberto',
                            value: '${abertos.length}',
                            sub: 'leads ativos',
                            accentTop: true,
                          ),
                        ),
                        const SizedBox(width: AppSpacing.x3),
                        Expanded(
                          child: KpiAccentCard(
                            label: 'Valor pipeline',
                            value: currency.format(pipelineValue),
                            sub: 'oportunidades',
                            valueColor: AppColors.success,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.x3),
                    Row(
                      children: [
                        Expanded(
                          child: KpiAccentCard(
                            label: 'Aguardando assinatura',
                            value: '$aguardandoAssinatura',
                            sub: 'negociações',
                          ),
                        ),
                        const SizedBox(width: AppSpacing.x3),
                        Expanded(
                          child: KpiAccentCard(
                            label: 'Leads parados',
                            value: '$parados',
                            sub: '7+ dias sem avanço',
                            valueColor: parados > 0 ? AppColors.warning : null,
                          ),
                        ),
                      ],
                    ),
                  ],
                );
              }
              return Row(
                children: [
                  Expanded(
                    child: KpiAccentCard(
                      label: 'Pipeline aberto',
                      value: '${abertos.length}',
                      sub: 'leads ativos',
                      accentTop: true,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.x3),
                  Expanded(
                    child: KpiAccentCard(
                      label: 'Valor pipeline',
                      value: currency.format(pipelineValue),
                      sub: 'oportunidades',
                      valueColor: AppColors.success,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.x3),
                  Expanded(
                    child: KpiAccentCard(
                      label: 'Aguardando assinatura',
                      value: '$aguardandoAssinatura',
                      sub: 'negociações',
                    ),
                  ),
                  const SizedBox(width: AppSpacing.x3),
                  Expanded(
                    child: KpiAccentCard(
                      label: 'Leads parados',
                      value: '$parados',
                      sub: '7+ dias sem avanço',
                      valueColor: parados > 0 ? AppColors.warning : null,
                    ),
                  ),
                ],
              );
            },
          ),

          const SizedBox(height: AppSpacing.x5),

          // ── Métricas derivadas ──
          Row(
            children: [
              Expanded(
                child: KpiAccentCard(
                  label: 'Taxa de conversão',
                  value: '$taxaConversao%',
                  sub: 'leads → aguardando assinatura',
                  valueColor: AppColors.success,
                ),
              ),
              const SizedBox(width: AppSpacing.x3),
              Expanded(
                child: KpiAccentCard(
                  label: 'Leads perdidos',
                  value: '$perdidos',
                  sub: 'total histórico',
                  valueColor: perdidos > 0 ? AppColors.danger : null,
                ),
              ),
            ],
          ),

          const SizedBox(height: AppSpacing.x5),

          // ── Contagem por etapa ──
          const Text('Leads por etapa', style: AppTypography.h3),
          const SizedBox(height: AppSpacing.x3),
          AppCard(
            child: Column(
              children: [
                for (int i = 0; i < etapas.length; i++) ...[
                  if (i > 0)
                    Divider(
                      height: 1,
                      color: context.colors.borderSubtle,
                    ),
                  _EtapaRow(
                    etapa: etapas[i],
                    count:
                        leads.where((l) => l.crmEtapa == etapas[i].id).length,
                    total: leads.isEmpty ? 1 : leads.length,
                  ),
                ],
              ],
            ),
          ),

          const SizedBox(height: AppSpacing.x4),
        ],
      ),
    );
  }
}

class _EtapaRow extends StatelessWidget {
  final _CrmStage etapa;
  final int count;
  final int total;

  const _EtapaRow({
    required this.etapa,
    required this.count,
    required this.total,
  });

  @override
  Widget build(BuildContext context) {
    final pct = count / total;
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.x4,
        vertical: AppSpacing.x3,
      ),
      child: Row(
        children: [
          Expanded(
            flex: 3,
            child: Text(etapa.label, style: AppTypography.bodyMedium),
          ),
          Expanded(
            flex: 5,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(AppRadius.full),
              child: LinearProgressIndicator(
                value: pct,
                minHeight: 6,
                backgroundColor: context.colors.bgMuted,
                valueColor: AlwaysStoppedAnimation<Color>(
                  etapa.id == 'perdido' ? AppColors.danger : AppColors.primary,
                ),
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.x3),
          SizedBox(
            width: 32,
            child: Text(
              '$count',
              style: AppTypography.bodyMedium
                  .copyWith(fontWeight: FontWeight.w700),
              textAlign: TextAlign.end,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Kanban ─────────────────────────────────────────────────────────────────

class _KanbanBoard extends StatelessWidget {
  final List<_CrmStage> etapas;
  final List<Lead> leads;
  final NumberFormat currency;
  final void Function(Lead lead) onOpenLead;
  final Future<void> Function(Lead lead, String etapa) onMoveLead;

  const _KanbanBoard({
    required this.etapas,
    required this.leads,
    required this.currency,
    required this.onOpenLead,
    required this.onMoveLead,
  });

  @override
  Widget build(BuildContext context) {
    if (leads.isEmpty) {
      return Center(
        child: Text(
          'Nenhum lead no pipeline.',
          style: AppTypography.bodySmall
              .copyWith(color: context.colors.textSecondary),
        ),
      );
    }

    return Scrollbar(
      thumbVisibility: true,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.x4,
          0,
          AppSpacing.x4,
          AppSpacing.x4,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: etapas.map((etapa) {
            final items =
                leads.where((lead) => lead.crmEtapa == etapa.id).toList();
            return Padding(
              padding: const EdgeInsets.only(right: AppSpacing.x3),
              child: _KanbanColumn(
                etapa: etapa,
                leads: items,
                currency: currency,
                onOpenLead: onOpenLead,
                onAcceptLead: (lead) => onMoveLead(lead, etapa.id),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }
}

class _KanbanColumn extends StatelessWidget {
  final _CrmStage etapa;
  final List<Lead> leads;
  final NumberFormat currency;
  final void Function(Lead lead) onOpenLead;
  final Future<void> Function(Lead lead) onAcceptLead;

  const _KanbanColumn({
    required this.etapa,
    required this.leads,
    required this.currency,
    required this.onOpenLead,
    required this.onAcceptLead,
  });

  @override
  Widget build(BuildContext context) {
    final total = leads.fold(0.0, (sum, lead) => sum + lead.valorOportunidade);
    return DragTarget<Lead>(
      onWillAcceptWithDetails: (details) => details.data.crmEtapa != etapa.id,
      onAcceptWithDetails: (details) => onAcceptLead(details.data),
      builder: (context, candidateData, rejectedData) {
        final isHover = candidateData.isNotEmpty;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 140),
          width: 292,
          constraints: const BoxConstraints(minHeight: 520),
          decoration: BoxDecoration(
            color:
                isHover ? context.colors.primarySoftBg : context.colors.bgMuted,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(
              color: isHover ? AppColors.primary : context.colors.borderSubtle,
            ),
          ),
          padding: const EdgeInsets.all(AppSpacing.x3),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      etapa.label,
                      style: AppTypography.bodyMedium
                          .copyWith(fontWeight: FontWeight.w700),
                    ),
                  ),
                  AppBadge(
                    label: '${leads.length}',
                    type: AppBadgeType.neutral,
                    showDot: false,
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.x1),
              Text(
                currency.format(total),
                style: AppTypography.caption
                    .copyWith(color: context.colors.textSecondary),
              ),
              const SizedBox(height: AppSpacing.x3),
              if (leads.isEmpty)
                Container(
                  height: 96,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    border: Border.all(color: context.colors.borderSubtle),
                  ),
                  child: Text(
                    'Arraste leads aqui',
                    style: AppTypography.caption
                        .copyWith(color: context.colors.textMuted),
                  ),
                )
              else
                ...leads.map(
                  (lead) => Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.x3),
                    child: LongPressDraggable<Lead>(
                      data: lead,
                      feedback: Material(
                        color: Colors.transparent,
                        child: SizedBox(
                          width: 276,
                          child: _LeadKanbanCard(
                            lead: lead,
                            currency: currency,
                            dragging: true,
                            onTap: () {}, // Disabled during drag
                          ),
                        ),
                      ),
                      childWhenDragging: Opacity(
                        opacity: 0.35,
                        child: _LeadKanbanCard(
                          lead: lead,
                          currency: currency,
                          onTap: () => onOpenLead(lead),
                        ),
                      ),
                      child: _LeadKanbanCard(
                        lead: lead,
                        currency: currency,
                        onTap: () => onOpenLead(lead),
                      ),
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

class _LeadKanbanCard extends StatelessWidget {
  final Lead lead;
  final NumberFormat currency;
  final VoidCallback onTap;
  final bool dragging;

  const _LeadKanbanCard({
    required this.lead,
    required this.currency,
    required this.onTap,
    this.dragging = false,
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: dragging ? null : onTap,
      padding: const EdgeInsets.all(AppSpacing.x3),
      shadow: dragging
          ? [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.18),
                blurRadius: 18,
                offset: const Offset(0, 10),
              ),
            ]
          : const [],
      borderColor: context.colors.borderSubtle,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              ClientAvatar(
                initials:
                    lead.nome.isNotEmpty ? lead.nome[0].toUpperCase() : '?',
                tone: ClientAvatarTone.neutral,
                size: 34,
              ),
              const SizedBox(width: AppSpacing.x2),
              Expanded(
                child: Text(
                  lead.nome,
                  style: AppTypography.bodyMedium
                      .copyWith(fontWeight: FontWeight.w700),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (lead.isNovo)
                const AppBadge(
                  label: 'NOVO',
                  type: AppBadgeType.danger,
                  showDot: false,
                ),
            ],
          ),
          const SizedBox(height: AppSpacing.x3),
          Text(
            currency.format(lead.valorOportunidade),
            style: AppTypography.h3.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: AppSpacing.x2),
          _MiniLine(
              icon: Icons.person_outline,
              text: lead.responsavelNome ?? 'Sem responsável'),
          _MiniLine(
              icon: Icons.campaign_outlined,
              text: lead.origem ?? 'Origem não informada'),
          if ((lead.nicho ?? '').isNotEmpty || (lead.cidade ?? '').isNotEmpty)
            _MiniLine(
              icon: Icons.storefront_outlined,
              text: [
                if ((lead.nicho ?? '').isNotEmpty) lead.nicho!,
                if ((lead.cidade ?? '').isNotEmpty) lead.cidade!,
              ].join(' • '),
            ),
          if (lead.tarefas.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: AppSpacing.x2),
              child: AppBadge(
                label:
                    '${lead.tarefas.length} tarefa${lead.tarefas.length == 1 ? '' : 's'}',
                type: AppBadgeType.warning,
                showDot: false,
              ),
            ),
        ],
      ),
    );
  }
}

class _LeadDetailSheet extends StatefulWidget {
  final Lead lead;
  final NumberFormat currency;
  final Future<void> Function(Map<String, dynamic> payload) onSave;
  final Future<void> Function() onLost;
  final Future<void> Function() onWon;

  const _LeadDetailSheet({
    required this.lead,
    required this.currency,
    required this.onSave,
    required this.onLost,
    required this.onWon,
  });

  @override
  State<_LeadDetailSheet> createState() => _LeadDetailSheetState();
}

class _LeadDetailSheetState extends State<_LeadDetailSheet> {
  late final TextEditingController _valorCtrl;
  late final TextEditingController _responsavelCtrl;
  late final TextEditingController _origemCtrl;
  late final TextEditingController _observacoesCtrl;
  late final TextEditingController _historicoCtrl;
  late final TextEditingController _tarefaCtrl;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _valorCtrl = TextEditingController(
      text: widget.lead.valorOportunidade.toStringAsFixed(2),
    );
    _responsavelCtrl =
        TextEditingController(text: widget.lead.responsavelNome ?? '');
    _origemCtrl = TextEditingController(text: widget.lead.origem ?? '');
    _observacoesCtrl =
        TextEditingController(text: widget.lead.observacoesInternas ?? '');
    _historicoCtrl = TextEditingController();
    _tarefaCtrl = TextEditingController();
  }

  @override
  void dispose() {
    _valorCtrl.dispose();
    _responsavelCtrl.dispose();
    _origemCtrl.dispose();
    _observacoesCtrl.dispose();
    _historicoCtrl.dispose();
    _tarefaCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      final contatos = [...widget.lead.historicoContatos];
      final contato = _historicoCtrl.text.trim();
      if (contato.isNotEmpty) {
        contatos.add({
          'texto': contato,
          'criado_em': DateTime.now().toIso8601String(),
        });
      }

      final tarefas = [...widget.lead.tarefas];
      final tarefa = _tarefaCtrl.text.trim();
      if (tarefa.isNotEmpty) {
        tarefas.add({
          'titulo': tarefa,
          'status': 'pendente',
          'criado_em': DateTime.now().toIso8601String(),
        });
      }

      await widget.onSave({
        'valor_oportunidade':
            double.tryParse(_valorCtrl.text.replaceAll(',', '.')) ?? 0,
        'responsavel_nome': _responsavelCtrl.text.trim().isEmpty
            ? null
            : _responsavelCtrl.text.trim(),
        'origem':
            _origemCtrl.text.trim().isEmpty ? null : _origemCtrl.text.trim(),
        'observacoes_internas': _observacoesCtrl.text.trim().isEmpty
            ? null
            : _observacoesCtrl.text.trim(),
        'historico_contatos': contatos,
        'tarefas': tarefas,
      });
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ApiService.extractErrorMessage(e))),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lead = widget.lead;
    return Padding(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.x6,
        AppSpacing.x2,
        AppSpacing.x6,
        AppSpacing.x6 + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 760),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(lead.nome, style: AppTypography.h2),
                        const SizedBox(height: AppSpacing.x1),
                        Text(
                          [
                            if (lead.nicho != null) lead.nicho!,
                            if (lead.cidade != null) lead.cidade!,
                          ].join(' • '),
                          style: AppTypography.bodySmall
                              .copyWith(color: context.colors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                  if (lead.crmEtapa != 'perdido')
                    Wrap(
                      spacing: AppSpacing.x2,
                      children: [
                        AppSecondaryButton(
                          label: 'Marcar perdido',
                          onPressed: () async {
                            await widget.onLost();
                            if (context.mounted) Navigator.pop(context);
                          },
                        ),
                        AppPrimaryButton(
                          label: 'Ganho',
                          onPressed: () async {
                            await widget.onWon();
                            if (context.mounted) Navigator.pop(context);
                          },
                        ),
                      ],
                    ),
                ],
              ),
              const SizedBox(height: AppSpacing.x5),
              Row(
                children: [
                  Expanded(
                    child: AppTextField(
                      controller: _valorCtrl,
                      hint: 'Valor da oportunidade',
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.x3),
                  Expanded(
                    child: AppTextField(
                      controller: _responsavelCtrl,
                      hint: 'Responsável pela negociação',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.x3),
              AppTextField(controller: _origemCtrl, hint: 'Origem do lead'),
              const SizedBox(height: AppSpacing.x3),
              _TextArea(
                controller: _observacoesCtrl,
                hint: 'Observações internas',
                maxLines: 4,
              ),
              const SizedBox(height: AppSpacing.x5),
              const Text('Histórico de contatos', style: AppTypography.h3),
              const SizedBox(height: AppSpacing.x2),
              ...lead.historicoContatos.map(
                (item) => _HistoryRow(text: item['texto']?.toString() ?? ''),
              ),
              _TextArea(
                controller: _historicoCtrl,
                hint: 'Adicionar contato realizado',
                maxLines: 2,
              ),
              const SizedBox(height: AppSpacing.x5),
              const Text('Tarefas', style: AppTypography.h3),
              const SizedBox(height: AppSpacing.x2),
              ...lead.tarefas.map(
                (item) => _HistoryRow(text: item['titulo']?.toString() ?? ''),
              ),
              AppTextField(
                controller: _tarefaCtrl,
                hint: 'Adicionar tarefa',
              ),
              if ((lead.motivoPerda ?? '').isNotEmpty) ...[
                const SizedBox(height: AppSpacing.x5),
                AppCard(
                  borderColor: AppColors.danger.withValues(alpha: 0.3),
                  child: Text(
                    'Motivo de perda: ${lead.motivoPerda}',
                    style: AppTypography.bodySmall
                        .copyWith(color: AppColors.danger),
                  ),
                ),
              ],
              const SizedBox(height: AppSpacing.x5),
              if (_saving)
                const Center(child: CircularProgressIndicator())
              else
                Row(
                  children: [
                    Expanded(
                      child: AppSecondaryButton(
                        label: 'Cancelar',
                        fullWidth: true,
                        onPressed: () => Navigator.pop(context),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.x3),
                    Expanded(
                      child: AppPrimaryButton(
                        label: 'Salvar',
                        fullWidth: true,
                        onPressed: _save,
                      ),
                    ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MiniLine extends StatelessWidget {
  final IconData icon;
  final String text;

  const _MiniLine({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.x1),
      child: Row(
        children: [
          Icon(icon, size: 14, color: context.colors.textMuted),
          const SizedBox(width: AppSpacing.x1),
          Expanded(
            child: Text(
              text,
              style: AppTypography.caption
                  .copyWith(color: context.colors.textSecondary),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

class _HistoryRow extends StatelessWidget {
  final String text;

  const _HistoryRow({required this.text});

  @override
  Widget build(BuildContext context) {
    if (text.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.x2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.circle, size: 6, color: context.colors.textMuted),
          const SizedBox(width: AppSpacing.x2),
          Expanded(child: Text(text, style: AppTypography.bodySmall)),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            message,
            style: AppTypography.caption
                .copyWith(color: context.colors.textSecondary),
          ),
          const SizedBox(height: AppSpacing.x3),
          AppSecondaryButton(onPressed: onRetry, label: 'Tentar novamente'),
        ],
      ),
    );
  }
}

class _TextArea extends StatelessWidget {
  final TextEditingController controller;
  final String hint;
  final int maxLines;

  const _TextArea({
    required this.controller,
    required this.hint,
    this.maxLines = 3,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      maxLines: maxLines,
      style: AppTypography.bodyMedium,
      decoration: InputDecoration(
        hintText: hint,
        filled: true,
        fillColor: context.colors.bgInput,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: BorderSide(color: context.colors.borderSubtle),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: BorderSide(color: context.colors.borderSubtle),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: const BorderSide(color: AppColors.primary),
        ),
      ),
    );
  }
}

class _CrmStage {
  final String id;
  final String label;

  const _CrmStage(this.id, this.label);
}
