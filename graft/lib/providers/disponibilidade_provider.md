# lib/providers/disponibilidade_provider.dart

- DisponibilidadePayload · class · L14-L41 — class DisponibilidadePayload
- CheckDisponibilidadeResult · class · L44-L63 — class CheckDisponibilidadeResult
- DisponibilidadeNotifier · class · L65-L119 — class DisponibilidadeNotifier
- build · method · L68-L69 — Future<DisponibilidadePayload> build(String apresentadoraId) =>
- _fetch · method · L71-L81 — Future<DisponibilidadePayload> _fetch(String apresentadoraId,
- refresh · method · L83-L86 — Future<void> refresh() async
- salvarGrade · method · L89-L95 — Future<void> salvarGrade(List<DisponibilidadeSlot> slots) async
- adicionarBloqueio · method · L97-L111 — Future<void> adicionarBloqueio(
- removerBloqueio · method · L113-L118 — Future<void> removerBloqueio(String bloqueioId) async
- disponibilidadeProvider · constant · L121-L124 — final disponibilidadeProvider = AsyncNotifierProvider.family<
- checkDisponibilidade · function · L127-L143 — Future<CheckDisponibilidadeResult> checkDisponibilidade(
