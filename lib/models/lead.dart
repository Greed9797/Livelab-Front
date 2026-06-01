class Lead {
  final String id;
  final String nome;
  final String? nicho;
  final String? cidade;
  final String? estado;
  final double? lat;
  final double? lng;
  final double fatEstimado;
  final String status;
  final String? pegoPor;
  final DateTime? pegoEm;
  final DateTime? expiraEm;
  final DateTime criadoEm;
  final bool isNovo;
  final String crmEtapa;
  final double valorOportunidade;
  final String? responsavelNome;
  final String? origem;
  final List<Map<String, dynamic>> historicoContatos;
  final String? observacoesInternas;
  final List<Map<String, dynamic>> tarefas;
  final String? motivoPerda;
  final String? convertidoClienteId;
  final DateTime? ganhoEm;
  final DateTime? atualizadoEm;
  final String? contatoEmail;
  final String? contatoWhatsapp;
  final Map<String, dynamic>? payloadExterno;
  final Map<String, dynamic> dadosExtras;

  const Lead({
    required this.id,
    required this.nome,
    this.nicho,
    this.cidade,
    this.estado,
    this.lat,
    this.lng,
    required this.fatEstimado,
    required this.status,
    this.pegoPor,
    this.pegoEm,
    this.expiraEm,
    required this.criadoEm,
    required this.isNovo,
    this.crmEtapa = 'lead_novo',
    this.valorOportunidade = 0,
    this.responsavelNome,
    this.origem,
    this.historicoContatos = const [],
    this.observacoesInternas,
    this.tarefas = const [],
    this.motivoPerda,
    this.convertidoClienteId,
    this.ganhoEm,
    this.atualizadoEm,
    this.contatoEmail,
    this.contatoWhatsapp,
    this.payloadExterno,
    this.dadosExtras = const {},
  });

  static double _toDouble(dynamic value) {
    if (value is num) return value.toDouble();
    if (value is String) {
      return double.tryParse(value.replaceAll(',', '.')) ?? 0;
    }
    return 0;
  }

  static List<Map<String, dynamic>> _toMapList(dynamic value) {
    if (value is List) {
      return value
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    }
    return const [];
  }

  static DateTime? _toDate(dynamic value) {
    if (value is String && value.isNotEmpty) return DateTime.tryParse(value);
    return null;
  }

  factory Lead.fromJson(Map<String, dynamic> j) => Lead(
        id: j['id'] as String,
        nome: j['nome'] as String,
        nicho: j['nicho'] as String?,
        cidade: j['cidade'] as String?,
        estado: j['estado'] as String?,
        lat: _toDouble(j['lat']),
        lng: _toDouble(j['lng']),
        fatEstimado: _toDouble(j['fat_estimado']),
        status: j['status'] as String? ?? 'disponivel',
        pegoPor: j['pego_por'] as String?,
        pegoEm: _toDate(j['pego_em']),
        expiraEm: _toDate(j['expira_em']),
        criadoEm: DateTime.parse(j['criado_em'] as String),
        isNovo: j['is_novo'] as bool? ?? false,
        crmEtapa: j['crm_etapa'] as String? ?? 'lead_novo',
        valorOportunidade:
            _toDouble(j['valor_oportunidade'] ?? j['fat_estimado']),
        responsavelNome: j['responsavel_nome'] as String?,
        origem: j['origem'] as String?,
        historicoContatos: _toMapList(j['historico_contatos']),
        observacoesInternas: j['observacoes_internas'] as String?,
        tarefas: _toMapList(j['tarefas']),
        motivoPerda: j['motivo_perda'] as String?,
        convertidoClienteId: j['convertido_cliente_id'] as String?,
        ganhoEm: _toDate(j['ganho_em']),
        atualizadoEm: _toDate(j['atualizado_em']),
        contatoEmail: j['contato_email'] as String?,
        contatoWhatsapp: j['contato_whatsapp'] as String?,
        payloadExterno: j['payload_externo'] is Map
            ? Map<String, dynamic>.from(j['payload_externo'] as Map)
            : null,
        dadosExtras: j['dados_extras'] is Map
            ? Map<String, dynamic>.from(j['dados_extras'] as Map)
            : const {},
      );

  Duration? get tempoRestante => expiraEm?.difference(DateTime.now());
}
