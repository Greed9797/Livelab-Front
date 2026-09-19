# lib/providers/analytics_dashboard_provider.dart

- _isoDate · function · L6-L7 — String _isoDate(DateTime d) =>
- DashboardFiltrosNotifier · class · L13-L33 — class DashboardFiltrosNotifier extends Notifier<AnalyticsFiltros>
- build · method · L15-L15 — AnalyticsFiltros build() => AnalyticsFiltros.forPreset(AnalyticsPreset.mes1);
- setClienteId · method · L17-L19 — void setClienteId(String? id)
- setPreset · method · L21-L24 — void setPreset(AnalyticsPreset preset)
- setCustomRange · method · L26-L28 — void setCustomRange(DateTime from, DateTime to)
- reset · method · L30-L32 — void reset()
- dashboardFiltrosProvider · constant · L35-L38 — final dashboardFiltrosProvider =
- AnalyticsDashboardNotifier · class · L44-L74 — class AnalyticsDashboardNotifier
- build · method · L47-L54 — Future<AnalyticsDashboardData> build()
- _fetch · method · L56-L67 — Future<AnalyticsDashboardData> _fetch(AnalyticsFiltros filtros) async
- refresh · method · L69-L73 — Future<void> refresh() async
- analyticsDashboardProvider · constant · L76-L79 — final analyticsDashboardProvider =
