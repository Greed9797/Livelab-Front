import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/apresentadora.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

class ApresentadorasNotifier extends AsyncNotifier<List<Apresentadora>> {
  @override
  Future<List<Apresentadora>> build() async {
    final authState = ref.watch(authProvider);
    if (!authState.isAuthenticated) throw Exception('Não autenticado');
    return _fetch();
  }

  Future<List<Apresentadora>> _fetch() async {
    final resp = await ApiService.get('/apresentadoras');
    return (resp.data as List)
        .map((e) => Apresentadora.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }

  Future<String> salvar(Map<String, dynamic> data, {String? id}) async {
    String savedId;
    if (id == null) {
      final resp = await ApiService.post<Map<String, dynamic>>(
        '/apresentadoras',
        data: data,
      );
      savedId = resp.data!['id'] as String;
    } else {
      await ApiService.patch('/apresentadoras/$id', data: data);
      savedId = id;
    }
    state = await AsyncValue.guard(_fetch);
    return savedId;
  }

  Future<void> deletar(String id) async {
    await ApiService.delete('/apresentadoras/$id');
    state = await AsyncValue.guard(_fetch);
  }

  /// Cria conta de usuário (papel: apresentador) vinculada à apresentadora.
  Future<void> criarUsuario({
    required String apresentadoraId,
    required String nome,
    required String email,
    required String senha,
  }) async {
    await ApiService.post('/usuarios', data: {
      'nome': nome,
      'email': email,
      'papel': 'apresentador',
      'apresentadora_id': apresentadoraId,
      'senha_temporaria': senha,
    });
  }
}

final apresentadorasProvider =
    AsyncNotifierProvider<ApresentadorasNotifier, List<Apresentadora>>(
  ApresentadorasNotifier.new,
);
