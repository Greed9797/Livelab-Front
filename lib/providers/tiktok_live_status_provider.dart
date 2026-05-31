import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/tiktok_live_status.dart';
import '../services/api_service.dart';

/// Notifier de status TikTok por live — polling 30s, autoDispose.
class TiktokLiveStatusNotifier
    extends AutoDisposeFamilyAsyncNotifier<TiktokLiveStatus, String> {
  Timer? _timer;

  @override
  Future<TiktokLiveStatus> build(String liveId) async {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 30), (_) {
      _poll(liveId);
    });
    ref.onDispose(() => _timer?.cancel());
    return _fetch(liveId);
  }

  Future<TiktokLiveStatus> _fetch(String liveId) async {
    try {
      final resp = await ApiService.get('/lives/$liveId/tiktok-status');
      return TiktokLiveStatus.fromJson(resp.data as Map<String, dynamic>);
    } catch (_) {
      return TiktokLiveStatus.disconnected;
    }
  }

  void _poll(String liveId) async {
    try {
      final next = await _fetch(liveId);
      if (state.hasValue) {
        state = AsyncData(next);
      }
    } catch (e) {
      debugPrint('TiktokLiveStatus poll error: $e');
    }
  }

  Future<void> refresh() async {
    state = await AsyncValue.guard(() => _fetch(arg));
  }
}

final tiktokLiveStatusProvider = AsyncNotifierProvider.family
    .autoDispose<TiktokLiveStatusNotifier, TiktokLiveStatus, String>(
  TiktokLiveStatusNotifier.new,
);
