class Cabine {
  final String id;
  final int numero;
  final String
      status; // 'ao_vivo' | 'ativa' | 'reservada' | 'disponivel' | 'manutencao'
  final String? liveAtualId;
  final String? contratoId;
  final String? clienteId;
  final String? apresentadorNome;
  final String? clienteNome;
  final int viewerCount;
  final double gmvAtual;
  final DateTime? iniciadoEm;
  final String? nome;
  final String? dimensoes;
  final String? cor;
  final String? descricao;
  final String? tiktokUsername;
  final int likesCount;
  final int commentsCount;
  final int sharesCount;
  final int giftsDiamonds;
  final int totalOrders;
  final double horasContratadas;
  final double horasRealizadasHoje;
  final List<String> apresentadoresExtra;

  const Cabine({
    required this.id,
    required this.numero,
    required this.status,
    this.liveAtualId,
    this.contratoId,
    this.clienteId,
    this.apresentadorNome,
    this.clienteNome,
    this.viewerCount = 0,
    this.gmvAtual = 0,
    this.iniciadoEm,
    this.nome,
    this.dimensoes,
    this.cor,
    this.descricao,
    this.tiktokUsername,
    this.likesCount = 0,
    this.commentsCount = 0,
    this.sharesCount = 0,
    this.giftsDiamonds = 0,
    this.totalOrders = 0,
    this.horasContratadas = 0,
    this.horasRealizadasHoje = 0,
    this.apresentadoresExtra = const [],
  });

  factory Cabine.fromJson(Map<String, dynamic> j) => Cabine(
        id: j['id'] as String,
        numero: j['numero'] as int,
        status: j['status'] as String,
        liveAtualId: j['live_atual_id'] as String?,
        contratoId: j['contrato_id'] as String?,
        clienteId: j['cliente_id'] as String?,
        apresentadorNome: j['apresentador_nome'] as String?,
        clienteNome: j['cliente_nome'] as String?,
        viewerCount: j['viewer_count'] == null
            ? 0
            : int.tryParse(j['viewer_count'].toString()) ?? 0,
        gmvAtual: j['gmv_atual'] == null
            ? 0.0
            : double.tryParse(j['gmv_atual'].toString()) ?? 0.0,
        iniciadoEm: j['iniciado_em'] != null
            ? DateTime.parse(j['iniciado_em'] as String)
            : null,
        nome: j['nome'] as String?,
        dimensoes: (j['dimensoes'] ?? j['tamanho']) as String?,
        cor: j['cor'] as String?,
        descricao: j['descricao'] as String?,
        tiktokUsername: j['tiktok_username'] as String?,
        likesCount: (j['likes_count'] as num? ?? 0).toInt(),
        commentsCount: (j['comments_count'] as num? ?? 0).toInt(),
        sharesCount: (j['shares_count'] as num? ?? 0).toInt(),
        giftsDiamonds: (j['gifts_diamonds'] as num? ?? 0).toInt(),
        totalOrders: (j['total_orders'] as num? ?? 0).toInt(),
        horasContratadas: (j['horas_contratadas'] as num? ?? 0).toDouble(),
        horasRealizadasHoje: (j['horas_realizadas_hoje'] as num? ?? 0).toDouble(),
        apresentadoresExtra: (j['apresentadores_extra'] as List<dynamic>? ?? []).cast<String>(),
      );

  Map<String, dynamic> toCardMap() => {
        'numero': numero,
        'status': status,
        'contrato_id': contratoId,
        'cliente_id': clienteId,
        'apresentador': apresentadorNome,
        'cliente': clienteNome,
        'viewer_count': viewerCount,
        'gmv_atual': gmvAtual,
        'horario': iniciadoEm?.toLocal().toString().substring(11, 16),
        'tempo': iniciadoEm != null
            ? _duracao(DateTime.now().difference(iniciadoEm!))
            : null,
      };

  static String _duracao(Duration d) {
    final h = d.inHours;
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    return h > 0 ? '${h}h${m}m' : '${d.inMinutes}min';
  }
}
