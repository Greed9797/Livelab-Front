import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/api_service.dart';

/// Status calculado pelo backend a partir de access_token + expires_at.
enum TiktokAppStatus { connected, disconnected, expired }

TiktokAppStatus _parseStatus(String? raw) {
  switch (raw) {
    case 'connected':
      return TiktokAppStatus.connected;
    case 'expired':
      return TiktokAppStatus.expired;
    default:
      return TiktokAppStatus.disconnected;
  }
}

class TiktokApp {
  final String tenantId;
  final String tenantNome;
  final String? cidade;
  final String? uf;
  final bool ativo;
  final TiktokAppStatus status;
  final String? shopId;
  final DateTime? expiresAt;

  const TiktokApp({
    required this.tenantId,
    required this.tenantNome,
    this.cidade,
    this.uf,
    required this.ativo,
    required this.status,
    this.shopId,
    this.expiresAt,
  });

  bool get connected => status == TiktokAppStatus.connected;

  factory TiktokApp.fromJson(Map<String, dynamic> j) => TiktokApp(
        tenantId: j['tenant_id'] as String,
        tenantNome: (j['tenant_nome'] as String?) ?? '(sem nome)',
        cidade: j['cidade'] as String?,
        uf: j['uf'] as String?,
        ativo: (j['ativo'] as bool?) ?? true,
        status: _parseStatus(j['status'] as String?),
        shopId: j['shop_id'] as String?,
        expiresAt: j['expires_at'] != null
            ? DateTime.tryParse(j['expires_at'] as String)?.toLocal()
            : null,
      );
}

/// Filtro selecionado na tela master.
final tiktokAppsFilterProvider =
    StateProvider<TiktokAppStatus?>((_) => null);

/// Lista cross-tenant das integrações TikTok Shop. Master only.
class TiktokAppsNotifier extends AsyncNotifier<List<TiktokApp>> {
  @override
  Future<List<TiktokApp>> build() async {
    final filter = ref.watch(tiktokAppsFilterProvider);
    return _fetch(filter);
  }

  Future<List<TiktokApp>> _fetch(TiktokAppStatus? filter) async {
    final qp = <String, dynamic>{};
    if (filter != null) {
      qp['status'] = switch (filter) {
        TiktokAppStatus.connected => 'connected',
        TiktokAppStatus.disconnected => 'disconnected',
        TiktokAppStatus.expired => 'expired',
      };
    }
    final resp = await ApiService.get(
      '/master/tiktok-apps',
      params: qp.isEmpty ? null : qp,
    );
    final data = resp.data as List<dynamic>;
    return data
        .map((e) => TiktokApp.fromJson(e as Map<String, dynamic>))
        .toList(growable: false);
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => _fetch(ref.read(tiktokAppsFilterProvider)));
  }
}

final tiktokAppsProvider =
    AsyncNotifierProvider<TiktokAppsNotifier, List<TiktokApp>>(
        TiktokAppsNotifier.new);
