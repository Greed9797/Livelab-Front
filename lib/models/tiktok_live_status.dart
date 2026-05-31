/// Model para o status do TikTok connector por live.
/// Endpoint: GET /v1/lives/:id/tiktok-status
class TiktokLiveStatus {
  const TiktokLiveStatus({
    required this.status,
    this.viewerCount = 0,
    this.lastSyncAt,
    this.error,
  });

  /// 'connected' | 'connecting' | 'disconnected' | 'error'
  final String status;
  final int viewerCount;
  final DateTime? lastSyncAt;
  final String? error;

  bool get isConnected => status == 'connected';
  bool get isConnecting => status == 'connecting';
  bool get isError => status == 'error';

  factory TiktokLiveStatus.fromJson(Map<String, dynamic> j) =>
      TiktokLiveStatus(
        status: (j['status'] as String?) ?? 'disconnected',
        viewerCount: (j['viewer_count'] as num? ?? 0).toInt(),
        lastSyncAt: j['last_sync_at'] != null
            ? DateTime.tryParse(j['last_sync_at'] as String)
            : null,
        error: j['error'] as String?,
      );

  static const disconnected = TiktokLiveStatus(status: 'disconnected');
}
