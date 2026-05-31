import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/cabine.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

class ClienteCabinesNotifier extends AsyncNotifier<List<Cabine>> {
  @override
  Future<List<Cabine>> build() async {
    // BUGFIX: provider sem auth guard — pós-logout fazia GET /cabines/minhas
    // em background gerando 401, e re-acessar a tela travava em loading.
    final authState = ref.watch(authProvider);
    if (!authState.isAuthenticated) return const [];
    return _fetch();
  }

  Future<List<Cabine>> _fetch() async {
    final res = await ApiService.get<Map<String, dynamic>>('/cabines/minhas');
    final list = (res.data?['cabines'] as List? ?? []);
    return list.map((e) => Cabine.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }
}

final clienteCabinesProvider =
    AsyncNotifierProvider<ClienteCabinesNotifier, List<Cabine>>(
  ClienteCabinesNotifier.new,
);
