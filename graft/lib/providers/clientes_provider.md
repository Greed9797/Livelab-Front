# lib/providers/clientes_provider.dart

- ClientesNotifier · class · L6-L71 — class ClientesNotifier extends AsyncNotifier<List<Cliente>>
- build · method · L8-L14 — Future<List<Cliente>> build() async
- _fetch · method · L16-L21 — Future<List<Cliente>> _fetch() async
- refresh · method · L23-L26 — Future<void> refresh() async
- criar · method · L28-L33 — Future<Cliente> criar(Map<String, dynamic> data) async
- atualizar · method · L35-L43 — Future<Cliente> atualizar(String id, Map<String, dynamic> data) async
- deletar · method · L45-L49 — Future<void> deletar(String id) async
- buscarCep · method · L51-L54 — Future<Map<String, dynamic>> buscarCep(String cep) async
- atualizarTiktok · method · L60-L70 — Future<void> atualizarTiktok(String clienteId, String? username) async
- clientesProvider · constant · L73-L74 — final clientesProvider =
