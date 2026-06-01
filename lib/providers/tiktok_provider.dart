import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';

class TiktokStatus {
  final bool connected;
  final String? userId;
  final DateTime? expiresAt;

  const TiktokStatus({
    required this.connected,
    this.userId,
    this.expiresAt,
  });

  factory TiktokStatus.fromJson(Map<String, dynamic> j) => TiktokStatus(
        connected: (j['connected'] as bool?) ?? false,
        userId: j['tiktok_user_id'] as String?,
        expiresAt: j['token_expires_at'] != null
            ? DateTime.tryParse(j['token_expires_at'] as String)
            : null,
      );

  static const disconnected = TiktokStatus(connected: false);
}

class TiktokStatusNotifier extends AsyncNotifier<TiktokStatus> {
  Timer? _pollTimer;

  @override
  Future<TiktokStatus> build() async {
    ref.onDispose(() => _pollTimer?.cancel());
    return _fetch();
  }

  Future<TiktokStatus> _fetch() async {
    try {
      final resp = await ApiService.get('/tiktok/status');
      return TiktokStatus.fromJson(resp.data as Map<String, dynamic>);
    } catch (_) {
      return TiktokStatus.disconnected;
    }
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }

  /// Inicia polling por 60s esperando o callback OAuth completar.
  void startPollingAfterOAuth() {
    int count = 0;
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 3), (_) async {
      if (++count > 20) {
        _pollTimer?.cancel();
        return;
      }
      final s = await _fetch();
      state = AsyncData(s);
      if (s.connected) _pollTimer?.cancel();
    });
  }

  Future<void> disconnect() async {
    try {
      await ApiService.patch('/configuracoes', data: {
        'tiktok_access_token': null,
        'tiktok_refresh_token': null,
      });
    } catch (_) {}
    state = const AsyncData(TiktokStatus.disconnected);
  }
}

final tiktokStatusProvider =
    AsyncNotifierProvider<TiktokStatusNotifier, TiktokStatus>(
        TiktokStatusNotifier.new);
