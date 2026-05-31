import 'package:flutter/material.dart';

import '../routes/app_routes.dart';
import '../screens/admin_master/master_crm_v3_screen.dart';
import '../widgets/app_scaffold.dart';
import 'core/ll_theme.dart';
import 'screens/admin_master_screen.dart';
import 'screens/consolidado_screen.dart';
import 'screens/franqueados_screen.dart';
import 'screens/unidades_screen.dart';

class _LlAdminScope extends StatelessWidget {
  const _LlAdminScope({required this.currentRoute, required this.child});

  final String currentRoute;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      currentRoute: currentRoute,
      child: Builder(
        builder: (ctx) {
          final isDark = Theme.of(ctx).brightness == Brightness.dark;
          return Theme(
            data: isDark ? LL.theme : LL.lightTheme,
            child: Builder(
              builder: (c) => ColoredBox(color: c.llBg, child: child),
            ),
          );
        },
      ),
    );
  }
}

class MasterHomeV2 extends StatelessWidget {
  const MasterHomeV2({super.key});

  @override
  Widget build(BuildContext context) => const _LlAdminScope(
        currentRoute: AppRoutes.masterDashboard,
        child: AdminMasterScreen(),
      );
}

class MasterConsolidadoV2 extends StatelessWidget {
  const MasterConsolidadoV2({super.key});

  @override
  Widget build(BuildContext context) => const _LlAdminScope(
        currentRoute: AppRoutes.masterConsolidated,
        child: ConsolidadoScreen(),
      );
}

class MasterUnidadesV2 extends StatelessWidget {
  const MasterUnidadesV2({super.key});

  @override
  Widget build(BuildContext context) => const _LlAdminScope(
        currentRoute: AppRoutes.masterUnits,
        child: UnidadesScreen(),
      );
}

class MasterCrmV2 extends StatelessWidget {
  const MasterCrmV2({super.key});

  @override
  Widget build(BuildContext context) => const _LlAdminScope(
        currentRoute: AppRoutes.masterCrm,
        child: MasterCrmV3Screen(),
      );
}

class MasterFranqueadosV2 extends StatelessWidget {
  const MasterFranqueadosV2({super.key});

  @override
  Widget build(BuildContext context) => const _LlAdminScope(
        currentRoute: AppRoutes.masterFranqueados,
        child: FranqueadosScreen(),
      );
}
