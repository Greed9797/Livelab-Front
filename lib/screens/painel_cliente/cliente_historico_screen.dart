import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../design_system/app_colors.dart' as ds_colors;
import '../../design_system/app_colors_theme.dart';
import '../../design_system/app_screen_scaffold.dart';
import '../../design_system/app_tokens.dart' as ds_tokens;
import '../../design_system/app_typography.dart' as ds_typography;
import '../../providers/cliente_dashboard_provider.dart'
    show ClientePeriod, clientePeriodProvider;
import '../../providers/cliente_lives_provider.dart';
import '../../routes/app_routes.dart';
import '../../design_system/app_components.dart';

class AppColors {
  static const primary = ds_colors.AppColors.primary;
  static const infoBlue = ds_colors.AppColors.info;
  static const primaryOrange = ds_colors.AppColors.primary;
  static const successGreen = ds_colors.AppColors.success;
  static const warningYellow = ds_colors.AppColors.warning;
  static const orange600 = ds_colors.AppColors.primaryLight;
  static const lilac = ds_colors.AppColors.lilac;
  static const gray200 = ds_colors.AppColors.borderLight;
}

class AppSpacing {
  static const xs = ds_tokens.AppSpacing.x1;
  static const sm = ds_tokens.AppSpacing.x2;
  static const md = ds_tokens.AppSpacing.x4;
  static const lg = ds_tokens.AppSpacing.x6;
  static const xl = ds_tokens.AppSpacing.x8;
  static const x2l = ds_tokens.AppSpacing.x10;
  static const x3l = ds_tokens.AppSpacing.x12;
  static const screenPadding = ds_tokens.AppSpacing.x6;
}

class AppRadius {
  static const md = ds_tokens.AppRadius.md;
  static const lg = ds_tokens.AppRadius.lg;
  static const full = ds_tokens.AppRadius.full;
  static const pill = ds_tokens.AppRadius.full;
}

class AppTypography {
  static const h2 = ds_typography.AppTypography.h2;
  static const h3 = ds_typography.AppTypography.h3;
  static const bodyLarge = ds_typography.AppTypography.bodyLarge;
  static const bodySmall = ds_typography.AppTypography.bodySmall;
  static const caption = ds_typography.AppTypography.caption;
  static const labelLarge = ds_typography.AppTypography.label;
  static const labelSmall = ds_typography.AppTypography.caption;
}

class ClienteHistoricoScreen extends ConsumerWidget {
  const ClienteHistoricoScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final livesAsync = ref.watch(clienteLivesProvider);
    final period = ref.watch(clientePeriodProvider);

    return AppScreenScaffold(
      currentRoute: AppRoutes.clienteHistorico,
      eyebrow: 'HISTÓRICO',
      title: 'Histórico de Lives',
      subtitle: 'Resumo e detalhe por live',
      actions: [_HistoryPeriodSelector(period: period)],
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.screenPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            livesAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('Erro: $error'),
                    const SizedBox(height: AppSpacing.md),
                    AppPrimaryButton(
                      label: 'Tentar novamente',
                      onPressed: () => ref.invalidate(clienteLivesProvider),
                      icon: Icons.refresh_rounded,
                    ),
                  ],
                ),
              ),
              data: (data) => _HistoricoContent(data: data),
            ),
          ],
        ),
      ),
    );
  }
}

class _HistoricoContent extends StatelessWidget {
  static final NumberFormat _currency = NumberFormat.simpleCurrency(
    locale: 'pt_BR',
  );

  final ClienteLivesResponse data;

  const _HistoricoContent({required this.data});

  @override
  Widget build(BuildContext context) {
    final resumo = data.resumo;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: AppSpacing.md,
          runSpacing: AppSpacing.md,
          children: [
            _MetricBox(
              child: MetricCard(
                label: 'GMV',
                value: _currency.format(resumo.gmvTotal),
                icon: Icons.payments_rounded,
                iconColor: AppColors.primary,
              ),
            ),
            _MetricBox(
              child: MetricCard(
                label: 'ITENS VENDIDOS',
                value: '${resumo.itensVendidos}',
                icon: Icons.inventory_2_outlined,
                iconColor: AppColors.infoBlue,
              ),
            ),
            _MetricBox(
              child: MetricCard(
                label: 'LIVES',
                value: '${resumo.totalLives}',
                icon: Icons.video_library_rounded,
                iconColor: AppColors.primaryOrange,
              ),
            ),
            _MetricBox(
              child: MetricCard(
                label: 'HORAS',
                value: resumo.horasLive.toStringAsFixed(1),
                icon: Icons.schedule_rounded,
                iconColor: AppColors.lilac,
              ),
            ),
            _MetricBox(
              child: MetricCard(
                label: 'INVESTIDO',
                value: _currency.format(resumo.valorInvestidoLives),
                icon: Icons.savings_rounded,
                iconColor: AppColors.warningYellow,
              ),
            ),
            _MetricBox(
              child: MetricCard(
                label: 'ROAS',
                value: resumo.roas.toStringAsFixed(2),
                icon: Icons.show_chart_rounded,
                iconColor: AppColors.successGreen,
              ),
            ),
            _MetricBox(
              child: MetricCard(
                label: 'VIEWERS',
                value: '${resumo.viewerCount}',
                icon: Icons.visibility_rounded,
                iconColor: AppColors.infoBlue,
              ),
            ),
            _MetricBox(
              child: MetricCard(
                label: 'COMENTÁRIOS',
                value: '${resumo.commentsCount}',
                icon: Icons.forum_rounded,
                iconColor: AppColors.orange600,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.x3l),
        if (data.lives.isEmpty)
          AppCard(
            shadow: const [],
            child: Text(
              'Nenhuma live registrada neste período.',
              style: TextStyle(color: context.colors.textSecondary),
            ),
          )
        else
          Column(
            children: data.lives
                .map(
                  (live) => Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.md),
                    child: _LiveHistoryCard(live: live),
                  ),
                )
                .toList(),
          ),
      ],
    );
  }
}

class _MetricBox extends StatelessWidget {
  final Widget child;

  const _MetricBox({required this.child});

  @override
  Widget build(BuildContext context) {
    return SizedBox(width: 210, child: child);
  }
}

class _HistoryPeriodSelector extends ConsumerWidget {
  static final DateFormat _periodFormat = DateFormat.yMMMM('pt_BR');

  final ClientePeriod period;

  const _HistoryPeriodSelector({required this.period});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final label = _periodFormat.format(DateTime(period.ano, period.mes));

    return AppCard(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      shadow: const [],
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            tooltip: 'Mês anterior',
            onPressed: () => ref.read(clientePeriodProvider.notifier).state =
                period.previous(),
            icon: const Icon(Icons.chevron_left_rounded),
          ),
          SizedBox(
            width: 150,
            child: Text(
              label,
              textAlign: TextAlign.center,
              style: AppTypography.bodySmall.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          IconButton(
            tooltip: 'Próximo mês',
            onPressed: () =>
                ref.read(clientePeriodProvider.notifier).state = period.next(),
            icon: const Icon(Icons.chevron_right_rounded),
          ),
          const SizedBox(width: AppSpacing.xs),
          IconButton(
            tooltip: 'Atualizar',
            onPressed: () => ref.invalidate(clienteLivesProvider),
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
    );
  }
}

class _LiveHistoryCard extends StatelessWidget {
  static final NumberFormat _currency = NumberFormat.simpleCurrency(
    locale: 'pt_BR',
  );
  static final DateFormat _date = DateFormat("dd/MM 'às' HH:mm", 'pt_BR');

  final ClienteLive live;

  const _LiveHistoryCard({required this.live});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  live.iniciadoEm == null
                      ? 'Live'
                      : _date.format(live.iniciadoEm!.toLocal()),
                  style: AppTypography.bodyLarge.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              _StatusPill(status: live.status),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Wrap(
            spacing: AppSpacing.lg,
            runSpacing: AppSpacing.md,
            children: [
              _DetailMetric(
                label: 'Duração',
                value: '${live.duracaoHoras.toStringAsFixed(1)}h',
              ),
              _DetailMetric(label: 'GMV', value: _currency.format(live.gmv)),
              _DetailMetric(
                label: 'Itens / pedidos',
                value: '${live.itensVendidos} / ${live.totalOrders}',
              ),
              _DetailMetric(label: 'Viewers', value: '${live.viewerCount}'),
              _DetailMetric(
                label: 'Comentários',
                value: '${live.commentsCount}',
              ),
              _DetailMetric(
                label: 'Likes / shares',
                value: '${live.likesCount} / ${live.sharesCount}',
              ),
              _DetailMetric(
                label: 'Top produto',
                value: live.topProduto?.isNotEmpty == true
                    ? live.topProduto!
                    : '-',
              ),
              _DetailMetric(label: 'ROAS', value: live.roas.toStringAsFixed(2)),
              _DetailMetric(
                label: 'Investido',
                value: _currency.format(live.valorInvestido),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _DetailMetric extends StatelessWidget {
  final String label;
  final String value;

  const _DetailMetric({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 150,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: AppTypography.caption.copyWith(color: context.colors.textMuted),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: AppTypography.bodySmall.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  final String status;

  const _StatusPill({required this.status});

  @override
  Widget build(BuildContext context) {
    final isLive = status == 'em_andamento';

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: (isLive ? AppColors.successGreen : context.colors.borderSubtle).withValues(
          alpha: isLive ? 1 : 0.7,
        ),
        borderRadius: BorderRadius.circular(AppRadius.pill),
      ),
      child: Text(
        isLive ? 'AO VIVO' : 'ENCERRADA',
        style: AppTypography.caption.copyWith(
          color: isLive ? context.colors.bgCard : context.colors.textPrimary,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
