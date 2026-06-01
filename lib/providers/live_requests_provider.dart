import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/live_request.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

class LiveRequestsNotifier
    extends FamilyAsyncNotifier<List<LiveRequest>, String> {
  @override
  Future<List<LiveRequest>> build(String cabineId) async {
    // BUGFIX: faltava auth guard — após logout, FamilyAsyncNotifier seguia
    // disparando GETs background e gerando 401 em loop.
    final authState = ref.watch(authProvider);
    if (!authState.isAuthenticated) return const [];
    return _fetch();
  }

  Future<List<LiveRequest>> _fetch() async {
    final resp =
        await ApiService.get('/cliente/cabines/$arg/solicitacoes');
    return (resp.data as List)
        .map((e) => LiveRequest.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Envia uma solicitação de live e atualiza a lista.
  /// Lança [ApiException] com mensagem pronta em caso de erro.
  ///
  /// [dataSolicitada] deve estar no formato "yyyy-MM-dd" (string pura — sem Date).
  /// [horaInicio] e [horaFim] devem estar no formato "HH:mm" (string pura).
  Future<void> solicitarLive({
    required String dataSolicitada,
    required String horaInicio,
    required String horaFim,
    String? observacao,
  }) async {
    await ApiService.post('/cliente/cabines/$arg/solicitar-live', data: {
      'data_solicitada': dataSolicitada,
      'hora_inicio':     horaInicio,
      'hora_fim':        horaFim,
      if (observacao != null && observacao.isNotEmpty) 'observacao': observacao,
    });
    // Atualiza a lista após sucesso
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }
}

final liveRequestsProvider = AsyncNotifierProviderFamily<
    LiveRequestsNotifier, List<LiveRequest>, String>(
  LiveRequestsNotifier.new,
);
