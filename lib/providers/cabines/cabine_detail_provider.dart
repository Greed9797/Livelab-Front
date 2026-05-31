import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/api_service.dart';
import '../auth_provider.dart';

// --- Models simplificados para a tela de detalhe ---

class CabineLiveAtual {
  final String liveId;
  final String? contratoId;
  final String? tiktokUsername;
  final int viewerCount;
  final int totalViewers;
  final double gmvAtual;
  final int totalOrders;
  final int likesCount;
  final int commentsCount;
  final int sharesCount;
  final int giftsDiamonds;
  final int duracaoMinutos;
  final String clienteNome;
  final String apresentadorNome;
  final DateTime iniciadoEm;
  final Map<String, dynamic>? topProduto;

  CabineLiveAtual({
    required this.liveId,
    this.contratoId,
    this.tiktokUsername,
    required this.viewerCount,
    this.totalViewers = 0,
    required this.gmvAtual,
    required this.totalOrders,
    this.likesCount = 0,
    this.commentsCount = 0,
    this.sharesCount = 0,
    this.giftsDiamonds = 0,
    required this.duracaoMinutos,
    required this.clienteNome,
    required this.apresentadorNome,
    required this.iniciadoEm,
    this.topProduto,
  });

  factory CabineLiveAtual.fromJson(Map<String, dynamic> json) {
    return CabineLiveAtual(
      liveId: json['live_id'] as String,
      contratoId: json['contrato_id'] as String?,
      tiktokUsername: json['tiktok_username'] as String?,
      viewerCount: (json['viewer_count'] as num? ?? 0).toInt(),
      totalViewers: (json['total_viewers'] as num? ?? 0).toInt(),
      gmvAtual: (json['gmv_atual'] as num? ?? 0).toDouble(),
      totalOrders: (json['total_orders'] as num? ?? 0).toInt(),
      likesCount: (json['likes_count'] as num? ?? 0).toInt(),
      commentsCount: (json['comments_count'] as num? ?? 0).toInt(),
      sharesCount: (json['shares_count'] as num? ?? 0).toInt(),
      giftsDiamonds: (json['gifts_diamonds'] as num? ?? 0).toInt(),
      duracaoMinutos: (json['duracao_minutos'] as num? ?? 0).toInt(),
      clienteNome: (json['cliente_nome'] ?? '') as String,
      apresentadorNome: (json['apresentador_nome'] ?? '') as String,
      iniciadoEm: DateTime.parse(json['iniciado_em'] as String),
      topProduto: json['top_produto'] as Map<String, dynamic>?,
    );
  }
}

class CabineHistorico {
  final List<dynamic> topClientes;
  final List<dynamic> melhoresHorarios;
  final Map<String, dynamic> desempenhoMensal;
  final Map<String, dynamic> totais;

  CabineHistorico({
    required this.topClientes,
    required this.melhoresHorarios,
    required this.desempenhoMensal,
    required this.totais,
  });

  factory CabineHistorico.fromJson(Map<String, dynamic> json) {
    return CabineHistorico(
      topClientes: json['top_clientes'] ?? [],
      melhoresHorarios: json['melhores_horarios'] ?? [],
      desempenhoMensal: json['desempenho_mensal'] ?? {},
      totais: json['totais'] ?? {},
    );
  }
}

class CabineDetailState {
  final CabineLiveAtual? liveAtual;
  final CabineHistorico? historico;

  CabineDetailState({this.liveAtual, this.historico});

  CabineDetailState copyWith({
    CabineLiveAtual? liveAtual,
    CabineHistorico? historico,
    bool clearLive = false,
  }) {
    return CabineDetailState(
      liveAtual: clearLive ? null : (liveAtual ?? this.liveAtual),
      historico: historico ?? this.historico,
    );
  }
}

class CabineDetailNotifier
    extends FamilyAsyncNotifier<CabineDetailState, String> {
  Timer? _pollTimer;

  @override
  Future<CabineDetailState> build(String arg) async {
    // BUGFIX: faltava auth guard — após logout o polling continuava em
    // background gerando 401s e impedindo limpeza correta.
    final authState = ref.watch(authProvider);
    ref.onDispose(() => _pollTimer?.cancel());
    if (!authState.isAuthenticated) {
      _pollTimer?.cancel();
      _pollTimer = null;
      throw Exception('Não autenticado');
    }

    final historico = await _fetchHistorico(arg);
    final liveAtual = await _fetchLiveAtual(arg);

    _restartPollingIfLive(liveAtual != null);

    return CabineDetailState(liveAtual: liveAtual, historico: historico);
  }

  void _restartPollingIfLive(bool hasLive) {
    _pollTimer?.cancel();
    if (!hasLive) return;
    _pollTimer = Timer.periodic(const Duration(seconds: 8), (_) {
      refreshLiveOnly();
    });
  }

  Future<CabineHistorico> _fetchHistorico(String cabineId) async {
    final response =
        await ApiService.get('/cabines/$cabineId/historico?dias=90');
    return CabineHistorico.fromJson(response.data);
  }

  Future<CabineLiveAtual?> _fetchLiveAtual(String cabineId) async {
    try {
      final response = await ApiService.get('/cabines/$cabineId/live-atual');
      final data = response.data as Map<String, dynamic>;
      // Novo contrato: backend retorna { live_ativa: false } quando não há live
      if (data['live_ativa'] == false) return null;
      return CabineLiveAtual.fromJson(data);
    } catch (_) {
      return null;
    }
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => build(arg));
  }

  Future<void> refreshLiveOnly() async {
    if (!state.hasValue) return;

    try {
      final liveAtual = await _fetchLiveAtual(arg);
      state = AsyncValue.data(
        state.value!.copyWith(
          liveAtual: liveAtual,
          clearLive: liveAtual == null,
        ),
      );
      _restartPollingIfLive(liveAtual != null);
    } catch (_) {
      // Mantemos o último estado estável se o refresh parcial falhar.
    }
  }
}

// Injeção do Provider
final cabineDetailProvider = AsyncNotifierProviderFamily<CabineDetailNotifier,
    CabineDetailState, String>(
  CabineDetailNotifier.new,
);
