/// Ponto de série mensal de uma unidade — `GET /v1/master/unidade/:tenantId/historico`.
class MasterHistoricoMes {
  final String mes; // formato 'YYYY-MM'
  final double gmv;
  final int lives;

  const MasterHistoricoMes({
    required this.mes,
    required this.gmv,
    required this.lives,
  });

  static double _toDouble(dynamic v) {
    if (v is num) return v.toDouble();
    return double.tryParse(v?.toString() ?? '') ?? 0;
  }

  static int _toInt(dynamic v) {
    if (v is int) return v;
    return int.tryParse(v?.toString() ?? '') ?? 0;
  }

  factory MasterHistoricoMes.fromJson(Map<String, dynamic> json) {
    return MasterHistoricoMes(
      mes: (json['mes'] ?? '').toString(),
      gmv: _toDouble(json['gmv']),
      lives: _toInt(json['lives']),
    );
  }
}
