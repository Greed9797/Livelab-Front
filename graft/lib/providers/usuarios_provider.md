# lib/providers/usuarios_provider.dart

- UsuariosNotifier · class · L6-L84 — class UsuariosNotifier extends AsyncNotifier<List<Usuario>>
- build · method · L8-L14 — Future<List<Usuario>> build() async
- _fetch · method · L16-L24 — Future<List<Usuario>> _fetch({String? papel, bool? ativo}) async
- refresh · method · L26-L29 — Future<void> refresh() async
- convidar · method · L32-L36 — Future<Map<String, dynamic>> convidar(Map<String, dynamic> payload) async
- atualizar · method · L38-L45 — Future<Usuario> atualizar(String id, Map<String, dynamic> payload) async
- resetSenha · method · L48-L51 — Future<String> resetSenha(String id) async
- desativar · method · L54-L59 — Future<void> desativar(String id) async
- reenviarConvite · method · L62-L65 — Future<void> reenviarConvite(String id) async
- forceLogout · method · L68-L71 — Future<void> forceLogout(String id) async
- _inativo · method · L73-L83 — Usuario _inativo(Usuario u) => Usuario(
- usuariosProvider · constant · L86-L87 — final usuariosProvider =
