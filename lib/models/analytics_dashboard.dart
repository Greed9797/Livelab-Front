/// Presets disponíveis no filtro de período.
enum AnalyticsPreset { hoje, ontem, dias7, dias14, mes1, custom }

extension AnalyticsPresetX on AnalyticsPreset {
  String get id => switch (this) {
        AnalyticsPreset.hoje => 'hoje',
        AnalyticsPreset.ontem => 'ontem',
        AnalyticsPreset.dias7 => '7d',
        AnalyticsPreset.dias14 => '14d',
        AnalyticsPreset.mes1 => '1m',
        AnalyticsPreset.custom => 'custom',
      };
  String get label => switch (this) {
        AnalyticsPreset.hoje => 'Hoje',
        AnalyticsPreset.ontem => 'Ontem',
        AnalyticsPreset.dias7 => '7 dias',
        AnalyticsPreset.dias14 => '14 dias',
        AnalyticsPreset.mes1 => '1 mês',
        AnalyticsPreset.custom => 'Personalizado',
      };
}

class AnalyticsFiltros {
  final String? clienteId;
  final DateTime from;
  final DateTime to;
  final AnalyticsPreset preset;

  const AnalyticsFiltros({
    this.clienteId,
    required this.from,
    required this.to,
    required this.preset,
  });

  /// Calcula from/to a partir de um preset relativo a hoje.
  static AnalyticsFiltros forPreset(AnalyticsPreset p, {String? clienteId}) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    DateTime from;
    DateTime to;
    switch (p) {
      case AnalyticsPreset.hoje:
        from = today; to = today; break;
      case AnalyticsPreset.ontem:
        from = today.subtract(const Duration(days: 1));
        to = from; break;
      case AnalyticsPreset.dias7:
        to = today; from = today.subtract(const Duration(days: 6)); break;
      case AnalyticsPreset.dias14:
        to = today; from = today.subtract(const Duration(days: 13)); break;
      case AnalyticsPreset.mes1:
        to = today; from = today.subtract(const Duration(days: 29)); break;
      case AnalyticsPreset.custom:
        to = today; from = today.subtract(const Duration(days: 29)); break;
    }
    return AnalyticsFiltros(clienteId: clienteId, from: from, to: to, preset: p);
  }

  AnalyticsFiltros copyWith({
    Object? clienteId = _sentinel,
    DateTime? from,
    DateTime? to,
    AnalyticsPreset? preset,
  }) {
    return AnalyticsFiltros(
      clienteId: clienteId == _sentinel ? this.clienteId : clienteId as String?,
      from: from ?? this.from,
      to: to ?? this.to,
      preset: preset ?? this.preset,
    );
  }
}

const Object _sentinel = Object();

// ─────────────────────────────────────────
// Sub-models
// ─────────────────────────────────────────

class KpiResumo {
  final double faturamentoTotal;
  final int totalVendas;
  final double ticketMedio;
  final int audienciaMedia;
  final int deltaFaturamento;
  final int deltaVendas;
  final int deltaTicket;
  final int deltaAudiencia;
  final double totalHorasNoAr;

  const KpiResumo({
    required this.faturamentoTotal,
    required this.totalVendas,
    required this.ticketMedio,
    this.audienciaMedia = 0,
    this.deltaFaturamento = 0,
    this.deltaVendas = 0,
    this.deltaTicket = 0,
    this.deltaAudiencia = 0,
    this.totalHorasNoAr = 0,
  });

  factory KpiResumo.fromJson(Map<String, dynamic> j) => KpiResumo(
        faturamentoTotal: (j['faturamento_total'] as num? ?? 0).toDouble(),
        totalVendas: (j['total_vendas'] as num? ?? 0).toInt(),
        ticketMedio: (j['ticket_medio'] as num? ?? 0).toDouble(),
        audienciaMedia: (j['audiencia_media'] as num? ?? 0).toInt(),
        deltaFaturamento: (j['delta_faturamento'] as num? ?? 0).toInt(),
        deltaVendas: (j['delta_vendas'] as num? ?? 0).toInt(),
        deltaTicket: (j['delta_ticket'] as num? ?? 0).toInt(),
        deltaAudiencia: (j['delta_audiencia'] as num? ?? 0).toInt(),
        totalHorasNoAr: (j['total_horas_no_ar'] as num? ?? 0).toDouble(),
      );
}

class PeakHour {
  final int hora;
  final double gmv;
  const PeakHour({required this.hora, required this.gmv});
  factory PeakHour.fromJson(Map<String, dynamic> j) => PeakHour(
        hora: (j['hora'] as num? ?? 0).toInt(),
        gmv: (j['gmv'] as num? ?? 0).toDouble(),
      );
}

class HeatmapCell {
  final int dow; // 1=Mon..7=Sun
  final int blocoHora; // 0,3,6,9,12,15,18,21
  final double gmv;
  final int lives;
  const HeatmapCell({required this.dow, required this.blocoHora, required this.gmv, required this.lives});
  factory HeatmapCell.fromJson(Map<String, dynamic> j) => HeatmapCell(
        dow: (j['dow'] as num? ?? 0).toInt(),
        blocoHora: (j['bloco_hora'] as num? ?? 0).toInt(),
        gmv: (j['gmv'] as num? ?? 0).toDouble(),
        lives: (j['lives'] as num? ?? 0).toInt(),
      );
}

class FaturamentoMensal {
  final String mes;
  final double gmv;

  const FaturamentoMensal({required this.mes, required this.gmv});

  factory FaturamentoMensal.fromJson(Map<String, dynamic> j) => FaturamentoMensal(
        mes: j['mes'] as String,
        gmv: (j['gmv'] as num? ?? 0).toDouble(),
      );
}

class VendasMensal {
  final String mes;
  final int totalVendas;

  const VendasMensal({required this.mes, required this.totalVendas});

  factory VendasMensal.fromJson(Map<String, dynamic> j) => VendasMensal(
        mes: j['mes'] as String,
        totalVendas: (j['total_vendas'] as num? ?? 0).toInt(),
      );
}

class HorasLiveDia {
  final String dia; // "YYYY-MM-DD"
  final double horas;

  const HorasLiveDia({required this.dia, required this.horas});

  factory HorasLiveDia.fromJson(Map<String, dynamic> j) => HorasLiveDia(
        dia: j['dia'] as String,
        horas: (j['horas'] as num? ?? 0).toDouble(),
      );
}

class RankingApresentador {
  final String apresentadorId;
  final String apresentadorNome;
  final int totalLives;
  final double gmvTotal;

  const RankingApresentador({
    required this.apresentadorId,
    required this.apresentadorNome,
    required this.totalLives,
    required this.gmvTotal,
  });

  factory RankingApresentador.fromJson(Map<String, dynamic> j) => RankingApresentador(
        apresentadorId: j['apresentador_id'] as String,
        apresentadorNome: j['apresentador_nome'] as String,
        totalLives: (j['total_lives'] as num? ?? 0).toInt(),
        gmvTotal: (j['gmv_total'] as num? ?? 0).toDouble(),
      );
}

// ─────────────────────────────────────────
// Aggregator
// ─────────────────────────────────────────

class AnalyticsDashboardData {
  final KpiResumo kpis;
  final List<FaturamentoMensal> faturamentoMensal;
  final List<VendasMensal> vendasMensal;
  final List<HorasLiveDia> horasLivePorDia;
  final List<RankingApresentador> rankingApresentadores;
  final List<PeakHour> peakHours;
  final List<HeatmapCell> heatmapConversao;

  const AnalyticsDashboardData({
    required this.kpis,
    required this.faturamentoMensal,
    required this.vendasMensal,
    required this.horasLivePorDia,
    required this.rankingApresentadores,
    this.peakHours = const [],
    this.heatmapConversao = const [],
  });

  factory AnalyticsDashboardData.fromJson(Map<String, dynamic> j) =>
      AnalyticsDashboardData(
        kpis: KpiResumo.fromJson(
          Map<String, dynamic>.from(j['kpis'] as Map? ?? const {}),
        ),
        faturamentoMensal: (j['faturamento_mensal'] as List? ?? const [])
            .map((e) => FaturamentoMensal.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList(),
        vendasMensal: (j['vendas_mensal'] as List? ?? const [])
            .map((e) => VendasMensal.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList(),
        horasLivePorDia: (j['horas_live_por_dia'] as List? ?? const [])
            .map((e) => HorasLiveDia.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList(),
        rankingApresentadores: (j['ranking_apresentadores'] as List? ?? const [])
            .map((e) => RankingApresentador.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList(),
        peakHours: (j['peak_hours'] as List? ?? const [])
            .map((e) => PeakHour.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList(),
        heatmapConversao: (j['heatmap_conversao'] as List? ?? const [])
            .map((e) => HeatmapCell.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList(),
      );
}
