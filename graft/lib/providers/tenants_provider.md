# lib/providers/tenants_provider.dart

- TenantsNotifier · class · L5-L68 — class TenantsNotifier extends AsyncNotifier<List<Tenant>>
- build · method · L7-L9 — Future<List<Tenant>> build() async
- _fetch · method · L11-L16 — Future<List<Tenant>> _fetch() async
- refresh · method · L18-L21 — Future<void> refresh() async
- criarFranquia · method · L24-L30 — Future<Map<String, dynamic>> criarFranquia(Map<String, dynamic> payload) async
- atualizar · method · L32-L39 — Future<Tenant> atualizar(String id, Map<String, dynamic> payload) async
- alternarStatus · method · L41-L49 — Future<void> alternarStatus(String id, bool ativo) async
- _comStatus · method · L51-L67 — Tenant _comStatus(Tenant t, bool ativo) => Tenant(
- tenantsProvider · constant · L70-L71 — final tenantsProvider =
