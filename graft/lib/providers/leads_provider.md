# lib/providers/leads_provider.dart

- _asDouble · function · L6-L11 — double? _asDouble(dynamic v)
- LeadsNotifier · class · L13-L127 — class LeadsNotifier extends AsyncNotifier<List<Lead>>
- build · method · L15-L21 — Future<List<Lead>> build() async
- _fetch · method · L23-L28 — Future<List<Lead>> _fetch() async
- refresh · method · L30-L33 — Future<void> refresh() async
- pegar · method · L35-L43 — Future<void> pegar(String id) async
- criar · method · L45-L50 — Future<Lead> criar(Map<String, dynamic> data) async
- atualizar · method · L52-L61 — Future<Lead> atualizar(String id, Map<String, dynamic> data) async
- moverEtapa · method · L63-L112 — Future<Lead> moverEtapa(
- ganhar · method · L114-L119 — Future<void> ganhar(String id, Map<String, dynamic> data) async
- deletar · method · L121-L126 — Future<void> deletar(String id) async
- leadsProvider · constant · L129-L130 — final leadsProvider =
