class Pacote {
  final String id;
  final String nome;
  final String? descricao;
  final double valor;
  final double horasIncluidas;
  final double comissaoPct;
  final bool ativo;

  const Pacote({
    required this.id,
    required this.nome,
    this.descricao,
    required this.valor,
    required this.horasIncluidas,
    this.comissaoPct = 0,
    required this.ativo,
  });

  double get valorFixo => valor;

  static double _toDouble(dynamic value) {
    if (value is num) return value.toDouble();
    if (value is String) {
      return double.tryParse(value.replaceAll(',', '.')) ?? 0.0;
    }
    return 0.0;
  }

  factory Pacote.fromJson(Map<String, dynamic> j) => Pacote(
        id: j['id'] as String,
        nome: j['nome'] as String,
        descricao: j['descricao'] as String?,
        valor: _toDouble(j['valor_fixo'] ?? j['valor']),
        horasIncluidas: _toDouble(j['horas_incluidas']),
        comissaoPct: _toDouble(j['comissao_pct']),
        ativo: j['ativo'] as bool? ?? true,
      );

  Map<String, dynamic> toJson() => {
        'nome': nome,
        if (descricao != null) 'descricao': descricao,
        'valor_fixo': valorFixo,
        'valor': valor,
        'comissao_pct': comissaoPct,
        'horas_incluidas': horasIncluidas,
        'ativo': ativo,
      };
}
