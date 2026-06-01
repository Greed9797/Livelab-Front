/// Item do ranking cross-tenant — `GET /v1/master/ranking?periodo=YYYY-MM`.
class MasterRanking {
  final int posicao;
  final String tenantId;
  final String tenantNome;
  final double gmvMes;
  final double gmvMesAnterior;
  final double crescimentoPct;
  final int totalLives;
  final int totalClientesAtivos;
  final double taxaRetencao;

  const MasterRanking({
    required this.posicao,
    required this.tenantId,
    required this.tenantNome,
    required this.gmvMes,
    required this.gmvMesAnterior,
    required this.crescimentoPct,
    required this.totalLives,
    required this.totalClientesAtivos,
    required this.taxaRetencao,
  });

  static double _toDouble(dynamic v) {
    if (v is num) return v.toDouble();
    return double.tryParse(v?.toString() ?? '') ?? 0;
  }

  static int _toInt(dynamic v) {
    if (v is int) return v;
    return int.tryParse(v?.toString() ?? '') ?? 0;
  }

  factory MasterRanking.fromJson(Map<String, dynamic> json) {
    return MasterRanking(
      posicao: _toInt(json['posicao']),
      tenantId: (json['tenant_id'] ?? '').toString(),
      tenantNome: (json['tenant_nome'] ?? '').toString(),
      gmvMes: _toDouble(json['gmv_mes']),
      gmvMesAnterior: _toDouble(json['gmv_mes_anterior']),
      crescimentoPct: _toDouble(json['crescimento_pct']),
      totalLives: _toInt(json['total_lives']),
      totalClientesAtivos: _toInt(json['total_clientes_ativos']),
      taxaRetencao: _toDouble(json['taxa_retencao']),
    );
  }
}
