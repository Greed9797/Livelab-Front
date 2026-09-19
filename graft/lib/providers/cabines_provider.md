# lib/providers/cabines_provider.dart

- CabinesNotifier · class · L9-L124 — class CabinesNotifier extends AsyncNotifier<List<Cabine>>
- build · method · L13-L29 — Future<List<Cabine>> build()
- _fetch · method · L31-L38 — Future<List<Cabine>> _fetch() async
- _reload · method · L40-L42 — Future<void> _reload() async
- _invalidateOperationalProviders · method · L44-L47 — void _invalidateOperationalProviders()
- refresh · method · L49-L53 — Future<void> refresh() async
- reservarCabine · method · L55-L63 — Future<void> reservarCabine(
- liberarCabine · method · L65-L68 — Future<void> liberarCabine(String cabineId) async
- iniciarLive · method · L70-L77 — Future<void> iniciarLive(
- encerrarLive · method · L79-L91 — Future<void> encerrarLive(
- registrarLiveManual · method · L93-L97 — Future<String> registrarLiveManual(Map<String, dynamic> payload) async
- editarLive · method · L99-L102 — Future<void> editarLive(String liveId, Map<String, dynamic> payload) async
- atualizarCabine · method · L104-L107 — Future<void> atualizarCabine(String cabineId, Map<String, dynamic> data) async
- criar · method · L109-L115 — Future<void> criar(Map<String, dynamic> payload) async
- deletar · method · L117-L123 — Future<void> deletar(String id) async
- cabinesProvider · constant · L126-L127 — final cabinesProvider =
- filaAtivacaoProvider · constant · L129-L137 — final filaAtivacaoProvider =
