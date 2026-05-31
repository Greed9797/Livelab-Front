class Tenant {
  final String id;
  final String nome;
  final bool ativo;
  final String? cnpj;
  final String? telefoneContato;
  final String? emailContato;
  final String? cidade;
  final String? uf;
  final String plano;
  final String? createdAt;
  final String? ownerId;
  final String? ownerNome;
  final String? ownerEmail;
  final int livesMes;
  final double gmvMes;

  const Tenant({
    required this.id,
    required this.nome,
    required this.ativo,
    this.cnpj,
    this.telefoneContato,
    this.emailContato,
    this.cidade,
    this.uf,
    this.plano = 'Standard',
    this.createdAt,
    this.ownerId,
    this.ownerNome,
    this.ownerEmail,
    this.livesMes = 0,
    this.gmvMes = 0,
  });

  factory Tenant.fromJson(Map<String, dynamic> j) => Tenant(
        id: j['id'] as String,
        nome: j['nome'] as String,
        ativo: j['ativo'] as bool? ?? true,
        cnpj: j['cnpj'] as String?,
        telefoneContato: j['telefone_contato'] as String?,
        emailContato: j['email_contato'] as String?,
        cidade: j['cidade'] as String?,
        uf: j['uf'] as String?,
        plano: (j['plano'] as String?) ?? 'Standard',
        createdAt: (j['criado_em'] ?? j['created_at']) as String?,
        ownerId: j['owner_id'] as String?,
        ownerNome: j['owner_nome'] as String?,
        ownerEmail: j['owner_email'] as String?,
        livesMes: (j['lives_mes'] as num? ?? 0).toInt(),
        gmvMes: (j['gmv_mes'] as num? ?? 0).toDouble(),
      );
}
