class ExcelenciaData {
  final int ativos;
  final int cancelados;
  final int taxaRetencao;
  final double fatMesAtual;
  final double fatMesAnterior;
  final int crescimentoPct;
  final int score;

  const ExcelenciaData({
    required this.ativos,
    required this.cancelados,
    required this.taxaRetencao,
    required this.fatMesAtual,
    required this.fatMesAnterior,
    required this.crescimentoPct,
    required this.score,
  });

  factory ExcelenciaData.fromJson(Map<String, dynamic> j) => ExcelenciaData(
    ativos:         (j['ativos'] as num? ?? 0).toInt(),
    cancelados:     (j['cancelados'] as num? ?? 0).toInt(),
    taxaRetencao:   (j['taxa_retencao'] as num? ?? 0).toInt(),
    fatMesAtual:    double.tryParse(j['fat_mes_atual']?.toString() ?? '') ?? 0.0,
    fatMesAnterior: double.tryParse(j['fat_mes_anterior']?.toString() ?? '') ?? 0.0,
    crescimentoPct: (j['crescimento_pct'] as num? ?? 0).toInt(),
    score:          (j['score'] as num? ?? 0).toInt(),
  );
}
