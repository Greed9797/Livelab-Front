import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/analytics_dashboard.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

String _isoDate(DateTime d) =>
    '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

// ─────────────────────────────────────────
// Filtros (estado síncrono)
// ─────────────────────────────────────────

class DashboardFiltrosNotifier extends Notifier<AnalyticsFiltros> {
  @override
  AnalyticsFiltros build() => AnalyticsFiltros.forPreset(AnalyticsPreset.mes1);

  void setClienteId(String? id) {
    state = state.copyWith(clienteId: id);
  }

  void setPreset(AnalyticsPreset preset) {
    final f = AnalyticsFiltros.forPreset(preset, clienteId: state.clienteId);
    state = f;
  }

  void setCustomRange(DateTime from, DateTime to) {
    state = state.copyWith(from: from, to: to, preset: AnalyticsPreset.custom);
  }

  void reset() {
    state = AnalyticsFiltros.forPreset(AnalyticsPreset.mes1);
  }
}

final dashboardFiltrosProvider =
    NotifierProvider<DashboardFiltrosNotifier, AnalyticsFiltros>(
  DashboardFiltrosNotifier.new,
);

// ─────────────────────────────────────────
// Dados (estado assíncrono — re-fetch automático ao mudar filtros)
// ─────────────────────────────────────────

class AnalyticsDashboardNotifier
    extends AsyncNotifier<AnalyticsDashboardData> {
  @override
  Future<AnalyticsDashboardData> build() {
    final authState = ref.watch(authProvider);
    if (!authState.isAuthenticated) {
      throw Exception('Não autenticado');
    }
    final filtros = ref.watch(dashboardFiltrosProvider);
    return _fetch(filtros);
  }

  Future<AnalyticsDashboardData> _fetch(AnalyticsFiltros filtros) async {
    final params = <String, dynamic>{
      'from': _isoDate(filtros.from),
      'to': _isoDate(filtros.to),
    };
    if (filtros.clienteId != null) params['cliente_id'] = filtros.clienteId;

    final resp = await ApiService.get('/analytics/dashboard', params: params);
    return AnalyticsDashboardData.fromJson(
      Map<String, dynamic>.from(resp.data as Map),
    );
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    final filtros = ref.read(dashboardFiltrosProvider);
    state = await AsyncValue.guard(() => _fetch(filtros));
  }
}

final analyticsDashboardProvider =
    AsyncNotifierProvider<AnalyticsDashboardNotifier, AnalyticsDashboardData>(
  AnalyticsDashboardNotifier.new,
);
