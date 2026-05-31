import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

class Recomendacao {
  final String id;
  final String nomeIndicado;
  final String recomendante;
  final String status;
  final double? lat;
  final double? lng;

  const Recomendacao({
    required this.id,
    required this.nomeIndicado,
    required this.recomendante,
    required this.status,
    this.lat,
    this.lng,
  });

  factory Recomendacao.fromJson(Map<String, dynamic> j) => Recomendacao(
        id: j['id'] as String,
        nomeIndicado: j['nome_indicado'] as String,
        recomendante: j['recomendante'] as String,
        status: j['status'] as String,
        lat: (j['lat'] as num?)?.toDouble(),
        lng: (j['lng'] as num?)?.toDouble(),
      );
}

class RecomendacoesNotifier extends AsyncNotifier<List<Recomendacao>> {
  @override
  Future<List<Recomendacao>> build() async {
    final authState = ref.watch(authProvider);
    if (!authState.isAuthenticated) {
      throw Exception('Não autenticado');
    }
    return _fetch();
  }

  Future<List<Recomendacao>> _fetch() async {
    final resp = await ApiService.get('/recomendacoes');
    return (resp.data as List)
        .map((e) => Recomendacao.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }

  Future<Recomendacao> criar(Map<String, dynamic> data) async {
    final resp = await ApiService.post('/recomendacoes', data: data);
    final rec = Recomendacao.fromJson(resp.data as Map<String, dynamic>);
    state = AsyncData([rec, ...state.valueOrNull ?? []]);
    return rec;
  }

  Future<Map<String, dynamic>> converter(String id, {Map<String, dynamic>? dados}) async {
    final resp = await ApiService.patch('/recomendacoes/$id/converter', data: dados ?? {});
    final result = resp.data as Map<String, dynamic>;
    state = await AsyncValue.guard(_fetch);
    return result;
  }
}

final recomendacoesProvider =
    AsyncNotifierProvider<RecomendacoesNotifier, List<Recomendacao>>(
        RecomendacoesNotifier.new);
