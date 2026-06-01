import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../design_system/design_system.dart';
import '../../models/lead.dart';
import '../../providers/leads_provider.dart';
import '../../routes/app_routes.dart';
import '../../widgets/app_scaffold.dart';
import '../../widgets/empty_state_widget.dart';
import '../../widgets/skeleton_list.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

const _crmStages = [
  _CrmStage('lead_novo', 'Lead novo'),
  _CrmStage('contato_iniciado', 'Contato iniciado'),
  _CrmStage('reuniao_agendada', 'Reunião agendada'),
  _CrmStage('proposta_enviada', 'Proposta enviada'),
  _CrmStage('em_negociacao', 'Negociação'),
  _CrmStage('aguardando_assinatura', 'Aguardando assinatura'),
  _CrmStage('perdido', 'Perdido'),
];

final _currency = NumberFormat.currency(
  locale: 'pt_BR',
  symbol: 'R\$',
  decimalDigits: 0,
);

class LeadsScreen extends ConsumerWidget {
  const LeadsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final leadsAsync = ref.watch(leadsProvider);

    return AppScaffold(
      currentRoute: AppRoutes.leads,
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.x6),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'CRM',
                        style: AppTypography.h2.copyWith(
                          fontSize: 20,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.x1),
                      leadsAsync.when(
                        loading: () => Text(
                          'Carregando leads reais...',
                          style: AppTypography.bodySmall.copyWith(
                            color: context.colors.textSecondary,
                          ),
                        ),
                        error: (_, __) => Text(
                          'Erro ao carregar CRM',
                          style: AppTypography.bodySmall.copyWith(
                            color: AppColors.danger,
                          ),
                        ),
                        data: (leads) => Text(
                          '${leads.length} leads no seu escopo',
                          style: AppTypography.bodySmall.copyWith(
                            color: context.colors.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.refresh),
                  onPressed: () => ref.read(leadsProvider.notifier).refresh(),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.x4),
            Expanded(
              child: leadsAsync.when(
                loading: () => const SkeletonList(itemCount: 5, itemHeight: 88),
                error: (e, _) => _CrmError(
                  message: e.toString(),
                  onRetry: () => ref.read(leadsProvider.notifier).refresh(),
                ),
                data: (leads) => leads.isEmpty
                    ? EmptyStateWidget(
                        icon: PhosphorIcons.userCirclePlus(),
                        title: 'Nenhum lead ainda',
                        message:
                            'Quando o time comercial cadastrar leads, eles aparecem aqui no Kanban.',
                        actionLabel: 'Atualizar',
                        onAction: () =>
                            ref.read(leadsProvider.notifier).refresh(),
                      )
                    : _KanbanBoard(
                        leads: leads,
                        onMove: (lead, stage) => ref
                            .read(leadsProvider.notifier)
                            .moverEtapa(lead.id, stage.key),
                        onClaim: (lead) =>
                            ref.read(leadsProvider.notifier).pegar(lead.id),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _KanbanBoard extends StatelessWidget {
  final List<Lead> leads;
  final void Function(Lead lead, _CrmStage stage) onMove;
  final void Function(Lead lead) onClaim;

  const _KanbanBoard({
    required this.leads,
    required this.onMove,
    required this.onClaim,
  });

  @override
  Widget build(BuildContext context) {
    final grouped = <String, List<Lead>>{
      for (final stage in _crmStages) stage.key: <Lead>[],
    };
    for (final lead in leads) {
      grouped.putIfAbsent(lead.crmEtapa, () => <Lead>[]).add(lead);
    }

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final stage in _crmStages) ...[
            _KanbanColumn(
              stage: stage,
              leads: grouped[stage.key] ?? const [],
              onMove: onMove,
              onClaim: onClaim,
            ),
            const SizedBox(width: AppSpacing.x3),
          ],
        ],
      ),
    );
  }
}

class _KanbanColumn extends StatelessWidget {
  final _CrmStage stage;
  final List<Lead> leads;
  final void Function(Lead lead, _CrmStage stage) onMove;
  final void Function(Lead lead) onClaim;

  const _KanbanColumn({
    required this.stage,
    required this.leads,
    required this.onMove,
    required this.onClaim,
  });

  @override
  Widget build(BuildContext context) {
    return DragTarget<Lead>(
      onWillAcceptWithDetails: (details) => details.data.crmEtapa != stage.key,
      onAcceptWithDetails: (details) => onMove(details.data, stage),
      builder: (context, candidateData, rejectedData) {
        final isActive = candidateData.isNotEmpty;

        return AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          width: 292,
          height: double.infinity,
          padding: const EdgeInsets.all(AppSpacing.x3),
          decoration: BoxDecoration(
            color: isActive ? context.colors.primarySoftBg : AppColors.bgMuted,
            border: Border.all(
              color: isActive ? AppColors.primary : context.colors.borderSubtle,
            ),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(stage.label, style: AppTypography.bodyMedium),
                  ),
                  _CountBadge(count: leads.length),
                ],
              ),
              const SizedBox(height: AppSpacing.x3),
              Expanded(
                child: leads.isEmpty
                    ? Center(
                        child: Text(
                          'Nenhum lead',
                          style: AppTypography.bodySmall.copyWith(
                            color: context.colors.textMuted,
                          ),
                        ),
                      )
                    : ListView.separated(
                        itemCount: leads.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(height: AppSpacing.x3),
                        itemBuilder: (context, index) {
                          final lead = leads[index];
                          return Draggable<Lead>(
                            data: lead,
                            feedback: Material(
                              color: Colors.transparent,
                              child: SizedBox(
                                width: 260,
                                child: _LeadKanbanCard(
                                  lead: lead,
                                  onClaim: null,
                                ),
                              ),
                            ),
                            childWhenDragging: Opacity(
                              opacity: 0.35,
                              child: _LeadKanbanCard(
                                lead: lead,
                                onClaim: null,
                              ),
                            ),
                            child: _LeadKanbanCard(
                              lead: lead,
                              onClaim: lead.status == 'disponivel'
                                  ? () => onClaim(lead)
                                  : null,
                            ),
                          );
                        },
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
  final VoidCallback? onClaim;

  const _LeadKanbanCard({required this.lead, required this.onClaim});

  @override
  Widget build(BuildContext context) {
    final city = [
      lead.cidade,
      lead.estado,
    ].where((part) => part != null && part.isNotEmpty).join('/');

    return Container(
      padding: const EdgeInsets.all(AppSpacing.x4),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color ?? AppColors.bgCard,
        border: Border.all(color: context.colors.borderSubtle),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  lead.nome,
                  style: AppTypography.bodyMedium.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (lead.isNovo) const _NewBadge(),
            ],
          ),
          const SizedBox(height: AppSpacing.x1),
          if ((lead.nicho ?? '').isNotEmpty || city.isNotEmpty)
            Text(
              [lead.nicho, city]
                  .where((part) => part != null && part.isNotEmpty)
                  .join(' · '),
              style: AppTypography.bodySmall.copyWith(
                color: context.colors.textSecondary,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          const SizedBox(height: AppSpacing.x2),
          Text(
            'Valor potencial ${_currency.format(lead.valorOportunidade)}',
            style: AppTypography.bodySmall.copyWith(
              color: context.colors.textSecondary,
            ),
          ),
          if ((lead.origem ?? '').isNotEmpty) ...[
            const SizedBox(height: AppSpacing.x1),
            Text(
              'Origem ${lead.origem}',
              style: AppTypography.bodySmall.copyWith(
                color: context.colors.textMuted,
              ),
            ),
          ],
          if (onClaim != null) ...[
            const SizedBox(height: AppSpacing.x3),
            SizedBox(
              width: double.infinity,
              child: AppPrimaryButton(
                onPressed: onClaim,
                label: 'Pegar lead',
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _CountBadge extends StatelessWidget {
  final int count;

  const _CountBadge({required this.count});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.x3,
        vertical: AppSpacing.x1,
      ),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color ?? AppColors.bgCard,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        '$count',
        style: AppTypography.bodySmall.copyWith(
          color: context.colors.textSecondary,
        ),
      ),
    );
  }
}

class _NewBadge extends StatelessWidget {
  const _NewBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.x2,
        vertical: AppSpacing.x1,
      ),
      decoration: BoxDecoration(
        color: AppColors.successBg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        'NOVO',
        style: AppTypography.bodySmall.copyWith(color: AppColors.success),
      ),
    );
  }
}

class _CrmError extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _CrmError({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Não foi possível carregar o CRM.',
            style: AppTypography.h3,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.x2),
          Text(
            message,
            style: AppTypography.bodySmall.copyWith(
              color: context.colors.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.x4),
          AppPrimaryButton(onPressed: onRetry, label: 'Tentar novamente'),
        ],
      ),
    );
  }
}

class _CrmStage {
  final String key;
  final String label;

  const _CrmStage(this.key, this.label);
}
