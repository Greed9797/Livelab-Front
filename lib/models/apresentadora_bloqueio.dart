/// Bloqueio pontual (ex: férias, atestado).
/// Datas vêm do backend como ISO 8601 timestamptz.
class ApresentadoraBloqueio {
  final String id;
  final DateTime dataInicio;
  final DateTime dataFim;
  final String? motivo;
  final DateTime? criadoEm;

  const ApresentadoraBloqueio({
    required this.id,
    required this.dataInicio,
    required this.dataFim,
    this.motivo,
    this.criadoEm,
  });

  factory ApresentadoraBloqueio.fromJson(Map<String, dynamic> json) =>
      ApresentadoraBloqueio(
        id: json['id'] as String,
        dataInicio: DateTime.parse(json['data_inicio'] as String).toLocal(),
        dataFim: DateTime.parse(json['data_fim'] as String).toLocal(),
        motivo: json['motivo'] as String?,
        criadoEm: json['criado_em'] != null
            ? DateTime.parse(json['criado_em'] as String).toLocal()
            : null,
      );

  Map<String, dynamic> toJson() => {
        'data_inicio': dataInicio.toUtc().toIso8601String(),
        'data_fim': dataFim.toUtc().toIso8601String(),
        if (motivo != null) 'motivo': motivo,
      };
}

/// Live agendada (ou em andamento) do payload de disponibilidade.
class LiveAgendadaResumo {
  final String id;
  final DateTime dataInicio;
  final DateTime? dataFim;
  final String status;
  final String? cabineId;

  const LiveAgendadaResumo({
    required this.id,
    required this.dataInicio,
    this.dataFim,
    required this.status,
    this.cabineId,
  });

  factory LiveAgendadaResumo.fromJson(Map<String, dynamic> json) =>
      LiveAgendadaResumo(
        id: json['id'] as String,
        dataInicio: DateTime.parse(json['data_inicio'] as String).toLocal(),
        dataFim: json['data_fim'] != null
            ? DateTime.parse(json['data_fim'] as String).toLocal()
            : null,
        status: json['status'] as String? ?? 'em_andamento',
        cabineId: json['cabine_id'] as String?,
      );
}
