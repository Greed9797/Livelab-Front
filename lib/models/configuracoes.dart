class ContactHistoryEntry {
  final String campo;
  final String? valorAnterior;
  final String? valorNovo;
  final String alteradoEm;
  final String? alteradoPorNome;

  const ContactHistoryEntry({
    required this.campo,
    this.valorAnterior,
    this.valorNovo,
    required this.alteradoEm,
    this.alteradoPorNome,
  });

  factory ContactHistoryEntry.fromJson(Map<String, dynamic> j) =>
      ContactHistoryEntry(
        campo: j['campo'] as String,
        valorAnterior: j['valor_anterior'] as String?,
        valorNovo: j['valor_novo'] as String?,
        alteradoEm: j['alterado_em'] as String,
        alteradoPorNome: j['alterado_por_nome'] as String?,
      );
}

class ConfiguracoesFranquia {
  final String id;
  final String nome;
  final String? apelido;
  final String? logoUrl;
  final String? telefoneContato;
  final String? emailContato;
  final String? asaasApiKeyHidden;
  final bool hasAsaas;
  final String? asaasWalletId;
  final bool hasTiktok;
  final String? tiktokShopId;
  final double metaDiariaGmv;
  final List<ContactHistoryEntry> contactHistory;

  const ConfiguracoesFranquia({
    required this.id,
    required this.nome,
    this.apelido,
    this.logoUrl,
    this.telefoneContato,
    this.emailContato,
    this.asaasApiKeyHidden,
    required this.hasAsaas,
    this.asaasWalletId,
    required this.hasTiktok,
    this.tiktokShopId,
    this.metaDiariaGmv = 10000,
    this.contactHistory = const [],
  });

  String get nomeExibicao => apelido?.isNotEmpty == true ? apelido! : nome;

  factory ConfiguracoesFranquia.fromJson(Map<String, dynamic> j) =>
      ConfiguracoesFranquia(
        id: j['id'] as String,
        nome: j['nome'] as String,
        apelido: j['apelido'] as String?,
        logoUrl: j['logo_url'] as String?,
        telefoneContato: j['telefone_contato'] as String?,
        emailContato: j['email_contato'] as String?,
        asaasApiKeyHidden: j['asaas_api_key_hidden'] as String?,
        hasAsaas: (j['has_asaas'] as bool?) ?? false,
        asaasWalletId: j['asaas_wallet_id'] as String?,
        hasTiktok: (j['has_tiktok'] as bool?) ?? false,
        tiktokShopId: j['tiktok_shop_id'] as String?,
        metaDiariaGmv: (j['meta_diaria_gmv'] as num?)?.toDouble() ?? 10000,
        contactHistory: (j['contact_history'] as List<dynamic>?)
                ?.map((e) =>
                    ContactHistoryEntry.fromJson(e as Map<String, dynamic>))
                .toList() ??
            const [],
      );
}
