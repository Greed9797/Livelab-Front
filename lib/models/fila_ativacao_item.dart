class FilaAtivacaoItem {
  final String id;
  final String clienteId;
  final String clienteNome;
  final String? cidade;
  final String? estado;
  final double valorFixo;
  final double comissaoPct;
  final DateTime? ativadoEm;
  final DateTime? criadoEm;

  const FilaAtivacaoItem({
    required this.id,
    required this.clienteId,
    required this.clienteNome,
    this.cidade,
    this.estado,
    required this.valorFixo,
    required this.comissaoPct,
    this.ativadoEm,
    this.criadoEm,
  });

  factory FilaAtivacaoItem.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(dynamic value) {
      if (value is String && value.isNotEmpty) {
        return DateTime.tryParse(value);
      }
      return null;
    }

    return FilaAtivacaoItem(
      id: json['id'] as String,
      clienteId: json['cliente_id'] as String,
      clienteNome: json['cliente_nome'] as String,
      cidade: json['cidade'] as String?,
      estado: json['estado'] as String?,
      valorFixo: json['valor_fixo'] == null
          ? 0.0
          : double.tryParse(json['valor_fixo'].toString()) ?? 0.0,
      comissaoPct: json['comissao_pct'] == null
          ? 0.0
          : double.tryParse(json['comissao_pct'].toString()) ?? 0.0,
      ativadoEm: parseDate(json['ativado_em']),
      criadoEm: parseDate(json['criado_em']),
    );
  }

  String get localizacao {
    final parts = [
      if (cidade != null && cidade!.isNotEmpty) cidade,
      if (estado != null && estado!.isNotEmpty) estado
    ];
    return parts.isEmpty ? 'Sem localização informada' : parts.join(' • ');
  }
}
