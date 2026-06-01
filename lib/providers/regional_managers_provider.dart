import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/regional_manager.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

/// Lista todos os usuários com papel `gerente_regional` + unidades atribuídas.
class RegionalManagersNotifier extends AsyncNotifier<List<RegionalManager>> {
  @override
  Future<List<RegionalManager>> build() async {
    // BUGFIX: faltava auth guard — após logout fazia GET em background
    // gerando 401s.
    final authState = ref.watch(authProvider);
    if (!authState.isAuthenticated) return const [];
    return _fetch();
  }

  Future<List<RegionalManager>> _fetch() async {
    final resp = await ApiService.get('/master/regional-managers');
    return (resp.data as List)
        .map((j) => RegionalManager.fromJson(j as Map<String, dynamic>))
        .toList();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }

  /// Substitui completamente o set de tenants do user.
  Future<void> setTenants(String userId, List<String> tenantIds) async {
    await ApiService.post(
      '/master/regional-managers/$userId/tenants',
      data: {'tenant_ids': tenantIds},
    );
    await refresh();
  }

  /// Revoga acesso a uma única unidade.
  Future<void> revokeTenant(String userId, String tenantId) async {
    await ApiService.delete(
      '/master/regional-managers/$userId/tenants/$tenantId',
    );
    await refresh();
  }
}

final regionalManagersProvider =
    AsyncNotifierProvider<RegionalManagersNotifier, List<RegionalManager>>(
  RegionalManagersNotifier.new,
);
