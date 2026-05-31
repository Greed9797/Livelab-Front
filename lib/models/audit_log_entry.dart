/// DTO para um registro do audit_log.
///
/// Backend: GET /v1/audit-log → { itens: [...], total, pagina, por_pagina }
class AuditLogEntry {
  final String id;
  final String? tenantId;
  final String? userId;
  final String action;
  final String? entityType;
  final String? entityId;
  final Map<String, dynamic> metadata;
  final String? ip;
  final String? userAgent;
  final DateTime criadoEm;
  final String? autorNome;
  final String? autorEmail;
  final String? autorPapel;

  const AuditLogEntry({
    required this.id,
    required this.action,
    required this.metadata,
    required this.criadoEm,
    this.tenantId,
    this.userId,
    this.entityType,
    this.entityId,
    this.ip,
    this.userAgent,
    this.autorNome,
    this.autorEmail,
    this.autorPapel,
  });

  factory AuditLogEntry.fromJson(Map<String, dynamic> json) {
    final rawMeta = json['metadata'];
    Map<String, dynamic> meta;
    if (rawMeta is Map) {
      meta = Map<String, dynamic>.from(rawMeta);
    } else {
      meta = const {};
    }

    return AuditLogEntry(
      id: json['id'] as String,
      tenantId: json['tenant_id'] as String?,
      userId: json['user_id'] as String?,
      action: (json['action'] as String?) ?? '',
      entityType: json['entity_type'] as String?,
      entityId: json['entity_id'] as String?,
      metadata: meta,
      ip: json['ip'] as String?,
      userAgent: json['user_agent'] as String?,
      criadoEm: DateTime.parse(json['criado_em'] as String).toLocal(),
      autorNome: json['autor_nome'] as String?,
      autorEmail: json['autor_email'] as String?,
      autorPapel: json['autor_papel'] as String?,
    );
  }
}

class AuditLogPage {
  final List<AuditLogEntry> itens;
  final int total;
  final int pagina;
  final int porPagina;

  const AuditLogPage({
    required this.itens,
    required this.total,
    required this.pagina,
    required this.porPagina,
  });

  factory AuditLogPage.fromJson(Map<String, dynamic> json) {
    final rawItens = (json['itens'] as List?) ?? const [];
    return AuditLogPage(
      itens: rawItens
          .whereType<Map>()
          .map((e) => AuditLogEntry.fromJson(Map<String, dynamic>.from(e)))
          .toList(growable: false),
      total: (json['total'] as num? ?? 0).toInt(),
      pagina: (json['pagina'] as num? ?? 1).toInt(),
      porPagina: (json['por_pagina'] as num? ?? 50).toInt(),
    );
  }

  int get totalPaginas {
    if (porPagina <= 0) return 1;
    final total = (this.total / porPagina).ceil();
    return total < 1 ? 1 : total;
  }
}
