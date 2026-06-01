import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/cliente_nota.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

class ClienteNotasNotifier
    extends FamilyAsyncNotifier<List<ClienteNota>, String> {
  @override
  Future<List<ClienteNota>> build(String clienteId) async {
    // BUGFIX: faltava auth guard.
    final authState = ref.watch(authProvider);
    if (!authState.isAuthenticated) return const [];
    return _fetch(clienteId);
  }

  Future<List<ClienteNota>> _fetch(String clienteId) async {
    final r = await ApiService.get('/clientes/$clienteId/notas');
    return (r.data as List)
        .map((e) => ClienteNota.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => _fetch(arg));
  }

  Future<ClienteNota> criar({required String texto, required NotaTipo tipo}) async {
    final r = await ApiService.post(
      '/clientes/$arg/notas',
      data: {'texto': texto, 'tipo': tipoToString(tipo)},
    );
    final nova = ClienteNota.fromJson(r.data as Map<String, dynamic>);
    state = AsyncData([nova, ...(state.valueOrNull ?? const [])]);
    return nova;
  }

  Future<ClienteNota> editar(
    String notaId, {
    String? texto,
    NotaTipo? tipo,
  }) async {
    final body = <String, dynamic>{};
    if (texto != null) body['texto'] = texto;
    if (tipo != null) body['tipo'] = tipoToString(tipo);
    final r = await ApiService.patch('/clientes/$arg/notas/$notaId', data: body);
    final atualizada = ClienteNota.fromJson(r.data as Map<String, dynamic>);
    state = AsyncData(
      (state.valueOrNull ?? const [])
          .map((n) => n.id == notaId ? atualizada : n)
          .toList(),
    );
    return atualizada;
  }

  Future<void> deletar(String notaId) async {
    await ApiService.delete('/clientes/$arg/notas/$notaId');
    state = AsyncData(
      (state.valueOrNull ?? const []).where((n) => n.id != notaId).toList(),
    );
  }
}

final clienteNotasProvider = AsyncNotifierProvider.family<
    ClienteNotasNotifier, List<ClienteNota>, String>(
  ClienteNotasNotifier.new,
);
