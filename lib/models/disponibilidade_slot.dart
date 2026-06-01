/// Slot semanal recorrente de disponibilidade.
/// dia_semana: 0=domingo … 6=sábado (compatível com PostgreSQL EXTRACT(DOW)).
class DisponibilidadeSlot {
  final String? id;
  final int diaSemana;
  final String horaInicio; // "HH:MM" ou "HH:MM:SS" — transportar como string
  final String horaFim;

  const DisponibilidadeSlot({
    this.id,
    required this.diaSemana,
    required this.horaInicio,
    required this.horaFim,
  });

  factory DisponibilidadeSlot.fromJson(Map<String, dynamic> json) =>
      DisponibilidadeSlot(
        id: json['id'] as String?,
        diaSemana: (json['dia_semana'] as num).toInt(),
        horaInicio: _trimSeconds(json['hora_inicio'] as String),
        horaFim: _trimSeconds(json['hora_fim'] as String),
      );

  Map<String, dynamic> toJson() => {
        'dia_semana': diaSemana,
        'hora_inicio': horaInicio,
        'hora_fim': horaFim,
      };

  /// Backend devolve "08:00:00" — preferimos "08:00" pra UI.
  static String _trimSeconds(String t) {
    if (t.length >= 5) return t.substring(0, 5);
    return t;
  }

  static const List<String> diasSemanaShort = [
    'Dom',
    'Seg',
    'Ter',
    'Qua',
    'Qui',
    'Sex',
    'Sáb',
  ];

  static const List<String> diasSemanaLong = [
    'Domingo',
    'Segunda',
    'Terça',
    'Quarta',
    'Quinta',
    'Sexta',
    'Sábado',
  ];
}
