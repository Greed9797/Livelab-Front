# lib/providers/tiktok_provider.dart

- TiktokStatus · class · L5-L25 — class TiktokStatus
- disconnected · constant · L24-L24 — static const disconnected = TiktokStatus(connected: false);
- TiktokStatusNotifier · class · L27-L74 — class TiktokStatusNotifier extends AsyncNotifier<TiktokStatus>
- build · method · L31-L34 — Future<TiktokStatus> build() async
- _fetch · method · L36-L43 — Future<TiktokStatus> _fetch() async
- refresh · method · L45-L48 — Future<void> refresh() async
- startPollingAfterOAuth · method · L51-L63 — void startPollingAfterOAuth()
- disconnect · method · L65-L73 — Future<void> disconnect() async
- tiktokStatusProvider · constant · L76-L78 — final tiktokStatusProvider =
