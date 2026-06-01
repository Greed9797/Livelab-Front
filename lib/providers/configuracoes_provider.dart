import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/configuracoes.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

class ConfiguracoesNotifier extends AsyncNotifier<ConfiguracoesFranquia> {
  @override
  Future<ConfiguracoesFranquia> build() async {
    final authState = ref.watch(authProvider);
    if (!authState.isAuthenticated) {
      throw Exception('Não autenticado');
    }
    return _fetch();
  }

  Future<ConfiguracoesFranquia> _fetch() async {
    final resp = await ApiService.get('/configuracoes');
    return ConfiguracoesFranquia.fromJson(resp.data as Map<String, dynamic>);
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }

  Future<void> atualizar(Map<String, dynamic> payload) async {
    await ApiService.patch('/configuracoes', data: payload);
    await refresh();
  }
}

final configuracoesProvider =
    AsyncNotifierProvider<ConfiguracoesNotifier, ConfiguracoesFranquia>(ConfiguracoesNotifier.new);
