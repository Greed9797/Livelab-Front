// Provider para calendário de disponibilidade da apresentadora.
//
// Decisão (síntese do conselho):
//   O CHECK de disponibilidade é 100% server-side. O cliente apenas chama
//   /v1/disponibilidade/check e exibe o resultado. Não duplica regras.

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/apresentadora_bloqueio.dart';
import '../models/disponibilidade_slot.dart';
import '../services/api_service.dart';

/// Resposta agregada do GET /v1/apresentadoras/:id/disponibilidade
class DisponibilidadePayload {
  final List<DisponibilidadeSlot> gradeSemanal;
  final List<ApresentadoraBloqueio> bloqueios;
  final List<LiveAgendadaResumo> livesAgendadas;

  const DisponibilidadePayload({
    required this.gradeSemanal,
    required this.bloqueios,
    required this.livesAgendadas,
  });

  factory DisponibilidadePayload.fromJson(Map<String, dynamic> json) {
    final grade = (json['grade_semanal'] as List? ?? const [])
        .map((e) => DisponibilidadeSlot.fromJson(e as Map<String, dynamic>))
        .toList();
    final blq = (json['bloqueios'] as List? ?? const [])
        .map((e) => ApresentadoraBloqueio.fromJson(e as Map<String, dynamic>))
        .toList();
    final lives = (json['lives_agendadas'] as List? ?? const [])
        .map((e) => LiveAgendadaResumo.fromJson(e as Map<String, dynamic>))
        .toList();
    return DisponibilidadePayload(
      gradeSemanal: grade,
      bloqueios: blq,
      livesAgendadas: lives,
    );
  }
}

/// Resultado de check de disponibilidade pontual.
class CheckDisponibilidadeResult {
  final bool disponivel;
  final String? tipoConflito; // fora_da_grade | bloqueio_pontual | live_agendada
  final String? detalhe;

  const CheckDisponibilidadeResult({
    required this.disponivel,
    this.tipoConflito,
    this.detalhe,
  });

  factory CheckDisponibilidadeResult.fromJson(Map<String, dynamic> json) {
    final conflito = json['conflito'] as Map<String, dynamic>?;
    return CheckDisponibilidadeResult(
      disponivel: json['disponivel'] as bool? ?? false,
      tipoConflito: conflito?['tipo'] as String?,
      detalhe: conflito?['detalhe'] as String?,
    );
  }
}

class DisponibilidadeNotifier
    extends FamilyAsyncNotifier<DisponibilidadePayload, String> {
  @override
  Future<DisponibilidadePayload> build(String apresentadoraId) =>
      _fetch(apresentadoraId);

  Future<DisponibilidadePayload> _fetch(String apresentadoraId,
      {String? dataInicio, String? dataFim}) async {
    final qp = <String, dynamic>{};
    if (dataInicio != null) qp['data_inicio'] = dataInicio;
    if (dataFim != null) qp['data_fim'] = dataFim;
    final resp = await ApiService.get(
      '/apresentadoras/$apresentadoraId/disponibilidade',
      params: qp.isEmpty ? null : qp,
    );
    return DisponibilidadePayload.fromJson(resp.data as Map<String, dynamic>);
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => _fetch(arg));
  }

  /// Substitui a grade inteira (DELETE + INSERT atômico no backend).
  Future<void> salvarGrade(List<DisponibilidadeSlot> slots) async {
    await ApiService.post(
      '/apresentadoras/$arg/disponibilidade/grade',
      data: {'slots': slots.map((s) => s.toJson()).toList()},
    );
    await refresh();
  }

  Future<void> adicionarBloqueio({
    required DateTime dataInicio,
    required DateTime dataFim,
    String? motivo,
  }) async {
    await ApiService.post(
      '/apresentadoras/$arg/disponibilidade/bloqueios',
      data: {
        'data_inicio': dataInicio.toUtc().toIso8601String(),
        'data_fim': dataFim.toUtc().toIso8601String(),
        if (motivo != null && motivo.trim().isNotEmpty) 'motivo': motivo.trim(),
      },
    );
    await refresh();
  }

  Future<void> removerBloqueio(String bloqueioId) async {
    await ApiService.delete(
      '/apresentadoras/$arg/disponibilidade/bloqueios/$bloqueioId',
    );
    await refresh();
  }
}

final disponibilidadeProvider = AsyncNotifierProvider.family<
    DisponibilidadeNotifier, DisponibilidadePayload, String>(
  DisponibilidadeNotifier.new,
);

/// Helper top-level pra checar disponibilidade pontual (não usa state).
Future<CheckDisponibilidadeResult> checkDisponibilidade({
  required String apresentadoraId,
  required String data, // YYYY-MM-DD
  required String horaInicio, // HH:MM
  required String horaFim, // HH:MM
}) async {
  final resp = await ApiService.get(
    '/disponibilidade/check',
    params: {
      'apresentadora_id': apresentadoraId,
      'data': data,
      'hora_inicio': horaInicio,
      'hora_fim': horaFim,
    },
  );
  return CheckDisponibilidadeResult.fromJson(resp.data as Map<String, dynamic>);
}
