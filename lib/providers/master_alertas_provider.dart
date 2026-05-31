import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/master_alerta.dart';
import '../models/master_historico.dart';
import '../models/master_ranking.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

/// Lista de alertas operacionais cross-tenant — `GET /v1/master/alertas`.
///
/// Polling a cada 5 minutos (a query é pesada — 4 sub-queries cross-tenant).
class MasterAlertasNotifier extends AsyncNotifier<List<MasterAlerta>> {
  Timer? _timer;

  @override
  Future<List<MasterAlerta>> build() async {
    final auth = ref.watch(authProvider);
    if (!auth.isAuthenticated) {
      _timer?.cancel();
      _timer = null;
      throw Exception('Não autenticado');
    }

    final data = await _fetch();
    _startPolling();
    ref.onDispose(() {
      _timer?.cancel();
    });
    return data;
  }

  Future<List<MasterAlerta>> _fetch() async {
    final resp = await ApiService.get<List<dynamic>>('/master/alertas');
    final raw = resp.data ?? const <dynamic>[];
    return raw
        .whereType<Map>()
        .map((m) => MasterAlerta.fromJson(Map<String, dynamic>.from(m)))
        .toList();
  }

  void _startPolling() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(minutes: 5), (_) async {
      try {
        final next = await _fetch();
        if (state.hasValue) {
          state = AsyncValue.data(next);
        }
      } catch (e) {
        debugPrint('Erro no polling de master/alertas: $e');
      }
    });
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }
}

final masterAlertasProvider =
    AsyncNotifierProvider<MasterAlertasNotifier, List<MasterAlerta>>(
        MasterAlertasNotifier.new);

/// Ranking de unidades por GMV no período `YYYY-MM` —
/// `GET /v1/master/ranking?periodo=…`.
final masterRankingProvider =
    FutureProvider.family<List<MasterRanking>, String>((ref, periodo) async {
  final resp = await ApiService.get<List<dynamic>>(
    '/master/ranking',
    params: {'periodo': periodo},
  );
  final raw = resp.data ?? const <dynamic>[];
  return raw
      .whereType<Map>()
      .map((m) => MasterRanking.fromJson(Map<String, dynamic>.from(m)))
      .toList();
});

/// Série dos últimos 6 meses (GMV + lives) para uma unidade —
/// `GET /v1/master/unidade/:tenantId/historico`.
final masterUnidadeHistoricoProvider =
    FutureProvider.family<List<MasterHistoricoMes>, String>((ref, tenantId) async {
  final resp = await ApiService.get<List<dynamic>>(
    '/master/unidade/$tenantId/historico',
  );
  final raw = resp.data ?? const <dynamic>[];
  return raw
      .whereType<Map>()
      .map((m) => MasterHistoricoMes.fromJson(Map<String, dynamic>.from(m)))
      .toList();
});
