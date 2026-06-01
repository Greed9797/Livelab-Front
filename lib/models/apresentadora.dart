class Apresentadora {
  final String id;
  final String nome;
  final String? telefone;
  final String? cargo;
  final String? email;
  final String? cpfCnpj;
  final String? cidade;
  final bool ativo;
  final double fixo;
  final double comissaoPct;
  final double metaDiariaGmv;
  final String? observacoes;
  final String? linkContrato;
  final String? dataAniversario;
  final String? dataInicio;
  final String? dataFim;
  final int totalLives;
  final double totalHoras;
  final double totalFaturamento;

  const Apresentadora({
    required this.id,
    required this.nome,
    this.telefone,
    this.cargo,
    this.email,
    this.cpfCnpj,
    this.cidade,
    required this.ativo,
    required this.fixo,
    required this.comissaoPct,
    required this.metaDiariaGmv,
    this.observacoes,
    this.linkContrato,
    this.dataAniversario,
    this.dataInicio,
    this.dataFim,
    this.totalLives = 0,
    this.totalHoras = 0.0,
    this.totalFaturamento = 0.0,
  });

  factory Apresentadora.fromJson(Map<String, dynamic> json) => Apresentadora(
        id: json['id'] as String,
        nome: json['nome'] as String,
        telefone: json['telefone'] as String?,
        cargo: json['cargo'] as String?,
        email: json['email'] as String?,
        cpfCnpj: json['cpf_cnpj'] as String?,
        cidade: json['cidade'] as String?,
        ativo: json['ativo'] as bool? ?? true,
        fixo: _toDouble(json['fixo']),
        comissaoPct: _toDouble(json['comissao_pct']),
        metaDiariaGmv: _toDouble(json['meta_diaria_gmv']),
        observacoes: json['observacoes'] as String?,
        linkContrato: json['link_contrato'] as String?,
        dataAniversario: json['data_aniversario'] as String?,
        dataInicio: json['data_inicio'] as String?,
        dataFim: json['data_fim'] as String?,
        totalLives: (json['total_lives'] as num? ?? 0).toInt(),
        totalHoras: _toDouble(json['total_horas']),
        totalFaturamento: _toDouble(json['total_faturamento']),
      );

  static double _toDouble(Object? value) =>
      double.tryParse(value?.toString() ?? '') ?? 0;
}
