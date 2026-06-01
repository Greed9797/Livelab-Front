import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cliente_perfil_provider.dart';
import '../../providers/theme_mode_provider.dart';
import '../../routes/app_routes.dart';
import '../theme/tokens.dart';
import '../theme/livelab_theme.dart';

final _sidebarExpandedProvider = StateProvider<bool>((ref) => false);

class LivelabNavItem {
  const LivelabNavItem({
    required this.label,
    required this.icon,
    required this.route,
    this.dot = false,
  });
  final String label;
  final IconData icon;
  final String route;
  final bool dot;
}

class LivelabNavSection {
  const LivelabNavSection({this.label, required this.items});
  final String? label;
  final List<LivelabNavItem> items;
}

/// Determina se [route] é a home da role [papel]. Quando true, topbar
/// renderiza o bloco de saudação ("Bom dia, X"); senão só mostra ações.
bool _isHomeRoute(String route, String? papel) {
  switch (papel) {
    case 'franqueador_master':
    case 'admin_master':
      return route == AppRoutes.masterDashboard;
    case 'cliente_parceiro':
      return route == AppRoutes.cliente;
    case 'apresentador':
    case 'apresentadora':
      return route == AppRoutes.cabines;
    case 'franqueado':
    case 'gerente':
    case 'gerente_comercial':
    case 'financeiro':
    case 'operacional':
    default:
      return route == AppRoutes.home;
  }
}

class LivelabScaffold extends ConsumerWidget {
  const LivelabScaffold({
    super.key,
    required this.currentRoute,
    required this.child,
    this.onRefresh,
  });

  final String currentRoute;
  final Widget child;
  final VoidCallback? onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.llTokens;
    final auth = ref.watch(authProvider);
    final themeMode = ref.watch(themeModeProvider);
    final isDark = themeMode == ThemeMode.dark;

    final sections = _navSections(auth.user?.papel ?? 'franqueado');
    final width = MediaQuery.sizeOf(context).width;
    final isMobile = width < 720;

    return Scaffold(
      backgroundColor: t.bgBase,
      body: Stack(
        children: [
          // Radial gradient background overlay
          Positioned.fill(
            child: IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    center: const Alignment(0, -1.2),
                    radius: 0.8,
                    colors: [
                      t.primary.withValues(alpha: isDark ? 0.08 : 0.10),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
          ),
          if (isMobile)
            Column(
              children: [
                _Topbar(
                  user: auth.user,
                  isDark: isDark,
                  onToggleTheme: () => ref.read(themeModeProvider.notifier).toggle(),
                  onRefresh: onRefresh ?? () => _hardRefresh(context),
                  onBell: () => _openNotifications(context),
                  showGreeting: _isHomeRoute(currentRoute, auth.user?.papel),
                ),
                Expanded(child: child),
                _BottomNav(sections: sections, currentRoute: currentRoute),
              ],
            )
          else
            Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _Rail(
                  sections: sections,
                  currentRoute: currentRoute,
                  user: auth.user,
                  onLogout: () async {
                    await ref.read(authProvider.notifier).logout();
                    if (context.mounted) {
                      Navigator.of(context).pushNamedAndRemoveUntil(AppRoutes.login, (_) => false);
                    }
                  },
                ),
                Expanded(
                  child: Column(
                    children: [
                      _Topbar(
                        user: auth.user,
                        isDark: isDark,
                        onToggleTheme: () => ref.read(themeModeProvider.notifier).toggle(),
                        onRefresh: onRefresh ?? () => _hardRefresh(context),
                        onBell: () => _openNotifications(context),
                        showGreeting: _isHomeRoute(currentRoute, auth.user?.papel),
                      ),
                      Expanded(child: child),
                    ],
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }

  void _hardRefresh(BuildContext context) {
    final route = ModalRoute.of(context)?.settings.name ?? currentRoute;
    Navigator.of(context).pushReplacementNamed(route);
  }

  void _openNotifications(BuildContext context) {
    final t = context.llTokens;
    showDialog<void>(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.35),
      builder: (ctx) {
        return Dialog(
          backgroundColor: t.bgElev1,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 380),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(PhosphorIcons.bell(), color: t.textPrimary, size: 20),
                      const SizedBox(width: 10),
                      Text('Notificações',
                          style: TextStyle(
                              color: t.textPrimary,
                              fontSize: 16,
                              fontWeight: FontWeight.w600)),
                      const Spacer(),
                      IconButton(
                        icon: Icon(PhosphorIcons.x(), size: 18, color: t.textMuted),
                        onPressed: () => Navigator.of(ctx).pop(),
                        padding: EdgeInsets.zero,
                        constraints:
                            const BoxConstraints(minWidth: 28, minHeight: 28),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(vertical: 28, horizontal: 12),
                    decoration: BoxDecoration(
                      color: t.bgElev2,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: Column(
                        children: [
                          Icon(PhosphorIcons.bellSlash(),
                              size: 32, color: t.textMuted),
                          const SizedBox(height: 12),
                          Text('Tudo em dia',
                              style: TextStyle(
                                  color: t.textPrimary,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600)),
                          const SizedBox(height: 4),
                          Text('Você não tem notificações no momento',
                              style: TextStyle(color: t.textMuted, fontSize: 12),
                              textAlign: TextAlign.center),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  List<LivelabNavSection> _navSections(String papel) {
    final isMaster = papel == 'franqueador_master';
    final isCliente = papel == 'cliente_parceiro';
    final isApresentador = papel == 'apresentador';
    final isAuditor = papel == 'auditor';
    final canSeeAuditLog = isMaster ||
        papel == 'franqueado' ||
        papel == 'gerente' ||
        isAuditor;

    if (isCliente) {
      return [
        LivelabNavSection(items: [
          LivelabNavItem(label: 'Home', icon: PhosphorIcons.house(), route: AppRoutes.cliente),
          LivelabNavItem(label: 'Cabines', icon: PhosphorIcons.videoCamera(), route: AppRoutes.clienteCabinesTabs),
          LivelabNavItem(label: 'Configurações', icon: PhosphorIcons.gear(), route: AppRoutes.clienteConfiguracoes),
        ]),
      ];
    }

    if (isApresentador) {
      return [
        LivelabNavSection(items: [
          LivelabNavItem(label: 'Cabines', icon: PhosphorIcons.videoCamera(), route: AppRoutes.cabines),
          LivelabNavItem(label: 'Conhecimento', icon: PhosphorIcons.book(), route: AppRoutes.knowledgeBase),
        ]),
      ];
    }

    if (isMaster) {
      return [
        LivelabNavSection(items: [
          LivelabNavItem(label: 'Home', icon: PhosphorIcons.house(), route: AppRoutes.masterDashboard),
          LivelabNavItem(label: 'Unidades', icon: PhosphorIcons.buildings(), route: AppRoutes.masterUnits),
          LivelabNavItem(label: 'Consolidado', icon: PhosphorIcons.chartBar(), route: AppRoutes.masterConsolidated),
          LivelabNavItem(label: 'CRM', icon: PhosphorIcons.shoppingCart(), route: AppRoutes.masterCrm),
          LivelabNavItem(label: 'Franqueados', icon: PhosphorIcons.users(), route: AppRoutes.masterFranqueados),
          LivelabNavItem(label: 'Gerentes regionais', icon: PhosphorIcons.usersThree(), route: AppRoutes.masterRegionalManagers),
          LivelabNavItem(label: 'TikTok Apps', icon: PhosphorIcons.tiktokLogo(), route: AppRoutes.masterTiktokApps),
          LivelabNavItem(label: 'Conhecimento', icon: PhosphorIcons.book(), route: AppRoutes.adminKnowledgeCategories),
          LivelabNavItem(label: 'Configurações', icon: PhosphorIcons.gear(), route: AppRoutes.configuracoes),
        ]),
      ];
    }

    if (isAuditor) {
      return [
        LivelabNavSection(items: [
          LivelabNavItem(label: 'Home', icon: PhosphorIcons.house(), route: AppRoutes.home),
          LivelabNavItem(label: 'Configurações', icon: PhosphorIcons.gear(), route: AppRoutes.configuracoes),
          LivelabNavItem(label: 'Conhecimento', icon: PhosphorIcons.book(), route: AppRoutes.knowledgeBase),
        ]),
      ];
    }

    // franqueado / gerente default
    return [
      LivelabNavSection(items: [
        LivelabNavItem(label: 'Home', icon: PhosphorIcons.house(), route: AppRoutes.home),
      ]),
      LivelabNavSection(label: 'Comercial', items: [
        LivelabNavItem(label: 'CRM', icon: PhosphorIcons.shoppingCart(), route: AppRoutes.leads),
        LivelabNavItem(label: 'Clientes', icon: PhosphorIcons.users(), route: AppRoutes.clientes),
      ]),
      LivelabNavSection(label: 'Cabines', items: [
        LivelabNavItem(label: 'Cabines', icon: PhosphorIcons.videoCamera(), route: AppRoutes.cabines, dot: true),
      ]),
      LivelabNavSection(label: 'Pessoas', items: [
        LivelabNavItem(label: 'Usuários internos', icon: PhosphorIcons.usersThree(), route: AppRoutes.usuarios),
      ]),
      LivelabNavSection(label: 'Análise & operação', items: [
        LivelabNavItem(label: 'Financeiro', icon: PhosphorIcons.wallet(), route: AppRoutes.financeiro, dot: true),
        LivelabNavItem(label: 'Analytics', icon: PhosphorIcons.chartLine(), route: AppRoutes.analyticsDashboard),
        LivelabNavItem(label: 'Conhecimento', icon: PhosphorIcons.book(), route: AppRoutes.knowledgeBase),
        LivelabNavItem(label: 'Config', icon: PhosphorIcons.gear(), route: AppRoutes.configuracoes),
      ]),
    ];
  }
}

class _Rail extends ConsumerWidget {
  const _Rail({
    required this.sections,
    required this.currentRoute,
    required this.onLogout,
    this.user,
  });
  final List<LivelabNavSection> sections;
  final String currentRoute;
  final VoidCallback onLogout;
  final dynamic user;

  static const _collapsedW = 80.0;
  static const _expandedW = 240.0;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.llTokens;
    final expanded = ref.watch(_sidebarExpandedProvider);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOut,
      width: expanded ? _expandedW : _collapsedW,
      decoration: BoxDecoration(
        color: t.bgElev1,
        border: Border(right: BorderSide(color: t.border)),
      ),
      padding: const EdgeInsets.symmetric(vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Brand + toggle
          if (expanded)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  // Logo mark + wordmark
                  _buildLogo(t),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _LivelabWordmark(textColor: t.textPrimary),
                  ),
                  // Collapse button
                  InkWell(
                    borderRadius: BorderRadius.circular(8),
                    onTap: () => ref.read(_sidebarExpandedProvider.notifier).state = false,
                    child: Padding(
                      padding: const EdgeInsets.all(6),
                      child: Icon(
                        PhosphorIcons.caretLeft(),
                        size: 16,
                        color: t.textMuted,
                      ),
                    ),
                  ),
                ],
              ),
            )
          else
            // Collapsed: logo is the expand button
            Center(
              child: GestureDetector(
                onTap: () => ref.read(_sidebarExpandedProvider.notifier).state = true,
                child: _buildLogo(t),
              ),
            ),
          const SizedBox(height: 18),
          // Nav items
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  for (final s in sections) ..._section(t, s, expanded),
                ],
              ),
            ),
          ),
          // Footer
          if (expanded && user != null) ...[
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Row(
                children: [
                  _ClienteOrInitialsAvatar(
                    size: 36,
                    nome: (user?.nome as String?) ?? '',
                    isCliente: (user?.papel as String?) == 'cliente_parceiro',
                    primaryColor: t.primary,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          (user?.nome as String? ?? ''),
                          style: TextStyle(
                            color: t.textPrimary,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                          overflow: TextOverflow.ellipsis,
                          maxLines: 1,
                        ),
                        Text(
                          _papelLabel(user?.papel as String? ?? ''),
                          style: TextStyle(color: t.textFaint, fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
          _RailItem(
            icon: PhosphorIcons.signOut(),
            label: 'Sair',
            active: false,
            dot: false,
            expanded: expanded,
            onTap: onLogout,
          ),
        ],
      ),
    );
  }

  List<Widget> _section(LlTokens t, LivelabNavSection s, bool expanded) {
    return [
      if (s.label != null && expanded)
        Padding(
          padding: const EdgeInsets.only(left: 16, top: 14, bottom: 4),
          child: Text(
            s.label!.toUpperCase(),
            style: TextStyle(
              color: t.textFaint,
              fontSize: 9,
              letterSpacing: 1.4,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      for (final it in s.items)
        Builder(builder: (ctx) {
          return _RailItem(
            icon: it.icon,
            label: it.label,
            active: it.route == currentRoute,
            dot: it.dot,
            expanded: expanded,
            onTap: () {
              if (ModalRoute.of(ctx)?.settings.name != it.route) {
                Navigator.of(ctx).pushReplacementNamed(it.route);
              }
            },
          );
        }),
    ];
  }

  Widget _buildLogo(LlTokens t) {
    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
              color: t.primary.withValues(alpha: 0.45),
              blurRadius: 16,
              offset: const Offset(0, 6)),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Image.asset(
          'assets/images/favicon.png',
          fit: BoxFit.cover,
        ),
      ),
    );
  }

  String _papelLabel(String papel) {
    return switch (papel) {
      'franqueado' => 'Franquia',
      'franqueador_master' => 'Master',
      'gerente' => 'Gerente',
      'cliente_parceiro' => 'Cliente',
      'apresentador' => 'Apresentador',
      _ => papel,
    };
  }
}

class _RailItem extends StatelessWidget {
  const _RailItem({
    required this.icon,
    required this.label,
    required this.active,
    required this.dot,
    required this.expanded,
    required this.onTap,
  });
  final IconData icon;
  final String label;
  final bool active;
  final bool dot;
  final bool expanded;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;

    final iconWidget = Icon(
      icon,
      size: 22,
      color: active ? t.primary : t.textMuted,
    );

    final indicator = active
        ? Positioned(
            left: 0,
            top: 0,
            bottom: 0,
            child: Center(
              child: Container(
                width: 3,
                height: 24,
                decoration: BoxDecoration(
                  color: t.primary,
                  borderRadius: const BorderRadius.only(
                    topRight: Radius.circular(3),
                    bottomRight: Radius.circular(3),
                  ),
                ),
              ),
            ),
          )
        : const SizedBox.shrink();

    if (expanded) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 2, horizontal: 8),
        child: Stack(
          children: [
            indicator,
            Material(
              color: active ? t.primarySoft : Colors.transparent,
              borderRadius: BorderRadius.circular(12),
              child: InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: onTap,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  child: Row(
                    children: [
                      iconWidget,
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          label,
                          style: TextStyle(
                            color: active ? t.primary : t.textMuted,
                            fontSize: 14,
                            fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      );
    }

    // Collapsed: icon only with tooltip
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned(
            left: -16,
            top: 0,
            bottom: 0,
            child: indicator,
          ),
          Tooltip(
            message: label,
            waitDuration: const Duration(milliseconds: 600),
            child: Material(
              color: active ? t.primarySoft : Colors.transparent,
              borderRadius: BorderRadius.circular(14),
              child: InkWell(
                borderRadius: BorderRadius.circular(14),
                onTap: onTap,
                child: SizedBox(
                  width: 56,
                  height: 56,
                  child: Stack(
                    children: [
                      Center(child: iconWidget),
                      if (dot)
                        Positioned(
                          top: 8,
                          right: 8,
                          child: Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: t.danger,
                              shape: BoxShape.circle,
                              border: Border.all(color: t.bgElev1, width: 2),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Topbar extends ConsumerWidget {
  const _Topbar({
    required this.user,
    required this.isDark,
    required this.onToggleTheme,
    required this.onRefresh,
    required this.onBell,
    this.showGreeting = true,
  });

  final dynamic user; // User?
  final bool isDark;
  final VoidCallback onToggleTheme;
  final VoidCallback? onRefresh;
  final VoidCallback onBell;
  final bool showGreeting;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.llTokens;
    final hour = DateTime.now().hour;
    final greeting = hour < 12 ? 'Bom dia' : (hour < 18 ? 'Boa tarde' : 'Boa noite');
    final nome = (user?.nome ?? '').toString();
    final firstName = nome.split(' ').isNotEmpty ? nome.split(' ').first : 'Usuário';
    final papel = (user?.papel ?? '').toString();
    final papelLabel = switch (papel) {
      'franqueador_master' || 'admin_master' => 'Master',
      'franqueado' => 'Franquia',
      'gerente' => 'Gerente',
      'gerente_comercial' => 'Comercial',
      'financeiro' => 'Financeiro',
      'operacional' => 'Operações',
      'cliente_parceiro' => 'Cliente',
      'apresentador' || 'apresentadora' => 'Apresentador',
      _ => 'Livelab',
    };

    return Container(
      padding: const EdgeInsets.fromLTRB(28, 16, 28, 0),
      child: Row(
        children: [
          if (showGreeting) ...[
            _ClienteOrInitialsAvatar(
              size: 52,
              nome: nome,
              isCliente: papel == 'cliente_parceiro',
              primaryColor: t.primary,
              shadow: true,
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(
                          text: '$greeting, ',
                          style: TextStyle(color: t.textPrimary, fontSize: 22, fontWeight: FontWeight.w700, letterSpacing: -0.4, height: 1.1),
                        ),
                        TextSpan(
                          text: nome.isEmpty ? firstName : nome,
                          style: TextStyle(color: t.textSecondary, fontSize: 22, fontWeight: FontWeight.w500, letterSpacing: -0.4, height: 1.1),
                        ),
                        const TextSpan(text: ' '),
                        TextSpan(
                          text: papelLabel,
                          style: GoogleFonts.instrumentSerif(
                            color: t.primary,
                            fontStyle: FontStyle.italic,
                            fontSize: 24,
                            fontWeight: FontWeight.w400,
                            letterSpacing: -0.4,
                            height: 1.1,
                          ),
                        ),
                      ],
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 3),
                  Text(
                    _subDate(),
                    style: TextStyle(color: t.textMuted, fontSize: 13),
                  ),
                ],
              ),
            ),
          ] else
            const Spacer(),
          _ThemeToggle(isDark: isDark, onTap: onToggleTheme),
          const SizedBox(width: 10),
          if (onRefresh != null)
            _IconButton(icon: PhosphorIcons.arrowsClockwise(), onTap: onRefresh!),
          const SizedBox(width: 10),
          _IconButton(icon: PhosphorIcons.bell(), onTap: onBell),
        ],
      ),
    );
  }

  String _subDate() {
    const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    final now = DateTime.now();
    final dia = dias[now.weekday % 7];
    final mes = meses[now.month - 1];
    final hh = now.hour.toString().padLeft(2, '0');
    final mm = now.minute.toString().padLeft(2, '0');
    return '$dia, ${now.day} de $mes · $hh:$mm';
  }
}

class _ThemeToggle extends StatelessWidget {
  const _ThemeToggle({required this.isDark, required this.onTap});
  final bool isDark;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    return Material(
      color: t.bgElev1,
      borderRadius: BorderRadius.circular(24),
      child: InkWell(
        borderRadius: BorderRadius.circular(24),
        onTap: onTap,
        child: Container(
          width: 96,
          height: 48,
          padding: const EdgeInsets.symmetric(horizontal: 6),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: t.border),
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              Positioned(
                left: 14,
                child: Icon(Icons.wb_sunny_outlined, size: 16, color: isDark ? t.textMuted : Colors.transparent),
              ),
              Positioned(
                right: 14,
                child: Icon(Icons.nightlight_outlined, size: 16, color: isDark ? Colors.transparent : t.textMuted),
              ),
              AnimatedAlign(
                duration: const Duration(milliseconds: 220),
                curve: Curves.easeOut,
                alignment: isDark ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: t.primary,
                    boxShadow: [BoxShadow(color: t.primary.withValues(alpha: 0.5), blurRadius: 8, offset: const Offset(0, 2))],
                  ),
                  child: Icon(
                    isDark ? Icons.nightlight_outlined : Icons.wb_sunny_outlined,
                    size: 18,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _IconButton extends StatelessWidget {
  const _IconButton({required this.icon, required this.onTap, this.dot = false});
  final IconData icon;
  final VoidCallback onTap;
  final bool dot;

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    return Material(
      color: t.bgElev1,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: t.border),
          ),
          child: Stack(
            children: [
              Center(child: Icon(icon, size: 20, color: t.textSecondary)),
              if (dot)
                Positioned(
                  top: 10,
                  right: 10,
                  child: Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: t.primary,
                      border: Border.all(color: t.bgElev1, width: 2),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BottomNav extends StatelessWidget {
  const _BottomNav({required this.sections, required this.currentRoute});
  final List<LivelabNavSection> sections;
  final String currentRoute;

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    final items = sections.expand((s) => s.items).take(5).toList();
    return Container(
      decoration: BoxDecoration(
        color: t.bgElev1,
        border: Border(top: BorderSide(color: t.border)),
      ),
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          for (final it in items)
            Expanded(
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () {
                    if (ModalRoute.of(context)?.settings.name != it.route) {
                      Navigator.of(context).pushReplacementNamed(it.route);
                    }
                  },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          it.icon,
                          size: 22,
                          color: it.route == currentRoute ? t.primary : t.textMuted,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          it.label.split(' ').first,
                          style: TextStyle(
                            color: it.route == currentRoute ? t.primary : t.textMuted,
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Wordmark "Livelab." adaptativo: dark mode pinta de branco via ColorFilter;
/// light mode renderiza original (preto com ponto laranja).
class _LivelabWordmark extends StatelessWidget {
  final Color textColor;
  const _LivelabWordmark({required this.textColor});

  @override
  Widget build(BuildContext context) {
    final isDark = textColor.computeLuminance() > 0.5;
    final image = Image.asset(
      'assets/images/livelab_wordmark.png',
      height: 22,
      fit: BoxFit.contain,
      alignment: Alignment.centerLeft,
    );
    if (!isDark) return image;
    return ColorFiltered(
      colorFilter: ColorFilter.mode(textColor, BlendMode.srcIn),
      child: image,
    );
  }
}

/// Avatar circular: se cliente_parceiro tem logo_url no perfil, renderiza Image.
/// Caso contrário, gradient laranja com iniciais (fallback).
class _ClienteOrInitialsAvatar extends ConsumerWidget {
  final double size;
  final String nome;
  final bool isCliente;
  final Color primaryColor;
  final bool shadow;
  const _ClienteOrInitialsAvatar({
    required this.size,
    required this.nome,
    required this.isCliente,
    required this.primaryColor,
    this.shadow = false,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    String? logoUrl;
    if (isCliente) {
      final perfil = ref.watch(clientePerfilProvider).valueOrNull;
      logoUrl = perfil?.logoUrl;
    }

    final fallback = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [primaryColor, const Color(0xFFFF8A3C)],
        ),
        boxShadow: shadow
            ? [BoxShadow(color: primaryColor.withValues(alpha: 0.5), blurRadius: 12, offset: const Offset(0, 4))]
            : null,
      ),
      alignment: Alignment.center,
      child: Text(
        _initials(nome),
        style: TextStyle(color: Colors.white, fontSize: size * 0.36, fontWeight: FontWeight.w700),
      ),
    );

    if (logoUrl == null || logoUrl.isEmpty) return fallback;

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white,
        boxShadow: shadow
            ? [BoxShadow(color: Colors.black.withValues(alpha: 0.18), blurRadius: 12, offset: const Offset(0, 4))]
            : null,
      ),
      clipBehavior: Clip.antiAlias,
      child: Image.network(
        logoUrl,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => fallback,
      ),
    );
  }

  static String _initials(String n) {
    final parts = n.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts[0].substring(0, 1).toUpperCase();
    return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
  }
}
