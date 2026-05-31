import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/pacote.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

class PacotesNotifier extends AsyncNotifier<List<Pacote>> {
  @override
  Future<List<Pacote>> build() async {
    final auth = ref.watch(authProvider);
    if (!auth.isAuthenticated) throw Exception('Não autenticado');
    return _fetch();
  }

  Future<List<Pacote>> _fetch() async {
    final resp = await ApiService.get('/pacotes');
    return (resp.data as List)
        .map((e) => Pacote.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }

  Future<Pacote> criar(Map<String, dynamic> data) async {
    final resp = await ApiService.post('/pacotes', data: data);
    final pacote = Pacote.fromJson(resp.data as Map<String, dynamic>);
    state = AsyncData([pacote, ...state.valueOrNull ?? []]);
    return pacote;
  }

  Future<Pacote> atualizar(String id, Map<String, dynamic> data) async {
    final resp = await ApiService.patch('/pacotes/$id', data: data);
    final updated = Pacote.fromJson(resp.data as Map<String, dynamic>);
    state = AsyncData(
      (state.valueOrNull ?? []).map((p) => p.id == id ? updated : p).toList(),
    );
    return updated;
  }

  Future<void> desativar(String id) async {
    await ApiService.delete('/pacotes/$id');
    state = AsyncData(
      (state.valueOrNull ?? [])
          .map((p) => p.id == id
              ? Pacote(
                  id: p.id,
                  nome: p.nome,
                  descricao: p.descricao,
                  valor: p.valor,
                  horasIncluidas: p.horasIncluidas,
                  comissaoPct: p.comissaoPct,
                  ativo: false,
                )
              : p)
          .toList(),
    );
  }
}

final pacotesProvider =
    AsyncNotifierProvider<PacotesNotifier, List<Pacote>>(PacotesNotifier.new);
