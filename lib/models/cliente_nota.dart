enum NotaTipo { nota, ligacao, reuniao, reclamacao, elogio }

NotaTipo _parseTipo(String? raw) {
  switch (raw) {
    case 'ligacao': return NotaTipo.ligacao;
    case 'reuniao': return NotaTipo.reuniao;
    case 'reclamacao': return NotaTipo.reclamacao;
    case 'elogio': return NotaTipo.elogio;
    case 'nota':
    default: return NotaTipo.nota;
  }
}

String tipoToString(NotaTipo t) => t.name;

String tipoLabel(NotaTipo t) {
  switch (t) {
    case NotaTipo.nota: return 'Nota';
    case NotaTipo.ligacao: return 'Ligação';
    case NotaTipo.reuniao: return 'Reunião';
    case NotaTipo.reclamacao: return 'Reclamação';
    case NotaTipo.elogio: return 'Elogio';
  }
}

class ClienteNota {
  final String id;
  final String clienteId;
  final String autorId;
  final String autorNome;
  final String texto;
  final NotaTipo tipo;
  final DateTime criadoEm;
  final DateTime? editadoEm;

  const ClienteNota({
    required this.id,
    required this.clienteId,
    required this.autorId,
    required this.autorNome,
    required this.texto,
    required this.tipo,
    required this.criadoEm,
    this.editadoEm,
  });

  factory ClienteNota.fromJson(Map<String, dynamic> j) => ClienteNota(
        id: j['id'] as String,
        clienteId: j['cliente_id'] as String,
        autorId: j['autor_id'] as String,
        autorNome: (j['autor_nome'] as String?) ?? 'Usuário',
        texto: j['texto'] as String,
        tipo: _parseTipo(j['tipo'] as String?),
        criadoEm: DateTime.parse(j['criado_em'] as String),
        editadoEm: j['editado_em'] != null
            ? DateTime.tryParse(j['editado_em'] as String)
            : null,
      );
}
