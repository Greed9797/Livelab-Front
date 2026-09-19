# lib/livelab/features/cabines/cabines_repository.dart

- CabinesRepository · class · L9-L31 — abstract class CabinesRepository
- ApiCabinesRepository · class · L33-L163 — class ApiCabinesRepository extends CabinesRepository
- fetchAll · method · L35-L38 — Future<List<Cabin>> fetchAll() async
- fetchProximas4h · method · L41-L70 — Future<List<UpcomingScheduleEntry>> fetchProximas4h() async
- reservarCabine · method · L73-L77 — Future<void> reservarCabine(String cabineId, {required String clienteId}) async
- liberarCabine · method · L80-L82 — Future<void> liberarCabine(String cabineId) async
- setManutencao · method · L85-L91 — Future<void> setManutencao(String cabineId, {required String motivo, String? eta}) async
- iniciarLiveManual · method · L94-L109 — Future<String> iniciarLiveManual(String cabineId,
- encerrarLive · method · L112-L131 — Future<void> encerrarLive(
- _mapStatus · method · L133-L145 — static CabinStatus _mapStatus(String? s)
- _mapCabin · method · L147-L162 — static Cabin _mapCabin(Map<String, dynamic> c)
