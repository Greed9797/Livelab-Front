import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/api_service.dart';

const _clienteLivePolling = Duration(seconds: 30);
const _clienteIdlePolling = Duration(minutes: 10);

double _toDouble(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '') ?? 0.0;
}

int _toInt(dynamic value) {
  if (value is num) return value.round();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}

class ClientePeriod {
  final int mes;
  final int ano;

  const ClientePeriod({required this.mes, required this.ano});

  factory ClientePeriod.current() {
    final now = DateTime.now();
    return ClientePeriod(mes: now.month, ano: now.year);
  }

  ClientePeriod previous() {
    if (mes == 1) return ClientePeriod(mes: 12, ano: ano - 1);
    return ClientePeriod(mes: mes - 1, ano: ano);
  }

  ClientePeriod next() {
    if (mes == 12) return ClientePeriod(mes: 1, ano: ano + 1);
    return ClientePeriod(mes: mes + 1, ano: ano);
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ClientePeriod && other.mes == mes && other.ano == ano;

  @override
  int get hashCode => Object.hash(mes, ano);
}

final clientePeriodProvider = StateProvider<ClientePeriod>(
  (_) => ClientePeriod.current(),
);

class LiveAtiva {
  final int cabineNumero;
  final int viewerCount;
  final double gmvAtual;
  final double comissaoProjetada;
  final int duracaoMin;
  final String iniciouEm;
  final int pedidos;
  final int likes;
  final int comentarios;
  final int shares;

  const LiveAtiva({
    required this.cabineNumero,
    required this.viewerCount,
    required this.gmvAtual,
    required this.comissaoProjetada,
    required this.duracaoMin,
    required this.iniciouEm,
    required this.pedidos,
    required this.likes,
    required this.comentarios,
    required this.shares,
  });

  factory LiveAtiva.fromJson(Map<String, dynamic> j) => LiveAtiva(
        cabineNumero: _toInt(j['cabine_numero']),
        viewerCount: _toInt(j['viewer_count']),
        gmvAtual: _toDouble(j['gmv_atual']),
        comissaoProjetada: _toDouble(j['comissao_projetada']),
        duracaoMin: _toInt(j['duracao_min']),
        iniciouEm: j['iniciou_em']?.toString() ?? '',
        pedidos: _toInt(j['pedidos']),
        likes: _toInt(j['likes']),
        comentarios: _toInt(j['comentarios']),
        shares: _toInt(j['shares']),
      );
}

class ProdutoVendido {
  final String produto;
  final int qty;
  final double valor;

  const ProdutoVendido({
    required this.produto,
    required this.qty,
    required this.valor,
  });

  factory ProdutoVendido.fromJson(Map<String, dynamic> j) => ProdutoVendido(
        produto: j['produto']?.toString() ?? '',
        qty: _toInt(j['qty']),
        valor: _toDouble(j['valor']),
      );
}

class RankingDia {
  final int posicao;
  final double gmvDia;
  final int totalParticipantes;

  const RankingDia({
    required this.posicao,
    required this.gmvDia,
    required this.totalParticipantes,
  });

  factory RankingDia.fromJson(Map<String, dynamic> j) => RankingDia(
        posicao: _toInt(j['posicao']),
        gmvDia: _toDouble(j['gmv_dia'] ?? j['gmv_periodo']),
        totalParticipantes: _toInt(j['total_participantes']),
      );
}

class ProximaReserva {
  final String cabineId;
  final int cabineNumero;
  final String status;
  final String contratoId;
  final DateTime? ativadoEm;
  final DateTime? assinadoEm;

  const ProximaReserva({
    required this.cabineId,
    required this.cabineNumero,
    required this.status,
    required this.contratoId,
    this.ativadoEm,
    this.assinadoEm,
  });

  factory ProximaReserva.fromJson(Map<String, dynamic> j) => ProximaReserva(
        cabineId: j['cabine_id']?.toString() ?? '',
        cabineNumero: _toInt(j['cabine_numero']),
        status: j['status']?.toString() ?? '',
        contratoId: j['contrato_id']?.toString() ?? '',
        ativadoEm: j['ativado_em'] is String
            ? DateTime.tryParse(j['ativado_em'])
            : null,
        assinadoEm: j['assinado_em'] is String
            ? DateTime.tryParse(j['assinado_em'])
            : null,
      );
}

class BenchmarkResumo {
  final String? nicho;
  final double meuGmv;
  final double mediaGmv;
  final double percentualDaMedia;
  final double? percentil;
  final int amostra;
  final bool acimaDaMedia;

  const BenchmarkResumo({
    this.nicho,
    required this.meuGmv,
    required this.mediaGmv,
    required this.percentualDaMedia,
    this.percentil,
    required this.amostra,
    required this.acimaDaMedia,
  });

  factory BenchmarkResumo.fromJson(Map<String, dynamic> j) => BenchmarkResumo(
        nicho: j['nicho'] as String?,
        meuGmv: _toDouble(j['meu_gmv']),
        mediaGmv: _toDouble(j['media_gmv']),
        percentualDaMedia: _toDouble(j['percentual_da_media']),
        percentil: j['percentil'] == null ? null : _toDouble(j['percentil']),
        amostra: _toInt(j['amostra']),
        acimaDaMedia: (j['acima_da_media'] ?? false) as bool,
      );
}

class HorarioVenda {
  final int hora;
  final String label;
  final int totalLives;
  final double gmvTotal;
  final int pedidos;

  const HorarioVenda({
    required this.hora,
    required this.label,
    required this.totalLives,
    required this.gmvTotal,
    required this.pedidos,
  });

  factory HorarioVenda.fromJson(Map<String, dynamic> j) => HorarioVenda(
        hora: _toInt(j['hora']),
        label: j['label']?.toString() ?? '${_toInt(j['hora'])}h',
        totalLives: _toInt(j['total_lives']),
        gmvTotal: _toDouble(j['gmv_total']),
        pedidos: _toInt(j['pedidos']),
      );
}

class SerieMensal {
  final int mes;
  final int ano;
  final int totalLives;
  final double gmvTotal;
  final int itensVendidos;
  final double horasLive;
  final double valorInvestidoLives;
  final double roas;

  const SerieMensal({
    required this.mes,
    required this.ano,
    required this.totalLives,
    required this.gmvTotal,
    required this.itensVendidos,
    required this.horasLive,
    required this.valorInvestidoLives,
    required this.roas,
  });

  factory SerieMensal.fromJson(Map<String, dynamic> j) => SerieMensal(
        mes: _toInt(j['mes']),
        ano: _toInt(j['ano']),
        totalLives: _toInt(j['total_lives']),
        gmvTotal: _toDouble(j['gmv_total']),
        itensVendidos: _toInt(j['itens_vendidos']),
        horasLive: _toDouble(j['horas_live']),
        valorInvestidoLives: _toDouble(j['valor_investido_lives']),
        roas: _toDouble(j['roas']),
      );
}

class ClienteLive {
  final String id;
  final DateTime? iniciadoEm;
  final DateTime? encerradoEm;
  final String? streamerNome;
  final String status;
  final double gmv;
  final int itensVendidos;
  final int pedidos;
  final int duracaoMin;
  final double duracaoHoras;
  final int viewers;
  final int comentarios;
  final int likes;
  final int shares;
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
    required this.pedidos,
    required this.duracaoMin,
    required this.duracaoHoras,
    required this.viewers,
    required this.comentarios,
    required this.likes,
    required this.shares,
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
        pedidos: _toInt(j['pedidos'] ?? j['totalOrders'] ?? j['total_orders']),
        duracaoMin: _toInt(j['duracao_min']),
        duracaoHoras: _toDouble(j['duracao_horas']),
        viewers: _toInt(j['viewers'] ?? j['viewerCount'] ?? j['viewer_count']),
        comentarios: _toInt(
          j['comentarios'] ?? j['commentsCount'] ?? j['comments_count'],
        ),
        likes: _toInt(j['likes'] ?? j['likesCount'] ?? j['likes_count']),
        shares: _toInt(j['shares'] ?? j['sharesCount'] ?? j['shares_count']),
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
  final int viewers;
  final int comentarios;
  final int likes;
  final int shares;
  final int pedidos;

  const ClienteLivesResumo({
    required this.gmvTotal,
    required this.itensVendidos,
    required this.totalLives,
    required this.horasLive,
    required this.valorInvestidoLives,
    required this.roas,
    required this.viewers,
    required this.comentarios,
    required this.likes,
    required this.shares,
    required this.pedidos,
  });

  factory ClienteLivesResumo.fromJson(Map<String, dynamic> j) =>
      ClienteLivesResumo(
        gmvTotal: _toDouble(j['gmv_total'] ?? j['total_faturamento']),
        itensVendidos: _toInt(j['itens_vendidos'] ?? j['total_vendas']),
        totalLives: _toInt(j['total_lives']),
        horasLive: _toDouble(j['horas_live']),
        valorInvestidoLives: _toDouble(j['valor_investido_lives']),
        roas: _toDouble(j['roas']),
        viewers: _toInt(j['viewers']),
        comentarios: _toInt(j['comentarios']),
        likes: _toInt(j['likes']),
        shares: _toInt(j['shares']),
        pedidos: _toInt(j['pedidos']),
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

class ProximaLive {
  final String id;
  final DateTime? data;
  final String? horaInicio;
  final String? horaFim;
  final int cabineNumero;
  final String status;

  const ProximaLive({
    required this.id,
    this.data,
    this.horaInicio,
    this.horaFim,
    required this.cabineNumero,
    required this.status,
  });

  factory ProximaLive.fromJson(Map<String, dynamic> j) => ProximaLive(
        id: j['id']?.toString() ?? '',
        data: j['data'] is String ? DateTime.tryParse(j['data']) : null,
        horaInicio: j['hora_inicio']?.toString(),
        horaFim: j['hora_fim']?.toString(),
        cabineNumero: _toInt(j['cabine_numero']),
        status: j['status']?.toString() ?? 'pendente',
      );
}

class ClienteDashboard {
  final ClientePeriod periodo;
  final double faturamentoMes;
  final int crescimentoPct;
  final int volumeVendas;
  final double lucroEstimado;
  final double horasLive;
  final double valorInvestidoMes;
  final double valorInvestidoLives;
  final double roas;
  final int viewers;
  final int comentarios;
  final int likes;
  final int shares;
  final int pedidos;
  final int totalLives;

  // New unified dashboard fields
  final double gmvTotal;
  final int totalPedidos;
  final double ticketMedio;
  final double metaGmv;
  final double pctMeta;
  final double gmvFaltante;
  final double projecaoMes;
  final String statusMeta;
  final List<ProximaLive> proximasLives;
  final int pendentesAprovacao;

  final LiveAtiva? liveAtiva;
  final List<ProdutoVendido> maisVendidos;
  final RankingDia? rankingDia;
  final ProximaReserva? proximaReserva;
  final BenchmarkResumo? benchmarkNicho;
  final BenchmarkResumo? benchmarkGeral;
  final List<HorarioVenda> melhoresHorariosVenda;
  final List<SerieMensal> seriesMensais;
  final List<ClienteLive> lives;

  const ClienteDashboard({
    required this.periodo,
    required this.faturamentoMes,
    required this.crescimentoPct,
    required this.volumeVendas,
    required this.lucroEstimado,
    required this.horasLive,
    required this.valorInvestidoMes,
    required this.valorInvestidoLives,
    required this.roas,
    required this.viewers,
    required this.comentarios,
    required this.likes,
    required this.shares,
    required this.pedidos,
    required this.totalLives,
    required this.gmvTotal,
    required this.totalPedidos,
    required this.ticketMedio,
    required this.metaGmv,
    required this.pctMeta,
    required this.gmvFaltante,
    required this.projecaoMes,
    required this.statusMeta,
    required this.proximasLives,
    required this.pendentesAprovacao,
    this.liveAtiva,
    required this.maisVendidos,
    this.rankingDia,
    this.proximaReserva,
    this.benchmarkNicho,
    this.benchmarkGeral,
    required this.melhoresHorariosVenda,
    required this.seriesMensais,
    required this.lives,
  });

  factory ClienteDashboard.fromJson(Map<String, dynamic> j) {
    final periodoJson = (j['periodo'] as Map?)?.cast<String, dynamic>();
    final pacoteJson = (j['pacote'] as Map?)?.cast<String, dynamic>();
    final horasMes = _toDouble(j['horas_mes'] ?? j['horas_live_mes']);
    final valorInvestidoMes = () {
      if (pacoteJson == null) return 0.0;
      final valor = _toDouble(pacoteJson['valor']);
      final horasIncluidas = _toDouble(pacoteJson['horas_incluidas']);
      if (horasIncluidas <= 0) return 0.0;
      return horasMes * valor / horasIncluidas;
    }();

    final gmvTotal = _toDouble(
      j['gmv_total'] ?? j['gmv_mes'] ?? j['faturamento_mes'],
    );
    final totalPedidos = _toInt(j['total_pedidos'] ?? j['pedidos']);
    final ticketMedio = _toDouble(j['ticket_medio']);

    return ClienteDashboard(
      periodo: ClientePeriod(
        mes: _toInt(periodoJson?['mes']),
        ano: _toInt(periodoJson?['ano']),
      ),
      faturamentoMes: _toDouble(j['gmv_mes'] ?? j['faturamento_mes'] ?? j['gmv_total']),
      crescimentoPct: _toInt(j['crescimento_pct']),
      volumeVendas: _toInt(j['itens_vendidos'] ?? j['volume_vendas']),
      lucroEstimado: _toDouble(j['lucro_estimado']),
      horasLive: _toDouble(j['horas_live'] ?? j['horas_live_mes']),
      valorInvestidoMes: valorInvestidoMes > 0
          ? valorInvestidoMes
          : _toDouble(j['valor_investido_mes'] ?? j['valor_investido_lives']),
      valorInvestidoLives: _toDouble(j['valor_investido_lives']),
      roas: _toDouble(j['roas']),
      viewers: _toInt(j['viewers']),
      comentarios: _toInt(j['comentarios']),
      likes: _toInt(j['likes']),
      shares: _toInt(j['shares']),
      pedidos: _toInt(j['pedidos']),
      totalLives: _toInt(j['total_lives']),
      gmvTotal: gmvTotal,
      totalPedidos: totalPedidos,
      ticketMedio: ticketMedio,
      metaGmv: _toDouble(j['meta_gmv']),
      pctMeta: _toDouble(j['pct_meta']),
      gmvFaltante: _toDouble(j['gmv_faltante']),
      projecaoMes: _toDouble(j['projecao_mes']),
      statusMeta: j['status_meta']?.toString() ?? 'dentro_do_ritmo',
      proximasLives: (j['proximas_lives'] as List?)
              ?.map((e) => ProximaLive.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      pendentesAprovacao: _toInt(j['pendentes_aprovacao']),
      liveAtiva: j['live_ativa'] != null
          ? LiveAtiva.fromJson((j['live_ativa'] as Map).cast<String, dynamic>())
          : null,
      maisVendidos: (j['mais_vendidos'] as List?)
              ?.map((e) => ProdutoVendido.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      rankingDia: j['ranking_periodo'] != null || j['ranking_dia'] != null
          ? RankingDia.fromJson(
              ((j['ranking_periodo'] ?? j['ranking_dia']) as Map)
                  .cast<String, dynamic>(),
            )
          : null,
      proximaReserva: j['proxima_reserva'] != null
          ? ProximaReserva.fromJson(
              (j['proxima_reserva'] as Map).cast<String, dynamic>(),
            )
          : null,
      benchmarkNicho: j['benchmark_nicho'] != null
          ? BenchmarkResumo.fromJson(
              (j['benchmark_nicho'] as Map).cast<String, dynamic>(),
            )
          : null,
      benchmarkGeral: j['benchmark_geral'] != null
          ? BenchmarkResumo.fromJson(
              (j['benchmark_geral'] as Map).cast<String, dynamic>(),
            )
          : null,
      melhoresHorariosVenda: (j['melhores_horarios_venda'] as List?)
              ?.map((e) => HorarioVenda.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      seriesMensais: (j['series_mensais'] as List?)
              ?.map((e) => SerieMensal.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      lives: (j['lives'] as List?)
              ?.map((e) => ClienteLive.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );
  }
}

/// Provider for currently selected period string (hoje|7dias|30dias|mes_atual).
final clientePeriodStringProvider = StateProvider<String>((_) => 'mes_atual');

class ClienteDashboardNotifier extends AsyncNotifier<ClienteDashboard> {
  Timer? _timer;

  void _configurePolling(
    ClientePeriod period,
    String periodoStr,
    ClienteDashboard dashboard,
  ) {
    _timer?.cancel();
    final interval =
        dashboard.liveAtiva != null ? _clienteLivePolling : _clienteIdlePolling;

    _timer = Timer(interval, () async {
      try {
        final newData = await _fetch(period, periodoStr);
        if (state.hasValue) {
          state = AsyncValue.data(newData);
        }
        _configurePolling(period, periodoStr, newData);
      } catch (e) {
        debugPrint('Erro no polling do cliente: $e');
        _configurePolling(period, periodoStr, dashboard);
      }
    });
  }

  @override
  Future<ClienteDashboard> build() async {
    final period = ref.watch(clientePeriodProvider);
    final periodoStr = ref.watch(clientePeriodStringProvider);
    final data = await _fetch(period, periodoStr);

    _configurePolling(period, periodoStr, data);

    ref.onDispose(() => _timer?.cancel());
    return data;
  }

  Future<ClienteDashboard> _fetch(
    ClientePeriod period,
    String periodoStr,
  ) async {
    final resp = await ApiService.get(
      '/cliente/dashboard',
      params: {
        'periodo': periodoStr,
        'mes': '${period.mes}',
        'ano': '${period.ano}',
      },
    );
    return ClienteDashboard.fromJson(resp.data as Map<String, dynamic>);
  }

  Future<void> refresh() async {
    final period = ref.read(clientePeriodProvider);
    final periodoStr = ref.read(clientePeriodStringProvider);
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => _fetch(period, periodoStr));
    final current = state.valueOrNull;
    if (current != null) {
      _configurePolling(period, periodoStr, current);
    }
  }

  Future<void> fetchPeriodo(String periodoStr) async {
    ref.read(clientePeriodStringProvider.notifier).state = periodoStr;
    // build() re-runs automatically via ref.watch
  }

  void setPeriodo(ClientePeriod period) {
    ref.read(clientePeriodProvider.notifier).state = period;
  }

  Future<void> updateMeta(int ano, int mes, double metaGmv) async {
    await ApiService.patch(
      '/cliente/meta',
      data: {'ano': ano, 'mes': mes, 'meta_gmv': metaGmv},
    );
    await refresh();
  }
}

final clienteDashboardProvider =
    AsyncNotifierProvider<ClienteDashboardNotifier, ClienteDashboard>(
  ClienteDashboardNotifier.new,
);
