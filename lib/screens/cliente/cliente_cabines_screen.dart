import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../design_system/design_system.dart';
import '../../models/cabine.dart';
import '../../providers/cliente_cabines_provider.dart';
import '../../routes/app_routes.dart';
import '../../widgets/app_scaffold.dart';
import '../../widgets/cabine_card.dart';

class ClienteCabinesScreen extends ConsumerWidget {
  const ClienteCabinesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cabinesAsync = ref.watch(clienteCabinesProvider);

    return AppScaffold(
      currentRoute: AppRoutes.clienteCabinesTabs,
      child: cabinesAsync.when(
        loading: () =>
            const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.x6),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.error_outline,
                    size: 48, color: AppColors.danger),
                const SizedBox(height: AppSpacing.x3),
                Text(
                  'Erro ao carregar cabines:\n$error',
                  textAlign: TextAlign.center,
                  style: AppTypography.bodyMedium,
                ),
                const SizedBox(height: AppSpacing.x4),
                AppPrimaryButton(
                  label: 'Tentar novamente',
                  icon: Icons.refresh,
                  onPressed: () =>
                      ref.read(clienteCabinesProvider.notifier).refresh(),
                ),
              ],
            ),
          ),
        ),
        data: (cabines) => _CabinesContent(cabines: cabines),
      ),
    );
  }
}

class _CabinesContent extends StatelessWidget {
  final List<Cabine> cabines;

  const _CabinesContent({required this.cabines});

  @override
  Widget build(BuildContext context) {
    if (cabines.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.videocam_off_outlined,
                size: 64, color: context.colors.textMuted),
            const SizedBox(height: AppSpacing.x4),
            Text(
              'Nenhuma cabine vinculada',
              style: AppTypography.h3.copyWith(color: context.colors.textSecondary),
            ),
            const SizedBox(height: AppSpacing.x2),
            Text(
              'Suas cabines aparecerão aqui assim que\nhouver um contrato ativo.',
              textAlign: TextAlign.center,
              style: AppTypography.bodySmall
                  .copyWith(color: context.colors.textMuted),
            ),
          ],
        ),
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final crossCount = constraints.maxWidth >= 900
            ? 4
            : constraints.maxWidth >= 600
                ? 3
                : 2;

        return GridView.builder(
          padding: const EdgeInsets.all(AppSpacing.x6),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossCount,
            crossAxisSpacing: AppSpacing.x4,
            mainAxisSpacing: AppSpacing.x4,
            childAspectRatio: 0.78,
          ),
          itemCount: cabines.length,
          itemBuilder: (ctx, i) => CabineCard(
            cabine: cabines[i],
            onTap: () => Navigator.pushNamed(
              ctx,
              AppRoutes.clienteCabineDetail,
              arguments: cabines[i],
            ),
          ),
        );
      },
    );
  }
}
