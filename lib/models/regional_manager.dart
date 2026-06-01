/// Modelo do papel `gerente_regional` (Tier 4, multi-tenant) — supervisor
/// que tem acesso a um subset de unidades configurado em
/// `user_tenant_access` no backend.
class RegionalManagerTenantRef {
  final String id;
  final String nome;

  const RegionalManagerTenantRef({required this.id, required this.nome});

  factory RegionalManagerTenantRef.fromJson(Map<String, dynamic> j) =>
      RegionalManagerTenantRef(
        id: j['id'] as String,
        nome: j['nome'] as String,
      );
}

class RegionalManager {
  final String id;
  final String nome;
  final String email;
  final bool ativo;
  final String? createdAt;
  final List<RegionalManagerTenantRef> tenants;
  final int tenantsCount;

  const RegionalManager({
    required this.id,
    required this.nome,
    required this.email,
    required this.ativo,
    this.createdAt,
    required this.tenants,
    required this.tenantsCount,
  });

  factory RegionalManager.fromJson(Map<String, dynamic> j) {
    final tenantsRaw = (j['tenants'] as List?) ?? const [];
    final tenants = tenantsRaw
        .map((t) => RegionalManagerTenantRef.fromJson(t as Map<String, dynamic>))
        .toList();
    return RegionalManager(
      id: j['id'] as String,
      nome: (j['nome'] as String?) ?? '',
      email: (j['email'] as String?) ?? '',
      ativo: j['ativo'] as bool? ?? true,
      createdAt: (j['created_at'] ?? j['criado_em']) as String?,
      tenants: tenants,
      tenantsCount: (j['tenants_count'] as num? ?? tenants.length).toInt(),
    );
  }
}
