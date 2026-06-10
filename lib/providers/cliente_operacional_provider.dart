import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/api_service.dart';
import 'cliente_dashboard_provider.dart' show ClientePeriod, clientePeriodProvider;

// ---------------------------------------------------------------------------
// Helpers de parse — null preservado (diferente de _toDouble do dashboard)
// ---------------------------------------------------------------------------
double? _toDoubleOrNull(dynamic v) {
  if (v == null) return null;
  if (v is num) return v.toDouble();
  return double.tryParse(v.toString());
}

int? _toIntOrNull(dynamic v) {
  if (v == null) return null;
  if (v is num) return v.round();
  return int.tryParse(v.toString());
}

String _s(dynamic v) => v?.toString() ?? '';

// ---------------------------------------------------------------------------
// Models — imutáveis, campos nullable onde o backend pode enviar null
// ---------------------------------------------------------------------------

class OperacionalConfig {
  final double? metaGmvHora;
  final double? margemPct;
  final double? comissaoLivelabPct;

  const OperacionalConfig({
    this.metaGmvHora,
    this.margemPct,
    this.comissaoLivelabPct,
  });

  factory OperacionalConfig.fromJson(Map<String, dynamic> j) =>
      OperacionalConfig(
        metaGmvHora: _toDoubleOrNull(j['meta_gmv_hora']),
        margemPct: _toDoubleOrNull(j['margem_pct']),
        comissaoLivelabPct: _toDoubleOrNull(j['comissao_livelab_pct']),
      );
}

class FunilMetricas {
  final int? views;
  final int? clicks;
  final int? pedidos;

  const FunilMetricas({this.views, this.clicks, this.pedidos});

  factory FunilMetricas.fromJson(Map<String, dynamic> j) => FunilMetricas(
        views: _toIntOrNull(j['views']),
        clicks: _toIntOrNull(j['clicks']),
        pedidos: _toIntOrNull(j['pedidos']),
      );
}

class OperacionalMetricas {
  final double? horasLive;
  final double? gmv;
  final double? gmvPorHora;
  final double? pctMetaHora;
  final double? comissaoLivelabTotal;
  final double? comissaoApresentadoraTotal;
  final double? comissaoPorHora;
  final FunilMetricas? funil;

  const OperacionalMetricas({
    this.horasLive,
    this.gmv,
    this.gmvPorHora,
    this.pctMetaHora,
    this.comissaoLivelabTotal,
    this.comissaoApresentadoraTotal,
    this.comissaoPorHora,
    this.funil,
  });

  factory OperacionalMetricas.fromJson(Map<String, dynamic> j) =>
      OperacionalMetricas(
        horasLive: _toDoubleOrNull(j['horas_live']),
        gmv: _toDoubleOrNull(j['gmv']),
        gmvPorHora: _toDoubleOrNull(j['gmv_por_hora']),
        pctMetaHora: _toDoubleOrNull(j['pct_meta_hora']),
        comissaoLivelabTotal: _toDoubleOrNull(j['comissao_livelab_total']),
        comissaoApresentadoraTotal:
            _toDoubleOrNull(j['comissao_apresentadora_total']),
        comissaoPorHora: _toDoubleOrNull(j['comissao_por_hora']),
        funil: j['funil'] != null
            ? FunilMetricas.fromJson(
                (j['funil'] as Map).cast<String, dynamic>())
            : null,
      );
}

class OperacionalStatus {
  final String status;
  final List<String> motivos;
  final String? diagnostico;
  final String? proximaAcao;

  const OperacionalStatus({
    required this.status,
    required this.motivos,
    this.diagnostico,
    this.proximaAcao,
  });

  factory OperacionalStatus.fromJson(Map<String, dynamic> j) =>
      OperacionalStatus(
        status: _s(j['status']),
        motivos: (j['motivos'] as List?)?.map(_s).toList() ?? const [],
        diagnostico: j['diagnostico'] != null ? _s(j['diagnostico']) : null,
        proximaAcao: j['proxima_acao'] != null ? _s(j['proxima_acao']) : null,
      );
}

class OperacionalAlerta {
  final String liveId;
  final String tipo;
  final String descricao;
  final String data;

  const OperacionalAlerta({
    required this.liveId,
    required this.tipo,
    required this.descricao,
    required this.data,
  });

  factory OperacionalAlerta.fromJson(Map<String, dynamic> j) =>
      OperacionalAlerta(
        liveId: _s(j['live_id']),
        tipo: _s(j['tipo']),
        descricao: _s(j['descricao']),
        data: _s(j['data']),
      );
}

class ClienteOperacional {
  final String periodo;
  final OperacionalConfig config;
  final OperacionalMetricas metricas;
  final OperacionalStatus status;
  final List<OperacionalAlerta> alertas;

  const ClienteOperacional({
    required this.periodo,
    required this.config,
    required this.metricas,
    required this.status,
    required this.alertas,
  });

  factory ClienteOperacional.fromJson(Map<String, dynamic> j) =>
      ClienteOperacional(
        periodo: _s(j['periodo']),
        config: j['config'] != null
            ? OperacionalConfig.fromJson(
                (j['config'] as Map).cast<String, dynamic>())
            : const OperacionalConfig(),
        metricas: j['metricas'] != null
            ? OperacionalMetricas.fromJson(
                (j['metricas'] as Map).cast<String, dynamic>())
            : const OperacionalMetricas(),
        status: j['status'] != null
            ? OperacionalStatus.fromJson(
                (j['status'] as Map).cast<String, dynamic>())
            : const OperacionalStatus(
                status: 'dados_incompletos', motivos: []),
        alertas: (j['alertas'] as List?)
                ?.map((e) => OperacionalAlerta.fromJson(
                    (e as Map).cast<String, dynamic>()))
                .toList() ??
            const [],
      );
}

// ---------------------------------------------------------------------------
// Model de sessão de live
// ---------------------------------------------------------------------------

class SessaoLive {
  final String liveId;
  final String? data;
  final String? inicio;
  final String? fim;
  final String? apresentadora;
  final double? horas;
  final double? gmv;
  final int? pedidos;
  final int? views;
  final int? clicks;
  final double? gmvPorHora;
  final double? pedidosPorHora;
  final double? comissaoLivelab;
  final double? comissaoApresentadora;
  final double? comissaoApresentadoraPct;
  final bool fimDeSemana;
  final String statusOperacional;
  final List<String> motivos;
  final String? diagnostico;
  final String? problema;
  final String? proximaAcao;

  const SessaoLive({
    required this.liveId,
    this.data,
    this.inicio,
    this.fim,
    this.apresentadora,
    this.horas,
    this.gmv,
    this.pedidos,
    this.views,
    this.clicks,
    this.gmvPorHora,
    this.pedidosPorHora,
    this.comissaoLivelab,
    this.comissaoApresentadora,
    this.comissaoApresentadoraPct,
    this.fimDeSemana = false,
    this.statusOperacional = 'dados_incompletos',
    this.motivos = const [],
    this.diagnostico,
    this.problema,
    this.proximaAcao,
  });

  factory SessaoLive.fromJson(Map<String, dynamic> j) => SessaoLive(
        liveId: _s(j['live_id']),
        data: j['data'] != null ? _s(j['data']) : null,
        inicio: j['inicio'] != null ? _s(j['inicio']) : null,
        fim: j['fim'] != null ? _s(j['fim']) : null,
        apresentadora:
            j['apresentadora'] != null ? _s(j['apresentadora']) : null,
        horas: _toDoubleOrNull(j['horas']),
        gmv: _toDoubleOrNull(j['gmv']),
        pedidos: _toIntOrNull(j['pedidos']),
        views: _toIntOrNull(j['views']),
        clicks: _toIntOrNull(j['clicks']),
        gmvPorHora: _toDoubleOrNull(j['gmv_por_hora']),
        pedidosPorHora: _toDoubleOrNull(j['pedidos_por_hora']),
        comissaoLivelab: _toDoubleOrNull(j['comissao_livelab']),
        comissaoApresentadora: _toDoubleOrNull(j['comissao_apresentadora']),
        comissaoApresentadoraPct:
            _toDoubleOrNull(j['comissao_apresentadora_pct']),
        fimDeSemana: j['fim_de_semana'] == true,
        statusOperacional: _s(j['status_operacional']).isNotEmpty
            ? _s(j['status_operacional'])
            : 'dados_incompletos',
        motivos: (j['motivos'] as List?)?.map(_s).toList() ?? const [],
        diagnostico:
            j['diagnostico'] != null ? _s(j['diagnostico']) : null,
        problema: j['problema'] != null ? _s(j['problema']) : null,
        proximaAcao:
            j['proxima_acao'] != null ? _s(j['proxima_acao']) : null,
      );
}

class SessoesResponse {
  final String periodo;
  final int total;
  final List<SessaoLive> sessoes;

  const SessoesResponse({
    required this.periodo,
    required this.total,
    required this.sessoes,
  });
}

// ---------------------------------------------------------------------------
// Provider operacional — sem polling, auto-dispose por período
// ---------------------------------------------------------------------------

class ClienteOperacionalNotifier extends AutoDisposeFamilyAsyncNotifier<
    ClienteOperacional, ClientePeriod> {
  @override
  Future<ClienteOperacional> build(ClientePeriod arg) async {
    final resp = await ApiService.get<Map<String, dynamic>>(
      '/cliente/operacional',
      params: {'mes': arg.mes, 'ano': arg.ano},
    );
    final data = resp.data;
    if (data == null) throw const ApiException('Resposta vazia do servidor.');
    return ClienteOperacional.fromJson(data);
  }
}

final clienteOperacionalProvider = AsyncNotifierProvider.autoDispose
    .family<ClienteOperacionalNotifier, ClienteOperacional, ClientePeriod>(
  ClienteOperacionalNotifier.new,
);

// ---------------------------------------------------------------------------
// Provider de sessões com paginação — acumula via loadMore
// ---------------------------------------------------------------------------

class SessoesNotifier
    extends AutoDisposeFamilyAsyncNotifier<SessoesResponse, ClientePeriod> {
  static const _pageSize = 20;
  int _offset = 0;
  List<SessaoLive> _accumulated = [];

  @override
  Future<SessoesResponse> build(ClientePeriod arg) async {
    _offset = 0;
    _accumulated = [];
    return _fetch(arg);
  }

  Future<SessoesResponse> _fetch(ClientePeriod period) async {
    final resp = await ApiService.get<Map<String, dynamic>>(
      '/cliente/sessoes',
      params: {
        'mes': period.mes,
        'ano': period.ano,
        'limit': _pageSize,
        'offset': _offset,
      },
    );
    final data = resp.data;
    if (data == null) throw const ApiException('Resposta vazia do servidor.');
    final novas = (data['sessoes'] as List?)
            ?.map((e) =>
                SessaoLive.fromJson((e as Map).cast<String, dynamic>()))
            .toList() ??
        const <SessaoLive>[];
    _accumulated = [..._accumulated, ...novas];
    return SessoesResponse(
      periodo: _s(data['periodo']),
      total: data['total'] != null ? (data['total'] as num).round() : 0,
      sessoes: List.unmodifiable(_accumulated),
    );
  }

  Future<void> loadMore(ClientePeriod period) async {
    final current = state.valueOrNull;
    if (current == null) return;
    if (current.sessoes.length >= current.total) return;
    _offset += _pageSize;
    state = await AsyncValue.guard(() => _fetch(period));
  }
}

final clienteSessoesProvider = AsyncNotifierProvider.autoDispose
    .family<SessoesNotifier, SessoesResponse, ClientePeriod>(
  SessoesNotifier.new,
);
