import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/api_service.dart';

/// Notificação enviada pelo gerente/franqueado ao closer (apresentador).
class CloserNotification {
  final String id;
  final String cabineId;
  final String? liveId;
  final String? apresentadorId;
  final String type;
  final String message;
  final DateTime ts;

  const CloserNotification({
    required this.id,
    required this.cabineId,
    required this.liveId,
    required this.apresentadorId,
    required this.type,
    required this.message,
    required this.ts,
  });

  factory CloserNotification.fromJson(Map<String, dynamic> j) =>
      CloserNotification(
        id: j['id'] as String,
        cabineId: j['cabine_id'] as String,
        liveId: j['live_id'] as String?,
        apresentadorId: j['apresentador_id'] as String?,
        type: (j['type'] ?? 'custom') as String,
        message: (j['message'] ?? '') as String,
        ts: DateTime.fromMillisecondsSinceEpoch((j['ts'] as num).toInt()),
      );
}

/// SSE de notificações para o closer de uma cabine específica.
/// Emite uma `CloserNotification` a cada mensagem enviada pelo backend.
final closerNotificationsProvider = StreamProvider.family
    .autoDispose<CloserNotification, String>((ref, cabineId) async* {
  await for (final json in ApiService.streamCloserNotifications(cabineId)) {
    yield CloserNotification.fromJson(json);
  }
});
