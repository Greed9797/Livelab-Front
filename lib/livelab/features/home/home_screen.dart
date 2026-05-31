import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../routes/app_routes.dart';
import '../../core/responsive.dart';
import '../../theme/tokens.dart';
import '../../theme/livelab_theme.dart';
import '../../widgets/livelab_scaffold.dart';
import 'home_models.dart';
import 'home_repository.dart';
import 'widgets/hero_strip.dart';
import 'widgets/cta_strip.dart';
import 'widgets/kpi_grid.dart';
import 'widgets/alerts_row.dart';
import 'widgets/upcoming_panel.dart';
import 'widgets/ranking_panel.dart';
import 'widgets/section_label.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.repository});
  final HomeRepository repository;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late Future<HomeData> _future;

  @override
  void initState() {
    super.initState();
    _future = widget.repository.fetch();
  }

  void _refresh() {
    setState(() => _future = widget.repository.fetch());
  }

  void _navigate(String route) {
    Navigator.of(context).pushNamed(route);
  }

  void _onKpiTap(int i) {
    const routes = [
      AppRoutes.financeiro,
      AppRoutes.comercial,
      AppRoutes.analyticsDashboard,
      AppRoutes.clientes,
    ];
    if (i < routes.length) _navigate(routes[i]);
  }

  void _onAlertTap(int i) {
    const routes = [
      AppRoutes.auditoriaContratos,
      AppRoutes.boletos,
      AppRoutes.agendamentos,
    ];
    if (i < routes.length) _navigate(routes[i]);
  }

  @override
  Widget build(BuildContext context) {
    return LivelabScaffold(
      currentRoute: AppRoutes.home,
      onRefresh: _refresh,
      child: FutureBuilder<HomeData>(
        future: _future,
        builder: (c, snap) {
          if (snap.hasError) {
            return Center(
              child: Text(
                'Erro ao carregar: ${snap.error}',
                style: const TextStyle(color: Colors.red),
              ),
            );
          }
          if (!snap.hasData) return const Center(child: CircularProgressIndicator());
          return _content(snap.data!);
        },
      ),
    );
  }

  List<CtaItem> _wiredCtas(List<CtaItem> source) {
    const routeMap = {
      'Iniciar live agora': AppRoutes.cabines,
      'Aprovar solicitações': AppRoutes.solicitacoes,
      'Boletos a vencer': AppRoutes.boletos,
      'Leads quentes': AppRoutes.leads,
    };
    // Esconde CTAs com count == 0 (exceto "Iniciar live agora" que é ação primária)
    return source.where((c) {
      if (c.title == 'Iniciar live agora') return true;
      return (c.count ?? 0) > 0;
    }).map((c) {
      final route = routeMap[c.title];
      return CtaItem(
        icon: c.icon,
        title: c.title,
        subtitle: c.subtitle,
        count: c.count,
        primary: c.primary,
        onTap: route == null ? null : () => _navigate(route),
      );
    }).toList();
  }

  Widget _content(HomeData d) {
    final t = context.llTokens;
    final r = LlResponsive.of(context);
    final twoCol = !r.isMobile;

    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(
        r.isMobile ? 16 : 28,
        16,
        r.isMobile ? 16 : 28,
        28,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _pageHeader(t),
          const SizedBox(height: 18),
          HeroStrip(hero: d.hero),
          const SizedBox(height: 18),
          CtaStrip(items: _wiredCtas(d.ctas)),
          const SizedBox(height: 22),
          SectionLabel(
            label: 'Visão executiva',
            trailing: SectionAllLink(label: 'Ver detalhado', onTap: () => _navigate(AppRoutes.analyticsDashboard)),
          ),
          const SizedBox(height: 8),
          KpiGrid(kpis: d.kpis, onKpiTap: _onKpiTap),
          const SizedBox(height: 22),
          if (d.alerts.any((a) => (a.count ?? 0) > 0)) ...[
            const SectionLabel(label: 'Atenção imediata'),
            const SizedBox(height: 8),
            AlertsRow(
              alerts: d.alerts.where((a) => (a.count ?? 0) > 0).toList(),
              onAlertTap: _onAlertTap,
            ),
          ],
          const SizedBox(height: 18),
          if (twoCol)
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  flex: 14,
                  child: UpcomingPanel(
                    upcoming: d.upcoming,
                    liveCount: d.upcoming.where((u) => u.status == UpcomingStatus.now).length,
                    totalScheduled: d.upcoming.length,
                    onSeeAll: () => _navigate(AppRoutes.agendamentos),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  flex: 10,
                  child: RankingPanel(
                    entries: d.ranking,
                    onSeeAll: () => _navigate(AppRoutes.analyticsDashboard),
                  ),
                ),
              ],
            )
          else ...[
            UpcomingPanel(
              upcoming: d.upcoming,
              liveCount: d.upcoming.where((u) => u.status == UpcomingStatus.now).length,
              totalScheduled: d.upcoming.length,
              onSeeAll: () => _navigate(AppRoutes.agendamentos),
            ),
            const SizedBox(height: 14),
            RankingPanel(
              entries: d.ranking,
              onSeeAll: () => _navigate(AppRoutes.analyticsDashboard),
            ),
          ],
        ],
      ),
    );
  }

  Widget _pageHeader(LlTokens t) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text.rich(
          TextSpan(
            children: [
              TextSpan(
                text: 'Visão',
                style: GoogleFonts.instrumentSerif(
                  color: t.textPrimary,
                  fontStyle: FontStyle.italic,
                  fontSize: 36,
                  fontWeight: FontWeight.w400,
                  letterSpacing: -1,
                ),
              ),
              TextSpan(
                text: ' da unidade',
                style: TextStyle(
                  color: t.textPrimary,
                  fontSize: 32,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.9,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Pulso operacional, comercial e alertas em tempo real.',
          style: TextStyle(color: t.textMuted, fontSize: 13),
        ),
      ],
    );
  }
}
