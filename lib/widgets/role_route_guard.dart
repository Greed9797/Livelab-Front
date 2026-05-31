import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/auth_provider.dart';
import '../routes/app_routes.dart';

class RoleRouteGuard extends ConsumerStatefulWidget {
  final Set<String> allowedRoles;
  final Widget child;
  final String fallbackRoute;
  final String unauthenticatedRoute;

  const RoleRouteGuard({
    super.key,
    required this.allowedRoles,
    required this.child,
    required this.fallbackRoute,
    required this.unauthenticatedRoute,
  });

  @override
  ConsumerState<RoleRouteGuard> createState() => _RoleRouteGuardState();
}

class _RoleRouteGuardState extends ConsumerState<RoleRouteGuard> {
  bool _redirectScheduled = false;

  // Rota inicial correta por papel — evita cadeia de redirecionamentos
  // entre rotas protegidas que causa spinner infinito em Flutter Web.
  // Reutiliza AppRoutes.routeForRole para cobrir todos os papéis suportados
  // (franqueador_master, franqueado, gerente, apresentador, cliente_parceiro).
  static String _homeForRole(String papel) => AppRoutes.routeForRole(papel);

  static Set<String> _expandAllowed(Set<String> roles) {
    final expanded = {...roles};
    if (expanded.contains('franqueador_master')) expanded.add('admin_master');
    if (expanded.contains('admin_master')) expanded.add('franqueador_master');
    if (expanded.contains('gerente')) expanded.add('gerente_comercial');
    if (expanded.contains('apresentador')) expanded.add('apresentadora');
    return expanded;
  }

  void _scheduleRedirect(String route) {
    if (_redirectScheduled) return;
    _redirectScheduled = true;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        Navigator.of(context).pushNamedAndRemoveUntil(route, (_) => false);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    if (authState.isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final user = authState.user;

    if (user == null) {
      // Sem usuário → redireciona pra login. Cobre caso onde user navega
      // manualmente pra rota protegida sem ter sessão (sem transição
      // logout→login que o listener em main.dart capturaria).
      _scheduleRedirect(widget.unauthenticatedRoute);
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (!_expandAllowed(widget.allowedRoles).contains(user.papel)) {
      // Redireciona direto para a home do papel atual — sem encadear
      // redirects entre rotas protegidas que quebra em Flutter Web.
      _scheduleRedirect(_homeForRole(user.papel));
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return widget.child;
  }
}
