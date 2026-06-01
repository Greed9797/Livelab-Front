import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/usuario.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

class UsuariosNotifier extends AsyncNotifier<List<Usuario>> {
  @override
  Future<List<Usuario>> build() async {
    // BUGFIX: provider sem auth guard — após logout fazia GET /usuarios em
    // background, gerando 401 spam até a tela login.
    final authState = ref.watch(authProvider);
    if (!authState.isAuthenticated) return const [];
    return _fetch();
  }

  Future<List<Usuario>> _fetch({String? papel, bool? ativo}) async {
    final params = <String, dynamic>{};
    if (papel != null) params['papel'] = papel;
    if (ativo != null) params['ativo'] = ativo.toString();
    final resp = await ApiService.get('/usuarios', params: params);
    return (resp.data as List)
        .map((j) => Usuario.fromJson(j as Map<String, dynamic>))
        .toList();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }

  // Retorna o usuário criado + senha_temporaria
  Future<Map<String, dynamic>> convidar(Map<String, dynamic> payload) async {
    final resp = await ApiService.post('/usuarios/convidar', data: payload);
    await refresh();
    return resp.data as Map<String, dynamic>;
  }

  Future<Usuario> atualizar(String id, Map<String, dynamic> payload) async {
    final resp = await ApiService.patch('/usuarios/$id', data: payload);
    final updated = Usuario.fromJson(resp.data as Map<String, dynamic>);
    state = AsyncData(
      state.valueOrNull?.map((u) => u.id == id ? updated : u).toList() ?? [updated],
    );
    return updated;
  }

  // Retorna nova senha_temporaria
  Future<String> resetSenha(String id) async {
    final resp = await ApiService.post('/usuarios/$id/reset-senha', data: {});
    return (resp.data as Map<String, dynamic>)['senha_temporaria'] as String;
  }

  // Soft delete — marca ativo=false
  Future<void> desativar(String id) async {
    await ApiService.delete('/usuarios/$id');
    state = AsyncData(
      state.valueOrNull?.map((u) => u.id == id ? _inativo(u) : u).toList() ?? [],
    );
  }

  // Reenviar convite para usuário que ainda não aceitou
  Future<void> reenviarConvite(String id) async {
    await ApiService.post('/usuarios/$id/reenviar-convite', data: {});
    // Não precisa fazer refresh — o convite é silencioso
  }

  // Force logout — invalida todas as sessões do usuário
  Future<void> forceLogout(String id) async {
    await ApiService.post('/usuarios/$id/force-logout', data: {});
    // Não precisa fazer refresh — logout é remoto
  }

  Usuario _inativo(Usuario u) => Usuario(
        id: u.id,
        nome: u.nome,
        email: u.email,
        papel: u.papel,
        ativo: false,
        createdAt: u.createdAt,
        criadoPor: u.criadoPor,
        clienteId: u.clienteId,
        apresentadoraId: u.apresentadoraId,
      );
}

final usuariosProvider =
    AsyncNotifierProvider<UsuariosNotifier, List<Usuario>>(UsuariosNotifier.new);
