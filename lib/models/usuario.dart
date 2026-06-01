class Usuario {
  final String id;
  final String nome;
  final String email;
  final String papel;
  final bool ativo;
  final String? createdAt;
  final String? criadoPor;
  final String? clienteId;
  final String? apresentadoraId;

  const Usuario({
    required this.id,
    required this.nome,
    required this.email,
    required this.papel,
    required this.ativo,
    this.createdAt,
    this.criadoPor,
    this.clienteId,
    this.apresentadoraId,
  });

  factory Usuario.fromJson(Map<String, dynamic> j) => Usuario(
        id: j['id'] as String,
        nome: j['nome'] as String,
        email: j['email'] as String,
        papel: j['papel'] as String,
        ativo: j['ativo'] as bool? ?? true,
        createdAt: (j['criado_em'] ?? j['created_at']) as String?,
        criadoPor: j['criado_por'] as String?,
        clienteId: j['cliente_id'] as String?,
        apresentadoraId: j['apresentadora_id'] as String?,
      );
}
