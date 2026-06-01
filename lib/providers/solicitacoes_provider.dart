import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

// ──────────────────────────────────────────────────────────────
// Model
// ──────────────────────────────────────────────────────────────

class SolicitacaoFranqueador {
  final String id;
  final String dataSolicitada; // "YYYY-MM-DD"
  final String horaInicio; // "HH:MM:SS"
  final String horaFim;
  final String? observacao;
  final String status;
  final String? motivoRecusa;
  final String criadoEm;
  final int cabineNumero;
  final String clienteNome;
  final String solicitanteNome;
  final String? apresentadoraNome;

  const SolicitacaoFranqueador({
    required this.id,
    required this.dataSolicitada,
    required this.horaInicio,
    required this.horaFim,
    this.observacao,
    required this.status,
    this.motivoRecusa,
    required this.criadoEm,
    required this.cabineNumero,
    required this.clienteNome,
    required this.solicitanteNome,
    this.apresentadoraNome,
  });

  factory SolicitacaoFranqueador.fromJson(Map<String, dynamic> j) =>
      SolicitacaoFranqueador(
        id: j['id'] as String,
        dataSolicitada: j['data_solicitada'] as String,
        horaInicio: j['hora_inicio'] as String,
        horaFim: j['hora_fim'] as String,
        observacao: j['observacao'] as String?,
        status: j['status'] as String,
        motivoRecusa: j['motivo_recusa'] as String?,
        criadoEm: j['criado_em'] as String,
        cabineNumero: (j['cabine_numero'] as num).toInt(),
        clienteNome: j['cliente_nome'] as String,
        solicitanteNome: j['solicitante_nome'] as String,
        apresentadoraNome: j['apresentadora_nome'] as String?,
      );

  String get horaInicioDisplay =>
      horaInicio.length >= 5 ? horaInicio.substring(0, 5) : horaInicio;
  String get horaFimDisplay =>
      horaFim.length >= 5 ? horaFim.substring(0, 5) : horaFim;
}

// ──────────────────────────────────────────────────────────────
// Notifier
// ──────────────────────────────────────────────────────────────

class SolicitacoesNotifier extends AsyncNotifier<List<SolicitacaoFranqueador>> {
  @override
  Future<List<SolicitacaoFranqueador>> build() async {
    final authState = ref.watch(authProvider);
    if (!authState.isAuthenticated) {
      throw Exception('Não autenticado');
    }
    return _fetch();
  }

  Future<List<SolicitacaoFranqueador>> _fetch() async {
    final resp =
        await ApiService.get('/solicitacoes', params: {'status': 'all'});
    return (resp.data as List)
        .map((e) => SolicitacaoFranqueador.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }

  /// Aprova uma solicitação. Lança [ApiException] em caso de conflito (409)
  /// ou outro erro — a mensagem já vem em pt_BR pronta para exibição.
  Future<void> aprovar(String id) async {
    await ApiService.patch('/solicitacoes/$id/aprovar', data: {});
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }

  /// Recusa uma solicitação com motivo obrigatório.
  Future<void> recusar(String id, String motivo) async {
    await ApiService.patch('/solicitacoes/$id/recusar',
        data: {'motivo_recusa': motivo});
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }

  /// Franqueado cria agendamento diretamente (já aprovado, com apresentadora opcional).
  Future<void> criarAgendamento(Map<String, dynamic> data) async {
    await ApiService.post('/solicitacoes', data: data);
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }
}

final solicitacoesProvider =
    AsyncNotifierProvider<SolicitacoesNotifier, List<SolicitacaoFranqueador>>(
  SolicitacoesNotifier.new,
);
