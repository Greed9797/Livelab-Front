import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/api_service.dart';
import 'auth_provider.dart';
import 'cliente_cabines_provider.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Models
// ─────────────────────────────────────────────────────────────────────────────

class AgendaCabine {
  final String id;
  final int numero;

  const AgendaCabine({required this.id, required this.numero});

  factory AgendaCabine.fromJson(Map<String, dynamic> j) => AgendaCabine(
        id: j['id']?.toString() ?? '',
        numero: (j['numero'] as num? ?? 0).toInt(),
      );
}

class AgendaSlot {
  final String cabineId;
  final String data; // "YYYY-MM-DD"
  final String horaInicio; // "HH:mm"
  final String horaFim; // "HH:mm"
  final String status; // 'ocupado' | 'pendente' | 'confirmada'
  final bool isMine;
  final String? solicitacaoId;

  const AgendaSlot({
    required this.cabineId,
    required this.data,
    required this.horaInicio,
    required this.horaFim,
    required this.status,
    required this.isMine,
    this.solicitacaoId,
  });

  factory AgendaSlot.fromJson(Map<String, dynamic> j) => AgendaSlot(
        cabineId: j['cabine_id']?.toString() ?? '',
        data: j['data']?.toString() ?? '',
        horaInicio: j['hora_inicio']?.toString() ?? '',
        horaFim: j['hora_fim']?.toString() ?? '',
        status: j['status']?.toString() ?? 'ocupado',
        isMine: j['is_mine'] == true,
        solicitacaoId: j['solicitacao_id']?.toString(),
      );
}

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────

class AgendaState {
  final List<AgendaCabine> cabines;
  final List<AgendaSlot> slots;
  final DateTime semanaInicio; // Always Monday

  const AgendaState({
    required this.cabines,
    required this.slots,
    required this.semanaInicio,
  });

  AgendaState copyWith({
    List<AgendaCabine>? cabines,
    List<AgendaSlot>? slots,
    DateTime? semanaInicio,
  }) {
    return AgendaState(
      cabines: cabines ?? this.cabines,
      slots: slots ?? this.slots,
      semanaInicio: semanaInicio ?? this.semanaInicio,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

DateTime _mondayOf(DateTime date) {
  final day = date.weekday; // 1=Mon … 7=Sun
  return DateTime(date.year, date.month, date.day - (day - 1));
}

String _fmtDate(DateTime d) =>
    '${d.year.toString().padLeft(4, '0')}-'
    '${d.month.toString().padLeft(2, '0')}-'
    '${d.day.toString().padLeft(2, '0')}';

// ─────────────────────────────────────────────────────────────────────────────
// Notifier
// ─────────────────────────────────────────────────────────────────────────────

class ClienteAgendaNotifier extends AsyncNotifier<AgendaState> {
  @override
  Future<AgendaState> build() async {
    // BUGFIX: faltava auth guard — após logout, o provider continuava fazendo
    // GET /cliente/agenda em background gerando 401s e quebrando tela.
    final authState = ref.watch(authProvider);
    if (!authState.isAuthenticated) {
      throw Exception('Não autenticado');
    }
    final monday = _mondayOf(DateTime.now());
    return _load(monday);
  }

  Future<AgendaState> _load(DateTime monday) async {
    final sunday = monday.add(const Duration(days: 6));
    final dataInicio = _fmtDate(monday);
    final dataFim = _fmtDate(sunday);

    final response = await ApiService.get(
      '/cliente/agenda',
      params: {
        'data_inicio': dataInicio,
        'data_fim': dataFim,
      },
    );

    final data = response.data as Map<String, dynamic>;

    final cabines = (data['cabines'] as List? ?? [])
        .map((e) => AgendaCabine.fromJson(e as Map<String, dynamic>))
        .toList();

    final slots = (data['slots'] as List? ?? [])
        .map((e) => AgendaSlot.fromJson(e as Map<String, dynamic>))
        .toList();

    return AgendaState(
      cabines: cabines,
      slots: slots,
      semanaInicio: monday,
    );
  }

  Future<void> fetchSemana(DateTime semanaInicio) async {
    final monday = _mondayOf(semanaInicio);
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => _load(monday));
  }

  Future<Map<String, dynamic>> solicitarLive({
    required String cabineId,
    required String dataSolicitada,
    required String horaInicio,
    required String horaFim,
    required String tipoLive,
    String? observacoes,
  }) async {
    final body = <String, dynamic>{
      'cabine_id': cabineId,
      'data_solicitada': dataSolicitada,
      'hora_inicio': horaInicio,
      'hora_fim': horaFim,
      'tipo_live': tipoLive,
      if (observacoes != null && observacoes.isNotEmpty)
        'observacoes': observacoes,
    };

    final response = await ApiService.post('/cliente/solicitacao', data: body);
    // BUGFIX: antes não atualizava nem invalidava nada — após criar
    // solicitação, agenda continuava mostrando o slot livre até o usuário
    // trocar de semana. Recarrega semana atual e invalida cabines.
    await refresh();
    ref.invalidate(clienteCabinesProvider);
    return response.data as Map<String, dynamic>;
  }

  Future<void> refresh() async {
    final currentMonday = state.valueOrNull?.semanaInicio ?? _mondayOf(DateTime.now());
    await fetchSemana(currentMonday);
  }
}

final clienteAgendaProvider =
    AsyncNotifierProvider<ClienteAgendaNotifier, AgendaState>(
  ClienteAgendaNotifier.new,
);
