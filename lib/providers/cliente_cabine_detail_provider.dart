import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

class ClienteLiveAtual {
  final String liveId;
  final int viewerCount;
  final double gmvAtual;
  final int totalOrders;
  final int likesCount;
  final int commentsCount;
  final String? apresentadorNome;
  final int duracaoMinutos;
  final String? topProduto;
  final double comissaoCalculada;

  const ClienteLiveAtual({
    required this.liveId,
    required this.viewerCount,
    required this.gmvAtual,
    required this.totalOrders,
    required this.likesCount,
    required this.commentsCount,
    this.apresentadorNome,
    this.duracaoMinutos = 0,
    this.topProduto,
    this.comissaoCalculada = 0,
  });

  factory ClienteLiveAtual.fromJson(Map<String, dynamic> j) => ClienteLiveAtual(
        liveId: j['live_id'] as String? ?? '',
        viewerCount: (j['viewer_count'] as num? ?? 0).toInt(),
        gmvAtual: (j['gmv'] as num? ?? 0).toDouble(),
        totalOrders: (j['total_orders'] as num? ?? 0).toInt(),
        likesCount: (j['likes_count'] as num? ?? 0).toInt(),
        commentsCount: (j['comments_count'] as num? ?? 0).toInt(),
        apresentadorNome: j['apresentador_nome'] as String?,
        duracaoMinutos: (j['duracao_minutos'] as num? ?? 0).toInt(),
        topProduto: j['top_produto'] as String?,
        comissaoCalculada: (j['comissao_calculada'] as num? ?? 0).toDouble(),
      );
}

class ClienteHistoricoLive {
  final String iniciadoEm;
  final String status;
  final int duracaoMin;
  final double fatGerado;
  final double comissaoCalculada;

  const ClienteHistoricoLive({
    required this.iniciadoEm,
    required this.status,
    required this.duracaoMin,
    required this.fatGerado,
    required this.comissaoCalculada,
  });

  factory ClienteHistoricoLive.fromJson(Map<String, dynamic> j) =>
      ClienteHistoricoLive(
        iniciadoEm: j['iniciado_em'] as String? ?? '',
        status: j['status'] as String? ?? '',
        duracaoMin: (j['duracao_min'] as num? ?? 0).toInt(),
        fatGerado: (j['fat_gerado'] as num? ?? 0).toDouble(),
        comissaoCalculada: (j['comissao_calculada'] as num? ?? 0).toDouble(),
      );
}

class ClienteCabineDetailState {
  final ClienteLiveAtual? liveAtual;
  final List<ClienteHistoricoLive> historicoLives;

  const ClienteCabineDetailState({
    required this.liveAtual,
    required this.historicoLives,
  });
}

class ClienteCabineDetailNotifier
    extends FamilyAsyncNotifier<ClienteCabineDetailState, String> {
  @override
  Future<ClienteCabineDetailState> build(String arg) async {
    // BUGFIX: faltava auth guard — após logout o provider tentava GET
    // /cabines/:id/cliente em background e gerava 401s.
    final authState = ref.watch(authProvider);
    if (!authState.isAuthenticated) {
      throw Exception('Não autenticado');
    }
    return _fetch(arg);
  }

  Future<ClienteCabineDetailState> _fetch(String cabineId) async {
    final res = await ApiService.get<Map<String, dynamic>>(
      '/cabines/$cabineId/cliente',
    );
    final data = res.data ?? {};
    ClienteLiveAtual? liveAtual;
    final liveJson = data['live_atual'];
    if (liveJson is Map<String, dynamic>) {
      liveAtual = ClienteLiveAtual.fromJson(liveJson);
    }
    final historico = (data['historico'] as List? ?? [])
        .map((e) =>
            ClienteHistoricoLive.fromJson(e as Map<String, dynamic>))
        .toList();
    return ClienteCabineDetailState(
      liveAtual: liveAtual,
      historicoLives: historico,
    );
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => _fetch(arg));
  }

  Future<void> refreshLiveOnly() async {
    final current = state.valueOrNull;
    if (current == null) return;
    try {
      final res = await ApiService.get<Map<String, dynamic>>(
        '/cabines/$arg/cliente',
      );
      final data = res.data ?? {};
      ClienteLiveAtual? liveAtual;
      final liveJson = data['live_atual'];
      if (liveJson is Map<String, dynamic>) {
        liveAtual = ClienteLiveAtual.fromJson(liveJson);
      }
      state = AsyncData(ClienteCabineDetailState(
        liveAtual: liveAtual,
        historicoLives: current.historicoLives,
      ));
    } catch (_) {}
  }
}

final clienteCabineDetailProvider = AsyncNotifierProvider.family<
    ClienteCabineDetailNotifier, ClienteCabineDetailState, String>(
  ClienteCabineDetailNotifier.new,
);
