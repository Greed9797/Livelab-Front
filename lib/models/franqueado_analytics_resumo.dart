class ResumoHojeAnalytics {
  final double gmvTotalHoje;
  final int audienciaTotalAoVivo;
  final int totalLivesHoje;

  const ResumoHojeAnalytics({
    required this.gmvTotalHoje,
    required this.audienciaTotalAoVivo,
    required this.totalLivesHoje,
  });

  factory ResumoHojeAnalytics.fromJson(Map<String, dynamic> json) {
    return ResumoHojeAnalytics(
      gmvTotalHoje: (json['gmv_total_hoje'] as num? ?? 0).toDouble(),
      audienciaTotalAoVivo:
          (json['audiencia_total_ao_vivo'] as num? ?? 0).toInt(),
      totalLivesHoje: (json['total_lives_hoje'] as num? ?? 0).toInt(),
    );
  }
}

class RankingCloserAnalytics {
  final String apresentadorId;
  final String apresentadorNome;
  final int totalLives;
  final double gmvTotal;

  const RankingCloserAnalytics({
    required this.apresentadorId,
    required this.apresentadorNome,
    required this.totalLives,
    required this.gmvTotal,
  });

  factory RankingCloserAnalytics.fromJson(Map<String, dynamic> json) {
    return RankingCloserAnalytics(
      apresentadorId: json['apresentador_id'] as String,
      apresentadorNome: json['apresentador_nome'] as String,
      totalLives: (json['total_lives'] as num? ?? 0).toInt(),
      gmvTotal: (json['gmv_total'] as num? ?? 0).toDouble(),
    );
  }
}

class RankingClienteAnalytics {
  final String clienteId;
  final String clienteNome;
  final double gmvTotal;
  final DateTime? ultimaLive;

  const RankingClienteAnalytics({
    required this.clienteId,
    required this.clienteNome,
    required this.gmvTotal,
    this.ultimaLive,
  });

  factory RankingClienteAnalytics.fromJson(Map<String, dynamic> json) {
    return RankingClienteAnalytics(
      clienteId: json['cliente_id'] as String,
      clienteNome: json['cliente_nome'] as String,
      gmvTotal: (json['gmv_total'] as num? ?? 0).toDouble(),
      ultimaLive: json['ultima_live'] is String
          ? DateTime.tryParse(json['ultima_live'] as String)
          : null,
    );
  }
}

class HeatmapHorarioAnalytics {
  final int hora;
  final int totalLives;
  final double gmvTotal;

  const HeatmapHorarioAnalytics({
    required this.hora,
    required this.totalLives,
    required this.gmvTotal,
  });

  factory HeatmapHorarioAnalytics.fromJson(Map<String, dynamic> json) {
    return HeatmapHorarioAnalytics(
      hora: (json['hora'] as num? ?? 0).toInt(),
      totalLives: (json['total_lives'] as num? ?? 0).toInt(),
      gmvTotal: (json['gmv_total'] as num? ?? 0).toDouble(),
    );
  }
}

class EficienciaCabineAnalytics {
  final String cabineId;
  final String cabineNome;
  final int totalLives;
  final double gmvAcumulado;

  const EficienciaCabineAnalytics({
    required this.cabineId,
    required this.cabineNome,
    required this.totalLives,
    required this.gmvAcumulado,
  });

  factory EficienciaCabineAnalytics.fromJson(Map<String, dynamic> json) {
    return EficienciaCabineAnalytics(
      cabineId: json['cabine_id'] as String,
      cabineNome: json['cabine_nome'] as String,
      totalLives: (json['total_lives'] as num? ?? 0).toInt(),
      gmvAcumulado: (json['gmv_acumulado'] as num? ?? 0).toDouble(),
    );
  }
}

class FranqueadoAnalyticsResumo {
  final ResumoHojeAnalytics resumoHoje;
  final List<RankingCloserAnalytics> rankingClosers;
  final List<RankingClienteAnalytics> rankingClientes;
  final List<HeatmapHorarioAnalytics> heatmapHorarios;
  final List<EficienciaCabineAnalytics> eficienciaCabines;

  const FranqueadoAnalyticsResumo({
    required this.resumoHoje,
    required this.rankingClosers,
    required this.rankingClientes,
    required this.heatmapHorarios,
    required this.eficienciaCabines,
  });

  factory FranqueadoAnalyticsResumo.fromJson(Map<String, dynamic> json) {
    return FranqueadoAnalyticsResumo(
      resumoHoje: ResumoHojeAnalytics.fromJson(
        Map<String, dynamic>.from(json['resumo_hoje'] as Map? ?? const {}),
      ),
      rankingClosers: (json['ranking_closers'] as List? ?? const [])
          .map((item) => RankingCloserAnalytics.fromJson(
              Map<String, dynamic>.from(item as Map)))
          .toList(),
      rankingClientes: (json['ranking_clientes'] as List? ?? const [])
          .map((item) => RankingClienteAnalytics.fromJson(
              Map<String, dynamic>.from(item as Map)))
          .toList(),
      heatmapHorarios: (json['heatmap_horarios'] as List? ?? const [])
          .map((item) => HeatmapHorarioAnalytics.fromJson(
              Map<String, dynamic>.from(item as Map)))
          .toList(),
      eficienciaCabines: (json['eficiencia_cabines'] as List? ?? const [])
          .map((item) => EficienciaCabineAnalytics.fromJson(
              Map<String, dynamic>.from(item as Map)))
          .toList(),
    );
  }
}
