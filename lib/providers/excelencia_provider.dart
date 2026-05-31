import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/excelencia.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

class ExcelenciaNotifier extends AsyncNotifier<ExcelenciaData> {
  @override
  Future<ExcelenciaData> build() async {
    final authState = ref.watch(authProvider);
    if (!authState.isAuthenticated) {
      throw Exception('Não autenticado');
    }
    return _fetch();
  }

  Future<ExcelenciaData> _fetch() async {
    final resp = await ApiService.get('/excelencia/metricas');
    return ExcelenciaData.fromJson(resp.data as Map<String, dynamic>);
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }
}

final excelenciaProvider =
    AsyncNotifierProvider<ExcelenciaNotifier, ExcelenciaData>(ExcelenciaNotifier.new);

// ── Ranking de Apresentadoras ─────────────────────────────────────────────────

class RankingApresentadoraItem {
  final String id;
  final String nome;
  final double gmvTotal;
  final double ganhoTotal;
  final double valorFixoMensal;
  final int totalLives;
  final double gmvMeta;
  final double? pctMeta;
  final int posicao;

  const RankingApresentadoraItem({
    required this.id,
    required this.nome,
    required this.gmvTotal,
    required this.ganhoTotal,
    required this.valorFixoMensal,
    required this.totalLives,
    required this.gmvMeta,
    this.pctMeta,
    required this.posicao,
  });

  factory RankingApresentadoraItem.fromJson(Map<String, dynamic> j) =>
      RankingApresentadoraItem(
        id: j['id'] as String,
        nome: j['nome'] as String,
        gmvTotal: (j['gmv_total'] as num? ?? 0).toDouble(),
        ganhoTotal: (j['ganho_total'] as num? ?? 0).toDouble(),
        valorFixoMensal: (j['valor_fixo_mensal'] as num? ?? 0).toDouble(),
        totalLives: (j['total_lives'] as num? ?? 0).toInt(),
        gmvMeta: (j['gmv_meta'] as num? ?? 0).toDouble(),
        pctMeta: j['pct_meta'] == null
            ? null
            : (j['pct_meta'] as num).toDouble(),
        posicao: (j['posicao'] as num? ?? 0).toInt(),
      );
}

final rankingApresentadorasProvider =
    FutureProvider.autoDispose.family<List<RankingApresentadoraItem>, String?>(
  (ref, mes) async {
    final authState = ref.watch(authProvider);
    if (!authState.isAuthenticated) return [];
    final params = mes != null ? {'mes': mes} : <String, dynamic>{};
    final resp = await ApiService.get('/ranking/apresentadoras', params: params);
    final list = resp.data as List? ?? [];
    return list
        .map((e) =>
            RankingApresentadoraItem.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  },
);
