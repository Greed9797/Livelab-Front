// lib/providers/live_stream_provider.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/live_snapshot.dart';
import '../services/api_service.dart';

/// StreamProvider that opens SSE for the specified liveId.
/// autoDispose: closes the SSE connection when no widget is watching.
final liveStreamProvider =
    StreamProvider.family.autoDispose<LiveSnapshot, String>(
  (ref, liveId) => ApiService.streamLiveSnapshot(liveId),
);
