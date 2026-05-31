class Cliente {
  final String id;
  final String nome;
  final String celular;
  final String? email;
  final String status;
  final double? lat;
  final double? lng;
  final double fatAnual;
  final String? nicho;
  final int score;
  final String? cep;
  final String? cidade;
  final String? estado;
  final String? siga;
  final double metaDiariaGmv;
  // Horas do contrato ativo (null = sem contrato com horas)
  final double? horasContratadas;
  final double? horasRestantes;
  final String? tiktokUsername;
  // Métricas mensais calculadas pelo backend
  final double gmvMes;
  final int totalLivesMes;
  final List<String> apresentadorasNomes;

  const Cliente({
    required this.id,
    required this.nome,
    required this.celular,
    this.email,
    required this.status,
    this.lat,
    this.lng,
    required this.fatAnual,
    this.nicho,
    required this.score,
    this.cep,
    this.cidade,
    this.estado,
    this.siga,
    this.metaDiariaGmv = 0,
    this.horasContratadas,
    this.horasRestantes,
    this.tiktokUsername,
    this.gmvMes = 0,
    this.totalLivesMes = 0,
    this.apresentadorasNomes = const [],
  });

  factory Cliente.fromJson(Map<String, dynamic> j) {
    List<String> nomes = const [];
    final raw = j['apresentadoras_nomes'];
    if (raw is List) {
      nomes = raw.whereType<String>().toList();
    }
    return Cliente(
      id: j['id'] as String,
      nome: j['nome'] as String,
      celular: j['celular'] as String,
      email: j['email'] as String?,
      status: j['status'] as String,
      lat: j['lat'] == null ? null : double.tryParse(j['lat'].toString()),
      lng: j['lng'] == null ? null : double.tryParse(j['lng'].toString()),
      fatAnual: j['fat_anual'] == null
          ? 0.0
          : double.tryParse(j['fat_anual'].toString()) ?? 0.0,
      nicho: j['nicho'] as String?,
      score: j['score'] == null ? 0 : int.tryParse(j['score'].toString()) ?? 0,
      cep: j['cep'] as String?,
      cidade: j['cidade'] as String?,
      estado: j['estado'] as String?,
      siga: j['siga'] as String?,
      metaDiariaGmv: j['meta_diaria_gmv'] == null
          ? 0
          : double.tryParse(j['meta_diaria_gmv'].toString()) ?? 0,
      horasContratadas: j['horas_contratadas'] == null
          ? null
          : double.tryParse(j['horas_contratadas'].toString()),
      horasRestantes: j['horas_restantes'] == null
          ? null
          : double.tryParse(j['horas_restantes'].toString()),
      tiktokUsername: j['tiktok_username'] as String?,
      gmvMes: (j['gmv_mes'] as num? ?? 0).toDouble(),
      totalLivesMes: (j['total_lives_mes'] as num? ?? 0).toInt(),
      apresentadorasNomes: nomes,
    );
  }
}
