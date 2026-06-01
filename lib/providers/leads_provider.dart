import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/lead.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

double? _asDouble(dynamic v) {
  if (v == null) return null;
  if (v is num) return v.toDouble();
  if (v is String) return double.tryParse(v.replaceAll(',', '.'));
  return null;
}

class LeadsNotifier extends AsyncNotifier<List<Lead>> {
  @override
  Future<List<Lead>> build() async {
    final authState = ref.watch(authProvider);
    // Sem usuário logado, retorna lista vazia em vez de throw — guard de
    // rota cuida da redirect; throw aqui derrubava a árvore inteira de widgets.
    if (!authState.isAuthenticated) return const [];
    return _fetch();
  }

  Future<List<Lead>> _fetch() async {
    final resp = await ApiService.get('/leads');
    return (resp.data as List)
        .map((e) => Lead.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }

  Future<void> pegar(String id) async {
    await ApiService.post('/leads/$id/pegar');
    // Remove localmente para feedback imediato
    state = AsyncData(
      state.valueOrNull?.where((l) => l.id != id).toList() ?? [],
    );
    // Recarrega para pegar com dados atualizados
    state = await AsyncValue.guard(_fetch);
  }

  Future<Lead> criar(Map<String, dynamic> data) async {
    final resp = await ApiService.post('/leads', data: data);
    final lead = Lead.fromJson(resp.data as Map<String, dynamic>);
    state = AsyncData([lead, ...state.valueOrNull ?? []]);
    return lead;
  }

  Future<Lead> atualizar(String id, Map<String, dynamic> data) async {
    final resp = await ApiService.patch('/leads/$id', data: data);
    final updated = Lead.fromJson(resp.data as Map<String, dynamic>);
    state = AsyncData(
      (state.valueOrNull ?? [])
          .map((lead) => lead.id == id ? updated : lead)
          .toList(),
    );
    return updated;
  }

  Future<Lead> moverEtapa(
    String id,
    String etapa, {
    String? motivoPerda,
  }) async {
    // Backend aceita crm_etapa direto no PATCH /leads/:id
    final resp = await ApiService.patch('/leads/$id', data: {
      'crm_etapa': etapa,
      if (motivoPerda != null) 'motivo_perda': motivoPerda,
    });
    final body = resp.data as Map<String, dynamic>;
    // PATCH retorna parcial — merge com lead atual
    final current = (state.valueOrNull ?? []).firstWhere(
      (l) => l.id == id,
      orElse: () => Lead.fromJson(body),
    );
    final merged = Lead(
      id: current.id,
      nome: current.nome,
      nicho: current.nicho,
      cidade: current.cidade,
      estado: current.estado,
      lat: current.lat,
      lng: current.lng,
      fatEstimado: current.fatEstimado,
      status: current.status,
      pegoPor: current.pegoPor,
      pegoEm: current.pegoEm,
      expiraEm: current.expiraEm,
      criadoEm: current.criadoEm,
      isNovo: current.isNovo,
      crmEtapa: (body['crm_etapa'] as String?) ?? etapa,
      valorOportunidade: _asDouble(body['valor_oportunidade']) ?? current.valorOportunidade,
      responsavelNome: body['responsavel_nome'] as String? ?? current.responsavelNome,
      origem: body['origem'] as String? ?? current.origem,
      historicoContatos: current.historicoContatos,
      observacoesInternas: current.observacoesInternas,
      tarefas: current.tarefas,
      motivoPerda: body['motivo_perda'] as String? ?? current.motivoPerda,
      convertidoClienteId: current.convertidoClienteId,
      ganhoEm: current.ganhoEm,
      atualizadoEm: current.atualizadoEm,
    );
    state = AsyncData(
      (state.valueOrNull ?? [])
          .map((lead) => lead.id == id ? merged : lead)
          .toList(),
    );
    return merged;
  }

  Future<void> ganhar(String id, Map<String, dynamic> data) async {
    await ApiService.post('/leads/$id/ganhar', data: data);
    state = AsyncData(
      (state.valueOrNull ?? []).where((lead) => lead.id != id).toList(),
    );
  }

  Future<void> deletar(String id) async {
    await ApiService.delete('/leads/$id');
    state = AsyncData(
      (state.valueOrNull ?? []).where((lead) => lead.id != id).toList(),
    );
  }
}

final leadsProvider =
    AsyncNotifierProvider<LeadsNotifier, List<Lead>>(LeadsNotifier.new);
