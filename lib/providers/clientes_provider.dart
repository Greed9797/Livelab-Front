import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/cliente.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

class ClientesNotifier extends AsyncNotifier<List<Cliente>> {
  @override
  Future<List<Cliente>> build() async {
    final authState = ref.watch(authProvider);
    if (!authState.isAuthenticated) {
      throw Exception('Não autenticado');
    }
    return _fetch();
  }

  Future<List<Cliente>> _fetch() async {
    final resp = await ApiService.get('/clientes');
    return (resp.data as List)
        .map((e) => Cliente.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }

  Future<Cliente> criar(Map<String, dynamic> data) async {
    final resp = await ApiService.post('/clientes', data: data);
    final cliente = Cliente.fromJson(resp.data as Map<String, dynamic>);
    state = AsyncData([cliente, ...state.valueOrNull ?? []]);
    return cliente;
  }

  Future<Cliente> atualizar(String id, Map<String, dynamic> data) async {
    final resp = await ApiService.patch('/clientes/$id', data: data);
    final updated = Cliente.fromJson(resp.data as Map<String, dynamic>);
    state = AsyncData(
      state.valueOrNull?.map((c) => c.id == id ? updated : c).toList() ??
          [updated],
    );
    return updated;
  }

  Future<void> deletar(String id) async {
    await ApiService.delete('/clientes/$id');
    final current = state.valueOrNull ?? [];
    state = AsyncData(current.where((c) => c.id != id).toList());
  }

  Future<Map<String, dynamic>> buscarCep(String cep) async {
    final resp = await ApiService.get('/cep/$cep');
    return resp.data as Map<String, dynamic>;
  }

  /// W3-A: atualiza apenas o @TikTok de um cliente (PATCH parcial).
  /// Aceita `null` pra remover. Strip do `@` leading garante consistência.
  /// Não usa `Cliente.fromJson` porque o PATCH retorna payload reduzido —
  /// faz refresh completo via [refresh] após sucesso pra recarregar a lista.
  Future<void> atualizarTiktok(String clienteId, String? username) async {
    final clean = username == null
        ? null
        : (username.trim().replaceAll(RegExp(r'^@'), '').isEmpty
            ? null
            : username.trim().replaceAll(RegExp(r'^@'), ''));
    await ApiService.patch('/clientes/$clienteId', data: {
      'tiktok_username': clean,
    });
    await refresh();
  }
}

final clientesProvider =
    AsyncNotifierProvider<ClientesNotifier, List<Cliente>>(ClientesNotifier.new);
