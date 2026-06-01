import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

class LiveHistorico {
  final String id;
  final String iniciadoEm;
  final String? encerradoEm;
  final int cabineNumero;
  final String? streamerNome;
  final String status;
  final double totalFaturamento;
  final double comissao;
  final int totalVendas;
  final int duracaoMin;

  const LiveHistorico({
    required this.id,
    required this.iniciadoEm,
    this.encerradoEm,
    required this.cabineNumero,
    this.streamerNome,
    required this.status,
    required this.totalFaturamento,
    required this.comissao,
    required this.totalVendas,
    required this.duracaoMin,
  });

  factory LiveHistorico.fromJson(Map<String, dynamic> j) => LiveHistorico(
        id: j['id'] as String,
        iniciadoEm: j['iniciado_em'] as String,
        encerradoEm: j['encerrado_em'] as String?,
        cabineNumero: int.tryParse(j['cabine_numero']?.toString() ?? '') ?? 0,
        streamerNome: j['streamer_nome'] as String?,
        status: j['status'] as String,
        totalFaturamento:
            double.tryParse(j['total_faturamento']?.toString() ?? '') ?? 0.0,
        comissao: double.tryParse(j['comissao']?.toString() ?? '') ?? 0.0,
        totalVendas: int.tryParse(j['total_vendas']?.toString() ?? '') ?? 0,
        duracaoMin: int.tryParse(j['duracao_min']?.toString() ?? '') ?? 0,
      );
}

class HistoricoResumo {
  final double totalFaturamento;
  final int totalVendas;
  final int totalLives;

  const HistoricoResumo({
    required this.totalFaturamento,
    required this.totalVendas,
    required this.totalLives,
  });

  factory HistoricoResumo.fromJson(Map<String, dynamic> j) => HistoricoResumo(
        totalFaturamento:
            double.tryParse(j['total_faturamento']?.toString() ?? '') ?? 0.0,
        totalVendas: int.tryParse(j['total_vendas']?.toString() ?? '') ?? 0,
        totalLives: int.tryParse(j['total_lives']?.toString() ?? '') ?? 0,
      );
}

class ClienteHistoricoData {
  final HistoricoResumo resumo;
  final List<LiveHistorico> lives;

  const ClienteHistoricoData({required this.resumo, required this.lives});

  factory ClienteHistoricoData.fromJson(Map<String, dynamic> j) =>
      ClienteHistoricoData(
        resumo: HistoricoResumo.fromJson(j['resumo'] as Map<String, dynamic>),
        lives: (j['lives'] as List)
            .map((e) => LiveHistorico.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class ClienteHistoricoNotifier extends AsyncNotifier<ClienteHistoricoData> {
  @override
  Future<ClienteHistoricoData> build() async {
    final authState = ref.watch(authProvider);
    if (!authState.isAuthenticated) {
      throw Exception('Não autenticado');
    }
    return _fetch();
  }

  Future<ClienteHistoricoData> _fetch({int? mes, int? ano}) async {
    final params = <String, dynamic>{};
    if (mes != null) params['mes'] = mes;
    if (ano != null) params['ano'] = ano;
    final resp = await ApiService.get('/cliente/vendas',
        params: params.isEmpty ? null : params);
    return ClienteHistoricoData.fromJson(resp.data as Map<String, dynamic>);
  }

  Future<void> carregarPeriodo(int mes, int ano) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => _fetch(mes: mes, ano: ano));
  }
}

final clienteHistoricoProvider =
    AsyncNotifierProvider<ClienteHistoricoNotifier, ClienteHistoricoData>(
        ClienteHistoricoNotifier.new);
