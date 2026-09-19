# lib/providers/cabines/cabine_detail_provider.dart

- CabineLiveAtual · class · L8-L65 — class CabineLiveAtual
- CabineHistorico · class · L67-L88 — class CabineHistorico
- CabineDetailState · class · L90-L106 — class CabineDetailState
- copyWith · method · L96-L105 — CabineDetailState copyWith(
- CabineDetailNotifier · class · L108-L179 — class CabineDetailNotifier
- build · method · L113-L130 — Future<CabineDetailState> build(String arg) async
- _restartPollingIfLive · method · L132-L138 — void _restartPollingIfLive(bool hasLive)
- _fetchHistorico · method · L140-L144 — Future<CabineHistorico> _fetchHistorico(String cabineId) async
- _fetchLiveAtual · method · L146-L156 — Future<CabineLiveAtual?> _fetchLiveAtual(String cabineId) async
- refresh · method · L158-L161 — Future<void> refresh() async
- refreshLiveOnly · method · L163-L178 — Future<void> refreshLiveOnly() async
- cabineDetailProvider · constant · L182-L185 — final cabineDetailProvider = AsyncNotifierProviderFamily<CabineDetailNotifier,
