import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/boleto.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

class BoletosNotifier extends AsyncNotifier<List<Boleto>> {
  @override
  Future<List<Boleto>> build() {
    final authState = ref.watch(authProvider);
    if (!authState.isAuthenticated) return Future.value([]);
    return _fetch();
  }

  Future<List<Boleto>> _fetch() async {
    final resp = await ApiService.get('/boletos');
    return (resp.data as List)
        .map((e) => Boleto.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }

  Future<void> pagar(String id) async {
    await ApiService.patch('/boletos/$id/pagar');
    state = await AsyncValue.guard(_fetch);
  }
}

final boletosProvider =
    AsyncNotifierProvider<BoletosNotifier, List<Boleto>>(BoletosNotifier.new);
