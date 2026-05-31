import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../design_system/design_system.dart';
import '../../providers/tiktok_apps_provider.dart';
import '../../routes/app_routes.dart';
import '../../services/api_service.dart';

/// Tela administrativa (`franqueador_master` only) com a visão multi-tenant
/// das integrações TikTok Shop. Lista cada unidade, status do token OAuth
/// (conectado/expirado/desconectado), shop_id mascarado e expires_at em BR.
///
/// Backend: GET /v1/master/tiktok-apps?status=
class TiktokAppsScreen extends ConsumerWidget {
  const TiktokAppsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncApps = ref.watch(tiktokAppsProvider);
    final filter = ref.watch(tiktokAppsFilterProvider);

    return AppScreenScaffold(
      currentRoute: AppRoutes.masterTiktokApps,
      eyebrow: 'MASTER',
      title: 'TikTok Apps',
      subtitle:
          'Status da integração TikTok Shop em cada unidade da rede. '
          'Tokens são armazenados encriptados no servidor.',
      titleSerif: true,
      actions: [
        IconButton(
          icon: Icon(PhosphorIcons.arrowsClockwise(), size: 20),
          tooltip: 'Atualizar',
          onPressed: () => ref.read(tiktokAppsProvider.notifier).refresh(),
        ),
      ],
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(28, 8, 28, 16),
            child: _FilterBar(
              current: filter,
              onChanged: (v) {
                ref.read(tiktokAppsFilterProvider.notifier).state = v;
              },
            ),
          ),
          Expanded(
            child: asyncApps.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, _) => _ErrorState(
                message: ApiService.extractErrorMessage(err),
                onRetry: () => ref.read(tiktokAppsProvider.notifier).refresh(),
              ),
              data: (apps) {
                if (apps.isEmpty) {
                  return _EmptyState(filter: filter);
                }
                return _SummaryAndList(apps: apps);
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _FilterBar extends StatelessWidget {
  const _FilterBar({required this.current, required this.onChanged});
  final TiktokAppStatus? current;
  final ValueChanged<TiktokAppStatus?> onChanged;

  @override
  Widget build(BuildContext context) {
    final options = <_FilterOption>[
      const _FilterOption(label: 'Todas', value: null),
      const _FilterOption(label: 'Conectadas', value: TiktokAppStatus.connected),
      const _FilterOption(
          label: 'Token expirado', value: TiktokAppStatus.expired),
      const _FilterOption(
          label: 'Desconectadas', value: TiktokAppStatus.disconnected),
    ];
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: options.map((opt) {
        final selected = opt.value == current;
        return ChoiceChip(
          label: Text(opt.label),
          selected: selected,
          onSelected: (_) => onChanged(opt.value),
          showCheckmark: false,
          labelStyle: TextStyle(
            fontSize: 13,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
            color: selected ? Colors.white : AppColors.textSecondary,
          ),
          backgroundColor: AppColors.bgCard,
          selectedColor: AppColors.primary,
          side: BorderSide(
            color: selected ? AppColors.primary : AppColors.border,
          ),
        );
      }).toList(),
    );
  }
}

class _FilterOption {
  const _FilterOption({required this.label, required this.value});
  final String label;
  final TiktokAppStatus? value;
}

class _SummaryAndList extends StatelessWidget {
  const _SummaryAndList({required this.apps});
  final List<TiktokApp> apps;

  @override
  Widget build(BuildContext context) {
    final connected = apps.where((a) => a.status == TiktokAppStatus.connected).length;
    final expired = apps.where((a) => a.status == TiktokAppStatus.expired).length;
    final disconnected =
        apps.where((a) => a.status == TiktokAppStatus.disconnected).length;

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(28, 0, 28, 16),
            child: Row(
              children: [
                _SummaryTile(
                  label: 'Conectadas',
                  value: connected,
                  color: AppColors.success,
                  icon: PhosphorIcons.checkCircle(),
                ),
                const SizedBox(width: 12),
                _SummaryTile(
                  label: 'Token expirado',
                  value: expired,
                  color: AppColors.warning,
                  icon: PhosphorIcons.warningCircle(),
                ),
                const SizedBox(width: 12),
                _SummaryTile(
                  label: 'Desconectadas',
                  value: disconnected,
                  color: AppColors.textMuted,
                  icon: PhosphorIcons.linkBreak(),
                ),
              ],
            ),
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(28, 0, 28, 32),
          sliver: SliverList.separated(
            itemCount: apps.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (_, i) => _AppRow(app: apps[i]),
          ),
        ),
      ],
    );
  }
}

class _SummaryTile extends StatelessWidget {
  const _SummaryTile({
    required this.label,
    required this.value,
    required this.color,
    required this.icon,
  });
  final String label;
  final int value;
  final Color color;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.bgCard,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, size: 20, color: color),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$value',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _AppRow extends StatelessWidget {
  const _AppRow({required this.app});
  final TiktokApp app;

  @override
  Widget build(BuildContext context) {
    final formatter = DateFormat('dd/MM/yyyy HH:mm');
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: AppColors.primary.withValues(alpha: 0.10),
            child: Text(
              _initials(app.tenantNome),
              style: const TextStyle(
                color: AppColors.primary,
                fontWeight: FontWeight.w700,
                fontSize: 13,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        app.tenantNome,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (!app.ativo) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.danger.withValues(alpha: 0.10),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          'inativa',
                          style: TextStyle(
                              fontSize: 10,
                              color: AppColors.danger,
                              fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  _locationLine(app),
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    _StatusBadge(status: app.status),
                    if (app.shopId != null)
                      Text(
                        'Shop ID: ${app.shopId}',
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.textMuted,
                          fontFeatures: [FontFeature.tabularFigures()],
                        ),
                      ),
                    if (app.expiresAt != null)
                      Text(
                        'Expira ${formatter.format(app.expiresAt!)}',
                        style: TextStyle(
                          fontSize: 11,
                          color: app.status == TiktokAppStatus.expired
                              ? AppColors.danger
                              : AppColors.textMuted,
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

  String _locationLine(TiktokApp a) {
    final parts = <String>[];
    if (a.cidade != null && a.cidade!.isNotEmpty) parts.add(a.cidade!);
    if (a.uf != null && a.uf!.isNotEmpty) parts.add(a.uf!);
    return parts.isEmpty ? '—' : parts.join(' / ');
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});
  final TiktokAppStatus status;

  @override
  Widget build(BuildContext context) {
    final (label, color, dot) = switch (status) {
      TiktokAppStatus.connected => ('Conectado', AppColors.success, true),
      TiktokAppStatus.expired => ('Token expirado', AppColors.warning, true),
      TiktokAppStatus.disconnected => (
          'Não conectado',
          AppColors.textMuted,
          false
        ),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.30)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (dot) ...[
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 6),
          ],
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.filter});
  final TiktokAppStatus? filter;

  @override
  Widget build(BuildContext context) {
    final msg = filter == null
        ? 'Nenhuma unidade cadastrada ainda.'
        : 'Nenhuma unidade nesse status.';
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(PhosphorIcons.tiktokLogo(), size: 36, color: AppColors.textMuted),
          const SizedBox(height: 8),
          Text(msg, style: const TextStyle(color: AppColors.textMuted)),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(PhosphorIcons.warningCircle(), size: 36, color: AppColors.danger),
          const SizedBox(height: 8),
          Text(message, style: const TextStyle(color: AppColors.danger)),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: onRetry,
            icon: Icon(PhosphorIcons.arrowsClockwise(), size: 16),
            label: const Text('Tentar novamente'),
          ),
        ],
      ),
    );
  }
}

String _initials(String nome) {
  final parts = nome.trim().split(RegExp(r'\s+'));
  if (parts.isEmpty || parts.first.isEmpty) return '?';
  if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
  return (parts.first.substring(0, 1) + parts.last.substring(0, 1)).toUpperCase();
}
