# lib/providers/audit_log_provider.dart

- AuditLogFiltros · class · L8-L43 — class AuditLogFiltros
- copyWith · method · L25-L42 — AuditLogFiltros copyWith(
- _sentinel · constant · L45-L45 — const _sentinel = Object();
- auditLogFiltrosProvider · constant · L48-L51 — final auditLogFiltrosProvider =
- AuditLogFiltrosNotifier · class · L53-L80 — class AuditLogFiltrosNotifier extends Notifier<AuditLogFiltros>
- build · method · L55-L55 — AuditLogFiltros build() => const AuditLogFiltros();
- setAction · method · L57-L59 — void setAction(String? value)
- setEntityType · method · L61-L63 — void setEntityType(String? value)
- setUserId · method · L65-L67 — void setUserId(String? value)
- setDesde · method · L69-L71 — void setDesde(DateTime? value)
- setPagina · method · L73-L75 — void setPagina(int value)
- reset · method · L77-L79 — void reset()
- auditLogProvider · constant · L83-L86 — final auditLogProvider =
- AuditLogNotifier · class · L88-L132 — class AuditLogNotifier extends AsyncNotifier<AuditLogPage>
- build · method · L90-L98 — Future<AuditLogPage> build() async
- _fetch · method · L100-L126 — Future<AuditLogPage> _fetch(AuditLogFiltros f) async
- refresh · method · L128-L131 — Future<void> refresh() async
