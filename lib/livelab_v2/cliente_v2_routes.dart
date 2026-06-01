import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/theme_mode_provider.dart';
import '../routes/app_routes.dart';
import '../screens/cliente/cliente_home_v3_screen.dart';
import '../widgets/app_scaffold.dart';
import 'core/ll_theme.dart';
import 'screens/agenda_screen.dart';
import 'screens/config_screen.dart';
import 'screens/minhas_lives_screen.dart';

class _LlScope extends ConsumerWidget {
  const _LlScope({required this.currentRoute, required this.child});

  final String currentRoute;
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = ref.watch(themeModeProvider) == ThemeMode.dark;
    final themeData = isDark ? LL.theme : LL.lightTheme;
    return AppScaffold(
      currentRoute: currentRoute,
      child: Theme(
        data: themeData,
        child: ColoredBox(
          color: isDark ? LL.bg : const Color(0xFFF5F4F2),
          child: child,
        ),
      ),
    );
  }
}

class ClienteHomeV2 extends StatelessWidget {
  const ClienteHomeV2({super.key});

  @override
  Widget build(BuildContext context) => const _LlScope(
        currentRoute: AppRoutes.cliente,
        child: ClienteHomeV3Screen(),
      );
}

class ClienteCabinesV2 extends StatelessWidget {
  const ClienteCabinesV2({super.key});

  @override
  Widget build(BuildContext context) => const _LlScope(
        currentRoute: AppRoutes.clienteCabinesTabs,
        child: MinhasLivesScreen(),
      );
}

class ClienteAgendaV2 extends StatelessWidget {
  const ClienteAgendaV2({super.key});

  @override
  Widget build(BuildContext context) => const _LlScope(
        currentRoute: AppRoutes.clienteAgenda,
        child: AgendaScreen(),
      );
}

class ClienteConfigV2 extends StatelessWidget {
  const ClienteConfigV2({super.key});

  // Reusa ConfigScreen do livelab_v2 (refatorada com troca senha real,
  // dados via authProvider, sem botões inertes). Antes apontava para
  // ClienteConfiguracoesScreen legacy que tinha placeholders.
  @override
  Widget build(BuildContext context) => const _LlScope(
        currentRoute: AppRoutes.clienteConfiguracoes,
        child: ConfigScreen(),
      );
}
