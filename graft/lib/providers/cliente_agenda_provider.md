# lib/providers/cliente_agenda_provider.dart

- AgendaCabine · class · L11-L21 — class AgendaCabine
- AgendaSlot · class · L23-L51 — class AgendaSlot
- AgendaState · class · L57-L79 — class AgendaState
- copyWith · method · L68-L78 — AgendaState copyWith(
- _mondayOf · function · L85-L88 — DateTime _mondayOf(DateTime date)
- _fmtDate · function · L90-L93 — String _fmtDate(DateTime d) =>
- ClienteAgendaNotifier · class · L99-L179 — class ClienteAgendaNotifier extends AsyncNotifier<AgendaState>
- build · method · L101-L110 — Future<AgendaState> build() async
- _load · method · L112-L140 — Future<AgendaState> _load(DateTime monday) async
- fetchSemana · method · L142-L146 — Future<void> fetchSemana(DateTime semanaInicio) async
- solicitarLive · method · L148-L173 — Future<Map<String, dynamic>> solicitarLive(
- refresh · method · L175-L178 — Future<void> refresh() async
- clienteAgendaProvider · constant · L181-L184 — final clienteAgendaProvider =
