import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../design_system/design_system.dart';
import '../../providers/cliente_dashboard_provider.dart';
import '../../routes/app_routes.dart';

class ClienteAoVivoScreen extends ConsumerWidget {
  const ClienteAoVivoScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashAsync = ref.watch(clienteDashboardProvider);

    return AppScreenScaffold(
      currentRoute: AppRoutes.clienteAoVivo,
      eyebrow: 'LIVE AGORA',
      title: 'Ao Vivo!',
      subtitle: 'Métricas em tempo real da sua transmissão.',
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.x6),
        child: dashAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Erro: $error'),
                const SizedBox(height: AppSpacing.x4),
                AppPrimaryButton(
                  label: 'Tentar novamente',
                  onPressed: () =>
                      ref.read(clienteDashboardProvider.notifier).refresh(),
                  icon: Icons.refresh_rounded,
                ),
              ],
            ),
          ),
          data: (dashboard) => _AoVivoContent(dashboard: dashboard),
        ),
      ),
    );
  }
}

class _AoVivoContent extends StatelessWidget {
  final ClienteDashboard dashboard;

  const _AoVivoContent({required this.dashboard});

  @override
  Widget build(BuildContext context) {
    final live = dashboard.liveAtiva;

    if (live == null) {
      return _EmptyState(proximaReserva: dashboard.proximaReserva);
    }

    return _LiveActiveView(live: live);
  }
}

// ---------------------------------------------------------------------------
// Active live view
// ---------------------------------------------------------------------------

class _LiveActiveView extends StatelessWidget {
  static final NumberFormat _currency =
      NumberFormat.simpleCurrency(locale: 'pt_BR');

  final LiveAtiva live;

  const _LiveActiveView({required this.live});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Live header — status badge + cabine + duration
        _LiveHeader(live: live),
        const SizedBox(height: AppSpacing.x6),

        // 2-column grid of main metrics
        LayoutBuilder(
          builder: (context, constraints) {
            final isWide = constraints.maxWidth >= 480;
            final tiles = <Widget>[
              _MetricTile(
                icon: PhosphorIcons.currencyDollar(),
                iconColor: AppColors.success,
                label: 'GMV Atual',
                value: _currency.format(live.gmvAtual),
                large: true,
              ),
              _MetricTile(
                icon: PhosphorIcons.users(),
                iconColor: AppColors.info,
                label: 'Viewers',
                value: '–',
                large: true,
              ),
              _MetricTile(
                icon: PhosphorIcons.shoppingCartSimple(),
                iconColor: AppColors.primary,
                label: 'Pedidos',
                value: '${live.pedidos}',
              ),
              _MetricTile(
                icon: PhosphorIcons.coinVertical(),
                iconColor: AppColors.warning,
                label: 'Comissão Projetada',
                value: _currency.format(live.comissaoProjetada),
              ),
            ];

            if (isWide) {
              return GridView.count(
                crossAxisCount: 2,
                crossAxisSpacing: AppSpacing.x4,
                mainAxisSpacing: AppSpacing.x4,
                childAspectRatio: 2.6,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                children: tiles,
              );
            }

            return Column(
              children: tiles
                  .map(
                    (tile) => Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.x4),
                      child: tile,
                    ),
                  )
                  .toList(),
            );
          },
        ),

        const SizedBox(height: AppSpacing.x6),

        // Engagement chips row
        _EngagementRow(live: live),

        const SizedBox(height: AppSpacing.x6),
        _ActionButtons(),
      ],
    );
  }
}

class _LiveHeader extends StatelessWidget {
  final LiveAtiva live;

  const _LiveHeader({required this.live});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      borderColor: AppColors.success,
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.x6,
        vertical: AppSpacing.x4,
      ),
      child: Row(
        children: [
          // Red dot pulse indicator
          Container(
            width: 10,
            height: 10,
            decoration: const BoxDecoration(
              color: AppColors.success,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: AppSpacing.x2),
          Expanded(
            child: Text(
              '🔴 Você está ao vivo! — Cabine ${live.cabineNumero}',
              style: AppTypography.bodyLarge.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.x2),
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.x4,
              vertical: AppSpacing.x1,
            ),
            decoration: BoxDecoration(
              color: context.colors.bgMuted,
              borderRadius: BorderRadius.circular(AppRadius.full),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  PhosphorIcons.timer(),
                  size: 14,
                  color: context.colors.textMuted,
                ),
                const SizedBox(width: 4),
                Text(
                  '${live.duracaoMin} min',
                  style: AppTypography.caption.copyWith(
                    fontWeight: FontWeight.w600,
                    color: context.colors.textSecondary,
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

class _MetricTile extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String label;
  final String value;
  final bool large;

  const _MetricTile({
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.value,
    this.large = false,
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.x6),
      child: Row(
        children: [
          Container(
            width: large ? 52 : 44,
            height: large ? 52 : 44,
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: Icon(icon, color: iconColor, size: large ? 26 : 22),
          ),
          const SizedBox(width: AppSpacing.x4),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  value,
                  style: (large ? AppTypography.h2 : AppTypography.h3)
                      .copyWith(
                    fontWeight: FontWeight.w800,
                    color: context.colors.textPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  label,
                  style: AppTypography.caption.copyWith(
                    color: context.colors.textSecondary,
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

class _EngagementRow extends StatelessWidget {
  final LiveAtiva live;

  const _EngagementRow({required this.live});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.x4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'ENGAJAMENTO',
            style: AppTypography.caption.copyWith(
              fontWeight: FontWeight.w800,
              letterSpacing: 0.8,
              color: context.colors.textMuted,
            ),
          ),
          const SizedBox(height: AppSpacing.x4),
          Wrap(
            spacing: AppSpacing.x2,
            runSpacing: AppSpacing.x2,
            children: [
              _EngagementChip(
                icon: PhosphorIcons.heart(),
                iconColor: const Color(0xFFE53E3E),
                label: '${live.likes} likes',
              ),
              _EngagementChip(
                icon: PhosphorIcons.chatCircle(),
                iconColor: AppColors.info,
                label: '${live.comentarios} comentários',
              ),
              _EngagementChip(
                icon: PhosphorIcons.shareNetwork(),
                iconColor: AppColors.lilac,
                label: '${live.shares} shares',
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _EngagementChip extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String label;

  const _EngagementChip({
    required this.icon,
    required this.iconColor,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.x4,
        vertical: AppSpacing.x2,
      ),
      decoration: BoxDecoration(
        color: context.colors.bgMuted,
        borderRadius: BorderRadius.circular(AppRadius.full),
        border: Border.all(color: context.colors.borderSubtle),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: iconColor),
          const SizedBox(width: 6),
          Text(
            label,
            style: AppTypography.caption.copyWith(
              fontWeight: FontWeight.w600,
              color: context.colors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Empty state — no active live
// ---------------------------------------------------------------------------

class _EmptyState extends StatelessWidget {
  final ProximaReserva? proximaReserva;

  const _EmptyState({this.proximaReserva});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AppCard(
          padding: const EdgeInsets.all(AppSpacing.x8),
          child: Row(
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: context.colors.bgMuted,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                ),
                child: Icon(
                  PhosphorIcons.wifiSlash(),
                  size: 28,
                  color: context.colors.textMuted,
                ),
              ),
              const SizedBox(width: AppSpacing.x4),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Sem live ativa no momento',
                      style: AppTypography.bodyLarge.copyWith(
                        fontWeight: FontWeight.w700,
                        color: context.colors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Suas métricas aparecerão aqui assim que uma transmissão for iniciada.',
                      style: AppTypography.caption.copyWith(
                        color: context.colors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        if (proximaReserva != null) ...[
          const SizedBox(height: AppSpacing.x6),
          _ProximaReservaCard(reserva: proximaReserva!),
        ],
        const SizedBox(height: AppSpacing.x6),
        _ActionButtons(),
      ],
    );
  }
}

class _ProximaReservaCard extends StatelessWidget {
  static final DateFormat _dateFormat =
      DateFormat("dd/MM 'às' HH:mm", 'pt_BR');

  final ProximaReserva reserva;

  const _ProximaReservaCard({required this.reserva});

  String get _statusLabel {
    switch (reserva.status) {
      case 'ativo':
        return 'Ativa';
      case 'pendente':
        return 'Pendente';
      case 'assinado':
        return 'Assinada';
      default:
        return reserva.status;
    }
  }

  @override
  Widget build(BuildContext context) {
    final ativadoEm = reserva.ativadoEm;

    return AppCard(
      borderColor: AppColors.primary.withValues(alpha: 0.4),
      padding: const EdgeInsets.all(AppSpacing.x6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                PhosphorIcons.calendarCheck(),
                size: 18,
                color: AppColors.primary,
              ),
              const SizedBox(width: AppSpacing.x2),
              Text(
                'Próxima Reserva',
                style: AppTypography.bodyLarge.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.x4),
          _ReservaRow(
            label: 'Cabine',
            value: 'Cabine ${reserva.cabineNumero}',
          ),
          const SizedBox(height: AppSpacing.x2),
          _ReservaRow(
            label: 'Status',
            value: _statusLabel,
          ),
          if (ativadoEm != null) ...[
            const SizedBox(height: AppSpacing.x2),
            _ReservaRow(
              label: 'Ativada em',
              value: _dateFormat.format(ativadoEm.toLocal()),
            ),
          ],
        ],
      ),
    );
  }
}

class _ReservaRow extends StatelessWidget {
  final String label;
  final String value;

  const _ReservaRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        SizedBox(
          width: 100,
          child: Text(
            label,
            style: AppTypography.caption.copyWith(
              color: context.colors.textMuted,
            ),
          ),
        ),
        Text(
          value,
          style: AppTypography.bodySmall.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Action buttons — shown in both active-live and empty state
// ---------------------------------------------------------------------------

class _ActionButtons extends StatelessWidget {
  const _ActionButtons();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: AppPrimaryButton(
            label: 'Ver agenda',
            outlined: true,
            fullWidth: true,
            onPressed: () =>
                Navigator.pushNamed(context, AppRoutes.clienteHistorico),
            icon: Icons.calendar_today,
          ),
        ),
        const SizedBox(width: AppSpacing.x4),
        Expanded(
          child: AppPrimaryButton(
            label: 'Solicitar nova live',
            outlined: true,
            fullWidth: true,
            onPressed: () =>
                Navigator.pushNamed(context, AppRoutes.cliente),
            icon: Icons.add_circle_outline,
          ),
        ),
      ],
    );
  }
}
