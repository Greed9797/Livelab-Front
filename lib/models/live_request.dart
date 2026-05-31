class LiveRequest {
  final String id;
  final String dataSolicitada; // "YYYY-MM-DD"
  final String horaInicio;     // "HH:MM:SS" — use horaInicioDisplay for "HH:MM"
  final String horaFim;
  final String? observacao;
  final String status;         // pendente | aprovada | recusada
  final String? motivoRecusa;
  final String criadoEm;

  const LiveRequest({
    required this.id,
    required this.dataSolicitada,
    required this.horaInicio,
    required this.horaFim,
    this.observacao,
    required this.status,
    this.motivoRecusa,
    required this.criadoEm,
  });

  factory LiveRequest.fromJson(Map<String, dynamic> j) => LiveRequest(
        id:              j['id'] as String,
        dataSolicitada:  j['data_solicitada'] as String,
        horaInicio:      j['hora_inicio'] as String,
        horaFim:         j['hora_fim'] as String,
        observacao:      j['observacao'] as String?,
        status:          j['status'] as String,
        motivoRecusa:    j['motivo_recusa'] as String?,
        criadoEm:        j['criado_em'] as String,
      );

  /// Exibe apenas "HH:MM" (sem segundos), independente de como o banco retornou
  String get horaInicioDisplay =>
      horaInicio.length >= 5 ? horaInicio.substring(0, 5) : horaInicio;
  String get horaFimDisplay =>
      horaFim.length >= 5 ? horaFim.substring(0, 5) : horaFim;
}
