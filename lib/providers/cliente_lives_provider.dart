import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/api_service.dart';
import 'cliente_dashboard_provider.dart'
    show ClientePeriod, clientePeriodProvider;

double _toDouble(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '') ?? 0.0;
}

int _toInt(dynamic value) {
  if (value is num) return value.round();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}

class ClienteLive {
  final String id;
  final DateTime? iniciadoEm;
  final DateTime? encerradoEm;
  final String? streamerNome;
  final String status;
  final double gmv;
  final int itensVendidos;
  final int totalOrders;
  final int duracaoMin;
  final double duracaoHoras;
  final int viewerCount;
  final int commentsCount;
  final int likesCount;
  final int sharesCount;
  final String? topProduto;
  final double roas;
  final double valorInvestido;

  const ClienteLive({
    required this.id,
    this.iniciadoEm,
    this.encerradoEm,
    this.streamerNome,
    required this.status,
    required this.gmv,
    required this.itensVendidos,
    required this.totalOrders,
    required this.duracaoMin,
    required this.duracaoHoras,
    required this.viewerCount,
    required this.commentsCount,
    required this.likesCount,
    required this.sharesCount,
    this.topProduto,
    required this.roas,
    required this.valorInvestido,
  });

  factory ClienteLive.fromJson(Map<String, dynamic> j) => ClienteLive(
        id: j['id']?.toString() ?? '',
        iniciadoEm: j['iniciado_em'] is String
            ? DateTime.tryParse(j['iniciado_em'])
            : null,
        encerradoEm: j['encerrado_em'] is String
            ? DateTime.tryParse(j['encerrado_em'])
            : null,
        streamerNome: j['streamer_nome']?.toString(),
        status: j['status']?.toString() ?? '',
        gmv: _toDouble(j['gmv'] ?? j['total_faturamento']),
        itensVendidos: _toInt(j['itens_vendidos'] ?? j['total_vendas']),
        totalOrders:
            _toInt(j['totalOrders'] ?? j['total_orders'] ?? j['pedidos']),
        duracaoMin: _toInt(j['duracao_min']),
        duracaoHoras: _toDouble(j['duracao_horas']),
        viewerCount:
            _toInt(j['viewerCount'] ?? j['viewer_count'] ?? j['viewers']),
        commentsCount: _toInt(
          j['commentsCount'] ?? j['comments_count'] ?? j['comentarios'],
        ),
        likesCount: _toInt(j['likesCount'] ?? j['likes_count'] ?? j['likes']),
        sharesCount:
            _toInt(j['sharesCount'] ?? j['shares_count'] ?? j['shares']),
        topProduto: (j['topProduto'] ?? j['top_produto'])?.toString(),
        roas: _toDouble(j['roas']),
        valorInvestido: _toDouble(j['valor_investido']),
      );
}

class ClienteLivesResumo {
  final double gmvTotal;
  final int itensVendidos;
  final int totalLives;
  final double horasLive;
  final double valorInvestidoLives;
  final double roas;
  final int viewerCount;
  final int commentsCount;
  final int likesCount;
  final int sharesCount;
  final int totalOrders;

  const ClienteLivesResumo({
    required this.gmvTotal,
    required this.itensVendidos,
    required this.totalLives,
    required this.horasLive,
    required this.valorInvestidoLives,
    required this.roas,
    required this.viewerCount,
    required this.commentsCount,
    required this.likesCount,
    required this.sharesCount,
    required this.totalOrders,
  });

  factory ClienteLivesResumo.fromJson(Map<String, dynamic> j) =>
      ClienteLivesResumo(
        gmvTotal: _toDouble(j['gmv_total'] ?? j['total_faturamento']),
        itensVendidos: _toInt(j['itens_vendidos'] ?? j['total_vendas']),
        totalLives: _toInt(j['total_lives']),
        horasLive: _toDouble(j['horas_live']),
        valorInvestidoLives: _toDouble(j['valor_investido_lives']),
        roas: _toDouble(j['roas']),
        viewerCount:
            _toInt(j['viewerCount'] ?? j['viewer_count'] ?? j['viewers']),
        commentsCount: _toInt(
          j['commentsCount'] ?? j['comments_count'] ?? j['comentarios'],
        ),
        likesCount: _toInt(j['likesCount'] ?? j['likes_count'] ?? j['likes']),
        sharesCount:
            _toInt(j['sharesCount'] ?? j['shares_count'] ?? j['shares']),
        totalOrders:
            _toInt(j['totalOrders'] ?? j['total_orders'] ?? j['pedidos']),
      );
}

class ClienteLivesResponse {
  final ClientePeriod periodo;
  final ClienteLivesResumo resumo;
  final List<ClienteLive> lives;

  const ClienteLivesResponse({
    required this.periodo,
    required this.resumo,
    required this.lives,
  });

  factory ClienteLivesResponse.fromJson(Map<String, dynamic> j) {
    final periodoJson = (j['periodo'] as Map?)?.cast<String, dynamic>();

    return ClienteLivesResponse(
      periodo: ClientePeriod(
        mes: _toInt(periodoJson?['mes']),
        ano: _toInt(periodoJson?['ano']),
      ),
      resumo: ClienteLivesResumo.fromJson(
        (j['resumo'] as Map?)?.cast<String, dynamic>() ?? const {},
      ),
      lives: (j['lives'] as List?)
              ?.map((e) => ClienteLive.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );
  }
}

final clienteLivesProvider =
    FutureProvider.autoDispose<ClienteLivesResponse>((ref) async {
  final period = ref.watch(clientePeriodProvider);
  final resp = await ApiService.get(
    '/cliente/lives?mes=${period.mes}&ano=${period.ano}',
  );
  return ClienteLivesResponse.fromJson(resp.data as Map<String, dynamic>);
});
