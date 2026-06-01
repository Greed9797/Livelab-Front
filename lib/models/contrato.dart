class Contrato {
  final String id;
  final String clienteId;
  final String status;
  final double valorFixo;
  final double comissaoPct;
  final bool deRisco;
  final bool isRiscoFranqueado;
  final bool autoAprovado;
  final bool auditoriaPostFactum;
  final DateTime? assinadoEm;
  final DateTime? ativadoEm;
  final DateTime? reviewedAt;
  final DateTime? prazoDecisaoAte;
  final String? signatureImageUrl;
  final String? signedIp;
  final DateTime? acceptedTermsAt;
  // Para a tela de Análise de Crédito (campos do JOIN com clientes)
  final String? clienteNome;
  final String? clienteCnpj;
  final double? clienteFatAnual;
  final String? clienteNicho;
  final int? clienteScore;
  final String? franqueadoNome;
  final String? pendenciaMotivo;
  final String? reprovacaoMotivo;
  final int? tempoEmEsperaHoras;
  final double? excelenciaWeight;
  // Pacote / horas
  final String? pacoteId;
  final double horasContratadas;
  final double horasConsumidas;
  double get horasRestantes => horasContratadas - horasConsumidas;
  // W3-A: @ TikTok do contrato — quando null, connector cai no @ do cliente.
  final String? tiktokUsername;

  const Contrato({
    required this.id,
    required this.clienteId,
    required this.status,
    required this.valorFixo,
    required this.comissaoPct,
    required this.deRisco,
    this.isRiscoFranqueado = false,
    this.autoAprovado = false,
    this.auditoriaPostFactum = false,
    this.assinadoEm,
    this.ativadoEm,
    this.reviewedAt,
    this.prazoDecisaoAte,
    this.signatureImageUrl,
    this.signedIp,
    this.acceptedTermsAt,
    this.clienteNome,
    this.clienteCnpj,
    this.clienteFatAnual,
    this.clienteNicho,
    this.clienteScore,
    this.franqueadoNome,
    this.pendenciaMotivo,
    this.reprovacaoMotivo,
    this.tempoEmEsperaHoras,
    this.excelenciaWeight,
    this.pacoteId,
    this.horasContratadas = 0,
    this.horasConsumidas = 0,
    this.tiktokUsername,
  });

  factory Contrato.fromJson(Map<String, dynamic> j) => Contrato(
        id: (j['contrato_id'] ?? j['id']) as String,
        clienteId: (j['cliente_id'] ?? j['cliente']?['id'] ?? '') as String,
        status: j['status'] as String,
        valorFixo: double.tryParse(j['valor_fixo']?.toString() ?? '') ?? 0.0,
        comissaoPct: double.tryParse(j['comissao_pct']?.toString() ?? '') ?? 0.0,
        deRisco: j['de_risco'] as bool? ?? false,
        isRiscoFranqueado: j['is_risco_franqueado'] as bool? ?? false,
        autoAprovado: j['auto_aprovado'] as bool? ?? false,
        auditoriaPostFactum: j['auditoria_post_factum'] as bool? ?? false,
        assinadoEm: j['assinado_em'] != null
            ? DateTime.parse(j['assinado_em'] as String)
            : null,
        ativadoEm: j['ativado_em'] != null
            ? DateTime.parse(j['ativado_em'] as String)
            : null,
        reviewedAt: j['reviewed_at'] != null
            ? DateTime.parse(j['reviewed_at'] as String)
            : null,
        prazoDecisaoAte: j['prazo_decisao_ate'] != null
            ? DateTime.parse(j['prazo_decisao_ate'] as String)
            : null,
        signatureImageUrl: j['signature_image_url'] as String?,
        signedIp: j['signed_ip'] as String?,
        acceptedTermsAt: j['accepted_terms_at'] != null
            ? DateTime.parse(j['accepted_terms_at'] as String)
            : null,
        clienteNome: (j['cliente_nome'] ?? j['nome'] ?? j['cliente']?['nome'])
            as String?,
        clienteCnpj: (j['cliente_cnpj'] ?? j['cnpj'] ?? j['cliente']?['cnpj'])
            as String?,
        clienteFatAnual: double.tryParse(
          (j['cliente_fat_anual'] ?? j['fat_anual'] ?? j['cliente']?['fat_anual'])?.toString() ?? '',
        ),
        clienteNicho: (j['cliente_nicho'] ??
            j['nicho'] ??
            j['cliente']?['nicho']) as String?,
        clienteScore: ((j['cliente_score'] ??
                j['score'] ??
                j['cliente']?['score']) as num?)
            ?.toInt(),
        franqueadoNome:
            (j['franqueado_nome'] ?? j['franqueado']?['nome']) as String?,
        pendenciaMotivo: j['pendencia_motivo'] as String?,
        reprovacaoMotivo: j['reprovacao_motivo'] as String?,
        tempoEmEsperaHoras:
            ((j['tempo_em_espera_horas'] ?? j['tempo_espera']) as num?)
                ?.toInt(),
        excelenciaWeight: ((j['excelencia_weight']) as num?)?.toDouble(),
        pacoteId: j['pacote_id'] as String?,
        horasContratadas:
            (j['horas_contratadas'] as num? ?? 0).toDouble(),
        horasConsumidas:
            (j['horas_consumidas'] as num? ?? 0).toDouble(),
        tiktokUsername: j['tiktok_username'] as String?,
      );
}
